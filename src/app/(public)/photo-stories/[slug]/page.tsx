import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { guardMembersOnly } from "@/lib/audience-server";
import { getPhotoStories, galleryOf } from "@/lib/photo-stories";
import { getLang, pick, getT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { PhotoGallery } from "@/components/public/photo-gallery";

export const dynamic = "force-dynamic";

const find = async (slug: string) => (await getPhotoStories()).find((s) => s.slug === slug && s.published);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = await find((await params).slug);
  return s ? { title: s.title, description: s.summary, openGraph: { images: [s.cover] } } : {};
}

export default async function PhotoStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  await guardMembersOnly("page.photoStories", "/photo-stories");
  const T = await getT();
  const lang = await getLang();
  const s = await find((await params).slug);
  if (!s) notFound();
  const photos = galleryOf(s);
  const title = pick(lang, s.title, s.titleDv);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/photo-stories" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4 rtl:rotate-180" /> {T("All photo stories")}</Link>
      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
          {s.tag && <span className="rounded-full bg-coral-50 px-2.5 py-0.5 text-coral-700">{T(s.tag)}</span>}
          <span>{formatDate(new Date(s.date))}</span>
          <span>· {photos.length} {T("photos")}</span>
        </div>
        <h1 className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl ${lang === "dv" && s.titleDv ? "dv-text" : ""}`}>{title}</h1>
        {s.summary && <p className="mt-3 text-lg text-muted">{s.summary}</p>}
      </header>
      <div className="mt-8"><PhotoGallery photos={photos} title={title} /></div>
    </div>
  );
}
