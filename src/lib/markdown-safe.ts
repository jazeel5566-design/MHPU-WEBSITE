import { Marked } from "marked";

/*
 * Markdown → HTML for articles and campaigns (used on the server and in the editor preview).
 *  - Raw HTML is escaped (authors can't add tags or event handlers).
 *  - Link and image URLs are restricted to http(s), mailto, tel and same-site paths, so a
 *    "javascript:" or "data:" link can't be smuggled in (including entity/whitespace tricks).
 *  - A YouTube, Instagram, Facebook or Vimeo address on a line of its own becomes a video
 *    that plays inside the page (only these hosts; ids are checked before use).
 */

const ALLOWED = new Set(["http", "https", "mailto", "tel"]);

function decodeEntities(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(colon|tab|newline|lpar|rpar|sol);/gi, (_, n) => ({ colon: ":", tab: "\t", newline: "\n", lpar: "(", rpar: ")", sol: "/" })[n.toLowerCase() as "colon"]);
}

export function isSafeUrl(raw: string) {
  let u = raw;
  for (let i = 0; i < 3; i++) u = decodeEntities(decodeURIComponentSafe(u));
  u = u.replace(/[\u0000- \u007f-\u009f]/g, "").toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(u)?.[1];
  if (!scheme) return !u.startsWith("//") && !u.startsWith("\\"); // relative path or #anchor
  return ALLOWED.has(scheme);
}
function decodeURIComponentSafe(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

const ID = /^[A-Za-z0-9_-]{5,64}$/;

/** Embeddable player address for a video link, or null. */
export function videoEmbed(raw: string): { src: string; tall: boolean } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const ok = (id?: string) => (id && ID.test(id) ? id : null);
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = ok(u.searchParams.get("v") ?? (["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : undefined));
    return id ? { src: `https://www.youtube-nocookie.com/embed/${id}`, tall: parts[0] === "shorts" } : null;
  }
  if (host === "youtu.be") { const id = ok(parts[0]); return id ? { src: `https://www.youtube-nocookie.com/embed/${id}`, tall: false } : null; }
  if (host === "vimeo.com") { const id = ok(parts[0]); return id && /^\d+$/.test(id) ? { src: `https://player.vimeo.com/video/${id}`, tall: false } : null; }
  if (host === "instagram.com" && ["reel", "reels", "p", "tv"].includes(parts[0])) {
    const id = ok(parts[1]);
    return id ? { src: `https://www.instagram.com/${parts[0] === "p" ? "p" : "reel"}/${id}/embed`, tall: true } : null;
  }
  if ((host === "facebook.com" && parts.includes("videos")) || host === "fb.watch") {
    const clean = `https://${u.hostname}${u.pathname}`;
    return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(clean)}&show_text=false`, tall: false };
  }
  return null;
}

const md = new Marked({ gfm: true, breaks: true });
md.use({
  renderer: {
    // A paragraph that is only a video address → an embedded player.
    paragraph(token) {
      const text = token.text.trim();
      if (/\s/.test(text)) return false;
      const v = videoEmbed(text.replace(/^<|>$/g, ""));
      if (!v) return false;
      return `<div class="video-embed${v.tall ? " video-embed-tall" : ""}"><iframe src="${v.src}" title="Video" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>\n`;
    },
  },
  walkTokens(token) {
    if ((token.type === "link" || token.type === "image") && !isSafeUrl(token.href)) token.href = "#";
  },
});

export function renderSafeMarkdown(text: string) {
  return md.parse(text.replace(/<(?=[a-zA-Z!/?])/g, "&lt;"), { async: false }) as string;
}
