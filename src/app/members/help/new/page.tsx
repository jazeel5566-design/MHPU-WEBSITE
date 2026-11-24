import { Phone } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Card, PageHeader, Notice } from "@/components/ui";
import { NewCaseForm } from "@/components/members/forms";

export const metadata = { title: "Open a case" };

export default async function NewCasePage() {
  const [{ member }, s] = await Promise.all([requireMember(), getSettings()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker="Get help" title="Open a case" desc="Tell us what's going on. An organiser will respond within 2 working days (urgent cases the same day)." />
      <div className="mb-6"><Notice tone="brand"><Phone className="me-1 inline size-4" /> Disciplinary hearing in the next 24 hours? Call the help line now: <strong dir="ltr">{s.hotline}</strong></Notice></div>
      <Card className="p-6"><NewCaseForm employer={member.employer} /></Card>
    </div>
  );
}
