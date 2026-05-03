/**
 * MiniMax image-01 — supporting images for research claims.
 *
 * Endpoint: POST {base}/image_generation
 * Body: {
 *   model: "image-01",
 *   prompt: string,
 *   aspect_ratio: "1:1" | "16:9" | "4:3" | "3:2" | "2:3" | "3:4" | "9:16" | "21:9",
 *   n: 1..9,
 *   response_format: "url" | "base64",
 *   prompt_optimizer: boolean
 * }
 * Returns: { data: { image_urls: ["https://..."] }, metadata: {...}, base_resp: {status_code, status_msg} }
 *
 * Budget: 120/day. The hourly orchestrator emits ~1 evaluate/hour →
 * ~24 images/day even if every claim gets an image, leaving generous
 * headroom for ad-hoc generation.
 *
 * Caching: image URLs returned by MiniMax expire (~24h). We immediately
 * mirror to R2 (`claim-images/{claim_id}.png`) and serve from our own
 * domain. R2 reads are free egress for Workers.
 */
import type { Env } from "../types";

const IMAGE_MODEL = "image-01";

interface MiniMaxImageResponse {
  data?: { image_urls?: string[] };
  metadata?: Record<string, unknown>;
  base_resp?: { status_code: number; status_msg: string };
}

function imageBaseUrl(env: Env): string {
  return env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
}

/**
 * Generate one image from a prompt. Returns the public R2 URL after
 * mirroring (or null on failure). Best-effort — failures are logged
 * and return null so callers can fall back to no-image rendering.
 */
export async function generateAndStoreImage(
  env: Env,
  opts: {
    prompt: string;
    storageKey: string;
    aspect_ratio?: string;
    prompt_optimizer?: boolean;
  },
): Promise<{ ok: boolean; r2_key?: string; r2_url?: string; error?: string; latency_ms: number }> {
  const start = Date.now();
  if (!env.MINIMAX_API_KEY) {
    return { ok: false, error: "MINIMAX_API_KEY unset", latency_ms: 0 };
  }

  try {
    const res = await fetch(`${imageBaseUrl(env)}/image_generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: opts.prompt.slice(0, 1500),
        aspect_ratio: opts.aspect_ratio ?? "16:9",
        n: 1,
        response_format: "url",
        prompt_optimizer: opts.prompt_optimizer ?? true,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`,
        latency_ms: Date.now() - start,
      };
    }
    const json = (await res.json()) as MiniMaxImageResponse;
    if (json.base_resp && json.base_resp.status_code !== 0) {
      return {
        ok: false,
        error: `MiniMax error ${json.base_resp.status_code}: ${json.base_resp.status_msg}`,
        latency_ms: Date.now() - start,
      };
    }
    const url = json.data?.image_urls?.[0];
    if (!url) {
      return {
        ok: false,
        error: "MiniMax returned no image URL",
        latency_ms: Date.now() - start,
      };
    }

    // Mirror to R2 immediately — MiniMax URLs expire
    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      return {
        ok: false,
        error: `Image fetch failed: HTTP ${imageRes.status}`,
        latency_ms: Date.now() - start,
      };
    }
    const buf = await imageRes.arrayBuffer();
    await env.ARTIFACTS.put(opts.storageKey, buf, {
      httpMetadata: {
        contentType: imageRes.headers.get("content-type") ?? "image/png",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return {
      ok: true,
      r2_key: opts.storageKey,
      r2_url: `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${opts.storageKey}`,
      latency_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Build an image prompt from a hypothesis-evaluation summary. The goal
 * is an abstract scientific visualization that conveys the verdict
 * without literal text — a viewer should sense whether the hypothesis
 * is supported, refuted, or weak from the imagery alone.
 */
export function promptForEvaluationClaim(opts: {
  hypothesisTitle: string;
  verdict: string;
  pooled_r: number | null;
  within_min_r: number | null;
  within_max_r: number | null;
  target_element: string | null;
  n_records: number;
}): string {
  const verdictMood =
    opts.verdict === "supports_dichotomy"
      ? "split into two distinct clusters with sharp boundary, dramatic separation, Simpson's paradox visualization"
      : opts.verdict === "supports_universal"
        ? "tightly aligned cloud of points along a single axis, harmonious convergence"
        : opts.verdict === "weak"
          ? "diffuse scattered cloud, no clear structure, ambiguous"
          : "minimal sparse data, exploratory";
  const elementContext = opts.target_element
    ? `representing the element ${opts.target_element}`
    : "across multiple chemical elements";

  return [
    "Abstract scientific data visualization in cyanotype monochrome with cyan accents,",
    "high-contrast minimalist style suited for a research dashboard.",
    `${verdictMood}.`,
    `${elementContext}.`,
    `${opts.n_records.toLocaleString()} data points implied through density patterns.`,
    "No text, no labels, no human figures.",
    "Composition: 16:9, dark navy / charcoal background,",
    "geometric clarity, scientific paper aesthetic, technical precision.",
  ].join(" ");
}
