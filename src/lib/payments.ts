import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";

/*
 * Online dues payments.
 *  - TEST: a simulated checkout page inside the site (only usable by admins on the live site).
 *  - BML: Bank of Maldives "BML Connect" (based on BML's own SDK, github.com/bankofmaldives/bml-connect-php):
 *      POST {base}/transactions  Authorization: <API key>
 *      body { amount (laari), currency: "MVR", redirectUrl, localId, signMethod: "sha1",
 *             signature: sha1("amount=<amount>&currency=MVR&apiKey=<key>"), apiVersion: "2.0", appVersion }
 *      → { id, url, ... }; the member is sent to `url` to pay.
 *    A payment is ONLY recorded after we fetch GET {base}/transactions/{id} ourselves and BML
 *    reports it as paid with the expected amount — never on the strength of the redirect alone.
 *    Env: BML_API_KEY, BML_MODE ("sandbox" | "production").
 *    ⚠ Verify against BML's current API docs with your merchant UAT keys before switching on.
 */

const BML_BASE = () =>
  process.env.BML_MODE === "production" ? "https://api.merchants.bankofmaldives.com.mv/public" : "https://api.uat.merchants.bankofmaldives.com.mv/public";

const PAID_STATES = ["CONFIRMED", "PAID", "SUCCESS", "AUTHORIZED", "CAPTURED"];
const FAILED_STATES = ["CANCELLED", "CANCELED", "FAILED", "DECLINED", "EXPIRED", "REJECTED"];

export type CreateResult = { ok: true; redirectUrl: string } | { ok: false; error: string };

export async function startCheckout(intent: { id: string; amount: number; provider: string }, baseUrl: string): Promise<CreateResult> {
  if (intent.provider === "TEST") return { ok: true, redirectUrl: `/members/dues/test-checkout/${intent.id}` };
  const key = process.env.BML_API_KEY;
  if (!key) return { ok: false, error: "Online payments are not configured yet (BML_API_KEY missing)." };
  const amount = Math.round(intent.amount * 100); // laari
  const body = {
    amount, currency: "MVR",
    redirectUrl: `${baseUrl}/api/payments/return?intent=${intent.id}`,
    localId: intent.id,
    apiVersion: "2.0", appVersion: "mhpu-website", signMethod: "sha1",
    signature: createHash("sha1").update(`amount=${amount}&currency=MVR&apiKey=${key}`).digest("hex"),
  };
  try {
    const res = await fetch(`${BML_BASE()}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: key },
      body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; url?: string; shortUrl?: string; message?: string };
    if (!res.ok || !data.id || !(data.url || data.shortUrl)) return { ok: false, error: `BML could not start the payment${data.message ? `: ${data.message}` : ` (HTTP ${res.status})`}.` };
    await db.paymentIntent.update({ where: { id: intent.id }, data: { providerRef: data.id } });
    return { ok: true, redirectUrl: (data.url || data.shortUrl)! };
  } catch (e) {
    return { ok: false, error: `Could not reach BML: ${(e as Error).message}` };
  }
}

/** Ask the gateway for the real status. Returns PAID / FAILED / PENDING. */
export async function checkWithProvider(intent: { provider: string; providerRef: string | null; amount: number }): Promise<"PAID" | "FAILED" | "PENDING"> {
  if (intent.provider !== "BML" || !intent.providerRef) return "PENDING";
  const key = process.env.BML_API_KEY;
  if (!key) return "PENDING";
  try {
    const res = await fetch(`${BML_BASE()}/transactions/${encodeURIComponent(intent.providerRef)}`, {
      headers: { Accept: "application/json", Authorization: key }, signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return "PENDING";
    const t = (await res.json()) as { state?: string; status?: string; amount?: number; currency?: string };
    const state = String(t.state ?? t.status ?? "").toUpperCase();
    if (PAID_STATES.includes(state)) {
      if (typeof t.amount === "number" && t.amount !== Math.round(intent.amount * 100)) return "FAILED"; // amount mismatch
      if (t.currency && t.currency !== "MVR") return "FAILED";
      return "PAID";
    }
    if (FAILED_STATES.includes(state)) return "FAILED";
    return "PENDING";
  } catch {
    return "PENDING";
  }
}

/** Record a confirmed payment exactly once: Payment row + extend dues. */
export async function markIntentPaid(intentId: string, method: string) {
  return db.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.findUnique({ where: { id: intentId }, include: { member: true } });
    if (!intent || intent.status === "PAID") return intent;
    const base = intent.member.duesPaidUntil && intent.member.duesPaidUntil > new Date() ? new Date(intent.member.duesPaidUntil) : new Date();
    base.setMonth(base.getMonth() + intent.months);
    const payment = await tx.payment.create({
      data: { memberId: intent.memberId, amount: intent.amount, period: `${intent.months} month${intent.months > 1 ? "s" : ""} (online)`, method, reference: intent.providerRef ?? intent.id },
    });
    await tx.member.update({ where: { id: intent.memberId }, data: { duesPaidUntil: base, status: intent.member.status === "LAPSED" ? "ACTIVE" : intent.member.status } });
    return tx.paymentIntent.update({ where: { id: intent.id }, data: { status: "PAID", paidAt: new Date(), paymentId: payment.id } });
  });
}

// ─── Auto-pay (saved cards) ─────────────────────────────────────────
// Charging a saved card needs the gateway's recurring/tokenisation feature. BML's public
// SDK doesn't document one, so for BML auto-pay falls back to texting a one-tap pay link.
// Set BML_RECURRING=enabled only once BML has confirmed and the charge call is implemented.

export function supportsSavedCards(provider: string) {
  return provider === "TEST";
}

export async function chargeSavedCard(intent: { id: string; provider: string }, token: string): Promise<"PAID" | "FAILED"> {
  if (intent.provider === "TEST") return token.startsWith("test_tok_") ? "PAID" : "FAILED";
  return "FAILED";
}
