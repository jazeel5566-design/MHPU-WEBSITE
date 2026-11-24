import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteEvent } from "@/app/actions/editorial";
import { toLocalInput } from "@/lib/dates";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { EventForm } from "@/components/editorial/forms";
import { SubmitButton } from "@/components/submit-button";

export default async function EditEvent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireRole(["ADMIN", "EDITOR"], "/editorial");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const e = await db.event.findUnique({ where: { id }, include: { rsvps: { include: { member: { select: { fullName: true, membershipNo: true, employer: true } } } }, attendances: { include: { member: { select: { fullName: true, membershipNo: true } } }, orderBy: { joinedAt: "asc" } } } });
  if (!e) notFound();
  return (
    <div>
      <Link href="/editorial/events" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Events</Link>
      <PageHeader title={e.title} actions={<form action={deleteEvent}><input type="hidden" name="id" value={e.id} /><SubmitButton variant="ghost" className="text-red-600" confirm="Delete this event?"><Trash2 className="size-4" /> Delete</SubmitButton></form>} />
      <EventForm savedMsg={sp.saved ? "Event created." : undefined} e={{ ...e, startsAt: toLocalInput(e.startsAt) ?? "", endsAt: toLocalInput(e.endsAt) }} />
      {e.meetingUrl && (
        <Card className="mt-6">
          <CardHeader title={`Joined online (${e.attendances.length})`} desc="Members who clicked “Join meeting” from the portal" action={<a href={`/api/meetings/${e.id}/join`} target="_blank" className="text-sm font-semibold text-brand-700">Open meeting ↗</a>} />
          <ul className="divide-y divide-line text-sm">
            {e.attendances.map((a) => <li key={a.id} className="flex justify-between px-5 py-2.5"><span className="font-semibold">{a.member.fullName}</span><span className="text-muted">{a.member.membershipNo} · joined {a.joinedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></li>)}
            {e.attendances.length === 0 && <li className="px-5 py-4 text-muted">Nobody has joined yet.</li>}
          </ul>
        </Card>
      )}
      <Card className="mt-6">
        <CardHeader title={`RSVPs (${e.rsvps.length})`} />
        <ul className="divide-y divide-line text-sm">
          {e.rsvps.map((r) => <li key={r.id} className="flex justify-between px-5 py-2.5"><span className="font-semibold">{r.member.fullName}</span><span className="text-muted">{r.member.membershipNo} · {r.member.employer}</span></li>)}
          {e.rsvps.length === 0 && <li className="px-5 py-4 text-muted">No RSVPs yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
