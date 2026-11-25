/**
 * Everything an admin can switch off, grouped as shown on Admin → Pages & features.
 * Pure data (no database) so the middleware can use it too.
 *
 * `paths`: addresses that belong to the feature. When it's off, visiting them shows a
 * "switched off" notice, and links to them are hidden across the site.
 * `needs`: other features that must also be on (e.g. the home-page news section needs the News page).
 */
export type Feature = { key: string; label: string; desc?: string; paths?: string[]; needs?: string[] };
export type FeatureGroup = { id: string; title: string; desc: string; items: Feature[] };

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "pages", title: "Public website: pages", desc: "Turning a page off removes it from the menu, header and footer. Its address shows a “switched off” notice.",
    items: [
      { key: "page.about", label: "About", paths: ["/about"] },
      { key: "page.news", label: "News", desc: "The news list and menu link. Single articles stay reachable, so member notices and links already shared keep working.", paths: ["=/news"] },
      { key: "page.campaigns", label: "Campaigns & petitions", paths: ["/campaigns"] },
      { key: "page.events", label: "Events", paths: ["/events"] },
      { key: "page.photoStories", label: "Photo stories", paths: ["/photo-stories"] },
      { key: "page.resources", label: "Resources (documents)", paths: ["/resources"] },
      { key: "page.contact", label: "Contact & message form", paths: ["/contact"] },
      { key: "page.getHelp", label: "Get help at work", paths: ["/get-help"] },
      { key: "page.join", label: "Join MHPU (membership form)", paths: ["/join"] },
      { key: "page.verify", label: "Verify a membership (QR check)", paths: ["/verify"] },
      { key: "page.privacy", label: "Privacy notice", paths: ["/privacy"] },
    ],
  },
  {
    id: "site", title: "Public website: header & footer", desc: "Parts shown on every public page.",
    items: [
      { key: "site.topbar", label: "Top bar (hotline, WhatsApp, text size, language)" },
      { key: "site.a11y", label: "Text size & contrast buttons", needs: ["site.topbar"] },
      { key: "site.portalButton", label: "“Log in / My portal” button in the header" },
      { key: "site.newsletter", label: "Newsletter sign-up in the footer" },
      { key: "site.footerContact", label: "Contact details in the footer" },
      { key: "site.social", label: "Social media links in the footer" },
    ],
  },
  {
    id: "home", title: "Home page sections", desc: "Sections that link to a page also disappear when that page is off.",
    items: [
      { key: "home.heroButtons", label: "Hero buttons (Join / Get help)" },
      { key: "home.stats", label: "Hero numbers (members, unions, atolls)" },
      { key: "home.featured", label: "Featured campaign card", needs: ["page.campaigns"] },
      { key: "home.help", label: "“How can we help?” topics", needs: ["page.getHelp"] },
      { key: "home.news", label: "Latest news", needs: ["page.news"] },
      { key: "home.campaigns", label: "Active campaigns", needs: ["page.campaigns"] },
      { key: "home.sectors", label: "“Who we represent”" },
      { key: "home.events", label: "Upcoming events", needs: ["page.events"] },
      { key: "home.join", label: "Join box (dues & benefits)", needs: ["page.join"] },
    ],
  },
  {
    id: "about", title: "About page sections", desc: "",
    items: [
      { key: "about.values", label: "Mission, vision & values", needs: ["page.about"] },
      { key: "about.story", label: "Our story (timeline)", needs: ["page.about"] },
      { key: "about.unions", label: "Workplace unions list", needs: ["page.about"] },
    ],
  },
  {
    id: "members", title: "Member portal tabs", desc: "The dashboard and “Profile & security” always stay on.",
    items: [
      { key: "members.card", label: "Membership card", paths: ["/members/card"] },
      { key: "members.help", label: "My cases (ask the union for help)", paths: ["/members/help"] },
      { key: "members.news", label: "Member notices", paths: ["/members/news"] },
      { key: "members.elections", label: "Elections", paths: ["/members/elections"] },
      { key: "members.ballots", label: "Ballots & votes", paths: ["/members/ballots"] },
      { key: "members.events", label: "Events & CPD", paths: ["/members/events"] },
      { key: "members.documents", label: "Documents", paths: ["/members/documents"] },
      { key: "members.dues", label: "Dues & payments (incl. one-tap pay links)", paths: ["/members/dues", "/pay"] },
    ],
  },
  {
    id: "admin", title: "Admin portal sections", desc: "Dashboard, Members, Staff & roles, Site settings, Pages & features and My account always stay on.",
    items: [
      { key: "admin.applications", label: "Applications", paths: ["/admin/applications"] },
      { key: "admin.cases", label: "Casework", paths: ["/admin/cases"] },
      { key: "admin.messages", label: "Inbox (public messages)", paths: ["/admin/messages"] },
      { key: "admin.finance", label: "Financial reports", paths: ["/admin/finance", "/api/export/finance"] },
      { key: "admin.payments", label: "Online payments", paths: ["/admin/payments"] },
      { key: "admin.elections", label: "Elections", paths: ["/admin/elections"] },
      { key: "admin.ballots", label: "Ballots", paths: ["/admin/ballots"] },
      { key: "admin.affiliates", label: "Workplace unions", paths: ["/admin/affiliates"] },
      { key: "admin.sms", label: "SMS", paths: ["/admin/sms"] },
      { key: "admin.photos", label: "Site photos", paths: ["/admin/photos"] },
      { key: "admin.audit", label: "Audit log", paths: ["/admin/audit"] },
    ],
  },
  {
    id: "editorial", title: "Editorial portal sections", desc: "Overview, Articles and My account always stay on.",
    items: [
      { key: "editorial.campaigns", label: "Campaigns", paths: ["/editorial/campaigns"] },
      { key: "editorial.events", label: "Events", paths: ["/editorial/events"] },
      { key: "editorial.photoStories", label: "Photo stories", paths: ["/editorial/photo-stories"] },
      { key: "editorial.resources", label: "Documents", paths: ["/editorial/resources"] },
      { key: "editorial.media", label: "Media library", paths: ["/editorial/media"] },
    ],
  },
];

export const ALL_FEATURES = FEATURE_GROUPS.flatMap((g) => g.items);
export const FEATURE_KEYS = new Set(ALL_FEATURES.map((f) => f.key));
const BY_KEY = new Map(ALL_FEATURES.map((f) => [f.key, f]));

// "=/x" matches only /x itself; "/x" matches /x and everything under it.
const matches = (path: string, p: string) => (p.startsWith("=") ? path === p.slice(1) : path === p || path.startsWith(p + "/"));

/** The feature that owns this address, if any. */
export function featureForPath(path: string): Feature | undefined {
  return ALL_FEATURES.find((f) => f.paths?.some((p) => matches(path, p)));
}

/** Does any switchable feature own an address starting like this? (cheap pre-check for middleware) */
export function isSwitchablePath(path: string) {
  return !!featureForPath(path);
}

/** On, taking `needs` into account. */
export function featureOn(disabled: ReadonlySet<string>, key: string, seen = new Set<string>()): boolean {
  if (disabled.has(key)) return false;
  if (seen.has(key)) return true;
  seen.add(key);
  return (BY_KEY.get(key)?.needs ?? []).every((k) => featureOn(disabled, k, seen));
}

/** Is a link to this address allowed? (addresses no feature owns are always allowed) */
export function pathOn(disabled: ReadonlySet<string>, href: string) {
  const path = href.split(/[?#]/)[0] || "/";
  const f = featureForPath(path);
  return !f || featureOn(disabled, f.key);
}

/** Where a switched-off address is rewritten to (each portal has its own notice page). */
export function offPageFor(path: string) {
  for (const portal of ["/members", "/admin", "/editorial"]) if (path === portal || path.startsWith(portal + "/")) return portal + "/off";
  return "/off";
}
