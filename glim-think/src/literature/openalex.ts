/**
 * OpenAlex search adapter.
 *
 * Endpoint: https://api.openalex.org/works
 * Polite pool requires a contact in the User-Agent header (or `mailto` query
 * parameter). We send both for redundancy.
 */

import type { LiteraturePaper } from "../types";
import { createRateLimiter } from "./rate_limit";

const ENDPOINT = "https://api.openalex.org/works";
const USER_AGENT = "glim-think/1.0 (mailto:research@glim)";
const rateLimit = createRateLimiter(200); // OpenAlex polite pool ≈ 10 req/s

interface OAAuthor {
  author?: { display_name?: string };
}

interface OAHostVenue {
  display_name?: string;
}

interface OAPrimaryLocation {
  source?: { display_name?: string };
}

interface OAWork {
  id?: string;
  doi?: string | null;
  ids?: Record<string, string | null | undefined>;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  authorships?: OAAuthor[];
  host_venue?: OAHostVenue | null;
  primary_location?: OAPrimaryLocation | null;
}

interface OAResponse {
  meta?: { count?: number };
  results?: OAWork[];
}

export interface OpenAlexSearchOptions {
  max?: number;
  signal?: AbortSignal;
}

/**
 * OpenAlex stores abstracts as inverted indices for licensing reasons.
 * Reconstruct a plausible string by scattering tokens across positions.
 */
function reconstructAbstract(idx: Record<string, number[]> | null | undefined): string {
  if (!idx) return "";
  const positions: Array<{ pos: number; word: string }> = [];
  for (const [word, posList] of Object.entries(idx)) {
    if (!Array.isArray(posList)) continue;
    for (const pos of posList) positions.push({ pos, word });
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(" ");
}

function stripDoiPrefix(doi: string | null | undefined): string | null {
  if (!doi) return null;
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
}

function normalizeWork(w: OAWork, fetchedAt: string): LiteraturePaper | null {
  const title = (w.title ?? w.display_name ?? "").trim();
  if (!title) return null;

  const ids = w.ids ?? {};
  const arxivRaw = (ids.arxiv ?? "").toString();
  const arxivId = arxivRaw ? arxivRaw.replace(/^https?:\/\/arxiv\.org\/abs\//i, "") : null;
  const doi = stripDoiPrefix(w.doi) ?? stripDoiPrefix((ids.doi as string | undefined) ?? null);
  const fallbackId = w.id ? w.id.replace(/^https?:\/\/openalex\.org\//i, "") : title.slice(0, 64);
  const finalDoi = doi ?? (arxivId ? `arxiv:${arxivId}` : `openalex:${fallbackId}`);

  const authors = Array.isArray(w.authorships)
    ? w.authorships
        .map((a) => (a?.author?.display_name ?? "").trim())
        .filter(Boolean)
    : [];

  const venue =
    w.primary_location?.source?.display_name ?? w.host_venue?.display_name ?? null;

  const externalIds: Record<string, string> = {};
  for (const [k, v] of Object.entries(ids)) {
    if (typeof v === "string" && v) externalIds[k] = v;
  }

  return {
    doi: finalDoi,
    arxivId,
    title,
    abstract: reconstructAbstract(w.abstract_inverted_index),
    authors,
    year: typeof w.publication_year === "number" ? w.publication_year : null,
    venue,
    source: "openalex",
    fetchedAt,
    rawArtifactKey: null,
    externalIds: Object.keys(externalIds).length > 0 ? externalIds : undefined,
  };
}

export async function searchOpenAlex(
  query: string,
  options: OpenAlexSearchOptions = {},
): Promise<LiteraturePaper[]> {
  const max = Math.min(Math.max(options.max ?? 10, 1), 200);
  const safeQuery = query.trim();
  if (!safeQuery) return [];

  await rateLimit();

  const url =
    `${ENDPOINT}?search=${encodeURIComponent(safeQuery)}` +
    `&per_page=${max}` +
    `&mailto=research@glim`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`OpenAlex HTTP ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as OAResponse;
  const fetchedAt = new Date().toISOString();
  const items = Array.isArray(data.results) ? data.results : [];
  const out: LiteraturePaper[] = [];
  for (const w of items) {
    const np = normalizeWork(w, fetchedAt);
    if (np) out.push(np);
  }
  return out;
}
