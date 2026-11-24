import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { meetingState } from "@/lib/meetings";

/** Members click "Join meeting": we record attendance, then send them to the Google Meet room. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(req.url).origin;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/members/events`, origin));
  const e = await db.event.findUnique({ where: { id } });
  if (!e || !e.published || !e.meetingUrl) return NextResponse.redirect(new URL("/members/events", origin));
  const isStaff = user.role !== "MEMBER";
  if (!isStaff && meetingState(e) !== "LIVE") return NextResponse.redirect(new URL("/members/events?meeting=closed", origin));
  if (user.member) {
    await db.eventAttendance.upsert({ where: { eventId_memberId: { eventId: e.id, memberId: user.member.id } }, update: {}, create: { eventId: e.id, memberId: user.member.id } });
  }
  return NextResponse.redirect(e.meetingUrl);
}
