import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PhotoStoryForm } from "@/components/editorial/photo-story-form";

export const metadata = { title: "New photo story" };

export default async function NewPhotoStory() {
  await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"], "/editorial");
  return (
    <div>
      <Link href="/editorial/photo-stories" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Photo stories</Link>
      <PageHeader title="New photo story" />
      <PhotoStoryForm s={{}} />
    </div>
  );
}
