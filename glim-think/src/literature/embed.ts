/**
 * Corpus embedding pipeline — Vectorize integration.
 *
 * Embeds paper abstracts (and optionally key findings from insights) into
 * the `glim-corpus` Vectorize index so the Literaturist can perform
 * semantic search across the entire local corpus before hitting external
 * APIs.
 *
 * Embedding model: @cf/baai/bge-base-en-v1.5 (768-dim, free on Workers AI).
 *
 * Vector metadata schema:
 *   - doi: string           (paper identifier)
 *   - source: string        (arxiv | semantic_scholar | openalex | manual)
 *   - year: number | null
 *   - type: "abstract" | "insight"
 *   - hypothesis_id?: string (only for insight vectors)
 */

import type { Env, LiteraturePaper } from "../types";

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
const VECTOR_DIMS = 768;
const MAX_BATCH = 100; // Vectorize upsert limit

export interface EmbedResult {
  embedded: number;
  skipped: number;
  errors: string[];
}

/**
 * Build the text payload for embedding a paper. We concatenate title +
 * first 1500 chars of abstract — this captures the key information
 * without exceeding the model's 512-token sweet spot.
 */
function paperEmbedText(paper: { title: string; abstract: string }): string {
  const abs = (paper.abstract || "").slice(0, 1500);
  return `${paper.title}\n\n${abs}`.trim();
}

/**
 * Generate embeddings for a batch of texts using Workers AI.
 * Returns float arrays in the same order as input.
 */
async function embedTexts(
  env: Env,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await env.AI.run(EMBEDDING_MODEL, {
    text: texts,
  });

  // Workers AI returns { shape: [n, 768], data: number[][] }
  return (response as { data: number[][] }).data;
}

/**
 * Embed a single paper and upsert into Vectorize.
 * Call this on paper ingest (inside cachePaper flow).
 */
export async function embedPaper(
  env: Env,
  paper: LiteraturePaper,
): Promise<{ ok: boolean; vectorId?: string; error?: string }> {
  if (!env.CORPUS_INDEX) {
    return { ok: false, error: "CORPUS_INDEX binding not available" };
  }

  const text = paperEmbedText(paper);
  if (text.length < 20) {
    return { ok: false, error: "paper text too short for embedding" };
  }

  try {
    const [embedding] = await embedTexts(env, [text]);
    const vectorId = `paper:${paper.doi}`;

    await env.CORPUS_INDEX.upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          doi: paper.doi,
          source: paper.source,
          year: paper.year ?? 0,
          type: "abstract",
          title: paper.title.slice(0, 200),
        },
      },
    ]);

    return { ok: true, vectorId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Embed a literature insight (key finding for a hypothesis).
 * This lets semantic search surface relevant insights across hypotheses.
 */
export async function embedInsight(
  env: Env,
  opts: {
    insight_id: string;
    paper_doi: string;
    hypothesis_id: string;
    key_finding: string;
    paper_title?: string;
  },
): Promise<{ ok: boolean; vectorId?: string; error?: string }> {
  if (!env.CORPUS_INDEX) {
    return { ok: false, error: "CORPUS_INDEX binding not available" };
  }

  const text = `${opts.paper_title ?? ""}\n\n${opts.key_finding}`.trim();
  if (text.length < 15) {
    return { ok: false, error: "insight text too short" };
  }

  try {
    const [embedding] = await embedTexts(env, [text]);
    const vectorId = `insight:${opts.insight_id}`;

    await env.CORPUS_INDEX.upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          doi: opts.paper_doi,
          hypothesis_id: opts.hypothesis_id,
          type: "insight",
          source: "d1",
          year: 0,
          title: opts.key_finding.slice(0, 200),
        },
      },
    ]);

    return { ok: true, vectorId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

interface D1PaperRow {
  doi: string;
  arxiv_id: string | null;
  title: string;
  abstract: string;
  authors_json: string;
  year: number | null;
  venue: string | null;
  source: string;
  fetched_at: string;
}

/**
 * Backfill: embed all papers in D1 that aren't yet in Vectorize.
 * Runs in batches of MAX_BATCH to stay within Workers CPU limits.
 *
 * Returns stats on how many were embedded, skipped (already present
 * or too short), and any errors.
 */
export async function backfillCorpusEmbeddings(
  env: Env,
  opts?: { limit?: number },
): Promise<EmbedResult> {
  if (!env.CORPUS_INDEX) {
    return { embedded: 0, skipped: 0, errors: ["CORPUS_INDEX not bound"] };
  }

  const limit = Math.min(opts?.limit ?? 500, 1000);
  const result: EmbedResult = { embedded: 0, skipped: 0, errors: [] };

  // Fetch papers that need embedding. We don't track "already embedded"
  // in D1 — Vectorize upsert is idempotent, so re-embedding is safe
  // but wasteful. For the initial backfill this is fine.
  const rows = await env.LEDGER
    .prepare(
      `SELECT doi, arxiv_id, title, abstract, authors_json, year, venue, source, fetched_at
         FROM literature_papers
        ORDER BY fetched_at DESC
        LIMIT ?1`,
    )
    .bind(limit)
    .all<D1PaperRow>()
    .catch(() => ({ results: [] as D1PaperRow[] }));

  const papers = rows.results ?? [];
  if (papers.length === 0) {
    return result;
  }

  // Process in batches
  for (let i = 0; i < papers.length; i += MAX_BATCH) {
    const batch = papers.slice(i, i + MAX_BATCH);
    const texts: string[] = [];
    const validPapers: D1PaperRow[] = [];

    for (const p of batch) {
      const text = paperEmbedText({ title: p.title, abstract: p.abstract });
      if (text.length < 20) {
        result.skipped++;
        continue;
      }
      texts.push(text);
      validPapers.push(p);
    }

    if (texts.length === 0) continue;

    try {
      const embeddings = await embedTexts(env, texts);
      const vectors = validPapers.map((p, idx) => ({
        id: `paper:${p.doi}`,
        values: embeddings[idx],
        metadata: {
          doi: p.doi,
          source: p.source,
          year: p.year ?? 0,
          type: "abstract" as const,
          title: p.title.slice(0, 200),
        },
      }));

      await env.CORPUS_INDEX.upsert(vectors);
      result.embedded += vectors.length;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`batch ${i}-${i + batch.length}: ${msg}`);
    }
  }

  return result;
}
