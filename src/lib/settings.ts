import { db } from "./db";

export const DEFAULT_SETTINGS = {
  siteName: "Maldives Health Professionals Union",
  shortName: "MHPU",
  nameDv: "މޯލްޑިވްސް ހެލްތް ޕްރޮފެޝަނަލްސް ޔޫނިއަން",
  registrationNo: "CR/113/2019",
  tagline: "United for safe care and fair work",
  hotline: "+960 992 1992",
  whatsapp: "+960 994 9439",
  email: "info@mhpu.org",
  address: "Flat 83/01/06, Rabarugas Magu, Hulhumalé, Republic of Maldives",
  facebook: "",
  instagram: "",
  x: "",
  alertEnabled: "false",
  alertText: "",
  alertLink: "",
  bankDetails: "",
  monthlyDues: "100",
  registrationFee: "100",
};

export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) (s as Record<string, string>)[r.key] = r.value;
  return s;
}
