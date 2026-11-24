"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { FEATURE_KEYS } from "@/lib/features";
import { DISABLED_KEY } from "@/lib/features-server";

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
