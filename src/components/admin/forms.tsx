"use client";
import { useActionState, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import {
  approveApplication, updateMember, recordPayment, resetPassword, staffReply, createBallot,
  saveAffiliate, createStaff, saveSettings, type AState,
} from "@/app/actions/admin";
import { ATOLLS, MEMBER_STATUSES, PROFESSIONS, ROLE_LABELS, ROLES } from "@/lib/constants";
import { Field, Input, Notice, Select, Textarea, Checkbox } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { Settings } from "@/lib/settings";

function Result({ state }: { state: AState }) {
  if (state.error) return <Notice tone="red">{state.error}</Notice>;
  if (!state.ok) return null;
  return (
    <Notice>
      {state.message}
      {state.tempPassword && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-mono text-sm text-ink ring-1 ring-emerald-200">
          <KeyRound className="size-4 text-emerald-700" /> {state.tempPassword}
        </div>
      )}
    </Notice>
  );
}

export function ApproveForm({ id, affiliates }: { id: string; affiliates: { id: string; shortName: string }[] }) {
  const [state, action] = useActionState<AState, FormData>(approveApplication, {});
  if (state.ok)
    return (
      <div className="w-full space-y-3">
        <Result state={state} />
        <p className="text-xs text-muted">This password is shown once. The member should change it after first login.</p>
        <a href="/admin/applications" className="inline-flex h-8 items-center rounded-full bg-brand-700 px-3 text-sm font-semibold text-white">Done — next application</a>
      </div>
    );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Field label="Affiliate union"><Select name="affiliateId" defaultValue="" className="h-9 py-1.5"><option value="">None</option>{affiliates.map((a) => <option key={a.id} value={a.id}>{a.shortName}</option>)}</Select></Field>
      <SubmitButton size="sm" pendingText="Approving…">Approve & create login</SubmitButton>
      {state.error && <div className="w-full"><Result state={state} /></div>}
    </form>
  );
}

type M = { userTitle?: string | null; hasLogin?: boolean; id: string; fullName: string; phone: string; profession: string; role: string | null; employer: string; atoll: string; status: string; affiliateId: string | null; isRep: boolean; notes: string | null; duesPaidUntil: string };

export function MemberEditForm({ m, affiliates, readOnly }: { m: M; affiliates: { id: string; name: string }[]; readOnly?: boolean }) {
  const [state, action] = useActionState<AState, FormData>(updateMember, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Result state={state} /></div>
      <input type="hidden" name="id" value={m.id} />
      <fieldset disabled={readOnly} className="contents">
        <Field label="Full name"><Input name="fullName" defaultValue={m.fullName} /></Field>
        <Field label="Phone"><Input name="phone" defaultValue={m.phone} /></Field>
        <Field label="Profession"><Select name="profession" defaultValue={m.profession}>{PROFESSIONS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
        <Field label="Job title"><Input name="role" defaultValue={m.role ?? ""} /></Field>
        <Field label="Workplace"><Input name="employer" defaultValue={m.employer} /></Field>
        <Field label="Atoll"><Select name="atoll" defaultValue={m.atoll}>{ATOLLS.map((a) => <option key={a}>{a}</option>)}</Select></Field>
        <Field label="Status"><Select name="status" defaultValue={m.status}>{MEMBER_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Affiliate union"><Select name="affiliateId" defaultValue={m.affiliateId ?? ""}><option value="">None</option>{affiliates.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        <Field label="Dues paid until"><Input type="date" name="duesPaidUntil" defaultValue={m.duesPaidUntil} /></Field>
        <div className="flex items-end pb-2"><Checkbox name="isRep" defaultChecked={m.isRep} label="Workplace representative (shown on 'Find your rep')" /></div>
        {m.hasLogin && <Field label="Title / position (shown when logged in)" hint="For ExCom and officers, e.g. Treasurer. Leave blank for ordinary members."><Input name="userTitle" defaultValue={m.userTitle ?? ""} placeholder="e.g. Vice President" /></Field>}
        <Field label="Internal notes" className="sm:col-span-2"><Textarea name="notes" defaultValue={m.notes ?? ""} rows={3} /></Field>
        {!readOnly && <div><SubmitButton>Save member</SubmitButton></div>}
      </fieldset>
    </form>
  );
}

export function PaymentForm({ memberId, dues }: { memberId: string; dues: number }) {
  const [state, action] = useActionState<AState, FormData>(recordPayment, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <Result state={state} />
      <input type="hidden" name="memberId" value={memberId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (MVR)"><Input name="amount" type="number" step="0.01" defaultValue={dues} required /></Field>
        <Field label="Months covered"><Input name="months" type="number" min={1} defaultValue={1} /></Field>
        <Field label="Period"><Input name="period" placeholder="2026-11" /></Field>
        <Field label="Method"><Select name="method" defaultValue="BANK_TRANSFER"><option value="BANK_TRANSFER">Bank transfer</option><option value="SALARY_DEDUCTION">Salary deduction</option><option value="CASH">Cash</option><option value="CARD">Card</option></Select></Field>
      </div>
      <Field label="Reference"><Input name="reference" /></Field>
      <SubmitButton size="sm">Record payment</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<AState, FormData>(resetPassword, {});
  return (
    <form action={action} className="space-y-3">
      <Result state={state} />
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton size="sm" variant="outline" confirm="Generate a new temporary password? The old one will stop working."><KeyRound className="size-4" /> Reset password</SubmitButton>
    </form>
  );
}

export function StaffReplyForm({ caseId }: { caseId: string }) {
  const [state, action] = useActionState<AState, FormData>(staffReply, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <input type="hidden" name="caseId" value={caseId} />
      <Textarea name="body" rows={4} required placeholder="Write to the member, or tick 'internal note' for staff only…" />
      <div className="flex items-center justify-between gap-3">
        <Checkbox name="internal" label="Internal note (not visible to member)" />
        <SubmitButton pendingText="Sending…">Send</SubmitButton>
      </div>
    </form>
  );
}

export function BallotForm() {
  const [state, action] = useActionState<AState, FormData>(createBallot, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Result state={state} /></div>
      <Field label="Ballot title" required><Input name="title" required placeholder="e.g. Ratify 2027 pay agreement" /></Field>
      <Field label="Question" required><Input name="question" required placeholder="Do you accept the offer?" /></Field>
      <Field label="Opens" required><Input type="datetime-local" name="opensAt" required /></Field>
      <Field label="Closes" required><Input type="datetime-local" name="closesAt" required /></Field>
      <Field label="Background (optional)"><Textarea name="description" rows={4} /></Field>
      <Field label="Options — one per line" required><Textarea name="options" rows={4} required defaultValue={"Yes\nNo"} /></Field>
      <div><SubmitButton>Create ballot</SubmitButton></div>
    </form>
  );
}

type Aff = { id?: string; name: string; nameDv: string | null; shortName: string; description: string | null; website: string | null; memberCount: number };
export function AffiliateForm({ a }: { a?: Aff }) {
  const [state, action] = useActionState<AState, FormData>(saveAffiliate, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Result state={state} /></div>
      {a?.id && <input type="hidden" name="id" value={a.id} />}
      <Field label="Name" required><Input name="name" defaultValue={a?.name} required /></Field>
      <Field label="Short name" required><Input name="shortName" defaultValue={a?.shortName} required /></Field>
      <Field label="Name (ދިވެހި)"><Input name="nameDv" defaultValue={a?.nameDv ?? ""} dir="rtl" className="dv-text" /></Field>
      <Field label="Members"><Input name="memberCount" type="number" defaultValue={a?.memberCount ?? 0} /></Field>
      <Field label="Description" className="sm:col-span-2"><Input name="description" defaultValue={a?.description ?? ""} /></Field>
      <Field label="Website"><Input name="website" defaultValue={a?.website ?? ""} /></Field>
      <div className="flex items-end"><SubmitButton size="sm">{a?.id ? "Save" : "Add affiliate"}</SubmitButton></div>
    </form>
  );
}

export function StaffForm() {
  const [state, action] = useActionState<AState, FormData>(createStaff, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-5">
      <div className="sm:col-span-5"><Result state={state} /></div>
      <Field label="Name"><Input name="name" required /></Field>
      <Field label="Title / position" hint="Optional, e.g. President"><Input name="title" placeholder="e.g. General Secretary" /></Field>
      <Field label="Email"><Input name="email" type="email" required /></Field>
      <Field label="Role"><Select name="role" defaultValue="AUTHOR">{ROLES.filter((r) => r !== "MEMBER").map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select></Field>
      <div className="flex items-end"><SubmitButton>Create account</SubmitButton></div>
    </form>
  );
}

export function SettingsForm({ s }: { s: Settings }) {
  const [state, action] = useActionState<AState, FormData>(saveSettings, {});
  const F = ({ k, label, hint }: { k: keyof Settings; label: string; hint?: string }) => <Field label={label} hint={hint}><Input name={k} defaultValue={s[k]} /></Field>;
  return (
    <form action={action} className="space-y-8">
      <Result state={state} />
      <section className="space-y-4">
        <h2 className="font-bold">Alert banner</h2>
        <Checkbox name="alertEnabled" defaultChecked={s.alertEnabled === "true"} label="Show the alert banner across the top of the public site" />
        <div className="grid gap-4 sm:grid-cols-2"><F k="alertText" label="Banner text" /><F k="alertLink" label="Banner link" hint="e.g. /campaigns/fair-overtime-pay" /></div>
      </section>
      <section className="space-y-4">
        <h2 className="font-bold">Organisation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="siteName" label="Full name" /><F k="shortName" label="Short name" />
          <F k="nameDv" label="Name in Dhivehi" /><F k="registrationNo" label="Registration number" />
          <F k="tagline" label="Tagline" /><F k="monthlyDues" label="Monthly dues (MVR)" /><F k="registrationFee" label="Registration fee (MVR)" />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="font-bold">Contact & social</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F k="hotline" label="Help line" /><F k="whatsapp" label="WhatsApp / Viber" />
          <F k="email" label="Email" /><F k="address" label="Address" />
          <F k="bankDetails" label="Bank details for dues (shown in member portal)" hint="e.g. Bank of Maldives · Acc. 7730-xxxxxx-001 · MHPU" />
          <F k="facebook" label="Facebook URL" /><F k="instagram" label="Instagram URL" /><F k="x" label="X URL" />
        </div>
      </section>
      <SubmitButton size="lg">Save settings</SubmitButton>
    </form>
  );
}
