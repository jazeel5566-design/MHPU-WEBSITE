import { NextResponse } from "next/server";
import { sendDueReminders, reconcilePendingPayments, runAutopay } from "@/lib/reminders";
import { audit } from "@/lib/audit";

export const maxDuration = 60;

/** Runs once a day via Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const site = new URL(req.url).origin;
  const payments = await reconcilePendingPayments();
  const autopay = await runAutopay(site);
  const reminders = await sendDueReminders(site);
  await audit(null, "cron_daily", "System", undefined, JSON.stringify({ payments, autopay, reminders }));
  return NextResponse.json({ ok: true, payments, autopay, reminders });
}
