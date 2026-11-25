"use client";
import { useActionState, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { savePhotoStory, uploadStoryPhoto, type EState } from "@/app/actions/editorial";
import { shrinkImage } from "@/lib/shrink-image";
import { Card, Checkbox, Field, Input, Notice, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

type Story = { id?: string; slug?: string; title?: string; titleDv?: string; tag?: string; date?: string; summary?: string; cover?: string; images?: string[]; published?: boolean };

export function PhotoStoryForm({ s, savedMsg }: { s: Story; savedMsg?: string }) {
  const [state, action] = useActionState<EState, FormData>(savePhotoStory, savedMsg ? { ok: true, message: savedMsg } : {});
  const [photos, setPhotos] = useState<string[]>(() => [...new Set([s.cover, ...(s.images ?? [])].filter((x): x is string => !!x))]);
  const [cover, setCover] = useState(s.cover ?? "");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    const list = [...files];
    for (const [i, f] of list.entries()) {
      setBusy(`Uploading photo ${i + 1} of ${list.length}…`);
      const fd = new FormData();
      fd.set("file", await shrinkImage(f, 1800, 0.82));
      const r = await uploadStoryPhoto(fd);
      if (r.url) setPhotos((p) => [...p, r.url!]);
      else { setErr(`${f.name}: ${r.error ?? "upload failed"}`); break; }
    }
    setBusy("");
    if (input.current) input.current.value = "";
  }
  const move = (i: number, d: number) => setPhotos((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const remove = (url: string) => setPhotos((p) => p.filter((x) => x !== url));
  const coverNow = photos.includes(cover) ? cover : photos[0] ?? "";

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {s.id && <input type="hidden" name="id" value={s.id} />}
      {photos.map((u) => <input key={u} type="hidden" name="photo" value={u} />)}
      <input type="hidden" name="cover" value={coverNow} />
      <div className="space-y-4">
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.ok && <Notice>{state.message}</Notice>}
        <Field label="Title" required><Input name="title" defaultValue={s.title} required placeholder="e.g. May Day Rally 2026" /></Field>
        <Field label="A few words (optional)" hint="Shown under the title"><Textarea name="summary" defaultValue={s.summary ?? ""} rows={2} className="min-h-0" /></Field>
        <Field label="Title (ދިވެހި)"><Input name="titleDv" defaultValue={s.titleDv ?? ""} dir="rtl" className="dv-text" /></Field>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><div className="font-bold">Photos ({photos.length})</div><div className="text-xs text-muted">Large photos are shrunk before uploading. The starred photo is the cover.</div></div>
            <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800", busy && "pointer-events-none opacity-60")}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {busy || "Add photos"}
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} disabled={!!busy} />
            </label>
          </div>
          {err && <div className="mb-3"><Notice tone="red">{err}</Notice></div>}
          {photos.length === 0 ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No photos yet.</p> : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((u, i) => (
                <li key={u} className={cn("overflow-hidden rounded-xl border-2 bg-white", u === coverNow ? "border-coral-500" : "border-line")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="flex items-center justify-between gap-1 p-1.5">
                    <button type="button" onClick={() => setCover(u)} className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold", u === coverNow ? "text-coral-700" : "text-muted hover:bg-sand-100")} aria-pressed={u === coverNow}><Star className={cn("size-3.5", u === coverNow && "fill-current")} /> {u === coverNow ? "Cover" : "Make cover"}</button>
                    <span className="flex">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1 text-muted hover:bg-sand-100 disabled:opacity-30" aria-label="Move earlier"><ArrowLeft className="size-3.5 rtl:rotate-180" /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} className="rounded-lg p-1 text-muted hover:bg-sand-100 disabled:opacity-30" aria-label="Move later"><ArrowRight className="size-3.5 rtl:rotate-180" /></button>
                      <button type="button" onClick={() => remove(u)} className="rounded-lg p-1 text-red-600 hover:bg-red-50" aria-label="Remove photo"><Trash2 className="size-3.5" /></button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <aside className="space-y-4">
        <Card className="space-y-4 p-4">
          <Field label="Date of the event" required><Input type="date" name="date" defaultValue={s.date ?? new Date().toISOString().slice(0, 10)} required /></Field>
          <Field label="Label" hint="e.g. Campaign, May Day rally, Training"><Input name="tag" defaultValue={s.tag ?? ""} /></Field>
          <Field label="Web address"><Input name="slug" defaultValue={s.slug ?? ""} placeholder="auto from title" /></Field>
          <Checkbox name="published" defaultChecked={s.published ?? true} label="Show on the website" />
          <SubmitButton className="w-full" disabled={!!busy}>Save photo story</SubmitButton>
        </Card>
      </aside>
    </form>
  );
}
