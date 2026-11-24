import Link from "next/link";
import { FileText, ClipboardCheck, CalendarClock, Eye, PenSquare } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { timeAgo, formatDateTime } from "@/lib/utils";
import { ButtonLink, Card, CardHeader, PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditorialHome() {
  const user = await requireRole(["ADMIN", "EDITOR", "AUTHOR"], "/editorial");
  const pub = user.role !== "AUTHOR";
  const mine = { authorId: user.id };
  const [drafts, review, scheduled, published, myDrafts, queue, upcoming, top] = await Promise.all([
    db.post.count({ where: { status: "DRAFT", ...(pub ? {} : mine) } }),
    db.post.count({ where: { status: "IN_REVIEW", ...(pub ? {} : mine) } }),
    db.post.count({ where: { status: "SCHEDULED", publishAt: { gt: new Date() } } }),
    db.post.count({ where: { status: { in: ["PUBLISHED", "SCHEDULED"] }, ...(pub ? {} : mine) } }),
    db.post.findMany({ where: { ...mine, status: { in: ["DRAFT", "IN_REVIEW"] } }, orderBy: { updatedAt: "desc" }, take: 5 }),
    pub ? db.post.findMany({ where: { status: "IN_REVIEW" }, include: { author: { select: { name: true } } }, orderBy: { updatedAt: "asc" }, take: 6 }) : Promise.resolve([]),
    db.post.findMany({ where: { status: "SCHEDULED", publishAt: { gt: new Date() } }, orderBy: { publishAt: "asc" }, take: 5 }),
    db.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { views: "desc" }, take: 5, select: { id: true, title: true, views: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} desc={pub ? "Review submissions, schedule stories and keep the website fresh." : "Write articles and submit them to an editor for review."}
        actions={<ButtonLink href="/editorial/posts/new" variant="coral"><PenSquare className="size-4" /> Write new article</ButtonLink>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/editorial/posts?status=DRAFT"><StatCard label="Drafts" value={drafts} icon={<FileText className="size-5" />} /></Link>
        <Link href="/editorial/posts?status=IN_REVIEW"><StatCard label="Awaiting review" value={review} icon={<ClipboardCheck className="size-5" />} tone="amber" /></Link>
        <Link href="/editorial/posts?status=SCHEDULED"><StatCard label="Scheduled" value={scheduled} icon={<CalendarClock className="size-5" />} tone="violet" /></Link>
        <Link href="/editorial/posts?status=PUBLISHED"><StatCard label="Published" value={published} icon={<Eye className="size-5" />} tone="coral" /></Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {pub && (
          <Card>
            <CardHeader title="Review queue" desc="Oldest first" />
            {queue.length === 0 ? <div className="p-5"><EmptyState title="All caught up" desc="Nothing waiting for review." /></div> : (
              <ul className="divide-y divide-line">
                {queue.map((p) => (
                  <li key={p.id}><Link href={`/editorial/posts/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand-50">
                    <div className="min-w-0"><div className="truncate font-semibold">{p.title}</div><div className="text-xs text-muted">by {p.author.name} · submitted {timeAgo(p.updatedAt)}</div></div>
                    <span className="text-sm font-semibold text-brand-700">Review →</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </Card>
        )}
        <Card>
          <CardHeader title="My work in progress" />
          {myDrafts.length === 0 ? <div className="p-5"><EmptyState title="No drafts" action={<ButtonLink href="/editorial/posts/new" size="sm">Start writing</ButtonLink>} /></div> : (
            <ul className="divide-y divide-line">
              {myDrafts.map((p) => (
                <li key={p.id}><Link href={`/editorial/posts/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand-50">
                  <div className="min-w-0"><div className="truncate font-semibold">{p.title}</div><div className="text-xs text-muted">edited {timeAgo(p.updatedAt)}</div></div>
                  <StatusBadge status={p.status} />
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Publishing calendar" />
          {upcoming.length === 0 ? <p className="p-5 text-sm text-muted">Nothing scheduled.</p> : (
            <ul className="divide-y divide-line">
              {upcoming.map((p) => <li key={p.id}><Link href={`/editorial/posts/${p.id}`} className="flex justify-between gap-3 px-5 py-3 text-sm hover:bg-sand-50"><span className="truncate font-semibold">{p.title}</span><span className="shrink-0 text-muted">{formatDateTime(p.publishAt)}</span></Link></li>)}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Most read" />
          <ul className="divide-y divide-line">
            {top.map((p, i) => <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="w-5 font-extrabold text-muted">{i + 1}</span><span className="flex-1 truncate font-semibold">{p.title}</span><span className="text-muted">{p.views.toLocaleString()} views</span></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
