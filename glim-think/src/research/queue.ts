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

import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";
import { getNamedAgentStub } from "../agents/named-stub";
import type { Env } from "../types";
import { traceEnv } from "../telemetry/storage";
import { withTaskPipeline } from "../telemetry/pipeline";
import { createLabBroadcast } from "../scheduled";
import { evaluateHypothesis } from "./evaluate";
import { generateAndStoreImage } from "../agents/image";
import { generateAndStoreAudio } from "../agents/tts";
import { accumulateCost } from "../telemetry/pipeline";
import { insertEval } from "../evals/store";
import { traceHypothesisStage } from "../telemetry/hypothesisTrace";
import { dispatchAtlasJob, type TaskPayload as AtlasTaskPayload } from "./dispatch";

export type ResearchTaskKind =
  | "round"
  | "literature"
  | "evaluate"
  | "broadcast"
  | "claim-image"
  | "claim-audio"
  | "manifold_analysis"   // Phase A Option-C: dispatch to Manifold DO
  | "causal_screen"       // Phase A Option-C: dispatch to Causal DO
  | "causal_structure_property"   // Round C2: structure×property screen
  | "causal_structure_scalefree"  // Round C3′: scale-free structure screen
  | "causal_data_integrity"       // Round C4: contamination quarantine + clean re-screen
  | "data_purge"                  // Durable corpus cleanup (delete corrupt records)
  | "corpus_audit"                // Property-aware data-quality audit
  | "multiproperty_seed"          // De-myopization: recover a0 as a 2nd property
  | "model_geometry_distill"      // Hypothesis-bound local/atlas model-geometry evidence
  | "mlip_cell_run";              // Real MLIP runner cell for baseline/Distill 5x5x3 campaigns

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
  force?: boolean;
}

/**
 * Run Causal.runScreen(grouping) on a single Causal DO instance. Pure
 * deterministic computation. Writes a CausalScreen claim + DO-local row.
 */
export interface CausalScreenTask extends ResearchTaskBase {
  kind: "causal_screen";
  grouping: "element" | "pair_style" | "potential_label" | "structure";
}

/** Round C2: property-resolved BCC/FCC screen (C11/C12/C44 × structure). */
export interface CausalStructurePropertyTask extends ResearchTaskBase {
  kind: "causal_structure_property";
}

/** Round C3′: scale-free BCC/FCC screen (range-restriction test). */
export interface CausalStructureScaleFreeTask extends ResearchTaskBase {
  kind: "causal_structure_scalefree";
}

/** Round C4: data-integrity remediation (contamination quarantine + re-screen). */
export interface CausalDataIntegrityTask extends ResearchTaskBase {
  kind: "causal_data_integrity";
}

/** Durable corpus cleanup — permanently delete physically-impossible records. */
export interface DataPurgeTask extends ResearchTaskBase {
  kind: "data_purge";
}

/** Property-aware data-quality audit (verifies cleanup, finds subtle errors). */
export interface CorpusAuditTask extends ResearchTaskBase {
  kind: "corpus_audit";
}

/** Recover a0 from MLIP provenance as a genuine 2nd property family. */
export interface MultiPropertySeedTask extends ResearchTaskBase {
  kind: "multiproperty_seed";
}

export type ModelGeometryMode = "auto" | "reference" | "prediction";
export type ModelGeometryQualityGate = "none" | "fit" | "physics" | "accuracy";

export interface ModelGeometryDistillTask extends ResearchTaskBase {
  kind: "model_geometry_distill";
  hypothesis_id: string;
  fixture_url: string;
  campaign_id?: string;
  cell_id?: string;
  row_id?: string;
  mlip_id?: string;
  variant_id?: string;
  model_pairs?: string[];
  mode?: ModelGeometryMode;
  quality_gate?: ModelGeometryQualityGate;
  top_k?: number;
  effective_rank_floor?: number;
  accuracy_max_pct?: number;
}

export type MlipCellVariant = "baseline" | "distill_accuracy" | "distill_accuracy_accelerate";

export interface MlipCellRunTask extends ResearchTaskBase {
  kind: "mlip_cell_run";
  hypothesis_id: string;
  run_id: string;
  campaign_id?: string;
  cell_id: string;
  row_id: string;
  mlip_id: string;
  variant_id: MlipCellVariant;
  manifest_url: string;
  support_manifest_url?: string;
  artifact_prefix?: string;
  fixture_id?: string;
  profile?: string;
  distill_policy_url?: string;
  distill_policy_engine?: "auto" | "python" | "rust";
  ribbon_version?: string;
}

export type ResearchTask =
  | RoundTask
  | LiteratureTask
  | EvaluateTask
  | BroadcastTask
  | ClaimImageTask
  | ClaimAudioTask
  | ManifoldAnalysisTask
  | CausalScreenTask
  | CausalStructurePropertyTask
  | CausalStructureScaleFreeTask
  | CausalDataIntegrityTask
  | DataPurgeTask
  | CorpusAuditTask
  | MultiPropertySeedTask
  | ModelGeometryDistillTask
  | MlipCellRunTask;

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

function workerBeatEmitUrl(env: Env): string {
  const base =
    (env as Env & { WORKER_URL?: string }).WORKER_URL?.trim() ||
    "https://glim-think-v1.aw-ab5.workers.dev";
  return base.endsWith("/feed/beats")
    ? base
    : `${base.replace(/\/+$/, "")}/feed/beats`;
}

export function buildModelGeometryAtlasPayload(
  task: ModelGeometryDistillTask,
  beatEmitUrl: string,
): AtlasTaskPayload {
  const mode = task.mode ?? "auto";
  const qualityGate = task.quality_gate ?? "accuracy";
  const topK = Math.max(1, Math.trunc(task.top_k ?? 5));
  const effectiveRankFloor = task.effective_rank_floor ?? 0.01;
  const accuracyMaxPct = task.accuracy_max_pct ?? 50;
  const args = [
    "--hypothesis-id",
    task.hypothesis_id,
    "--mode",
    mode,
    "--quality-gate",
    qualityGate,
    "--top-k",
    String(topK),
    "--effective-rank-floor",
    String(effectiveRankFloor),
    "--accuracy-max-pct",
    String(accuracyMaxPct),
  ];
  for (const [flag, value] of [
    ["--campaign-id", task.campaign_id],
    ["--cell-id", task.cell_id],
    ["--row-id", task.row_id],
    ["--mlip-id", task.mlip_id],
    ["--variant-id", task.variant_id],
  ] as const) {
    if (value) args.push(flag, value);
  }
  for (const pair of task.model_pairs ?? []) {
    args.push("--pair", pair);
  }
  return {
    fixture_url: task.fixture_url,
    command: "model-geometry",
    args,
    beat_emit_url: beatEmitUrl,
  };
}

const MLIP_CELL_TARGET_JOBS: Record<string, string> = {
  "mace-mp-0": "mlip-cell-mace",
  chgnet: "mlip-cell-chgnet",
  m3gnet: "mlip-cell-m3gnet",
  "orb-v3": "mlip-cell-orb",
  sevennet: "mlip-cell-sevennet",
};

function normalizeMlipRunnerAxisId(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, "_");
}

function normalizeMlipRunnerVariantId(value: string): string {
  const normalized = normalizeMlipRunnerAxisId(value);
  if (normalized === "distill_accuracy_accelerate") return normalized;
  if (normalized === "distill_accuracy") return normalized;
  if (normalized === "baseline") return normalized;
  return value;
}

function defaultMlipArtifactPrefix(
  env: Env,
  task: MlipCellRunTask,
  normalized?: { row_id?: string; variant_id?: string },
): string {
  const configured = (env as Env & { MLIP_5X5X3_OUTPUT_PREFIX?: string }).MLIP_5X5X3_OUTPUT_PREFIX?.trim();
  const project = env.GCP_PROJECT_ID?.trim() || "shed-489901";
  const base = configured || `gs://${project}-atlas-outputs/mlip-5x5x3`;
  return [
    base.replace(/\/+$/, ""),
    task.run_id,
    normalized?.variant_id ?? task.variant_id,
    normalized?.row_id ?? task.row_id,
    task.mlip_id,
    task.cell_id.replace(/[^a-zA-Z0-9._-]/g, "_"),
  ].join("/");
}

function mlipPolicyUrlFromRegistry(
  env: Env,
  task: MlipCellRunTask,
  normalized: { row_id: string; variant_id: string },
): string | undefined {
  const raw = (env as Env & { MLIP_DISTILL_POLICY_URLS_JSON?: string }).MLIP_DISTILL_POLICY_URLS_JSON?.trim();
  if (!raw) return undefined;
  let registry: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    registry = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    throw new Error("MLIP_DISTILL_POLICY_URLS_JSON must be a JSON object");
  }
  const candidates = [
    `${normalized.variant_id}:${normalized.row_id}:${task.mlip_id}`,
    `${normalized.row_id}:${task.mlip_id}`,
    `${normalized.variant_id}:${normalized.row_id}`,
    `${normalized.variant_id}:${task.mlip_id}`,
    normalized.row_id,
    task.mlip_id,
    `default_${distillProfileForVariant(normalized.variant_id)}`,
    "default",
  ];
  for (const key of candidates) {
    const value = registry[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function distillProfileForVariant(variantId: string): "off" | "accuracy" | "accuracy_accelerate" {
  const normalized = normalizeMlipRunnerVariantId(variantId);
  if (normalized === "distill_accuracy") return "accuracy";
  if (normalized === "distill_accuracy_accelerate") return "accuracy_accelerate";
  return "off";
}

export function buildMlipCellRunPayload(
  env: Env,
  task: MlipCellRunTask,
  beatEmitUrl: string,
): AtlasTaskPayload {
  const targetJob = MLIP_CELL_TARGET_JOBS[task.mlip_id];
  if (!targetJob) throw new Error(`unsupported MLIP runner target for ${task.mlip_id}`);
  const rowId = normalizeMlipRunnerAxisId(task.row_id);
  const variantId = normalizeMlipRunnerVariantId(task.variant_id);
  const distillProfile = distillProfileForVariant(variantId);
  const args = [
    "--run-id",
    task.run_id,
    "--cell-id",
    task.cell_id,
    "--row-id",
    rowId,
    "--mlip-id",
    task.mlip_id,
    "--variant-id",
    variantId,
    "--distill-profile",
    distillProfile,
    "--profile",
    task.profile ?? "lab-gcp-gpu",
    "--fixture-id",
    task.fixture_id ?? "canonical-structures-v2",
    "--manifest-url",
    task.manifest_url,
    "--artifact-prefix",
    task.artifact_prefix ?? defaultMlipArtifactPrefix(env, task, { row_id: rowId, variant_id: variantId }),
  ];
  if (task.campaign_id) args.push("--campaign-id", task.campaign_id);
  if (distillProfile !== "off" && task.support_manifest_url) {
    args.push("--support-manifest-url", task.support_manifest_url);
  }
  if (distillProfile !== "off") {
    args.push(
      "--distill-policy-engine",
      task.distill_policy_engine ??
        ((env as Env & { MLIP_DISTILL_POLICY_ENGINE?: string }).MLIP_DISTILL_POLICY_ENGINE as "auto" | "python" | "rust" | undefined) ??
        "auto",
    );
    args.push(
      "--ribbon-version",
      task.ribbon_version ??
        (env as Env & { MLIP_DISTILL_RIBBON_VERSION?: string }).MLIP_DISTILL_RIBBON_VERSION ??
        "hyperribbon-v1",
    );
  }
  const distillPolicyUrl = task.distill_policy_url ??
    mlipPolicyUrlFromRegistry(env, task, { row_id: rowId, variant_id: variantId }) ??
    (env as Env & { MLIP_DISTILL_POLICY_URL?: string }).MLIP_DISTILL_POLICY_URL;
  if (distillProfile !== "off" && distillPolicyUrl) args.push("--distill-policy-url", distillPolicyUrl);
  return {
    fixture_url: task.manifest_url,
    command: "run-cell",
    args,
    beat_emit_url: beatEmitUrl,
    target_job: targetJob,
  };
}

async function recordMlipCellDispatchEval(
  env: Env,
  span: Span,
  task: MlipCellRunTask,
  label: "pass" | "fail",
  explanation: string,
): Promise<void> {
  const ctx = span.spanContext();
  await insertEval(env, {
    trace_id: ctx.traceId,
    span_id: ctx.spanId,
    agent_class: "mlip-cell-runner",
    task_kind: task.kind,
    evaluator_name: "mlip_cell.dispatch_contract",
    score: label === "pass" ? 1 : 0,
    label,
    explanation: `${explanation} cell=${task.cell_id} variant=${task.variant_id} mlip=${task.mlip_id} row=${task.row_id}`,
    action_taken: label === "pass" ? "accepted" : "failed",
    retry_count: 0,
    created_at: new Date().toISOString(),
  });
}

async function recordModelGeometryDispatchEval(
  env: Env,
  span: Span,
  task: ModelGeometryDistillTask,
  label: "pass" | "fail",
  explanation: string,
): Promise<void> {
  const ctx = span.spanContext();
  await insertEval(env, {
    trace_id: ctx.traceId,
    span_id: ctx.spanId,
    agent_class: "atlas-distill",
    task_kind: task.kind,
    evaluator_name: "model_geometry.dispatch_contract",
    score: label === "pass" ? 1 : 0,
    label,
    explanation,
    action_taken: label === "pass" ? "accepted" : "failed",
    retry_count: 0,
    created_at: new Date().toISOString(),
  });
}

async function runTaskInner(env: Env, task: ResearchTask & { job_id?: string }): Promise<void> {
  if (task.kind === "broadcast") {
    await createLabBroadcast(env, task.source);
    return;
  }

  if (task.kind === "round") {
    // Phoenix proved the old design pathological: this task synchronously
    // self-fetched POST /run and blocked the queue consumer for the entire
    // ~40s research pipeline → redelivery-window blowout + contention under
    // concurrency. Decompose into the SAME short, independent sub-tasks the
    // FleetOrchestrator already uses (manifold_analysis + causal_screen) and
    // return in milliseconds. Faithful to analysis_types; the heavy work
    // runs as the already-optimised sub-tasks, not a blocking self-call.
    const at = task.analysis_types ?? ["manifold", "causal"];
    const stamp = new Date().toISOString();
    if (at.includes("manifold")) {
      await enqueueTask(env, {
        kind: "manifold_analysis",
        dedup_key: `round-manifold:${task.element}:${stamp}`,
        enqueued_at: stamp,
        element: task.element,
        force: true,
      });
    }
    if (at.includes("causal")) {
      await enqueueTask(env, {
        kind: "causal_screen",
        dedup_key: `round-causal:element:${stamp}`,
        enqueued_at: stamp,
        grouping: "element",
      });
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

  if (task.kind === "model_geometry_distill") {
    const beatEmitUrl = workerBeatEmitUrl(env);
    const payload = buildModelGeometryAtlasPayload(task, beatEmitUrl);
    await traceHypothesisStage(
      {
        hypothesisId: task.hypothesis_id,
        stage: "compute_dispatch",
        status: "testing",
        attributes: {
          "experiment.kind": task.kind,
          "experiment.engine": "atlas-distill model-geometry",
          "experiment.fixture_url": task.fixture_url,
          "experiment.mode": task.mode ?? "auto",
          "experiment.quality_gate": task.quality_gate ?? "accuracy",
          "experiment.top_k": Math.max(1, Math.trunc(task.top_k ?? 5)),
          "experiment.effective_rank_floor": task.effective_rank_floor ?? 0.01,
          "experiment.accuracy_max_pct": task.accuracy_max_pct ?? 50,
          "experiment.model_pair_count": task.model_pairs?.length ?? 0,
          "experiment.campaign_id": task.campaign_id ?? "",
          "experiment.cell_id": task.cell_id ?? "",
          "experiment.row_id": task.row_id ?? "",
          "experiment.mlip_id": task.mlip_id ?? "",
          "experiment.variant_id": task.variant_id ?? "",
        },
      },
      async (span) => {
        try {
          const result = await dispatchAtlasJob(env, payload);
          span.setAttribute("compute.dispatch.task_name", result.task_name);
          span.setAttribute("compute.dispatch.dev_mode", result.dev_mode);
          span.setAttribute("compute.dispatch.command", payload.command);
          await recordModelGeometryDispatchEval(
            env,
            span,
            task,
            "pass",
            "Accepted by atlas-distill dispatcher; model-geometry evidence beat is expected on completion.",
          );
        } catch (e) {
          await recordModelGeometryDispatchEval(
            env,
            span,
            task,
            "fail",
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      },
    );
    return;
  }

  if (task.kind === "mlip_cell_run") {
    const beatEmitUrl = workerBeatEmitUrl(env);
    const payload = buildMlipCellRunPayload(env, task, beatEmitUrl);
    await traceHypothesisStage(
      {
        hypothesisId: task.hypothesis_id,
        stage: "compute_dispatch",
        status: "testing",
        attributes: {
          "experiment.kind": task.kind,
          "experiment.engine": "mlip-cell-runner",
          "experiment.run_id": task.run_id,
          "experiment.campaign_id": task.campaign_id ?? "",
          "experiment.cell_id": task.cell_id,
          "experiment.row_id": task.row_id,
          "experiment.mlip_id": task.mlip_id,
          "experiment.variant_id": task.variant_id,
          "experiment.distill_profile": distillProfileForVariant(task.variant_id),
          "experiment.target_job": payload.target_job ?? "",
          "experiment.manifest_url": task.manifest_url,
          "experiment.support_manifest_url": task.support_manifest_url ?? "",
        },
      },
      async (span) => {
        try {
          const result = await dispatchAtlasJob(env, payload);
          span.setAttribute("compute.dispatch.task_name", result.task_name);
          span.setAttribute("compute.dispatch.dev_mode", result.dev_mode);
          span.setAttribute("compute.dispatch.command", payload.command);
          span.setAttribute("compute.dispatch.target_job", payload.target_job ?? "");
          await recordMlipCellDispatchEval(
            env,
            span,
            task,
            "pass",
            "Accepted by MLIP cell dispatcher; lupine.mlip.cell_result.v1 beat is expected on completion.",
          );
        } catch (e) {
          await recordMlipCellDispatchEval(
            env,
            span,
            task,
            "fail",
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      },
    );
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
    const stub = await getNamedAgentStub(env.MANIFOLD_AGENT, `manifold-${task.element}`);
    const result = (await (stub as unknown as {
      runAnalysis: (opts: { element: string; family?: string; force?: boolean }) => Promise<{ ok: boolean; error?: string }>;
    }).runAnalysis({ element: task.element, family: task.family, force: task.force }));
    if (!result.ok) {
      throw new Error(`Manifold.runAnalysis failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "causal_screen") {
    // getAgentByName sets the stub name (see manifold_analysis note above).
    const stub = await getNamedAgentStub(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runScreen: (opts: { grouping: "element" | "pair_style" | "potential_label" | "structure" }) => Promise<{ ok: boolean; error?: string }>;
    }).runScreen({ grouping: task.grouping }));
    if (!result.ok) {
      throw new Error(`Causal.runScreen failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "causal_structure_property") {
    const stub = await getNamedAgentStub(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runStructurePropertyScreen: () => Promise<{ ok: boolean; error?: string }>;
    }).runStructurePropertyScreen());
    if (!result.ok) {
      throw new Error(`Causal.runStructurePropertyScreen failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "causal_structure_scalefree") {
    const stub = await getNamedAgentStub(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runStructureScaleFreeScreen: () => Promise<{ ok: boolean; error?: string }>;
    }).runStructureScaleFreeScreen());
    if (!result.ok) {
      throw new Error(`Causal.runStructureScaleFreeScreen failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "causal_data_integrity") {
    const stub = await getNamedAgentStub(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runDataIntegrityScreen: () => Promise<{ ok: boolean; error?: string }>;
    }).runDataIntegrityScreen());
    if (!result.ok) {
      throw new Error(`Causal.runDataIntegrityScreen failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "data_purge") {
    const stub = await getNamedAgentStub(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runDataPurge: () => Promise<{ ok: boolean; error?: string }>;
    }).runDataPurge());
    if (!result.ok) {
      throw new Error(`Causal.runDataPurge failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "corpus_audit") {
    const stub = await getNamedAgentStub(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runCorpusAudit: () => Promise<{ ok: boolean; error?: string }>;
    }).runCorpusAudit());
    if (!result.ok) {
      throw new Error(`Causal.runCorpusAudit failed: ${result.error ?? "unknown"}`);
    }
    return;
  }

  if (task.kind === "multiproperty_seed") {
    const stub = await getNamedAgentStub(env.CAUSAL_AGENT, "causal-main");
    const result = (await (stub as unknown as {
      runMultiPropertySeed: () => Promise<{ ok: boolean; error?: string }>;
    }).runMultiPropertySeed());
    if (!result.ok) {
      throw new Error(`Causal.runMultiPropertySeed failed: ${result.error ?? "unknown"}`);
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
/**
 * Deterministic failures that will NOT succeed within the 3-retry window —
 * retrying just wastes compute + floods telemetry. Ack + mark failed (→DLQ)
 * instead of bubbling to the queue retry policy.
 */
function isPermanentTaskError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("unknown task kind") ||
    /\b(400|401|403|404)\b/.test(m) ||
    m.includes("usage limit") || m.includes("quota") ||
    m.includes("insufficient balance") || m.includes("no resource package") ||
    m.includes("2056") || m.includes("1113") ||           // MiniMax / ZAI caps
    m.includes("invalid api key") || m.includes("invalid token") ||
    m.includes("not found on this server")
  );
}

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
            // Permanent (won't succeed within the 3-retry/minutes window):
            // shape errors, 4xx auth/not-found, and DETERMINISTIC external
            // quota/rate caps (e.g. MiniMax 2056 "5-hour usage limit",
            // ZAI 1113 "insufficient balance"). Phoenix showed these were
            // burning 3 retries + cascading 5× error spans each. Fail fast
            // to DLQ instead. Transient (network/5xx/timeout) still retries.
            if (isPermanentTaskError(msg)) {
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
