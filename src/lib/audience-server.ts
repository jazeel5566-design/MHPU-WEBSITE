import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { POST_CATEGORIES, RESOURCE_CATEGORIES } from "./constants";
import { AUDIENCE_KEYS, DEFAULT_MEMBERS_ONLY } from "./audience";

export const MEMBERS_ONLY_KEY = "membersOnly";

/** Pages and tabs set to members only (cached per request). */
export const getMembersOnly = cache(async function getMembersOnly(): Promise<Set<string>> {
  const row = await db.setting.findUnique({ where: { key: MEMBERS_ONLY_KEY } });
  if (!row) return new Set(DEFAULT_MEMBERS_ONLY);
  try {
    const list = JSON.parse(row.value);
    return new Set((Array.isArray(list) ? list : []).filter((k: unknown) => typeof k === "string" && AUDIENCE_KEYS.has(k)));
  } catch {
    return new Set(DEFAULT_MEMBERS_ONLY);
  }
});

/** Can this visitor see members-only content? Active members and staff can. */
export const viewerIsMember = cache(async function viewerIsMember() {
  const u = await getCurrentUser();
  return !!u && (u.role !== "MEMBER" || u.member?.status === "ACTIVE");
});

export async function audience() {
  const [membersOnly, isMember] = await Promise.all([getMembersOnly(), viewerIsMember()]);
  const hidden = (key: string) => membersOnly.has(key) && !isMember;
  return {
    isMember,
    membersOnly,
    /** Hidden from this visitor. */
    hidden,
    /** News categories / document categories that are members only (for everyone). */
    membersNews: POST_CATEGORIES.filter((c) => membersOnly.has(`news.${c.id}`)).map((c) => c.id),
    membersResources: RESOURCE_CATEGORIES.filter((c) => membersOnly.has(`resource.${c.id}`)).map((c) => c.id),
    /** …and the ones hidden from this visitor. */
    hiddenNews: POST_CATEGORIES.filter((c) => hidden(`news.${c.id}`)).map((c) => c.id),
    hiddenResources: RESOURCE_CATEGORIES.filter((c) => hidden(`resource.${c.id}`)).map((c) => c.id),
  };
}

/** Top of a public page (or tab) that can be members only: send everyone else to sign in. */
export async function guardMembersOnly(key: string, path: string) {
  const a = await audience();
  if (!a.hidden(key)) return a;
  const u = await getCurrentUser();
  if (u?.member) redirect("/members/card"); // signed in but not active yet → their card explains how
  redirect(`/login?next=${encodeURIComponent(path)}&members=1`);
}
