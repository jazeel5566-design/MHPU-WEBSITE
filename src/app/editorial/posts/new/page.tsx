import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PostEditor } from "@/components/editorial/post-editor";

export const metadata = { title: "New article" };

export default async function NewPost() {
  const user = await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR", "AUTHOR"], "/editorial");
  const media = await db.media.findMany({ orderBy: { createdAt: "desc" }, take: 60, select: { url: true, alt: true } });
  return (
    <div>
      <PageHeader kicker="Editorial" title="New article" />
      <PostEditor canPublish={user.role !== "AUTHOR"} media={media}
        post={{ title: "", titleDv: null, slug: "", excerpt: null, excerptDv: null, body: "", bodyDv: null, coverImage: null, category: "NEWS", tags: null, status: "DRAFT", visibility: "PUBLIC", featured: false, publishAt: null, reviewNote: null }} />
    </div>
  );
}
