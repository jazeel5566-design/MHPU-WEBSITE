import Link from "next/link";
import { Download, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ATOLLS, MEMBER_STATUSES, PROFESSIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge, Card, Notice, PageHeader, Select, StatusBadge, Table, Td, Th, buttonClass, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; profession?: string; atoll?: string; dues?: string; page?: string; deleted?: string; union?: string }> }) {
  await requireRole(["ADMIN", "CASEWORKER", "TREASURER"], "/admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 25;
  const now = new Date();
  const where: Prisma.MemberWhereInput = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.profession ? { profession: sp.profession } : {}),
    ...(sp.atoll ? { atoll: sp.atoll } : {}),
    ...(sp.union ? { affiliateId: sp.union === "none" ? null : sp.union } : {}),
    ...(sp.dues === "overdue" ? { OR: [{ duesPaidUntil: null }, { duesPaidUntil: { lt: now } }] } : {}),
    ...(sp.q ? { AND: [{ OR: [{ fullName: { contains: sp.q, mode: "insensitive" as const } }, { membershipNo: { contains: sp.q.toUpperCase(), mode: "insensitive" as const } }, { email: { contains: sp.q.toLowerCase(), mode: "insensitive" as const } }, { phone: { contains: sp.q, mode: "insensitive" as const } }, { idNumber: { contains: sp.q, mode: "insensitive" as const } }, { employer: { contains: sp.q, mode: "insensitive" as const } }] }] } : {}),
  };
  const unions = await db.affiliate.findMany({ select: { id: true, shortName: true }, orderBy: { shortName: "asc" } });
  const [members, total] = await Promise.all([
    db.member.findMany({ where, include: { affiliate: { select: { shortName: true } } }, orderBy: { joinedAt: "desc" }, take, skip: (page - 1) * take }),
    db.member.count({ where }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page" && k !== "deleted") as [string, string][]);
  const pages = Math.ceil(total / take);

  return (
    <div>
      <PageHeader title="Members" desc={`${total.toLocaleString()} matching members`} actions={<a href={`/api/export/members?${qs}`} className={buttonClass("outline")}><Download className="size-4" /> Export CSV</a>} />
      {sp.deleted && <div className="mb-4"><Notice>Member deleted: {sp.deleted}</Notice></div>}
      <Card className="mb-4 p-3">
        <form className="grid gap-2 md:grid-cols-[1fr_repeat(5,auto)_auto]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={sp.q} placeholder="Name, number, email, phone, ID, workplace…" className="h-10 w-full rounded-xl border border-line ps-9 pe-3 text-sm" />
          </div>
          <Select name="status" defaultValue={sp.status ?? ""} className="h-10 py-2"><option value="">Any status</option>{MEMBER_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select name="profession" defaultValue={sp.profession ?? ""} className="h-10 py-2"><option value="">Any profession</option>{PROFESSIONS.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select name="atoll" defaultValue={sp.atoll ?? ""} className="h-10 py-2"><option value="">Any atoll</option>{ATOLLS.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select name="union" defaultValue={sp.union ?? ""} className="h-10 py-2"><option value="">Any union</option>{unions.map((u) => <option key={u.id} value={u.id}>{u.shortName}</option>)}<option value="none">No union</option></Select>
          <Select name="dues" defaultValue={sp.dues ?? ""} className="h-10 py-2"><option value="">Any dues</option><option value="overdue">Overdue</option></Select>
          <button className={buttonClass("primary")}>Filter</button>
        </form>
      </Card>
      <Card>
        {members.length === 0 ? <div className="p-6"><EmptyState title="No members match" /></div> : (
          <Table>
            <thead><tr><Th>Member</Th><Th>Profession / workplace</Th><Th>Atoll</Th><Th>Status</Th><Th>Dues until</Th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-sand-50">
                  <Td><Link href={`/admin/members/${m.id}`} className="font-semibold hover:text-brand-700">{m.fullName}</Link><div className="font-mono text-xs text-muted">{m.membershipNo} {m.isRep && <Badge tone="brand" className="ms-1">Rep</Badge>} {m.affiliate && <Badge className="ms-1">{m.affiliate.shortName}</Badge>}</div></Td>
                  <Td><div>{m.profession}</div><div className="text-xs text-muted">{m.employer}</div></Td>
                  <Td className="text-muted">{m.atoll}</Td>
                  <Td><StatusBadge status={m.status} /></Td>
                  <Td className={m.duesPaidUntil && m.duesPaidUntil >= now ? "" : "font-semibold text-amber-700"}>{formatDate(m.duesPaidUntil)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className={buttonClass("outline", "sm")} href={`/admin/members?${qs}&page=${page - 1}`}>Previous</Link>}
            {page < pages && <Link className={buttonClass("outline", "sm")} href={`/admin/members?${qs}&page=${page + 1}`}>Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
