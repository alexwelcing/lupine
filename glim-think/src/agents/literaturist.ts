/**
 * Literaturist (λ): literature search, summarization, and citation.
 *
 * Think-based agent. Mirrors the pattern used by Theorist / Manifold / Causal:
 * - Workers AI default model (Llama 4 Scout 17B)
 * - SQLite-backed session memory (Think provides this)
 * - D1 ledger access via this.queryLedger / this.env.LEDGER
 * - Tool registration pattern using `tool({ description, parameters, execute })`
 *
 * Behavior on a critique question:
 *   1. Extract keywords from the prompt
 *   2. `search_papers` across requested sources (or all)
 *   3. `summarize_paper` on the top 3-5
 *   4. Synthesize a paragraph
 *   5. Cite via `cite_in_response`
 */

import { GlimThinkAgent } from "./base";
import { createWorkersAI } from "workers-ai-provider";
import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";
import type { Env } from "../types";
import type { LiteratureSearchResponse } from "../literature/stub";

/**
 * Resolve the literature search implementation at call time.
 *
 * Tries the real `../literature` module first (unit 4). If that import
 * fails (module missing, throws at load, etc.), falls back to the
 * always-available stub. We resolve lazily so the agent module loads
 * cleanly even when unit 4 has not landed.
 */
type SearchLiteratureFn = (
  env: Env,
  query: string,
  sources?: string[],
  max?: number,
) => Promise<LiteratureSearchResponse>;

async function resolveSearchLiterature(): Promise<SearchLiteratureFn> {
  try {
    // Dynamic import — falls back to stub if unit 4's module is absent.
    // The path is intentionally not type-resolvable until unit 4 lands.
    // @ts-expect-error — '../literature' index module is provided by unit 4
    const mod = (await import("../literature")) as {
      searchLiterature?: SearchLiteratureFn;
    };
    if (typeof mod.searchLiterature === "function") {
      return mod.searchLiterature;
    }
  } catch {
    // fall through to stub
  }
  const stub = await import("../literature/stub");
  return stub.searchLiterature;
}

interface PaperRow {
  paper_id: string;
  doi: string | null;
  arxiv_id: string | null;
  title: string | null;
  authors: string | null;
  year: number | null;
  abstract: string | null;
  source: string | null;
  url: string | null;
}

interface ClaimRow {
  claim_id: string;
  description: string | null;
  claim_type: string | null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
  "those", "it", "its", "as", "at", "from", "into", "via", "we", "our", "their",
  "they", "but", "if", "then", "than", "so", "do", "does", "did", "have", "has",
  "had", "not", "no", "yes", "what", "which", "who", "whom", "whose", "how",
  "search", "papers", "paper", "find", "related", "claim", "about",
]);

function extractKeywords(text: string, max = 8): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  // Dedup preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    if (out.length >= max) break;
  }
  return out;
}

export class Literaturist extends GlimThinkAgent {
  /**
   * Llama 4 Scout 17B (Workers AI) for richer summarization. Literaturist
   * stays on the fast tier by design — it is NOT deepTier, so synthesize()
   * does not escalate it to the eval-aware multi-provider deep route.
   */
  getModel() {
    return createWorkersAI({ binding: this.env.AI })(
      "@cf/meta/llama-4-scout-17b-16e-instruct",
    );
  }

  // System prompt resolved via the prompt registry (getPrompt by class name)
  // inherited from GlimThinkAgent → enables Evolver-driven prompt evolution.

  getTools(): ToolSet {
    return {
      search_papers: tool({
        description:
          "Search the literature corpus for papers matching a query. Sources default to arxiv+semantic_scholar+openkim; pass an explicit list to restrict.",
        parameters: z.object({
          query: z.string().describe("Search query — keywords or natural language"),
          sources: z
            .array(z.string())
            .optional()
            .describe("Restrict to these sources (e.g. ['arxiv', 'semantic_scholar'])"),
          max: z
            .number()
            .int()
            .positive()
            .max(50)
            .optional()
            .describe("Maximum papers per source (default 10)"),
        }),
        execute: async ({ query, sources, max }) => {
          try {
            const search = await resolveSearchLiterature();
            const result = await search(this.env, query, sources, max);
            return result;
          } catch (e) {
            return {
              ok: false,
              message: `literature search failed: ${String(e)}`,
              results: {},
            } satisfies LiteratureSearchResponse;
          }
        },
      }),

      summarize_paper: tool({
        description:
          "Summarize a paper from the literature_papers D1 table by arXiv id or DOI in 3–5 bullet points.",
        parameters: z.object({
          arxivIdOrDoi: z
            .string()
            .describe("arXiv id (e.g. '2401.12345') or DOI (e.g. '10.1038/...')"),
        }),
        execute: async ({ arxivIdOrDoi }) => {
          const id = arxivIdOrDoi.trim();
          let rows: PaperRow[] = [];
          try {
            rows = await this.queryLedger<PaperRow>(
              `SELECT paper_id, doi, arxiv_id, title, authors, year, abstract, source, url
               FROM literature_papers
               WHERE doi = ?1 OR arxiv_id = ?1 OR paper_id = ?1
               LIMIT 1`,
              id,
            );
          } catch (e) {
            // Table may not exist yet (unit 4 pending).
            return {
              ok: false,
              message: `literature_papers table unavailable (${String(e)}); run search_papers first or wait for unit 4`,
            };
          }

          if (rows.length === 0) {
            return {
              ok: false,
              message: "paper not found, run search_papers first",
              query: id,
            };
          }

          const paper = rows[0];
          const abstract = paper.abstract?.trim();
          if (!abstract) {
            return {
              ok: true,
              paper,
              summary:
                "No abstract available in the local cache; metadata only.",
            };
          }

          // Use the agent's Think model to produce a structured bullet summary.
          // We avoid re-implementing the chat loop here — caller (the LLM) can
          // re-invoke summarize_paper or just synthesize from the raw abstract.
          // Returning the raw abstract plus structured fields lets the model
          // do the bullet extraction in the next reasoning step.
          return {
            ok: true,
            paper: {
              paper_id: paper.paper_id,
              doi: paper.doi,
              arxiv_id: paper.arxiv_id,
              title: paper.title,
              authors: paper.authors,
              year: paper.year,
              source: paper.source,
              url: paper.url,
            },
            abstract,
            instruction:
              "Summarize the abstract above in 3–5 bullet points covering: (1) problem, (2) method, (3) key result, (4) limitation, (5) relevance to interatomic potentials.",
          };
        },
      }),

      find_related_to_claim: tool({
        description:
          "Find literature related to a claim in the D1 claims table. Extracts keywords from the claim description, searches, and returns top 5.",
        parameters: z.object({
          claimId: z.string().describe("claim_id from the claims table"),
          max: z.number().int().positive().max(20).optional(),
        }),
        execute: async ({ claimId, max }) => {
          let rows: ClaimRow[] = [];
          try {
            rows = await this.queryLedger<ClaimRow>(
              `SELECT claim_id, description, claim_type
               FROM claims WHERE claim_id = ?1 LIMIT 1`,
              claimId,
            );
          } catch (e) {
            return {
              ok: false,
              message: `claims table unavailable: ${String(e)}`,
            };
          }

          if (rows.length === 0) {
            return { ok: false, message: "claim not found", claimId };
          }

          const claim = rows[0];
          const text = `${claim.claim_type ?? ""} ${claim.description ?? ""}`.trim();
          if (!text) {
            return { ok: false, message: "claim has no text to extract from", claim };
          }

          const keywords = extractKeywords(text);
          const query = keywords.join(" ");

          let response: LiteratureSearchResponse;
          try {
            const search = await resolveSearchLiterature();
            response = await search(this.env, query, undefined, max ?? 5);
          } catch (e) {
            return {
              ok: false,
              message: `literature search failed: ${String(e)}`,
              keywords,
            };
          }

          const cap = max ?? 5;
          const related = Object.values(response.results).flat().slice(0, cap);

          return {
            ok: response.ok,
            message: response.message,
            claimId,
            keywords,
            query,
            related,
          };
        },
      }),

      cite_in_response: tool({
        description:
          "Append a formatted citation block (DOIs/arXiv ids) to a critique's response_md field. Falls back to a queue message if the critiques table is absent.",
        parameters: z.object({
          critiqueId: z.string().describe("critique_id from the critiques table"),
          paperDois: z
            .array(z.string())
            .min(1)
            .describe("DOIs or arXiv ids to cite"),
        }),
        execute: async ({ critiqueId, paperDois }) => {
          const block = this.formatCitationBlock(paperDois);

          try {
            const result = await this.env.LEDGER.prepare(
              `UPDATE critiques
               SET response_md = COALESCE(response_md, '') || ?2
               WHERE critique_id = ?1`,
            )
              .bind(critiqueId, block)
              .run();

            const changes = result.meta?.changes ?? 0;
            if (changes === 0) {
              return {
                ok: false,
                queued: true,
                message: `critique ${critiqueId} not found; citations not appended`,
                citationBlock: block,
              };
            }
            return { ok: true, critiqueId, appended: paperDois.length };
          } catch (e) {
            // critiques table may not exist (unit 2 pending).
            return {
              ok: false,
              queued: true,
              message: `critiques table unavailable (${String(e)}); citations queued elsewhere`,
              critiqueId,
              citationBlock: block,
            };
          }
        },
      }),
    };
  }

  /**
   * Initialize agent-local SQLite state.
   *
   * The agent only needs a small history of search queries for its own
   * memory — actual papers live in the D1 `literature_papers` table that
   * unit 4 will provision.
   */
  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS literaturist_searches (
        search_id TEXT PRIMARY KEY,
        query TEXT,
        sources TEXT,
        result_count INTEGER,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `;
  }

  async getStorageStats(): Promise<Record<string, number>> {
    try {
      const rows = await this.sql`SELECT COUNT(*) AS n FROM literaturist_searches`;
      return { literaturist_searches: Number(rows[0]?.n ?? 0) };
    } catch {
      return { literaturist_searches: 0 };
    }
  }

  private formatCitationBlock(ids: string[]): string {
    const lines = ids.map((id) => {
      const isArxiv = /^\d{4}\.\d{4,5}(v\d+)?$/.test(id) || id.toLowerCase().startsWith("arxiv:");
      if (isArxiv) {
        const bare = id.toLowerCase().replace(/^arxiv:/, "");
        return `- arXiv:${bare} — https://arxiv.org/abs/${bare}`;
      }
      return `- doi:${id} — https://doi.org/${id}`;
    });
    return `\n\n## References\n${lines.join("\n")}\n`;
  }
}
