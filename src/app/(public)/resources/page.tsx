import Link from "next/link";
import { FileText, Download, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { RESOURCE_CATEGORIES, labelOf } from "@/lib/constants";
import { PageHero } from "@/components/public/cards";
import { Badge, EmptyState } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import { IMG } from "@/lib/images";

export const metadata = { title: "Resources" };
export const dynamic = "force-dynamic";

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const user = await getCurrentUser();
  const isMember = !!user?.member || user?.role === "ADMIN";
  const items = await db.resource.findMany({ where: category ? { category } : {}, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHero kicker="Resources" title="Know your rights" desc="Guides, agreements, forms and reports. Some documents are for members only." image={IMG.doctorPortrait} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/resources" className={cn("rounded-full px-4 py-2 text-sm font-semibold", !category ? "bg-brand-700 text-white" : "bg-sand-100 hover:bg-sand-200")}>All</Link>
          {RESOURCE_CATEGORIES.map((c) => (
            <Link key={c.id} href={`/resources?category=${c.id}`} className={cn("rounded-full px-4 py-2 text-sm font-semibold", category === c.id ? "bg-brand-700 text-white" : "bg-sand-100 hover:bg-sand-200")}>{c.label}</Link>
          ))}
        </div>
        {items.length === 0 ? <EmptyState title="Nothing here yet" /> : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {items.map((r) => {
              const locked = r.visibility === "MEMBERS" && !isMember;
              return (
                <li key={r.id} className="flex items-center gap-4 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><FileText className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.title}</span>
                      <Badge tone="gray">{labelOf(RESOURCE_CATEGORIES, r.category)}</Badge>
                      {r.visibility === "MEMBERS" && <Badge tone="violet">Members</Badge>}
                    </div>
                    {r.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{r.description}</p>}
                    <p className="mt-0.5 text-xs text-muted">Updated {formatDate(r.createdAt)}</p>
                  </div>
                  {locked ? (
                    <Link href={`/login?next=/resources`} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"><Lock className="size-3.5" /> Log in</Link>
                  ) : (
                    <a href={`/api/resources/${r.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-3 py-2 text-xs font-bold text-white hover:bg-brand-800"><Download className="size-3.5" /> Download</a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
