import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteCampaign } from "@/app/actions/editorial";
import { PageHeader } from "@/components/ui";
import { CampaignForm } from "@/components/editorial/forms";
import { SubmitButton } from "@/components/submit-button";

export default async function EditCampaign({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"], "/editorial");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) notFound();
  return (
    <div>
      <Link href="/editorial/campaigns" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="size-4 rtl:rotate-180" /> Campaigns</Link>
      <PageHeader title={c.title} actions={<>
        <a href={`/campaigns/${c.slug}`} target="_blank" className="inline-flex h-10 items-center gap-1 rounded-full px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50">View <ExternalLink className="size-3.5" /></a>
        <form action={deleteCampaign}><input type="hidden" name="id" value={c.id} /><SubmitButton variant="ghost" className="text-red-600" confirm="Delete this campaign and all its signatures?"><Trash2 className="size-4" /> Delete</SubmitButton></form>
      </>} />
      <CampaignForm c={c} savedMsg={sp.saved ? "Campaign created." : undefined} />
    </div>
  );
}
