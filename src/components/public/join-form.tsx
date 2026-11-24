"use client";
import { useActionState, useState } from "react";
import { CheckCircle2, Stethoscope, HeartPulse, FlaskConical, Building2, Users, Globe2, FileUp, FileText, X } from "lucide-react";
import { applyToJoin, type FormState } from "@/app/actions/public";
import { ATOLLS, JOIN_CATEGORIES, PROFESSIONS } from "@/lib/constants";
import { Field, Input, Notice, Select, ButtonLink } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SignaturePad } from "./signature-pad";
import { cn } from "@/lib/utils";
import { shrinkImage } from "@/lib/shrink-image";
import { matchWorkplaceUnion, workplacesOf } from "@/lib/workplace";
import { useT } from "@/components/lang-provider";

const ICONS: Record<string, React.ElementType> = { nurse: HeartPulse, doctor: Stethoscope, allied: FlaskConical, community: Building2, support: Users, expat: Globe2 };
const MAX = 4 * 1024 * 1024; // server/Vercel limit per upload

// Official declaration wording from MHPU's membership application form.
const DECLARATION = "I, the undersigned, apply for membership of the MHPU and declare that the foregoing statements are correct. I wish to join MHPU subject to the rule and constitution of the Union. I hereby undertake, if accepted as a member, to abide the rules of the Union and use my best endeavours to promote its objectives and interests.";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <legend className="float-left mb-4 flex w-full items-center gap-2 text-lg font-bold">
        <span className="grid size-7 place-items-center rounded-full bg-brand-900 text-sm text-white">{n}</span>{title}
      </legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

export function JoinForm({ dues, registration, unions }: { dues: number; registration: number; unions: { id: string; name: string; workplace: string | null; matchNames: string | null }[] }) {
  const T = useT();
  const [state, action] = useActionState<FormState, FormData>(applyToJoin, {});
  const [cat, setCat] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState("");
  const [preview, setPreview] = useState("");
  const [signed, setSigned] = useState(false);
  const [employer, setEmployer] = useState("");
  const matched = matchWorkplaceUnion(employer, unions);
  const today = new Date().toISOString().slice(0, 10);

  if (state.ok) {
    const [first, ref] = (state.message ?? "|").split("|");
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
        <h2 className="mt-4 text-2xl font-extrabold">{T("Application received")} — {T("thank you")}, {first}!</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">{T("Your membership application has been submitted to the Maldives Health Professionals Union. Our office will review it and contact you. Once approved you'll receive your membership number and member-portal login.")}</p>
        <div className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-mono text-lg font-bold ring-1 ring-emerald-200">{T("Reference:")} {ref}</div>
        <div className="mt-6"><ButtonLink href="/" variant="outline">{T("Back to home")}</ButtonLink></div>
      </div>
    );
  }

  async function pickFile(f: File | null, input?: HTMLInputElement) {
    setFileErr("");
    setPreview("");
    if (!f) return setFile(null);
    let out = f;
    try { out = await shrinkImage(f); } catch { /* keep original */ }
    if (out.size > MAX) {
      setFile(null);
      if (input) input.value = "";
      setFileErr(f.type === "application/pdf" ? "That PDF is larger than 4 MB. Please upload a photo of your ID instead, or a smaller PDF." : "That file is too large. Please upload a smaller photo or PDF (max 4 MB).");
      return;
    }
    if (input && out !== f) { const dt = new DataTransfer(); dt.items.add(out); input.files = dt.files; }
    setFile(out);
    if (out.type.startsWith("image/")) setPreview(URL.createObjectURL(out));
  }

  return (
    <form action={action} className="space-y-6" onSubmit={(e) => {
      if (!signed) { e.preventDefault(); document.getElementById("sig")?.scrollIntoView({ behavior: "smooth", block: "center" }); alert("Please sign in the signature box before submitting."); }
    }}>
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <Step n={1} title={T("Which best describes you?")}>
        <p className="-mt-1 mb-4 text-sm text-muted">{T("Optional — helps us connect you with the right affiliated union and rep.")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {JOIN_CATEGORIES.map((c) => {
            const Icon = ICONS[c.id];
            return (
              <label key={c.id} className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition", cat === c.id ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:border-brand-300")}>
                <input type="radio" name="category" value={c.id} checked={cat === c.id} onChange={() => setCat(c.id)} className="sr-only" />
                <Icon className={cn("size-6 shrink-0", cat === c.id ? "text-brand-600" : "text-muted")} />
                <span><span className="block font-bold">{T(c.label)}</span><span className="block text-xs text-muted">{T(c.desc)}</span></span>
              </label>
            );
          })}
        </div>
      </Step>

      <Step n={2} title={T("Your details")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={T("Full name")} required className="sm:col-span-2"><Input name="fullName" required autoComplete="name" /></Field>
          <Field label={T("Present address")} required className="sm:col-span-2"><Input name="address" required autoComplete="street-address" placeholder={T("House / flat, street, island")} /></Field>
          <Field label={T("Country")} required><Input name="country" required defaultValue="Maldives" autoComplete="country-name" /></Field>
          <Field label={T("National ID / Passport no.")} required><Input name="idNumber" required /></Field>
          <Field label={T("Email")} required><Input name="email" type="email" required autoComplete="email" /></Field>
          <Field label={T("Phone number")} required><Input name="phone" type="tel" required autoComplete="tel" placeholder="+960" /></Field>
        </div>
      </Step>

      <Step n={3} title={T("Current employment details")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={T("Job / job title")} required><Input name="jobTitle" required placeholder={T("e.g. Staff Nurse")} /></Field>
          <Field label={T("Hospital / company")} required hint={unions.length ? T("Start typing to see workplaces with a union.") : undefined}>
            <Input name="employer" required placeholder={T("e.g. IGMH")} list="mhpu-workplaces" autoComplete="organization" value={employer} onChange={(e) => setEmployer(e.target.value)} />
            <datalist id="mhpu-workplaces">{unions.flatMap((u) => workplacesOf(u)).map((w) => <option key={w} value={w} />)}</datalist>
          </Field>
          {employer.trim().length >= 2 && unions.length > 0 && (
            <div className="sm:col-span-2" aria-live="polite">
              {matched
                ? <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"><CheckCircle2 className="size-4 shrink-0" /> {T("Your workplace union:")} <strong>{matched.name}</strong>{T(". You'll be placed in it automatically.")}</p>
                : <p className="rounded-xl bg-sand-50 px-3 py-2.5 text-sm text-muted">{T("No workplace union is registered for this workplace yet — no problem, you'll join MHPU directly.")}</p>}
            </div>
          )}
          <Field label={T("Profession")}><Select name="profession" defaultValue=""><option value="">{T("Choose…")}</option>{PROFESSIONS.map((p) => <option key={p} value={p}>{T(p)}</option>)}</Select></Field>
          <Field label={T("Atoll / city of workplace")}><Select name="atoll" defaultValue=""><option value="">{T("Choose…")}</option>{ATOLLS.map((a) => <option key={a} value={a}>{T(a)}</option>)}</Select></Field>
          <Field label={T("Island")}><Input name="island" /></Field>
          <Field label={T("Referred by a colleague?")} hint={T("Their name or membership number (optional)")}><Input name="referredBy" /></Field>
        </div>
      </Step>

      <Step n={4} title={T("Required document")}>
        <Field label={T("Copy of National ID / Passport")} required hint={T("A clear photo or PDF of your National ID or passport. Large photos are resized automatically.")}>
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-sand-50 p-3">
              {preview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={preview} alt={T("ID preview")} className="h-16 w-24 rounded-lg object-cover" />
                : <span className="grid h-16 w-24 place-items-center rounded-lg bg-white"><FileText className="size-7 text-brand-600" /></span>}
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{file.name}</div><div className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</div></div>
              <button type="button" onClick={(e) => { e.preventDefault(); pickFile(null); (document.getElementById("idFile") as HTMLInputElement).value = ""; }} className="grid size-8 place-items-center rounded-full hover:bg-white" aria-label={T("Remove file")}><X className="size-4" /></button>
            </div>
          ) : (
            <span className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-sand-200 bg-sand-50 px-4 py-6 text-center hover:border-brand-400">
              <FileUp className="size-7 text-brand-500" />
              <span className="text-sm font-semibold">{T("Tap to upload or take a photo")}</span>
              <span className="text-xs text-muted">{T("Photo or PDF · PDFs up to 4 MB")}</span>
            </span>
          )}
          <input id="idFile" name="idFile" type="file" accept="image/*,.pdf" required className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null, e.currentTarget)} />
        </Field>
        {fileErr && <p className="mt-2 text-sm text-red-600">{fileErr}</p>}
      </Step>

      <Step n={5} title={T("Declaration")}>
        <blockquote className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm leading-relaxed text-ink">{T(DECLARATION)}</blockquote>
        <div id="sig" className="mt-5">
          <div className="mb-1.5 text-sm font-medium">{T("Signature")} <span className="text-coral-600">*</span></div>
          <SignaturePad name="signature" onChange={setSigned} />
        </div>
        <Field label={T("Date")} required className="mt-4 max-w-xs"><Input type="date" name="declarationDate" required defaultValue={today} /></Field>
        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-brand-600" />
          <span>{T("I confirm the information above is true and I agree to the declaration.")} <span className="text-coral-600">*</span></span>
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-brand-900 p-4 text-white"><div className="text-xs text-brand-200">{T("Registration")}</div><div className="text-xl font-extrabold">MVR {registration}</div></div>
          <div className="rounded-xl bg-brand-900 p-4 text-white"><div className="text-xs text-brand-200">{T("Monthly")}</div><div className="text-xl font-extrabold">MVR {dues}</div></div>
        </div>
        <ul className="mt-4 list-disc space-y-1 ps-5 text-xs text-muted">
          <li>{T("Anyone who works as a health professional is eligible to become a member of this union.")}</li>
          <li>{T("A copy of your National ID / Passport must be enclosed with your application (uploaded above).")}</li>
          <li>{T("Your ID copy and signature are stored privately and only seen by MHPU's membership office.")}</li>
        </ul>
      </Step>

      {state.error && <Notice tone="red">{state.error}</Notice>}
      <SubmitButton variant="coral" size="lg" pendingText={T("Submitting…")} className="w-full">{T("Submit application")}</SubmitButton>
    </form>
  );
}
