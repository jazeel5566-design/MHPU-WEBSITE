"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str } from "@/lib/utils";
import { fillTemplate, sendBulk } from "@/lib/sms";
import { normaliseMvMobile } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { duesCollectionOf, overdueWhere } from "@/lib/dues";
import { findReminderCandidates, sendDueReminders } from "@/lib/reminders";
import { siteUrl } from "@/lib/security";

export type SmsState = { ok?: boolean; error?: string; message?: string; count?: number; invalid?: number; sample?: string };
const MAX_RECIPIENTS = 1000;


type Recipient = { to: string; memberId: string | null; vars: Record<string, string> };

/** Resolve an audience selector to recipients. */
async function resolveAudience(audience: string, custom: string): Promise<Recipient[]> {
  const s = await getSettings();
  const now = new Date();
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
  const fromMembers = (ms: { id: string; fullName: string; phone: string; membershipNo: string; duesPaidUntil: Date | null }[]) =>
    ms.map((m) => ({ to: m.phone, memberId: m.id, vars: { name: m.fullName.split(" ")[0], fullName: m.fullName, membershipNo: m.membershipNo, dueDate: fmt(m.duesPaidUntil), hotline: s.hotline } }));
  const sel = { id: true, fullName: true, phone: true, membershipNo: true, duesPaidUntil: true };
  if (audience === "ALL") return fromMembers(await db.member.findMany({ where: { status: "ACTIVE" }, select: sel }));
  if (audience === "OVERDUE") return fromMembers(await db.member.findMany({ where: { status: "ACTIVE", ...overdueWhere(duesCollectionOf(s), now) }, select: sel }));
  if (audience.startsWith("UNION:")) return fromMembers(await db.member.findMany({ where: { status: "ACTIVE", affiliateId: audience.slice(6) }, select: sel }));
  if (audience.startsWith("EVENT:")) {
    const rsvps = await db.eventRsvp.findMany({ where: { eventId: audience.slice(6) }, include: { member: { select: sel } } });
    return fromMembers(rsvps.map((r) => r.member));
  }
  if (audience === "CUSTOM") return custom.split(/[\s,;]+/).filter(Boolean).map((to) => ({ to, memberId: null, vars: { name: "", fullName: "", membershipNo: "", dueDate: "", hotline: s.hotline } }));
  return [];
}

export async function previewSms(_: SmsState, fd: FormData): Promise<SmsState> {
  await requireRole(["ADMIN"], "/admin");
  const list = await resolveAudience(str(fd, "audience"), str(fd, "custom"));
  const valid = list.filter((r) => normaliseMvMobile(r.to));
  const body = str(fd, "body");
  return { count: valid.length, invalid: list.length - valid.length, sample: valid[0] ? fillTemplate(body, { ...valid[0].vars, payLink: `${await siteUrl()}/members/dues` }) : undefined };
}

export async function sendSmsBatch(_: SmsState, fd: FormData): Promise<SmsState> {
  const admin = await requireRole(["ADMIN"], "/admin");
  const s = await getSettings();
  if (s.smsEnabled !== "true") return { error: "SMS is switched off. Turn it on in Site settings → SMS." };
  const body = str(fd, "body");
  if (body.length < 3) return { error: "Write a message first." };
  const list = (await resolveAudience(str(fd, "audience"), str(fd, "custom"))).filter((r) => normaliseMvMobile(r.to));
  if (!list.length) return { error: "No valid Maldivian mobile numbers in this audience." };
  if (list.length > MAX_RECIPIENTS) return { error: `That's ${list.length} recipients — the limit per send is ${MAX_RECIPIENTS}. Choose a smaller group.` };
  const link = `${await siteUrl()}/members/dues`;
  const batchId = `manual-${Date.now()}`;
  const r = await sendBulk(list.map((x) => ({ to: x.to, memberId: x.memberId, body: fillTemplate(body, { ...x.vars, payLink: link }) })), { kind: "MANUAL", sentById: admin.id, batchId });
  await audit(admin.id, "sms_send", "SmsMessage", batchId, `${list.length} recipients: ${r.sent} sent, ${r.test} test, ${r.failed} failed`);
  revalidatePath("/admin/sms");
  return { ok: true, message: s.smsProvider === "TEST" ? `Test mode: ${r.test} messages logged (nothing was actually sent).` : `${r.sent} sent${r.failed ? `, ${r.failed} failed — see the log below` : ""}.` };
}

export async function previewReminders(_: SmsState): Promise<SmsState> {
  await requireRole(["ADMIN"], "/admin");
  const list = await findReminderCandidates(await siteUrl());
  const up = list.filter((c) => c.kind === "DUES_UPCOMING").length;
  return { count: list.length, message: `${up} “due soon” and ${list.length - up} “overdue” reminders would go out today.`, sample: list[0]?.body };
}

export async function sendRemindersNow(_: SmsState): Promise<SmsState> {
  const admin = await requireRole(["ADMIN"], "/admin");
  const r = await sendDueReminders(await siteUrl(), admin.id);
  await audit(admin.id, "reminders_run", "SmsMessage", undefined, JSON.stringify(r));
  revalidatePath("/admin/sms");
  if ("skipped" in r && r.skipped) return { error: `${r.skipped}. Switch them on in Site settings first.` };
  return { ok: true, message: `Reminders sent: ${r.sent}${r.failed ? `, failed: ${r.failed}` : ""}.` };
}
