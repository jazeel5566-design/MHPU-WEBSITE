/*
 * One-time production setup. Run AFTER `prisma db push` against the production DB:
 *   ADMIN_EMAIL=you@example.com ADMIN_NAME="Full Name" npm run bootstrap:prod
 * - creates the Supabase Storage buckets (media public; resources + applications private)
 * - creates ONE administrator with a random password (printed once)
 * It refuses to run if any user already exists, so it can't overwrite a live site.
 * No demo content is created.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const db = new PrismaClient();

async function buckets() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.log("• Supabase not configured — skipping buckets"); return; }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb.storage.listBuckets();
  const have = new Set((data ?? []).map((b) => b.name));
  for (const [name, isPublic] of [["media", true], ["resources", false], ["applications", false]] as const) {
    if (have.has(name)) { console.log(`• bucket ${name} exists`); continue; }
    const { error } = await sb.storage.createBucket(name, { public: isPublic, fileSizeLimit: 4 * 1024 * 1024 });
    if (error) throw new Error(`bucket ${name}: ${error.message}`);
    console.log(`• created bucket ${name} (${isPublic ? "public" : "private"})`);
  }
}

async function main() {
  await buckets();
  const users = await db.user.count();
  if (users > 0) { console.log(`• ${users} user(s) already exist — not creating an admin.`); return; }
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "MHPU Administrator").trim();
  if (!email.includes("@")) throw new Error("Set ADMIN_EMAIL");
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const password = Array.from(randomBytes(16), (b) => chars[b % chars.length]).join("");
  await db.user.create({ data: { email, name, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) } });
  await db.auditLog.create({ data: { action: "bootstrap", entity: "System", detail: `admin ${email} created` } });
  console.log(`\n✔ Administrator created\n   email:    ${email}\n   password: ${password}\n   → sign in at /login, then change it under Admin → My account.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
