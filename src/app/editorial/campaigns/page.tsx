import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge, ButtonLink, Card, PageHeader, Progress, StatusBadge, Table, Td, Th } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CampaignsAdmin() {
  await requireRole(["ADMIN", "EDITOR"], "/editorial");
  const list = await db.campaign.findMany({ include: { _count: { select: { signatures: true } } }, orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <PageHeader title="Campaigns" desc="Campaign pages and petitions. The featured campaign appears in the homepage hero." actions={<ButtonLink href="/editorial/campaigns/new"><Plus className="size-4" /> New campaign</ButtonLink>} />
      <Card>
        <Table>
          <thead><tr><Th>Campaign</Th><Th>Status</Th><Th>Signatures</Th><Th className="text-end">Export</Th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="hover:bg-sand-50">
                <Td><Link href={`/editorial/campaigns/${c.id}`} className="font-semibold hover:text-brand-700">{c.title}</Link> {c.featured && <Badge tone="coral" className="ms-1">Featured</Badge>}</Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td className="w-64">{c.hasPetition ? <div><div className="mb-1 text-xs text-muted">{c._count.signatures.toLocaleString()} / {c.goal.toLocaleString()}</div><Progress value={c._count.signatures} max={c.goal} /></div> : <span className="text-muted">—</span>}</Td>
                <Td className="text-end">{c.hasPetition && <a href={`/api/export/signatures/${c.id}`} className="text-sm font-semibold text-brand-700">CSV</a>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
