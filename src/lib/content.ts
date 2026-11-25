import type { Prisma } from "@prisma/client";

/** Posts that are live now: published, or scheduled with a publish time in the past. */
export function livePosts(visibility: ("PUBLIC" | "MEMBERS")[] = ["PUBLIC"]): Prisma.PostWhereInput {
  return {
    visibility: { in: visibility },
    OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishAt: { lte: new Date() } }],
  };
}

/** Sort key: scheduled posts that went live use their publishAt date. */
export const liveOrder: Prisma.PostOrderByWithRelationInput[] = [{ publishedAt: "desc" }, { publishAt: "desc" }];

/** Articles to list on the English or Dhivehi website. With the single-language rule on
 *  (the default) every article is listed; with it off, only articles in that language. */
export async function postsForLang(lang: string): Promise<Prisma.PostWhereInput> {
  const { getSettings } = await import("./settings");
  if ((await getSettings()).singleLanguageBoth !== "false") return {};
  return lang === "dv"
    ? { AND: [{ titleDv: { not: null } }, { NOT: { titleDv: "" } }] }
    : { NOT: { title: "" } };
}
