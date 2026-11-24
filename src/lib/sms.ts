import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { normaliseMvMobile } from "./phone";

/*
 * SMS sending with two drivers:
 *  - TEST: nothing is sent; messages are logged with status TEST (safe for trying things out).
 *  - DHIRAAGU: Dhiraagu Bulk SMS XML gateway (as used by the community SDKs
 *    dash8x/dhiraagu-sms and ronguagency/sms). Credentials from env:
 *      DHIRAAGU_SMS_USERNAME (usually your approved sender name)
 *      DHIRAAGU_SMS_PASSWORD
 *      DHIRAAGU_SMS_URL (optional, default https://bulksms.dhiraagu.com.mv/partners/xmlMessage.jsp)
 *    Confirm the endpoint with Dhiraagu Business when your Bulk SMS account is opened.
 */

export type SmsKind = "MANUAL" | "DUES_UPCOMING" | "DUES_OVERDUE" | "MEETING" | "PAYMENT_RECEIPT";
export type SmsResult = { ok: boolean; status: "SENT" | "FAILED" | "TEST"; providerRef?: string; error?: string };

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

async function sendDhiraagu(to: string, body: string): Promise<SmsResult> {
  const user = process.env.DHIRAAGU_SMS_USERNAME, pass = process.env.DHIRAAGU_SMS_PASSWORD;
  if (!user || !pass) return { ok: false, status: "FAILED", error: "Dhiraagu SMS credentials are not configured (DHIRAAGU_SMS_USERNAME / DHIRAAGU_SMS_PASSWORD)." };
  const url = process.env.DHIRAAGU_SMS_URL || "https://bulksms.dhiraagu.com.mv/partners/xmlMessage.jsp";
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<TELEMESSAGE><TELEMESSAGE_CONTENT><MESSAGE>
<MESSAGE_INFORMATION><SUBJECT></SUBJECT></MESSAGE_INFORMATION>
<USER_FROM><CIML><NAML><LOGIN_DETAILS><USER_NAME>${xmlEscape(user)}</USER_NAME><PASSWORD>${xmlEscape(pass)}</PASSWORD></LOGIN_DETAILS></NAML></CIML></USER_FROM>
<MESSAGE_CONTENT><TEXT_MESSAGE><MESSAGE_INDEX>0</MESSAGE_INDEX><TEXT>${xmlEscape(body)}</TEXT></TEXT_MESSAGE></MESSAGE_CONTENT>
<USER_TO><CIML><DEVICE_INFORMATION><DEVICE_TYPE DEVICE_TYPE="SMS"/><DEVICE_VALUE>${to}</DEVICE_VALUE></DEVICE_INFORMATION></CIML></USER_TO>
</MESSAGE></TELEMESSAGE_CONTENT><VERSION>1.6</VERSION></TELEMESSAGE>`;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/xml" }, body: xml, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    const status = /<RESPONSE_STATUS>\s*(\d+)\s*<\/RESPONSE_STATUS>/.exec(text)?.[1];
    const desc = /<RESPONSE_STATUS_DESC>([^<]*)<\/RESPONSE_STATUS_DESC>/.exec(text)?.[1];
    const id = /<MESSAGE_ID>\s*([^<\s]+)\s*<\/MESSAGE_ID>/.exec(text)?.[1];
    if (res.ok && (status === "100" || status === "0")) return { ok: true, status: "SENT", providerRef: id };
    return { ok: false, status: "FAILED", error: `Dhiraagu error ${status ?? res.status}${desc ? `: ${desc}` : ""}` };
  } catch (e) {
    return { ok: false, status: "FAILED", error: `Could not reach Dhiraagu SMS: ${(e as Error).message}` };
  }
}

/** Send one SMS and log it. `to` may be any phone format; non-Maldivian numbers are rejected. */
export async function sendSms(opts: { to: string; body: string; kind?: SmsKind; memberId?: string | null; sentById?: string | null; batchId?: string }) {
  const s = await getSettings();
  const provider = s.smsProvider === "DHIRAAGU" ? "DHIRAAGU" : "TEST";
  const to = normaliseMvMobile(opts.to);
  let result: SmsResult;
  if (s.smsEnabled !== "true") result = { ok: false, status: "FAILED", error: "SMS is switched off in Site settings." };
  else if (!to) result = { ok: false, status: "FAILED", error: "Not a valid Maldivian mobile number." };
  else if (provider === "TEST") result = { ok: true, status: "TEST" };
  else result = await sendDhiraagu(to, opts.body);
  await db.smsMessage.create({
    data: { to: to ?? opts.to, body: opts.body, kind: opts.kind ?? "MANUAL", status: result.status, provider, providerRef: result.providerRef, error: result.error, memberId: opts.memberId ?? null, sentById: opts.sentById ?? null, batchId: opts.batchId },
  });
  return result;
}

/** Fill {placeholders} in a template. Unknown placeholders are left as-is. */
export function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** Send to many recipients with limited concurrency. */
export async function sendBulk(items: { to: string; body: string; memberId?: string | null }[], opts: { kind?: SmsKind; sentById?: string | null; batchId: string }) {
  let sent = 0, failed = 0, test = 0;
  const queue = [...items];
  const worker = async () => {
    for (let it = queue.shift(); it; it = queue.shift()) {
      const r = await sendSms({ ...it, kind: opts.kind, sentById: opts.sentById, batchId: opts.batchId });
      if (r.status === "SENT") sent++; else if (r.status === "TEST") test++; else failed++;
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return { sent, failed, test };
}
