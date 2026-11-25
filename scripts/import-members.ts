/*
 * Import MHPU's existing member register (tab-separated, as copied from the Excel sheet).
 *
 *   npx tsx scripts/import-members.ts .secrets/members-register.tsv           # dry run: report only
 *   npx tsx scripts/import-members.ts .secrets/members-register.tsv --write   # create the members
 *
 * Columns: #, Reg.No:, Name, Membership month, ID Card, Present Address, Email, Phone no, Work Place, Position
 *
 * - Renumbers MHPU-19-001 → MHPU-0001 (keeps the running number). Rows whose number already
 *   exists in the database are skipped, never overwritten, so the script is safe to re-run.
 * - Every imported member is created as INACTIVE (newly approved applicants are ACTIVE straight away): they can sign in and see their card and status, and
 *   become ACTIVE when they pay dues (collected from the dues start date in Settings) or an admin activates them.
 * - Creates a portal login for every member. Members sign in with their membership number
 *   (or email). Members with no usable email get a placeholder login email
 *   (mhpu-0001@no-email.invalid) that staff replace when they correct the record.
 *   Temporary passwords are written to <register>-logins.tsv: hand them out securely, then delete the file.
 * - Cleans what it safely can (ID format, phone format, name capitalisation, obvious email typos).
 *   Rows with missing or possibly duplicated details are flagged "Needs review" for staff to correct.
 * - Does not place anyone in a workplace union: staff add members to unions by hand.
 * - Keep the register and logins files out of git: they are personal data (.secrets/ is gitignored).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error("Usage: tsx scripts/import-members.ts <register.tsv> [--write]"); process.exit(1); }
const WRITE = flags.includes("--write");
const TODAY = new Date().toISOString().slice(0, 10);

// ─── Cleaning helpers ───────────────────────────────────────────────

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const mon = (s: string) => MONTHS.indexOf(s.slice(0, 3).toLowerCase());
const yr = (s: string) => (s.length === 2 ? 2000 + Number(s) : Number(s));
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

/** "1-Sep-19", "Sep-21", "Dec 30, 2021" → Date; anything else → null */
function parseDate(raw: string): Date | null {
  const s = raw.trim();
  let m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/.exec(s);
  if (m && mon(m[2]) >= 0) return utc(yr(m[3]), mon(m[2]), Number(m[1]));
  m = /^([A-Za-z]{3})-(\d{2,4})$/.exec(s);
  if (m && mon(m[1]) >= 0) return utc(yr(m[2]), mon(m[1]), 1);
  m = /^([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})$/.exec(s);
  if (m && mon(m[1]) >= 0) return utc(Number(m[3]), mon(m[1]), Number(m[2]));
  return null;
}

/** First Maldivian mobile in the cell, as "+960 7xxxxxx". */
function parsePhone(raw: string): { phone: string | null; extra: string[] } {
  const nums = raw.replace(/-/g, "").split(/\D+/).map((d) => {
    if (/^(960|930|390)\d{7}$/.test(d)) d = d.slice(3); // country code, incl. the 930/390 typos seen in the sheet
    return /^[79]\d{6}$/.test(d) ? d : null;
  });
  const ok = [...new Set(nums.filter((n): n is string => !!n))];
  return { phone: ok[0] ? `+960 ${ok[0]}` : null, extra: ok.slice(1).map((n) => `+960 ${n}`) };
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const EMAIL_FIXES: [RegExp, string][] = [[/@gmail\.om$/, "@gmail.com"], [/@gmail\.comm$/, "@gmail.com"]];

/** Title-case words typed all in lower or upper case; leave mixed-case words alone ("AbdulRahman"). */
const fixName = (s: string) =>
  s.trim().replace(/\s+/g, " ").split(" ").map((w) => (w === w.toLowerCase() || (w === w.toUpperCase() && w.length > 2) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");

const fixId = (s: string) => s.toUpperCase().replace(/[\s-]/g, "");

/** Workplace → atoll. Island-specific names are checked before the Malé catch-all. */
const ATOLL_RULES: [RegExp, string][] = [
  [/laamu|gamu/, "Laamu"],
  [/raa |ungoofaaru|kinolhas/, "Raa"],
  [/dhaalu|dh\.\s?meedhoo|bandidhoo/, "Dhaalu"],
  [/fuvahmulah/, "Gnaviyani"],
  [/noonu|velidhoo|maafaru|landhoo|lhohi/, "Noonu"],
  [/thaa |thimarafushi/, "Thaa"],
  [/\bkrh\b|kulhudhuffushi|neykurendhoo/, "Haa Dhaalu"],
  [/\bhaah\b|haa alif|ha atoll|ihavandhoo|amina dhiyo|aaminaadhiyo/, "Haa Alifu"],
  [/shaviyani/, "Shaviyani"],
  [/kamadhoo/, "Baa"],
  [/hinnavaru/, "Lhaviyani"],
  [/faafu/, "Faafu"],
  [/meemu/, "Meemu"],
  [/maamigili|adh\b/, "Alifu Dhaalu"],
  [/himandhoo/, "Alifu Alifu"],
  [/\bga\.|gemanafushi/, "Gaafu Alifu"],
  [/thinadhoo|\basmh\b|abdul samad|madaveli/, "Gaafu Dhaalu"],
  [/\baeh\b|hulhumeedhoo|hithadhoo|feydhoo/, "Addu City"],
  [/kaashidhoo|maafushi|himmafushi|drug treatment/, "Kaafu"],
  [/\b(igmh|adk|hmh|mnu|tth|moh|she|mbs|vmh|nda)\b|indira gandhi|hulhumale|med ?lab|med tech|mediflex|ministry|eve clinic|food and drug|male|national drug|halfway/, "Malé City"],
];
const atollOf = (employer: string) => ATOLL_RULES.find(([re]) => re.test(` ${employer.toLowerCase()} `))?.[1] ?? null;

/** Job title → the site's profession categories (src/lib/constants.ts PROFESSIONS). */
const PROF_RULES: [RegExp, string][] = [
  [/nurs/, "Nurse"],
  [/p(a)?e?diatric|peadiatric/, "Specialist / Consultant"],
  [/physician|doctor/, "Medical Doctor"],
  [/dental/, "Dentist"],
  [/radiograph/, "Radiographer"],
  [/bio-?medical (engin|engeen|techni)/, "Other"],
  [/lab|scientific officer|scientist|biomedical technologist/, "Laboratory Technologist"],
  [/community health|family health/, "Community Health Worker"],
  [/public health/, "Public Health Officer"],
  [/counsel/, "Other"],
  [/attendant|housekeep|transport|ambulance|control+e? room|customer service|interpreter|nchm|ncmh/, "Support Staff"],
  [/admin|legal|director/, "Health Administrator"],
];
const professionOf = (role: string) => PROF_RULES.find(([re]) => re.test(role.toLowerCase()))?.[1] ?? "Other";

// ─── Parse ──────────────────────────────────────────────────────────

type Row = {
  line: number; membershipNo: string; fullName: string; idNumber: string; nationality: string; address: string | null;
  phone: string; email: string; profession: string; role: string | null; employer: string; atoll: string; joinedAt: Date;
  issues: string[]; extraNotes: string[];
};

const lines = readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());
const rows: Row[] = [];
let lastDate: Date | null = null;

for (const [i, line] of lines.entries()) {
  const c = line.split("\t").map((x) => x.trim());
  if (i === 0 && /reg\.?\s*no/i.test(line)) continue; // header
  const [, regNo, name, month, idCard, address, emailCell, phoneCell, workPlace, position] = c.concat(Array(10).fill(""));
  const issues: string[] = [], extraNotes: string[] = [];

  const reg = /^MHPU-\d{2}-(\d+)$/i.exec(regNo);
  const membershipNo = reg ? `MHPU-${reg[1].padStart(4, "0")}` : regNo.toUpperCase();
  if (!reg) issues.push(`unusual membership number "${regNo}"`);

  const fullName = fixName(name);

  const idNumber = fixId(idCard);
  let nationality = "Maldivian";
  if (!idNumber) issues.push("ID card number missing");
  else if (/^A\d{6}$/.test(idNumber)) { /* Maldivian national ID */ }
  else if (/^A\d+$/.test(idNumber)) issues.push(`ID card "${idCard}" has ${idNumber.length - 1} digits, expected 6`);
  else { nationality = "Not recorded"; issues.push(`ID "${idCard}" is not a Maldivian ID card (work permit/passport?) — nationality not recorded`); }

  const addr = address && fixId(address) !== idNumber ? address : null;
  if (address && !addr) issues.push("address column held the ID number");
  else if (!address) issues.push("address missing");

  const emails = (emailCell.match(EMAIL) ?? []).map((e) => e.toLowerCase());
  let email = emails[0] ?? "";
  for (const [re, to] of EMAIL_FIXES) if (re.test(email)) { issues.push(`email corrected from ${email}`); email = email.replace(re, to); }
  if (!email) issues.push(emailCell ? `email "${emailCell}" not usable` : "email missing");
  else if (/@\d/.test(email)) issues.push(`email ${email} looks mistyped`);
  if (emailCell && emailCell.split(/\s+/).length > 1) extraNotes.push(`Other email given: ${emailCell.split(/\s+/).slice(1).join(" ")}`);

  const { phone, extra } = parsePhone(phoneCell);
  if (!phone) issues.push(phoneCell ? `phone "${phoneCell}" is not a valid mobile number` : "phone missing");
  if (extra.length) extraNotes.push(`Other phone: ${extra.join(", ")}`);

  const employer = workPlace.replace(/\s+/g, " ");
  if (!employer) issues.push("workplace missing");
  const role = position && position.toLowerCase() !== employer.toLowerCase() ? position.replace(/\s+/g, " ") : null;
  if (!role) issues.push("position missing");
  const profession = role ? professionOf(role) : "Other";

  const atoll = atollOf(employer) ?? "Not specified";
  if (atoll === "Not specified") issues.push(`atoll not worked out from workplace "${employer}"`);

  let joinedAt = parseDate(month);
  if (joinedAt && joinedAt.getUTCFullYear() < 2019) { issues.push(`membership date "${month}" is before MHPU's register began (a date of birth?)`); joinedAt = null; }
  if (!joinedAt) {
    if (month && !issues.some((x) => x.includes(month))) issues.push(`membership date "${month}" unreadable`);
    else if (!month) issues.push("membership date missing");
    joinedAt = lastDate ?? utc(2019, 8, 1);
    issues.push(`joined date set to ${joinedAt.toISOString().slice(0, 10)} from the row above`);
  } else lastDate = joinedAt;

  rows.push({ line: i + 1, membershipNo, fullName, idNumber, nationality, address: addr, phone: phone ?? "", email, profession, role, employer: employer || "Not recorded", atoll, joinedAt, issues, extraNotes });
}

// Duplicates across rows
const dupes = (key: (r: Row) => string, label: string) => {
  const seen = new Map<string, Row>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    const first = seen.get(k);
    if (first) { r.issues.push(`same ${label} as ${first.membershipNo} (${first.fullName}) — possible duplicate`); first.issues.push(`same ${label} as ${r.membershipNo} (${r.fullName}) — possible duplicate`); }
    else seen.set(k, r);
  }
};
dupes((r) => r.membershipNo, "membership number");
dupes((r) => r.idNumber, "ID card");
dupes((r) => r.email, "email");
dupes((r) => r.phone, "phone");

// ─── Report & write ─────────────────────────────────────────────────

async function main() {
  const db = new PrismaClient();
  const existing = new Set((await db.member.findMany({ select: { membershipNo: true } })).map((m) => m.membershipNo));

  const toCreate = rows.filter((r) => !existing.has(r.membershipNo));
  const skipped = rows.filter((r) => existing.has(r.membershipNo));
  const withIssues = rows.filter((r) => r.issues.length);

  const count = (f: (r: Row) => string) => Object.entries(rows.reduce<Record<string, number>>((a, r) => ((a[f(r)] = (a[f(r)] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  console.log(`\n${rows.length} rows read · ${toCreate.length} new · ${skipped.length} already in the database · ${withIssues.length} with something to check\n`);
  console.log("Professions:", count((r) => r.profession).map(([k, v]) => `${k} ${v}`).join(" · "));
  console.log("Atolls:     ", count((r) => r.atoll).map(([k, v]) => `${k} ${v}`).join(" · "));

  const report = ["membershipNo\tname\tissues", ...withIssues.map((r) => `${r.membershipNo}\t${r.fullName}\t${r.issues.join("; ")}`)].join("\n");
  const reportPath = file.replace(/(\.\w+)?$/, "-issues.tsv");
  writeFileSync(reportPath, report + "\n");
  console.log(`\nRows to check written to ${reportPath}`);

  if (!WRITE) { console.log("\nDry run — nothing written. Add --write to create the members."); await db.$disconnect(); return; }

  // Temporary passwords: readable, no ambiguous characters (same style as the admin pages).
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const tempPassword = () => Array.from(randomBytes(10), (x) => chars[x % chars.length]).join("").replace(/(.{5})/, "$1-");

  const logins: string[] = ["membershipNo\tname\tphone\tsign-in email\ttemporary password\tnote"];
  let n = 0;
  for (const r of toCreate) {
    // Login email: the member's own, unless missing or already used by another login.
    const taken = r.email ? await db.user.findUnique({ where: { email: r.email }, include: { member: { select: { id: true } } } }) : null;
    const linkStaff = taken && !taken.member && taken.role !== "MEMBER" ? taken : null; // a staff account with the same email → give it this member record
    const loginEmail = r.email && !taken ? r.email : `${r.membershipNo.toLowerCase()}@no-email.invalid`;
    if (taken && !linkStaff) r.issues.push(`email ${r.email} is already used by another login, so a placeholder login email was used`);
    const pw = linkStaff ? null : tempPassword();
    const notes = [`Imported from the member register on ${TODAY}.`, ...r.extraNotes].join("\n");
    await db.$transaction(async (tx) => {
      const user = linkStaff ?? (await tx.user.create({ data: { email: loginEmail, name: r.fullName, role: "MEMBER", passwordHash: await bcrypt.hash(pw!, 10) } }));
      await tx.member.create({
        data: {
          membershipNo: r.membershipNo, fullName: r.fullName, idNumber: r.idNumber, nationality: r.nationality, address: r.address,
          phone: r.phone, email: r.email, profession: r.profession, role: r.role, employer: r.employer, atoll: r.atoll,
          joinedAt: r.joinedAt, status: "INACTIVE", notes, userId: user.id,
          needsReview: r.issues.length > 0, reviewNote: r.issues.length ? r.issues.join("; ") : null,
        },
      });
    });
    logins.push([r.membershipNo, r.fullName, r.phone, linkStaff ? linkStaff.email : loginEmail, pw ?? "(uses their existing staff password)", linkStaff ? "linked to existing staff account" : loginEmail.endsWith(".invalid") ? "no email: sign in with membership number" : ""].join("\t"));
    n++;
  }
  const loginsPath = file.replace(/(\.\w+)?$/, "-logins.tsv");
  writeFileSync(loginsPath, logins.join("\n") + "\n", { mode: 0o600 });
  console.log(`\nCreated ${n} members with logins (${toCreate.filter((r) => r.issues.length).length} flagged for review).`);
  console.log(`Temporary passwords written to ${loginsPath} — share them securely, then delete the file.`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
