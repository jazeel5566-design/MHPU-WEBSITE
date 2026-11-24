import { Landmark, CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import { startOnlinePayment, testCheckoutAllowed, setAutopay, removeSavedCard } from "@/app/actions/member";
import { supportsSavedCards } from "@/lib/payments";
import { RefreshCw } from "lucide-react";
import { Notice, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, mvr } from "@/lib/utils";
import { Card, CardHeader, PageHeader, Table, Th, Td, EmptyState } from "@/components/ui";

export const metadata = { title: "Dues" };

const NOTICES: Record<string, [tone: "green" | "red" | "amber" | "brand", text: string]> = {
  paid: ["green", "Payment received — thank you! Your dues have been updated."],
  cancelled: ["amber", "The payment was cancelled. Nothing was charged."],
  failed: ["red", "The payment didn't go through. Nothing was recorded — please try again or pay by bank transfer."],
  pending: ["brand", "We're still waiting for the bank to confirm your payment. It will update automatically — check back later today."],
  off: ["amber", "Online payment isn't available right now."],
};
const AUTOPAY_NOTICES: Record<string, string> = {
  on: "Automatic payment is on.", off: "Automatic payment is off.", "card-removed": "Your saved card was removed.",
};

export default async function DuesPage({ searchParams }: { searchParams: Promise<{ payment?: string; msg?: string; autopay?: string }> }) {
  const [{ user, member }, s, sp] = await Promise.all([requireMember(), getSettings(), searchParams]);
  const provider = s.paymentProvider === "BML" ? "BML" : "TEST";
  const canPayOnline = s.paymentsEnabled === "true" && (provider === "BML" || (await testCheckoutAllowed(user.role)));
  const dues = Number(s.monthlyDues) || 100;
  const notice = sp.payment === "error" ? (["red", sp.msg ?? "Online payment couldn't start."] as const) : sp.payment ? NOTICES[sp.payment] : undefined;
  const payments = await db.payment.findMany({ where: { memberId: member.id }, orderBy: { paidAt: "desc" } });
  const ok = member.duesPaidUntil && member.duesPaidUntil >= new Date();
  const total = payments.reduce((a, p) => a + p.amount, 0);
  return (
    <div>
      <PageHeader title="Dues & payments" desc={`Standard dues are MVR ${s.monthlyDues} per month. Students are free.`} />
      {notice && <div className="mb-4"><Notice tone={notice[0]}>{notice[1]}</Notice></div>}
      {sp.autopay && AUTOPAY_NOTICES[sp.autopay] && <div className="mb-4"><Notice>{AUTOPAY_NOTICES[sp.autopay]}</Notice></div>}
      {canPayOnline && (
        <Card className="mb-6 p-5">
          <div className="flex items-center gap-2 font-bold"><RefreshCw className="size-5 text-brand-600" /> Automatic payment {member.autopay ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">On</span> : <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-bold text-muted">Off</span>}</div>
          <p className="mt-1 text-sm text-muted">
            {member.autopay
              ? member.autopayToken && supportsSavedCards(provider)
                ? <>We&apos;ll charge your saved card ({member.autopayCardLabel}) MVR {(member.autopayMonths * dues).toLocaleString()} for {member.autopayMonths} month{member.autopayMonths > 1 ? "s" : ""}, 3 days before your dues are due, and text you a receipt.</>
                : <>3 days before your dues are due we&apos;ll text you a one-tap payment link for MVR {(member.autopayMonths * dues).toLocaleString()} ({member.autopayMonths} month{member.autopayMonths > 1 ? "s" : ""}).{supportsSavedCards(provider) ? " Pay once online and tick “Save this card” to have it charged automatically instead." : ""}</>
              : "Never miss a payment: switch on to have your dues paid automatically (or get a one-tap payment link by SMS) before they're due."}
          </p>
          <form action={setAutopay} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="autopay" value={member.autopay ? "off" : "on"} />
            {!member.autopay && (
              <>
                <label className="text-sm"><span className="mb-1 block font-medium">Pay each time</span>
                  <Select name="months" defaultValue={String(member.autopayMonths)} className="w-56">
                    {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""} — MVR {(m * dues).toLocaleString()}</option>)}
                  </Select>
                </label>
                <label className="flex max-w-md items-start gap-2 text-xs text-muted"><input type="checkbox" required className="mt-0.5 size-4 accent-brand-600" /> I authorise MHPU to collect my union dues automatically as described above. I can switch this off at any time.</label>
              </>
            )}
            <SubmitButton variant={member.autopay ? "outline" : "primary"} confirm={member.autopay ? "Switch off automatic payment?" : undefined}>{member.autopay ? "Switch off" : "Switch on automatic payment"}</SubmitButton>
          </form>
          {member.autopayToken && (
            <form action={removeSavedCard} className="mt-3"><SubmitButton size="sm" variant="ghost" confirm="Remove your saved card?">Remove saved card ({member.autopayCardLabel})</SubmitButton></form>
          )}
        </Card>
      )}
      {canPayOnline && (
        <Card className="mb-6 flex flex-col gap-4 border-brand-200 bg-brand-50/50 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-bold"><CreditCard className="size-5 text-brand-600" /> Pay your dues online</div>
            <p className="mt-1 text-sm text-muted">Secure card payment{provider === "BML" ? " through Bank of Maldives" : ""}. Your dues update as soon as the bank confirms.</p>
            {provider === "TEST" && <p className="mt-1 text-xs font-semibold text-amber-700">Test mode — only admins see this; no real money is taken.</p>}
          </div>
          <form action={startOnlinePayment} className="flex items-end gap-2">
            <label className="text-sm"><span className="mb-1 block font-medium">Pay for</span>
              <Select name="months" defaultValue="1" className="w-56">
                {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""} — MVR {(m * dues).toLocaleString()}</option>)}
              </Select>
            </label>
            <SubmitButton variant="coral" pendingText="Starting…">Pay now</SubmitButton>
          </form>
        </Card>
      )}
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
