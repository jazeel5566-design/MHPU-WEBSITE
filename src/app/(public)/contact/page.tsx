import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/public/forms";
import { PageHero } from "@/components/public/cards";
import { Card } from "@/components/ui";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const T = await getT();
  const s = await getSettings();
  const reps = await db.member.findMany({ where: { isRep: true, status: "ACTIVE" }, select: { fullName: true, employer: true, atoll: true, profession: true }, orderBy: { atoll: "asc" } });
  const tel = s.hotline.replace(/[^\d+]/g, "");
  return (
    <>
      <PageHero kicker={T("Contact")} title={T("Talk to us")} desc={T("Members with a workplace problem: the fastest route is opening a case in the member portal.")} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1fr_360px]">
        <Card className="p-6 sm:p-8"><ContactForm /></Card>
        <div className="space-y-3">
          <a href={`tel:${tel}`} className="flex gap-3 rounded-2xl border border-line p-4 hover:border-brand-300"><Phone className="size-5 text-brand-600" /><div><div className="font-bold">{T("Help line")}</div><div className="text-sm text-muted" dir="ltr">{s.hotline}</div></div></a>
          <a href={`https://wa.me/${tel.replace("+", "")}`} className="flex gap-3 rounded-2xl border border-line p-4 hover:border-brand-300"><MessageCircle className="size-5 text-brand-600" /><div><div className="font-bold">{T("WhatsApp / Viber")}</div><div className="text-sm text-muted" dir="ltr">{s.whatsapp}</div></div></a>
          <a href={`mailto:${s.email}`} className="flex gap-3 rounded-2xl border border-line p-4 hover:border-brand-300"><Mail className="size-5 text-brand-600" /><div><div className="font-bold">{T("Email")}</div><div className="text-sm text-muted">{s.email}</div></div></a>
          <div className="flex gap-3 rounded-2xl border border-line p-4"><MapPin className="size-5 text-brand-600" /><div><div className="font-bold">{T("Office")}</div><div className="text-sm text-muted">{s.address}</div></div></div>
        </div>
      </div>
      {reps.length > 0 && (
      <section id="reps" className="mx-auto max-w-7xl scroll-mt-24 px-4">
        <h2 className="text-2xl font-extrabold">{T("Find your workplace rep")}</h2>
        <p className="mt-1 text-muted">{T("Reps are colleagues trained to support you at your facility.")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reps.map((r) => (
            <div key={r.fullName} className="rounded-2xl border border-line p-4">
              <div className="font-bold">{r.fullName}</div>
              <div className="text-sm text-muted">{T(r.profession ?? "")} · {r.employer}</div>
              <div className="mt-1 text-xs font-semibold text-brand-700">{T(r.atoll ?? "")}</div>
            </div>
          ))}
        </div>
      </section>
      )}
    </>
  );
}
