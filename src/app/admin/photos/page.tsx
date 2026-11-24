import { requireRole } from "@/lib/auth";
import { SITE_PHOTOS, getSitePhotos, getCustomizedPhotoKeys, type SitePhotoKey } from "@/lib/site-photos";
import { PageHeader } from "@/components/ui";
import { SitePhotoCard } from "@/components/admin/site-photo-card";

export const metadata = { title: "Site photos" };
export const dynamic = "force-dynamic";

export default async function SitePhotosPage() {
  await requireRole(["ADMIN"], "/admin");
  const [photos, customized] = await Promise.all([getSitePhotos(), getCustomizedPhotoKeys()]);
  return (
    <div>
      <PageHeader title="Site photos" desc="Replace the large photos used across the website. Landscape photos at least 1600 px wide look best; large phone photos are resized automatically. Changes go live immediately." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(SITE_PHOTOS) as SitePhotoKey[]).map((k) => (
          <SitePhotoCard key={k} k={k} label={SITE_PHOTOS[k].label} where={SITE_PHOTOS[k].where} url={photos[k]} customized={customized.has(k)} />
        ))}
      </div>
    </div>
  );
}
