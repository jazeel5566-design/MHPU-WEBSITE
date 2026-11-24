import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/admin/forms";

export default async function SettingsPage() {
  await requireRole(["ADMIN"], "/admin");
  const s = await getSettings();
  return (
    <div>
      <PageHeader title="Site settings" desc="Update contact details, dues and the site-wide alert banner without a developer." actions={<><ButtonLink href="/admin/affiliates" variant="outline">Workplace unions →</ButtonLink><ButtonLink href="/admin/photos" variant="outline">Site photos →</ButtonLink></>} />
      <Card className="p-6"><SettingsForm s={s} env={{ bml: !!process.env.BML_API_KEY, bmlMode: process.env.BML_MODE === "production" ? "live" : "sandbox", dhiraagu: !!(process.env.DHIRAAGU_SMS_USERNAME && process.env.DHIRAAGU_SMS_PASSWORD), cron: !!process.env.CRON_SECRET }} /></Card>
    </div>
  );
}
