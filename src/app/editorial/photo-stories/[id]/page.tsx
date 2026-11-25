import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getPhotoStories } from "@/lib/photo-stories";
import { deletePhotoStory } from "@/app/actions/editorial";
import { Card, CardHeader, PageHeader, buttonClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PhotoStoryForm } from "@/components/editorial/photo-story-form";

export const dynamic = "force-dynamic";

export default async function EditPhotoStory({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"], "/editorial");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = (await getPhotoStories()).find((x) => x.id === id);
  if (!s) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/editorial/photo-stories" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Photo stories</Link>
        <PageHeader title={s.title} actions={s.published ? <a href={`/photo-stories/${s.slug}`} target="_blank" className={buttonClass("outline")}><ExternalLink className="size-4" /> View on website</a> : undefined} />
        <PhotoStoryForm key={JSON.stringify(s)} s={s} savedMsg={sp.saved ? "Photo story created." : undefined} />
      </div>
      <Card className="border-red-200">
        <CardHeader title="Delete photo story" desc="Removes the story from the website. The photos stay in the Media library." />
        <form action={deletePhotoStory} className="p-5">
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton variant="danger" size="sm" confirm={`Delete “${s.title}”? This can't be undone.`}><Trash2 className="size-4" /> Delete photo story</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
