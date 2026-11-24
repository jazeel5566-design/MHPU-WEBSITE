"use client";
import { useActionState, useEffect, useRef } from "react";
import { updateProfile, changePassword, openCase, replyToCase, castVote, type MState } from "@/app/actions/member";
import { ATOLLS, CASE_TYPES } from "@/lib/constants";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

type Profile = { phone: string; email: string; employer: string; role: string | null; atoll: string; island: string | null };

export function ProfileForm({ m }: { m: Profile }) {
  const [state, action] = useActionState<MState, FormData>(updateProfile, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && <div className="sm:col-span-2"><Notice tone="red">{state.error}</Notice></div>}
      {state.ok && <div className="sm:col-span-2"><Notice>{state.message}</Notice></div>}
      <Field label="Mobile"><Input name="phone" defaultValue={m.phone} required /></Field>
      <Field label="Email (also your login)"><Input name="email" type="email" defaultValue={m.email} required /></Field>
      <Field label="Workplace"><Input name="employer" defaultValue={m.employer} required /></Field>
      <Field label="Job title"><Input name="role" defaultValue={m.role ?? ""} /></Field>
      <Field label="Atoll / city"><Select name="atoll" defaultValue={m.atoll}>{ATOLLS.map((a) => <option key={a}>{a}</option>)}</Select></Field>
      <Field label="Island"><Input name="island" defaultValue={m.island ?? ""} /></Field>
      <div className="sm:col-span-2"><SubmitButton>Save changes</SubmitButton></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<MState, FormData>(changePassword, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      {state.ok && <Notice>{state.message}</Notice>}
      <Field label="Current password"><Input name="current" type="password" required autoComplete="current-password" /></Field>
      <Field label="New password" hint="At least 8 characters"><Input name="next" type="password" required minLength={8} autoComplete="new-password" /></Field>
      <Field label="Confirm new password"><Input name="confirm" type="password" required autoComplete="new-password" /></Field>
      <SubmitButton variant="outline">Change password</SubmitButton>
    </form>
  );
}

export function NewCaseForm({ employer }: { employer: string }) {
  const [state, action] = useActionState<MState, FormData>(openCase, {});
  return (
    <form action={action} className="space-y-6">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <fieldset>
        <legend className="mb-3 text-sm font-medium">What is it about? <span className="text-coral-600">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CASE_TYPES.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm font-semibold has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input type="radio" name="type" value={t.id} required className="accent-brand-700" /> {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Short title" required><Input name="subject" required placeholder="e.g. Overtime for October not paid" /></Field>
      <Field label="What happened?" required hint="Include dates, who was involved and what you've already tried. Everything you share is confidential.">
        <Textarea name="description" required rows={7} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Facility"><Input name="facility" defaultValue={employer} /></Field>
        <Field label="How urgent is it?">
          <Select name="urgency" defaultValue="NORMAL">
            <option value="LOW">Low — general question</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High — affecting my pay or job now</option>
            <option value="URGENT">Urgent — meeting/hearing within 48 hours</option>
          </Select>
        </Field>
      </div>
      <SubmitButton size="lg" pendingText="Submitting…">Submit case</SubmitButton>
    </form>
  );
}

export function ReplyForm({ caseId, staff = false }: { caseId: string; staff?: boolean }) {
  const [state, action] = useActionState<MState, FormData>(replyToCase, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <input type="hidden" name="caseId" value={caseId} />
      <Textarea name="body" required rows={3} placeholder={staff ? "Reply to member…" : "Add a message or update for your organiser…"} />
      <SubmitButton pendingText="Sending…">Send</SubmitButton>
    </form>
  );
}

export function VoteForm({ ballotId, options }: { ballotId: string; options: { id: string; label: string }[] }) {
  const [state, action] = useActionState<MState, FormData>(castVote, {});
  if (state.ok) return <Notice>{state.message}</Notice>;
  return (
    <form action={action} className="space-y-3">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <input type="hidden" name="ballotId" value={ballotId} />
      {options.map((o) => (
        <label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border-2 border-line bg-white p-4 font-semibold has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50")}>
          <input type="radio" name="optionId" value={o.id} required className="size-4 accent-brand-700" /> {o.label}
        </label>
      ))}
      <SubmitButton size="lg" variant="coral" confirm="Submit your vote? You can't change it afterwards.">Cast my vote</SubmitButton>
    </form>
  );
}
