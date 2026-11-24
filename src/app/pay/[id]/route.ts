import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startCheckout } from "@/lib/payments";

/** One-tap pay link sent by SMS for auto-pay. The link only lets someone pay that member's dues. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(req.url).origin;
  const intent = await db.paymentIntent.findUnique({ where: { id } });
  const fresh = intent && intent.status === "PENDING" && Date.now() - intent.createdAt.getTime() < 10 * 864e5;
  if (!intent || !fresh) return NextResponse.redirect(new URL(intent?.status === "PAID" ? "/members/dues?payment=paid" : "/members/dues", origin));
  const r = await startCheckout(intent, origin);
  if (!r.ok) return NextResponse.redirect(new URL("/members/dues?payment=error&msg=" + encodeURIComponent(r.error), origin));
  return NextResponse.redirect(new URL(r.redirectUrl, origin));
}
