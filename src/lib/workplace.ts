/*
 * Match the hospital/company an applicant types to a workplace union.
 * Each union's `workplace` field can hold several names separated by commas, e.g.
 * "Indira Gandhi Memorial Hospital, IGMH". Pure function: used by the join form (live)
 * and re-checked on the server.
 */
export type UnionForMatch = { id: string; name: string; workplace: string | null; matchNames?: string | null };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const split = (s: string | null | undefined) => (s ?? "").split(",").map((a) => a.trim()).filter(Boolean);
/** Workplaces shown to the public (and suggested on the join form). */
export const workplacesOf = (u: UnionForMatch) => split(u.workplace);
/** Every name used for matching: public workplaces + hidden spellings/abbreviations. */
export const aliasesOf = (u: UnionForMatch) => [...split(u.workplace), ...split(u.matchNames)];

export function matchWorkplaceUnion<T extends UnionForMatch>(employer: string, unions: T[]): T | null {
  const e = norm(employer);
  if (e.length < 2) return null;
  let best: { u: T; score: number } | null = null;
  for (const u of unions) {
    for (const alias of aliasesOf(u)) {
      const a = norm(alias);
      if (!a) continue;
      let score = 0;
      if (e === a) score = 3; // exact
      else if (a.length >= 4 && ` ${e} `.includes(` ${a} `)) score = 2; // "IGMH Malé" contains "igmh"
      else if (e.length >= 6 && ` ${a} `.includes(` ${e} `)) score = 1; // "Indira Gandhi" inside the full name
      if (score && (!best || score > best.score)) best = { u, score };
    }
  }
  return best?.u ?? null;
}
