import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteBallot } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/utils";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { BallotForm } from "@/components/admin/forms";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function BallotsAdmin() {
  await requireRole(["ADMIN"], "/admin");
  const now = new Date();
  const [ballots, eligible] = await Promise.all([
    db.ballot.findMany({ include: { options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } }, _count: { select: { votes: true } } }, orderBy: { opensAt: "desc" } }),
    db.member.count({ where: { status: "ACTIVE" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Ballots & e-voting" desc="One vote per member in good standing. Individual choices are never shown — only totals." />
      <Card><CardHeader title="Create a ballot" /><div className="p-5"><BallotForm /></div></Card>
      {ballots.map((b) => {
        const open = b.opensAt <= now && b.closesAt >= now;
        const turnout = eligible ? Math.round((b._count.votes / eligible) * 100) : 0;
        return (
          <Card key={b.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">{open ? <Badge tone="coral">Open</Badge> : b.closesAt < now ? <Badge>Closed</Badge> : <Badge tone="blue">Scheduled</Badge>}<span className="text-xs text-muted">{formatDateTime(b.opensAt)} → {formatDateTime(b.closesAt)}</span></div>
                <h2 className="mt-2 text-lg font-bold">{b.title}</h2>
                <p className="text-sm text-muted">{b.question}</p>
              </div>
              <form action={deleteBallot}><input type="hidden" name="id" value={b.id} /><SubmitButton size="sm" variant="ghost" className="text-red-600" confirm="Delete this ballot and all votes?"><Trash2 className="size-4" /></SubmitButton></form>
            </div>
            <div className="mt-4 space-y-2">
              {b.options.map((o) => {
                const pct = b._count.votes ? Math.round((o._count.votes / b._count.votes) * 100) : 0;
                return (
                  <div key={o.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{o.label}</span><span className="text-muted">{o._count.votes} ({pct}%)</span></div>
                    <div className="h-2 rounded-full bg-sand-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">{b._count.votes} votes · turnout {turnout}% of {eligible} active members</p>
          </Card>
        );
      })}
    </div>
  );
}
