import { Landmark, CheckCircle2, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, mvr } from "@/lib/utils";
import { Card, CardHeader, PageHeader, Table, Th, Td, EmptyState } from "@/components/ui";

export const metadata = { title: "Dues" };

export default async function DuesPage() {
  const [{ member }, s] = await Promise.all([requireMember(), getSettings()]);
  const payments = await db.payment.findMany({ where: { memberId: member.id }, orderBy: { paidAt: "desc" } });
  const ok = member.duesPaidUntil && member.duesPaidUntil >= new Date();
  const total = payments.reduce((a, p) => a + p.amount, 0);
  return (
    <div>
      <PageHeader title="Dues & payments" desc={`Standard dues are MVR ${s.monthlyDues} per month. Students are free.`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={`p-5 ${ok ? "" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted">{ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-amber-600" />} Status</div>
          <div className="mt-2 text-2xl font-extrabold">{ok ? "In good standing" : "Payment due"}</div>
          <div className="text-xs text-muted">Paid until {formatDate(member.duesPaidUntil)}</div>
        </Card>
        <Card className="p-5"><div className="text-sm font-medium text-muted">Total paid</div><div className="mt-2 text-2xl font-extrabold">{mvr(total)}</div><div className="text-xs text-muted">{payments.length} payments</div></Card>
        {s.bankDetails ? (
          <Card className="p-5"><div className="flex items-center gap-2 text-sm font-medium text-muted"><Landmark className="size-4" /> Pay by bank transfer</div><div className="mt-2 text-sm">{s.bankDetails}<br /><span className="text-xs text-muted">Reference: {member.membershipNo}</span></div></Card>
        ) : (
          <Card className="p-5"><div className="flex items-center gap-2 text-sm font-medium text-muted"><Landmark className="size-4" /> How to pay</div><div className="mt-2 text-sm">Contact the membership office: <span dir="ltr">{s.hotline}</span></div></Card>
        )}
      </div>
      <Card className="mt-6">
        <CardHeader title="Payment history" />
        {payments.length === 0 ? <div className="p-5"><EmptyState title="No payments recorded" /></div> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Period</Th><Th>Method</Th><Th>Reference</Th><Th className="text-end">Amount</Th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}><Td>{formatDate(p.paidAt)}</Td><Td>{p.period}</Td><Td>{p.method.replace(/_/g, " ").toLowerCase()}</Td><Td className="font-mono text-xs">{p.reference ?? "—"}</Td><Td className="text-end font-semibold">{mvr(p.amount)}</Td></tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
