import Link from "next/link";
import { guardMembersOnly } from "@/lib/audience-server";
import { db } from "@/lib/db";
import { getLang, getT } from "@/lib/i18n";
import { EVENT_TYPES } from "@/lib/constants";
import { EventCard, PageHero } from "@/components/public/cards";
import { ButtonLink, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getSitePhotos } from "@/lib/site-photos";

export const metadata = { title: "Events & CPD" };
export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await guardMembersOnly("page.events", "/events");
  const T = await getT();
  const photos = await getSitePhotos();
  const { type } = await searchParams;
  const lang = await getLang();
  const events = await db.event.findMany({
    where: { published: true, startsAt: { gte: new Date(Date.now() - 864e5) }, ...(type ? { type } : {}) },
    orderBy: { startsAt: "asc" },
  });
  return (
    <>
      <PageHero kicker={T("Events")} title={T("Meetings, training & CPD")} desc={T("Branch meetings, rights training and CPD sessions across the atolls — in person and online.")} image={photos.events} />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          {[undefined, ...EVENT_TYPES].map((t) => (
            <Link key={t ?? "all"} href={t ? `/events?type=${t}` : "/events"} className={cn("rounded-full px-4 py-2 text-sm font-semibold", type === t ? "bg-brand-700 text-white" : "bg-sand-100 hover:bg-sand-200")}>
              {T(t ? t.charAt(0) + t.slice(1).toLowerCase() : "All")}
            </Link>
          ))}
        </div>
        {events.length === 0 ? <EmptyState title={T("No upcoming events")} desc={T("New events are added regularly.")} /> : (
          <div className="space-y-3">
            {events.map((e) => (
              <EventCard key={e.id} e={e} lang={lang} action={
                e.meetingUrl
                  ? <ButtonLink href="/members/events" size="sm" variant="secondary">{T("Members: join online from the portal")}</ButtonLink>
                  : e.visibility === "MEMBERS"
                  ? <ButtonLink href="/members/events" size="sm" variant="secondary">{T("RSVP in member portal")}</ButtonLink>
                  : <ButtonLink href="/members/events" size="sm" variant="outline">{T("Members: RSVP")}</ButtonLink>
              } />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
