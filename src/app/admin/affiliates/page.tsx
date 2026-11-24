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
  const list = await db.affiliate.findMany({ include: { _count: { select: { members: true, elections: true } } }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Workplace unions" desc="Applicants are placed in a workplace union automatically from the hospital/company they enter (matched against each union's workplace names). If their workplace has no union, they join MHPU directly. Unions marked “Active” are used for matching and listed on the About page." />
      <Card><CardHeader title="Add a workplace union" /><div className="p-5"><AffiliateForm /></div></Card>
      {list.map((a) => (
        <Card key={a.id}>
          <CardHeader title={`${a.name}${a.active ? "" : " (inactive)"}`} desc={`${a._count.members} members on record${a.workplace ? ` · ${a.workplace}` : ""}`}
            action={a._count.elections ? <span className="text-xs text-muted">Has elections — untick “Active” instead of deleting</span> : <form action={deleteAffiliate}><input type="hidden" name="id" value={a.id} /><SubmitButton size="sm" variant="ghost" className="text-red-600" confirm={`Remove ${a.name}? Its ${a._count.members} members will be left without a workplace union.`}><Trash2 className="size-4" /></SubmitButton></form>} />
          <div className="p-5"><AffiliateForm a={a} /></div>
        </Card>
      ))}
    </div>
  );
}
