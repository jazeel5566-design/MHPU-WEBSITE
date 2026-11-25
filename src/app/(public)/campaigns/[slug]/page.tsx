import { notFound } from "next/navigation";
import { guardMembersOnly } from "@/lib/audience-server";
import { Users, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { getLang, pick, getT } from "@/lib/i18n";
import { renderMarkdown } from "@/lib/markdown";
import { timeAgo } from "@/lib/utils";
import { Card, Progress, Badge } from "@/components/ui";
import { PetitionForm } from "@/components/public/forms";
import { PageHero } from "@/components/public/cards";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await db.campaign.findUnique({ where: { slug }, select: { title: true, summary: true } });
  return c ? { title: c.title, description: c.summary } : {};
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  await guardMembersOnly("page.campaigns", "/campaigns");
  const T = await getT();
  const { slug } = await params;
  const lang = await getLang();
  const c = await db.campaign.findUnique({ where: { slug }, include: { _count: { select: { signatures: true } } } });
  if (!c || c.status === "DRAFT") notFound();
  const recent = await db.petitionSignature.findMany({ where: { campaignId: c.id }, orderBy: { createdAt: "desc" }, take: 6, select: { name: true, atoll: true, createdAt: true, isHealthWorker: true } });
  const signed = c._count.signatures;

  return (
    <>
      <PageHero kicker={c.status === "WON" ? "Campaign won" : "Campaign"} title={pick(lang, c.title, c.titleDv)} desc={pick(lang, c.summary, c.summaryDv)} image={c.coverImage ?? undefined} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1fr_400px]">
        <div className="prose-mhpu" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body) }} />
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6 shadow-xl shadow-brand-900/5">
            {c.status === "WON" ? (
              <div className="text-center">
                <Trophy className="mx-auto size-12 text-violet-600" />
                <h2 className="mt-2 text-xl font-bold">{T("We won this one!")}</h2>
                <p className="mt-1 text-sm text-muted">Thanks to the {signed.toLocaleString()} people who signed.</p>
              </div>
            ) : c.hasPetition ? (
              <>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold">{signed.toLocaleString()}</span>
                  <span className="text-sm text-muted">goal {c.goal.toLocaleString()}</span>
                </div>
                <Progress value={signed} max={c.goal} />
                <h2 className="mb-3 mt-6 text-lg font-bold">{T("Add your name")}</h2>
                <PetitionForm campaignId={c.id} ask={c.petitionAsk} />
              </>
            ) : (
              <Badge>{T("Campaign closed")}</Badge>
            )}
          </Card>
          {recent.length > 0 && (
            <Card className="mt-4 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Users className="size-4 text-brand-600" /> {T("Recent supporters")}</div>
              <ul className="space-y-2.5 text-sm">
                {recent.map((s, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span><span className="font-semibold">{s.name.split(" ")[0]}</span>{s.atoll && <span className="text-muted"> · {T(s.atoll)}</span>}{s.isHealthWorker && <span className="ms-1 text-xs text-brand-600">{T("· health worker")}</span>}</span>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(s.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
