import { cache } from "react";
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
  dhivehiEnabled: "true",
  // Online payments (keys live in env vars BML_API_KEY / BML_MODE)
  paymentsEnabled: "false",
  paymentProvider: "TEST", // TEST | BML
  // SMS (credentials live in env vars DHIRAAGU_SMS_USERNAME / DHIRAAGU_SMS_PASSWORD)
  smsEnabled: "false",
  smsProvider: "TEST", // TEST | DHIRAAGU
  // Automatic dues reminders (run daily)
  remindersEnabled: "false",
  reminderDaysBefore: "3",
  reminderRepeatDays: "14",
  reminderMaxOverdue: "3",
  reminderUpcomingText: "MHPU: Dear {name}, your union dues ({membershipNo}) are due on {dueDate}. Pay online at {payLink} or contact us on {hotline}.",
  reminderOverdueText: "MHPU: Dear {name}, your union dues ({membershipNo}) are overdue since {dueDate}. Please pay at {payLink} to stay in good standing. Help: {hotline}.",
  alertEnabled: "false",
  alertText: "",
  alertTextDv: "",
  alertLink: "",
  bankDetails: "",
  monthlyDues: "100",
  // Dues collection: started by an admin (Finance → Dues collection) from a chosen date.
  duesCollectionOn: "false",
  duesStartDate: "",
  registrationFee: "100",
};

export type Settings = typeof DEFAULT_SETTINGS;

/** Cached per request, so layouts and pages share one DB read. */
export const getSettings = cache(async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) (s as Record<string, string>)[r.key] = r.value;
  return s;
});
