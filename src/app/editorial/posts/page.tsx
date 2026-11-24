import Link from "next/link";
import { PenSquare, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { POST_CATEGORIES, labelOf } from "@/lib/constants";
import { timeAgo, cn } from "@/lib/utils";
import { ButtonLink, Card, PageHeader, StatusBadge, Table, Th, Td, Badge, EmptyState, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";
const TABS = ["ALL", "DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"];

export default async function PostsList({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const user = await requireRole(["ADMIN", "EDITOR", "AUTHOR"], "/editorial");
  const status = sp.status && sp.status !== "ALL" ? sp.status : undefined;
  const scope = user.role === "AUTHOR" ? { authorId: user.id } : {};
  const where = { ...scope, ...(status ? { status } : {}), ...(sp.q ? { title: { contains: sp.q, mode: "insensitive" as const } } : {}) };
  const [posts, counts] = await Promise.all([
    db.post.findMany({ where, include: { author: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.post.groupBy({ by: ["status"], where: scope, _count: true }),
  ]);
  const countOf = (s: string) => s === "ALL" ? counts.reduce((a, c) => a + c._count, 0) : counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div>
      <PageHeader title={user.role === "AUTHOR" ? "My articles" : "Articles"} actions={<ButtonLink href="/editorial/posts/new" variant="coral"><PenSquare className="size-4" /> New article</ButtonLink>} />
      {sp.deleted && <div className="mb-4"><Notice>Article deleted.</Notice></div>}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <Link key={t} href={`/editorial/posts${t === "ALL" ? "" : `?status=${t}`}`} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", (status ?? "ALL") === t ? "bg-ink text-white" : "text-muted hover:bg-sand-100")}>
              {t === "ALL" ? "All" : t.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} <span className="opacity-60">{countOf(t)}</span>
            </Link>
          ))}
        </div>
        <form className="relative">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Search titles…" className="h-10 w-full rounded-full border border-line bg-white ps-9 pe-4 text-sm md:w-64" />
        </form>
      </div>
      <Card>
        {posts.length === 0 ? <div className="p-6"><EmptyState title="No articles here" /></div> : (
          <Table>
            <thead><tr><Th>Title</Th><Th>Section</Th><Th>Author</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-sand-50">
                  <Td className="max-w-md"><Link href={`/editorial/posts/${p.id}`} className="font-semibold hover:text-brand-700">{p.title}</Link>
                    <div className="mt-0.5 flex gap-1">{p.visibility === "MEMBERS" && <Badge tone="violet">Members</Badge>}{p.featured && <Badge tone="coral">Featured</Badge>}{p.titleDv && <Badge tone="blue">ދިވެހި</Badge>}</div></Td>
                  <Td className="text-muted">{labelOf(POST_CATEGORIES, p.category)}</Td>
                  <Td className="text-muted">{p.author.name}</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td className="whitespace-nowrap text-muted">{timeAgo(p.updatedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
