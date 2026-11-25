import "server-only";
import { cache } from "react";
import { db } from "./db";

/*
 * Photo stories: a title, a few words and a gallery of photos from a union event.
 * Kept as one JSON setting (no table), edited in Editorial → Photo stories.
 * Until editors save their own, the four stories from the old website are shown.
 */
export type PhotoStory = {
  id: string;
  slug: string;
  title: string;
  titleDv?: string;
  tag?: string;
  date: string; // YYYY-MM-DD
  summary?: string;
  cover: string;
  images: string[];
  published: boolean;
};

export const PHOTO_STORIES_KEY = "photoStories";

/** The stories from the old website (photos copied to /public/photos). */
export const DEFAULT_PHOTO_STORIES: PhotoStory[] = [
  {
    id: "may-day-rally-2023", slug: "may-day-rally-2023", title: "May Day Rally 2023", tag: "May Day rally", date: "2023-05-01", published: true,
    cover: "/photos/may-day-2023-1.jpg",
    images: ["/photos/may-day-2023-1.jpg", "/photos/may-day-2023-2.jpg", "/photos/may-day-2023-3.jpg", "/photos/may-day-2023-4.jpg", "/photos/wage-theft-placard.jpg"],
  },
  {
    id: "overtime-campaign", slug: "overtime-campaign", title: "Overtime campaign", tag: "Campaign", date: "2026-09-10", published: true,
    cover: "/photos/may-day-2023-2.jpg",
    images: ["/photos/wage-theft-placard.jpg", "/photos/may-day-2023-1.jpg", "/photos/overtime-campaign.jpg"],
  },
  {
    id: "thareekheh-hoadhan", slug: "thareekheh-hoadhan", title: "Thaareekheh Hoadhan", tag: "Campaign", date: "2026-09-10", published: true,
    cover: "/photos/thareekheh-hoadhan-cover.jpg",
    images: ["/photos/thareekheh-hoadhan-1.jpg", "/photos/thareekheh-hoadhan-2.jpg", "/photos/may-day-2021.jpg"],
  },
  {
    id: "safe-staffing-rally-male", slug: "safe-staffing-rally-male", title: "Safe staffing rally — Malé", tag: "Campaign", date: "2026-09-01", published: true,
    cover: "/photos/safe-staffing-cover.jpg",
    images: ["/photos/safe-staffing-1.jpg", "/photos/safe-staffing-2.jpg", "/photos/black-ribbon-2020.jpg", "/photos/may-day-2023-1.jpg"],
  },
];

const valid = (s: unknown): s is PhotoStory => {
  const x = s as PhotoStory;
  return !!x && typeof x.id === "string" && typeof x.slug === "string" && typeof x.title === "string" && typeof x.cover === "string" && Array.isArray(x.images);
};

/** All stories, newest first (cached per request). */
export const getPhotoStories = cache(async function getPhotoStories(): Promise<PhotoStory[]> {
  const row = await db.setting.findUnique({ where: { key: PHOTO_STORIES_KEY } });
  let list = DEFAULT_PHOTO_STORIES;
  if (row) {
    try { const parsed = JSON.parse(row.value); if (Array.isArray(parsed)) list = parsed.filter(valid); } catch { /* keep defaults */ }
  }
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
});

export async function savePhotoStories(list: PhotoStory[]) {
  const value = JSON.stringify(list);
  await db.setting.upsert({ where: { key: PHOTO_STORIES_KEY }, update: { value }, create: { key: PHOTO_STORIES_KEY, value } });
}

/** Cover first, then the gallery without repeats. */
export const galleryOf = (s: PhotoStory) => [...new Set([s.cover, ...s.images].filter(Boolean))];
