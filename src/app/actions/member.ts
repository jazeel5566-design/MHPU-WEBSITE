"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str } from "@/lib/utils";
import { CASE_TYPES, MIN_PASSWORD_LENGTH } from "@/lib/constants";

export type MState = { ok?: boolean; error?: string; message?: string };

const profileSchema = z.object({
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  employer: z.string().trim().min(2, "Enter your workplace"),
  role: z.string().trim().optional(),
  atoll: z.string().min(1),
  island: z.string().trim().optional(),
});

export async function updateProfile(_: MState, fd: FormData): Promise<MState> {
  const { user, member } = await requireMember();
  const r = profileSchema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: r.error.issues[0].message };
  if (r.data.email !== user.email) {
    const taken = await db.user.findUnique({ where: { email: r.data.email } });
    if (taken) return { error: "That email is already used by another account." };
  }
  await db.$transaction([
    db.member.update({ where: { id: member.id }, data: { ...r.data, role: r.data.role || null, island: r.data.island || null } }),
    db.user.update({ where: { id: user.id }, data: { email: r.data.email } }),
  ]);
  await audit(user.id, "update_profile", "Member", member.id);
  revalidatePath("/members");
  return { ok: true, message: "Your details have been updated." };
}

export async function changePassword(_: MState, fd: FormData): Promise<MState> {
  const { user } = await requireMember();
  const current = str(fd, "current");
  const next = str(fd, "next");
  if (next.length < MIN_PASSWORD_LENGTH) return { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (next !== str(fd, "confirm")) return { error: "New passwords don't match." };
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is incorrect." };
  const updated = await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10), sessionVersion: { increment: 1 } } });
  const { createSession } = await import("@/lib/auth");
  await createSession(updated);
  await audit(user.id, "change_password", "User", user.id);
  return { ok: true, message: "Password changed." };
}

const caseSchema = z.object({
  type: z.enum(CASE_TYPES.map((c) => c.id) as [string, ...string[]], { message: "Choose what your issue is about" }),
  subject: z.string().trim().min(5, "Give your case a short title"),
  description: z.string().trim().min(20, "Please describe what happened (20+ characters)"),
  facility: z.string().trim().optional(),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

export async function openCase(_: MState, fd: FormData): Promise<MState> {
  const { user, member } = await requireMember();
  const r = caseSchema.safeParse(Object.fromEntries(fd));
  if (!r.success) return { error: r.error.issues[0].message };
  const year = new Date().getFullYear();
  const count = await db.case.count({ where: { reference: { startsWith: `C-${year}-` } } });
  const c = await db.case.create({
    data: { ...r.data, facility: r.data.facility || member.employer, memberId: member.id, reference: `C-${year}-${String(count + 1).padStart(4, "0")}` },
  });
  await audit(user.id, "open_case", "Case", c.id, c.reference);
  redirect(`/members/help/${c.id}?new=1`);
}

export async function replyToCase(_: MState, fd: FormData): Promise<MState> {
  const { user, member } = await requireMember();
  const caseId = str(fd, "caseId");
  const body = str(fd, "body");
  if (body.length < 2) return { error: "Write a message first." };
  const c = await db.case.findFirst({ where: { id: caseId, memberId: member.id } });
  if (!c) return { error: "Case not found." };
  if (c.status === "CLOSED") return { error: "This case is closed. Open a new case if you need more help." };
  await db.caseMessage.create({ data: { caseId, authorId: user.id, body } });
  await db.case.update({ where: { id: caseId }, data: { status: c.status === "AWAITING_MEMBER" ? "IN_PROGRESS" : c.status } });
  revalidatePath(`/members/help/${caseId}`);
  return { ok: true };
}

export async function toggleRsvp(fd: FormData) {
  const { member } = await requireMember();
  const eventId = str(fd, "eventId");
  const existing = await db.eventRsvp.findUnique({ where: { eventId_memberId: { eventId, memberId: member.id } } });
  if (existing) {
    await db.eventRsvp.delete({ where: { id: existing.id } });
  } else {
    const e = await db.event.findUnique({ where: { id: eventId }, include: { _count: { select: { rsvps: true } } } });
    if (e && (!e.capacity || e._count.rsvps < e.capacity)) await db.eventRsvp.create({ data: { eventId, memberId: member.id } });
  }
  revalidatePath("/members/events");
  revalidatePath("/members");
}

export async function castVote(_: MState, fd: FormData): Promise<MState> {
  const { user, member } = await requireMember();
  if (member.status !== "ACTIVE") return { error: "Only members in good standing can vote." };
  const ballotId = str(fd, "ballotId");
  const optionId = str(fd, "optionId");
  if (!optionId) return { error: "Choose an option." };
  const b = await db.ballot.findUnique({ where: { id: ballotId }, include: { options: true } });
  const now = new Date();
  if (!b || b.opensAt > now || b.closesAt < now) return { error: "This ballot is not open." };
  if (!b.options.some((o) => o.id === optionId)) return { error: "Invalid option." };
  try {
    await db.vote.create({ data: { ballotId, optionId, memberId: member.id } });
  } catch {
    return { error: "You have already voted in this ballot." };
  }
  await audit(user.id, "vote", "Ballot", ballotId);
  revalidatePath("/members/ballots");
  return { ok: true, message: "Your vote has been recorded. Thank you!" };
}

// ─── Online dues payments ───────────────────────────────────────────

/** Test checkout is only for trying the flow: admins, or local test machines that set ALLOW_TEST_CHECKOUT=1. */
export async function testCheckoutAllowed(role: string) {
  return role === "ADMIN" || (process.env.ALLOW_TEST_CHECKOUT === "1" && !process.env.VERCEL);
}

export async function startOnlinePayment(fd: FormData) {
  const { user, member } = await requireMember();
  const { getSettings } = await import("@/lib/settings");
  const { startCheckout } = await import("@/lib/payments");
  const s = await getSettings();
  if (s.paymentsEnabled !== "true") redirect("/members/dues?payment=off");
  const provider = s.paymentProvider === "BML" ? "BML" : "TEST";
  if (provider === "TEST" && !(await testCheckoutAllowed(user.role))) redirect("/members/dues?payment=off");
  const months = [1, 3, 6, 12].includes(Number(str(fd, "months"))) ? Number(str(fd, "months")) : 1;
  const amount = months * (Number(s.monthlyDues) || 100);
  const intent = await db.paymentIntent.create({ data: { memberId: member.id, months, amount, provider } });
  const { siteUrl } = await import("@/lib/security");
  const r = await startCheckout(intent, await siteUrl());
  if (!r.ok) {
    await db.paymentIntent.update({ where: { id: intent.id }, data: { status: "FAILED" } });
    redirect("/members/dues?payment=error&msg=" + encodeURIComponent(r.error));
  }
  await audit(user.id, "payment_start", "PaymentIntent", intent.id, `${provider} MVR ${amount}`);
  redirect(r.redirectUrl);
}

export async function completeTestPayment(fd: FormData) {
  const { user, member } = await requireMember();
  const { markIntentPaid } = await import("@/lib/payments");
  const intent = await db.paymentIntent.findFirst({ where: { id: str(fd, "id"), memberId: member.id, provider: "TEST", status: "PENDING" } });
  if (!intent || !(await testCheckoutAllowed(user.role))) redirect("/members/dues");
  if (str(fd, "outcome") === "pay") {
    if (fd.get("saveCard") === "on") {
      await db.member.update({ where: { id: member.id }, data: { autopayToken: `test_tok_${intent.id.slice(0, 8)}`, autopayCardLabel: "Test card •••• 4242" } });
    }
    await markIntentPaid(intent.id, "TEST");
    await audit(user.id, "payment_test_paid", "PaymentIntent", intent.id);
    redirect("/members/dues?payment=paid");
  }
  await db.paymentIntent.update({ where: { id: intent.id }, data: { status: "CANCELLED" } });
  redirect("/members/dues?payment=cancelled");
}

export async function setAutopay(fd: FormData) {
  const { user, member } = await requireMember();
  const on = str(fd, "autopay") === "on";
  const months = [1, 3, 6, 12].includes(Number(str(fd, "months"))) ? Number(str(fd, "months")) : 1;
  await db.member.update({
    where: { id: member.id },
    data: on ? { autopay: true, autopayMonths: months, autopayConsentAt: new Date() } : { autopay: false, autopayToken: null, autopayCardLabel: null },
  });
  await audit(user.id, on ? "autopay_on" : "autopay_off", "Member", member.id, on ? `${months} month(s)` : undefined);
  redirect(`/members/dues?autopay=${on ? "on" : "off"}`);
}

export async function removeSavedCard() {
  const { user, member } = await requireMember();
  await db.member.update({ where: { id: member.id }, data: { autopayToken: null, autopayCardLabel: null } });
  await audit(user.id, "autopay_card_removed", "Member", member.id);
  redirect("/members/dues?autopay=card-removed");
}
