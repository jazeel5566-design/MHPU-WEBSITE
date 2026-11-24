/* Demo data for local development. Everything here is SAMPLE content —
   replace names, affiliates, articles and documents before launch. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const db = new PrismaClient();
const u = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const days = (n: number) => new Date(Date.now() + n * 864e5);
const at = (n: number, h: number, m = 0) => { const d = days(n); d.setHours(h, m, 0, 0); return d; };
const pick = <T,>(a: T[], i: number) => a[Math.abs(i) % a.length];

// Tiny valid single-page PDF so sample documents actually open.
function makePdf(title: string, lines: string[]) {
  const esc = (s: string) => s.replace(/[\\()]/g, (m) => "\\" + m);
  const text = [`BT /F1 20 Tf 60 760 Td (${esc(title)}) Tj ET`, ...lines.map((l, i) => `BT /F1 11 Tf 60 ${720 - i * 18} Td (${esc(l)}) Tj ET`)].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/localhost|127\.0\.0\.1/.test(url) && process.env.ALLOW_REMOTE_SEED !== "yes") {
    throw new Error("Refusing to load demo data into a non-local database. (Set ALLOW_REMOTE_SEED=yes to override.)");
  }
  console.log("Resetting database…");
  for (const m of ["electionVote", "electionVoter", "electionCandidate", "electionPosition", "election", "paymentIntent", "smsMessage", "eventAttendance", "vote", "ballotOption", "ballot", "caseMessage", "case", "payment", "eventRsvp", "event", "petitionSignature", "campaign", "post", "resource", "media", "member", "application", "affiliate", "auditLog", "contactMessage", "subscriber", "setting", "user"] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db[m] as any).deleteMany();
  }

  const hash = await bcrypt.hash("mhpu1234", 10);
  const mkUser = (email: string, name: string, role: string) => db.user.create({ data: { email, name, role, passwordHash: hash } });
  const admin = await mkUser("admin@mhpu.mv", "Aishath Shiuna", "ADMIN");
  await db.user.update({ where: { id: admin.id }, data: { title: "General Secretary" } });
  const editor = await mkUser("editor@mhpu.mv", "Ibrahim Nasih", "EDITOR");
  const author = await mkUser("author@mhpu.mv", "Mariyam Zeena", "AUTHOR");
  const caseworker = await mkUser("caseworker@mhpu.mv", "Hassan Rasheed", "CASEWORKER");
  const treasurer = await mkUser("treasurer@mhpu.mv", "Fathimath Rifa", "TREASURER");
  await db.user.update({ where: { id: treasurer.id }, data: { title: "Treasurer" } });

  // ── Workplace unions (placeholder names, one per facility) ──
  const unionDefs: [string, string, string][] = [
    ["IGMH Staff Union", "IGMH-SU", "IGMH, Indira Gandhi Memorial Hospital"], ["Hulhumalé Hospital Staff Union", "HH-SU", "Hulhumalé Hospital, Hulhumale Hospital"],
    ["Kulhudhuffushi Hospital Staff Union", "KRH-SU", "Kulhudhuffushi Regional Hospital"], ["Addu Equatorial Hospital Staff Union", "AEH-SU", "Addu Equatorial Hospital"],
    ["Gan Regional Hospital Staff Union", "GRH-SU", "Gan Regional Hospital"], ["Ungoofaaru Hospital Staff Union", "URH-SU", "Ungoofaaru Regional Hospital"],
    ["Naifaru Hospital Staff Union", "NAH-SU", "Naifaru Atoll Hospital"], ["Thinadhoo Hospital Staff Union", "TRH-SU", "Thinadhoo Regional Hospital"],
    ["Island Health Centres Union", "IHC-U", "Eydhafushi Health Centre"], ["Fuvahmulah Hospital Staff Union", "FH-SU", "Fuvahmulah Hospital"],
    ["Private Healthcare Workers Union", "PHWU", "Private Clinic, Malé"],
  ];
  const affs = await Promise.all(unionDefs.map(([name, shortName, workplace]) => db.affiliate.create({ data: { name, shortName, workplace, description: "Sample workplace union — replace with real details." } })));
  const unionFor = (facility: string) => affs[Math.max(0, unionDefs.findIndex((u) => u[2].split(", ")[0] === facility))] ?? affs[8];

  // ── Members ──
  const first = ["Aminath", "Mohamed", "Fathimath", "Ahmed", "Mariyam", "Ibrahim", "Hawwa", "Ali", "Aishath", "Hussain", "Khadheeja", "Hassan", "Shifza", "Abdulla", "Zulfa", "Ismail", "Nashwa", "Yoosuf", "Raufa", "Adam"];
  const last = ["Shareef", "Rasheed", "Naseer", "Waheed", "Manik", "Didi", "Moosa", "Saeed", "Zahir", "Shakir", "Latheef", "Hameed"];
  const expat = [["Priya Nair", "Indian"], ["Rajesh Kumar", "Indian"], ["Farzana Akter", "Bangladeshi"], ["Nimal Perera", "Sri Lankan"], ["Sunita Thapa", "Nepali"], ["Anil Varghese", "Indian"], ["Dilani Fernando", "Sri Lankan"], ["Mohammad Hasan", "Bangladeshi"]];
  const facilities = [["IGMH", "Malé City"], ["Hulhumalé Hospital", "Kaafu"], ["Kulhudhuffushi Regional Hospital", "Haa Dhaalu"], ["Addu Equatorial Hospital", "Addu City"], ["Gan Regional Hospital", "Laamu"], ["Ungoofaaru Regional Hospital", "Raa"], ["Naifaru Atoll Hospital", "Lhaviyani"], ["Thinadhoo Regional Hospital", "Gaafu Dhaalu"], ["Eydhafushi Health Centre", "Baa"], ["Felidhoo Health Centre", "Vaavu"], ["Fuvahmulah Hospital", "Gnaviyani"], ["Private Clinic, Malé", "Malé City"]];
  const professions = ["Nurse", "Nurse", "Nurse", "Midwife", "Medical Doctor", "Laboratory Technologist", "Pharmacist", "Radiographer", "Physiotherapist", "Paramedic / EMT", "Community Health Worker", "Public Health Officer", "Support Staff", "Health Administrator"];

  const members = [];
  const N = 84;
  for (let i = 0; i < N; i++) {
    const isExpat = i % 6 === 5;
    const [name, nationality] = isExpat ? pick(expat, i) : [`${pick(first, i * 7)} ${pick(last, i * 3)}`, "Maldivian"];
    const prof = isExpat ? pick(["Nurse", "Medical Doctor", "Laboratory Technologist", "Radiographer"], i) : pick(professions, i);
    const [fac, atoll] = pick(facilities, i * 5);
    const joinedAt = days(-Math.floor((i * 37) % 360) - (i < 50 ? 0 : 400));
    const status = i % 23 === 7 ? "LAPSED" : i % 41 === 13 ? "SUSPENDED" : "ACTIVE";
    const email = i === 0 ? "member@mhpu.mv" : `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${i}@example.mv`;
    const user = await db.user.create({ data: { email, name, role: "MEMBER", passwordHash: hash } });
    members.push(await db.member.create({
      data: {
        membershipNo: `MHPU-${String(i + 1).padStart(4, "0")}`,
        fullName: i === 0 ? "Aminath Shareef" : name, idNumber: isExpat ? `P${8800000 + i * 13}` : `A${String(100000 + i * 917).slice(0, 6)}`,
        nationality, phone: `+960 7${String(100000 + i * 4111).slice(0, 6)}`, email, profession: i === 0 ? "Nurse" : prof,
        role: prof === "Nurse" ? "Staff Nurse" : null, employer: i === 0 ? "IGMH" : fac, atoll: i === 0 ? "Malé City" : atoll,
        status, joinedAt, isRep: i % 9 === 1, affiliateId: unionFor(i === 0 ? "IGMH" : fac).id, userId: user.id,
        duesPaidUntil: status === "LAPSED" ? days(-40) : days(10 + (i % 5) * 30),
      },
    }));
  }
  await db.user.update({ where: { email: "member@mhpu.mv" }, data: { name: "Aminath Shareef" } });
  const demo = members[0];

  // payments
  for (const m of members.slice(0, 40)) {
    for (let k = 0; k < 3; k++) {
      const d = days(-k * 30 - 3);
      await db.payment.create({ data: { memberId: m.id, amount: 100, period: d.toISOString().slice(0, 7), method: k % 2 ? "BANK_TRANSFER" : "SALARY_DEDUCTION", reference: `TRX${100200 + k}${m.membershipNo.slice(-3)}`, paidAt: d } });
    }
  }

  // ── Applications (with sample ID copy + signature in private storage) ──
  const appDir = path.join(process.cwd(), "storage", "applications");
  mkdirSync(appDir, { recursive: true });
  const sharp = (await import("sharp")).default;
  const sigPng = async (seed: number) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="150"><path d="M30 ${100 - seed} C 80 20, 110 140, 150 70 S 230 30, 260 95 S 340 60, 380 80 L 440 ${60 + seed}" fill="none" stroke="#2c2d42" stroke-width="4" stroke-linecap="round"/></svg>`)).png().toBuffer();
  const apps = [
    { fullName: "Shaheema Ahmed", address: "H. Seaview, Kulhudhuffushi", country: "Maldives", idNumber: "A334512", phone: "+960 7712345", email: "shaheema@example.mv", jobTitle: "Staff Nurse", profession: "Nurse", employer: "Kulhudhuffushi Regional Hospital", atoll: "Haa Dhaalu", category: "nurse" },
    { fullName: "Thomas Mathew", address: "Flat 4B, Hithadhoo, Addu City", country: "India", idNumber: "P9012233", phone: "+960 9123456", email: "thomas.m@example.com", jobTitle: "Laboratory Technologist", profession: "Laboratory Technologist", employer: "Addu Equatorial Hospital", atoll: "Addu City", category: "expat", referredBy: "MHPU-0012" },
    { fullName: "Mohamed Shamin", address: "Lot 10512, Hulhumalé", country: "Maldives", idNumber: "A298811", phone: "+960 7998877", email: "shamin@example.mv", jobTitle: "Paramedic", profession: "Paramedic / EMT", employer: "Hulhumalé Hospital", atoll: "Kaafu", category: "allied" },
    { fullName: "Hawwa Lamya", address: "M. Coral Villa, Malé", country: "Maldives", idNumber: "A401122", phone: "+960 7445566", email: "lamya@example.mv", jobTitle: "Pharmacist", profession: "Pharmacist", employer: "Private Clinic, Malé", atoll: "Malé City", category: "allied" },
  ];
  for (const [i, a] of apps.entries()) {
    const idName = `sample-id-${i + 1}.pdf`, sigName = `sample-signature-${i + 1}.png`;
    writeFileSync(path.join(appDir, idName), makePdf("SAMPLE ID DOCUMENT", [a.fullName, a.idNumber, "", "Placeholder for the applicant's ID / passport copy."]));
    writeFileSync(path.join(appDir, sigName), await sigPng(i * 8));
    await db.application.create({ data: { ...a, affiliateId: unionFor(a.employer).id, reference: `APP-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`, idDocFile: idName, signatureFile: sigName, declarationDate: days(-i), consent: true, createdAt: days(-i - 0.2) } });
  }

  // ── Media ──
  const imgs = {
    team: u("photo-1755189118414-14c8dacdb082"), steth: u("photo-1584432810601-6c7f27d2362b", 1200), doc: u("photo-1612349317150-e413f6a5b16d", 1200),
    smile: u("photo-1758691463582-11aea602cd4a", 1200), surgery: u("photo-1638598124048-10c5b3f2f964", 1200), lab: u("photo-1673865641073-4479f93a7776", 1200),
    nurses: u("photo-1758575514487-0390fcacc339", 1200), atoll: u("photo-1527401850656-0f34108fdb30"), island: u("photo-1537162998323-3d3675e0e87c"),
  };
  await db.media.createMany({ data: Object.entries(imgs).map(([k, url]) => ({ url, filename: `${k}.jpg`, mimeType: "image/jpeg", size: 0, alt: k, uploadedById: editor.id })) });

  // ── Posts ──
  const posts = [
    { title: "Overtime cap leaves health workers unpaid for hours worked, union warns", slug: "overtime-cap-leaves-health-workers-unpaid", category: "STATEMENT", coverImage: imgs.surgery, featured: true, d: -2, views: 1840,
      excerpt: "MHPU is calling on the government to lift the cap that limits overtime pay to a fraction of basic salary, leaving many staff working hours they are never paid for.",
      tags: "overtime, pay",
      body: `Health workers across the Maldives continue to work long overtime hours to keep wards, emergency departments and island health centres running. Under the current pay framework, overtime compensation is capped — so once the cap is reached, the extra hours go unpaid.\n\n## What we're asking for\n\n- **Remove the cap** on overtime pay for health workers in critical services\n- **Pay all outstanding overtime** owed from previous months\n- **Publish staffing plans** so that overtime is the exception, not the rota\n\n> Every hour worked should be an hour paid.\n\n## What you can do\n\n1. Sign the [Fair Overtime Pay petition](/campaigns/fair-overtime-pay)\n2. Keep your own record of every extra hour\n3. Members: [open a case](/members/help/new) if your overtime has not been paid`,
      titleDv: "އިތުރުގަޑީގެ ފައިސާއަށް ލާފައިވާ ހައްދު އުވާލުމަށް ޔޫނިއަނުން ގޮވާލައިފި", excerptDv: "ސިއްޙީ މުވައްޒަފުން މަސައްކަތްކުރާ އިތުރުގަޑިތަކުގެ ފައިސާ ފުރިހަމައަށް ދިނުމަށް MHPU އިން ގޮވާލަމުއެވެ." },
    { title: "Expatriate health workers must not lose their professional status", slug: "expatriate-health-workers-professional-status", category: "PRESS_RELEASE", coverImage: imgs.lab, d: -6, views: 920,
      excerpt: "Reclassifying expatriate healthcare roles as 'non-professional' risks dependent visas and benefits for staff the health system relies on.", tags: "expatriate, visas",
      body: `MHPU has written to the relevant authorities asking for an urgent review of a decision that reclassifies several expatriate healthcare roles as non-professional.\n\nThousands of internationally recruited nurses, doctors and technologists keep our hospitals and island health centres open. Changing their classification could affect **dependent visas, allowances and contract terms**.\n\n## Our position\n\nEvery health worker — whatever their passport — deserves to be recognised for the professional work they do. We are asking for:\n\n- A pause on implementation until affected staff are consulted\n- Clear criteria, published in English and Dhivehi\n- Protection of existing contracts and family visas\n\nExpatriate members can contact us in confidence through the member portal.` },
    { title: "Ramadan working hours: staff on duty beyond official hours must be compensated", slug: "ramadan-working-hours-compensation", category: "STATEMENT", coverImage: imgs.nurses, d: -12, views: 610,
      excerpt: "When official working hours are reduced, hospital staff required to work longer shifts should receive the additional pay they are due.", tags: "working hours, ramadan",
      body: `During Ramadan official working hours across government offices are reduced. Many hospital and health-centre staff, however, are still required to work full shifts.\n\nMHPU is asking every facility to make sure staff who work beyond the official hours are **properly compensated**, and that rosters are published in advance.\n\nIf this affects you, keep your roster and payslip and talk to your workplace rep.` },
    { title: "Union welcomes special allowance for staff working the last ten days of Ramadan", slug: "union-welcomes-ramadan-allowance", category: "NEWS", coverImage: imgs.team, d: -20, views: 455,
      excerpt: "A win for members who campaigned for recognition of essential staff who keep services running during Ramadan.", tags: "allowance, win",
      body: `MHPU welcomes the decision to provide a special allowance for government employees required to work during the last ten days of Ramadan.\n\nThis follows months of member pressure. **Thank you to every member who signed, shared and spoke up.** We will keep monitoring to make sure the allowance reaches health workers at every facility, including island health centres.` },
    { title: "Member notice: 2027 pay claim consultation is now open", slug: "2027-pay-claim-consultation", category: "NOTICE", visibility: "MEMBERS", coverImage: imgs.doc, d: -1, views: 310,
      excerpt: "Tell us your priorities for next year's pay claim. The consultation ballot is open in the member portal.", tags: "pay claim, ballot",
      body: `Your executive committee is preparing MHPU's 2027 pay claim. Before we submit it, we want to hear from you.\n\n## How to take part\n\n1. Log in to the member portal\n2. Go to **Ballots & votes**\n3. Choose your top priority\n\nThe consultation closes in 10 days. Branch meetings will be held in Malé, Addu City and Kulhudhuffushi — see Events.` },
    { title: "Meet the reps: keeping a two-nurse health centre running in Vaavu", slug: "meet-the-reps-vaavu", category: "FEATURE", coverImage: imgs.island, d: -27, views: 280,
      excerpt: "Our new series profiles the workplace reps who support colleagues on islands far from Malé.", tags: "reps, islands",
      body: `On small islands, a health centre might have two nurses, one doctor and a lot of responsibility. Our workplace reps make sure staff there are not forgotten.\n\n*This is sample feature content — replace with a real interview.*` },
    { title: "Safe staffing survey: one in three nurses report regularly working short-staffed", slug: "safe-staffing-survey-results", category: "NEWS", coverImage: imgs.smile, d: -34, views: 770,
      excerpt: "Early results from MHPU's member survey show the scale of staffing shortages across the atolls. (Sample figures.)", tags: "safe staffing, survey",
      body: `*Sample article with illustrative figures — replace with real survey results before publishing.*\n\nMembers told us about shifts with too few staff, missed breaks and rising patient numbers. The full report will be published in Resources.` },
  ];
  for (const p of posts) {
    const { d, ...rest } = p;
    await db.post.create({ data: { ...rest, status: "PUBLISHED", publishedAt: days(d), authorId: pick([editor, author, admin], d).id, reviewerId: editor.id } });
  }
  await db.post.create({ data: { title: "World Health Worker Week: events across the atolls", slug: "world-health-worker-week", category: "NEWS", status: "SCHEDULED", publishAt: days(5), publishedAt: days(5), excerpt: "A week of events celebrating the people who care for us.", body: "Scheduled sample article.", authorId: editor.id, coverImage: imgs.atoll } });
  await db.post.create({ data: { title: "Guide: what to do if your overtime isn't paid", slug: "guide-overtime-not-paid", category: "FEATURE", status: "IN_REVIEW", excerpt: "A step-by-step guide for members.", body: "## Step 1\n\nKeep a record of every shift…", authorId: author.id } });
  await db.post.create({ data: { title: "Draft: interview with a sea-ambulance paramedic", slug: "draft-sea-ambulance-paramedic", category: "FEATURE", status: "DRAFT", body: "Notes from the interview…", authorId: author.id } });

  // ── Campaigns ──
  const overtime = await db.campaign.create({ data: {
    title: "Fair Overtime Pay", slug: "fair-overtime-pay", status: "ACTIVE", featured: true, goal: 5000, coverImage: imgs.surgery, hasPetition: true,
    titleDv: "އިންސާފުވެރި އިތުރުގަޑީގެ ފައިސާ",
    summary: "Every hour worked should be an hour paid. Help us remove the cap on health workers' overtime.",
    summaryDv: "މަސައްކަތްކުރާ ކޮންމެ ގަޑިއަކަށް ފައިސާ ލިބެންވާނެ.",
    petitionAsk: "We call on the Government of Maldives to remove the cap on overtime pay for health workers and pay all overtime owed in full.",
    body: `## The problem\n\nHealth workers routinely work extra shifts to cover staff shortages. Under the current framework, overtime pay is capped — once the cap is reached, the remaining hours are unpaid.\n\n## Our demands\n\n1. Remove the overtime cap for health workers\n2. Pay all overtime owed\n3. Fund safe staffing so overtime isn't the norm\n\n## Why it matters to patients\n\nExhausted staff and empty rotas put patients at risk. Fair pay helps keep experienced health workers in the Maldives.` } });
  const staffing = await db.campaign.create({ data: {
    title: "Safe Staffing on Every Island", slug: "safe-staffing", status: "ACTIVE", goal: 3000, coverImage: imgs.island, hasPetition: true,
    summary: "No ward or island health centre should run below a safe minimum number of staff.",
    petitionAsk: "We call for legally binding minimum staffing levels in every hospital and island health centre.",
    body: `Island health centres often run with one or two clinical staff covering 24 hours. We want national minimum staffing standards, published and enforced.\n\n**Document it, share it, sign it.**` } });
  await db.campaign.create({ data: {
    title: "Ramadan Allowance for Essential Staff", slug: "ramadan-allowance", status: "WON", goal: 2000, coverImage: imgs.team, hasPetition: true,
    summary: "Members won a special allowance for staff required to work the last ten days of Ramadan.",
    body: "Thanks to members' pressure, a special allowance was granted. We'll keep making sure it reaches every facility." } });
  const sigNames = ["Aishath N.", "Ahmed S.", "Mariyam R.", "Priya N.", "Hussain M.", "Shifza A.", "Ali W.", "Nimal P.", "Zulfa H.", "Ibrahim D."];
  for (let i = 0; i < 1260; i++) await db.petitionSignature.create({ data: { campaignId: overtime.id, name: pick(sigNames, i), email: `supporter${i}@example.mv`, atoll: pick(["Malé City", "Addu City", "Haa Dhaalu", "Laamu", "Raa", "Baa"], i), isHealthWorker: i % 3 !== 0, createdAt: days(-(i % 60) - Math.random()) } });
  for (let i = 0; i < 640; i++) await db.petitionSignature.create({ data: { campaignId: staffing.id, name: pick(sigNames, i + 3), email: `staff${i}@example.mv`, isHealthWorker: true, createdAt: days(-(i % 40)) } });

  // ── Events ──
  const events = await Promise.all([
    { title: "Branch meeting: Malé & Kaafu", description: "Discuss the 2027 pay claim and the overtime campaign.", startsAt: at(4, 20, 30), location: "MHPU Hall, Malé", type: "MEETING", capacity: 120 },
    { title: "Know your rights: disciplinary procedures", description: "Practical training for members and reps.", startsAt: at(9, 21), location: "Online (Google Meet)", isOnline: true, type: "TRAINING", cpdHours: 2, meetingUrl: "https://meet.google.com/abc-defg-hij" },
    { title: "CPD: Infection prevention update", description: "Accredited CPD session for nurses and allied health staff.", startsAt: at(14, 9), location: "Addu Equatorial Hospital", type: "CPD", cpdHours: 3, capacity: 40 },
    { title: "Members' briefing: expatriate worker classification", description: "Members-only briefing in English.", startsAt: at(6, 21, 30), location: "Online (Zoom)", isOnline: true, type: "WEBINAR", visibility: "MEMBERS" },
    { title: "Annual General Assembly 2027", description: "Elect the executive committee and vote on motions.", startsAt: at(48, 9), location: "Dharubaaruge, Malé", type: "AGM", visibility: "MEMBERS", capacity: 400 },
  ].map((data) => db.event.create({ data })));
  for (const m of members.slice(0, 25)) await db.eventRsvp.create({ data: { eventId: events[0].id, memberId: m.id } });
  await db.eventRsvp.create({ data: { eventId: events[2].id, memberId: demo.id } });

  // ── Resources (PDFs written to private storage) ──
  const dir = path.join(process.cwd(), "storage", "resources");
  mkdirSync(dir, { recursive: true });
  const docs = [
    { title: "MHPU Constitution", category: "CONSTITUTION", visibility: "PUBLIC", description: "The rules of the federation." },
    { title: "Know your rights: overtime pay", category: "GUIDE", visibility: "PUBLIC", description: "How overtime should be calculated and what to do if it isn't paid." },
    { title: "Guide for expatriate health workers", category: "GUIDE", visibility: "PUBLIC", description: "Work permits, contracts and your rights — in English." },
    { title: "Membership dues authorisation form", category: "FORM", visibility: "PUBLIC", description: "Salary deduction authorisation." },
    { title: "2027 pay claim — draft for consultation", category: "AGREEMENT", visibility: "MEMBERS", description: "Confidential draft for members." },
    { title: "Workplace rep handbook", category: "GUIDE", visibility: "MEMBERS", description: "For trained workplace representatives." },
    { title: "Safe staffing survey 2026 — interim report", category: "REPORT", visibility: "PUBLIC", description: "Sample report." },
  ];
  for (const [i, d] of docs.entries()) {
    const file = `sample-${i + 1}.pdf`;
    const buf = makePdf(d.title, ["Maldives Health Professionals Union", "", "SAMPLE DOCUMENT - replace with the real file before launch.", "", d.description]);
    writeFileSync(path.join(dir, file), buf);
    await db.resource.create({ data: { ...d, fileUrl: `storage:${file}`, fileSize: buf.length, downloads: (i * 37) % 200 } });
  }

  // ── Cases ──
  const caseData = [
    { m: demo, type: "PAY_OVERTIME", subject: "October overtime not paid", description: "I worked 36 hours of overtime in October on the medical ward but my payslip only shows 12 hours. HR says the rest is above the cap.", status: "IN_PROGRESS", urgency: "HIGH", assignee: caseworker },
    { m: demo, type: "WORKING_HOURS", subject: "Rostered 7 night shifts in a row", description: "The new roster has me on nights for 7 consecutive days with no rest day.", status: "RESOLVED", urgency: "NORMAL", assignee: caseworker },
    { m: members[5], type: "VISA_PERMIT", subject: "Dependent visa renewal refused after reclassification", description: "My role was changed to non-professional and my wife's dependent visa renewal was refused.", status: "OPEN", urgency: "URGENT" },
    { m: members[8], type: "DISCIPLINARY", subject: "Called to disciplinary meeting on Thursday", description: "I received a letter about a medication incident. Meeting is on Thursday.", status: "OPEN", urgency: "URGENT" },
    { m: members[12], type: "SAFETY", subject: "Only one nurse on night shift at health centre", description: "Our health centre has one nurse covering nights for the whole island.", status: "AWAITING_MEMBER", urgency: "HIGH", assignee: admin },
    { m: members[20], type: "HARASSMENT", subject: "Verbal abuse from patient relatives", description: "Repeated aggressive behaviour from visitors in the ER; security is not available at night.", status: "IN_PROGRESS", urgency: "NORMAL", assignee: caseworker },
    { m: members[30], type: "CONTRACT", subject: "Grade not updated after promotion", description: "I was promoted in March but still paid at the old grade.", status: "OPEN", urgency: "LOW" },
  ];
  for (const [i, c] of caseData.entries()) {
    const created = days(-(i * 4) - 2);
    const cs = await db.case.create({ data: { reference: `C-${created.getFullYear()}-${String(i + 1).padStart(4, "0")}`, memberId: c.m.id, type: c.type, subject: c.subject, description: c.description, status: c.status, urgency: c.urgency, assigneeId: c.assignee?.id, facility: c.m.employer, createdAt: created, closedAt: c.status === "RESOLVED" ? days(-1) : null } });
    if (c.assignee) {
      await db.caseMessage.create({ data: { caseId: cs.id, authorId: c.assignee.id, body: "Thanks for getting in touch. I'm looking into this now — could you upload or send your roster and payslip for the month?", createdAt: days(-(i * 4) - 1) } });
      await db.caseMessage.create({ data: { caseId: cs.id, authorId: c.assignee.id, internal: true, body: "Several similar cases from the same facility — consider raising collectively.", createdAt: days(-(i * 4) - 1) } });
    }
  }
  const demoUserId = (await db.member.findUnique({ where: { id: demo.id } }))!.userId!;
  const firstCase = await db.case.findFirst({ where: { memberId: demo.id, status: "IN_PROGRESS" } });
  if (firstCase) await db.caseMessage.create({ data: { caseId: firstCase.id, authorId: demoUserId, body: "Sent the roster to the MHPU email. Thank you!" } });

  // ── Ballots ──
  const b1 = await db.ballot.create({ data: { title: "2027 pay claim priorities", question: "What should be MHPU's top priority in the 2027 pay claim?", description: "This consultation shapes the claim the executive committee submits.", opensAt: days(-2), closesAt: days(10),
    options: { create: [{ label: "Remove the overtime cap", order: 0 }, { label: "Across-the-board pay rise", order: 1 }, { label: "Island & hardship allowances", order: 2 }, { label: "Minimum staffing standards", order: 3 }] } }, include: { options: true } });
  const b2 = await db.ballot.create({ data: { title: "Constitutional amendment: expatriate officer", question: "Create an elected Expatriate Workers' Officer post on the executive committee?", opensAt: days(-40), closesAt: days(-30),
    options: { create: [{ label: "Yes", order: 0 }, { label: "No", order: 1 }] } }, include: { options: true } });
  for (const [i, m] of members.slice(1, 50).entries()) await db.vote.create({ data: { ballotId: b1.id, memberId: m.id, optionId: b1.options[i % 7 < 3 ? 0 : i % 7 < 5 ? 3 : i % 2 ? 1 : 2].id } });
  for (const [i, m] of members.slice(0, 61).entries()) await db.vote.create({ data: { ballotId: b2.id, memberId: m.id, optionId: b2.options[i % 5 === 0 ? 1 : 0].id } });

  // ── Workplace union elections (sample) ──
  const igmh = affs[0];
  const igmhMembers = members.filter((m) => m.affiliateId === igmh.id);
  const openEl = await db.election.create({ data: { title: "IGMH Staff Union — ExCom election", description: "Sample election. Elects the IGMH Staff Union executive committee for a two-year term.", affiliateId: igmh.id, opensAt: days(-1), closesAt: days(6) } });
  const posDefs: [string, number][] = [["President", 1], ["Secretary", 1], ["Committee members", 2]];
  let ci = 1;
  for (const [i, [title, seats]] of posDefs.entries()) {
    const pos = await db.electionPosition.create({ data: { electionId: openEl.id, title, seats, order: i } });
    for (let k = 0; k < seats + 1; k++) {
      const cand = igmhMembers[ci++ % igmhMembers.length];
      if (cand && cand.id !== demo.id) await db.electionCandidate.create({ data: { positionId: pos.id, memberId: cand.id, statement: k === 0 ? "I will push for fair rosters and paid overtime." : null } }).catch(() => {});
    }
  }
  const closedEl = await db.election.create({ data: { title: "Island Health Centres Union — ExCom election 2025", affiliateId: affs[8].id, opensAt: days(-60), closesAt: days(-53), resultsPublished: true, requireDuesPaid: false } });
  const cpos = await db.electionPosition.create({ data: { electionId: closedEl.id, title: "President", seats: 1 } });
  const ihc = members.filter((m) => m.affiliateId === affs[8].id).slice(0, 2);
  const cands = [];
  for (const m of ihc) cands.push(await db.electionCandidate.create({ data: { positionId: cpos.id, memberId: m.id } }));
  for (const [i, m] of members.filter((m) => m.affiliateId === affs[8].id).entries()) {
    if (!cands.length) break;
    await db.electionVoter.create({ data: { electionId: closedEl.id, memberId: m.id } });
    await db.electionVote.create({ data: { positionId: cpos.id, candidateId: cands[i % 3 === 0 ? 1 % cands.length : 0].id } });
  }

  // ── Misc ──
  await db.contactMessage.createMany({ data: [
    { name: "Journalist, Malé newsroom", email: "news@example.mv", topic: "Media enquiry", message: "Could MHPU comment on the overtime cap ahead of the budget debate?" },
    { name: "Nazeer Ali", email: "nazeer@example.mv", topic: "Membership", message: "I work at a private clinic — can I still join MHPU?" },
  ] });
  await db.subscriber.createMany({ data: ["a@example.mv", "b@example.mv", "c@example.mv"].map((email) => ({ email })) });
  await db.auditLog.create({ data: { userId: admin.id, action: "seed", entity: "System", detail: "Demo data loaded" } });
  // Demo-only site settings (production starts with these empty)
  await db.setting.createMany({ data: [
    { key: "alertEnabled", value: "true" },
    { key: "alertText", value: "Overtime pay campaign: add your name to the petition." },
    { key: "alertLink", value: "/campaigns/fair-overtime-pay" },
    { key: "bankDetails", value: "SAMPLE BANK · Acc. 0000-000000-000 · MHPU" },
    { key: "paymentsEnabled", value: "true" }, { key: "smsEnabled", value: "true" }, { key: "remindersEnabled", value: "true" },
  ] });

  console.log(`Seeded: ${members.length} members, ${posts.length + 3} posts, 3 campaigns, ${events.length} events, ${docs.length} documents, ${caseData.length} cases.`);
  console.log("Demo logins (password mhpu1234): admin@ / treasurer@ / editor@ / author@ / caseworker@ / member@mhpu.mv");
}

main().finally(() => db.$disconnect());
