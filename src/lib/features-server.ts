import "server-only";
import { cache } from "react";
import { db } from "./db";
import { FEATURE_KEYS, featureOn, pathOn } from "./features";
import { audience } from "./audience-server";

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
  const [disabled, a] = await Promise.all([getDisabled(), audience()]);
  // Members-only pages count as off for visitors who can't see them, so their menu links
  // and home-page sections disappear for those visitors only.
  const view = new Set([...disabled, ...[...a.membersOnly].filter((k) => k.startsWith("page.") && a.hidden(k))]);
  // Links straight to a members-only tab (e.g. /resources?category=FORM in the footer) are hidden too.
  const tabHidden = (href: string) => {
    const m = /^\/(news|resources)\?(?:.*&)?category=([A-Z_]+)/.exec(href);
    return !!m && a.hidden(`${m[1] === "news" ? "news" : "resource"}.${m[2]}`);
  };
  return { disabled, on: (key: string) => featureOn(view, key), path: (href: string) => pathOn(view, href) && !tabHidden(href) };
}

/** For server actions: an error message if the feature is switched off, else null. */
export async function featureOffError(key: string) {
  return featureOn(await getDisabled(), key) ? null : "This part of the website is currently switched off.";
}
