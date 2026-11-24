import { renderSafeMarkdown } from "./markdown-safe";

/** Render trusted-staff markdown safely (raw HTML escaped, unsafe link schemes removed). */
export function renderMarkdown(md: string) {
  return renderSafeMarkdown(md);
}
