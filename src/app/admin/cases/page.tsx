import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { CASE_STATUSES, CASE_TYPES, labelOf } from "@/lib/constants";
import { timeAgo, cn } from "@/lib/utils";
import { Card, PageHeader, Select, StatusBadge, Table, Td, Th, buttonClass, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CasesAdmin({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; mine?: string }> }) {
  const user = await requireRole(["ADMIN", "CASEWORKER"], "/admin");
  const sp = await searchParams;
  const status = sp.status ?? "ACTIVE";
  const where: Prisma.CaseWhereInput = {
    ...(status === "ACTIVE" ? { status: { in: ["OPEN", "IN_PROGRESS", "AWAITING_MEMBER"] } } : status === "ALL" ? {} : { status }),
    ...(sp.type ? { type: sp.type } : {}),
    ...(sp.mine ? { assigneeId: user.id } : {}),
  };
  const cases = await db.case.findMany({ where, include: { member: { select: { fullName: true, employer: true } }, assignee: { select: { name: true } } }, orderBy: [{ updatedAt: "desc" }], take: 200 });
  const urgencyRank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  cases.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);
  const tabs = ["ACTIVE", ...CASE_STATUSES, "ALL"];
  return (
    <div>
      <PageHeader title="Casework" desc="Member requests for help. Urgent and high-priority cases are listed first." />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => <Link key={t} href={`/admin/cases?status=${t}${sp.mine ? "&mine=1" : ""}`} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", status === t ? "bg-ink text-white" : "text-muted hover:bg-sand-100")}>{t === "ACTIVE" ? "Active" : t.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Link>)}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <Select name="type" defaultValue={sp.type ?? ""} className="h-9 py-1.5"><option value="">All types</option>{CASE_TYPES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="mine" value="1" defaultChecked={!!sp.mine} className="accent-brand-700" /> Mine</label>
          <button className={buttonClass("outline", "sm")}>Apply</button>
        </form>
      </div>
      <Card>
        {cases.length === 0 ? <div className="p-6"><EmptyState title="No cases" /></div> : (
          <Table>
            <thead><tr><Th>Case</Th><Th>Member</Th><Th>Type</Th><Th>Priority</Th><Th>Status</Th><Th>Organiser</Th><Th>Updated</Th></tr></thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-sand-50">
                  <Td className="max-w-xs"><Link href={`/admin/cases/${c.id}`} className="font-semibold hover:text-brand-700">{c.subject}</Link><div className="font-mono text-xs text-muted">{c.reference}</div></Td>
                  <Td><div>{c.member.fullName}</div><div className="text-xs text-muted">{c.member.employer}</div></Td>
                  <Td className="text-muted">{labelOf(CASE_TYPES, c.type)}</Td>
                  <Td><StatusBadge status={c.urgency} /></Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td className={c.assignee ? "" : "font-semibold text-coral-600"}>{c.assignee?.name ?? "Unassigned"}</Td>
                  <Td className="whitespace-nowrap text-muted">{timeAgo(c.updatedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
