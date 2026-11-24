import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteAffiliate } from "@/app/actions/admin";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AffiliateForm } from "@/components/admin/forms";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function AffiliatesAdmin() {
  await requireRole(["ADMIN"], "/admin");
  const list = await db.affiliate.findMany({ include: { _count: { select: { members: true } } }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Affiliated unions" desc="Member organisations of the federation. Shown on the public About page." />
      <Card><CardHeader title="Add an affiliate" /><div className="p-5"><AffiliateForm /></div></Card>
      {list.map((a) => (
        <Card key={a.id}>
          <CardHeader title={a.name} desc={`${a._count.members} linked member records · ${a.memberCount} reported members`}
            action={<form action={deleteAffiliate}><input type="hidden" name="id" value={a.id} /><SubmitButton size="sm" variant="ghost" className="text-red-600" confirm={`Remove ${a.name}?`}><Trash2 className="size-4" /></SubmitButton></form>} />
          <div className="p-5"><AffiliateForm a={a} /></div>
        </Card>
      ))}
    </div>
  );
}
