import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, LifeBuoy, Lock, UserPlus } from "lucide-react";
import { postIn } from "@/lib/post-lang";
import { db } from "@/lib/db";
import { getLang, getT } from "@/lib/i18n";
import { audience } from "@/lib/audience-server";
import { features } from "@/lib/features-server";
import { livePosts, liveOrder, postsForLang } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, readingTime } from "@/lib/utils";
import { labelOf, POST_CATEGORIES } from "@/lib/constants";
import { coverFor } from "@/lib/images";
import { Badge, ButtonLink } from "@/components/ui";
import { PostCard } from "@/components/public/cards";
import { ShareButtons } from "@/components/public/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.post.findUnique({ where: { slug }, select: { title: true, titleDv: true, excerpt: true, excerptDv: true, coverImage: true } });
  if (!p) return {};
  const v = postIn(p, await getLang());
  return { title: v.title, description: v.excerpt ?? undefined, openGraph: p.coverImage ? { images: [p.coverImage] } : undefined };
}

/** Text without markdown, for comparing the standfirst with the first paragraph. */
const plain = (s: string) => s.replace(/[*_`#>\[\]()!]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const T = await getT();
  const { slug } = await params;
  const [lang, a, f] = await Promise.all([getLang(), audience(), features()]);
  const post = await db.post.findFirst({ where: { slug, ...livePosts(["PUBLIC", "MEMBERS"]) }, include: { author: { select: { name: true, title: true } } } });
  if (!post) notFound();

  // Members only: the article itself, its news tab (e.g. Member notices), or the whole News page.
  const membersPost = post.visibility === "MEMBERS" || a.membersNews.includes(post.category) || a.membersOnly.has("page.news");
  const canRead = !membersPost || a.isMember;
  if (canRead) await db.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } });

  // "More from MHPU": same kind of article first, then the latest, always a full row of three.
  const visible = { AND: [livePosts(), { id: { not: post.id } }, { category: { notIn: a.hiddenNews } }, await postsForLang(lang)] };
  const [sameKind, latest] = await Promise.all([
    db.post.findMany({ where: { AND: [visible, { category: post.category }] }, orderBy: liveOrder, take: 3 }),
    db.post.findMany({ where: visible, orderBy: liveOrder, take: 6 }),
  ]);
  const more = [...sameKind, ...latest.filter((p) => !sameKind.some((s) => s.id === p.id))].slice(0, 3);
  const sidebar = latest.slice(0, 4);

  // The language version for this website; a single-language article shows in its own language.
  const v = postIn(post, lang);
  const body = v.body;
  const isDv = v.dv;
  const bodyIsDv = isDv || /[ހ-޿]/.test(body.slice(0, 400)); // Dhivehi text typed in the English box
  // Don't repeat the standfirst when the article opens with the same words.
  const firstPara = body.split(/\n\s*\n/)[0] ?? "";
  const showExcerpt = !!v.excerpt && !plain(firstPara).startsWith(plain(v.excerpt).slice(0, 80));
  const date = formatDate(post.publishedAt ?? post.publishAt, { day: "numeric", month: "long", year: "numeric" });
  const dir = isDv ? "rtl" : undefined;

  return (
    <article>
      {/* Header band */}
      <header className="border-b border-line bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:pb-12" dir={dir}>
          <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4 rtl:rotate-180" /> {T("All news")}</Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{T(labelOf(POST_CATEGORIES, post.category))}</Badge>
            {membersPost && <Badge tone="violet">{T("Members only")}</Badge>}
          </div>
          <h1 className={`mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl lg:text-5xl ${isDv ? "dv-text !leading-snug" : ""}`}>{v.title}</h1>
          {showExcerpt && <p className={`mt-4 max-w-3xl text-lg leading-relaxed text-muted sm:text-xl ${isDv ? "dv-text" : ""}`}>{v.excerpt}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{post.author.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
              <span dir="ltr"><span className="font-semibold text-ink">{post.author.name}</span>{post.author.title && <span>, {post.author.title}</span>}</span>
            </span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> <bdi>{date}</bdi></span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> <bdi>{readingTime(body)} {T("min read")}</bdi></span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14 lg:py-14">
        {/* Article */}
        <div className="min-w-0">
          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImage} alt="" className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-sm" />
          )}
          {canRead ? (
            // A Dhivehi text block sits on the right of the column, like the text itself.
            <div className={`max-w-3xl ${bodyIsDv && lang !== "dv" ? "ml-auto" : ""}`} dir={bodyIsDv ? "rtl" : undefined}>
              {bodyIsDv && lang !== "dv" && <p className="mb-6 inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-muted" dir="ltr">{T("This article is in Dhivehi.")}</p>}
              {!bodyIsDv && lang === "dv" && <p className="dv-text mb-6 inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-muted">{T("This article is in English.")}</p>}
              <div className={`prose-mhpu ${bodyIsDv ? "dv-text prose-dv" : ""}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
            </div>
          ) : (
            <div className="max-w-3xl rounded-3xl border border-violet-200 bg-violet-50 p-8 text-center">
              <Lock className="mx-auto size-10 text-violet-600" />
              <h2 className="mt-3 text-xl font-bold">{T("This update is for MHPU members")}</h2>
              <p className="mt-2 text-muted">{T("Log in to read the full notice, or join today to get member updates.")}</p>
              <div className="mt-5 flex justify-center gap-3">
                <ButtonLink href={`/login?next=/news/${post.slug}`}>{T("Log in")}</ButtonLink>
                <ButtonLink href="/join" variant="coral">{T("Join MHPU")}</ButtonLink>
              </div>
            </div>
          )}
          {post.tags && (
            <div className={`mt-10 flex max-w-3xl flex-wrap gap-2 border-t border-line pt-6 ${bodyIsDv && lang !== "dv" ? "ml-auto" : ""}`} dir={bodyIsDv ? "rtl" : undefined}>
              {post.tags.split(",").map((t) => <Link key={t} href={`/news?q=${encodeURIComponent(t.trim())}`} className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-muted hover:bg-sand-200">#{t.trim()}</Link>)}
            </div>
          )}
          <div className="mt-8 max-w-3xl rounded-2xl bg-sand-50 p-5 text-center lg:hidden">
            <div className="text-sm font-semibold">{T("Share this with your colleagues")}</div>
            <ShareButtons />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="text-sm font-bold">{T("Share this with your colleagues")}</div>
              <ShareButtons />
            </div>
            {sidebar.length > 0 && (
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="mb-3 text-sm font-bold">{T("Latest from MHPU")}</div>
                <ul className="divide-y divide-line">
                  {sidebar.map((p) => {
                    const s = postIn(p, lang);
                    return (
                      <li key={p.id}>
                        <Link href={`/news/${p.slug}`} className="group flex gap-3 py-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.coverImage || coverFor(p.slug)} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                          <span className="min-w-0">
                            <span className={`line-clamp-3 text-sm font-semibold leading-snug group-hover:text-brand-700 ${s.dv ? "dv-text" : ""}`} dir={s.dv ? "rtl" : undefined}>{s.title}</span>
                            <span className="mt-1 block text-xs text-muted">{formatDate(p.publishedAt)}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {(f.path("/get-help") || f.path("/join")) && (
              <div className="rounded-2xl bg-brand-900 p-5 text-white">
                <div className="font-bold">{T("Facing a problem at work?")}</div>
                <p className="mt-1 text-sm text-brand-100">{T("MHPU stands with health workers on pay, rosters, safety and fair treatment.")}</p>
                <div className="mt-4 flex flex-col gap-2">
                  {f.path("/get-help") && <ButtonLink href="/get-help" size="sm" className="bg-white text-brand-900 hover:bg-brand-50"><LifeBuoy className="size-4" /> {T("Get help at work")}</ButtonLink>}
                  {f.path("/join") && <ButtonLink href="/join" size="sm" variant="coral"><UserPlus className="size-4" /> {T("Join MHPU")}</ButtonLink>}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {more.length > 0 && (
        <section className="border-t border-line bg-sand-50 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-extrabold">{T("More from MHPU")}</h2>
              <Link href="/news" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">{T("All news")} <ArrowRight className="size-4 rtl:rotate-180" /></Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{more.map((p) => <PostCard key={p.id} post={p} lang={lang} />)}</div>
          </div>
        </section>
      )}
    </article>
  );
}
