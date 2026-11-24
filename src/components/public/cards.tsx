import Link from "next/link";
import { CalendarDays, MapPin, Clock, Video, Lock, ArrowUpRight, Users } from "lucide-react";
import { formatDate, readingTime } from "@/lib/utils";
import { labelOf, POST_CATEGORIES } from "@/lib/constants";
import { Badge, Progress } from "@/components/ui";
import { IMG } from "@/lib/images";
import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/i18n";

type PostLite = {
  slug: string; title: string; titleDv?: string | null; excerpt?: string | null; excerptDv?: string | null;
  coverImage?: string | null; category: string; publishedAt?: Date | null; body: string; visibility: string;
};

export function PostCard({ post, lang = "en", large = false, href }: { post: PostLite; lang?: Lang; large?: boolean; href?: string }) {
  return (
    <Link href={href ?? `/news/${post.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-900/5">
      <div className={`relative overflow-hidden bg-sand-100 ${large ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.coverImage || IMG.stethoscope} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        <div className="absolute start-3 top-3 flex gap-1.5">
          <Badge tone="brand" className="bg-white/95 shadow-sm">{labelOf(POST_CATEGORIES, post.category)}</Badge>
          {post.visibility === "MEMBERS" && <Badge tone="violet" className="gap-1 shadow-sm"><Lock className="size-3" /> Members</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{formatDate(post.publishedAt)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {readingTime(post.body)} min</span>
        </div>
        <h3 className={`mt-2 font-bold leading-snug text-ink group-hover:text-brand-700 ${large ? "text-2xl" : "text-lg"}`}>
          {pick(lang, post.title, post.titleDv)}
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{pick(lang, post.excerpt, post.excerptDv)}</p>}
      </div>
    </Link>
  );
}

type CampaignLite = { slug: string; title: string; titleDv?: string | null; summary: string; summaryDv?: string | null; coverImage?: string | null; goal: number; status: string; hasPetition: boolean; _count?: { signatures: number } };

export function CampaignCard({ c, lang = "en" }: { c: CampaignLite; lang?: Lang }) {
  const signed = c._count?.signatures ?? 0;
  return (
    <Link href={`/campaigns/${c.slug}`} className="group relative flex min-h-80 flex-col justify-end overflow-hidden rounded-3xl bg-brand-900 p-6 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.coverImage || IMG.nursesGroup} alt="" className="absolute inset-0 size-full object-cover opacity-50 transition duration-700 group-hover:scale-105 group-hover:opacity-40" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-transparent" />
      <div className="relative">
        {c.status === "WON" ? <Badge tone="violet">Won</Badge> : <Badge tone="coral">Active campaign</Badge>}
        <h3 className="mt-3 text-2xl font-bold leading-tight">{pick(lang, c.title, c.titleDv)}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-brand-100">{pick(lang, c.summary, c.summaryDv)}</p>
        {c.hasPetition && c.status === "ACTIVE" && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs font-semibold"><span>{signed.toLocaleString()} signed</span><span className="text-brand-200">Goal {c.goal.toLocaleString()}</span></div>
            <Progress value={signed} max={c.goal} />
          </div>
        )}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-coral-400">Take action <ArrowUpRight className="size-4" /></span>
      </div>
    </Link>
  );
}

type EventLite = { id: string; title: string; titleDv?: string | null; startsAt: Date; location: string; isOnline: boolean; type: string; cpdHours?: number | null; visibility: string; description: string; capacity?: number | null };

export function EventCard({ e, lang = "en", action, rsvpCount }: { e: EventLite; lang?: Lang; action?: React.ReactNode; rsvpCount?: number }) {
  const d = new Date(e.startsAt);
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 py-2 text-brand-800">
        <span className="text-xs font-bold uppercase">{d.toLocaleString("en-GB", { month: "short" })}</span>
        <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
        <span className="text-[10px] font-medium text-brand-600">{d.toLocaleString("en-GB", { weekday: "short" })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="gray">{e.type.charAt(0) + e.type.slice(1).toLowerCase()}</Badge>
          {e.cpdHours ? <Badge tone="green">{e.cpdHours} CPD hrs</Badge> : null}
          {e.visibility === "MEMBERS" && <Badge tone="violet">Members only</Badge>}
        </div>
        <h3 className="mt-1.5 font-bold text-ink">{pick(lang, e.title, e.titleDv)}</h3>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
          <span className="inline-flex items-center gap-1">{e.isOnline ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}{e.location}</span>
          {typeof rsvpCount === "number" && <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{rsvpCount}{e.capacity ? ` / ${e.capacity}` : ""} going</span>}
        </div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function SectionHead({ kicker, title, action }: { kicker?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {kicker && <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-600">{kicker}</div>}
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHero({ kicker, title, desc, image, children }: { kicker?: string; title: string; desc?: string; image?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-brand-900 text-white">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 size-full object-cover opacity-25" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-900/90 to-brand-900/40" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
        {kicker && <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-coral-400">{kicker}</div>}
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        {desc && <p className="mt-4 max-w-2xl text-lg text-brand-100">{desc}</p>}
        {children}
      </div>
    </section>
  );
}
