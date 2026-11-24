import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteMedia } from "@/app/actions/editorial";
import { Card, CardHeader, PageHeader, EmptyState } from "@/components/ui";
import { MediaUpload } from "@/components/editorial/forms";
import { CopyButton } from "@/components/editorial/copy-button";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const user = await requireRole(["ADMIN", "EDITOR", "AUTHOR"], "/editorial");
  const media = await db.media.findMany({ orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } });
  return (
    <div className="space-y-6">
      <PageHeader title="Media library" desc="Upload photos once and reuse them as article covers or inside articles. Always add alt text for screen-reader users." />
      <Card><CardHeader title="Upload images" /><div className="p-5"><MediaUpload /></div></Card>
      {media.length === 0 ? <EmptyState title="No images yet" /> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt ?? ""} className="aspect-video w-full object-cover" loading="lazy" />
              <div className="space-y-1 p-3 text-xs">
                <div className="truncate font-semibold">{m.alt || m.filename}</div>
                <div className="text-muted">{m.uploadedBy?.name ?? "—"}</div>
                <div className="flex items-center justify-between pt-1">
                  <CopyButton text={`![${m.alt ?? ""}](${m.url})`} label="Copy embed" />
                  {user.role !== "AUTHOR" && <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><SubmitButton size="sm" variant="ghost" className="h-7 px-2 text-red-600" confirm="Delete this image?" aria-label="Delete"><Trash2 className="size-3.5" /></SubmitButton></form>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
