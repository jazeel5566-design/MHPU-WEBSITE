import Link from "next/link";
import { IdCard, LifeBuoy, Vote, CalendarDays, ArrowRight, AlertTriangle, MessageSquarePlus } from "lucide-react";
import { db } from "@/lib/db";
import { features } from "@/lib/features-server";
import { requireActiveMember } from "@/lib/auth";
import { livePosts, liveOrder } from "@/lib/content";
import { formatDate, timeAgo } from "@/lib/utils";
import { CASE_TYPES, labelOf } from "@/lib/constants";
import { Card, CardHeader, StatusBadge, ButtonLink, EmptyState, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const { member } = await requireActiveMember();
  const f = await features();
  const now = new Date();
  const [cases, ballots, events, notices] = await Promise.all([
    db.case.findMany({ where: { memberId: member.id, status: { notIn: ["CLOSED"] } }, orderBy: { updatedAt: "desc" }, take: 3 }),
    db.ballot.findMany({ where: { opensAt: { lte: now }, closesAt: { gte: now } }, include: { voters: { where: { memberId: member.id }, select: { id: true } } }, orderBy: { closesAt: "asc" } }),
    db.event.findMany({ where: { published: true, startsAt: { gte: now } }, include: { rsvps: { where: { memberId: member.id }, select: { id: true } } }, orderBy: { startsAt: "asc" }, take: 3 }),
    db.post.findMany({ where: livePosts(["PUBLIC", "MEMBERS"]), orderBy: liveOrder, take: 4 }),
  ]);
  const duesOk = member.duesPaidUntil && member.duesPaidUntil >= now;
  const first = member.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <div className="text-sm font-medium text-brand-200">Assalaamu alaikum,</div>
          <h1 className="text-3xl font-extrabold">{first}</h1>
          <p className="mt-1 text-sm text-brand-100">{member.membershipNo} · {member.profession} · {member.employer}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {f.on("members.help") && <ButtonLink href="/members/help/new" variant="coral"><MessageSquarePlus className="size-4" /> Get help</ButtonLink>}
          {f.on("members.card") && <ButtonLink href="/members/card" className="bg-white/15 text-white hover:bg-white/25"><IdCard className="size-4" /> My card</ButtonLink>}
        </div>
      </div>

      {!duesOk && (
        <Notice tone="amber">
          <span className="inline-flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" /> Your dues are not up to date.</span>{" "}
          Members need to be in good standing to vote and receive representation. {f.on("members.dues") ? <Link href="/members/dues" className="font-bold underline">View dues</Link> : "Please contact the office."}
        </Notice>
      )}

      {f.on("members.ballots") && ballots.some((b) => b.voters.length === 0) && (
        <Link href="/members/ballots" className="flex items-center gap-4 rounded-2xl border-2 border-coral-200 bg-coral-50 p-5 transition hover:border-coral-400">
          <span className="grid size-12 place-items-center rounded-2xl bg-coral-500 text-white"><Vote className="size-6" /></span>
          <div className="flex-1">
            <div className="font-bold">A ballot is open — your vote counts</div>
            <div className="text-sm text-muted">{ballots.find((b) => b.voters.length === 0)?.title} · closes {formatDate(ballots[0].closesAt)}</div>
          </div>
          <ArrowRight className="size-5 text-coral-600 rtl:rotate-180" />
        </Link>
      )}

      {(f.on("members.help") || f.on("members.events")) && <div className={f.on("members.help") && f.on("members.events") ? "grid gap-6 lg:grid-cols-2" : "grid gap-6"}>
        {f.on("members.help") && <Card>
          <CardHeader title="My open cases" action={<Link href="/members/help" className="text-sm font-semibold text-brand-700">All cases</Link>} />
          {cases.length === 0 ? (
            <div className="p-5"><EmptyState icon={<LifeBuoy className="size-8" />} title="No open cases" desc="Problem at work? Our organisers are here to help." action={<ButtonLink href="/members/help/new" size="sm">Open a case</ButtonLink>} /></div>
          ) : (
            <ul className="divide-y divide-line">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link href={`/members/help/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-sand-50">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.subject}</div>
                      <div className="text-xs text-muted">{c.reference} · {labelOf(CASE_TYPES, c.type)} · updated {timeAgo(c.updatedAt)}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>}

        {f.on("members.events") && <Card>
          <CardHeader title="Coming up" action={<Link href="/members/events" className="text-sm font-semibold text-brand-700">All events</Link>} />
          <ul className="divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-12 shrink-0 rounded-lg bg-brand-50 py-1 text-center text-brand-800">
                  <div className="text-[10px] font-bold uppercase">{e.startsAt.toLocaleString("en-GB", { month: "short" })}</div>
                  <div className="text-lg font-extrabold leading-none">{e.startsAt.getDate()}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{e.title}</div>
                  <div className="truncate text-xs text-muted">{e.location}</div>
                </div>
                {e.rsvps.length > 0 && <span className="text-xs font-bold text-emerald-700">Going ✓</span>}
              </li>
            ))}
            {events.length === 0 && <li className="px-5 py-6 text-sm text-muted"><CalendarDays className="me-2 inline size-4" />No upcoming events.</li>}
          </ul>
        </Card>}
      </div>}

      {f.on("members.news") && <Card>
        <CardHeader title="Latest from MHPU" action={<Link href="/members/news" className="text-sm font-semibold text-brand-700">Member notices</Link>} />
        <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {notices.map((p) => (
            <li key={p.id} className="sm:border-b sm:border-line sm:odd:border-e">
              <Link href={`/news/${p.slug}`} className="block px-5 py-4 hover:bg-sand-50">
                <div className="flex items-center gap-2 text-xs text-muted">{formatDate(p.publishedAt)} {p.visibility === "MEMBERS" && <span className="font-bold text-violet-700">· Members only</span>}</div>
                <div className="mt-1 font-semibold leading-snug">{p.title}</div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>}
    </div>
  );
}
