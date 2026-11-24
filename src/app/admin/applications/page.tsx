import Link from "next/link";
import { Download, FileText, ExternalLink, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { rejectApplication, deleteApplication } from "@/app/actions/admin";
import { JOIN_CATEGORIES, labelOf } from "@/lib/constants";
import { formatDate, timeAgo, cn } from "@/lib/utils";
import { Badge, Card, EmptyState, Input, PageHeader, StatusBadge, buttonClass } from "@/components/ui";
import { ApproveForm } from "@/components/admin/forms";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["ADMIN"], "/admin");
  const { status = "PENDING" } = await searchParams;
  const [apps, affiliates] = await Promise.all([
    db.application.findMany({ where: { status }, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, take: 100 }),
    db.affiliate.findMany({ select: { id: true, shortName: true } }),
  ]);
  const members = await db.member.findMany({ where: { id: { in: apps.map((a) => a.memberId).filter((x): x is string => !!x) } }, select: { id: true, membershipNo: true } });
  const noOf = (id: string | null) => members.find((m) => m.id === id)?.membershipNo;
  return (
    <div>
      <PageHeader title="Membership applications"
        desc="Check the ID copy against the details, then approve to issue a membership number and portal login."
        actions={<a href="/api/export/applications" className={buttonClass("outline")}><Download className="size-4" /> Export CSV</a>} />
      <div className="mb-4 flex gap-1">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => <Link key={s} href={`/admin/applications?status=${s}`} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", status === s ? "bg-ink text-white" : "text-muted hover:bg-sand-100")}>{s.charAt(0) + s.slice(1).toLowerCase()}</Link>)}
      </div>
      {apps.length === 0 ? <EmptyState title="No applications here" desc={status === "PENDING" ? "You're all caught up." : undefined} /> : (
        <div className="space-y-4">
          {apps.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="grid lg:grid-cols-[1fr_300px]">
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{a.fullName}</h2>
                    {a.category && <Badge tone="brand">{labelOf(JOIN_CATEGORIES, a.category)}</Badge>}
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-muted"><span className="font-mono">{a.reference}</span> · applied {timeAgo(a.createdAt)} ({formatDate(a.createdAt)})</p>
                  <dl className="mt-4 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    {[["National ID / Passport", a.idNumber], ["Country", a.country], ["Phone", a.phone], ["Email", a.email], ["Present address", a.address], ["Job / job title", a.jobTitle], ["Hospital / company", a.employer], ["Profession", a.profession ?? "—"], ["Atoll / island", [a.island, a.atoll].filter(Boolean).join(", ") || "—"], ["Referred by", a.referredBy ?? "—"], ["Declaration date", formatDate(a.declarationDate)]].map(([k, v]) => (
                      <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="break-words font-medium">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                <div className="space-y-3 border-t border-line bg-sand-50 p-5 lg:border-s lg:border-t-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Documents</div>
                  {a.idDocFile ? (
                    <a href={`/api/applications/${a.id}/id`} target="_blank" className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold ring-1 ring-line hover:ring-brand-400">
                      <FileText className="size-5 text-brand-600" /> ID / passport copy <ExternalLink className="ms-auto size-3.5 text-muted" />
                    </a>
                  ) : <p className="text-sm text-amber-700">No ID copy provided</p>}
                  {a.signatureFile ? (
                    <div className="rounded-xl bg-white p-2 ring-1 ring-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/applications/${a.id}/signature`} alt={`Signature of ${a.fullName}`} className="h-20 w-full object-contain" />
                      <div className="text-center text-[11px] text-muted">Signature</div>
                    </div>
                  ) : <p className="text-sm text-amber-700">No signature</p>}
                  {a.status !== "PENDING" && (
                    <dl className="space-y-1 border-t border-line pt-3 text-xs">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">Office use</div>
                      <div className="flex justify-between"><dt className="text-muted">Status</dt><dd className="font-semibold">{a.status}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted">Received by</dt><dd className="font-semibold">{a.receivedBy ?? "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted">Processed</dt><dd className="font-semibold">{formatDate(a.reviewedAt)}</dd></div>
                      {noOf(a.memberId) && <div className="flex justify-between"><dt className="text-muted">Membership ID</dt><dd><Link href={`/admin/members/${a.memberId}`} className="font-mono font-semibold text-brand-700">{noOf(a.memberId)}</Link></dd></div>}
                      {a.reviewNote && <p className="pt-1 text-muted">Note: {a.reviewNote}</p>}
                    </dl>
                  )}
                  <form action={deleteApplication} className="border-t border-line pt-3">
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton size="sm" variant="ghost" className="w-full text-red-600" confirm={`Permanently delete ${a.reference} (${a.fullName}) including the ID copy and signature? This can't be undone.`}>
                      <Trash2 className="size-4" /> Delete permanently
                    </SubmitButton>
                  </form>
                </div>
              </div>
              {a.status === "PENDING" && (
                <div className="flex flex-col gap-4 border-t border-line px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
                  <ApproveForm id={a.id} affiliates={affiliates} />
                  <form action={rejectApplication} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <Input name="note" placeholder="Reason (optional)" className="h-9 py-1.5" />
                    <SubmitButton size="sm" variant="ghost" className="text-red-600" confirm="Reject this application?">Reject</SubmitButton>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
