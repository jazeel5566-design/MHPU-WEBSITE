"use server";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, homeFor, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH, MIN_STAFF_PASSWORD_LENGTH } from "@/lib/constants";
import { clientIp, hit, isLimited, clearLimit, safePath } from "@/lib/security";

// bcrypt hash of a random string, compared against when the account doesn't exist.
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.6U7HYQvTPEwWkFZ6m5H0n5Nq7cYe";

export type LoginState = { error?: string };

export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  const identifier = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const next = str(fd, "next");
  if (!identifier || !password) return { error: "Enter your email (or membership number) and password." };

  // Brute-force protection: 5 failures per account (15 min lock) and 30 per connection.
  const ip = await clientIp();
  const acctKey = `login:acct:${identifier}`, ipKey = `login:ip:${ip}`;
  const [acct, net] = await Promise.all([isLimited(acctKey, 5), isLimited(ipKey, 30)]);
  if (acct.limited || net.limited) {
    return { error: `Too many failed sign-in attempts. Please wait ${Math.max(acct.retryAfterMin, net.retryAfterMin)} minutes and try again, or contact the office.` };
  }

  // Members can sign in with their membership number as well as email.
  let user = await db.user.findUnique({ where: { email: identifier } });
  if (!user) {
    const m = await db.member.findUnique({ where: { membershipNo: identifier.toUpperCase() }, include: { user: true } });
    user = m?.user ?? null;
  }
  // Always run bcrypt so response time doesn't reveal whether the account exists.
  const ok = (await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)) && !!user && user.active;
  if (!ok || !user) {
    await Promise.all([hit(acctKey, 5, 15 * 60), hit(ipKey, 30, 15 * 60)]);
    if (user) await audit(user.id, "login_failed", "User", user.id, ip);
    return { error: "Those details don't match our records." };
  }

  await clearLimit(acctKey);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user);
  await audit(user.id, "login", "User", user.id);
  redirect(safePath(next, homeFor(user.role)));
}

export async function logout() {
  await destroySession();
  redirect("/login?out=1");
}

export async function setLanguage(fd: FormData) {
  const { isDhivehiEnabled } = await import("@/lib/i18n");
  const lang = str(fd, "lang") === "dv" && (await isDhivehiEnabled()) ? "dv" : "en";
  (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  let back = str(fd, "back");
  if (!back) {
    try { const r = new URL((await headers()).get("referer") ?? "/", "http://x"); back = r.pathname + r.search; } catch { back = "/"; }
  }
  redirect(safePath(back, "/"));
}

export type PwState = { ok?: boolean; error?: string };

/** Any signed-in user (staff or member) can change their own password. */
export async function changeOwnPassword(_: PwState, fd: FormData): Promise<PwState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const current = str(fd, "current");
  const next = str(fd, "next");
  const min = user.role === "MEMBER" ? MIN_PASSWORD_LENGTH : MIN_STAFF_PASSWORD_LENGTH;
  if (next.length < min) return { error: `Use at least ${min} characters for your new password.` };
  if (next !== str(fd, "confirm")) return { error: "New passwords don't match." };
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is incorrect." };
  // New password → sign out every other device, keep this one signed in.
  const updated = await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12), sessionVersion: { increment: 1 } } });
  await createSession(updated);
  await audit(user.id, "change_password", "User", user.id);
  return { ok: true };
}
