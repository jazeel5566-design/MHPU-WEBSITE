import { setLanguage } from "@/app/actions/auth";
import type { Lang } from "@/lib/i18n";

export function LangSwitch({ lang, back = "" }: { lang: Lang; back?: string }) {
  return (
    <form action={setLanguage} className="flex items-center rounded-md bg-white/10 p-0.5 text-xs">
      <input type="hidden" name="back" value={back} />
      <button name="lang" value="en" aria-pressed={lang === "en"} className={`rounded px-2 py-0.5 font-semibold ${lang === "en" ? "bg-white text-brand-900" : "text-brand-100 hover:text-white"}`}>EN</button>
      <button name="lang" value="dv" aria-pressed={lang === "dv"} className={`rounded px-2 py-0.5 font-thaana ${lang === "dv" ? "bg-white text-brand-900" : "text-brand-100 hover:text-white"}`}>ދިވެހި</button>
    </form>
  );
}
