"use client";
import { useActionState, useEffect, useRef } from "react";
import { saveCampaign, saveEvent, uploadMedia, saveResource, type EState } from "@/app/actions/editorial";
import { EVENT_TYPES, RESOURCE_CATEGORIES } from "@/lib/constants";
import { Card, Field, Input, Notice, Select, Textarea, Checkbox } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MarkdownEditor } from "@/components/markdown-editor";

type Campaign = { id?: string; title: string; titleDv: string | null; slug: string; summary: string; summaryDv: string | null; body: string; coverImage: string | null; status: string; goal: number; hasPetition: boolean; petitionAsk: string | null; featured: boolean };

export function CampaignForm({ c, savedMsg }: { c: Campaign; savedMsg?: string }) {
  const [state, action] = useActionState<EState, FormData>(saveCampaign, savedMsg ? { ok: true, message: savedMsg } : {});
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {c.id && <input type="hidden" name="id" value={c.id} />}
      <div className="space-y-4">
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.ok && <Notice>{state.message}</Notice>}
        <Field label="Campaign title" required><Input name="title" defaultValue={c.title} required /></Field>
        <Field label="Summary" required hint="Shown on cards and the homepage hero"><Textarea name="summary" defaultValue={c.summary} rows={2} className="min-h-0" required /></Field>
        <Field label="Campaign page content"><MarkdownEditor name="body" defaultValue={c.body} minRows={14} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title (ދިވެހި)"><Input name="titleDv" defaultValue={c.titleDv ?? ""} dir="rtl" className="dv-text" /></Field>
          <Field label="Summary (ދިވެހި)"><Input name="summaryDv" defaultValue={c.summaryDv ?? ""} dir="rtl" className="dv-text" /></Field>
        </div>
      </div>
      <aside className="space-y-4">
        <Card className="space-y-4 p-4">
          <Field label="Status">
            <Select name="status" defaultValue={c.status}>
              <option value="DRAFT">Draft (hidden)</option><option value="ACTIVE">Active</option><option value="WON">Won 🎉</option><option value="CLOSED">Closed</option>
            </Select>
          </Field>
          <Checkbox name="featured" defaultChecked={c.featured} label="Feature in homepage hero" />
          <Field label="Web address"><Input name="slug" defaultValue={c.slug} placeholder="auto from title" /></Field>
          <Field label="Cover image URL"><Input name="coverImage" defaultValue={c.coverImage ?? ""} /></Field>
          <SubmitButton className="w-full">Save campaign</SubmitButton>
        </Card>
        <Card className="space-y-4 p-4">
          <Checkbox name="hasPetition" defaultChecked={c.hasPetition} label="Collect petition signatures" />
          <Field label="Signature goal"><Input name="goal" type="number" min={1} defaultValue={c.goal} /></Field>
          <Field label="The demand people sign"><Textarea name="petitionAsk" defaultValue={c.petitionAsk ?? ""} rows={3} className="min-h-0" /></Field>
        </Card>
      </aside>
    </form>
  );
}

type Ev = { id?: string; title: string; titleDv: string | null; description: string; startsAt: string; endsAt: string | null; location: string; isOnline: boolean; type: string; visibility: string; capacity: number | null; cpdHours: number | null; published: boolean };

export function EventForm({ e, savedMsg }: { e: Ev; savedMsg?: string }) {
  const [state, action] = useActionState<EState, FormData>(saveEvent, savedMsg ? { ok: true, message: savedMsg } : {});
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {e.id && <input type="hidden" name="id" value={e.id} />}
      <div className="space-y-4">
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.ok && <Notice>{state.message}</Notice>}
        <Field label="Event title" required><Input name="title" defaultValue={e.title} required /></Field>
        <Field label="Title (ދިވެހި)"><Input name="titleDv" defaultValue={e.titleDv ?? ""} dir="rtl" className="dv-text" /></Field>
        <Field label="Description"><Textarea name="description" defaultValue={e.description} rows={6} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" required><Input type="datetime-local" name="startsAt" defaultValue={e.startsAt} required /></Field>
          <Field label="Ends"><Input type="datetime-local" name="endsAt" defaultValue={e.endsAt ?? ""} /></Field>
          <Field label="Location / link" required><Input name="location" defaultValue={e.location} required placeholder="e.g. MHPU Hall, Malé or Zoom" /></Field>
          <Field label="Type"><Select name="type" defaultValue={e.type}>{EVENT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}</Select></Field>
        </div>
      </div>
      <aside>
        <Card className="space-y-4 p-4">
          <Checkbox name="published" defaultChecked={e.published} label="Published (visible)" />
          <Checkbox name="isOnline" defaultChecked={e.isOnline} label="Online event" />
          <Field label="Audience"><Select name="visibility" defaultValue={e.visibility}><option value="PUBLIC">Public</option><option value="MEMBERS">Members only</option></Select></Field>
          <Field label="Capacity" hint="Leave blank for unlimited"><Input type="number" min={1} name="capacity" defaultValue={e.capacity ?? ""} /></Field>
          <Field label="CPD hours"><Input type="number" step="0.5" min={0} name="cpdHours" defaultValue={e.cpdHours ?? ""} /></Field>
          <SubmitButton className="w-full">Save event</SubmitButton>
        </Card>
      </aside>
    </form>
  );
}

export function MediaUpload() {
  const [state, action] = useActionState<EState, FormData>(uploadMedia, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="Images (max 4 MB each)" className="flex-1"><Input type="file" name="files" accept="image/*" multiple required className="file:me-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-brand-800" /></Field>
      <Field label="Alt text (describe the image)" className="flex-1"><Input name="alt" placeholder="e.g. Nurses at a ward meeting" /></Field>
      <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}
    </form>
  );
}

export function ResourceUpload() {
  const [state, action] = useActionState<EState, FormData>(saveResource, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && <div className="sm:col-span-2"><Notice tone="red">{state.error}</Notice></div>}
      {state.ok && <div className="sm:col-span-2"><Notice>{state.message}</Notice></div>}
      <Field label="Title" required><Input name="title" required /></Field>
      <Field label="File (PDF, Word, Excel · max 4 MB)" required><Input type="file" name="file" required className="file:me-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-brand-800" /></Field>
      <Field label="Category"><Select name="category" defaultValue="GUIDE">{RESOURCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
      <Field label="Who can download it?"><Select name="visibility" defaultValue="PUBLIC"><option value="PUBLIC">Everyone</option><option value="MEMBERS">Members only</option></Select></Field>
      <Field label="Short description" className="sm:col-span-2"><Input name="description" /></Field>
      <div><SubmitButton pendingText="Uploading…">Upload document</SubmitButton></div>
    </form>
  );
}
