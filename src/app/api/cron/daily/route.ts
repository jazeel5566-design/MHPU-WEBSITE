import { NextResponse } from "next/server";
import { sendDueReminders, reconcilePendingPayments, runAutopay } from "@/lib/reminders";
import { audit } from "@/lib/audit";
import { timingSafeEqual } from "node:crypto";
import { siteUrl, purgeExpiredLimits } from "@/lib/security";
import { flushClosedElections } from "@/lib/ballots";

export const maxDuration = 60;

/** Runs once a day via Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) return new NextResponse("Unauthorized", { status: 401 });
  const site = await siteUrl();
  await purgeExpiredLimits();
  const ballots = await flushClosedElections();
  const payments = await reconcilePendingPayments();
  const autopay = await runAutopay(site);
  const reminders = await sendDueReminders(site);
  await audit(null, "cron_daily", "System", undefined, JSON.stringify({ payments, autopay, reminders, ballots }));
  return NextResponse.json({ ok: true, payments, autopay, reminders, ballots });
}
