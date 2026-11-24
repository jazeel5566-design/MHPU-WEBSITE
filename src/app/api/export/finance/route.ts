import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";
import { financeReport, parseFilter, METHOD_LABELS } from "@/lib/finance";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "TREASURER"].includes(user.role)) return new NextResponse("Forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFilter(sp);
  const r = await financeReport(f);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const csv = toCsv([
    ["MHPU dues report", `${d(f.from)} to ${d(f.to)}`],
    ["Total collected (MVR)", r.total], ["Payments", r.count], ["Members who paid", r.payers], ["Active members", r.activeMembers], ["Collection rate %", r.collectionRate],
    ["Outstanding arrears today (MVR, estimate)", r.arrears.amount], ["Members in arrears", r.arrears.members],
    [],
    ["Month", "Payments", "Amount (MVR)"], ...r.months.map((m) => [m.key, m.count, m.amount]),
    [],
    ["Method", "Payments", "Amount (MVR)"], ...r.byMethod.map((m) => [m.label, m.count, m.amount]),
    [],
    ["Workplace union", "Collected (MVR)", "Payments", "Members who paid", "Active members", "Collection rate %"], ...r.unionRows.map((u) => [u.name, u.amount, u.count, u.payers, u.active, u.rate]),
    [],
    ["Date", "Membership no", "Member", "Workplace union", "Method", "Period", "Reference", "Amount (MVR)"],
    ...r.payments.map((p) => [d(p.paidAt), p.member.membershipNo, p.member.fullName, p.member.affiliate?.name ?? "", METHOD_LABELS[p.method] ?? p.method, p.period, p.reference ?? "", p.amount]),
  ]);
  await audit(user.id, "export_finance", "Payment", undefined, `${d(f.from)}..${d(f.to)} ${r.count} rows`);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mhpu-dues-${d(f.from)}-to-${d(f.to)}.csv"` } });
}
