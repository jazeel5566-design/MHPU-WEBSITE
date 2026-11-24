import { requireRole } from "@/lib/auth";
import { FEATURE_GROUPS } from "@/lib/features";
import { getDisabled } from "@/lib/features-server";
import { PageHeader } from "@/components/ui";
import { FeaturesForm } from "@/components/admin/features-form";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  await requireRole(["ADMIN"], "/admin");
  const disabled = [...(await getDisabled())];
  return (
    <div className="space-y-6">
      <PageHeader title="Pages & features" desc="Switch off any page, section or portal tab you don't need. Switched-off items disappear from menus and links, and their addresses show a short “not available” notice. Nothing is deleted: switch an item back on and it returns exactly as it was." />
      <FeaturesForm groups={FEATURE_GROUPS} disabled={disabled} />
    </div>
  );
}
