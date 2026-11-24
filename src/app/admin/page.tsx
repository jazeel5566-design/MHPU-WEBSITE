import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, UserPlus, LifeBuoy, Wallet, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { mvr, timeAgo } from "@/lib/utils";
import { Card, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await requireRole(["ADMIN", "CASEWORKER", "TREASURER"], "/admin");
  if (user.role === "TREASURER") redirect("/admin/finance");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [active, total, pending, openCases, myCases, duesMonth, joins, byProfession, byAtoll, caseStatus, recentCases, activity, lapsed] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.member.count(),
    db.application.count({ where: { status: "PENDING" } }),
    db.case.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "AWAITING_MEMBER"] } } }),
    db.case.count({ where: { assigneeId: user.id, status: { in: ["OPEN", "IN_PROGRESS", "AWAITING_MEMBER"] } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart } } }),
    db.member.findMany({ where: { joinedAt: { gte: yearAgo } }, select: { joinedAt: true } }),
    db.member.groupBy({ by: ["profession"], _count: true, where: { status: "ACTIVE" }, orderBy: { _count: { profession: "desc" } }, take: 6 }),
    db.member.groupBy({ by: ["atoll"], _count: true, where: { status: "ACTIVE" }, orderBy: { _count: { atoll: "desc" } }, take: 6 }),
    db.case.groupBy({ by: ["status"], _count: true }),
    db.case.findMany({ where: { status: { in: ["OPEN", "IN_PROGRESS", "AWAITING_MEMBER"] } }, include: { member: { select: { fullName: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
    db.auditLog.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.member.count({ where: { status: "ACTIVE", OR: [{ duesPaidUntil: null }, { duesPaidUntil: { lt: now } }] } }),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { label: d.toLocaleString("en-GB", { month: "short" }), key: `${d.getFullYear()}-${d.getMonth()}`, n: 0 };
  });
  for (const j of joins) { const m = months.find((x) => x.key === `${j.joinedAt.getFullYear()}-${j.joinedAt.getMonth()}`); if (m) m.n++; }
  const maxJoin = Math.max(1, ...months.map((m) => m.n));
  const maxProf = Math.max(1, ...byProfession.map((p) => p._count));
  const RANK: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  recentCases.sort((a, b) => RANK[a.urgency] - RANK[b.urgency] || +a.createdAt - +b.createdAt);
  recentCases.splice(6);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" desc={`${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} — here's how the union is doing.`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/members?status=ACTIVE"><StatCard label="Active members" value={active.toLocaleString()} sub={`${total.toLocaleString()} on record · ${lapsed} dues overdue`} icon={<Users className="size-5" />} /></Link>
        {user.role === "ADMIN" && <Link href="/admin/applications"><StatCard label="Pending applications" value={pending} sub="Awaiting verification" icon={<UserPlus className="size-5" />} tone="amber" /></Link>}
        <Link href="/admin/cases"><StatCard label="Open cases" value={openCases} sub={`${myCases} assigned to you`} icon={<LifeBuoy className="size-5" />} tone="coral" /></Link>
        <StatCard label="Dues this month" value={mvr(duesMonth._sum.amount ?? 0)} sub="Recorded payments" icon={<Wallet className="size-5" />} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="New members" desc="Last 12 months" />
          <div className="flex h-56 items-end gap-2 px-5 pb-4 pt-6">
            {months.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted">{m.n || ""}</span>
                <div className="w-full rounded-t-md bg-brand-500 transition-all hover:bg-brand-700" style={{ height: `${(m.n / maxJoin) * 150 + 2}px` }} title={`${m.label}: ${m.n}`} />
                <span className="text-[10px] text-muted">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Members by profession" />
          <ul className="space-y-3 p-5">
            {byProfession.map((p) => (
              <li key={p.profession}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{p.profession}</span><span className="text-muted">{p._count}</span></div>
                <div className="h-2 rounded-full bg-sand-100"><div className="h-full rounded-full bg-coral-500" style={{ width: `${(p._count / maxProf) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cases needing attention" action={<Link href="/admin/cases" className="text-sm font-semibold text-brand-700">All cases</Link>} />
          <ul className="divide-y divide-line">
            {recentCases.map((c) => (
              <li key={c.id}><Link href={`/admin/cases/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-sand-50">
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{c.subject}</div><div className="text-xs text-muted">{c.reference} · {c.member.fullName} · {timeAgo(c.createdAt)}</div></div>
                {c.urgency !== "NORMAL" && <StatusBadge status={c.urgency} />}
                <StatusBadge status={c.status} />
                <ArrowRight className="size-4 text-muted rtl:rotate-180" />
              </Link></li>
            ))}
            {recentCases.length === 0 && <li className="px-5 py-6 text-sm text-muted">No open cases 🎉</li>}
          </ul>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Top atolls" />
            <ul className="divide-y divide-line text-sm">{byAtoll.map((a) => <li key={a.atoll} className="flex justify-between px-5 py-2.5"><span>{a.atoll}</span><span className="font-semibold">{a._count}</span></li>)}</ul>
          </Card>
          <Card>
            <CardHeader title="Case pipeline" />
            <ul className="divide-y divide-line text-sm">{caseStatus.map((s) => <li key={s.status} className="flex items-center justify-between px-5 py-2.5"><StatusBadge status={s.status} /><span className="font-semibold">{s._count}</span></li>)}</ul>
          </Card>
        </div>
      </div>

      {user.role === "ADMIN" && (
        <Card>
          <CardHeader title="Recent activity" action={<Link href="/admin/audit" className="text-sm font-semibold text-brand-700">Audit log</Link>} />
          <ul className="divide-y divide-line text-sm">
            {activity.map((a) => <li key={a.id} className="flex justify-between gap-3 px-5 py-2.5"><span><span className="font-semibold">{a.user?.name ?? "System"}</span> <span className="text-muted">{a.action.replace(/_/g, " ")}</span> {a.detail && <span className="text-muted">· {a.detail}</span>}</span><span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span></li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
