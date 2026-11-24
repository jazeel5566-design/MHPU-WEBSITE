"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { saveElection, addPosition, addCandidate, castElectionBallot, type EState } from "@/app/actions/elections";
import { Avatar, Button, Checkbox, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

type ElectionFormValues = { id?: string; title: string; description: string | null; affiliateId: string | null; opensAt: string; closesAt: string; requireDuesPaid: boolean };

export function ElectionForm({ e, unions, locked }: { e?: ElectionFormValues; unions: { id: string; name: string }[]; locked?: boolean }) {
  const [state, action] = useActionState<EState, FormData>(saveElection, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && <div className="sm:col-span-2"><Notice tone="red">{state.error}</Notice></div>}
      {state.ok && <div className="sm:col-span-2"><Notice>{state.message}</Notice></div>}
      {e?.id && <input type="hidden" name="id" value={e.id} />}
      <fieldset disabled={locked} className="contents">
        <Field label="Election title" required className="sm:col-span-2"><Input name="title" required defaultValue={e?.title} placeholder="e.g. IGMH Staff Union — ExCom election 2027" /></Field>
        <Field label="Who votes?" required className="sm:col-span-2" hint="Only active members of this workplace union can vote. Choose “All MHPU members” for federation-wide elections.">
          <Select name="affiliateId" defaultValue={e?.affiliateId ?? ""}>
            <option value="">All MHPU members</option>
            {unions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Voting opens" required><Input type="datetime-local" name="opensAt" required defaultValue={e?.opensAt} /></Field>
        <Field label="Voting closes" required><Input type="datetime-local" name="closesAt" required defaultValue={e?.closesAt} /></Field>
        <Field label="Information for voters (optional)" className="sm:col-span-2"><Textarea name="description" rows={3} defaultValue={e?.description ?? ""} placeholder="e.g. Nominations closed on 1 March. The new ExCom serves a two-year term." /></Field>
        <div className="sm:col-span-2"><Checkbox name="requireDuesPaid" defaultChecked={e?.requireDuesPaid ?? true} label="Only members whose dues are up to date can vote" /></div>
        {!locked && <div><SubmitButton>{e?.id ? "Save changes" : "Create election"}</SubmitButton></div>}
      </fieldset>
    </form>
  );
}

export function PositionForm({ electionId }: { electionId: string }) {
  const [state, action] = useActionState<EState, FormData>(addPosition, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="electionId" value={electionId} />
      <Field label="Position" className="min-w-48 flex-1"><Input name="title" required placeholder="e.g. President" /></Field>
      <Field label="Seats" hint="How many are elected"><Input name="seats" type="number" min={1} max={20} defaultValue={1} className="w-24" /></Field>
      <SubmitButton size="sm">Add position</SubmitButton>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function CandidateForm({ positionId }: { positionId: string }) {
  const [state, action] = useActionState<EState, FormData>(addCandidate, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
      <input type="hidden" name="positionId" value={positionId} />
      <Field label="Candidate's membership no." className="w-48"><Input name="membershipNo" required placeholder="MHPU-0123" /></Field>
      <Field label="Short statement (optional)" className="min-w-48 flex-1"><Input name="statement" placeholder="Shown to voters on the ballot" /></Field>
      <SubmitButton size="sm" variant="outline">Add candidate</SubmitButton>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  );
}

type BallotPosition = { id: string; title: string; seats: number; candidates: { id: string; name: string; detail: string; statement: string | null }[] };

export function ElectionBallot({ electionId, positions }: { electionId: string; positions: BallotPosition[] }) {
  const [state, action] = useActionState<EState, FormData>(castElectionBallot, {});
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [review, setReview] = useState(false);

  if (state.ok)
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <p className="mt-3 text-lg font-bold">{state.message}</p>
        <p className="mt-1 text-sm text-muted">Your ballot is secret: the union records that you voted, never who you voted for.</p>
      </div>
    );

  function toggle(p: BallotPosition, cid: string) {
    setPicks((cur) => {
      const list = cur[p.id] ?? [];
      if (p.seats === 1) return { ...cur, [p.id]: list[0] === cid ? [] : [cid] };
      if (list.includes(cid)) return { ...cur, [p.id]: list.filter((x) => x !== cid) };
      if (list.length >= p.seats) return cur;
      return { ...cur, [p.id]: [...list, cid] };
    });
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="electionId" value={electionId} />
      {Object.entries(picks).flatMap(([pid, ids]) => ids.map((cid) => <input key={pid + cid} type="hidden" name={`pos_${pid}`} value={cid} />))}
      {state.error && <Notice tone="red">{state.error}</Notice>}

      {!review ? (
        <>
          {positions.map((p) => {
            const chosen = picks[p.id] ?? [];
            return (
              <fieldset key={p.id} className="rounded-2xl border border-line bg-white p-5">
                <legend className="float-left mb-3 flex w-full items-baseline justify-between gap-3">
                  <span className="text-lg font-bold">{p.title}</span>
                  <span className="text-xs font-semibold text-muted">{p.seats === 1 ? "Choose 1" : `Choose up to ${p.seats}`} · {chosen.length} selected</span>
                </legend>
                <div className="clear-both grid gap-2">
                  {p.candidates.length === 0 && <p className="text-sm text-muted">No candidates for this position.</p>}
                  {p.candidates.map((c) => {
                    const on = chosen.includes(c.id);
                    const full = !on && p.seats > 1 && chosen.length >= p.seats;
                    return (
                      <button type="button" key={c.id} onClick={() => toggle(p, c.id)} disabled={full} aria-pressed={on}
                        className={cn("flex items-start gap-3 rounded-xl border-2 p-3 text-start transition", on ? "border-brand-600 bg-brand-50" : "border-line hover:border-brand-300", full && "opacity-50")}>
                        <span className={cn("mt-1 grid size-5 shrink-0 place-items-center border-2", p.seats === 1 ? "rounded-full" : "rounded-md", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>{on && <CheckCircle2 className="size-3.5" />}</span>
                        <Avatar name={c.name} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{c.name}</span>
                          <span className="block text-xs text-muted">{c.detail}</span>
                          {c.statement && <span className="mt-1 block text-sm italic text-ink/80">“{c.statement}”</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          <p className="text-xs text-muted">You may leave a position blank to abstain.</p>
          <Button type="button" size="lg" className="w-full" onClick={() => setReview(true)}>Review my choices</Button>
        </>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="text-lg font-bold">Check your ballot</h3>
          <dl className="mt-3 divide-y divide-line">
            {positions.map((p) => (
              <div key={p.id} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="font-semibold">{p.title}</dt>
                <dd className="text-end">{(picks[p.id] ?? []).map((cid) => p.candidates.find((c) => c.id === cid)?.name).join(", ") || <span className="text-muted">Abstain</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-sand-50 p-3 text-xs text-muted"><ShieldCheck className="size-4 shrink-0 text-brand-600" /> Once submitted your vote can&apos;t be changed. It is secret: MHPU records that you voted, not who you chose.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setReview(false)}>Change choices</Button>
            <SubmitButton variant="coral" pendingText="Submitting…">Submit my vote</SubmitButton>
          </div>
        </div>
      )}
    </form>
  );
}
