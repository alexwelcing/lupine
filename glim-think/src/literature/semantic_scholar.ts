/**
 * Semantic Scholar search adapter.
 *
 * Endpoint: https://api.semanticscholar.org/graph/v1/paper/search
 * Public tier is rate-limited; we keep requests serialized via a token bucket.
 */

import type { LiteraturePaper } from "../types";
import { createRateLimiter } from "./rate_limit";

const ENDPOINT = "https://api.semanticscholar.org/graph/v1/paper/search";
const FIELDS = "title,abstract,authors,year,venue,externalIds";
const rateLimit = createRateLimiter(1000);

interface S2Author {
  name?: string;
}

interface S2ExternalIds {
  DOI?: string;
  ArXiv?: string;
  [k: string]: string | undefined;
}

interface S2Paper {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  authors?: S2Author[];
  year?: number | null;
  venue?: string | null;
  externalIds?: S2ExternalIds | null;
}

interface S2SearchResponse {
  total?: number;
  data?: S2Paper[];
}

export interface SemanticScholarSearchOptions {
  max?: number;
  signal?: AbortSignal;
}

function normalizePaper(p: S2Paper, fetchedAt: string): LiteraturePaper | null {
  const title = (p.title ?? "").trim();
  if (!title) return null;
  const ext = p.externalIds ?? {};
  const arxivId = ext.ArXiv ?? null;
  const doi = ext.DOI ?? (arxivId ? `arxiv:${arxivId}` : `s2:${p.paperId ?? title.slice(0, 64)}`);
  const authors = Array.isArray(p.authors)
    ? p.authors.map((a) => (a?.name ?? "").trim()).filter(Boolean)
    : [];
  const externalIds: Record<string, string> = {};
  for (const [k, v] of Object.entries(ext)) {
    if (typeof v === "string") externalIds[k] = v;
  }
  if (p.paperId) externalIds.semanticScholar = p.paperId;

  return {
    doi,
    arxivId,
    title,
    abstract: (p.abstract ?? "").trim(),
    authors,
    year: typeof p.year === "number" ? p.year : null,
    venue: p.venue ?? null,
    source: "semantic_scholar",
    fetchedAt,
    rawArtifactKey: null,
    externalIds: Object.keys(externalIds).length > 0 ? externalIds : undefined,
  };
}

export async function searchSemanticScholar(
  query: string,
  options: SemanticScholarSearchOptions = {},
): Promise<LiteraturePaper[]> {
  const max = Math.min(Math.max(options.max ?? 10, 1), 100);
  const safeQuery = query.trim();
  if (!safeQuery) return [];

  await rateLimit();

  const url =
    `${ENDPOINT}?query=${encodeURIComponent(safeQuery)}` +
    `&limit=${max}` +
    `&fields=${encodeURIComponent(FIELDS)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "glim-think/1.0 (mailto:research@glim)",
    },
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`Semantic Scholar HTTP ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as S2SearchResponse;
  const fetchedAt = new Date().toISOString();
  const items = Array.isArray(data.data) ? data.data : [];
  const out: LiteraturePaper[] = [];
  for (const p of items) {
    const np = normalizePaper(p, fetchedAt);
    if (np) out.push(np);
  }
  return out;
}
