import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { EventForm } from "@/components/editorial/forms";

export default async function NewEvent() {
  await requireRole(["ADMIN", "EDITOR"], "/editorial");
  return (
    <div>
      <PageHeader title="New event" />
      <EventForm e={{ title: "", titleDv: null, description: "", startsAt: "", endsAt: null, location: "", isOnline: false, type: "MEETING", visibility: "PUBLIC", capacity: null, cpdHours: null, published: true }} />
    </div>
  );
}
