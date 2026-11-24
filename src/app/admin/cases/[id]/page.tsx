import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateCase } from "@/app/actions/admin";
import { CASE_STATUSES, CASE_TYPES, labelOf } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { Avatar, Card, CardHeader, Field, PageHeader, Select, StatusBadge } from "@/components/ui";
import { StaffReplyForm } from "@/components/admin/forms";
import { SubmitButton } from "@/components/submit-button";

export default async function CaseAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "CASEWORKER"], "/admin");
  const { id } = await params;
  const [c, staff] = await Promise.all([
    db.case.findUnique({ where: { id }, include: { member: true, messages: { include: { author: { select: { name: true, role: true, title: true } } }, orderBy: { createdAt: "asc" } } } }),
    db.user.findMany({ where: { role: { in: ["ADMIN", "CASEWORKER"] }, active: true }, select: { id: true, name: true } }),
  ]);
  if (!c) notFound();
  return (
    <div>
      <Link href="/admin/cases" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Casework</Link>
      <PageHeader kicker={c.reference} title={c.subject} desc={`${labelOf(CASE_TYPES, c.type)} · opened ${formatDateTime(c.createdAt)}`} actions={<><StatusBadge status={c.urgency} /><StatusBadge status={c.status} /></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-5"><div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Member&apos;s account</div><p className="whitespace-pre-wrap text-sm">{c.description}</p></Card>
          {c.messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.internal ? "opacity-90" : ""}`}>
              <Avatar name={m.author.name} className={m.author.role === "MEMBER" ? "bg-coral-100 text-coral-700" : ""} />
              <div className={`flex-1 rounded-2xl px-4 py-3 text-sm ${m.internal ? "border border-dashed border-amber-300 bg-amber-50" : m.author.role === "MEMBER" ? "border border-line bg-white" : "bg-brand-50"}`}>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted">{m.internal && <Lock className="size-3" />}{m.author.name}{m.author.title && ` · ${m.author.title}`}{m.internal && " · internal note"} · {formatDateTime(m.createdAt)}</div>
                <div className="whitespace-pre-wrap">{m.body}</div>
              </div>
            </div>
          ))}
          <Card className="p-5"><StaffReplyForm caseId={c.id} /></Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Manage case" />
            <form action={updateCase} className="space-y-3 p-5">
              <input type="hidden" name="id" value={c.id} />
              <Field label="Status"><Select name="status" defaultValue={c.status}>{CASE_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
              <Field label="Priority"><Select name="urgency" defaultValue={c.urgency}>{["LOW", "NORMAL", "HIGH", "URGENT"].map((u) => <option key={u}>{u}</option>)}</Select></Field>
              <Field label="Organiser"><Select name="assigneeId" defaultValue={c.assigneeId ?? ""}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              <SubmitButton className="w-full">Update</SubmitButton>
            </form>
          </Card>
          <Card>
            <CardHeader title="Member" />
            <div className="space-y-1 p-5 text-sm">
              <Link href={`/admin/members/${c.member.id}`} className="font-bold hover:text-brand-700">{c.member.fullName}</Link>
              <div className="font-mono text-xs text-muted">{c.member.membershipNo}</div>
              <div>{c.member.profession} · {c.facility ?? c.member.employer}</div>
              <div><a href={`tel:${c.member.phone}`} className="text-brand-700">{c.member.phone}</a> · {c.member.email}</div>
              <div className="pt-1"><StatusBadge status={c.member.status} /></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
