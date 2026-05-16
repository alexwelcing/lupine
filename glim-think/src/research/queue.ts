/**
 * Phase C — research work queue.
 *
 * Async dispatch for long-running research tasks so the request
 * pipeline never blocks on a multi-second job. Producer is the
 * /research/* HTTP routes in server.ts; consumer is the `queue`
 * export in the same file, which routes by `task.kind` to the
 * appropriate handler.
 *
 * Tasks:
 *   - `round`     — run /run-equivalent analysis for one element
 *   - `literature` — invoke literature search + persist papers
 *   - `evaluate`  — evaluate a hypothesis (run its test, update status)
 *   - `broadcast` — wrap a manual broadcast trigger
 *
 * Idempotency: each enqueue site supplies a `dedup_key`. The consumer
 * checks `research_jobs(dedup_key)` before doing the work; duplicates
 * are acked silently. dedup_key is a content hash, not a request ID.
 *
 * Retry / DLQ: queue config in wrangler.toml sets max_retries=3 and
 * routes failures to glim-research-dlq. Within the consumer we only
 * call `message.retry()` for transient failures; deterministic errors
 * are acked + logged so they don't loop.
 */

import { trace, SpanStatusCode } from "@opentelemetry/api";
import { getAgentByName } from "agents";
import type { Env } from "../types";
import { traceEnv } from "../telemetry/storage";
import { withTaskPipeline } from "../telemetry/pipeline";
import { createLabBroadcast } from "../scheduled";
import { evaluateHypothesis } from "./evaluate";
import { generateAndStoreImage } from "../agents/image";
import { generateAndStoreAudio } from "../agents/tts";
import { accumulateCost } from "../telemetry/pipeline";

export type ResearchTaskKind =
  | "round"
  | "literature"
  | "evaluate"
  | "broadcast"
  | "claim-image"
  | "claim-audio"
  | "manifold_analysis"   // Phase A Option-C: dispatch to Manifold DO
  | "causal_screen";      // Phase A Option-C: dispatch to Causal DO

export interface ResearchTaskBase {
  kind: ResearchTaskKind;
  dedup_key: string;
  enqueued_at: string;
}

export interface RoundTask extends ResearchTaskBase {
  kind: "round";
  element: string;
  analysis_types?: string[];
  exclude_styles?: string[];
  only_styles?: string[];
}

export interface LiteratureTask extends ResearchTaskBase {
  kind: "literature";
  query: string;
  max?: number;
  sources?: string[];
}

export interface EvaluateTask extends ResearchTaskBase {
  kind: "evaluate";
  hypothesis_id: string;
  iterations?: number;
  alpha?: number;
}

export interface BroadcastTask extends ResearchTaskBase {
  kind: "broadcast";
  source: string;
}

/**
 * Async image generation for a claim. The evaluator emits one of these
 * after writing its claim row so the slow (~24s) image-01 call doesn't
 * block the queue consumer.
 */
export interface ClaimImageTask extends ResearchTaskBase {
  kind: "claim-image";
  claim_id: string;
  prompt: string;
  aspect_ratio?: string;
}

/**
 * Async TTS narration for a claim. ~5-15s latency at speech-02-hd, so
 * fire-and-forget like claim-image. Plays back as MP3 from R2.
 */
export interface ClaimAudioTask extends ResearchTaskBase {
  kind: "claim-audio";
  claim_id: string;
  text: string;
  voice_id?: string;
}

/**
 * Run Manifold.runAnalysis(element) on the per-element Manifold DO. Pure
 * deterministic computation, no LLM cost. Writes a ManifoldAnalysis claim
 * to env.LEDGER + a row to the DO-local manifold_runs table.
 */
export interface ManifoldAnalysisTask extends ResearchTaskBase {
  kind: "manifold_analysis";
  element: string;
  family?: string;
}

/**
 * Run Causal.runScreen(grouping) on a single Causal DO instance. Pure
 * deterministic computation. Writes a CausalScreen claim + DO-local row.
 */
export interface CausalScreenTask extends ResearchTaskBase {
  kind: "causal_screen";
  grouping: "element" | "pair_style" | "potential_label";
}

export type ResearchTask =
  | RoundTask
  | LiteratureTask
  | EvaluateTask
  | BroadcastTask
  | ClaimImageTask
  | ClaimAudioTask
  | ManifoldAnalysisTask
  | CausalScreenTask;

export interface ResearchJobRow {
  job_id: string;
  dedup_key: string;
  kind: string;
  payload: string;
  enqueued_at: string;
  started_at: string | null;
  finished_at: string | null;
  outcome: "pending" | "success" | "failed" | "duplicate";
  error: string | null;
  attempts: number;
}

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS research_jobs (
    job_id TEXT PRIMARY KEY,
    dedup_key TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    enqueued_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    outcome TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0
  )
`;

const DEDUP_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_research_jobs_dedup
    ON research_jobs(dedup_key, outcome)
`;

const KIND_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_research_jobs_kind_status
    ON research_jobs(kind, outcome, enqueued_at DESC)
`;

async function ensureSchema(env: Env): Promise<void> {
  await env.LEDGER.prepare(TABLE_DDL).run();
  await env.LEDGER.prepare(DEDUP_INDEX).run();
  await env.LEDGER.prepare(KIND_INDEX).run();
}

function newJobId(kind: string): string {
  return `job-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Enqueue a task. Returns the job_id (or the existing one for duplicates).
 *
 * Dedup window: a non-failed row with the same dedup_key is treated as
 * already-handled and the new request is acked without enqueuing.
 */
export async function enqueueTask(
  env: Env,
  task: ResearchTask,
): Promise<{ job_id: string; status: "enqueued" | "duplicate"; existing_outcome?: string }> {
  await ensureSchema(env);

  const existing = await env.LEDGER.prepare(
    `SELECT job_id, outcome FROM research_jobs
     WHERE dedup_key = ?1 AND outcome != 'failed'
     ORDER BY enqueued_at DESC LIMIT 1`,
  )
    .bind(task.dedup_key)
    .first<{ job_id: string; outcome: string }>();

  if (existing) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute("queue.enqueue.dedup", true);
      span.setAttribute("queue.enqueue.existing_outcome", existing.outcome);
    }
    return {
      job_id: existing.job_id,
      status: "duplicate",
      existing_outcome: existing.outcome,
    };
  }

  const jobId = newJobId(task.kind);
  await env.LEDGER.prepare(
    `INSERT INTO research_jobs (job_id, dedup_key, kind, payload, enqueued_at, outcome)
     VALUES (?1, ?2, ?3, ?4, ?5, 'pending')`,
  )
    .bind(jobId, task.dedup_key, task.kind, JSON.stringify(task), task.enqueued_at)
    .run();

  await env.RESEARCH_QUEUE.send({ ...task, job_id: jobId });

  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute("queue.enqueue.dedup", false);
    span.setAttribute("queue.enqueue.job_id", jobId);
  }

  return { job_id: jobId, status: "enqueued" };
}

/**
 * Mark a job as started — increments attempt counter.
 */
async function markStarted(env: Env, jobId: string): Promise<void> {
  await env.LEDGER.prepare(
    `UPDATE research_jobs
       SET started_at = COALESCE(started_at, ?1),
           attempts = attempts + 1
     WHERE job_id = ?2`,
  )
    .bind(new Date().toISOString(), jobId)
    .run();
}

async function markFinished(
  env: Env,
  jobId: string,
  outcome: "success" | "failed",
  error?: string,
): Promise<void> {
  await env.LEDGER.prepare(
    `UPDATE research_jobs
       SET finished_at = ?1, outcome = ?2, error = ?3
     WHERE job_id = ?4`,
  )
    .bind(new Date().toISOString(), outcome, error ?? null, jobId)
    .run();
}

/**
 * Run a single task. Returns true on success, false on transient failure
 * (retry), throws on non-recoverable error (will hit DLQ via queue retry
 * exhaustion).
 */
async function runTask(env: Env, task: ResearchTask & { job_id?: string }): Promise<void> {
  const tracer = trace.getTracer("glim-think.queue");
  const start = Date.now();
  return tracer.startActiveSpan(`queue.task.${task.kind}`, async (span) => {
    span.setAttribute("queue.task.kind", task.kind);
    span.setAttribute("queue.task.dedup_key", task.dedup_key);
    let success = false;
    try {
      await runTaskInner(env, task);
      success = true;
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      const latency = Date.now() - start;
      span.setAttribute("queue.task.latency_ms", latency);
      span.setAttribute("queue.task.success", success);
      // Latency anomaly flag: >30s for compute tasks, >60s for image/audio
      const threshold = task.kind === "claim-image" || task.kind === "claim-audio" ? 60000 : 30000;
      span.setAttribute("queue.task.latency_anomaly", latency > threshold);
      span.end();
    }
  });
}

async function runTaskInner(env: Env, task: ResearchTask & { job_id?: string }): Promise<void> {
  if (task.kind === "broadcast") {
    await createLabBroadcast(env, task.source);
    return;
  }

  if (task.kind === "round") {
    // Forward to the existing /run handler logic by calling our own worker.
    // Keeps the heavy lifting in one place; the queue just decouples timing.
    const url = "https://glim-think-v1.aw-ab5.workers.dev/run";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Authorizes this internal subrequest past the Cloudflare Access
        // gate (the queue has no Access JWT). See middleware/access.ts.
        "X-Internal-Token": env.INTERNAL_TASK_TOKEN ?? "",
      },
      body: JSON.stringify({
        element: task.element,
        analysis_types: task.analysis_types ?? ["manifold", "causal"],
        exclude_styles: task.exclude_styles ?? [],
        only_styles: task.only_styles ?? [],
      }),
    });
    if (!res.ok) {
      throw new Error(`/run returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return;
  }

  if (task.kind === "literature") {
    const url = "https://glim-think-v1.aw-ab5.workers.dev/literature/search";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": env.INTERNAL_TASK_TOKEN ?? "",
      },
      body: JSON.stringify({
        query: task.query,
        max: task.max ?? 10,
        sources: task.sources,
      }),
    });
    if (!res.ok) {
      throw new Error(`/literature/search returned ${res.status}`);
    }
    return;
  }

  if (task.kind === "evaluate") {
    await evaluateHypothesis(env, task.hypothesis_id);
    return;
  }

  if (task.kind === "claim-image") {
    const storageKey = `claim-images/${task.claim_id}.png`;
    const result = await generateAndStoreImage(env, {
      prompt: task.prompt,
      storageKey,
      aspect_ratio: task.aspect_ratio ?? "16:9",
    });
    if (!result.ok) {
      throw new Error(`image generation failed: ${result.error}`);
    }
    await patchClaimData(env, task.claim_id, { image_key: storageKey });
    return;
  }

  if (task.kind === "manifold_analysis") {
    // One DO instance per element so Manifold's session memory is
    // element-scoped. Cheap — DOs are lazy.
    // Must use getAgentByName (not idFromName/get): the Agents SDK requires
    // the stub's name to be set before any method that reads `this.name`,
    // else "Attempting to read .name on Manifold before it was set"
    // (cloudflare/workerd#2240). The HTTP path gets this via
    // routeAgentRequest; the queue path must do it explicitly.
    const stub = await getAgentByName(env.MANIFOLD_AGENT, `manifold-${task.element}`);
    const result = (await (stub as unknown as {
      runAnalysis: (opts: { element: string; family?: string }) => Promise<{ ok: boolean; error?: string }>;
    }).runAnalysis({ element: task.element, family: task.family }));
    if (!result.ok) {
      throw new Error(`Manifold.runAnalysis failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "causal_screen") {
    // getAgentByName sets the stub name (see manifold_analysis note above).
    const stub = await getAgentByName(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runScreen: (opts: { grouping: "element" | "pair_style" | "potential_label" }) => Promise<{ ok: boolean; error?: string }>;
    }).runScreen({ grouping: task.grouping }));
    if (!result.ok) {
      throw new Error(`Causal.runScreen failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "claim-audio") {
    const storageKey = `claim-audio/${task.claim_id}.mp3`;
    const result = await generateAndStoreAudio(env, {
      text: task.text,
      storageKey,
      voice_id: task.voice_id,
    });
    if (!result.ok) {
      throw new Error(`TTS failed: ${result.error}`);
    }
    await patchClaimData(env, task.claim_id, {
      audio_key: storageKey,
      audio_bytes: result.bytes ?? null,
    });
    return;
  }

  // Defensive — this path is unreachable per the type union.
  throw new Error(`Unknown task kind: ${(task as ResearchTask).kind}`);
}

/**
 * Merge keys into a claim row's claim_data JSON. No-op if the row is
 * missing or claim_data isn't valid JSON. Used by claim-image and
 * claim-audio to attach asset keys.
 */
async function patchClaimData(
  env: Env,
  claimId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    const row = await env.LEDGER
      .prepare(`SELECT claim_data FROM claims WHERE claim_id = ?1`)
      .bind(claimId)
      .first<{ claim_data: string }>();
    if (!row) return;
    const data = (() => {
      try { return JSON.parse(row.claim_data); } catch { return {}; }
    })();
    Object.assign(data, patch);
    await env.LEDGER
      .prepare(`UPDATE claims SET claim_data = ?1 WHERE claim_id = ?2`)
      .bind(JSON.stringify(data), claimId)
      .run();
  } catch (e) {
    console.error(`patchClaimData: failed for ${claimId}:`, e);
  }
}

/**
 * Queue consumer. Wired from the `queue` export in server.ts.
 *
 * Per-message error handling:
 *   - Transient (network, 5xx)  → message.retry() to re-enqueue
 *   - Permanent (4xx, type)     → message.ack() and mark failed
 *   - Unknown                   → throw, queue runtime retries up to 3 then DLQ
 */
export async function consumeBatch(
  batch: MessageBatch<ResearchTask & { job_id: string }>,
  env: Env,
): Promise<void> {
  traceEnv(env);
  const tracer = trace.getTracer("glim-think.queue");
  await tracer.startActiveSpan("queue.consumeBatch", async (batchSpan) => {
    batchSpan.setAttribute("queue.batch.size", batch.messages.length);
    try {
      await ensureSchema(env);

      for (const message of batch.messages) {
        const task = message.body;
        const jobId = task.job_id;
        await tracer.startActiveSpan("queue.processMessage", async (msgSpan) => {
          msgSpan.setAttribute("queue.message.job_id", jobId);
          msgSpan.setAttribute("queue.message.kind", task.kind);
          try {
            await markStarted(env, jobId);
            await withTaskPipeline(task.kind, task.dedup_key, async () => runTask(env, task));
            await markFinished(env, jobId, "success");
            message.ack();
            msgSpan.setStatus({ code: SpanStatusCode.OK });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`research queue: job ${jobId} failed:`, msg);
            msgSpan.recordException(e as Error);
            msgSpan.setStatus({ code: SpanStatusCode.ERROR, message: msg });
            // Heuristic: 4xx or shape error → permanent failure
            if (msg.includes("400") || msg.includes("Unknown task kind")) {
              await markFinished(env, jobId, "failed", msg);
              message.ack();
            } else {
              // Bubble up so queue runtime applies retry / DLQ policy
              throw e;
            }
          } finally {
            msgSpan.end();
          }
        });
      }
      batchSpan.setStatus({ code: SpanStatusCode.OK });
    } catch (err) {
      batchSpan.recordException(err as Error);
      batchSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      batchSpan.end();
    }
  });
}
