import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { phaseOf } from "@/lib/elections";
import { formatDateTime } from "@/lib/utils";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { ElectionForm } from "@/components/elections";

export const metadata = { title: "Elections" };
export const dynamic = "force-dynamic";

export default async function ElectionsAdmin() {
  await requireRole(["ADMIN"], "/admin");
  const [elections, unions] = await Promise.all([
    db.election.findMany({ include: { affiliate: { select: { name: true } }, _count: { select: { voters: true, positions: true } } }, orderBy: { opensAt: "desc" } }),
    db.affiliate.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Elections" desc="Run secret-ballot elections for workplace union ExComs (or federation-wide). Set up positions and candidates before voting opens." />
      <Card>
        {elections.length === 0 ? <div className="p-6"><EmptyState title="No elections yet" desc="Create the first one below." /></div> : (
          <Table>
            <thead><tr><Th>Election</Th><Th>Voters</Th><Th>Voting window</Th><Th>Status</Th><Th>Turnout</Th></tr></thead>
            <tbody>
              {elections.map((e) => {
                const ph = phaseOf(e);
                return (
                  <tr key={e.id} className="hover:bg-sand-50">
                    <Td><Link href={`/admin/elections/${e.id}`} className="font-semibold hover:text-brand-700">{e.title}</Link><div className="text-xs text-muted">{e._count.positions} position{e._count.positions === 1 ? "" : "s"}</div></Td>
                    <Td className="text-muted">{e.affiliate?.name ?? "All MHPU members"}</Td>
                    <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(e.opensAt)} →<br />{formatDateTime(e.closesAt)}</Td>
                    <Td>{ph === "OPEN" ? <Badge tone="coral">Voting open</Badge> : ph === "UPCOMING" ? <Badge tone="blue">Upcoming</Badge> : e.resultsPublished ? <Badge tone="green">Results published</Badge> : <Badge>Closed</Badge>}</Td>
                    <Td>{e._count.voters} voted</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Card><CardHeader title="New election" /><div className="p-5"><ElectionForm unions={unions} /></div></Card>
    </div>
  );
}
