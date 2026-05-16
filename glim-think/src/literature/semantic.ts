/**
 * Semantic corpus search — Vectorize query interface.
 *
 * Embeds query → queries glim-corpus Vectorize → enriches with D1 metadata.
 * Runs BEFORE external API calls so agents can find papers already in corpus.
 */
import type { Env, LiteraturePaper, LiteratureSource } from "../types";

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

export interface SemanticMatch {
  vectorId: string;
  score: number;
  doi: string;
  type: "abstract" | "insight";
  hypothesisId?: string;
  title?: string;
}

export interface SemanticSearchResult {
  matches: SemanticMatch[];
  papers: LiteraturePaper[];
  enrichedCount: number;
  latencyMs: number;
}

async function embedQuery(env: Env, query: string): Promise<number[]> {
  const response = await env.AI.run(EMBEDDING_MODEL, { text: [query] });
  return (response as { data: number[][] }).data[0];
}

/**
 * Search the local corpus by semantic similarity.
 */
export async function semanticSearch(
  env: Env,
  query: string,
  opts?: { topK?: number; minScore?: number; type?: "abstract" | "insight" },
): Promise<SemanticSearchResult> {
  const start = Date.now();
  const topK = Math.min(Math.max(opts?.topK ?? 10, 1), 50);
  const minScore = opts?.minScore ?? 0.3;

  if (!env.CORPUS_INDEX) {
    return { matches: [], papers: [], enrichedCount: 0, latencyMs: Date.now() - start };
  }

  const queryEmbedding = await embedQuery(env, query);

  const filter: Record<string, unknown> = {};
  if (opts?.type) filter.type = opts.type;

  const queryOptions: Record<string, unknown> = {
    topK,
    returnMetadata: "all",
  };
  if (Object.keys(filter).length > 0) {
    queryOptions.filter = filter;
  }

  const vectorResult = await env.CORPUS_INDEX.query(queryEmbedding, queryOptions as VectorizeQueryOptions);

  const matches: SemanticMatch[] = (vectorResult.matches ?? [])
    .filter((m) => (m.score ?? 0) >= minScore)
    .map((m) => {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      return {
        vectorId: m.id,
        score: m.score ?? 0,
        doi: String(meta.doi ?? ""),
        type: (meta.type as "abstract" | "insight") ?? "abstract",
        hypothesisId: meta.hypothesis_id as string | undefined,
        title: meta.title as string | undefined,
      };
    });

  // Enrich with D1 paper metadata
  const uniqueDois = [...new Set(matches.map((m) => m.doi).filter(Boolean))];
  const papers: LiteraturePaper[] = [];

  for (const doi of uniqueDois) {
    try {
      const row = await env.LEDGER
        .prepare(
          `SELECT doi, arxiv_id, title, abstract, authors_json, year, venue, source, fetched_at, raw_artifact_key
             FROM literature_papers WHERE doi = ?1`,
        )
        .bind(doi)
        .first<Record<string, unknown>>();
      if (!row) continue;
      let authors: string[] = [];
      if (typeof row.authors_json === "string" && row.authors_json) {
        try { authors = JSON.parse(row.authors_json).filter((a: unknown): a is string => typeof a === "string"); } catch { /* skip */ }
      }
      papers.push({
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
      });
    } catch { /* skip failed lookups */ }
  }

  return { matches, papers, enrichedCount: papers.length, latencyMs: Date.now() - start };
}

/** Quick check: do we already have a relevant paper in the corpus? */
export async function corpusHasRelevantPaper(
  env: Env,
  query: string,
  threshold = 0.7,
): Promise<{ found: boolean; bestScore: number; bestDoi?: string }> {
  try {
    const result = await semanticSearch(env, query, { topK: 1, minScore: threshold, type: "abstract" });
    if (result.matches.length > 0) {
      return { found: true, bestScore: result.matches[0].score, bestDoi: result.matches[0].doi };
    }
    return { found: false, bestScore: 0 };
  } catch {
    return { found: false, bestScore: 0 };
  }
}

/** Corpus stats for the lab broadcast health check. */
export async function corpusStats(env: Env): Promise<{ available: boolean; description?: string }> {
  if (!env.CORPUS_INDEX) return { available: false, description: "CORPUS_INDEX not bound" };
  try {
    const info = await env.CORPUS_INDEX.describe();
    const count = (info as unknown as Record<string, unknown>).vectorsCount ?? 0;
    return { available: true, description: `${count} vectors indexed` };
  } catch (e) {
    return { available: false, description: e instanceof Error ? e.message : String(e) };
  }
}
