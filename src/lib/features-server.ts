import "server-only";
import { cache } from "react";
import { db } from "./db";
import { FEATURE_KEYS, featureOn, pathOn } from "./features";

export const DISABLED_KEY = "disabledFeatures";

/** Switched-off feature keys (cached per request). */
export const getDisabled = cache(async function getDisabled(): Promise<Set<string>> {
  const row = await db.setting.findUnique({ where: { key: DISABLED_KEY } });
  try {
    const list = JSON.parse(row?.value ?? "[]");
    return new Set((Array.isArray(list) ? list : []).filter((k: unknown) => typeof k === "string" && FEATURE_KEYS.has(k)));
  } catch {
    return new Set();
  }
});

/** Helpers for server components: `const f = await features(); f.on("home.news"); f.path("/join")`. */
export async function features() {
  const disabled = await getDisabled();
  return { disabled, on: (key: string) => featureOn(disabled, key), path: (href: string) => pathOn(disabled, href) };
}

/** For server actions: an error message if the feature is switched off, else null. */
export async function featureOffError(key: string) {
  return featureOn(await getDisabled(), key) ? null : "This part of the website is currently switched off.";
}
