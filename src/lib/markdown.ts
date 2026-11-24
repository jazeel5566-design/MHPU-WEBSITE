import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

/** Render trusted-staff markdown. Raw HTML is escaped so authors can't inject script. */
export function renderMarkdown(md: string) {
  const escaped = md.replace(/<(?=[a-zA-Z!/])/g, "&lt;");
  return marked.parse(escaped, { async: false }) as string;
}
