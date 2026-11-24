import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/admin/forms";

export default async function SettingsPage() {
  await requireRole(["ADMIN"], "/admin");
  const s = await getSettings();
  return (
    <div>
      <PageHeader title="Site settings" desc="Update contact details, dues and the site-wide alert banner without a developer." actions={<ButtonLink href="/admin/photos" variant="outline">Change site photos →</ButtonLink>} />
      <Card className="p-6"><SettingsForm s={s} /></Card>
    </div>
  );
}
