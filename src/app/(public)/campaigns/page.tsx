import { db } from "@/lib/db";
import { getLang, getT } from "@/lib/i18n";
import { CampaignCard, PageHero, SectionHead } from "@/components/public/cards";
import { getSitePhotos } from "@/lib/site-photos";

export const metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const T = await getT();
  const photos = await getSitePhotos();
  const lang = await getLang();
  const all = await db.campaign.findMany({ where: { status: { not: "DRAFT" } }, include: { _count: { select: { signatures: true } } }, orderBy: [{ featured: "desc" }, { updatedAt: "desc" }] });
  const active = all.filter((c) => c.status === "ACTIVE");
  const past = all.filter((c) => c.status !== "ACTIVE");
  return (
    <>
      <PageHero kicker={T("Campaigns")} title={T("Together we win")} desc={T("Sign a petition, share a campaign, and help health workers win fair pay and safe working conditions.")} image={photos.campaigns} />
      <div className="mx-auto max-w-7xl px-4 py-14">
        <SectionHead title={T("Take action now")} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{active.map((c) => <CampaignCard key={c.id} c={c} lang={lang} fallbackImage={photos.campaigns} />)}</div>
        {past.length > 0 && (
          <>
            <div className="mt-16" />
            <SectionHead title={T("Wins & past campaigns")} />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{past.map((c) => <CampaignCard key={c.id} c={c} lang={lang} fallbackImage={photos.campaigns} />)}</div>
          </>
        )}
      </div>
    </>
  );
}
