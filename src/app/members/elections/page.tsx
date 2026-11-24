import Link from "next/link";
import { Vote } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { phaseOf } from "@/lib/elections";
import { formatDateTime } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Elections" };
export const dynamic = "force-dynamic";

export default async function MemberElections() {
  const { member } = await requireMember();
  const elections = await db.election.findMany({
    where: { OR: [{ affiliateId: null }, ...(member.affiliateId ? [{ affiliateId: member.affiliateId }] : [])] },
    include: { affiliate: { select: { name: true } }, voters: { where: { memberId: member.id }, select: { id: true } } },
    orderBy: { opensAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Elections" desc="ExCom elections for your workplace union, and MHPU-wide elections. Your ballot is secret." />
      {elections.length === 0 ? <EmptyState icon={<Vote className="size-10" />} title="No elections right now" desc="When your workplace union holds an election, it will appear here." /> : (
        <div className="space-y-3">
          {elections.map((e) => {
            const ph = phaseOf(e);
            const voted = e.voters.length > 0;
            return (
              <Link key={e.id} href={`/members/elections/${e.id}`}>
                <Card className="flex flex-col gap-2 p-5 transition hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold text-brand-700">{e.affiliate?.name ?? "All MHPU members"}</div>
                    <div className="text-lg font-bold">{e.title}</div>
                    <div className="text-xs text-muted">{ph === "UPCOMING" ? `Voting opens ${formatDateTime(e.opensAt)}` : ph === "OPEN" ? `Voting closes ${formatDateTime(e.closesAt)}` : `Closed ${formatDateTime(e.closesAt)}`}</div>
                  </div>
                  <div className="flex gap-2">
                    {voted && <Badge tone="green">You voted</Badge>}
                    {ph === "OPEN" && !voted && <Badge tone="coral">Vote now</Badge>}
                    {ph === "UPCOMING" && <Badge tone="blue">Upcoming</Badge>}
                    {ph === "CLOSED" && <Badge>{e.resultsPublished ? "Results out" : "Closed"}</Badge>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
