import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { flushBallots } from "@/lib/ballots";
import { requireActiveMember } from "@/lib/auth";
import { phaseOf, ineligibleReason, tally } from "@/lib/elections";
import { formatDateTime } from "@/lib/utils";
import { ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { ElectionBallot } from "@/components/elections";

export const dynamic = "force-dynamic";

export default async function MemberElection({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { member }] = await Promise.all([params, requireActiveMember()]);
  {
    const basic = await db.election.findUnique({ where: { id }, select: { closesAt: true } });
    if (basic && basic.closesAt < new Date()) await flushBallots(id, true); // count sealed ballots before showing results
  }
  const e = await db.election.findUnique({
    where: { id },
    include: {
      affiliate: { select: { name: true } },
      positions: { orderBy: { order: "asc" }, include: { candidates: { include: { member: { select: { fullName: true, role: true, employer: true } }, _count: { select: { votes: true } } } } } },
      voters: { where: { memberId: member.id }, select: { votedAt: true } },
    },
  });
  if (!e || (e.affiliateId && e.affiliateId !== member.affiliateId)) notFound();
  const phase = phaseOf(e);
  const voted = e.voters[0];
  const why = ineligibleReason(member, e);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/members/elections" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Elections</Link>
      <PageHeader kicker={e.affiliate?.name ?? "All MHPU members"} title={e.title} desc={`Voting ${formatDateTime(e.opensAt)} → ${formatDateTime(e.closesAt)}`} />
      {e.description && <p className="-mt-2 mb-6 whitespace-pre-wrap text-sm text-muted">{e.description}</p>}

      {phase === "UPCOMING" && (
        <Card className="p-6">
          <p className="flex items-center gap-2 font-semibold"><Lock className="size-5 text-brand-600" /> Voting opens {formatDateTime(e.opensAt)}.</p>
          <h3 className="mt-5 font-bold">Candidates</h3>
          {e.positions.map((p) => (
            <div key={p.id} className="mt-3"><div className="text-sm font-semibold">{p.title}</div><div className="text-sm text-muted">{p.candidates.map((c) => c.member.fullName).join(", ") || "To be announced"}</div></div>
          ))}
          {why && <div className="mt-5"><Notice tone="amber">{why}</Notice></div>}
        </Card>
      )}

      {phase === "OPEN" && (voted ? (
        <Notice><CheckCircle2 className="me-1 inline size-4" /> You voted on {formatDateTime(voted.votedAt)}. Results will be shared after voting closes.</Notice>
      ) : why ? (
        <div className="space-y-3"><Notice tone="amber">{why}</Notice>{why.includes("dues") && <ButtonLink href="/members/dues">Go to dues</ButtonLink>}</div>
      ) : (
        <ElectionBallot electionId={e.id} positions={e.positions.map((p) => ({ id: p.id, title: p.title, seats: p.seats, candidates: p.candidates.map((c) => ({ id: c.id, name: c.member.fullName, detail: [c.member.role, c.member.employer].filter(Boolean).join(" · "), statement: c.statement })) }))} />
      ))}

      {phase === "CLOSED" && (e.resultsPublished ? (
        <Card className="space-y-6 p-6">
          <h2 className="text-xl font-bold">Results</h2>
          {e.positions.map((p) => {
            const rows = tally({ seats: p.seats, candidates: p.candidates.map((c) => ({ id: c.id, name: c.member.fullName, votes: c._count.votes })) });
            const total = rows.reduce((a, r) => a + r.votes, 0);
            return (
              <div key={p.id}>
                <h3 className="font-bold">{p.title}</h3>
                <ul className="mt-2 space-y-2">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{r.elected && <Trophy className="me-1 inline size-4 text-amber-500" />}{r.name}</span><span className="text-muted">{r.votes}</span></div>
                      <div className="h-2 rounded-full bg-sand-100"><div className={`h-full rounded-full ${r.elected ? "bg-brand-600" : "bg-slate-300"}`} style={{ width: `${total ? (r.votes / total) * 100 : 0}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {voted && <p className="text-xs text-muted">You took part in this election.</p>}
        </Card>
      ) : <Notice tone="brand">Voting has closed. Results will appear here once they are published.</Notice>)}
    </div>
  );
}
