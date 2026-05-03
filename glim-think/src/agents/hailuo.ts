/**
 * MiniMax Hailuo — text-to-video for the daily research vignette.
 *
 * Three-step async flow:
 *   1. submitHailuoVideo(prompt) → { task_id }
 *   2. queryHailuoTask(task_id) → { status: "Queueing"|"Processing"|"Success"|"Fail", file_id }
 *      (poll every ~30s, typically 1-5min total)
 *   3. retrieveHailuoFile(file_id) → { download_url }
 *      (download then mirror to R2 — MiniMax URLs expire)
 *
 * Budget: 2/day for MiniMax-Hailuo-2.3 (text-to-video), 2/day for
 * MiniMax-Hailuo-2.3-Fast (image-to-video). The daily vignette uses 1
 * text-to-video per day, leaving a slot for ad-hoc generation.
 */
import type { Env } from "../types";

const HAILUO_DEFAULT_MODEL = "MiniMax-Hailuo-2.3";

interface MiniMaxBaseResp {
  status_code: number;
  status_msg: string;
}

interface SubmitResponse {
  task_id?: string;
  base_resp?: MiniMaxBaseResp;
}

interface QueryResponse {
  task_id?: string;
  status?: "Queueing" | "Preparing" | "Processing" | "Success" | "Fail";
  file_id?: string;
  video_width?: number;
  video_height?: number;
  base_resp?: MiniMaxBaseResp;
}

interface RetrieveResponse {
  file?: {
    file_id?: string;
    bytes?: number;
    download_url?: string;
    purpose?: string;
  };
  base_resp?: MiniMaxBaseResp;
}

function hailuoBase(env: Env): string {
  return env.MINIMAX_BASE_URL?.trim() || "https://api.minimax.io/v1";
}

export async function submitHailuoVideo(
  env: Env,
  opts: {
    prompt: string;
    model?: string;
    resolution?: string;
    duration?: number;
    first_frame_image?: string;
  },
): Promise<{ ok: boolean; task_id?: string; error?: string }> {
  if (!env.MINIMAX_API_KEY) {
    return { ok: false, error: "MINIMAX_API_KEY unset" };
  }
  try {
    const body: Record<string, unknown> = {
      model: opts.model ?? HAILUO_DEFAULT_MODEL,
      prompt: opts.prompt.slice(0, 2000),
      duration: opts.duration ?? 6,
      resolution: opts.resolution ?? "768P",
    };
    if (opts.first_frame_image) {
      body.first_frame_image = opts.first_frame_image;
    }
    const res = await fetch(`${hailuoBase(env)}/video_generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    }
    const json = (await res.json()) as SubmitResponse;
    if (json.base_resp && json.base_resp.status_code !== 0) {
      return { ok: false, error: `MiniMax error ${json.base_resp.status_code}: ${json.base_resp.status_msg}` };
    }
    if (!json.task_id) {
      return { ok: false, error: "no task_id returned" };
    }
    return { ok: true, task_id: json.task_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function queryHailuoTask(
  env: Env,
  taskId: string,
): Promise<{ ok: boolean; status?: QueryResponse["status"]; file_id?: string; error?: string }> {
  try {
    const res = await fetch(`${hailuoBase(env)}/query/video_generation?task_id=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}` },
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    }
    const json = (await res.json()) as QueryResponse;
    if (json.base_resp && json.base_resp.status_code !== 0) {
      return { ok: false, error: `MiniMax error ${json.base_resp.status_code}: ${json.base_resp.status_msg}` };
    }
    return { ok: true, status: json.status, file_id: json.file_id || undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function retrieveAndStoreHailuoFile(
  env: Env,
  opts: { file_id: string; storageKey: string },
): Promise<{ ok: boolean; r2_key?: string; r2_url?: string; bytes?: number; error?: string }> {
  try {
    const res = await fetch(`${hailuoBase(env)}/files/retrieve?file_id=${encodeURIComponent(opts.file_id)}`, {
      headers: { Authorization: `Bearer ${env.MINIMAX_API_KEY}` },
    });
    if (!res.ok) {
      return { ok: false, error: `retrieve HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    }
    const json = (await res.json()) as RetrieveResponse;
    const downloadUrl = json.file?.download_url;
    if (!downloadUrl) {
      return { ok: false, error: "no download_url in retrieve response" };
    }
    // Download + mirror to R2
    const dl = await fetch(downloadUrl);
    if (!dl.ok) {
      return { ok: false, error: `download HTTP ${dl.status}` };
    }
    const buf = await dl.arrayBuffer();
    await env.ARTIFACTS.put(opts.storageKey, buf, {
      httpMetadata: {
        contentType: dl.headers.get("content-type") ?? "video/mp4",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    return {
      ok: true,
      r2_key: opts.storageKey,
      r2_url: `https://glim-think-v1.aw-ab5.workers.dev/artifacts/${opts.storageKey}`,
      bytes: buf.byteLength,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Build a prompt for the daily research vignette from the day's claims.
 * Text-to-video, no humans, scientific aesthetic matching image-01.
 */
export function dailyVignettePrompt(opts: {
  date: string;
  topVerdicts: string[];
  totalClaims: number;
}): string {
  const verdictMood = opts.topVerdicts.includes("supports_dichotomy")
    ? "Two distinct clusters of glowing data points slowly drift apart against a dark navy background, "
    : opts.topVerdicts.includes("supports_universal")
      ? "A tight constellation of luminous points aligns along a slowly rotating axis, "
      : "Diffuse points of cyan light drift through dark space, occasionally clustering then dispersing, ";
  return [
    `Cinematic 6-second cyanotype data visualization for the ${opts.date} research lab broadcast.`,
    verdictMood,
    "evoking discovery and statistical inference.",
    "Cyan and pale-blue accents on deep navy. Subtle particle physics aesthetic.",
    "No text, no labels, no human figures. 16:9, slow camera drift, scientific paper precision.",
  ].join(" ");
}
