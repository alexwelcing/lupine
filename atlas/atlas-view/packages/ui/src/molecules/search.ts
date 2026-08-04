/**
 * Federated search: fan out across providers, merge, rank.
 *
 * Providers run in parallel and a slow/failing one can't sink the whole search
 * (each is wrapped so it resolves to []). Ranking is a pure function so it's
 * unit-testable independent of any data source.
 */
import type { MoleculeHit, MoleculeProvider, MoleculeQuery, MoleculeSourceId } from './types';

const DEFAULT_PER_SOURCE = 25;

// Source ordering used only as a stable tie-break (local/curated first).
const SOURCE_PRIORITY: Record<MoleculeSourceId, number> = {
  gallery: 0,
  library: 1,
  saved: 3,
  nist: 4,
  omol: 5,
  social: 2,
  pubchem: 6,
};

function norm(s: string): string {
  return s.toLowerCase().trim();
}

/** Text relevance of a hit to the query text, in [0,1]. Pure. */
export function textScore(hit: MoleculeHit, text: string): number {
  const q = norm(text);
  if (!q) return 0.3; // browsing: everything is mildly relevant
  const title = norm(hit.title);
  if (title === q) return 1;
  if (title.startsWith(q)) return 0.85;
  if (title.includes(q)) return 0.7;
  if (hit.formula && norm(hit.formula).includes(q)) return 0.65;
  if (hit.elements?.some((el) => norm(el) === q)) return 0.6;
  const meta = norm([hit.subtitle ?? '', ...(hit.tags ?? [])].join(' '));
  if (meta.includes(q)) return 0.45;
  return 0.2; // provider returned it but the text barely matches
}

/** Final score combines the provider's own score with the text match. Pure. */
export function scoreHit(hit: MoleculeHit, query: MoleculeQuery): number {
  return Math.max(hit.score ?? 0, textScore(hit, query.text));
}

/** Rank + de-duplicate hits. Pure — no I/O. */
export function rankHits(hits: MoleculeHit[], query: MoleculeQuery): MoleculeHit[] {
  const seen = new Set<string>();
  const deduped: Array<{ hit: MoleculeHit; score: number }> = [];
  for (const hit of hits) {
    const key = `${hit.source}:${hit.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ hit, score: scoreHit(hit, query) });
  }
  return deduped
    .sort(
      (a, b) =>
        b.score - a.score ||
        SOURCE_PRIORITY[a.hit.source] - SOURCE_PRIORITY[b.hit.source] ||
        a.hit.title.localeCompare(b.hit.title),
    )
    .map(({ hit }) => hit);
}

/** Run the query across the enabled providers and return ranked, merged hits. */
export async function searchMolecules(
  query: MoleculeQuery,
  providers: MoleculeProvider[],
): Promise<MoleculeHit[]> {
  const wanted = query.sources;
  const enabled = providers.filter(
    (p) => p.isAvailable() && (!wanted || wanted.includes(p.id)),
  );
  const perSource = query.limit ?? DEFAULT_PER_SOURCE;
  const scoped: MoleculeQuery = { ...query, limit: perSource };

  const batches = await Promise.all(
    enabled.map((p) =>
      p
        .search(scoped)
        .then((hits) => hits.slice(0, perSource))
        .catch(() => [] as MoleculeHit[]),
    ),
  );
  return rankHits(batches.flat(), query);
}
