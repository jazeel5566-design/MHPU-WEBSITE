import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { getLang, pick } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { livePosts, liveOrder } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, readingTime } from "@/lib/utils";
import { labelOf, POST_CATEGORIES } from "@/lib/constants";
import { Badge, ButtonLink } from "@/components/ui";
import { PostCard } from "@/components/public/cards";
import { ShareButtons } from "@/components/public/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.post.findUnique({ where: { slug }, select: { title: true, excerpt: true } });
  return p ? { title: p.title, description: p.excerpt ?? undefined } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);
  const post = await db.post.findFirst({ where: { slug, ...livePosts(["PUBLIC", "MEMBERS"]) }, include: { author: { select: { name: true, title: true } } } });
  if (!post) notFound();

  const canRead = post.visibility === "PUBLIC" || !!user?.member || user?.role === "ADMIN";
  if (canRead) await db.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
  const related = await db.post.findMany({ where: { AND: [livePosts(), { category: post.category, id: { not: post.id } }] }, orderBy: liveOrder, take: 3 });
  const body = pick(lang, post.body, post.bodyDv);
  const isDv = lang === "dv" && !!post.bodyDv;

  return (
    <article>
      <header className="mx-auto max-w-3xl px-4 pt-10">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4 rtl:rotate-180" /> All news</Link>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{labelOf(POST_CATEGORIES, post.category)}</Badge>
          {post.visibility === "MEMBERS" && <Badge tone="violet">Members only</Badge>}
        </div>
        <h1 className={`mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl ${isDv ? "dv-text" : ""}`}>{pick(lang, post.title, post.titleDv)}</h1>
        {post.excerpt && <p className="mt-4 text-xl leading-relaxed text-muted">{pick(lang, post.excerpt, post.excerptDv)}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-line py-4 text-sm text-muted">
          <span><span className="font-semibold text-ink">{post.author.name}</span>{post.author.title && <span>, {post.author.title}</span>}</span>
          <span>{formatDate(post.publishedAt ?? post.publishAt, { day: "numeric", month: "long", year: "numeric" })}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-4" /> {readingTime(body)} min read</span>
        </div>
      </header>
      {post.coverImage && (
        <div className="mx-auto mt-8 max-w-5xl px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage} alt="" className="aspect-[21/9] w-full rounded-3xl object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-3xl px-4 py-10">
        {canRead ? (
          <div className={`prose-mhpu ${isDv ? "dv-text" : ""}`} dir={isDv ? "rtl" : undefined} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        ) : (
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-8 text-center">
            <Lock className="mx-auto size-10 text-violet-600" />
            <h2 className="mt-3 text-xl font-bold">This update is for MHPU members</h2>
            <p className="mt-2 text-muted">Log in to read the full notice, or join today to get member updates.</p>
            <div className="mt-5 flex justify-center gap-3">
              <ButtonLink href={`/login?next=/news/${post.slug}`}>Log in</ButtonLink>
              <ButtonLink href="/join" variant="coral">Join MHPU</ButtonLink>
            </div>
          </div>
        )}
        {post.tags && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.split(",").map((t) => <Link key={t} href={`/news?q=${encodeURIComponent(t.trim())}`} className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-muted hover:bg-sand-200">#{t.trim()}</Link>)}
          </div>
        )}
        <div className="mt-8 rounded-2xl bg-sand-50 p-5 text-center">
          <div className="text-sm font-semibold">Share this with your colleagues</div>
          <ShareButtons />
        </div>
      </div>
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4">
          <h2 className="mb-6 text-2xl font-extrabold">Related</h2>
          <div className="grid gap-6 md:grid-cols-3">{related.map((p) => <PostCard key={p.id} post={p} lang={lang} />)}</div>
        </section>
      )}
    </article>
  );
}
