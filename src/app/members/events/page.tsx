import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { toggleRsvp } from "@/app/actions/member";
import { EventCard } from "@/components/public/cards";
import { PageHeader, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { meetingState, meetingWindow } from "@/lib/meetings";
import { Video } from "lucide-react";
import { Notice } from "@/components/ui";

export const metadata = { title: "Events" };

export default async function MemberEvents({ searchParams }: { searchParams: Promise<{ meeting?: string }> }) {
  const { member } = await requireMember();
  const sp = await searchParams;
  const events = await db.event.findMany({
    where: { published: true, startsAt: { gte: new Date(Date.now() - 864e5) } },
    include: { _count: { select: { rsvps: true } }, rsvps: { where: { memberId: member.id }, select: { id: true } } },
    orderBy: { startsAt: "asc" },
  });
  return (
    <div>
      <PageHeader title="Events & CPD" desc="RSVP to branch meetings, training and CPD. Online meetings can be joined from here." />
      {sp.meeting === "closed" && <div className="mb-4"><Notice tone="amber">That meeting isn&apos;t open to join right now. Joining opens 15 minutes before the start.</Notice></div>}
      {events.length === 0 ? <EmptyState title="No upcoming events" /> : (
        <div className="space-y-3">
          {events.map((e) => {
            const going = e.rsvps.length > 0;
            const full = !!e.capacity && e._count.rsvps >= e.capacity && !going;
            return (
              <EventCard key={e.id} e={e} rsvpCount={e._count.rsvps} action={
                <div className="flex flex-wrap items-center gap-2">
                {e.meetingUrl && (meetingState(e) === "LIVE"
                  ? <a href={`/api/meetings/${e.id}/join`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"><Video className="size-4" /> Join meeting now</a>
                  : meetingState(e) === "SOON"
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-semibold text-muted"><Video className="size-3.5" /> Online · join opens {meetingWindow(e).opens.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    : null)}
                <form action={toggleRsvp}>
                  <input type="hidden" name="eventId" value={e.id} />
                  {full ? <span className="text-sm font-semibold text-muted">Fully booked</span> :
                    <SubmitButton size="sm" variant={going ? "outline" : "primary"} pendingText="…">{going ? "✓ Going — cancel RSVP" : "RSVP"}</SubmitButton>}
                </form>
                </div>
              } />
            );
          })}
        </div>
      )}
    </div>
  );
}
