"use client";
import { useActionState, useState } from "react";
import { Send, Save, Globe, CalendarClock, Undo2, Archive, ImagePlus, X, MessageSquareWarning, ExternalLink } from "lucide-react";
import { savePost, type EState } from "@/app/actions/editorial";
import { POST_CATEGORIES } from "@/lib/constants";
import { Card, Field, Input, Notice, Select, Textarea, Checkbox, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MarkdownEditor } from "@/components/markdown-editor";
import { cn, slugify } from "@/lib/utils";

export type EditorPost = {
  id?: string; title: string; titleDv: string | null; slug: string; excerpt: string | null; excerptDv: string | null;
  body: string; bodyDv: string | null; coverImage: string | null; category: string; tags: string | null;
  status: string; visibility: string; featured: boolean; publishAt: string | null; reviewNote: string | null; authorName?: string;
};

export function PostEditor({ post, canPublish, media, savedMsg }: { post: EditorPost; canPublish: boolean; media: { url: string; alt: string | null }[]; savedMsg?: string }) {
  const [state, action] = useActionState<EState, FormData>(savePost, savedMsg ? { ok: true, message: savedMsg } : {});
  const [lang, setLang] = useState<"en" | "dv">("en");
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [slugTouched, setSlugTouched] = useState(!!post.id);
  const [cover, setCover] = useState(post.coverImage ?? "");
  const [picker, setPicker] = useState(false);
  const live = post.status === "PUBLISHED" || post.status === "SCHEDULED";
  const locked = live && !canPublish;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {post.id && <input type="hidden" name="postId" value={post.id} />}
      <div className="min-w-0 space-y-5">
        {state.error && <Notice tone="red">{state.error}</Notice>}
        {state.ok && <Notice>{state.message}</Notice>}
        {post.reviewNote && post.status === "DRAFT" && (
          <Notice tone="amber"><MessageSquareWarning className="me-1 inline size-4" /><strong>Editor&apos;s notes:</strong> {post.reviewNote}</Notice>
        )}
        {locked && <Notice tone="brand">This article is live. Only editors can change it.</Notice>}

        <div className="flex gap-1 rounded-full bg-sand-100 p-1 text-sm font-semibold w-fit">
          <button type="button" onClick={() => setLang("en")} className={cn("rounded-full px-4 py-1.5", lang === "en" ? "bg-white shadow-sm" : "text-muted")}>English</button>
          <button type="button" onClick={() => setLang("dv")} className={cn("rounded-full px-4 py-1.5 font-thaana", lang === "dv" ? "bg-white shadow-sm" : "text-muted")}>ދިވެހި</button>
        </div>

        <div className={cn("space-y-5", lang !== "en" && "hidden")}>
          <input
            name="title" value={title} placeholder="Headline" aria-label="Headline"
            onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
            className="w-full border-0 bg-transparent text-3xl font-extrabold tracking-tight placeholder:text-slate-300 focus:outline-none sm:text-4xl"
          />
          <Textarea name="excerpt" defaultValue={post.excerpt ?? ""} rows={2} placeholder="Standfirst — one or two sentences shown on cards and in search results" className="min-h-0 text-base" />
          <MarkdownEditor name="body" defaultValue={post.body} placeholder="Write your article… Use the toolbar for headings, lists and images. To show a video, paste its YouTube, Instagram, Facebook or Vimeo address on a line of its own." />
        </div>
        <div className={cn("space-y-5", lang !== "dv" && "hidden")}>
          <Notice tone="brand">Write in English, Dhivehi or both. An article written in only one language is shown on both versions of the website (Site settings). To publish in Dhivehi only, leave the English side empty.</Notice>
          <input name="titleDv" defaultValue={post.titleDv ?? ""} dir="rtl" placeholder="ސުރުޚީ" className="dv-text w-full border-0 bg-transparent text-3xl font-bold placeholder:text-slate-300 focus:outline-none" />
          <Textarea name="excerptDv" defaultValue={post.excerptDv ?? ""} dir="rtl" rows={2} className="dv-text min-h-0" placeholder="ކުރު ޚުލާޞާ" />
          <MarkdownEditor name="bodyDv" defaultValue={post.bodyDv ?? ""} rtl placeholder="ލިޔުން…" />
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted">Status</span>
            <StatusBadge status={post.status} />
          </div>
          {post.authorName && <p className="mb-3 text-xs text-muted">Author: {post.authorName}</p>}
          <div className="grid gap-2">
            {!locked && <SubmitButton name="intent" value="draft" variant="outline" pendingText="Saving…"><Save className="size-4" /> {live ? "Update live article" : "Save draft"}</SubmitButton>}
            {!canPublish && post.status === "DRAFT" && <SubmitButton name="intent" value="submit" pendingText="Sending…"><Send className="size-4" /> Submit for review</SubmitButton>}
            {canPublish && !live && (
              <>
                <SubmitButton name="intent" value="publish" variant="coral" pendingText="Publishing…" confirm="Publish this article to the website now?"><Globe className="size-4" /> Publish now</SubmitButton>
                <Field label="…or schedule for"><Input type="datetime-local" name="publishAt" defaultValue={post.publishAt ?? ""} /></Field>
                <SubmitButton name="intent" value="schedule" variant="secondary" pendingText="Scheduling…"><CalendarClock className="size-4" /> Schedule</SubmitButton>
              </>
            )}
            {canPublish && post.status === "IN_REVIEW" && (
              <div className="mt-2 space-y-2 rounded-xl bg-amber-50 p-3">
                <Textarea name="reviewNote" rows={2} placeholder="Notes for the author (if returning)" className="min-h-0 bg-white" />
                <SubmitButton name="intent" value="return" variant="ghost" size="sm"><Undo2 className="size-4" /> Return to author</SubmitButton>
              </div>
            )}
            {canPublish && live && <SubmitButton name="intent" value="unpublish" variant="ghost" size="sm" confirm="Take this article offline?"><Undo2 className="size-4" /> Unpublish</SubmitButton>}
            {canPublish && post.id && post.status !== "ARCHIVED" && <SubmitButton name="intent" value="archive" variant="ghost" size="sm"><Archive className="size-4" /> Archive</SubmitButton>}
            {post.id && live && <a href={`/news/${post.slug}`} target="_blank" className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-brand-700">View on site <ExternalLink className="size-3.5" /></a>}
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <Field label="Section">
            <Select name="category" defaultValue={post.category}>{POST_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
          </Field>
          <Field label="Who can read it?">
            <Select name="visibility" defaultValue={post.visibility}>
              <option value="PUBLIC">Everyone (public)</option>
              <option value="MEMBERS">Members only</option>
            </Select>
          </Field>
          <Field label="Tags" hint="Comma separated, e.g. overtime, nurses"><Input name="tags" defaultValue={post.tags ?? ""} /></Field>
          <Field label="Web address" hint={`/news/${slug || "…"}`}>
            <Input name="slug" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
          </Field>
          {canPublish && <Checkbox name="featured" defaultChecked={post.featured} label="Feature on homepage" />}
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Cover image</div>
          <input type="hidden" name="coverImage" value={cover} />
          {cover ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="aspect-video w-full rounded-xl object-cover" />
              <button type="button" onClick={() => setCover("")} className="absolute end-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 shadow" aria-label="Remove image"><X className="size-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setPicker(true)} className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-sm text-muted hover:border-brand-400 hover:text-brand-700">
              <ImagePlus className="size-6" /> Choose from media library
            </button>
          )}
          <Input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="…or paste an image URL" className="mt-2 text-xs" />
        </Card>
      </aside>

      {picker && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={() => setPicker(false)}>
          <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Media library</h2><button type="button" onClick={() => setPicker(false)}><X className="size-5" /></button></div>
            {media.length === 0 ? <p className="text-sm text-muted">No images yet. Upload some in Media.</p> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {media.map((m) => (
                  <button key={m.url} type="button" onClick={() => { setCover(m.url); setPicker(false); }} className="overflow-hidden rounded-xl ring-brand-500 hover:ring-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt ?? ""} className="aspect-video w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
