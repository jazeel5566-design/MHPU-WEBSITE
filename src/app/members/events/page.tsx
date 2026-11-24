import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { toggleRsvp } from "@/app/actions/member";
import { EventCard } from "@/components/public/cards";
import { PageHeader, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Events" };

export default async function MemberEvents() {
  const { member } = await requireMember();
  const events = await db.event.findMany({
    where: { published: true, startsAt: { gte: new Date(Date.now() - 864e5) } },
    include: { _count: { select: { rsvps: true } }, rsvps: { where: { memberId: member.id }, select: { id: true } } },
    orderBy: { startsAt: "asc" },
  });
  return (
    <div>
      <PageHeader title="Events & CPD" desc="RSVP to branch meetings, training and CPD. Member-only events are included here." />
      {events.length === 0 ? <EmptyState title="No upcoming events" /> : (
        <div className="space-y-3">
          {events.map((e) => {
            const going = e.rsvps.length > 0;
            const full = !!e.capacity && e._count.rsvps >= e.capacity && !going;
            return (
              <EventCard key={e.id} e={e} rsvpCount={e._count.rsvps} action={
                <form action={toggleRsvp}>
                  <input type="hidden" name="eventId" value={e.id} />
                  {full ? <span className="text-sm font-semibold text-muted">Fully booked</span> :
                    <SubmitButton size="sm" variant={going ? "outline" : "primary"} pendingText="…">{going ? "✓ Going — cancel RSVP" : "RSVP"}</SubmitButton>}
                </form>
              } />
            );
          })}
        </div>
      )}
    </div>
  );
}
