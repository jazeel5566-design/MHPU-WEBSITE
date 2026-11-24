"use client";
import { useActionState, useRef, useState } from "react";
import { ImageUp, RotateCcw, CheckCircle2 } from "lucide-react";
import { uploadSitePhoto, resetSitePhoto, type PhotoState } from "@/app/actions/admin";
import { Card, Badge, Notice, buttonClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { shrinkImage } from "@/lib/shrink-image";

export function SitePhotoCard({ k, label, where, url, customized }: { k: string; label: string; where: string; url: string; customized: boolean }) {
  const [state, action] = useActionState<PhotoState, FormData>(uploadSitePhoto, {});
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function pick(file: File | undefined) {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Choose a photo (JPG, PNG or WebP)."); return; }
    setBusy(true);
    let out = file;
    try { out = await shrinkImage(file, 2400, 0.85); } catch { /* keep original */ }
    setBusy(false);
    if (out.size > 4 * 1024 * 1024) { setErr("That photo is too large (max 4 MB). Try a smaller one."); return; }
    const dt = new DataTransfer(); dt.items.add(out); inputRef.current!.files = dt.files;
    setPreview(URL.createObjectURL(out));
    formRef.current!.requestSubmit();
  }

  const shown = preview || url;
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/7] bg-sand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shown} alt={label} className="size-full object-cover" />
        <div className="absolute start-3 top-3">{customized ? <Badge tone="green">Your photo</Badge> : <Badge>Default photo</Badge>}</div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="font-bold">{label}</div>
          <div className="text-xs text-muted">{where}</div>
        </div>
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {err && <Notice tone="red">{err}</Notice>}
        {state.ok && !err && <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Updated — it&apos;s live on the website.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <form ref={formRef} action={action}>
            <input type="hidden" name="key" value={k} />
            <input type="hidden" name="alt" value={label} />
            <input ref={inputRef} id={`photo-${k}`} name="file" type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            <label htmlFor={`photo-${k}`} className={buttonClass("primary", "sm", "cursor-pointer")}>
              <ImageUp className="size-4" /> {busy ? "Preparing…" : "Upload new photo"}
            </label>
          </form>
          {customized && (
            <form action={resetSitePhoto}>
              <input type="hidden" name="key" value={k} />
              <SubmitButton size="sm" variant="ghost" confirm={`Go back to the original photo for "${label}"?`}><RotateCcw className="size-4" /> Reset to default</SubmitButton>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
