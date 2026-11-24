import { cookies } from "next/headers";
import { getSettings } from "./settings";

export type Lang = "en" | "dv";

// NOTE: Dhivehi strings are a first draft and should be reviewed by a native
// speaker on the MHPU communications team before launch.
const dict = {
  home: { en: "Home", dv: "ފުރަތަމަ ޞަފްޙާ" },
  about: { en: "About", dv: "ތަޢާރަފް" },
  news: { en: "News", dv: "ޚަބަރު" },
  campaigns: { en: "Campaigns", dv: "ކެމްޕެއިންތައް" },
  events: { en: "Events", dv: "ހަރަކާތްތައް" },
  resources: { en: "Resources", dv: "ވަސީލަތްތައް" },
  getHelp: { en: "Get help", dv: "އެހީ ހޯދާ" },
  join: { en: "Join MHPU", dv: "މެމްބަރުވޭ" },
  login: { en: "Member login", dv: "ލޮގިން" },
  contact: { en: "Contact", dv: "ގުޅުއްވާ" },
  hotline: { en: "Help line", dv: "އެހީތެރިކަމުގެ ނަންބަރު" },
  heroKicker: { en: "Trade union federation for health workers", dv: "ސިއްޙީ ދާއިރާގެ މުވައްޒަފުންގެ ޔޫނިއަން" },
  heroTitle: { en: "Safe staffing. Fair pay. A voice at every island.", dv: "ރައްކާތެރި މާހައުލެއް. އިންސާފުވެރި މުސާރައެއް. ކޮންމެ ރަށެއްގައި އަޑެއް." },
  heroBody: {
    en: "MHPU brings nurses, doctors, allied-health and support staff together to win better working conditions across the Maldives' health system.",
    dv: "ދިވެހިރާއްޖޭގެ ސިއްޙީ ނިޒާމުގައި މަސައްކަތްކުރާ ނަރުހުން، ޑޮކްޓަރުން އަދި އެހެނިހެން މުވައްޒަފުން އެއްކޮށް، މަސައްކަތުގެ މާހައުލު ރަނގަޅުކުރުމަށް މަސައްކަތްކުރަމުއެވެ.",
  },
  howHelp: { en: "How can we help you today?", dv: "މިއަދު އަޅުގަނޑުމެން އެހީތެރިވެދެވޭނީ ކިހިނެއް؟" },
  latestNews: { en: "Latest news", dv: "އެންމެ ފަހުގެ ޚަބަރު" },
  viewAll: { en: "View all", dv: "ހުރިހާ ދެއްކުން" },
  upcoming: { en: "Upcoming events", dv: "ކުރިއަށް އޮތް ހަރަކާތްތައް" },
  activeCampaigns: { en: "Campaigns we're fighting", dv: "ކުރިއަށް ގެންދާ ކެމްޕެއިންތައް" },
  signPetition: { en: "Sign the petition", dv: "ޕެޓިޝަނުގައި ސޮއިކުރައްވާ" },
  joinCtaTitle: { en: "Stronger together. Join MHPU today.", dv: "އެކުގައި ވަރުގަދަ. މިއަދުވެސް MHPU އަށް މެމްބަރުވެލައްވާ." },
  newsletter: { en: "Get union updates", dv: "ޔޫނިއަންގެ ޚަބަރު ލިބިވަޑައިގަތުމަށް" },
  subscribe: { en: "Subscribe", dv: "ސަބްސްކްރައިބް" },
  readMore: { en: "Read more", dv: "އިތުރަށް ކިޔުއްވާ" },
  footerAbout: {
    en: "The Maldives Health Professionals Union is the national trade union federation for workers across public and private healthcare.",
    dv: "މޯލްޑިވްސް ހެލްތް ޕްރޮފެޝަނަލްސް ޔޫނިއަނަކީ ދިވެހިރާއްޖޭގެ ސަރުކާރާއި ޕްރައިވެޓް ސިއްޙީ ދާއިރާގެ މުވައްޒަފުންގެ ޤައުމީ ޔޫނިއަނެވެ.",
  },
} as const;

export type DictKey = keyof typeof dict;

export async function getLang(): Promise<Lang> {
  if (!(await isDhivehiEnabled())) return "en";
  const v = (await cookies()).get("lang")?.value;
  return v === "dv" ? "dv" : "en";
}

/** Admins can switch the Dhivehi version off in Site settings. */
export async function isDhivehiEnabled() {
  return (await getSettings()).dhivehiEnabled !== "false";
}

export function t(lang: Lang, key: DictKey) {
  return dict[key][lang];
}

/** Pick the Dhivehi version of a content field when available. */
export function pick(lang: Lang, en: string, dv?: string | null) {
  return lang === "dv" && dv ? dv : en;
}
