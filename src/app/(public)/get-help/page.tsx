import { Banknote, Clock, ShieldAlert, Scale, Globe2, Phone, MessageSquarePlus, CheckCircle2 } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { PageHero } from "@/components/public/cards";
import { ButtonLink, Card } from "@/components/ui";
import { getSitePhotos } from "@/lib/site-photos";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Get help at work" };

const TOPICS = [
  { id: "pay", icon: Banknote, title: "Pay & overtime", intro: "Overtime not paid, paid late, or capped below the hours you actually worked?",
    steps: ["Keep your own record of every shift and extra hour (date, start/end, ward).", "Ask HR in writing for a breakdown of how your overtime was calculated.", "Open a case with MHPU and attach your roster and payslips — we raise it collectively where many staff are affected."] },
  { id: "hours", icon: Clock, title: "Rosters & working hours", intro: "Back-to-back shifts, no rest days, or hours that don't follow official working-hour changes (e.g. during Ramadan)?",
    steps: ["Photograph the published roster.", "Note any shift where you didn't get your rest break or minimum rest between shifts.", "Talk to your workplace rep or open a case — patterns across a facility carry more weight."] },
  { id: "safety", icon: ShieldAlert, title: "Unsafe staffing, violence & safety", intro: "Not enough staff to care safely, or facing aggression from patients or visitors?",
    steps: ["If anyone is in immediate danger, call 119 (police) or 102 (ambulance).", "Report the incident through your facility's incident system and keep a copy.", "Tell MHPU — we track staffing shortfalls and incidents to push for national standards."] },
  { id: "discipline", icon: Scale, title: "Disciplinary or grievance", intro: "Called to a disciplinary meeting or want to raise a formal complaint?",
    steps: ["Don't sign anything you don't understand. Ask for the allegations in writing.", "You can ask to be accompanied by a union representative.", "Contact us as early as possible — ideally before the first meeting."] },
  { id: "expat", icon: Globe2, title: "Expatriate health workers", intro: "Problems with your work permit, job classification, dependent visas, contract renewal or passport retention?",
    steps: ["Keep copies of your contract, work permit and job offer.", "Your employer should not hold your passport against your will.", "MHPU represents expatriate members equally — open a case in English and we'll respond."] },
];

export default async function GetHelpPage() {
  const T = await getT();
  const photos = await getSitePhotos();
  const s = await getSettings();
  const tel = s.hotline.replace(/[^\d+]/g, "");
  return (
    <>
      <PageHero kicker={T("Get help")} title={T("Problem at work? We've got your back.")} desc={T("Practical first steps for the most common issues — and how to get MHPU's support.")} image={photos.getHelp}>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/members/help/new" variant="coral" size="lg"><MessageSquarePlus className="size-5" /> {T("Members: open a case")}</ButtonLink>
          <a href={`tel:${tel}`} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-brand-900 hover:bg-brand-50"><Phone className="size-5" /> {T("Call")} <span dir="ltr">{s.hotline}</span></a>
        </div>
      </PageHero>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[240px_1fr]">
        <nav className="hidden lg:block" aria-label={T("Topics")}>
          <ul className="sticky top-24 space-y-1">
            {TOPICS.map((t) => <li key={t.id}><a href={`#${t.id}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-sand-50 hover:text-ink"><t.icon className="size-4" />{T(t.title)}</a></li>)}
          </ul>
        </nav>
        <div className="space-y-6">
          {TOPICS.map((t) => (
            <Card key={t.id} id={t.id} className="scroll-mt-24 p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><t.icon className="size-5" /></span>
                <h2 className="text-xl font-bold">{T(t.title)}</h2>
              </div>
              <p className="mt-3 text-muted">{T(t.intro)}</p>
              <ol className="mt-5 space-y-3">
                {t.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-coral-500 text-xs font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5">{T(step)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
          <Card className="bg-brand-50 p-7">
            <h2 className="text-xl font-bold">{T("Not a member yet?")}</h2>
            <p className="mt-2 text-muted">{T("Join today for full representation. Problems that began before you joined may not be covered, so it pays to join early.")}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {["Confidential advice from trained organisers", "Representation at hearings and meetings", "Collective action when many colleagues are affected"].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="size-5 text-brand-600" />{T(x)}</li>)}
            </ul>
            <ButtonLink href="/join" variant="coral" className="mt-5">{T("Join MHPU")}</ButtonLink>
          </Card>
        </div>
      </div>
    </>
  );
}
