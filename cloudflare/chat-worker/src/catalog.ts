// ═══════════════════════════════════════════════════════════════════
// catalog.ts — server-side `search_catalog` tool implementation.
//
// The model calls `search_catalog({ query, elements? })` to find the
// molecule the user is describing. We score every catalog entry against
// the query with a lightweight fuzzy matcher (token overlap + substring +
// element filter) and return the top ~5 results. No external deps — this
// runs on the Workers runtime and is unit-tested in isolation.
// ═══════════════════════════════════════════════════════════════════

import type { CatalogEntry } from "./types";

/** A trimmed catalog hit returned to the model. */
export interface CatalogHit {
  id: string;
  title: string;
  formula?: string;
  elements?: string[];
  domain?: string;
}

export interface SearchCatalogInput {
  query: string;
  elements?: string[];
}

const DEFAULT_LIMIT = 5;

/** Lowercase, strip punctuation to spaces, collapse whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Split a normalized string into non-empty tokens. */
function tokenize(s: string): string[] {
  const norm = normalize(s);
  return norm.length ? norm.split(" ") : [];
}

/** Build the searchable text blob for an entry (title/subtitle/formula/tags/id). */
function entryHaystack(entry: CatalogEntry): string {
  return [
    entry.title,
    entry.subtitle ?? "",
    entry.formula ?? "",
    entry.domain ?? "",
    entry.id,
    ...(entry.tags ?? []),
    ...(entry.elements ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Case-insensitive set of an entry's element symbols. */
function entryElementSet(entry: CatalogEntry): Set<string> {
  return new Set((entry.elements ?? []).map((e) => e.toLowerCase()));
}

/**
 * Score one entry against the query. Higher is better; 0 means "no signal".
 * Heuristics, in rough order of weight:
 *   - exact id / title match            → large boost
 *   - full-query substring in haystack  → strong boost
 *   - per-token: exact token match, prefix match, substring match
 *   - formula token matches             → boost (chemistry queries)
 *   - requested-element coverage        → boost; missing a requested
 *                                         element is a soft penalty, not a
 *                                         hard filter (keeps recall high)
 */
export function scoreEntry(
  entry: CatalogEntry,
  queryTokens: string[],
  normalizedQuery: string,
  requestedElements: string[],
): number {
  const haystack = normalize(entryHaystack(entry));
  if (!haystack) return 0;

  const haystackTokens = new Set(haystack.split(" "));
  const idNorm = normalize(entry.id);
  const titleNorm = normalize(entry.title);
  const formulaTokens = new Set(tokenize(entry.formula ?? ""));

  let score = 0;

  if (normalizedQuery.length > 0) {
    if (idNorm === normalizedQuery || titleNorm === normalizedQuery) score += 100;
    if (haystack.includes(normalizedQuery)) score += 25;
  }

  for (const token of queryTokens) {
    if (token.length === 0) continue;
    if (haystackTokens.has(token)) {
      score += 10;
    } else if (token.length >= 3) {
      // Prefix match against any haystack token. Require BOTH sides to be at
      // least 3 chars so single-letter haystack tokens (e.g. element symbols
      // like "n"/"o" expanded from `elements`) don't spuriously match a long
      // query token via startsWith.
      let prefixed = false;
      for (const ht of haystackTokens) {
        if (ht.length < 3) continue;
        if (ht.startsWith(token) || token.startsWith(ht)) {
          score += 5;
          prefixed = true;
          break;
        }
      }
      // Substring fallback: the whole token must appear, and be long enough
      // that the match is meaningful (avoids matching common short fragments).
      if (!prefixed && token.length >= 4 && haystack.includes(token)) score += 3;
    }
    if (formulaTokens.has(token)) score += 6;
  }

  // Element filter (soft): reward coverage, lightly penalize gaps so a query
  // that names elements still surfaces near-matches rather than nothing.
  if (requestedElements.length > 0) {
    const have = entryElementSet(entry);
    let covered = 0;
    for (const el of requestedElements) {
      if (have.has(el.toLowerCase())) covered += 1;
    }
    score += covered * 8;
    const missing = requestedElements.length - covered;
    score -= missing * 4;
  }

  return score;
}

/**
 * Execute the `search_catalog` tool against the request's catalog array.
 * Returns the top `limit` hits (default 5) sorted by descending score,
 * trimmed to the fields the model needs. Entries with a non-positive
 * score are dropped. Ties break by original catalog order (stable).
 */
export function searchCatalog(
  catalog: CatalogEntry[],
  input: SearchCatalogInput,
  limit: number = DEFAULT_LIMIT,
): CatalogHit[] {
  if (!Array.isArray(catalog) || catalog.length === 0) return [];

  const normalizedQuery = normalize(input.query ?? "");
  const queryTokens = tokenize(input.query ?? "");
  const requestedElements = (input.elements ?? []).filter(
    (e): e is string => typeof e === "string" && e.trim().length > 0,
  );

  // If there is neither a query nor element filter, return a stable prefix
  // of the catalog so the model still gets options instead of nothing.
  const noSignal = queryTokens.length === 0 && requestedElements.length === 0;

  const scored = catalog.map((entry, index) => ({
    entry,
    index,
    score: noSignal
      ? 1
      : scoreEntry(entry, queryTokens, normalizedQuery, requestedElements),
  }));

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .slice(0, limit)
    .map(({ entry }) => trimEntry(entry));
}

function trimEntry(entry: CatalogEntry): CatalogHit {
  const hit: CatalogHit = { id: entry.id, title: entry.title };
  if (entry.formula) hit.formula = entry.formula;
  if (entry.elements && entry.elements.length) hit.elements = entry.elements;
  if (entry.domain) hit.domain = entry.domain;
  return hit;
}
