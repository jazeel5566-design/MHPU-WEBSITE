import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { CASE_TYPES, labelOf } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Avatar, Card, Notice, StatusBadge } from "@/components/ui";
import { ReplyForm } from "@/components/members/forms";

export default async function CaseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ id }, sp, { member, user }] = await Promise.all([params, searchParams, requireMember()]);
  const c = await db.case.findFirst({
    where: { id, memberId: member.id },
    include: { assignee: { select: { name: true, title: true } }, messages: { where: { internal: false }, include: { author: { select: { name: true, id: true, title: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/members/help" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> My cases</Link>
      {sp.new && <div className="mb-4"><Notice>Case {c.reference} submitted. We&apos;ve notified the organising team.</Notice></div>}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xs text-muted">{c.reference}</div>
            <h1 className="mt-1 text-2xl font-extrabold">{c.subject}</h1>
            <div className="mt-1 text-sm text-muted">{labelOf(CASE_TYPES, c.type)} · {c.facility} · opened {formatDateTime(c.createdAt)}</div>
          </div>
          <StatusBadge status={c.status} />
        </div>
        <div className="mt-4 rounded-xl bg-sand-50 p-4 text-sm whitespace-pre-wrap">{c.description}</div>
        <div className="mt-3 text-sm text-muted">Organiser: <span className="font-semibold text-ink">{c.assignee ? `${c.assignee.name}${c.assignee.title ? `, ${c.assignee.title}` : ""}` : "Being assigned…"}</span></div>
      </Card>

      <h2 className="mb-3 mt-8 font-bold">Conversation</h2>
      <div className="space-y-3">
        {c.messages.length === 0 && <p className="text-sm text-muted">No messages yet. Your organiser will reply here.</p>}
        {c.messages.map((m) => {
          const mine = m.author.id === user.id;
          return (
            <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar name={m.author.name} className={mine ? "bg-coral-100 text-coral-700" : ""} />
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${mine ? "bg-brand-700 text-white" : "border border-line bg-white"}`}>
                <div className={`mb-1 text-xs font-semibold ${mine ? "text-brand-100" : "text-muted"}`}>{mine ? "You" : `${m.author.name}${m.author.title ? ` (${m.author.title})` : ""}`} · {formatDateTime(m.createdAt)}</div>
                <div className="whitespace-pre-wrap">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      {c.status !== "CLOSED" && <Card className="mt-6 p-5"><ReplyForm caseId={c.id} /></Card>}
    </div>
  );
}
