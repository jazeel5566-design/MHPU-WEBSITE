import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Trophy, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { phaseOf, eligibleWhere, tally } from "@/lib/elections";
import { toLocalInput } from "@/lib/dates";
import { formatDateTime } from "@/lib/utils";
import { removePosition, removeCandidate, publishResults, deleteElection } from "@/app/actions/elections";
import { Badge, Card, CardHeader, Notice, PageHeader, Progress } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ElectionForm, PositionForm, CandidateForm } from "@/components/elections";

export const dynamic = "force-dynamic";

export default async function ElectionAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireRole(["ADMIN"], "/admin");
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const e = await db.election.findUnique({
    where: { id },
    include: {
      affiliate: { select: { name: true } },
      positions: { orderBy: { order: "asc" }, include: { candidates: { include: { member: { select: { fullName: true, membershipNo: true, role: true, employer: true } }, _count: { select: { votes: true } } } } } },
      _count: { select: { voters: true } },
    },
  });
  if (!e) notFound();
  const phase = phaseOf(e);
  const [eligible, unions] = await Promise.all([db.member.count({ where: eligibleWhere(e) }), db.affiliate.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  const turnout = eligible ? Math.round((e._count.voters / eligible) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href="/admin/elections" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Elections</Link>
      <PageHeader kicker={e.affiliate?.name ?? "All MHPU members"} title={e.title}
        desc={`Voting ${formatDateTime(e.opensAt)} → ${formatDateTime(e.closesAt)}`}
        actions={phase === "OPEN" ? <Badge tone="coral">Voting open</Badge> : phase === "UPCOMING" ? <Badge tone="blue">Upcoming</Badge> : <Badge>Closed</Badge>} />
      {error && <Notice tone="red">{error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="text-sm text-muted">Eligible voters</div><div className="mt-1 text-3xl font-extrabold">{eligible}</div><div className="text-xs text-muted">{e.requireDuesPaid ? "Active, dues up to date" : "Active members"}</div></Card>
        <Card className="p-5"><div className="text-sm text-muted">Votes cast</div><div className="mt-1 text-3xl font-extrabold">{e._count.voters}</div><div className="mt-2"><Progress value={e._count.voters} max={Math.max(1, eligible)} /></div></Card>
        <Card className="p-5"><div className="text-sm text-muted">Turnout</div><div className="mt-1 text-3xl font-extrabold">{turnout}%</div><div className="text-xs text-muted">Updated live</div></Card>
      </div>

      {phase === "CLOSED" ? (
        <Card>
          <CardHeader title="Results" desc={e.resultsPublished ? "Published — members of this union can see them." : "Only admins can see these until you publish them."}
            action={<form action={publishResults}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="publish" value={e.resultsPublished ? "0" : "1"} /><SubmitButton size="sm" variant={e.resultsPublished ? "outline" : "coral"} confirm={e.resultsPublished ? "Hide the results from members again?" : "Publish the results to members?"}>{e.resultsPublished ? "Unpublish" : "Publish results"}</SubmitButton></form>} />
          <div className="space-y-6 p-5">
            {e.positions.map((p) => {
              const rows = tally({ seats: p.seats, candidates: p.candidates.map((c) => ({ id: c.id, name: c.member.fullName, votes: c._count.votes })) });
              const total = rows.reduce((a, r) => a + r.votes, 0);
              return (
                <div key={p.id}>
                  <h3 className="font-bold">{p.title} <span className="text-xs font-normal text-muted">· {p.seats} seat{p.seats > 1 ? "s" : ""}</span></h3>
                  <ul className="mt-2 space-y-2">
                    {rows.map((r) => (
                      <li key={r.id}>
                        <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{r.elected && <Trophy className="me-1 inline size-4 text-amber-500" />}{r.name}{r.tie && <Badge tone="amber" className="ms-2">Tie</Badge>}</span><span className="text-muted">{r.votes} vote{r.votes === 1 ? "" : "s"}</span></div>
                        <div className="h-2 rounded-full bg-sand-100"><div className={`h-full rounded-full ${r.elected ? "bg-brand-600" : "bg-slate-300"}`} style={{ width: `${total ? (r.votes / total) * 100 : 0}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                  {rows.some((r) => r.tie) && <p className="mt-2 text-xs text-amber-700">There is a tie at the cut-off — resolve it as your union rules require (e.g. a run-off).</p>}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Positions & candidates" desc={phase === "OPEN" ? "Locked while voting is open. Results appear here after voting closes." : "Add each ExCom position and its candidates. This locks when voting opens."} />
          <div className="space-y-5 p-5">
            {phase === "OPEN" && <Notice tone="brand"><Lock className="me-1 inline size-4" /> Voting is open — vote counts are hidden until it closes, so nobody (including admins) can see a running tally.</Notice>}
            {e.positions.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold">{p.title} <span className="text-xs font-normal text-muted">· {p.seats} seat{p.seats > 1 ? "s" : ""}</span></h3>
                  {phase === "UPCOMING" && <form action={removePosition}><input type="hidden" name="id" value={p.id} /><SubmitButton size="sm" variant="ghost" className="text-red-600" confirm={`Remove the position ${p.title} and its candidates?`} aria-label="Remove position"><Trash2 className="size-4" /></SubmitButton></form>}
                </div>
                <ul className="my-3 space-y-1.5">
                  {p.candidates.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span><span className="font-semibold">{c.member.fullName}</span> <span className="text-muted">· {c.member.membershipNo}{c.member.role ? ` · ${c.member.role}` : ""}</span>{c.statement && <span className="block text-xs italic text-muted">“{c.statement}”</span>}</span>
                      {phase === "UPCOMING" && <form action={removeCandidate}><input type="hidden" name="id" value={c.id} /><SubmitButton size="sm" variant="ghost" className="h-7 text-red-600">Remove</SubmitButton></form>}
                    </li>
                  ))}
                  {p.candidates.length === 0 && <li className="text-sm text-muted">No candidates yet.</li>}
                </ul>
                {phase === "UPCOMING" && <CandidateForm positionId={p.id} />}
              </div>
            ))}
            {phase === "UPCOMING" && <PositionForm electionId={e.id} />}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Election details" desc={phase === "UPCOMING" ? undefined : "Locked once voting opens."} />
        <div className="p-5">
          <ElectionForm locked={phase !== "UPCOMING"} unions={unions} e={{ id: e.id, title: e.title, description: e.description, affiliateId: e.affiliateId, opensAt: toLocalInput(e.opensAt) ?? "", closesAt: toLocalInput(e.closesAt) ?? "", requireDuesPaid: e.requireDuesPaid }} />
        </div>
      </Card>
      {e._count.voters === 0 && (
        <form action={deleteElection}><input type="hidden" name="id" value={e.id} /><SubmitButton variant="ghost" className="text-red-600" confirm="Delete this election?"><Trash2 className="size-4" /> Delete election</SubmitButton></form>
      )}
    </div>
  );
}
