"use client";
import { useActionState, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import {
  approveApplication, updateMember, recordPayment, resetPassword, staffReply, createBallot,
  saveAffiliate, createStaff, saveSettings, startDuesCollection, stopDuesCollection, type AState,
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

export function ApproveForm({ id, affiliates, defaultAffiliateId }: { id: string; affiliates: { id: string; shortName: string }[]; defaultAffiliateId?: string | null }) {
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
      <Field label="Workplace union"><Select name="affiliateId" defaultValue={defaultAffiliateId ?? ""} className="h-9 py-1.5"><option value="">None</option>{affiliates.map((a) => <option key={a.id} value={a.id}>{a.shortName}</option>)}</Select></Field>
      <SubmitButton size="sm" pendingText="Approving…">Approve & create login</SubmitButton>
      {state.error && <div className="w-full"><Result state={state} /></div>}
    </form>
  );
}

type M = { userTitle?: string | null; hasLogin?: boolean; id: string; fullName: string; phone: string; email: string; idNumber: string; address: string | null; nationality: string; joinedAt: string; unionMemberNo: string | null; needsReview: boolean; reviewNote: string | null; profession: string; role: string | null; employer: string; atoll: string; status: string; affiliateId: string | null; isRep: boolean; notes: string | null; duesPaidUntil: string };

export function MemberEditForm({ m, affiliates, readOnly }: { m: M; affiliates: { id: string; name: string }[]; readOnly?: boolean }) {
  const [state, action] = useActionState<AState, FormData>(updateMember, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Result state={state} /></div>
      <input type="hidden" name="id" value={m.id} />
      <fieldset disabled={readOnly} className="contents">
        <Field label="Full name"><Input name="fullName" defaultValue={m.fullName} /></Field>
        <Field label="Phone"><Input name="phone" defaultValue={m.phone} /></Field>
        <Field label="Email" hint={m.hasLogin ? "Also changes the email they sign in with." : undefined}><Input name="email" type="email" defaultValue={m.email} /></Field>
        <Field label="ID card / passport no."><Input name="idNumber" defaultValue={m.idNumber} /></Field>
        <Field label="Present address"><Input name="address" defaultValue={m.address ?? ""} /></Field>
        <Field label="Nationality"><Input name="nationality" defaultValue={m.nationality} /></Field>
        <Field label="Member since"><Input type="date" name="joinedAt" defaultValue={m.joinedAt} /></Field>
        <Field label="Profession"><Select name="profession" defaultValue={m.profession}>{PROFESSIONS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
        <Field label="Job title"><Input name="role" defaultValue={m.role ?? ""} /></Field>
        <Field label="Workplace"><Input name="employer" defaultValue={m.employer} /></Field>
        <Field label="Atoll"><Select name="atoll" defaultValue={m.atoll}>{ATOLLS.map((a) => <option key={a}>{a}</option>)}</Select></Field>
        <Field label="Status"><Select name="status" defaultValue={m.status}>{MEMBER_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Workplace union" hint={m.unionMemberNo ? `Union number ${m.unionMemberNo}. Choosing another union gives a new number from that union.` : "Choosing a union gives the member a number from that union."}><Select name="affiliateId" defaultValue={m.affiliateId ?? ""}><option value="">None</option>{affiliates.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        <Field label="Dues paid until"><Input type="date" name="duesPaidUntil" defaultValue={m.duesPaidUntil} /></Field>
        <div className="flex items-end pb-2"><Checkbox name="isRep" defaultChecked={m.isRep} label="Workplace representative (shown on 'Find your rep')" /></div>
        {m.hasLogin && <Field label="Title / position (shown when logged in)" hint="For ExCom and officers, e.g. Treasurer. Leave blank for ordinary members."><Input name="userTitle" defaultValue={m.userTitle ?? ""} placeholder="e.g. Vice President" /></Field>}
        {m.needsReview && <Field label="To check" hint="Update this as you correct things. Mark the record as reviewed when it's all done." className="sm:col-span-2"><Textarea name="reviewNote" defaultValue={m.reviewNote ?? ""} rows={3} /></Field>}
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

type Aff = { id?: string; name: string; nameDv: string | null; shortName: string; description: string | null; website: string | null; memberCount: number; workplace?: string | null; matchNames?: string | null; active?: boolean };
export function AffiliateForm({ a }: { a?: Aff }) {
  const [state, action] = useActionState<AState, FormData>(saveAffiliate, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Result state={state} /></div>
      {a?.id && <input type="hidden" name="id" value={a.id} />}
      <Field label="Union name" required><Input name="name" defaultValue={a?.name} required placeholder="e.g. IGMH Staff Union" /></Field>
      <Field label="Short name" required><Input name="shortName" defaultValue={a?.shortName} required placeholder="e.g. IGMH-SU" /></Field>
      <Field label="Workplaces (shown publicly)" hint="The hospitals/offices this union covers, separated by commas." className="sm:col-span-2"><Input name="workplace" defaultValue={a?.workplace ?? ""} placeholder="e.g. IGMH, Dharumavantha Hospital" /></Field>
      <Field label="Other spellings & abbreviations (matching only — not shown)" hint="Extra names people might type on the membership form, separated by commas." className="sm:col-span-2"><Input name="matchNames" defaultValue={a?.matchNames ?? ""} placeholder="e.g. Indira Gandhi Memorial Hospital, Dharumavanthaa" /></Field>
      <div className="flex items-end pb-2"><Checkbox name="active" defaultChecked={a?.active ?? true} label="Active (used to match new applicants)" /></div>
      <Field label="Name (ދިވެހި)"><Input name="nameDv" defaultValue={a?.nameDv ?? ""} dir="rtl" className="dv-text" /></Field>
      <Field label="Members"><Input name="memberCount" type="number" defaultValue={a?.memberCount ?? 0} /></Field>
      <Field label="Description" className="sm:col-span-2"><Input name="description" defaultValue={a?.description ?? ""} /></Field>
      <Field label="Website"><Input name="website" defaultValue={a?.website ?? ""} /></Field>
      <div className="flex items-end"><SubmitButton size="sm">{a?.id ? "Save" : "Add workplace union"}</SubmitButton></div>
    </form>
  );
}

export function DuesCollectionForm({ on, startDate }: { on: boolean; startDate: string }) {
  const [state, action] = useActionState<AState, FormData>(startDuesCollection, {});
  return (
    <div className="space-y-3">
      <Result state={state} />
      <form action={action} className="flex flex-wrap items-end gap-3">
        <Field label="Dues collection starts on" required><Input type="date" name="startDate" defaultValue={startDate} required className="h-10 py-2" /></Field>
        <div className="pb-2"><Checkbox name="reminders" defaultChecked label="Send SMS reminders 3 days before" /></div>
        <SubmitButton confirm={on ? "Change the date dues collection starts for all members?" : "Start collecting dues from ALL members from this date? Members who don't pay stay 'Not active'."}>
          {on ? "Update start date" : "Start dues collection for all members"}
        </SubmitButton>
      </form>
      {on && (
        <form action={stopDuesCollection}>
          <SubmitButton size="sm" variant="outline" confirm="Stop dues collection? Nobody will be counted as overdue and no reminders will be sent until you start it again.">Stop dues collection</SubmitButton>
        </form>
      )}
    </div>
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

export function SettingsForm({ s, env }: { s: Settings; env: { bml: boolean; bmlMode: string; dhiraagu: boolean; cron: boolean } }) {
  const [state, action] = useActionState<AState, FormData>(saveSettings, {});
  const F = ({ k, label, hint }: { k: keyof Settings; label: string; hint?: string }) => <Field label={label} hint={hint}><Input name={k} defaultValue={s[k]} dir="auto" /></Field>;
  return (
    <form action={action} className="space-y-8">
      <Result state={state} />
      <section className="space-y-3">
        <h2 className="font-bold">Languages</h2>
        <Checkbox name="dhivehiEnabled" defaultChecked={s.dhivehiEnabled !== "false"} label="Offer the Dhivehi (ދިވެހި) version of the website" />
        <Checkbox name="singleLanguageBoth" defaultChecked={s.singleLanguageBoth !== "false"} label="Show articles written in only one language on both the English and Dhivehi versions (in the language they were written in)" />
        <p className="text-xs text-muted">When switched off, the language toggle is hidden and everyone sees the English site. Dhivehi text already written in articles is kept and comes back if you switch it on again.</p>
      </section>
      <section className="space-y-4">
        <h2 className="font-bold">Alert banner</h2>
        <Checkbox name="alertEnabled" defaultChecked={s.alertEnabled === "true"} label="Show the alert banner across the top of the public site" />
        <div className="grid gap-4 sm:grid-cols-2"><F k="alertText" label="Banner text" /><F k="alertLink" label="Banner link" hint="e.g. /campaigns/fair-overtime-pay" /><F k="alertTextDv" label="Banner text in Dhivehi (optional)" hint="Shown when visitors switch to ދިވެހި. Leave blank to show the English text." /></div>
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
      <section id="integrations" className="scroll-mt-24 space-y-4 rounded-2xl border border-line p-5">
        <h2 className="font-bold">Online dues payments</h2>
        <Checkbox name="paymentsEnabled" defaultChecked={s.paymentsEnabled === "true"} label="Let members pay dues online from the member portal" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment provider" hint={env.bml ? `BML key found (${env.bmlMode} mode).` : "BML not configured yet — add BML_API_KEY and BML_MODE in Vercel."}>
            <Select name="paymentProvider" defaultValue={s.paymentProvider}>
              <option value="TEST">Test mode (only admins see it; no real money)</option>
              <option value="BML">Bank of Maldives — BML Connect</option>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line p-5">
        <h2 className="font-bold">SMS</h2>
        <Checkbox name="smsEnabled" defaultChecked={s.smsEnabled === "true"} label="Allow sending SMS from the website" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SMS provider" hint={env.dhiraagu ? "Dhiraagu credentials found." : "Dhiraagu not configured yet — add DHIRAAGU_SMS_USERNAME and DHIRAAGU_SMS_PASSWORD in Vercel."}>
            <Select name="smsProvider" defaultValue={s.smsProvider}>
              <option value="TEST">Test mode (log only, nothing is sent)</option>
              <option value="DHIRAAGU">Dhiraagu Bulk SMS</option>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line p-5">
        <h2 className="font-bold">Automatic dues reminders</h2>
        <Checkbox name="remindersEnabled" defaultChecked={s.remindersEnabled === "true"} label="Send dues reminders by SMS automatically every morning (needs SMS switched on)" />
        {!env.cron && <p className="text-xs text-amber-700">The daily schedule needs CRON_SECRET set in Vercel. Until then you can still send reminders manually from the SMS page.</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <F k="reminderDaysBefore" label="Remind this many days before dues are due" />
          <F k="reminderRepeatDays" label="Repeat overdue reminders every (days)" />
          <F k="reminderMaxOverdue" label="Maximum overdue reminders" />
        </div>
        <Field label="“Due soon” message" hint="Placeholders: {name} {membershipNo} {dueDate} {payLink} {hotline}"><Textarea name="reminderUpcomingText" defaultValue={s.reminderUpcomingText} rows={2} /></Field>
        <Field label="“Overdue” message"><Textarea name="reminderOverdueText" defaultValue={s.reminderOverdueText} rows={2} /></Field>
      </section>

      <SubmitButton size="lg">Save settings</SubmitButton>
    </form>
  );
}
