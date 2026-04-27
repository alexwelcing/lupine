/**
 * Literature cache layer.
 *
 * - Search-result cache: R2 at `literature/searches/{source}/{sha256(query)}.json`
 *   with a 7-day TTL enforced by `cachedAt` field.
 * - Per-paper cache: R2 at `literature/papers/{source}/{id}.json` plus an
 *   upsert into the `literature_papers` D1 table.
 *
 * All operations are best-effort: cache misses or write failures must NOT
 * fail the upstream fetch — they're logged and the search continues.
 */

import type { Env, LiteraturePaper, LiteratureSource } from "../types";

const SEARCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TEXT_ENCODER = new TextEncoder();

interface CachedSearch {
  cachedAt: string;
  query: string;
  papers: LiteraturePaper[];
}

/**
 * SHA-256 of a string, hex-encoded. Used to make safe R2 keys from queries.
 */
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", TEXT_ENCODER.encode(input));
  const bytes = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export function searchCacheKey(source: LiteratureSource, queryHash: string): string {
  return `literature/searches/${source}/${queryHash}.json`;
}

export function paperArtifactKey(source: LiteratureSource, id: string): string {
  // Sanitize id so it's R2-safe (avoid leading slashes, etc).
  const safe = id.replace(/[^a-zA-Z0-9._\-:]/g, "_");
  return `literature/papers/${source}/${safe}.json`;
}

/**
 * Load a cached search payload if present and not stale.
 * Returns null on miss, parse failure, or staleness.
 */
export async function getCachedSearch(
  env: Env,
  source: LiteratureSource,
  query: string,
): Promise<LiteraturePaper[] | null> {
  try {
    const hash = await sha256Hex(query);
    const obj = await env.ARTIFACTS.get(searchCacheKey(source, hash));
    if (!obj) return null;
    const text = await obj.text();
    const parsed = JSON.parse(text) as CachedSearch;
    if (!parsed.cachedAt) return null;
    const age = Date.now() - new Date(parsed.cachedAt).getTime();
    if (Number.isNaN(age) || age > SEARCH_TTL_MS) return null;
    return Array.isArray(parsed.papers) ? parsed.papers : null;
  } catch (e) {
    console.warn(`[literature.cache] getCachedSearch(${source}) failed:`, e);
    return null;
  }
}

/**
 * Persist a search result to R2 with the current timestamp.
 */
export async function putCachedSearch(
  env: Env,
  source: LiteratureSource,
  query: string,
  papers: LiteraturePaper[],
): Promise<void> {
  try {
    const hash = await sha256Hex(query);
    const payload: CachedSearch = {
      cachedAt: new Date().toISOString(),
      query,
      papers,
    };
    await env.ARTIFACTS.put(
      searchCacheKey(source, hash),
      JSON.stringify(payload),
      { httpMetadata: { contentType: "application/json" } },
    );
  } catch (e) {
    console.warn(`[literature.cache] putCachedSearch(${source}) failed:`, e);
  }
}

/**
 * Cache a single paper to R2 and upsert into the D1 papers table.
 * R2 and D1 writes run concurrently; failures are logged, not thrown.
 * Returns the artifact key written (or null if the R2 put failed).
 */
export async function cachePaper(
  env: Env,
  paper: LiteraturePaper,
): Promise<string | null> {
  const id = paper.arxivId || paper.doi || (await sha256Hex(paper.title || "untitled"));
  const key = paperArtifactKey(paper.source, id);

  const r2Put = env.ARTIFACTS.put(key, JSON.stringify(paper), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { source: paper.source },
  })
    .then(() => key)
    .catch((e) => {
      console.warn(`[literature.cache] R2 put failed for ${key}:`, e);
      return null as string | null;
    });

  // D1 upsert uses `key` (not the R2 outcome) so it can run in parallel; the
  // raw_artifact_key column is best-effort metadata, not a strict FK.
  const d1Put = env.LEDGER.prepare(
    `INSERT INTO literature_papers
      (doi, arxiv_id, title, abstract, authors_json, year, venue, source, fetched_at, raw_artifact_key)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
     ON CONFLICT(doi) DO UPDATE SET
      arxiv_id = excluded.arxiv_id,
      title = excluded.title,
      abstract = excluded.abstract,
      authors_json = excluded.authors_json,
      year = excluded.year,
      venue = excluded.venue,
      source = excluded.source,
      fetched_at = excluded.fetched_at,
      raw_artifact_key = COALESCE(excluded.raw_artifact_key, literature_papers.raw_artifact_key)`,
  )
    .bind(
      paper.doi,
      paper.arxivId,
      paper.title,
      paper.abstract,
      JSON.stringify(paper.authors),
      paper.year,
      paper.venue,
      paper.source,
      paper.fetchedAt,
      key,
    )
    .run()
    .catch((e) => {
      console.warn(`[literature.cache] D1 upsert failed for ${paper.doi}:`, e);
    });

  const [artifactKey] = await Promise.all([r2Put, d1Put]);
  return artifactKey;
}

/**
 * Bulk cache helper. Runs paper writes concurrently; per-paper failures are
 * already logged inside cachePaper, so this never rejects.
 */
export async function cachePapers(env: Env, papers: LiteraturePaper[]): Promise<void> {
  await Promise.allSettled(papers.map((p) => cachePaper(env, p)));
}
