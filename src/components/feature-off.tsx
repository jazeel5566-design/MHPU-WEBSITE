import { PowerOff } from "lucide-react";
import { ALL_FEATURES } from "@/lib/features";
import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui";
import { getT } from "@/lib/i18n";

/** Shown in place of a page the admin has switched off. */
export async function FeatureOff({ f, home }: { f?: string; home: string }) {
  const T = await getT();
  const user = await getCurrentUser();
  const feature = ALL_FEATURES.find((x) => x.key === f);
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-sand-100 text-muted"><PowerOff className="size-8" /></span>
      <h1 className="mt-5 text-2xl font-extrabold">{T("This page isn't available")}</h1>
      <p className="mt-2 text-muted">{T("It has been switched off for now. Please contact the MHPU office if you need help.")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href={home} variant="outline">{T("Go back")}</ButtonLink>
        {user?.role === "ADMIN" && <ButtonLink href="/admin/features">Admin: switch {feature ? `“${feature.label}”` : "it"} back on</ButtonLink>}
      </div>
    </div>
  );
}
