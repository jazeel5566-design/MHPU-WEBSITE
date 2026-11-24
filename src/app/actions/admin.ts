"use server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str, optStr } from "@/lib/utils";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ROLES } from "@/lib/constants";
import { removeApplicationFiles } from "@/lib/storage";

export type AState = { ok?: boolean; error?: string; message?: string; tempPassword?: string };

const ADMIN = ["ADMIN"] as const;
const STAFF = ["ADMIN", "CASEWORKER"] as const;

function tempPassword() {
  // Readable, no ambiguous characters
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const b = randomBytes(10);
  return Array.from(b, (x) => chars[x % chars.length]).join("").replace(/(.{5})/, "$1-");
}

/** Next number in MHPU's existing sequence: MHPU-0001, MHPU-0002, … */
async function nextMembershipNo() {
  const rows = await db.member.findMany({ select: { membershipNo: true } });
  const max = rows.reduce((m, r) => { const n = /^MHPU-(\d+)$/.exec(r.membershipNo)?.[1]; return n ? Math.max(m, Number(n)) : m; }, 0);
  return `MHPU-${String(max + 1).padStart(4, "0")}`;
}

// ─── Applications ───────────────────────────────────────────────────

export async function approveApplication(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const app = await db.application.findUnique({ where: { id: str(fd, "id") } });
  if (!app || app.status !== "PENDING") return { error: "Application not found or already processed." };
  if (await db.user.findUnique({ where: { email: app.email } })) return { error: `An account already exists for ${app.email}.` };

  const pw = tempPassword();
  const membershipNo = await nextMembershipNo();
  const affiliateId = optStr(fd, "affiliateId");
  const nationality = /^maldives$/i.test(app.country.trim()) ? "Maldivian" : app.country;
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: app.email, name: app.fullName, role: "MEMBER", passwordHash: await bcrypt.hash(pw, 10) } });
    const member = await tx.member.create({
      data: {
        membershipNo, fullName: app.fullName, idNumber: app.idNumber, nationality, address: app.address, phone: app.phone, email: app.email,
        profession: app.profession ?? app.jobTitle, role: app.jobTitle, employer: app.employer, atoll: app.atoll ?? "Not specified", island: app.island,
        userId: user.id, affiliateId,
      },
    });
    await tx.application.update({ where: { id: app.id }, data: { status: "APPROVED", reviewedAt: new Date(), receivedBy: admin.name, memberId: member.id, reviewNote: optStr(fd, "note") } });
  });
  await audit(admin.id, "application_approve", "Application", app.id, `${app.fullName} → ${membershipNo}`);
  // No revalidate here: the list would re-render and remove this card before the
  // admin has copied the temporary password. The "Done" link refreshes the list.
  return { ok: true, message: `${app.fullName} approved as ${membershipNo}. Share these login details securely:`, tempPassword: `${app.email} / ${pw}` };
}

export async function rejectApplication(fd: FormData) {
  const admin = await requireRole([...ADMIN], "/admin");
  const id = str(fd, "id");
  await db.application.update({ where: { id }, data: { status: "REJECTED", reviewedAt: new Date(), receivedBy: admin.name, reviewNote: optStr(fd, "note") } });
  await audit(admin.id, "application_reject", "Application", id);
  revalidatePath("/admin", "layout");
}

/** Permanently delete an application and the applicant's ID copy + signature
 *  (spam, duplicates, or a data-removal request). Member records are not affected. */
export async function deleteApplication(fd: FormData) {
  const admin = await requireRole([...ADMIN], "/admin");
  const app = await db.application.findUnique({ where: { id: str(fd, "id") } });
  if (!app) return;
  await removeApplicationFiles([app.idDocFile, app.signatureFile]);
  await db.application.delete({ where: { id: app.id } });
  await audit(admin.id, "application_delete", "Application", app.id, `${app.reference} ${app.fullName}`);
  revalidatePath("/admin", "layout");
}

// ─── Members ────────────────────────────────────────────────────────

export async function updateMember(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const id = str(fd, "id");
  const m = await db.member.findUnique({ where: { id } });
  if (!m) return { error: "Member not found." };
  const status = str(fd, "status");
  const paid = str(fd, "duesPaidUntil");
  await db.member.update({
    where: { id },
    data: {
      fullName: str(fd, "fullName") || m.fullName, phone: str(fd, "phone") || m.phone, profession: str(fd, "profession") || m.profession,
      employer: str(fd, "employer") || m.employer, atoll: str(fd, "atoll") || m.atoll, role: optStr(fd, "role"),
      status, affiliateId: optStr(fd, "affiliateId"), isRep: fd.get("isRep") === "on", notes: optStr(fd, "notes"),
      duesPaidUntil: paid ? new Date(paid) : null,
    },
  });
  if (m.userId) await db.user.update({ where: { id: m.userId }, data: { active: status !== "SUSPENDED" && status !== "RESIGNED", name: str(fd, "fullName") || m.fullName, title: optStr(fd, "userTitle") } });
  await audit(admin.id, "member_update", "Member", id, status !== m.status ? `status ${m.status} → ${status}` : undefined);
  revalidatePath(`/admin/members/${id}`);
  return { ok: true, message: "Member updated." };
}

export async function recordPayment(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const memberId = str(fd, "memberId");
  const amount = Number(str(fd, "amount"));
  const months = Math.max(1, Number(str(fd, "months")) || 1);
  if (!amount || amount <= 0) return { error: "Enter an amount." };
  const m = await db.member.findUnique({ where: { id: memberId } });
  if (!m) return { error: "Member not found." };
  const base = m.duesPaidUntil && m.duesPaidUntil > new Date() ? new Date(m.duesPaidUntil) : new Date();
  base.setMonth(base.getMonth() + months);
  await db.$transaction([
    db.payment.create({ data: { memberId, amount, period: str(fd, "period") || new Date().toISOString().slice(0, 7), method: str(fd, "method") || "BANK_TRANSFER", reference: optStr(fd, "reference") } }),
    db.member.update({ where: { id: memberId }, data: { duesPaidUntil: base, status: m.status === "LAPSED" ? "ACTIVE" : m.status } }),
  ]);
  await audit(admin.id, "payment_record", "Member", memberId, `MVR ${amount}`);
  revalidatePath(`/admin/members/${memberId}`);
  return { ok: true, message: `Payment recorded. Dues now paid until ${base.toLocaleDateString("en-GB")}.` };
}

export async function resetPassword(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const userId = str(fd, "userId");
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return { error: "No login account." };
  const pw = tempPassword();
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
  await audit(admin.id, "password_reset", "User", userId);
  return { ok: true, message: "Temporary password created. Share it securely:", tempPassword: `${u.email} / ${pw}` };
}

// ─── Cases ──────────────────────────────────────────────────────────

export async function updateCase(fd: FormData) {
  const staff = await requireRole([...STAFF], "/admin");
  const id = str(fd, "id");
  const status = str(fd, "status");
  const c = await db.case.findUnique({ where: { id } });
  if (!c) return;
  await db.case.update({
    where: { id },
    data: { status, assigneeId: optStr(fd, "assigneeId"), urgency: str(fd, "urgency") || c.urgency, closedAt: ["RESOLVED", "CLOSED"].includes(status) ? c.closedAt ?? new Date() : null },
  });
  if (status !== c.status) await db.caseMessage.create({ data: { caseId: id, authorId: staff.id, internal: true, body: `Status changed: ${c.status} → ${status}` } });
  await audit(staff.id, "case_update", "Case", id, `${c.reference} ${status}`);
  revalidatePath(`/admin/cases/${id}`);
}

export async function staffReply(_: AState, fd: FormData): Promise<AState> {
  const staff = await requireRole([...STAFF], "/admin");
  const caseId = str(fd, "caseId");
  const body = str(fd, "body");
  if (body.length < 2) return { error: "Write a message first." };
  const internal = fd.get("internal") === "on";
  const c = await db.case.findUnique({ where: { id: caseId } });
  if (!c) return { error: "Case not found." };
  await db.caseMessage.create({ data: { caseId, authorId: staff.id, body, internal } });
  await db.case.update({
    where: { id: caseId },
    data: { assigneeId: c.assigneeId ?? staff.id, status: !internal && c.status === "OPEN" ? "IN_PROGRESS" : c.status, updatedAt: new Date() },
  });
  revalidatePath(`/admin/cases/${caseId}`);
  return { ok: true };
}

// ─── Ballots ────────────────────────────────────────────────────────

export async function createBallot(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const title = str(fd, "title");
  const question = str(fd, "question");
  const options = str(fd, "options").split("\n").map((s) => s.trim()).filter(Boolean);
  const opensAt = new Date(str(fd, "opensAt"));
  const closesAt = new Date(str(fd, "closesAt"));
  if (!title || !question) return { error: "Add a title and question." };
  if (options.length < 2) return { error: "Add at least two options (one per line)." };
  if (isNaN(+opensAt) || isNaN(+closesAt) || closesAt <= opensAt) return { error: "Closing time must be after opening time." };
  const b = await db.ballot.create({
    data: { title, question, description: optStr(fd, "description"), opensAt, closesAt, options: { create: options.map((label, order) => ({ label, order })) } },
  });
  await audit(admin.id, "ballot_create", "Ballot", b.id, title);
  revalidatePath("/admin/ballots");
  return { ok: true, message: "Ballot created. Members will see it in their portal when it opens." };
}

export async function deleteBallot(fd: FormData) {
  const admin = await requireRole([...ADMIN], "/admin");
  const id = str(fd, "id");
  await db.ballot.delete({ where: { id } });
  await audit(admin.id, "ballot_delete", "Ballot", id);
  revalidatePath("/admin/ballots");
}

// ─── Affiliates ─────────────────────────────────────────────────────

export async function saveAffiliate(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const id = optStr(fd, "id");
  const name = str(fd, "name");
  const shortName = str(fd, "shortName");
  if (!name || !shortName) return { error: "Name and short name are required." };
  const data = { name, shortName, nameDv: optStr(fd, "nameDv"), description: optStr(fd, "description"), website: optStr(fd, "website"), memberCount: Number(str(fd, "memberCount")) || 0 };
  const a = id ? await db.affiliate.update({ where: { id }, data }) : await db.affiliate.create({ data });
  await audit(admin.id, id ? "affiliate_update" : "affiliate_create", "Affiliate", a.id, name);
  revalidatePath("/admin/affiliates");
  revalidatePath("/about");
  return { ok: true, message: "Saved." };
}

export async function deleteAffiliate(fd: FormData) {
  const admin = await requireRole([...ADMIN], "/admin");
  const id = str(fd, "id");
  await db.member.updateMany({ where: { affiliateId: id }, data: { affiliateId: null } });
  await db.affiliate.delete({ where: { id } });
  await audit(admin.id, "affiliate_delete", "Affiliate", id);
  revalidatePath("/admin/affiliates");
}

// ─── Staff users ────────────────────────────────────────────────────

export async function createStaff(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const role = str(fd, "role");
  if (!name || !email.includes("@")) return { error: "Enter a name and valid email." };
  if (!ROLES.includes(role as (typeof ROLES)[number]) || role === "MEMBER") return { error: "Choose a staff role." };
  if (await db.user.findUnique({ where: { email } })) return { error: "A user with that email already exists." };
  const pw = tempPassword();
  const u = await db.user.create({ data: { email, name, role, title: optStr(fd, "title"), passwordHash: await bcrypt.hash(pw, 10) } });
  await audit(admin.id, "user_create", "User", u.id, `${email} (${role})`);
  revalidatePath("/admin/users");
  return { ok: true, message: `Account created for ${name}. Share these login details securely:`, tempPassword: `${email} / ${pw}` };
}

export async function updateStaff(fd: FormData) {
  const admin = await requireRole([...ADMIN], "/admin");
  const id = str(fd, "id");
  const title = optStr(fd, "title");
  if (id === admin.id) { // you can change your own title, but not demote/deactivate yourself
    await db.user.update({ where: { id }, data: { title } });
    revalidatePath("/admin", "layout");
    return;
  }
  const role = str(fd, "role");
  await db.user.update({ where: { id }, data: { role, title, active: fd.get("active") === "on" } });
  await audit(admin.id, "user_update", "User", id, role);
  revalidatePath("/admin/users");
}

// ─── Settings & inbox ───────────────────────────────────────────────

export async function saveSettings(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireRole([...ADMIN], "/admin");
  const keys = Object.keys(DEFAULT_SETTINGS);
  await db.$transaction(
    keys.map((key) => {
      const value = key === "alertEnabled" ? (fd.get(key) === "on" ? "true" : "false") : str(fd, key);
      return db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }),
  );
  await audit(admin.id, "settings_update", "Setting");
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved — changes are live." };
}

export async function toggleMessage(fd: FormData) {
  await requireRole([...STAFF], "/admin");
  const id = str(fd, "id");
  const m = await db.contactMessage.findUnique({ where: { id } });
  if (m) await db.contactMessage.update({ where: { id }, data: { handled: !m.handled } });
  revalidatePath("/admin/messages");
}

export async function goToMember(fd: FormData) {
  await requireRole([...STAFF], "/admin");
  const q = str(fd, "q");
  redirect(`/admin/members?q=${encodeURIComponent(q)}`);
}
