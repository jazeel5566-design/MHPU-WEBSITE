import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { toggleMessage } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function Inbox() {
  await requireRole(["ADMIN", "CASEWORKER"], "/admin");
  const [msgs, subs] = await Promise.all([db.contactMessage.findMany({ orderBy: [{ handled: "asc" }, { createdAt: "desc" }], take: 100 }), db.subscriber.count()]);
  return (
    <div>
      <PageHeader title="Inbox" desc={`Messages from the public contact form · ${subs} newsletter subscribers`} />
      {msgs.length === 0 ? <EmptyState title="No messages" /> : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <Card key={m.id} className={`p-5 ${m.handled ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><span className="font-bold">{m.name}</span><Badge tone="brand">{m.topic}</Badge>{m.handled && <Badge tone="green">Handled</Badge>}</div>
                  <div className="text-xs text-muted"><a href={`mailto:${m.email}`} className="text-brand-700">{m.email}</a>{m.phone && ` · ${m.phone}`} · {formatDateTime(m.createdAt)}</div>
                </div>
                <form action={toggleMessage}><input type="hidden" name="id" value={m.id} /><SubmitButton size="sm" variant="outline">{m.handled ? "Mark unhandled" : "Mark handled"}</SubmitButton></form>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
