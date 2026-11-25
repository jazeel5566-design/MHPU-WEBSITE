import { POST_CATEGORIES, RESOURCE_CATEGORIES } from "./constants";

/*
 * Who can see each public page and tab: everyone, or members only.
 * "Members only" means active members and staff. Everyone else doesn't see the item in menus,
 * tabs or home-page sections, and its address asks them to sign in.
 * Admins change this on Admin → Pages & features. Pure data, no database.
 */
export type AudienceItem = { key: string; label: string; desc?: string };
export type AudienceGroup = { id: string; title: string; desc: string; items: AudienceItem[] };

export const AUDIENCE_GROUPS: AudienceGroup[] = [
  {
    id: "pages", title: "Public pages", desc: "A members-only page disappears from the public menu and home page for everyone else.",
    items: [
      { key: "page.about", label: "About" },
      { key: "page.news", label: "News" },
      { key: "page.campaigns", label: "Campaigns & petitions" },
      { key: "page.photoStories", label: "Photo stories" },
      { key: "page.events", label: "Events", desc: "Members also find events under Events & CPD in their portal." },
      { key: "page.resources", label: "Resources (documents)", desc: "Members also find every document under Documents in their portal." },
      { key: "page.getHelp", label: "Get help at work" },
    ],
  },
  {
    id: "news", title: "News page tabs", desc: "Articles in a members-only tab are hidden from the public news page and home page. Members see them under Member notices in their portal.",
    items: POST_CATEGORIES.map((c) => ({ key: `news.${c.id}`, label: c.label })),
  },
  {
    id: "resources", title: "Resources page tabs", desc: "Documents in a members-only tab are hidden from the public Resources page. Members see them under Documents in their portal.",
    items: RESOURCE_CATEGORIES.map((c) => ({ key: `resource.${c.id}`, label: c.label })),
  },
];

export const AUDIENCE_KEYS = new Set(AUDIENCE_GROUPS.flatMap((g) => g.items.map((i) => i.key)));

/** Used until an admin saves their own choice. */
export const DEFAULT_MEMBERS_ONLY = ["page.events", "news.NOTICE", "resource.AGREEMENT", "resource.POLICY", "resource.GUIDE", "resource.FORM", "resource.CONSTITUTION"];
