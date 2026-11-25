import "server-only";
import { db } from "./db";
import posts from "./legacy-news.json";

/*
 * The old website's articles and statements (from its newsroom), brought in with one click
 * from Editorial → Articles. Statements in Dhivehi are shown as images of their pages,
 * exactly as issued. Articles whose web address already exists are skipped.
 */
type LegacyPost = { slug: string; category: string; date: string; title: string; titleDv?: string; excerpt?: string; excerptDv?: string; body: string; bodyDv?: string; coverImage?: string; tags?: string };
export const LEGACY_POSTS = posts as LegacyPost[];

export async function missingLegacyPosts() {
  const have = await db.post.findMany({ where: { slug: { in: LEGACY_POSTS.map((p) => p.slug) } }, select: { slug: true } });
  const got = new Set(have.map((h) => h.slug));
  return LEGACY_POSTS.filter((p) => !got.has(p.slug));
}

export async function importLegacyPosts(authorId: string) {
  const todo = await missingLegacyPosts();
  for (const p of todo) {
    const when = new Date(`${p.date}T09:00:00+05:00`);
    await db.post.create({
      data: {
        slug: p.slug, title: p.title, titleDv: p.titleDv ?? null, excerpt: p.excerpt ?? null, excerptDv: p.excerptDv ?? null,
        body: p.body, bodyDv: p.bodyDv ?? null, coverImage: p.coverImage ?? null, category: p.category, tags: p.tags ?? null,
        status: "PUBLISHED", visibility: "PUBLIC", publishedAt: when, createdAt: when, authorId,
      },
    });
  }
  return todo.length;
}
