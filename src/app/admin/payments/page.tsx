import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatDateTime, mvr } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";

export const metadata = { title: "Online payments" };
export const dynamic = "force-dynamic";

const TONE: Record<string, "green" | "amber" | "red" | "gray"> = { PAID: "green", PENDING: "amber", FAILED: "red", CANCELLED: "gray", EXPIRED: "gray" };

export default async function PaymentsAdmin() {
  await requireRole(["ADMIN", "TREASURER"], "/admin");
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [intents, paidMonth, pending] = await Promise.all([
    db.paymentIntent.findMany({ include: { member: { select: { id: true, fullName: true, membershipNo: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.paymentIntent.aggregate({ _sum: { amount: true }, _count: true, where: { status: "PAID", provider: { not: "TEST" }, paidAt: { gte: monthStart } } }),
    db.paymentIntent.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Online payments" desc="Dues paid through the member portal. Turn online payments on and choose the provider in Site settings." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid online this month" value={mvr(paidMonth._sum.amount ?? 0)} sub={`${paidMonth._count} payments (excluding tests)`} />
        <StatCard label="Waiting for bank confirmation" value={pending} sub="Re-checked automatically every day" tone="amber" />
      </div>
      <Card>
        {intents.length === 0 ? <div className="p-6"><EmptyState title="No online payments yet" /></div> : (
          <Table>
            <thead><tr><Th>Started</Th><Th>Member</Th><Th>For</Th><Th>Amount</Th><Th>Provider</Th><Th>Status</Th></tr></thead>
            <tbody>
              {intents.map((i) => (
                <tr key={i.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(i.createdAt)}</Td>
                  <Td><Link href={`/admin/members/${i.member.id}`} className="font-semibold hover:text-brand-700">{i.member.fullName}</Link><div className="font-mono text-xs text-muted">{i.member.membershipNo}</div></Td>
                  <Td>{i.months} month{i.months > 1 ? "s" : ""}{i.auto && <Badge tone="blue" className="ms-1">Auto-pay</Badge>}</Td>
                  <Td className="font-semibold">{mvr(i.amount)}</Td>
                  <Td>{i.provider === "TEST" ? <Badge tone="amber">Test</Badge> : <span className="text-xs">BML {i.providerRef ? <span className="font-mono text-muted">{i.providerRef}</span> : null}</span>}</Td>
                  <Td><Badge tone={TONE[i.status] ?? "gray"}>{i.status.toLowerCase()}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
