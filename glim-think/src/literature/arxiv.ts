/**
 * arXiv search adapter.
 *
 * arXiv exposes an Atom-feed query API at
 *   http://export.arxiv.org/api/query?search_query=...&max_results=...
 *
 * We avoid pulling a DOM/XML parser by using narrow regex against the
 * `<entry>` blocks. Per arXiv's API guidance, requests are throttled to
 * ~1 req/sec via a per-isolate token bucket.
 */

import type { Env, LiteraturePaper } from "../types";
import { createRateLimiter } from "./rate_limit";
import { claimSlot, parseRetryAfter, record429, recordSuccess } from "./rate_limit_kv";

const ARXIV_ENDPOINT = "http://export.arxiv.org/api/query";
// In-isolate backstop. The cross-isolate KV layer is the source of truth.
const localBackstop = createRateLimiter(1000);
// arXiv unauthenticated guidance: 1 req per 3 seconds. Conservative.
const ARXIV_MIN_INTERVAL_MS = 3_000;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractFirst(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeXmlEntities(m[1].trim().replace(/\s+/g, " ")) : null;
}

function extractAll(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    out.push(decodeXmlEntities(m[1].trim().replace(/\s+/g, " ")));
  }
  return out;
}

function arxivIdFromUrl(url: string): string | null {
  // `<id>` looks like `http://arxiv.org/abs/2403.12345v2`
  if (!url) return null;
  const m = url.match(/abs\/([^\s<]+)$/);
  return m ? m[1] : null;
}

function parseEntries(xml: string): LiteraturePaper[] {
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  const fetchedAt = new Date().toISOString();
  const papers: LiteraturePaper[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const idUrl = extractFirst(block, "id") || "";
    const arxivId = arxivIdFromUrl(idUrl);
    const title = extractFirst(block, "title") || "";
    const abstract = extractFirst(block, "summary") || "";
    const published = extractFirst(block, "published") || "";
    const year = published.length >= 4 ? Number.parseInt(published.slice(0, 4), 10) : null;

    // Authors: each <author><name>...</name></author>
    const authorBlocks = extractAll(block, "author");
    const authors = authorBlocks
      .map((ab) => extractFirst(ab, "name"))
      .filter((n): n is string => Boolean(n));

    // DOI sometimes present as <arxiv:doi> (with namespace) — match permissively.
    const doiMatch = block.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/i);
    const doi = doiMatch
      ? decodeXmlEntities(doiMatch[1].trim())
      : arxivId
        ? `arxiv:${arxivId}`
        : `arxiv:${idUrl || title.slice(0, 64)}`;

    if (!title) continue;

    papers.push({
      doi,
      arxivId,
      title,
      abstract,
      authors,
      year: Number.isFinite(year as number) ? year : null,
      venue: "arXiv",
      source: "arxiv",
      fetchedAt,
      rawArtifactKey: null,
      externalIds: arxivId ? { arxiv: arxivId } : undefined,
    });
  }
  return papers;
}

export interface ArxivSearchOptions {
  /** Max results to request (server caps; we cap at 100). */
  max?: number;
  /** AbortSignal for cancellation/timeout. */
  signal?: AbortSignal;
}

/**
 * Search arXiv for papers matching `query`. Returns parsed papers (possibly empty).
 * Throws on transport/HTTP errors so callers can surface them.
 */
export async function searchArxiv(
  env: Env,
  query: string,
  options: ArxivSearchOptions = {},
): Promise<LiteraturePaper[]> {
  const max = Math.min(Math.max(options.max ?? 10, 1), 100);
  const safeQuery = query.trim();
  if (!safeQuery) return [];

  // Cross-isolate slot reservation (KV-backed) + in-isolate backstop.
  await claimSlot(env, "arxiv", ARXIV_MIN_INTERVAL_MS);
  await localBackstop();

  const url =
    `${ARXIV_ENDPOINT}?search_query=${encodeURIComponent(`all:${safeQuery}`)}` +
    `&max_results=${max}`;

  const res = await fetch(url, {
    headers: { Accept: "application/atom+xml" },
    signal: options.signal,
  });
  if (res.status === 429) {
    const retryMs = parseRetryAfter(res.headers.get("retry-after"));
    await record429(env, "arxiv", retryMs);
    throw new Error(`arXiv HTTP 429: Too Many Requests${retryMs ? ` (retry-after ${Math.round(retryMs/1000)}s)` : ""}`);
  }
  if (!res.ok) {
    throw new Error(`arXiv HTTP ${res.status}: ${res.statusText}`);
  }
  await recordSuccess(env, "arxiv");
  const xml = await res.text();
  return parseEntries(xml);
}
