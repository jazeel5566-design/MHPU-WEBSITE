import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { getLang, getT } from "@/lib/i18n";
import { guardMembersOnly } from "@/lib/audience-server";
import { livePosts, liveOrder } from "@/lib/content";
import { POST_CATEGORIES } from "@/lib/constants";
import { PostCard, PageHero } from "@/components/public/cards";
import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getSitePhotos } from "@/lib/site-photos";

export const metadata = { title: "News & statements" };
export const dynamic = "force-dynamic";

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; page?: string }> }) {
  const T = await getT();
  const photos = await getSitePhotos();
  const { category, q, page = "1" } = await searchParams;
  const lang = await getLang();
  const a = await guardMembersOnly("page.news", "/news");
  if (category) await guardMembersOnly(`news.${category}`, `/news?category=${category}`);
  const vis: ("PUBLIC" | "MEMBERS")[] = a.isMember ? ["PUBLIC", "MEMBERS"] : ["PUBLIC"];
  const take = 12;
  const where = {
    AND: [
      livePosts(vis),
      category ? { category } : {},
      { category: { notIn: a.hiddenNews } }, // members-only tabs (e.g. Member notices)
      q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { excerpt: { contains: q, mode: "insensitive" as const } }, { body: { contains: q, mode: "insensitive" as const } }] } : {},
    ],
  };
  const [posts, total] = await Promise.all([
    db.post.findMany({ where, orderBy: liveOrder, take, skip: (Number(page) - 1) * take }),
    db.post.count({ where }),
  ]);
  const pages = Math.ceil(total / take);
  const qs = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ category, q, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/news${s.toString() ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHero kicker={T("Newsroom")} title={T("News, statements & press releases")} desc={T("The latest from MHPU on pay, staffing and conditions across the Maldives' health sector.")} image={photos.news} />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Chip href={qs({ category: undefined, page: undefined })} active={!category}>{T("All")}</Chip>
            {POST_CATEGORIES.filter((c) => !a.hiddenNews.includes(c.id)).map((c) => <Chip key={c.id} href={qs({ category: c.id, page: undefined })} active={category === c.id}>{T(c.label)}</Chip>)}
          </div>
          <form className="relative w-full lg:w-80">
            {category && <input type="hidden" name="category" value={category} />}
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} placeholder={T("Search news…")} className="h-11 w-full rounded-full border border-line bg-white ps-10 pe-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </form>
        </div>
        {posts.length === 0 ? (
          <EmptyState title={T("No articles found")} desc={T("Try a different search or category.")} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <PostCard key={p.id} post={p} lang={lang} />)}
          </div>
        )}
        {pages > 1 && (
          <nav className="mt-10 flex justify-center gap-2" aria-label={T("Pagination")}>
            {Array.from({ length: pages }, (_, i) => String(i + 1)).map((p) => (
              <Chip key={p} href={qs({ page: p })} active={p === page}>{p}</Chip>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", active ? "bg-brand-700 text-white" : "bg-sand-100 text-ink hover:bg-sand-200")}>
      {children}
    </Link>
  );
}
