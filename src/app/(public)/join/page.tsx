import { ShieldCheck, Megaphone, IdCard, GraduationCap } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { JoinForm } from "@/components/public/join-form";
import { PageHero } from "@/components/public/cards";
import { IMG } from "@/lib/images";

export const metadata = { title: "Join MHPU" };

export default async function JoinPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero kicker="Join" title="Membership application" desc="Anyone who works as a health professional in the Maldives — Maldivian or expatriate — is eligible to join. It takes about five minutes." image={IMG.nursesGroup} />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 lg:grid-cols-[1fr_320px]">
        <JoinForm dues={Number(s.monthlyDues) || 100} registration={Number(s.registrationFee) || 100} />
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {[
            { icon: ShieldCheck, t: "Protection at work", d: "Advice and representation from day one." },
            { icon: Megaphone, t: "A stronger voice", d: "Collective bargaining on pay, overtime and staffing." },
            { icon: IdCard, t: "Digital membership card", d: "On your phone, verifiable with a QR code." },
            { icon: GraduationCap, t: "CPD & training", d: "Free and discounted sessions across the atolls." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-3 rounded-2xl border border-line p-4">
              <Icon className="size-6 shrink-0 text-coral-500" />
              <div><div className="font-bold">{t}</div><div className="text-sm text-muted">{d}</div></div>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
