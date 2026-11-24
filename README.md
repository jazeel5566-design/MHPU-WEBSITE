# MHPU platform

Website and portals for the **Maldives Health Professionals Union**, a trade union federation for healthcare workers across the Maldives.

The app has four areas, all in one Next.js app:

| Area | URL | Who uses it |
|---|---|---|
| **Public site** | `/` | Everyone: news, campaigns and petitions, events, resources, get-help guides, the online join form and membership verification |
| **Member portal** | `/members` | Members: digital card with QR code, casework (get help), e-ballots, event RSVPs, documents, dues, profile |
| **Editorial portal** | `/editorial` | Comms team: articles with draft → review → publish/schedule workflow, campaigns, events, documents, media library |
| **Admin portal** | `/admin` | Officers & staff: applications, members, dues, casework, ballots, affiliates, staff roles, site settings, audit log |

## Quick start

```bash
npm install
npm run setup        # creates the SQLite database and loads demo data
npm run dev          # http://localhost:3000
```

Demo accounts (password `mhpu1234`, shown on the login page in development only):

| Email | Role | Lands on |
|---|---|---|
| admin@mhpu.mv | Administrator | /admin |
| editor@mhpu.mv | Editor (can publish) | /editorial |
| author@mhpu.mv | Author (drafts only) | /editorial |
| caseworker@mhpu.mv | Caseworker | /admin (cases + read-only members) |
| member@mhpu.mv | Member | /members |

Members can also sign in with their membership number (e.g. `MHPU-0001`).

## Roles

- **Administrator**: everything.
- **Editor**: publishes, schedules, unpublishes and archives articles; manages campaigns, events, documents and media.
- **Author**: writes drafts and submits them for review. Cannot publish or edit live articles.
- **Caseworker**: handles member cases; can view member records but not edit them.
- **Member**: the member portal only.

Access is enforced twice: `src/middleware.ts` gates each portal by role, and every page and server action re-checks the role against the database (`requireRole` in `src/lib/auth.ts`). A deactivated or suspended user is locked out immediately.

## Everyday tasks (no developer needed)

- **Change the red alert banner, help-line number, dues or social links:** Admin → Site settings.
- **Approve a new member:** Admin → Applications. Check the ID/passport copy and signature, then Approve: the next membership number (`MHPU-0001` sequence) and a temporary password are generated and shown once. "Received by" and the processed date are filled in automatically. Export CSV gives the same columns as the old Google Sheet.
- **Record dues:** Admin → Members → open member → Record a dues payment. This extends "paid until" automatically.
- **Run a vote:** Admin → Ballots. Members see it in their portal while it's open; results appear when it closes.
- **Feature a campaign in the homepage hero:** Editorial → Campaigns → tick "Feature in homepage hero".
- **Publish in Dhivehi:** in the article editor, switch to the ދިވެހި tab. Visitors who choose ދިވެހި in the top bar see it, with full right-to-left layout.

## Brand

- **Logo mark:** `public/brand/mhpu-mark.png`, extracted from the official logo sheet. If you have the original vector (SVG/AI/EPS), export an SVG and point `src/components/logo.tsx` at it for the sharpest result. The wordmark is set in Barlow Semi Condensed to match the logo's DIN-style lettering.
- **Colours** (from the brand palette, defined in `src/app/globals.css`): slate `#434656`, red `#D42027`, sky blue `#2AA6D8`, light blue `#9DD3E8`, greys `#D6D6DC` / `#F7F7FA`.
- **Organisation details** (registration CR/113/2019, Hulhumalé address, phone numbers, email, Dhivehi name) are editable in Admin → Site settings.

## Tech

- Next.js 15 (App Router, server actions), React 19, TypeScript, Tailwind CSS v4
- Prisma ORM with SQLite in development (`prisma/schema.prisma`)
- Sessions: signed JWT in an httpOnly cookie (`jose`) with bcrypt-hashed passwords
- Fonts: Plus Jakarta Sans (body), Barlow (headings), Barlow Semi Condensed (wordmark), and **Faruma** for Thaana — self-hosted at `public/fonts/Faruma.ttf` and declared in `src/app/globals.css` with a Thaana-only `unicode-range`, so Latin text inside Dhivehi content stays in the Latin font. Faruma (© The President's Office, 2002) is the standard Dhivehi typeface; MHPU has chosen to use it on the site.

```
src/app/(public)/     public site
src/app/members/      member portal
src/app/editorial/    editorial portal
src/app/admin/        admin portal
src/app/actions/      server actions (auth, public, member, editorial, admin)
src/components/       UI kit (ui.tsx), portal shell, editors and forms
src/lib/              auth, db, i18n (EN/DV), settings, storage, constants
prisma/seed.ts        demo data
```

## Before going live

1. **Database:** switch `provider` in `prisma/schema.prisma` to `postgresql` and set `DATABASE_URL`, then run `npx prisma db push`. Do not run the seed in production.
2. **Secret:** set `SESSION_SECRET` to a long random value (`openssl rand -base64 32`).
3. **File storage:** uploads go to `public/uploads` (images), `storage/resources` (documents, including members-only files streamed after an access check) and `storage/applications` (applicants' ID copies and signatures — admin-only, every view is audit-logged). On a serverless host, move both to object storage such as S3, R2 or Azure Blob. The swap point is `src/lib/storage.ts`.
4. **Email/SMS:** not wired up yet (official address: info@mhpu.org). The old Google Apps Script emailed each application to the office inbox; the new site shows applications in Admin → Applications instead, so add an email notification for the office (and for applicants) Add a provider for application approvals, password resets and case replies (a "forgot password" flow needs this).
5. **Content review:** all seeded articles, affiliates, leadership names, bank details and documents are **placeholders**. The Dhivehi interface strings in `src/lib/i18n.ts` are a first draft and should be checked by a native speaker. The privacy notice needs legal review.
6. **Photos:** stock images come from Unsplash (free licence, `src/lib/images.ts`). Replace them with MHPU's own photography over time.
7. **Hardening:** add rate limiting on login and public forms (e.g. at the proxy, or with Upstash), consider 2FA for admin accounts, and set up backups.
