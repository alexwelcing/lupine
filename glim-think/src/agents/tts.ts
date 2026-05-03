/**
 * MiniMax T2A v2 — text-to-audio narration for claims.
 *
 * Endpoint: POST {base}/t2a_v2
 * Body: {
 *   model: "speech-02-hd" | "speech-2.5-turbo-preview" | ...,
 *   text: string,                          // <= ~5000 chars
 *   stream: false,
 *   voice_setting: {
 *     voice_id: string,                    // see MiniMax voice catalog
 *     speed: 1.0,                          // 0.5..2.0
 *     vol: 1.0,
 *     pitch: 0
 *   },
 *   audio_setting: {
 *     sample_rate: 32000,                  // 8000/16000/22050/24000/32000/44100
 *     bitrate: 128000,
 *     format: "mp3" | "pcm" | "flac" | "wav",
 *     channel: 1
 *   }
 * }
 * Returns: { data: { audio: hex_string, status: 2 }, extra_info: {...},
 *            base_resp: { status_code, status_msg } }
 *
 * The `audio` field is a HEX-encoded byte stream (not base64) — we
 * decode and stash directly to R2 as audio/mpeg.
 *
 * Budget: 11k chars/day. ~30s narration is ~400 chars, so we get
 * ~27 narrations/day even at TTS-everything rate. Plenty for the
 * hourly orchestrator (24/day).
 */
import type { Env } from "../types";

const TTS_DEFAULT_MODEL = "speech-02-hd";
const TTS_DEFAULT_VOICE = "English_Trustworth_Man";

interface MiniMaxTtsResponse {
  data?: { audio?: string; status?: number };
  extra_info?: Record<string, unknown>;
  base_resp?: { status_code: number; status_msg: string };
}

function ttsBaseUrl(env: Env): string {
  return env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function generateAndStoreAudio(
  env: Env,
  opts: {
    text: string;
    storageKey: string;
    voice_id?: string;
    model?: string;
    speed?: number;
  },
): Promise<{
  ok: boolean;
  r2_key?: string;
  r2_url?: string;
  bytes?: number;
  latency_ms: number;
  error?: string;
}> {
  const start = Date.now();
  if (!env.MINIMAX_API_KEY) {
    return { ok: false, error: "MINIMAX_API_KEY unset", latency_ms: 0 };
  }
  if (!opts.text.trim()) {
    return { ok: false, error: "empty text", latency_ms: 0 };
  }

  try {
    const res = await fetch(`${ttsBaseUrl(env)}/t2a_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model ?? TTS_DEFAULT_MODEL,
        text: opts.text.slice(0, 5000),
        stream: false,
        voice_setting: {
          voice_id: opts.voice_id ?? TTS_DEFAULT_VOICE,
          speed: opts.speed ?? 1.0,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
          channel: 1,
        },
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`,
        latency_ms: Date.now() - start,
      };
    }
    const json = (await res.json()) as MiniMaxTtsResponse;
    if (json.base_resp && json.base_resp.status_code !== 0) {
      return {
        ok: false,
        error: `MiniMax error ${json.base_resp.status_code}: ${json.base_resp.status_msg}`,
        latency_ms: Date.now() - start,
      };
    }
    const audioHex = json.data?.audio;
    if (!audioHex) {
      return {
        ok: false,
        error: "MiniMax returned no audio data",
        latency_ms: Date.now() - start,
      };
    }
    const bytes = hexToBytes(audioHex);
    await env.ARTIFACTS.put(opts.storageKey, bytes, {
      httpMetadata: {
        contentType: "audio/mpeg",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    return {
      ok: true,
      r2_key: opts.storageKey,
      r2_url: `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${opts.storageKey}`,
      bytes: bytes.length,
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
 * Build narration text from a claim. Strips markdown, collapses
 * whitespace, caps length to keep narration under ~30s. The TTS speaks
 * roughly 175 words/min so 90 words ≈ 30s.
 */
export function narrationTextForClaim(opts: {
  hypothesisTitle: string;
  verdict: string;
  pooled_r: number | null;
  within_min_r: number | null;
  within_max_r: number | null;
  n_records: number;
  narrative?: string | null;
}): string {
  const verdictPlain =
    opts.verdict === "supports_dichotomy"
      ? "supports the dichotomy hypothesis"
      : opts.verdict === "supports_universal"
        ? "supports a universal correlation"
        : opts.verdict === "weak"
          ? "yields a weak signal"
          : "is inconclusive";

  const stats = [
    opts.pooled_r !== null ? `pooled r is ${opts.pooled_r.toFixed(2)}` : null,
    opts.within_min_r !== null && opts.within_max_r !== null
      ? `within-style r ranges from ${opts.within_min_r.toFixed(2)} to ${opts.within_max_r.toFixed(2)}`
      : null,
    `${opts.n_records.toLocaleString()} records`,
  ]
    .filter(Boolean)
    .join(", ");

  // Use the M2.7 narrative if available, sanitized of markdown
  const cleaned = (opts.narrative ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const summary = cleaned ? cleaned.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ") : "";

  return [
    `Hypothesis: ${opts.hypothesisTitle}.`,
    `The latest evaluation ${verdictPlain}, with ${stats}.`,
    summary,
  ]
    .join(" ")
    .slice(0, 1200);
}
