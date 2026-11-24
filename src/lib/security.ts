import "server-only";
import { headers } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";

// ─── Client identity ────────────────────────────────────────────────

/** Visitor IP. On Vercel, x-forwarded-for is set by the platform (first entry = client). */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

// ─── Rate limiting (fixed window, stored in Postgres) ───────────────

/** Count one hit for `key`. Returns ok=false once more than `limit` hits occur within the window. */
export async function hit(key: string, limit: number, windowSec: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);
  const row = await db.$transaction(async (tx) => {
    const cur = await tx.rateLimit.findUnique({ where: { key } });
    if (!cur || cur.resetAt <= now) return tx.rateLimit.upsert({ where: { key }, update: { count: 1, resetAt }, create: { key, count: 1, resetAt } });
    return tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  });
  return { ok: row.count <= limit, retryAfterMin: Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 60000)) };
}

/** Is `key` currently over `limit`, without counting a new hit? */
export async function isLimited(key: string, limit: number) {
  const cur = await db.rateLimit.findUnique({ where: { key } });
  if (!cur || cur.resetAt <= new Date()) return { limited: false, retryAfterMin: 0 };
  return { limited: cur.count >= limit, retryAfterMin: Math.max(1, Math.ceil((cur.resetAt.getTime() - Date.now()) / 60000)) };
}

export async function clearLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}

export async function purgeExpiredLimits() {
  return (await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } })).count;
}

/** Throttle a public form by IP. Returns an error message when over the limit. */
export async function formLimit(form: string, limit: number, windowSec = 3600) {
  const r = await hit(`form:${form}:${await clientIp()}`, limit, windowSec);
  return r.ok ? null : `Too many submissions from your connection. Please try again in ${r.retryAfterMin} minutes.`;
}

// ─── Redirects ──────────────────────────────────────────────────────

/** Only same-site paths: "/x" — never "//host", "/\\host", schemes or control characters. */
export function safePath(p: string | null | undefined, fallback = "/"): string {
  if (!p || typeof p !== "string") return fallback;
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("\\") || /[\u0000-\u001f\u007f]/.test(p)) return fallback;
  return p;
}

/** The site's public address, for links in SMS and payment return URLs (never taken from request headers in production). */
export async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://mhpu.org";
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

// ─── Keys derived from SESSION_SECRET ───────────────────────────────

const derive = (purpose: string) => createHash("sha256").update(`${purpose}:${process.env.SESSION_SECRET ?? ""}`).digest();

/** Encrypt election choices so pending ballots are unreadable to anyone with only database access. */
export function seal(data: unknown) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", derive("ballot-seal-v1"), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}
export function unseal<T>(sealed: string): T {
  const b = Buffer.from(sealed, "base64");
  const d = createDecipheriv("aes-256-gcm", derive("ballot-seal-v1"), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8")) as T;
}

/** Short code printed in a membership card's QR so only the card holder's link shows their name. */
export function verifyCode(membershipNo: string) {
  return createHmac("sha256", derive("verify-v1")).update(membershipNo.toUpperCase()).digest("base64url").slice(0, 16);
}
export function checkVerifyCode(membershipNo: string, code: string | undefined) {
  if (!code) return false;
  const a = Buffer.from(verifyCode(membershipNo)), b = Buffer.from(code);
  return a.length === b.length && timingSafeEqual(a, b);
}
