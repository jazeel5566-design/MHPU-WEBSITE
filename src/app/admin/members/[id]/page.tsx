import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { CASE_TYPES, labelOf } from "@/lib/constants";
import { formatDate, formatDateTime, mvr } from "@/lib/utils";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui";
import { MemberEditForm, PaymentForm, ResetPasswordForm } from "@/components/admin/forms";
import { deleteMember, markReviewed } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";
import { Trash2, ClipboardCheck } from "lucide-react";

export default async function MemberDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "CASEWORKER", "TREASURER"], "/admin");
  const { id } = await params;
  const { error } = await searchParams;
  const [m, affiliates, s] = await Promise.all([
    db.member.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, lastLoginAt: true, title: true } }, payments: { orderBy: { paidAt: "desc" }, take: 12 }, cases: { orderBy: { createdAt: "desc" } } } }),
    db.affiliate.findMany({ select: { id: true, name: true } }),
    getSettings(),
  ]);
  if (!m) notFound();
  const isAdmin = user.role === "ADMIN";
  return (
    <div>
      <Link href="/admin/members" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Members</Link>
      <PageHeader kicker={m.membershipNo} title={m.fullName} desc={`${m.profession} · ${m.employer} · joined ${formatDate(m.joinedAt)}`} actions={<StatusBadge status={m.status} />} />
      {error && <div className="mb-4"><Notice tone="red">{error}</Notice></div>}
      {m.needsReview && (
        <Card className="mb-6 border-amber-300 bg-amber-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-bold text-amber-950"><ClipboardCheck className="size-5" /> Needs review</div>
              <p className="mt-1 text-sm text-amber-900">Some details are missing or may be duplicated. Correct them below, then mark the record as reviewed.</p>
              {m.reviewNote && <ul className="mt-2 list-disc space-y-0.5 ps-5 text-sm text-amber-950">{m.reviewNote.split(/;\s*/).map((x) => <li key={x}>{x}</li>)}</ul>}
            </div>
            {isAdmin && (
              <form action={markReviewed}>
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton size="sm" confirm="Mark this record as reviewed? It will leave the review list.">Mark as reviewed</SubmitButton>
              </form>
            )}
          </div>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card><CardHeader title="Member details" desc={isAdmin ? undefined : "Read-only for caseworkers"} /><div className="p-5">
            <MemberEditForm readOnly={!isAdmin} affiliates={affiliates} m={{ ...m, duesPaidUntil: m.duesPaidUntil?.toISOString().slice(0, 10) ?? "", joinedAt: m.joinedAt.toISOString().slice(0, 10), userTitle: m.user?.title ?? null, hasLogin: !!m.user }} />
          </div></Card>
          <Card>
            <CardHeader title={`Cases (${m.cases.length})`} />
            <ul className="divide-y divide-line text-sm">
              {m.cases.map((c) => <li key={c.id}><Link href={`/admin/cases/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand-50"><span><span className="font-semibold">{c.subject}</span><span className="block text-xs text-muted">{c.reference} · {labelOf(CASE_TYPES, c.type)} · {formatDate(c.createdAt)}</span></span><StatusBadge status={c.status} /></Link></li>)}
              {m.cases.length === 0 && <li className="px-5 py-4 text-muted">No cases.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact & identity" />
            <dl className="divide-y divide-line text-sm">
              {[["Union number", m.unionMemberNo ?? "—"], ["Email", m.email || "—"], ["Phone", m.phone || "—"], ["Address", m.address ?? "—"], ["ID / passport", isAdmin ? m.idNumber : m.idNumber.replace(/.(?=.{3})/g, "•")], ["Nationality", m.nationality], ["Location", [m.island, m.atoll].filter(Boolean).join(", ")], ["Last login", formatDateTime(m.user?.lastLoginAt)], ["Automatic payment", m.autopay ? `On · ${m.autopayMonths} month(s)${m.autopayCardLabel ? ` · ${m.autopayCardLabel}` : " · pay link by SMS"}` : "Off"]].map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-5 py-2.5"><dt className="text-muted">{k}</dt><dd className="break-all text-end font-medium">{v}</dd></div>)}
            </dl>
          </Card>
          {(isAdmin || user.role === "TREASURER") && <Card><CardHeader title="Record a dues payment" /><div className="p-5"><PaymentForm memberId={m.id} dues={Number(s.monthlyDues) || 100} /></div></Card>}
          <Card>
            <CardHeader title="Payment history" />
            <ul className="divide-y divide-line text-sm">
              {m.payments.map((p) => <li key={p.id} className="flex justify-between px-5 py-2.5"><span>{formatDate(p.paidAt)} <span className="text-xs text-muted">· {p.method.replace(/_/g, " ").toLowerCase()}</span></span><span className="font-semibold">{mvr(p.amount)}</span></li>)}
              {m.payments.length === 0 && <li className="px-5 py-4 text-muted">No payments.</li>}
            </ul>
          </Card>
          {isAdmin && m.user && <Card><CardHeader title="Portal login" desc={m.user.email} /><div className="p-5"><ResetPasswordForm userId={m.user.id} /></div></Card>}
          {isAdmin && (
            <Card className="border-red-200">
              <CardHeader title="Delete member" desc="Removes the member record, portal login, cases, dues history, event RSVPs and ballot votes. To keep their history, set Status to Resigned instead." />
              <form action={deleteMember} className="p-5">
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton variant="danger" size="sm" confirm={`Permanently delete ${m.fullName} (${m.membershipNo}) and all their records? This can't be undone.`}>
                  <Trash2 className="size-4" /> Delete member permanently
                </SubmitButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
