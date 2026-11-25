/*
 * Articles can be written in English, Dhivehi or both.
 * Rule (Site settings → "Show single-language articles on both versions", on by default):
 * an article with only one language version appears on both the English and the Dhivehi
 * website, in the language it was written in. Pure functions (safe in client components).
 */
type PostText = { title: string; titleDv?: string | null; excerpt?: string | null; excerptDv?: string | null; body?: string; bodyDv?: string | null };

export const hasEnglish = (p: PostText) => !!p.title?.trim();
export const hasDhivehi = (p: PostText) => !!p.titleDv?.trim();

/** The language version to show on the English (`en`) or Dhivehi (`dv`) website. */
export function postIn(p: PostText, lang: string) {
  const dv = lang === "dv" ? hasDhivehi(p) : !hasEnglish(p) && hasDhivehi(p);
  return {
    dv,
    title: (dv ? p.titleDv : p.title) || p.title || p.titleDv || "",
    excerpt: (dv ? p.excerptDv : p.excerpt) || null,
    body: (dv ? p.bodyDv : p.body) || "",
  };
}
