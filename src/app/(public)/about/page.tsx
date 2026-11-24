import { Target, Eye, Handshake, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getLang, pick } from "@/lib/i18n";
import { PageHero, SectionHead } from "@/components/public/cards";
import { ButtonLink, Card } from "@/components/ui";
import { getSitePhotos } from "@/lib/site-photos";

export const metadata = { title: "About MHPU" };
export const dynamic = "force-dynamic";

const TIMELINE = [
  ["2019", "MHPU founded and registered (CR/113/2019) by health workers campaigning for a fair pay rise and decent conditions."],
  ["2025", "Campaigns against the cap on overtime pay that leaves health workers unpaid for hours worked."],
  ["2026", "Launches its new digital platform: online membership, member portal and e-ballots."],
];

export default async function AboutPage() {
  const photos = await getSitePhotos();
  const lang = await getLang();
  const affiliates = await db.affiliate.findMany({ where: { active: true }, include: { _count: { select: { members: true } } }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHero kicker="About us" title="The united voice of Maldivian healthcare workers" desc="MHPU is a national trade union federation that brings together health-worker unions and individual members across public and private healthcare." image={photos.about} />

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 md:grid-cols-3">
        {[
          { icon: Target, title: "Our mission", body: "To protect and advance the rights, pay and wellbeing of every health worker in the Maldives through collective action, representation and dialogue." },
          { icon: Eye, title: "Our vision", body: "A health system where staff are safe, fairly paid and properly resourced — so every island community gets the care it deserves." },
          { icon: Handshake, title: "Our values", body: "Solidarity across professions and nationalities, democratic decision-making, transparency, and respect for patients and colleagues." },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-7">
            <span className="grid size-12 place-items-center rounded-2xl bg-coral-50 text-coral-600"><Icon className="size-6" /></span>
            <h2 className="mt-4 text-xl font-bold">{title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{body}</p>
          </Card>
        ))}
      </section>

      <section className="bg-sand-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-2">
          <div>
            <SectionHead kicker="Our story" title="From a pay campaign to a national federation" />
            <ol className="relative space-y-6 border-s-2 border-brand-200 ps-6">
              {TIMELINE.map(([year, text]) => (
                <li key={year} className="relative">
                  <span className="absolute -start-[33px] top-1 size-4 rounded-full border-4 border-sand-50 bg-coral-500" />
                  <div className="text-sm font-extrabold text-brand-700">{year}</div>
                  <p className="mt-1 text-ink">{text}</p>
                </li>
              ))}
            </ol>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos.islands} alt="Aerial view of a Maldivian island" className="h-full min-h-80 w-full rounded-3xl object-cover" />
        </div>
      </section>

      {affiliates.length > 0 && (
      <section id="affiliates" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16">
        <SectionHead kicker="Federation" title="Workplace unions" action={<ButtonLink href="/contact" variant="outline">Register your workplace union</ButtonLink>} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {affiliates.map((a) => (
            <Card key={a.id} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-700 text-sm font-extrabold text-white">{a.shortName.slice(0, 4)}</span>
                {a._count.members > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><Users className="size-3.5" /> {a._count.members.toLocaleString()}</span>}
              </div>
              <h3 className="mt-4 font-bold">{pick(lang, a.name, a.nameDv)}</h3>
              {a.workplace && <p className="mt-0.5 text-sm font-medium text-brand-700">{a.workplace}</p>}
              {a.description && <p className="mt-1 text-sm text-muted">{a.description}</p>}
            </Card>
          ))}
        </div>
      </section>
      )}

    </>
  );
}
