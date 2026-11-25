import Link from "next/link";
import { Plus, Images } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getPhotoStories, galleryOf } from "@/lib/photo-stories";
import { formatDate } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Photo stories" };

export default async function PhotoStoriesAdmin() {
  await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"], "/editorial");
  const list = await getPhotoStories();
  return (
    <div>
      <PageHeader title="Photo stories" desc="Photo galleries from union events, shown on the public Photo stories page." actions={<ButtonLink href="/editorial/photo-stories/new"><Plus className="size-4" /> New photo story</ButtonLink>} />
      <Card>
        {list.length === 0 ? <div className="p-6"><EmptyState title="No photo stories yet" /></div> : (
          <Table>
            <thead><tr><Th>Story</Th><Th>Date</Th><Th>Photos</Th><Th>Status</Th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-sand-50">
                  <Td>
                    <Link href={`/editorial/photo-stories/${s.id}`} className="flex items-center gap-3 font-semibold hover:text-brand-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.cover} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                      <span>{s.title}{s.tag && <span className="block text-xs font-normal text-muted">{s.tag}</span>}</span>
                    </Link>
                  </Td>
                  <Td className="text-muted">{formatDate(new Date(s.date))}</Td>
                  <Td><span className="inline-flex items-center gap-1 text-muted"><Images className="size-4" /> {galleryOf(s).length}</span></Td>
                  <Td>{s.published ? <Badge tone="green">Shown</Badge> : <Badge>Hidden</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
