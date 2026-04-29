/**
 * Literature search stub.
 *
 * Fallback used when unit 4 (literature integration) has not yet merged
 * its real `searchLiterature` implementation. Keeps the Literaturist agent
 * loadable and type-clean in isolation.
 *
 * The real module (when it lands) is expected at `../literature/index.ts`
 * and must export `searchLiterature(env, query, sources?, max?)` with a
 * compatible signature.
 */

import type { Env } from "../types";

export interface LiteratureSearchResult {
  /** Identifier — DOI, arXiv id, or canonical URL. */
  id: string;
  title: string;
  authors: string[];
  year?: number;
  abstract?: string;
  url?: string;
  source: string;
}

export interface LiteratureSearchResponse {
  ok: boolean;
  message?: string;
  results: Record<string, LiteratureSearchResult[]>;
}

export async function searchLiterature(
  _env: Env,
  _query: string,
  _sources?: string[],
  _max?: number,
): Promise<LiteratureSearchResponse> {
  return {
    ok: false,
    message: "literature search not yet wired (unit 4 pending)",
    results: {},
  };
}
