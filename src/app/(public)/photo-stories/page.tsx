import Link from "next/link";
import { Images } from "lucide-react";
import { guardMembersOnly } from "@/lib/audience-server";
import { getPhotoStories, galleryOf } from "@/lib/photo-stories";
import { getLang, pick, getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { PageHero } from "@/components/public/cards";
import { EmptyState } from "@/components/ui";
import { PHOTO } from "@/lib/images";

export const metadata = { title: "Photo stories" };
export const dynamic = "force-dynamic";

export default async function PhotoStoriesPage() {
  await guardMembersOnly("page.photoStories", "/photo-stories");
  const T = await getT();
  const lang = await getLang();
  const stories = (await getPhotoStories()).filter((s) => s.published);
  return (
    <>
      <PageHero kicker={T("Photo stories")} title={T("Our union in pictures")} desc={T("Rallies, campaigns and gatherings of health workers across the Maldives.")} image={PHOTO.mayDayGathering} />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {stories.length === 0 ? <EmptyState title={T("No photo stories yet")} /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((s) => (
              <Link key={s.id} href={`/photo-stories/${s.slug}`} className="group overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.cover} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white"><Images className="size-3.5" /> {galleryOf(s).length}</span>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                    {s.tag && <span className="rounded-full bg-coral-50 px-2 py-0.5 text-coral-700">{T(s.tag)}</span>}
                    <span>{formatDate(new Date(s.date))}</span>
                  </div>
                  <h2 className={`mt-2 text-lg font-bold group-hover:text-brand-700 ${lang === "dv" && s.titleDv ? "dv-text" : ""}`}>{pick(lang, s.title, s.titleDv)}</h2>
                  {s.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.summary}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
