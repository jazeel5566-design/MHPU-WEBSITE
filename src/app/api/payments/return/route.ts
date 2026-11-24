import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkWithProvider, markIntentPaid } from "@/lib/payments";
import { sendSms } from "@/lib/sms";
import { audit } from "@/lib/audit";

/**
 * The bank sends the member's browser back here after paying. We never trust the
 * redirect itself: we ask the bank for the transaction's real state first.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/members/dues?payment=${q}`, url.origin));
  const id = url.searchParams.get("intent") ?? "";
  const intent = await db.paymentIntent.findUnique({ where: { id }, include: { member: true } });
  if (!intent) return back("error");
  const user = await getCurrentUser();
  if (!user || user.member?.id !== intent.memberId) return NextResponse.redirect(new URL(`/login?next=/members/dues`, url.origin));
  if (intent.status === "PAID") return back("paid");
  const state = await checkWithProvider(intent);
  if (state === "PAID") {
    await markIntentPaid(intent.id, "CARD");
    await audit(user.id, "payment_paid", "PaymentIntent", intent.id, `MVR ${intent.amount}`);
    await sendSms({ to: intent.member.phone, kind: "PAYMENT_RECEIPT", memberId: intent.memberId, body: `MHPU: Thank you ${intent.member.fullName.split(" ")[0]}, we received MVR ${intent.amount} for ${intent.months} month(s) of dues. Ref ${intent.providerRef ?? intent.id.slice(0, 8)}.` }).catch(() => {});
    return back("paid");
  }
  if (state === "FAILED") {
    await db.paymentIntent.update({ where: { id: intent.id }, data: { status: "FAILED" } });
    return back("failed");
  }
  return back("pending");
}
