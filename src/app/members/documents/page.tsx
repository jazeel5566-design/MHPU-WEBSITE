import { FileText, Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireActiveMember } from "@/lib/auth";
import { RESOURCE_CATEGORIES, labelOf } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge, Card, PageHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  await requireActiveMember();
  const docs = await db.resource.findMany({ orderBy: [{ visibility: "desc" }, { createdAt: "desc" }] });
  const groups = RESOURCE_CATEGORIES.map((c) => ({ ...c, items: docs.filter((d) => d.category === c.id) })).filter((g) => g.items.length);
  return (
    <div>
      <PageHeader title="Documents" desc="Agreements, rules, forms and guides — including member-only documents." />
      {groups.length === 0 && <EmptyState title="No documents yet" />}
      <div className="space-y-6">
        {groups.map((g) => (
          <Card key={g.id}>
            <div className="border-b border-line px-5 py-3 font-bold">{g.label}</div>
            <ul className="divide-y divide-line">
              {g.items.map((r) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <FileText className="size-5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-semibold">{r.title} {r.visibility === "MEMBERS" && <Badge tone="violet">Members</Badge>}</div>
                    <div className="text-xs text-muted">{labelOf(RESOURCE_CATEGORIES, r.category)} · {formatDate(r.createdAt)}</div>
                  </div>
                  <a href={`/api/resources/${r.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-100"><Download className="size-3.5" /> Open</a>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
