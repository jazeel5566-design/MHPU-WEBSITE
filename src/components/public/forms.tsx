"use client";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { subscribe, sendContact, signPetition, type FormState } from "@/app/actions/public";
import { Field, Input, Notice, Select, Textarea, Checkbox } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ATOLLS } from "@/lib/constants";

export function NewsletterFormInner({ label }: { label: string }) {
  const [state, action] = useActionState<FormState, FormData>(subscribe, {});
  if (state.ok) return <p className="text-sm font-medium text-brand-200">{state.message}</p>;
  return (
    <form action={action} className="flex max-w-sm gap-2">
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <label className="sr-only" htmlFor="nl-email">Email</label>
      <input id="nl-email" name="email" type="email" required placeholder="you@example.com"
        className="h-10 min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-brand-300 focus:border-white focus:outline-none" />
      <SubmitButton variant="coral" pendingText="…">{label}</SubmitButton>
      {state.error && <p className="text-xs text-coral-400">{state.error}</p>}
    </form>
  );
}

export function ContactForm() {
  const [state, action] = useActionState<FormState, FormData>(sendContact, {});
  if (state.ok)
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <CheckCircle2 className="size-12 text-emerald-600" />
        <p className="mt-3 font-semibold">{state.message}</p>
      </div>
    );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {state.error && <div className="sm:col-span-2"><Notice tone="red">{state.error}</Notice></div>}
      <Field label="Your name" required><Input name="name" required autoComplete="name" /></Field>
      <Field label="Email" required><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Phone (optional)"><Input name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="Topic" required>
        <Select name="topic" defaultValue="General">
          {["General", "Membership", "Media enquiry", "Partnership", "Website feedback"].map((x) => <option key={x}>{x}</option>)}
        </Select>
      </Field>
      <Field label="Message" className="sm:col-span-2" required><Textarea name="message" required rows={5} /></Field>
      <p className="text-xs text-muted sm:col-span-2">Need help with a problem at work? Members get faster support through the member portal.</p>
      <div className="sm:col-span-2"><SubmitButton pendingText="Sending…">Send message</SubmitButton></div>
    </form>
  );
}

export function PetitionForm({ campaignId, ask }: { campaignId: string; ask?: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(signPetition, {});
  if (state.ok)
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <p className="mt-2 font-semibold text-emerald-900">{state.message}</p>
        <ShareButtons />
      </div>
    );
  return (
    <form action={action} className="space-y-3">
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {ask && <p className="rounded-xl bg-sand-50 p-3 text-sm italic text-ink">“{ask}”</p>}
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <input type="hidden" name="campaignId" value={campaignId} />
      <Field label="Full name" required><Input name="name" required autoComplete="name" /></Field>
      <Field label="Email" required><Input name="email" type="email" required autoComplete="email" /></Field>
      <Field label="Atoll / city">
        <Select name="atoll" defaultValue=""><option value="">Prefer not to say</option>{ATOLLS.map((a) => <option key={a}>{a}</option>)}</Select>
      </Field>
      <Checkbox name="isHealthWorker" label="I work in healthcare" />
      <SubmitButton variant="coral" size="lg" className="w-full" pendingText="Signing…">Add my name</SubmitButton>
      <p className="text-xs text-muted">We&apos;ll only use your details for this campaign. See our privacy notice.</p>
    </form>
  );
}

export function ShareButtons() {
  const share = (net: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title);
    const map: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://x.com/intent/tweet?text=${text}&url=${url}`,
      viber: `viber://forward?text=${text}%20${url}`,
    };
    window.open(map[net], "_blank", "noopener");
  };
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {["whatsapp", "viber", "facebook", "x"].map((n) => (
        <button key={n} type="button" onClick={() => share(n)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold capitalize text-ink ring-1 ring-line hover:ring-brand-400">
          {n === "x" ? "X" : n}
        </button>
      ))}
    </div>
  );
}
