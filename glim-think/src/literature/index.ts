/**
 * Literature integration: barrel + unified `searchLiterature` orchestrator.
 *
 * Fans a query out to the requested sources in parallel, falling back to the
 * R2-backed search cache where possible. A single source failure must not
 * fail the overall request — failures are reported per-source via `errors`.
 */

import { searchArxiv } from "./arxiv";
import { searchSemanticScholar } from "./semantic_scholar";
import { searchOpenAlex } from "./openalex";
import {
  cachePapers,
  getCachedSearch,
  paperArtifactKey,
  putCachedSearch,
} from "./cache";
import type {
  Env,
  LiteraturePaper,
  LiteratureSearchResult,
  LiteratureSource,
} from "../types";

export { searchArxiv } from "./arxiv";
export { searchSemanticScholar } from "./semantic_scholar";
export { searchOpenAlex } from "./openalex";
export {
  cachePaper,
  cachePapers,
  getCachedSearch,
  putCachedSearch,
  paperArtifactKey,
  searchCacheKey,
} from "./cache";

export const ALL_SOURCES: readonly LiteratureSource[] = [
  "arxiv",
  "semantic_scholar",
  "openalex",
] as const;

const SOURCE_ALLOWLIST: ReadonlySet<LiteratureSource> = new Set(ALL_SOURCES);

/** Type guard usable from route handlers and other callers. */
export function isLiteratureSource(value: unknown): value is LiteratureSource {
  return typeof value === "string" && SOURCE_ALLOWLIST.has(value as LiteratureSource);
}

/**
 * Convert a raw `literature_papers` D1 row into the public LiteraturePaper
 * shape. Robust to missing/malformed authors_json.
 */
export function rowToPaper(row: Record<string, unknown>): LiteraturePaper {
  let authors: string[] = [];
  const raw = row.authors_json;
  if (typeof raw === "string" && raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) authors = parsed.filter((a): a is string => typeof a === "string");
    } catch {
      authors = [];
    }
  }
  return {
    doi: String(row.doi ?? ""),
    arxivId: (row.arxiv_id as string | null) ?? null,
    title: String(row.title ?? ""),
    abstract: String(row.abstract ?? ""),
    authors,
    year: typeof row.year === "number" ? row.year : null,
    venue: (row.venue as string | null) ?? null,
    source: row.source as LiteratureSource,
    fetchedAt: String(row.fetched_at ?? ""),
    rawArtifactKey: (row.raw_artifact_key as string | null) ?? null,
  };
}

export interface SearchLiteratureOptions {
  sources?: LiteratureSource[];
  max?: number;
  forceRefresh?: boolean;
}

type SourceFetcher = (env: Env, query: string, opts: { max?: number }) => Promise<LiteraturePaper[]>;

const FETCHERS: Record<LiteratureSource, SourceFetcher> = {
  arxiv: (env, q, o) => searchArxiv(env, q, o),
  semantic_scholar: (env, q, o) => searchSemanticScholar(env, q, o),
  openalex: (env, q, o) => searchOpenAlex(env, q, o),
};

function attachArtifactKeys(papers: LiteraturePaper[]): LiteraturePaper[] {
  // Pre-compute the artifact key the cache layer will use, so callers can
  // reference the paper in R2 even before the write completes.
  return papers.map((p) => {
    if (p.rawArtifactKey) return p;
    const id = p.arxivId || p.doi;
    if (!id) return p;
    return { ...p, rawArtifactKey: paperArtifactKey(p.source, id) };
  });
}

async function fetchOne(
  env: Env,
  source: LiteratureSource,
  query: string,
  max: number,
  forceRefresh: boolean,
): Promise<{ papers: LiteraturePaper[]; cached: boolean }> {
  if (!forceRefresh) {
    const cached = await getCachedSearch(env, source, query);
    if (cached && cached.length > 0) {
      return { papers: cached, cached: true };
    }
  }
  const fetched = await FETCHERS[source](env, query, { max });
  const enriched = attachArtifactKeys(fetched);
  // Best-effort persistence; don't await failure path explicitly.
  await putCachedSearch(env, source, query, enriched);
  await cachePapers(env, enriched);
  return { papers: enriched, cached: false };
}

/**
 * Run a query against the requested literature sources in parallel.
 * Always resolves; per-source failures are surfaced under `errors`.
 */
export async function searchLiterature(
  env: Env,
  query: string,
  options: SearchLiteratureOptions = {},
): Promise<LiteratureSearchResult> {
  const trimmed = query.trim();
  const sources = (options.sources && options.sources.length > 0
    ? options.sources
    : ALL_SOURCES.slice()) as LiteratureSource[];
  const max = Math.min(Math.max(options.max ?? 10, 1), 100);
  const forceRefresh = Boolean(options.forceRefresh);

  const result: LiteratureSearchResult = { results: {}, cached: {}, errors: {} };

  if (!trimmed) {
    for (const s of sources) {
      result.results[s] = [];
      result.cached[s] = false;
    }
    return result;
  }

  const settled = await Promise.allSettled(
    sources.map((s) => fetchOne(env, s, trimmed, max, forceRefresh)),
  );

  settled.forEach((outcome, i) => {
    const source = sources[i];
    if (outcome.status === "fulfilled") {
      result.results[source] = outcome.value.papers;
      result.cached[source] = outcome.value.cached;
    } else {
      console.error(`[literature] ${source} fetch failed:`, outcome.reason);
      result.results[source] = [];
      result.cached[source] = false;
      result.errors[source] = outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);
    }
  });

  return result;
}
