import Link from "next/link";
import { Download, Wallet, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { financeReport, parseFilter, METHOD_LABELS } from "@/lib/finance";
import { getSettings } from "@/lib/settings";
import { formatDate, mvr } from "@/lib/utils";
import { Card, CardHeader, PageHeader, Select, StatCard, Table, Td, Th, buttonClass, EmptyState } from "@/components/ui";
import { PrintButton } from "@/components/members/print-button";

export const metadata = { title: "Financial reports" };
export const dynamic = "force-dynamic";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(["ADMIN", "TREASURER"], "/admin");
  const sp = await searchParams;
  const f = parseFilter(sp);
  const [r, unions, s] = await Promise.all([financeReport(f), db.affiliate.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }), getSettings()]);
  const qs = new URLSearchParams(Object.entries({ from: iso(f.from), to: iso(f.to), union: f.unionId, method: f.method }).filter(([, v]) => v) as [string, string][]).toString();
  const maxMonth = Math.max(1, ...r.months.map((m) => m.amount));
  const now = new Date();
  const presets: [string, Date, Date][] = [
    ["This month", new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), now],
    ["Last month", new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))],
    ["This quarter", new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)), now],
    ["This year", new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), now],
    ["Last year", new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)), new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31))],
  ];
  const unionName = f.unionId ? (f.unionId === "none" ? "Members without a workplace union" : unions.find((u) => u.id === f.unionId)?.name) : "All workplace unions";

  return (
    <div className="space-y-6">
      <PageHeader title="Financial reports" desc={`Dues collected ${formatDate(f.from)} – ${formatDate(f.to)} · ${unionName}${f.method ? ` · ${METHOD_LABELS[f.method] ?? f.method}` : ""}`}
        actions={<div className="flex gap-2 print:hidden"><a href={`/api/export/finance?${qs}`} className={buttonClass("outline")}><Download className="size-4" /> Export CSV</a><PrintButton /></div>} />

      <Card className="p-4 print:hidden">
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm"><span className="mb-1 block font-medium">From</span><input type="date" name="from" defaultValue={iso(f.from)} className="h-10 rounded-xl border border-line px-3" /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">To</span><input type="date" name="to" defaultValue={iso(f.to)} className="h-10 rounded-xl border border-line px-3" /></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Workplace union</span>
            <Select name="union" defaultValue={f.unionId ?? ""} className="h-10 w-60 py-2"><option value="">All</option>{unions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}<option value="none">No workplace union</option></Select></label>
          <label className="text-sm"><span className="mb-1 block font-medium">Method</span>
            <Select name="method" defaultValue={f.method ?? ""} className="h-10 w-48 py-2"><option value="">All (excl. tests)</option>{Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></label>
          <button className={buttonClass("primary")}>Update report</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {presets.map(([label, a, b]) => (
            <Link key={label} href={`/admin/finance?${new URLSearchParams({ from: iso(a), to: iso(b), ...(f.unionId ? { union: f.unionId } : {}), ...(f.method ? { method: f.method } : {}) })}`} className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold hover:bg-sand-200">{label}</Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dues collected" value={mvr(r.total)} sub={`${r.count} payments`} icon={<Wallet className="size-5" />} />
        <StatCard label="Members who paid" value={r.payers} sub={`of ${r.activeMembers} active members`} icon={<Users className="size-5" />} tone="violet" />
        <StatCard label="Collection rate" value={`${r.collectionRate}%`} sub="Active members who paid in this period" icon={<TrendingUp className="size-5" />} tone="amber" />
        <StatCard label="Outstanding arrears (today)" value={mvr(r.arrears.amount)} sub={`${r.arrears.members} members · about ${r.arrears.months} months at MVR ${s.monthlyDues}`} icon={<AlertTriangle className="size-5" />} tone="coral" />
      </div>

      <Card className="break-inside-avoid">
        <CardHeader title="Collected by month" />
        <div className="flex h-56 items-end gap-1.5 overflow-x-auto px-5 pb-4 pt-6">
          {r.months.map((m) => (
            <div key={m.key} className="flex min-w-10 flex-1 flex-col items-center gap-1.5" title={`${m.label}: ${mvr(m.amount)} (${m.count})`}>
              <span className="text-[10px] font-semibold text-muted">{m.amount ? Math.round(m.amount).toLocaleString() : ""}</span>
              <div className="w-full rounded-t-md bg-brand-500" style={{ height: `${(m.amount / maxMonth) * 150 + (m.amount ? 2 : 0)}px` }} />
              <span className="whitespace-nowrap text-[10px] text-muted">{m.label.replace(" 20", " ’")}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="break-inside-avoid">
          <CardHeader title="By payment method" />
          {r.byMethod.length === 0 ? <div className="p-5"><EmptyState title="No payments in this period" /></div> : (
            <Table><thead><tr><Th>Method</Th><Th className="text-end">Payments</Th><Th className="text-end">Amount</Th><Th className="text-end">Share</Th></tr></thead>
              <tbody>{r.byMethod.map((m) => <tr key={m.method}><Td>{m.label}</Td><Td className="text-end">{m.count}</Td><Td className="text-end font-semibold">{mvr(m.amount)}</Td><Td className="text-end text-muted">{r.total ? Math.round((m.amount / r.total) * 100) : 0}%</Td></tr>)}</tbody>
            </Table>
          )}
        </Card>
        <Card className="break-inside-avoid">
          <CardHeader title="By workplace union" desc="Collection rate = active members of the union who paid in this period" />
          <Table><thead><tr><Th>Union</Th><Th className="text-end">Collected</Th><Th className="text-end">Paid / active</Th><Th className="text-end">Rate</Th></tr></thead>
            <tbody>{r.unionRows.map((u) => <tr key={u.id}><Td>{u.name}</Td><Td className="text-end font-semibold">{mvr(u.amount)}</Td><Td className="text-end text-muted">{u.payers} / {u.active}</Td><Td className="text-end">{u.rate}%</Td></tr>)}</tbody>
          </Table>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Payments (${r.count})`} desc={r.count > 300 ? "Showing the latest 300 — export CSV for the full list" : undefined} />
        {r.count === 0 ? <div className="p-5"><EmptyState title="No payments in this period" /></div> : (
          <Table><thead><tr><Th>Date</Th><Th>Member</Th><Th>Union</Th><Th>Method</Th><Th>Reference</Th><Th className="text-end">Amount</Th></tr></thead>
            <tbody>{r.payments.slice(0, 300).map((p) => (
              <tr key={p.id}><Td className="whitespace-nowrap text-muted">{formatDate(p.paidAt)}</Td>
                <Td><Link href={`/admin/members/${p.member.id}`} className="font-semibold hover:text-brand-700">{p.member.fullName}</Link><div className="font-mono text-xs text-muted">{p.member.membershipNo}</div></Td>
                <Td className="text-xs text-muted">{p.member.affiliate?.shortName ?? "—"}</Td><Td className="text-xs">{METHOD_LABELS[p.method] ?? p.method}</Td>
                <Td className="font-mono text-xs text-muted">{p.reference ?? "—"}</Td><Td className="text-end font-semibold">{mvr(p.amount)}</Td></tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
      <p className="hidden text-xs text-muted print:block">Generated {new Date().toLocaleString("en-GB")} · Maldives Health Professionals Union · Reg. no. {s.registrationNo}</p>
    </div>
  );
}
