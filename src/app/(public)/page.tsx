import Link from "next/link";
import {
  ArrowRight, Banknote, Clock, ShieldAlert, Scale, Globe2, GraduationCap, HeartHandshake, Stethoscope,
  Hospital, Ambulance, FlaskConical, Building2, Users, MapPinned, BadgeCheck,
} from "lucide-react";
import { db } from "@/lib/db";
import { getLang, t, pick } from "@/lib/i18n";
import { livePosts, liveOrder } from "@/lib/content";
import { ButtonLink, Progress } from "@/components/ui";
import { PostCard, CampaignCard, EventCard, SectionHead } from "@/components/public/cards";
import { IMG } from "@/lib/images";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const HELP_TASKS = [
  { icon: Banknote, label: "Unpaid or capped overtime", href: "/get-help#pay" },
  { icon: Clock, label: "Rosters & working hours", href: "/get-help#hours" },
  { icon: ShieldAlert, label: "Unsafe staffing or violence", href: "/get-help#safety" },
  { icon: Scale, label: "Disciplinary or grievance", href: "/get-help#discipline" },
  { icon: Globe2, label: "Expatriate worker rights", href: "/get-help#expat" },
  { icon: GraduationCap, label: "Training & CPD", href: "/events?type=CPD" },
];

const SECTORS = [
  { icon: Hospital, label: "Hospitals", desc: "Tertiary, regional & atoll hospitals" },
  { icon: Building2, label: "Island health centres", desc: "Primary care across 180+ islands" },
  { icon: Ambulance, label: "Emergency & ambulance", desc: "Paramedics, EMTs, sea ambulance crews" },
  { icon: FlaskConical, label: "Diagnostics", desc: "Labs, imaging and pharmacy" },
  { icon: Stethoscope, label: "Private sector", desc: "Clinics, private hospitals & resorts" },
  { icon: HeartHandshake, label: "Public health", desc: "Community, mental & public health" },
];

export default async function HomePage() {
  const [lang, settings] = await Promise.all([getLang(), getSettings()]);
  const [featured, campaigns, posts, events, memberCount, affiliateCount, wins] = await Promise.all([
    db.campaign.findFirst({ where: { featured: true, status: "ACTIVE" }, include: { _count: { select: { signatures: true } } } }),
    db.campaign.findMany({ where: { status: { in: ["ACTIVE", "WON"] } }, include: { _count: { select: { signatures: true } } }, orderBy: [{ featured: "desc" }, { updatedAt: "desc" }], take: 3 }),
    db.post.findMany({ where: livePosts(), orderBy: liveOrder, take: 4 }),
    db.event.findMany({ where: { published: true, startsAt: { gte: new Date() }, visibility: "PUBLIC" }, orderBy: { startsAt: "asc" }, take: 3 }),
    db.member.count({ where: { status: "ACTIVE" } }),
    db.affiliate.count(),
    db.campaign.count({ where: { status: "WON" } }),
  ]);
  const reps = await db.member.count({ where: { isRep: true, status: "ACTIVE" } });
  const [lead, ...rest] = posts;
  const signed = featured?._count.signatures ?? 0;

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMG.heroTeam} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/85 to-brand-900/30 rtl:bg-gradient-to-l" />
        <svg className="absolute -bottom-px start-0 w-full text-white" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor" d="M0 40c120-20 240-30 360-20s240 30 360 30 240-20 360-30 240 0 360 20v20H0z" />
        </svg>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-16 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:pb-32 lg:pt-24">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/15 backdrop-blur">
              <span className="size-1.5 rounded-full bg-coral-400" /> {t(lang, "heroKicker")}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">{t(lang, "heroTitle")}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-100">{t(lang, "heroBody")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/join" variant="coral" size="lg">{t(lang, "join")} <ArrowRight className="size-4 rtl:rotate-180" /></ButtonLink>
              <ButtonLink href="/get-help" size="lg" className="bg-white text-brand-900 hover:bg-brand-50">{t(lang, "getHelp")}</ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {memberCount >= 50 && <Stat value={memberCount.toLocaleString()} label="Active members" />}
              {affiliateCount > 0 && <Stat value={affiliateCount} label="Affiliated unions" />}
              <Stat value="21" label="Atolls & cities" />
            </dl>
          </div>

          {featured && (
            <div className="animate-fade-up rounded-3xl bg-white p-6 text-ink shadow-2xl shadow-black/30 [animation-delay:120ms]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-coral-600">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-coral-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-coral-500" /></span>
                Live campaign
              </div>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight">{pick(lang, featured.title, featured.titleDv)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{pick(lang, featured.summary, featured.summaryDv)}</p>
              <div className="mt-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold">{signed.toLocaleString()}</span>
                  <span className="text-sm text-muted">of {featured.goal.toLocaleString()} signatures</span>
                </div>
                <Progress value={signed} max={featured.goal} />
              </div>
              <ButtonLink href={`/campaigns/${featured.slug}`} variant="coral" size="lg" className="mt-5 w-full">{t(lang, "signPetition")}</ButtonLink>
            </div>
          )}
        </div>
      </section>

      {/* ─── Task router ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">{t(lang, "howHelp")}</h2>
          <p className="mt-2 text-muted">Pick a topic for practical guidance — or <Link href="/members/help/new" className="font-semibold text-brand-700 underline underline-offset-2">open a case</Link> if you&apos;re a member.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {HELP_TASKS.map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} className="group flex flex-col items-center gap-3 rounded-2xl border border-line bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white"><Icon className="size-6" /></span>
              <span className="text-sm font-semibold leading-snug">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── News ─────────────────────────────────────────────── */}
      {lead && (
        <section className="bg-sand-50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHead kicker="Newsroom" title={t(lang, "latestNews")} action={<ButtonLink href="/news" variant="outline">{t(lang, "viewAll")}</ButtonLink>} />
            <div className="grid gap-6 lg:grid-cols-2">
              <PostCard post={lead} lang={lang} large />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                {rest.slice(0, 3).map((p) => (
                  <Link key={p.slug} href={`/news/${p.slug}`} className="group flex gap-4 rounded-2xl border border-line bg-white p-3 transition hover:shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.coverImage || IMG.stethoscope} alt="" className="aspect-square w-28 shrink-0 rounded-xl object-cover" loading="lazy" />
                    <div className="py-1">
                      <div className="text-xs text-muted">{p.publishedAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                      <h3 className="mt-1 font-bold leading-snug group-hover:text-brand-700">{pick(lang, p.title, p.titleDv)}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{pick(lang, p.excerpt ?? "", p.excerptDv)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Campaigns ────────────────────────────────────────── */}
      {campaigns.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <SectionHead kicker={wins > 0 ? `${wins} campaign${wins === 1 ? "" : "s"} won` : "Campaigns"} title={t(lang, "activeCampaigns")} action={<ButtonLink href="/campaigns" variant="outline">{t(lang, "viewAll")}</ButtonLink>} />
          <div className="grid gap-6 md:grid-cols-3">
            {campaigns.map((c) => <CampaignCard key={c.slug} c={c} lang={lang} />)}
          </div>
        </section>
      )}

      {/* ─── Sectors ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-900 py-20 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMG.atollBaa} alt="" className="absolute inset-0 size-full object-cover opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-400">Who we represent</div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Every health worker. Every island.</h2>
              <p className="mt-4 text-brand-100">From IGMH in Malé to a two-person health post in the far north, MHPU members bargain together — Maldivian and expatriate, clinical and support staff alike.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={affiliateCount > 0 ? "/about#affiliates" : "/about"} className="bg-white text-brand-900 hover:bg-brand-50"><Users className="size-4" /> {affiliateCount > 0 ? "Our affiliated unions" : "About MHPU"}</ButtonLink>
                {reps > 0 && <ButtonLink href="/contact#reps" variant="ghost" className="text-white hover:bg-white/10"><MapPinned className="size-4" /> Find your rep</ButtonLink>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SECTORS.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex gap-4 rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/10 backdrop-blur-sm">
                  <Icon className="size-6 shrink-0 text-brand-300" />
                  <div>
                    <div className="font-bold">{label}</div>
                    <div className="text-sm text-brand-200">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Events + Join ────────────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHead kicker="Get involved" title={t(lang, "upcoming")} action={<ButtonLink href="/events" variant="outline">{t(lang, "viewAll")}</ButtonLink>} />
          <div className="space-y-3">
            {events.length ? events.map((e) => <EventCard key={e.id} e={e} lang={lang} />) : <p className="text-muted">No public events scheduled — check back soon.</p>}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-coral-500 p-8 text-white">
          <svg className="absolute -end-10 -top-10 size-56 text-white/10" viewBox="0 0 48 48" aria-hidden="true"><path d="M19 9h10v10h10v10H29v10H19V29H9V19h10z" fill="currentColor" /></svg>
          <h2 className="relative text-3xl font-extrabold leading-tight">{t(lang, "joinCtaTitle")}</h2>
          <p className="relative mt-2 text-sm font-semibold text-white/85">Registration MVR {settings.registrationFee} · Monthly MVR {settings.monthlyDues}</p>
          <ul className="relative mt-6 space-y-3 text-sm font-medium">
            {["Confidential advice and representation at work", "A collective voice on pay, overtime and safe staffing", "Digital membership card & member-only resources", "CPD training, events and a say in every ballot"].map((b) => (
              <li key={b} className="flex gap-2.5"><BadgeCheck className="size-5 shrink-0" />{b}</li>
            ))}
          </ul>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/join" size="lg" className="bg-white text-coral-700 hover:bg-coral-50">{t(lang, "join")}</ButtonLink>
            <ButtonLink href="/get-help" size="lg" variant="ghost" className="text-white hover:bg-white/15">Why join?</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-3xl font-extrabold">{value}</dd>
      <div className="text-xs font-medium text-brand-200">{label}</div>
    </div>
  );
}
