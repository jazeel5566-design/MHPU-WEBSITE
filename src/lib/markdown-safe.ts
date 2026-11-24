import { Marked } from "marked";

/*
 * Markdown → HTML for articles and campaigns (used on the server and in the editor preview).
 *  - Raw HTML is escaped (authors can't add tags or event handlers).
 *  - Link and image URLs are restricted to http(s), mailto, tel and same-site paths, so a
 *    "javascript:" or "data:" link can't be smuggled in (including entity/whitespace tricks).
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

const md = new Marked({ gfm: true, breaks: true });
md.use({
  walkTokens(token) {
    if ((token.type === "link" || token.type === "image") && !isSafeUrl(token.href)) token.href = "#";
  },
});

export function renderSafeMarkdown(text: string) {
  return md.parse(text.replace(/<(?=[a-zA-Z!/?])/g, "&lt;"), { async: false }) as string;
}
