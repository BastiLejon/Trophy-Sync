/**
 * Namensnormalisierung und Ähnlichkeitsmaße für automatische Mapping-Vorschläge.
 * Bewusst ohne externe Abhängigkeiten – deterministisch und schnell.
 */

const EDITION_NOISE = [
  "ps4", "ps5", "ps3", "ps vita", "psvita", "playstation 4", "playstation 5", "playstation",
  "xbox one", "xbox series x|s", "xbox series", "xbox", "windows", "pc",
  "voidheart edition", "game of the year edition", "goty edition", "goty", "definitive edition",
  "deluxe edition", "ultimate edition", "complete edition", "gold edition", "standard edition",
  "director's cut", "directors cut", "remastered", "remaster", "edition", "trophies", "trophäen",
];

const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };

export function normalizeName(input: string): string {
  let s = input
    .replace(/[\u2122\u00ae\u00a9]/g, " ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[:\-\u2013\u2014_/\\|.,!?'"\u2019`()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const noise of EDITION_NOISE) {
    s = s.replace(new RegExp(`(^|\\s)${noise.replace(/[|]/g, "\\|")}(\\s|$)`, "g"), " ");
  }
  s = s
    .split(" ")
    .filter(Boolean)
    .map((w) => ROMAN[w] ?? w)
    .join(" ");
  return s.trim();
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const padded = ` ${s} `;
  for (let i = 0; i < padded.length - 1; i++) {
    const g = padded.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice-Koeffizient über Zeichen-Bigramme (0..1). */
export function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ga = bigrams(a);
  const gb = bigrams(b);
  let overlap = 0;
  let total = 0;
  for (const [g, n] of ga) {
    total += n;
    const o = gb.get(g);
    if (o) overlap += Math.min(n, o);
  }
  for (const n of gb.values()) total += n;
  return total === 0 ? 0 : (2 * overlap) / total;
}

/** Jaccard über Wort-Tokens (0..1). */
export function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/** Kombinierte Ähnlichkeit zweier (roher) Namen, 0..1. */
export function nameSimilarity(rawA: string, rawB: string): number {
  const a = normalizeName(rawA);
  const b = normalizeName(rawB);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const dice = diceSimilarity(a, b);
  const tokens = tokenSimilarity(a, b);
  // Enthält der eine Name den anderen vollständig (z.B. Untertitel), gilt ein Bonus.
  const containment = a.includes(b) || b.includes(a) ? 0.9 : 0;
  return Math.max(0.65 * dice + 0.35 * tokens, containment);
}

export interface Candidate<T> {
  item: T;
  score: number;
}

/**
 * Findet für ein Ziel den besten Kandidaten anhand von Name (und optional Beschreibung).
 * Beschreibungen zählen schwächer als Namen, helfen aber bei umbenannten Einträgen.
 */
export function rankCandidates<T>(
  target: { name: string; detail?: string },
  candidates: T[],
  accessor: (c: T) => { name: string; detail?: string },
  limit = 3,
): Candidate<T>[] {
  const ranked = candidates
    .map((item) => {
      const c = accessor(item);
      const byName = nameSimilarity(target.name, c.name);
      const byDetail =
        target.detail && c.detail ? nameSimilarity(target.detail, c.detail) : 0;
      // Identische Beschreibung bei abweichendem Namen ist ein starkes Signal.
      const score = Math.max(byName, byDetail >= 0.95 ? 0.9 : 0, byName * 0.7 + byDetail * 0.3);
      return { item, score: Math.round(score * 1000) / 1000 };
    })
    .filter((c) => c.score > 0.3)
    .sort((x, y) => y.score - x.score);
  return ranked.slice(0, limit);
}

export function bestCandidate<T>(
  target: { name: string; detail?: string },
  candidates: T[],
  accessor: (c: T) => { name: string; detail?: string },
): Candidate<T> | null {
  return rankCandidates(target, candidates, accessor, 1)[0] ?? null;
}
