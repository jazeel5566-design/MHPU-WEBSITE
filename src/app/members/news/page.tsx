import { db } from "@/lib/db";
import { requireActiveMember } from "@/lib/auth";
import { livePosts, liveOrder } from "@/lib/content";
import { PostCard } from "@/components/public/cards";
import { PageHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Member notices" };

export default async function MemberNews() {
  await requireActiveMember();
  const [notices, latest] = await Promise.all([
    db.post.findMany({ where: livePosts(["MEMBERS"]), orderBy: liveOrder, take: 12 }),
    db.post.findMany({ where: livePosts(["PUBLIC"]), orderBy: liveOrder, take: 6 }),
  ]);
  return (
    <div>
      <PageHeader title="Member notices" desc="Updates shared only with MHPU members." />
      {notices.length === 0 ? <EmptyState title="No member notices right now" /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{notices.map((p) => <PostCard key={p.id} post={p} />)}</div>
      )}
      <h2 className="mb-4 mt-10 text-lg font-bold">Public news</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{latest.map((p) => <PostCard key={p.id} post={p} />)}</div>
    </div>
  );
}
