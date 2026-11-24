import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { CASE_TYPES, labelOf } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { ButtonLink, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "My cases" };

export default async function CasesPage() {
  const { member } = await requireMember();
  const cases = await db.case.findMany({ where: { memberId: member.id }, include: { _count: { select: { messages: { where: { internal: false } } } } }, orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <PageHeader title="My cases" desc="Workplace issues you've raised with MHPU. Everything here is confidential." actions={<ButtonLink href="/members/help/new"><Plus className="size-4" /> New case</ButtonLink>} />
      {cases.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="size-10" />} title="You haven't opened any cases" desc="If something isn't right at work — pay, hours, safety or treatment — tell us and an organiser will get back to you." action={<ButtonLink href="/members/help/new">Open your first case</ButtonLink>} />
      ) : (
        <Card className="divide-y divide-line">
          {cases.map((c) => (
            <Link key={c.id} href={`/members/help/${c.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-sand-50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{c.subject}</div>
                <div className="text-xs text-muted">{c.reference} · {labelOf(CASE_TYPES, c.type)} · {c._count.messages} messages · updated {timeAgo(c.updatedAt)}</div>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
