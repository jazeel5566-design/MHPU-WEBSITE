import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deletePost } from "@/app/actions/editorial";
import { PostEditor } from "@/components/editorial/post-editor";
import { SubmitButton } from "@/components/submit-button";

const SAVED: Record<string, string> = { draft: "Draft created.", submit: "Created and sent for review.", publish: "Published!", schedule: "Scheduled." };

function toLocalInput(d: Date | null) {
  if (!d) return null;
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireRole(["ADMIN", "EDITOR", "AUTHOR"], "/editorial");
  const post = await db.post.findUnique({ where: { id }, include: { author: { select: { name: true } } } });
  if (!post) notFound();
  const canPublish = user.role !== "AUTHOR";
  if (!canPublish && post.authorId !== user.id) notFound();
  const media = await db.media.findMany({ orderBy: { createdAt: "desc" }, take: 60, select: { url: true, alt: true } });
  const canDelete = canPublish || (post.authorId === user.id && post.status === "DRAFT");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/editorial/posts" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Articles</Link>
        {canDelete && (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <SubmitButton variant="ghost" size="sm" className="text-red-600" confirm="Delete this article permanently?"><Trash2 className="size-4" /> Delete</SubmitButton>
          </form>
        )}
      </div>
      <PostEditor canPublish={canPublish} media={media} savedMsg={sp.saved ? SAVED[sp.saved] : undefined}
        post={{ ...post, publishAt: toLocalInput(post.publishAt), authorName: post.author.name }} />
    </div>
  );
}
