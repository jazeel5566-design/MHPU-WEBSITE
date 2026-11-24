"use server";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, homeFor, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { str } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

export type LoginState = { error?: string };

export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  const identifier = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const next = str(fd, "next");
  if (!identifier || !password) return { error: "Enter your email (or membership number) and password." };

  // Members can sign in with their membership number as well as email.
  let user = await db.user.findUnique({ where: { email: identifier } });
  if (!user) {
    const m = await db.member.findUnique({ where: { membershipNo: identifier.toUpperCase() }, include: { user: true } });
    user = m?.user ?? null;
  }
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok || !user) return { error: "Those details don't match our records." };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user);
  await audit(user.id, "login", "User", user.id);
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
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
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}

export type PwState = { ok?: boolean; error?: string };

/** Any signed-in user (staff or member) can change their own password. */
export async function changeOwnPassword(_: PwState, fd: FormData): Promise<PwState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const current = str(fd, "current");
  const next = str(fd, "next");
  if (next.length < MIN_PASSWORD_LENGTH) return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.` };
  if (next !== str(fd, "confirm")) return { error: "New passwords don't match." };
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  await audit(user.id, "change_password", "User", user.id);
  return { ok: true };
}
