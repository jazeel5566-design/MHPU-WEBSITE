import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Badge, ButtonLink, Card, PageHeader, Table, Td, Th } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EventsAdmin() {
  await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"], "/editorial");
  const events = await db.event.findMany({ include: { _count: { select: { rsvps: true } } }, orderBy: { startsAt: "desc" } });
  const now = new Date();
  return (
    <div>
      <PageHeader title="Events" actions={<ButtonLink href="/editorial/events/new"><Plus className="size-4" /> New event</ButtonLink>} />
      <Card>
        <Table>
          <thead><tr><Th>Event</Th><Th>When</Th><Th>Audience</Th><Th>RSVPs</Th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className={`hover:bg-sand-50 ${e.startsAt < now ? "opacity-60" : ""}`}>
                <Td><Link href={`/editorial/events/${e.id}`} className="font-semibold hover:text-brand-700">{e.title}</Link>{!e.published && <Badge className="ms-2">Hidden</Badge>}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(e.startsAt)}</Td>
                <Td><Badge tone={e.visibility === "MEMBERS" ? "violet" : "brand"}>{e.visibility === "MEMBERS" ? "Members" : "Public"}</Badge></Td>
                <Td>{e._count.rsvps}{e.capacity ? ` / ${e.capacity}` : ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
