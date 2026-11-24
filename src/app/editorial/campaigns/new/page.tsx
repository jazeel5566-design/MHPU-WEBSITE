import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CampaignForm } from "@/components/editorial/forms";

export default async function NewCampaign() {
  await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"], "/editorial");
  return (
    <div>
      <PageHeader title="New campaign" />
      <CampaignForm c={{ title: "", titleDv: null, slug: "", summary: "", summaryDv: null, body: "", coverImage: null, status: "DRAFT", goal: 1000, hasPetition: true, petitionAsk: null, featured: false }} />
    </div>
  );
}
