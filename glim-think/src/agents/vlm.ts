/**
 * Vision-Language reasoning via Cloudflare Workers AI.
 *
 * MiniMax doesn't expose a VLM on the Max plan's sk-cp- proxy key
 * (probed extensively — every MiniMax-VL-* / MiniMax-Vision / -VL-Pro
 * returns "unknown model"). The coding-plan-vlm line in the dashboard
 * is for MiniMax's internal coding-assistant tooling, not API-callable.
 *
 * Workers AI offers @cf/meta/llama-3.2-11b-vision-instruct for free
 * (zero egress, ~hundred-ms latency). Capable enough for figure
 * explanation on /research.
 *
 * Usage: explainFigure(env, imageUrl, question) → text
 */
import type { Env } from "../types";

// llava-1.5 doesn't require the Llama community-license click-through
// that @cf/meta/llama-3.2-11b-vision-instruct does, and it's free on
// Workers AI. Lower quality than Llama 3.2 but adequate for figure
// descriptions on /research.
const VLM_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

interface WorkersAIVisionResponse {
  // Workers AI vision models return at top level — no `result` wrapper
  response?: string;
  description?: string;
  // Some models nest under result; keep for compatibility
  result?: { response?: string; description?: string };
  errors?: Array<{ message: string }>;
}

/**
 * Fetch the image and pass it as bytes (workers AI accepts uint8 array).
 * When the URL points to our own /artifacts/ path, read directly from
 * R2 — Cloudflare returns 404 on same-origin self-fetch.
 */
async function fetchImageBytes(env: Env, imageUrl: string): Promise<number[]> {
  const selfPrefix = "https://glim-think-v1.aw-ab5.workers.dev/artifacts/";
  if (imageUrl.startsWith(selfPrefix)) {
    const key = decodeURIComponent(imageUrl.slice(selfPrefix.length));
    const obj = await env.ARTIFACTS.get(key);
    if (!obj) throw new Error(`R2 object not found: ${key}`);
    const buf = await obj.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`image fetch HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return Array.from(new Uint8Array(buf));
}

export async function explainFigure(
  env: Env,
  opts: { imageUrl: string; question?: string; maxTokens?: number },
): Promise<{
  ok: boolean;
  model: string;
  text?: string;
  latency_ms: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const bytes = await fetchImageBytes(env, opts.imageUrl);
    const question =
      opts.question ??
      "Describe this scientific figure in 2-3 sentences. Identify any axes, clusters, or notable patterns. Be concrete.";

    // Cast through unknown — Workers AI types vary by model
    const response = (await (env.AI as unknown as {
      run: (model: string, body: unknown) => Promise<unknown>;
    }).run(VLM_MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You are a scientific image reader for a materials-science research dashboard. " +
            "Be concrete, cite numerical features when visible, and avoid speculation.",
        },
        { role: "user", content: question },
      ],
      image: bytes,
      max_tokens: opts.maxTokens ?? 256,
    })) as WorkersAIVisionResponse;

    const text =
      response?.description?.trim() ??
      response?.response?.trim() ??
      response?.result?.response?.trim() ??
      response?.result?.description?.trim() ??
      undefined;

    if (!text) {
      return {
        ok: false,
        model: VLM_MODEL,
        latency_ms: Date.now() - start,
        error: `no text in response: ${JSON.stringify(response).slice(0, 200)}`,
      };
    }

    return {
      ok: true,
      model: VLM_MODEL,
      text,
      latency_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      model: VLM_MODEL,
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
