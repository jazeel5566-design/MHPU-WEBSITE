import { Vote, CheckCircle2, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { flushClosedBallots } from "@/lib/ballots";
import { requireMember } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Badge, Card, PageHeader, EmptyState } from "@/components/ui";
import { VoteForm } from "@/components/members/forms";

export const metadata = { title: "Ballots" };

export default async function BallotsPage() {
  const { member } = await requireMember();
  const now = new Date();
  await flushClosedBallots(); // count any sealed votes once a ballot has closed
  const ballots = await db.ballot.findMany({
    include: { options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } }, voters: { where: { memberId: member.id }, select: { id: true } }, _count: { select: { votes: true } } },
    orderBy: { closesAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Ballots & votes" desc="MHPU is member-led. Vote on agreements, industrial action and other union questions. Your vote is secret: MHPU records that you voted, never what you chose." />
      {ballots.length === 0 && <EmptyState icon={<Vote className="size-10" />} title="No ballots yet" />}
      <div className="space-y-6">
        {ballots.map((b) => {
          const open = b.opensAt <= now && b.closesAt >= now;
          const closed = b.closesAt < now;
          const voted = b.voters.length > 0;
          return (
            <Card key={b.id} className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                {open ? <Badge tone="coral">Open</Badge> : closed ? <Badge>Closed</Badge> : <Badge tone="blue">Opens {formatDateTime(b.opensAt)}</Badge>}
                {voted && <Badge tone="green">You voted</Badge>}
                <span className="text-xs text-muted">{open ? `Closes ${formatDateTime(b.closesAt)}` : closed ? `Closed ${formatDateTime(b.closesAt)}` : ""}</span>
              </div>
              <h2 className="mt-3 text-xl font-extrabold">{b.title}</h2>
              {b.description && <p className="mt-1 text-sm text-muted">{b.description}</p>}
              <p className="mt-4 font-semibold">{b.question}</p>
              <div className="mt-4">
                {open && !voted && <VoteForm ballotId={b.id} options={b.options} />}
                {open && voted && <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-5" /> Thanks — your vote is in. Results are published when the ballot closes.</p>}
                {!open && !closed && <p className="flex items-center gap-2 text-sm text-muted"><Lock className="size-4" /> Voting hasn&apos;t opened yet.</p>}
                {closed && (
                  <div className="space-y-3">
                    {b.options.map((o) => {
                      const pct = b._count.votes ? Math.round((o._count.votes / b._count.votes) * 100) : 0;
                      return (
                        <div key={o.id}>
                          <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{o.label}</span><span className="text-muted">{pct}% ({o._count.votes})</span></div>
                          <div className="h-2.5 rounded-full bg-sand-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted">{b._count.votes} votes cast</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
