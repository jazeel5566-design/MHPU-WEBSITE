import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import type { Role } from "./constants";

export async function createSession(user: { id: string; role: string; name: string; sessionVersion?: number }) {
  const token = await signSession({ uid: user.id, role: user.role, name: user.name, sv: user.sessionVersion ?? 0 });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user from the DB (null if signed out or deactivated). */
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verifySession(token);
  if (!s) return null;
  const user = await db.user.findUnique({ where: { id: s.uid }, include: { member: true } });
  if (!user || !user.active) return null;
  if ((s.sv ?? 0) !== user.sessionVersion) return null; // signed out everywhere (password changed / reset / deactivated)
  return user;
}

/** Guard for pages and server actions. Re-checks the role against the DB. */
export async function requireRole(roles: Role[], next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(user.role as Role)) redirect("/login?denied=1");
  return user;
}

export async function requireMember() {
  const user = await requireRole(["MEMBER", "ADMIN"], "/members");
  if (!user.member) redirect("/login?nomember=1");
  return { user, member: user.member };
}

/** Member-only pages: only ACTIVE members (dues paid, or activated by an admin).
 *  Everyone else is sent to their membership card, which explains how to become active. */
export async function requireActiveMember() {
  const r = await requireMember();
  if (r.member.status !== "ACTIVE") redirect("/members/card");
  return r;
}

export function homeFor(role: string) {
  if (role === "MEMBER") return "/members";
  if (role === "TREASURER") return "/admin/finance";
  if (role === "EDITOR" || role === "AUTHOR") return "/editorial";
  return "/admin";
}
