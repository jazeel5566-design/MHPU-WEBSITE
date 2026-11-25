import { cache } from "react";
import { db } from "./db";
import { PHOTO } from "./images";

/** Built-in photos that admins can replace in Admin → Site photos. */
export const SITE_PHOTOS = {
  home: { label: "Homepage hero", where: "Large photo behind the homepage headline", fallback: PHOTO.march },
  islands: { label: "Islands photo", where: "“Every health worker. Every island.” section, About page story and the login page", fallback: PHOTO.team },
  about: { label: "About page header", where: "Top of the About page", fallback: PHOTO.mayDayGathering },
  news: { label: "News page header", where: "Top of News", fallback: PHOTO.workLifeBalance },
  campaigns: { label: "Campaigns page header", where: "Top of Campaigns (and campaign cards without their own photo)", fallback: PHOTO.decentWork },
  events: { label: "Events page header", where: "Top of Events", fallback: PHOTO.oshTraining },
  resources: { label: "Resources page header", where: "Top of Resources", fallback: PHOTO.maternityPolicy },
  join: { label: "Join page header", where: "Top of the membership application page", fallback: PHOTO.unionStall },
  getHelp: { label: "Get help page header", where: "Top of Get help", fallback: PHOTO.wageTheft },
} as const;

export type SitePhotoKey = keyof typeof SITE_PHOTOS;
export const settingKey = (k: SitePhotoKey) => `photo:${k}`;

/** Current photo URL for each slot (uploaded replacement, or the built-in default). Cached per request. */
export const getSitePhotos = cache(async () => {
  const rows = await db.setting.findMany({ where: { key: { startsWith: "photo:" } } });
  const custom = Object.fromEntries(rows.map((r) => [r.key.slice(6), r.value]));
  return Object.fromEntries(
    (Object.keys(SITE_PHOTOS) as SitePhotoKey[]).map((k) => [k, custom[k] || SITE_PHOTOS[k].fallback]),
  ) as Record<SitePhotoKey, string>;
});

export async function getCustomizedPhotoKeys() {
  const rows = await db.setting.findMany({ where: { key: { startsWith: "photo:" } }, select: { key: true } });
  return new Set(rows.map((r) => r.key.slice(6)));
}
