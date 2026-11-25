import { requireRole } from "@/lib/auth";
import { FEATURE_GROUPS } from "@/lib/features";
import { getDisabled } from "@/lib/features-server";
import { PageHeader } from "@/components/ui";
import { FeaturesForm } from "@/components/admin/features-form";
import { AudienceForm } from "@/components/admin/audience-form";
import { AUDIENCE_GROUPS } from "@/lib/audience";
import { getMembersOnly } from "@/lib/audience-server";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  await requireRole(["ADMIN"], "/admin");
  const [disabled, membersOnly] = await Promise.all([getDisabled().then((d) => [...d]), getMembersOnly().then((m) => [...m])]);
  return (
    <div className="space-y-6">
      <PageHeader title="Pages & features" desc="Switch off any page, section or portal tab you don't need. Switched-off items disappear from menus and links, and their addresses show a short “not available” notice. Nothing is deleted: switch an item back on and it returns exactly as it was." />
      <section id="audience" className="space-y-3">
        <div>
          <h2 className="text-lg font-bold">Who can see it</h2>
          <p className="text-sm text-muted">Make a public page or tab members only. Members (active members and staff) see it as usual. Everyone else doesn&apos;t see it in menus or tabs, and its address asks them to log in.</p>
        </div>
        <AudienceForm groups={AUDIENCE_GROUPS} membersOnly={membersOnly} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Switch on or off</h2>
        <FeaturesForm groups={FEATURE_GROUPS} disabled={disabled} />
      </section>
    </div>
  );
}
