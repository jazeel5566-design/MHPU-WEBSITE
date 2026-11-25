"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { FEATURE_KEYS } from "@/lib/features";
import { DISABLED_KEY } from "@/lib/features-server";
import { AUDIENCE_KEYS } from "@/lib/audience";
import { MEMBERS_ONLY_KEY } from "@/lib/audience-server";

export type FState = { ok?: boolean; message?: string; error?: string };

export async function saveFeatures(_: FState, fd: FormData): Promise<FState> {
  const admin = await requireRole(["ADMIN"], "/admin");
  const off = [...new Set(fd.getAll("off").map(String))].filter((k) => FEATURE_KEYS.has(k)).sort();
  const value = JSON.stringify(off);
  await db.setting.upsert({ where: { key: DISABLED_KEY }, update: { value }, create: { key: DISABLED_KEY, value } });
  await audit(admin.id, "features_update", "Setting", undefined, off.length ? `Off: ${off.join(", ")}` : "All on");
  revalidatePath("/", "layout");
  return { ok: true, message: off.length ? `Saved. ${off.length} item${off.length === 1 ? " is" : "s are"} switched off.` : "Saved. Everything is switched on." };
}

/** Which public pages and tabs only members (active members and staff) can see. */
export async function saveAudience(_: FState, fd: FormData): Promise<FState> {
  const admin = await requireRole(["ADMIN"], "/admin");
  const list = [...new Set(fd.getAll("members").map(String))].filter((k) => AUDIENCE_KEYS.has(k)).sort();
  const value = JSON.stringify(list);
  await db.setting.upsert({ where: { key: MEMBERS_ONLY_KEY }, update: { value }, create: { key: MEMBERS_ONLY_KEY, value } });
  await audit(admin.id, "audience_update", "Setting", undefined, list.length ? `Members only: ${list.join(", ")}` : "Everything public");
  revalidatePath("/", "layout");
  return { ok: true, message: list.length ? `Saved. ${list.length} page${list.length === 1 ? "" : "s"} or tab${list.length === 1 ? " is" : "s are"} for members only.` : "Saved. Everything is public." };
}
