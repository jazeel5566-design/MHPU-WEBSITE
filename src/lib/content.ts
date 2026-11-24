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
