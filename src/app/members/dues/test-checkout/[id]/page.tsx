import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { completeTestPayment, testCheckoutAllowed } from "@/app/actions/member";
import { mvr } from "@/lib/utils";
import { Card, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function TestCheckout({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { user, member }] = await Promise.all([params, requireMember()]);
  const intent = await db.paymentIntent.findFirst({ where: { id, memberId: member.id, provider: "TEST" } });
  if (!intent || !(await testCheckoutAllowed(user.role))) notFound();
  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="p-6 text-center">
        <FlaskConical className="mx-auto size-10 text-amber-600" />
        <h1 className="mt-3 text-xl font-extrabold">Test payment</h1>
        <p className="mt-1 text-sm text-muted">This simulates the bank&apos;s payment page. No money moves.</p>
        <div className="my-5 rounded-xl bg-sand-50 p-4"><div className="text-3xl font-extrabold">{mvr(intent.amount)}</div><div className="text-sm text-muted">{intent.months} month{intent.months > 1 ? "s" : ""} of dues · {member.membershipNo}</div></div>
        {intent.status !== "PENDING" ? <Notice tone="amber">This test payment is already {intent.status.toLowerCase()}.</Notice> : (
          <div className="grid gap-2">
            <form action={completeTestPayment} className="space-y-3"><input type="hidden" name="id" value={intent.id} /><input type="hidden" name="outcome" value="pay" />
              {member.autopay && <label className="flex items-center justify-center gap-2 text-sm"><input type="checkbox" name="saveCard" defaultChecked className="size-4 accent-brand-600" /> Save this card for automatic payments</label>}
              <SubmitButton variant="coral" size="lg" className="w-full">Simulate successful payment</SubmitButton></form>
            <form action={completeTestPayment}><input type="hidden" name="id" value={intent.id} /><input type="hidden" name="outcome" value="cancel" /><SubmitButton variant="outline" className="w-full">Simulate cancelled payment</SubmitButton></form>
          </div>
        )}
      </Card>
    </div>
  );
}
