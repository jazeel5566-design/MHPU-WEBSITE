import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { duesCollectionOf, owedFrom } from "./dues";
import { fillTemplate, sendSms } from "./sms";
import { normaliseMvMobile } from "./phone";
import { checkWithProvider, markIntentPaid, supportsSavedCards, chargeSavedCard } from "./payments";

const DAY = 864e5;
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export type ReminderCandidate = { memberId: string; name: string; phone: string; kind: "DUES_UPCOMING" | "DUES_OVERDUE"; dueDate: Date; body: string };

/**
 * Who should get a dues reminder today:
 *  - UPCOMING: dues fall due within `reminderDaysBefore` days, and no upcoming reminder
 *    has been sent for this due date yet.
 *  - OVERDUE: dues are past due (members who never paid count from 14 days after joining),
 *    the last overdue reminder was ≥ `reminderRepeatDays` ago, and fewer than
 *    `reminderMaxOverdue` overdue reminders have been sent since the due date.
 */
export async function findReminderCandidates(siteUrl: string): Promise<ReminderCandidate[]> {
  const s = await getSettings();
  const now = new Date();
  const before = Math.max(1, Number(s.reminderDaysBefore) || 3);
  const repeat = Math.max(1, Number(s.reminderRepeatDays) || 14);
  const maxOverdue = Math.max(0, Number(s.reminderMaxOverdue) || 3);
  // Nothing to remind about until an admin has started dues collection.
  const dues = duesCollectionOf(s);
  if (!dues.on) return [];
  const start = dues.start;
  // Members who are not active yet (never paid) are reminded too — paying is how they become active.
  const PAYING = { in: ["ACTIVE", "INACTIVE"] };
  const members = await db.member.findMany({
    where: { status: PAYING, duesPaidUntil: { lte: new Date(now.getTime() + before * DAY) } },
    select: { id: true, fullName: true, phone: true, membershipNo: true, duesPaidUntil: true, joinedAt: true, profession: true, autopay: true },
  });
  const neverPaid = await db.member.findMany({
    where: { status: PAYING, duesPaidUntil: null, joinedAt: { lte: new Date(now.getTime() - 14 * DAY) }, NOT: { profession: "Student" } },
    select: { id: true, fullName: true, phone: true, membershipNo: true, duesPaidUntil: true, joinedAt: true, profession: true, autopay: true },
  });
  const out: ReminderCandidate[] = [];
  for (const m of [...members, ...neverPaid]) {
    if (!normaliseMvMobile(m.phone)) continue;
    const due = m.duesPaidUntil ?? new Date(owedFrom(m.joinedAt, start).getTime() + (start && start > m.joinedAt ? 0 : 14 * DAY));
    if (due.getTime() > now.getTime() + before * DAY) continue; // not due soon (e.g. dues haven't started yet)
    const vars = { name: m.fullName.split(" ")[0], membershipNo: m.membershipNo, dueDate: fmt(due), payLink: `${siteUrl}/members/dues`, hotline: s.hotline };
    if (due > now) {
      if (m.autopay && s.paymentsEnabled === "true") continue; // auto-pay handles it (charge or pay link)
      const already = await db.smsMessage.count({ where: { memberId: m.id, kind: "DUES_UPCOMING", status: { in: ["SENT", "TEST"] }, createdAt: { gte: new Date(due.getTime() - (before + 1) * DAY) } } });
      if (!already) out.push({ memberId: m.id, name: m.fullName, phone: m.phone, kind: "DUES_UPCOMING", dueDate: due, body: fillTemplate(s.reminderUpcomingText, vars) });
    } else {
      const sent = await db.smsMessage.findMany({ where: { memberId: m.id, kind: "DUES_OVERDUE", status: { in: ["SENT", "TEST"] }, createdAt: { gte: due } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
      if (sent.length >= maxOverdue) continue;
      if (sent[0] && now.getTime() - sent[0].createdAt.getTime() < repeat * DAY) continue;
      out.push({ memberId: m.id, name: m.fullName, phone: m.phone, kind: "DUES_OVERDUE", dueDate: due, body: fillTemplate(s.reminderOverdueText, vars) });
    }
  }
  return out;
}

export async function sendDueReminders(siteUrl: string, sentById: string | null = null) {
  const s = await getSettings();
  if (s.remindersEnabled !== "true" || s.smsEnabled !== "true") return { skipped: "Reminders or SMS are switched off", sent: 0, failed: 0 };
  const list = await findReminderCandidates(siteUrl);
  const batchId = `reminders-${new Date().toISOString().slice(0, 10)}`;
  let sent = 0, failed = 0;
  for (const c of list) {
    const r = await sendSms({ to: c.phone, body: c.body, kind: c.kind, memberId: c.memberId, sentById, batchId });
    if (r.ok) sent++; else failed++;
  }
  return { sent, failed };
}

/** Re-check online payments that were started but never confirmed (e.g. the member closed the tab). */
export async function reconcilePendingPayments() {
  const pending = await db.paymentIntent.findMany({ where: { status: "PENDING", provider: "BML", createdAt: { gte: new Date(Date.now() - 3 * DAY) } } });
  let paid = 0;
  for (const p of pending) {
    const st = await checkWithProvider(p);
    if (st === "PAID") { await markIntentPaid(p.id, "CARD"); paid++; }
    else if (st === "FAILED") await db.paymentIntent.update({ where: { id: p.id }, data: { status: "FAILED" } });
  }
  await db.paymentIntent.updateMany({ where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 3 * DAY) } }, data: { status: "EXPIRED" } });
  return { checked: pending.length, paid };
}

/**
 * Auto-pay: 3 days before dues fall due (or when already overdue), create a payment for
 * members who switched auto-pay on. Charge their saved card if the gateway supports it;
 * otherwise text them a one-tap payment link.
 */
export async function runAutopay(siteUrl: string) {
  const s = await getSettings();
  if (s.paymentsEnabled !== "true") return { skipped: "Online payments are switched off", charged: 0, linked: 0, failed: 0 };
  const provider = s.paymentProvider === "BML" ? "BML" : "TEST";
  const monthly = Number(s.monthlyDues) || 100;
  const now = new Date();
  const members = await db.member.findMany({
    where: { autopay: true, status: "ACTIVE", OR: [{ duesPaidUntil: null }, { duesPaidUntil: { lte: new Date(now.getTime() + 3 * DAY) } }] },
  });
  let charged = 0, linked = 0, failed = 0;
  for (const m of members) {
    const recent = await db.paymentIntent.count({ where: { memberId: m.id, auto: true, status: { in: ["PENDING", "PAID"] }, createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } });
    if (recent) continue;
    const intent = await db.paymentIntent.create({ data: { memberId: m.id, months: m.autopayMonths, amount: m.autopayMonths * monthly, provider, auto: true } });
    if (m.autopayToken && supportsSavedCards(provider)) {
      const r = await chargeSavedCard(intent, m.autopayToken);
      if (r === "PAID") {
        await markIntentPaid(intent.id, provider === "TEST" ? "TEST" : "CARD");
        await sendSms({ to: m.phone, kind: "PAYMENT_RECEIPT", memberId: m.id, body: `MHPU: Your automatic dues payment of MVR ${intent.amount} (${intent.months} month${intent.months > 1 ? "s" : ""}) was successful. Thank you!` });
        charged++;
        continue;
      }
      await db.paymentIntent.update({ where: { id: intent.id }, data: { status: "FAILED" } });
      failed++;
      await sendSms({ to: m.phone, kind: "DUES_UPCOMING", memberId: m.id, body: `MHPU: We couldn't charge your saved card for dues. Please pay at ${siteUrl}/members/dues or call ${s.hotline}.` });
      continue;
    }
    const r = await sendSms({ to: m.phone, kind: "DUES_UPCOMING", memberId: m.id, body: `MHPU: Your dues (MVR ${intent.amount} for ${intent.months} month${intent.months > 1 ? "s" : ""}) are due. Pay in one tap: ${siteUrl}/pay/${intent.id}` });
    if (r.ok) linked++; else failed++;
  }
  return { charged, linked, failed };
}
