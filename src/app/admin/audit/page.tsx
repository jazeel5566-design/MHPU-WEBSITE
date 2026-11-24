import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Card, PageHeader, Table, Td, Th } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireRole(["ADMIN"], "/admin");
  const logs = await db.auditLog.findMany({ include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <div>
      <PageHeader title="Audit log" desc="Every sign-in and change made in the portals (latest 300)." />
      <Card>
        <Table>
          <thead><tr><Th>When</Th><Th>Who</Th><Th>Action</Th><Th>Record</Th><Th>Detail</Th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</Td>
                <Td>{l.user?.name ?? "System"}<div className="text-xs text-muted">{l.user?.role}</div></Td>
                <Td className="font-mono text-xs">{l.action}</Td>
                <Td className="text-muted">{l.entity}</Td>
                <Td className="text-muted">{l.detail}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
