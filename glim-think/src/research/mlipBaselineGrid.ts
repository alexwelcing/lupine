import { trace } from "@opentelemetry/api";
import { ensureAgendaSchema } from "../agenda";
import { insertEval } from "../evals/store";
import { registerResource } from "../resource-fabric";
import { traceHypothesisStage } from "../telemetry/hypothesisTrace";
import type { Env } from "../types";
import { dispatchAtlasJob, type TaskPayload } from "./dispatch";
import { DEFAULT_ACCURACY_ROWS, DEFAULT_MLIP_COLUMNS } from "./mlipCampaign";
import {
  classifyMlipFixtureTarget,
  mlipBaselineReleaseGate,
  mlipCellReadiness,
  MLIP_BASELINE_RELEASE_FIXTURE_ID,
} from "./mlipBaselineReadiness";
import { annotateMlipBaselineCellForPhoenix, MLIP_PHOENIX_EVALUATOR_SPECS } from "./mlipPhoenix";

export const MLIP_BASELINE_WORKFLOW_ID = "mlip-baseline-grid";
export const MLIP_BASELINE_FIXTURE_ID = MLIP_BASELINE_RELEASE_FIXTURE_ID;

export type MlipBaselineProfile = "smoke" | "lab-gcp-gpu" | "lab-gcp-cpu";
export type MlipBaselineRunStatus =
  | "created"
  | "queued"
  | "running"
  | "awaiting_results"
  | "completed"
  | "partial"
  | "failed"
  | "failed_preflight";
export type MlipBaselineCellStatus = "queued" | "enqueued" | "running" | "completed" | "failed";

export interface CreateMlipBaselineGridInput {
  run_id?: string;
  hypothesis_id?: string;
  title?: string;
  profile?: MlipBaselineProfile;
  fixture_id?: string;
  manifest_url?: string;
  artifact_prefix?: string;
  max_dollars_per_hour?: number;
  max_active_gpu_cells?: number;
  max_poll_waves?: number;
}

export interface MlipBaselineGridWorkflowParams {
  run_id: string;
}

export interface MlipBaselineRunRecord {
  run_id: string;
  workflow_instance_id: string | null;
  hypothesis_id: string;
  title: string;
  status: MlipBaselineRunStatus;
  profile: MlipBaselineProfile;
  fixture_id: string;
  manifest_url: string;
  artifact_prefix: string;
  max_dollars_per_hour: number;
  requested_max_active_gpu_cells: number;
  max_active_gpu_cells: number;
  max_poll_waves: number;
  rows_json: string;
  mlips_json: string;
  cost_estimate_json: string;
  report_r2_key: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface MlipBaselineCellRecord {
  cell_id: string;
  run_id: string;
  row_id: string;
  mlip_id: string;
  status: MlipBaselineCellStatus;
  target_job: string | null;
  manifest_url: string | null;
  task_name: string | null;
  operation_name: string | null;
  accuracy_score: number | null;
  accuracy_unit: string | null;
  speed_score: number | null;
  speed_unit: string | null;
  metrics_json: string | null;
  artifact_uri: string | null;
  trace_id: string | null;
  span_id: string | null;
  retry_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  enqueued_at: string | null;
  completed_at: string | null;
}

export interface MlipBaselineState {
  run: MlipBaselineRunRecord;
  cells: MlipBaselineCellRecord[];
  summary: MlipBaselineSummary;
}

export interface MlipBaselineSummary {
  cells_total: number;
  cells_completed: number;
  cells_failed: number;
  cells_enqueued: number;
  cells_running: number;
  cells_queued: number;
  mean_accuracy: number | null;
  mean_speed: number | null;
  estimated_hourly_cost: number;
  observed_runtime_seconds: number | null;
}

export interface MlipBaselineCellResultInput {
  run_id: string;
  cell_id: string;
  row_id?: string;
  mlip_id?: string;
  status?: MlipBaselineCellStatus;
  accuracy_score?: number;
  accuracy_unit?: string;
  speed_score?: number;
  speed_unit?: string;
  metrics?: Record<string, unknown>;
  artifact_uri?: string;
  operation_name?: string;
  error?: string;
  trace_id?: string;
  span_id?: string;
}

export type MlipBaselineDispatchValue = string | number | boolean | null;
export type MlipBaselineDispatchRecord = Record<string, MlipBaselineDispatchValue>;

export interface MlipBaselineDispatchResult {
  dispatched: MlipBaselineDispatchRecord[];
  skipped: MlipBaselineDispatchRecord[];
  active: number;
  capacity: number;
}

interface NormalizedCreateInput extends Required<Omit<
  CreateMlipBaselineGridInput,
  "run_id" | "title" | "hypothesis_id" | "profile" | "fixture_id" | "manifest_url" | "artifact_prefix"
>> {
  run_id: string;
  title: string;
  hypothesis_id: string;
  profile: MlipBaselineProfile;
  fixture_id: string;
  manifest_url: string;
  artifact_prefix: string;
  requested_max_active_gpu_cells: number;
  cost_estimate: MlipBaselineCostEstimate;
}

export interface MlipBaselineCostEstimate {
  profile: MlipBaselineProfile;
  active_cells: number;
  per_cell_hourly_usd: number;
  estimated_hourly_usd: number;
  max_dollars_per_hour: number;
  capped_by_budget: boolean;
  rates: {
    cpu_vcpu_second_usd: number;
    memory_gib_second_usd: number;
    l4_gpu_second_usd: number;
    minimum_billable_seconds: number;
  };
  assumptions: {
    region: string;
    cpu: number;
    memory_gib: number;
    gpu_l4: number;
  };
}

const RUNS_DDL = `
  CREATE TABLE IF NOT EXISTS mlip_baseline_runs (
    run_id TEXT PRIMARY KEY,
    workflow_instance_id TEXT,
    hypothesis_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    profile TEXT NOT NULL,
    fixture_id TEXT NOT NULL,
    manifest_url TEXT NOT NULL,
    artifact_prefix TEXT NOT NULL,
    max_dollars_per_hour REAL NOT NULL,
    requested_max_active_gpu_cells INTEGER NOT NULL,
    max_active_gpu_cells INTEGER NOT NULL,
    max_poll_waves INTEGER NOT NULL,
    rows_json TEXT NOT NULL,
    mlips_json TEXT NOT NULL,
    cost_estimate_json TEXT NOT NULL,
    report_r2_key TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  )
`;

const CELLS_DDL = `
  CREATE TABLE IF NOT EXISTS mlip_baseline_cells (
    cell_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    row_id TEXT NOT NULL,
    mlip_id TEXT NOT NULL,
    status TEXT NOT NULL,
    target_job TEXT,
    manifest_url TEXT,
    task_name TEXT,
    operation_name TEXT,
    accuracy_score REAL,
    accuracy_unit TEXT,
    speed_score REAL,
    speed_unit TEXT,
    metrics_json TEXT,
    artifact_uri TEXT,
    trace_id TEXT,
    span_id TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    enqueued_at TEXT,
    completed_at TEXT
  )
`;

const CELLS_RUN_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_mlip_baseline_cells_run_status
  ON mlip_baseline_cells(run_id, status, updated_at)
`;

const CELLS_GRID_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_mlip_baseline_cells_grid
  ON mlip_baseline_cells(run_id, row_id, mlip_id)
`;

export const MLIP_BASELINE_TARGET_JOBS: Record<string, string> = {
  "mace-mp-0": "mlip-cell-mace",
  chgnet: "mlip-cell-chgnet",
  m3gnet: "mlip-cell-m3gnet",
  "orb-v3": "mlip-cell-orb",
  sevennet: "mlip-cell-sevennet",
};

const COST_RATES = {
  cpu_vcpu_second_usd: 0.000024,
  memory_gib_second_usd: 0.0000025,
  l4_gpu_second_usd: 0.0001557,
  minimum_billable_seconds: 60,
};

const LAB_GPU_SHAPE = {
  region: "us-central1",
  cpu: 4,
  memory_gib: 16,
  gpu_l4: 1,
};

const LAB_CPU_SHAPE = {
  region: "us-central1",
  cpu: 4,
  memory_gib: 16,
  gpu_l4: 0,
};

function nowIso(): string {
  return new Date().toISOString();
}

function compactStamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function defaultManifestUrl(env: Env, fixtureId: string): string {
  const configured = env.MLIP_BASELINE_MANIFEST_URL?.trim();
  if (configured) return configured;
  const project = env.GCP_PROJECT_ID?.trim() || "shed-489901";
  return `gs://${project}-atlas-inputs/mlip-baseline/${fixtureId}/manifest.json`;
}

function defaultArtifactPrefix(env: Env, runId: string): string {
  const configured = env.MLIP_BASELINE_OUTPUT_PREFIX?.trim();
  if (configured) return `${configured.replace(/\/+$/, "")}/${runId}`;
  const project = env.GCP_PROJECT_ID?.trim() || "shed-489901";
  return `gs://${project}-atlas-outputs/mlip-baseline-grid/${runId}`;
}

function profileShape(profile: MlipBaselineProfile): typeof LAB_GPU_SHAPE {
  if (profile === "lab-gcp-cpu") return LAB_CPU_SHAPE;
  if (profile === "smoke") return { ...LAB_CPU_SHAPE, cpu: 0, memory_gib: 0 };
  return LAB_GPU_SHAPE;
}

export function estimateMlipBaselineCost(
  profile: MlipBaselineProfile,
  requestedActiveCells: number,
  maxDollarsPerHour: number,
): MlipBaselineCostEstimate {
  const active = Math.max(1, Math.trunc(requestedActiveCells));
  const budget = Math.max(0, maxDollarsPerHour);
  if (profile === "smoke") {
    return {
      profile,
      active_cells: 0,
      per_cell_hourly_usd: 0,
      estimated_hourly_usd: 0,
      max_dollars_per_hour: budget,
      capped_by_budget: false,
      rates: COST_RATES,
      assumptions: profileShape(profile),
    };
  }

  const shape = profileShape(profile);
  const perCellHourly =
    shape.cpu * 3600 * COST_RATES.cpu_vcpu_second_usd +
    shape.memory_gib * 3600 * COST_RATES.memory_gib_second_usd +
    shape.gpu_l4 * 3600 * COST_RATES.l4_gpu_second_usd;
  const budgetActive = budget > 0 ? Math.floor(budget / perCellHourly) : 0;
  if (budgetActive < 1) {
    throw new Error(
      `max_dollars_per_hour=${budget} cannot start one ${profile} cell; estimated per-cell hourly cost is ${perCellHourly.toFixed(2)}`,
    );
  }
  const capped = Math.max(1, Math.min(active, budgetActive));
  return {
    profile,
    active_cells: capped,
    per_cell_hourly_usd: Number(perCellHourly.toFixed(4)),
    estimated_hourly_usd: Number((perCellHourly * capped).toFixed(4)),
    max_dollars_per_hour: budget,
    capped_by_budget: capped < active,
    rates: COST_RATES,
    assumptions: shape,
  };
}

function normalizeCreateInput(env: Env, input: CreateMlipBaselineGridInput): NormalizedCreateInput {
  const profile = input.profile ?? "lab-gcp-gpu";
  if (!["smoke", "lab-gcp-gpu", "lab-gcp-cpu"].includes(profile)) {
    throw new Error(`Unsupported MLIP baseline profile '${profile}'`);
  }
  const fixtureId = input.fixture_id?.trim() || MLIP_BASELINE_FIXTURE_ID;
  const runId = input.run_id?.trim() || `${MLIP_BASELINE_WORKFLOW_ID}-${compactStamp()}`;
  const maxDollars = finiteNumber(input.max_dollars_per_hour) ? input.max_dollars_per_hour : 20;
  const requestedActive = Math.max(1, Math.trunc(input.max_active_gpu_cells ?? 10));
  const cost = estimateMlipBaselineCost(profile, requestedActive, maxDollars);
  return {
    run_id: runId,
    title: input.title?.trim() || "MLIP baseline grid Lab run",
    hypothesis_id: input.hypothesis_id?.trim() || "mlip-baseline-grid-lab",
    profile,
    fixture_id: fixtureId,
    manifest_url: input.manifest_url?.trim() || defaultManifestUrl(env, fixtureId),
    artifact_prefix: input.artifact_prefix?.trim() || defaultArtifactPrefix(env, runId),
    max_dollars_per_hour: maxDollars,
    requested_max_active_gpu_cells: requestedActive,
    max_active_gpu_cells: cost.active_cells || 0,
    max_poll_waves: Math.max(1, Math.trunc(input.max_poll_waves ?? 72)),
    cost_estimate: cost,
  };
}

export async function ensureMlipBaselineSchema(env: Env): Promise<void> {
  await env.LEDGER.prepare(RUNS_DDL).run();
  await env.LEDGER.prepare(CELLS_DDL).run();
  await env.LEDGER.prepare(CELLS_RUN_INDEX).run();
  await env.LEDGER.prepare(CELLS_GRID_INDEX).run();
}

export function buildMlipBaselineCellId(runId: string, rowId: string, mlipId: string): string {
  return `${runId}:baseline:${rowId}:${mlipId}`;
}

export function buildMlipBaselineGrid(runId: string, manifestUrl: string, profile: MlipBaselineProfile) {
  const cells: Array<Pick<
    MlipBaselineCellRecord,
    "cell_id" | "run_id" | "row_id" | "mlip_id" | "target_job" | "manifest_url" | "status"
  >> = [];
  for (const row of DEFAULT_ACCURACY_ROWS) {
    for (const mlip of DEFAULT_MLIP_COLUMNS) {
      cells.push({
        cell_id: buildMlipBaselineCellId(runId, row.id, mlip.id),
        run_id: runId,
        row_id: row.id,
        mlip_id: mlip.id,
        target_job: profile === "smoke" ? null : MLIP_BASELINE_TARGET_JOBS[mlip.id],
        manifest_url: manifestUrl,
        status: "queued",
      });
    }
  }
  return cells;
}

export async function createMlipBaselineRun(
  env: Env,
  input: CreateMlipBaselineGridInput,
): Promise<{ run_id: string; inserted_cells: number; cells_expected: number; profile: MlipBaselineProfile; cost_estimate: MlipBaselineCostEstimate }> {
  await ensureMlipBaselineSchema(env);
  await ensureAgendaSchema(env);
  const normalized = normalizeCreateInput(env, input);
  const stamp = nowIso();
  const cells = buildMlipBaselineGrid(normalized.run_id, normalized.manifest_url, normalized.profile);
  if (cells.some((cell) => normalized.profile !== "smoke" && !cell.target_job)) {
    throw new Error("Every lab MLIP column must map to a GCP target job");
  }

  await env.LEDGER.prepare(
    `INSERT OR REPLACE INTO mlip_baseline_runs
      (run_id, workflow_instance_id, hypothesis_id, title, status, profile, fixture_id,
       manifest_url, artifact_prefix, max_dollars_per_hour, requested_max_active_gpu_cells,
       max_active_gpu_cells, max_poll_waves, rows_json, mlips_json, cost_estimate_json,
       report_r2_key, error, created_at, updated_at, started_at, finished_at)
     VALUES (?1, NULL, ?2, ?3, 'created', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
       ?12, ?13, ?14, NULL, NULL, ?15, ?15, NULL, NULL)`,
  ).bind(
    normalized.run_id,
    normalized.hypothesis_id,
    normalized.title,
    normalized.profile,
    normalized.fixture_id,
    normalized.manifest_url,
    normalized.artifact_prefix,
    normalized.max_dollars_per_hour,
    normalized.requested_max_active_gpu_cells,
    normalized.max_active_gpu_cells,
    normalized.max_poll_waves,
    JSON.stringify(DEFAULT_ACCURACY_ROWS),
    JSON.stringify(DEFAULT_MLIP_COLUMNS),
    JSON.stringify(normalized.cost_estimate),
    stamp,
  ).run();

  let inserted = 0;
  for (const cell of cells) {
    await env.LEDGER.prepare(
      `INSERT OR REPLACE INTO mlip_baseline_cells
        (cell_id, run_id, row_id, mlip_id, status, target_job, manifest_url,
         created_at, updated_at, retry_count)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, 0)`,
    ).bind(
      cell.cell_id,
      cell.run_id,
      cell.row_id,
      cell.mlip_id,
      cell.status,
      cell.target_job,
      cell.manifest_url,
      stamp,
    ).run();
    inserted += 1;
  }

  await env.LEDGER.prepare(
    `INSERT OR IGNORE INTO intelligence_tasks
      (task_id, title, domain, specialty, horizon, priority, payload, due_at)
     VALUES (?1, ?2, 'mlip-baseline-grid', 'experiment', 'now', 1, ?3, datetime('now', '+2 hours'))`,
  ).bind(
    `agenda:${MLIP_BASELINE_WORKFLOW_ID}:${normalized.run_id}`,
    normalized.title,
    JSON.stringify({
      workflow_id: MLIP_BASELINE_WORKFLOW_ID,
      run_id: normalized.run_id,
      hypothesis_id: normalized.hypothesis_id,
      profile: normalized.profile,
      cells: cells.length,
      cost_estimate: normalized.cost_estimate,
      objective: "produce a public 5x5 baseline accuracy plus speed grid from governed GCP MLIP runners",
    }),
  ).run();

  return {
    run_id: normalized.run_id,
    inserted_cells: inserted,
    cells_expected: cells.length,
    profile: normalized.profile,
    cost_estimate: normalized.cost_estimate,
  };
}

export async function attachMlipBaselineWorkflowInstance(
  env: Env,
  runId: string,
  workflowInstanceId: string,
): Promise<void> {
  await ensureMlipBaselineSchema(env);
  await env.LEDGER.prepare(
    `UPDATE mlip_baseline_runs
       SET workflow_instance_id = ?2, status = 'queued', updated_at = ?3
     WHERE run_id = ?1`,
  ).bind(runId, workflowInstanceId, nowIso()).run();
}

export async function markMlipBaselineRunStatus(
  env: Env,
  runId: string,
  status: MlipBaselineRunStatus,
  error?: string,
): Promise<void> {
  await ensureMlipBaselineSchema(env);
  const stamp = nowIso();
  await env.LEDGER.prepare(
    `UPDATE mlip_baseline_runs
       SET status = ?2,
           error = ?3,
           started_at = CASE WHEN started_at IS NULL AND ?2 IN ('running', 'awaiting_results') THEN ?4 ELSE started_at END,
           finished_at = CASE WHEN ?2 IN ('completed', 'partial', 'failed', 'failed_preflight') THEN ?4 ELSE finished_at END,
           updated_at = ?4
     WHERE run_id = ?1`,
  ).bind(runId, status, error ?? null, stamp).run();
}

export async function getMlipBaselineRun(env: Env, runId: string): Promise<MlipBaselineState | null> {
  await ensureMlipBaselineSchema(env);
  const run = await env.LEDGER.prepare(
    `SELECT * FROM mlip_baseline_runs WHERE run_id = ?1`,
  ).bind(runId).first<MlipBaselineRunRecord>();
  if (!run) return null;
  const rows = await env.LEDGER.prepare(
    `SELECT * FROM mlip_baseline_cells
      WHERE run_id = ?1
      ORDER BY row_id, mlip_id`,
  ).bind(runId).all<MlipBaselineCellRecord>();
  const cells = (rows.results ?? []) as MlipBaselineCellRecord[];
  return { run, cells, summary: summarizeMlipBaselineRun(run, cells) };
}

export function summarizeMlipBaselineRun(
  run: MlipBaselineRunRecord,
  cells: MlipBaselineCellRecord[],
): MlipBaselineSummary {
  const completed = cells.filter((cell) => cell.status === "completed");
  const accuracies = completed
    .map((cell) => cell.accuracy_score)
    .filter((value): value is number => finiteNumber(value));
  const speeds = completed
    .map((cell) => cell.speed_score)
    .filter((value): value is number => finiteNumber(value));
  const cost = parseJsonObject(run.cost_estimate_json) as unknown as MlipBaselineCostEstimate | null;
  const started = run.started_at ? Date.parse(run.started_at) : NaN;
  const finished = run.finished_at ? Date.parse(run.finished_at) : NaN;
  return {
    cells_total: cells.length,
    cells_completed: completed.length,
    cells_failed: cells.filter((cell) => cell.status === "failed").length,
    cells_enqueued: cells.filter((cell) => cell.status === "enqueued").length,
    cells_running: cells.filter((cell) => cell.status === "running").length,
    cells_queued: cells.filter((cell) => cell.status === "queued").length,
    mean_accuracy: accuracies.length ? accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length : null,
    mean_speed: speeds.length ? speeds.reduce((sum, value) => sum + value, 0) / speeds.length : null,
    estimated_hourly_cost: cost?.estimated_hourly_usd ?? 0,
    observed_runtime_seconds:
      Number.isFinite(started) && Number.isFinite(finished)
        ? Math.max(0, Math.round((finished - started) / 1000))
        : null,
  };
}

function workerBeatEmitUrl(env: Env): string {
  const base = env.WORKER_URL?.trim() || "https://glim-think-v1.aw-ab5.workers.dev";
  return base.endsWith("/feed/beats") ? base : `${base.replace(/\/+$/, "")}/feed/beats`;
}

function cellArtifactPrefix(run: MlipBaselineRunRecord, cell: MlipBaselineCellRecord): string {
  return [
    run.artifact_prefix.replace(/\/+$/, ""),
    cell.row_id,
    cell.mlip_id,
  ].join("/");
}

function buildCellPayload(run: MlipBaselineRunRecord, cell: MlipBaselineCellRecord, env: Env): TaskPayload {
  return {
    fixture_url: run.manifest_url,
    target_job: cell.target_job ?? undefined,
    command: "run-cell",
    beat_emit_url: workerBeatEmitUrl(env),
    args: [
      "--run-id",
      run.run_id,
      "--cell-id",
      cell.cell_id,
      "--row-id",
      cell.row_id,
      "--mlip-id",
      cell.mlip_id,
      "--profile",
      run.profile,
      "--fixture-id",
      run.fixture_id,
      "--manifest-url",
      run.manifest_url,
      "--artifact-prefix",
      cellArtifactPrefix(run, cell),
    ],
  };
}

export async function preflightMlipBaselineRun(
  env: Env,
  runId: string,
): Promise<{ ok: boolean; profile: MlipBaselineProfile; checked: string[] }> {
  const state = await getMlipBaselineRun(env, runId);
  if (!state) throw new Error(`MLIP baseline run '${runId}' not found`);
  const checked = ["D1:mlip_baseline_runs", "D1:mlip_baseline_cells"];
  if (state.run.profile === "smoke") {
    return { ok: true, profile: state.run.profile, checked };
  }
  const missing = [];
  if (!env.TASKS_CONSUMER_URL?.trim()) missing.push("TASKS_CONSUMER_URL");
  if (!state.run.manifest_url.trim()) missing.push("manifest_url");
  if (!state.run.artifact_prefix.trim()) missing.push("artifact_prefix");
  const fixtureTarget = classifyMlipFixtureTarget(state.run.profile, state.run.fixture_id, state.run.manifest_url);
  for (const blocker of fixtureTarget.blockers) missing.push(`fixture:${blocker}`);
  for (const cell of state.cells) {
    if (!cell.target_job) missing.push(`target_job:${cell.mlip_id}`);
  }
  if (missing.length > 0) {
    await markMlipBaselineRunStatus(env, runId, "failed_preflight", `Missing ${missing.join(", ")}`);
    throw new Error(`MLIP baseline preflight failed: missing ${missing.join(", ")}`);
  }
  checked.push("GCP:CloudTasks", "GCP:target_jobs", "GCS:manifest", "GCS:artifact_prefix");
  return { ok: true, profile: state.run.profile, checked };
}

function smokeMetrics(rowIndex: number, mlipIndex: number, cell: MlipBaselineCellRecord) {
  const maePct = 6 + rowIndex * 3.5 + mlipIndex * 2.2;
  const speedBase = [42, 92, 74, 58, 81][mlipIndex] ?? 50;
  const speed = speedBase / (1 + rowIndex * 0.14);
  const accuracy = clamp01(1 - maePct / 50);
  return {
    accuracy_score: Number(accuracy.toFixed(4)),
    accuracy_unit: "canonical_accuracy_from_mae_pct",
    speed_score: Number(speed.toFixed(3)),
    speed_unit: "canonical_configs_per_second",
    metrics: {
      schema: "lupine.mlip.cell_result.v1",
      profile: "smoke",
      run_id: cell.run_id,
      cell_id: cell.cell_id,
      row_id: cell.row_id,
      mlip_id: cell.mlip_id,
      status: "completed",
      fixture: "canonical deterministic smoke values",
      mae_pct: Number(maePct.toFixed(3)),
      accuracy: { score: Number(accuracy.toFixed(4)), unit: "canonical_accuracy_from_mae_pct" },
      speed: { score: Number(speed.toFixed(3)), unit: "canonical_configs_per_second" },
    },
  };
}

export async function completeSmokeMlipBaselineRun(
  env: Env,
  runId: string,
): Promise<{ completed: number }> {
  const state = await getMlipBaselineRun(env, runId);
  if (!state) throw new Error(`MLIP baseline run '${runId}' not found`);
  await markMlipBaselineRunStatus(env, runId, "running");
  let completed = 0;
  for (const cell of state.cells) {
    const rowIndex = DEFAULT_ACCURACY_ROWS.findIndex((row) => row.id === cell.row_id);
    const mlipIndex = DEFAULT_MLIP_COLUMNS.findIndex((mlip) => mlip.id === cell.mlip_id);
    const result = smokeMetrics(Math.max(0, rowIndex), Math.max(0, mlipIndex), cell);
    await recordMlipBaselineCellResult(env, {
      run_id: runId,
      cell_id: cell.cell_id,
      status: "completed",
      accuracy_score: result.accuracy_score,
      accuracy_unit: result.accuracy_unit,
      speed_score: result.speed_score,
      speed_unit: result.speed_unit,
      metrics: result.metrics,
      artifact_uri: `${state.run.artifact_prefix}/${cell.row_id}/${cell.mlip_id}/smoke.json`,
    });
    completed += 1;
  }
  await finalizeMlipBaselineRun(env, runId);
  return { completed };
}

export async function dispatchQueuedMlipBaselineCells(
  env: Env,
  runId: string,
  opts: { limit?: number; dryRun?: boolean; onlyCellId?: string; allowFailed?: boolean } = {},
): Promise<MlipBaselineDispatchResult> {
  const state = await getMlipBaselineRun(env, runId);
  if (!state) throw new Error(`MLIP baseline run '${runId}' not found`);
  if (state.run.profile === "smoke") {
    const done = await completeSmokeMlipBaselineRun(env, runId);
    return { dispatched: [{ smoke_completed: done.completed }], skipped: [], active: 0, capacity: 0 };
  }

  await preflightMlipBaselineRun(env, runId);
  await markMlipBaselineRunStatus(env, runId, "running");
  const active = state.cells.filter((cell) => cell.status === "enqueued" || cell.status === "running").length;
  const capacity = Math.max(0, state.run.max_active_gpu_cells - active);
  const requestedLimit = Math.max(1, Math.trunc(opts.limit ?? capacity));
  const limit = Math.min(capacity, requestedLimit);
  const candidates = state.cells
    .filter((cell) => cell.status === "queued" || (opts.allowFailed && cell.status === "failed"))
    .filter((cell) => !opts.onlyCellId || cell.cell_id === opts.onlyCellId)
    .slice(0, limit);
  const skipped: MlipBaselineDispatchRecord[] = [];
  const dispatched: MlipBaselineDispatchRecord[] = [];
  if (capacity <= 0) {
    return { dispatched, skipped: [{ reason: "active_capacity_reached", active, capacity: state.run.max_active_gpu_cells }], active, capacity };
  }

  for (const cell of candidates) {
    if (!cell.target_job) {
      skipped.push({ cell_id: cell.cell_id, reason: "missing_target_job" });
      continue;
    }
    const payload = buildCellPayload(state.run, cell, env);
    if (opts.dryRun) {
      dispatched.push({ cell_id: cell.cell_id, target_job: cell.target_job, dry_run: true });
      continue;
    }
    await traceHypothesisStage(
      {
        hypothesisId: state.run.hypothesis_id,
        stage: "compute_dispatch",
        status: "testing",
        attributes: {
          "mlip_baseline.run_id": runId,
          "mlip_baseline.cell_id": cell.cell_id,
          "mlip_baseline.row_id": cell.row_id,
          "mlip_baseline.mlip_id": cell.mlip_id,
          "mlip_baseline.target_job": cell.target_job,
          "mlip_baseline.profile": state.run.profile,
        },
      },
      async (span) => {
        const result = await dispatchAtlasJob(env, payload);
        const ctx = span.spanContext();
        await env.LEDGER.prepare(
          `UPDATE mlip_baseline_cells
             SET status = 'enqueued',
                 task_name = ?3,
                 trace_id = ?4,
                 span_id = ?5,
                 retry_count = retry_count + 1,
                 error = NULL,
                 completed_at = NULL,
                 enqueued_at = ?6,
                 updated_at = ?6
           WHERE run_id = ?1 AND cell_id = ?2`,
        ).bind(runId, cell.cell_id, result.task_name, ctx.traceId, ctx.spanId, nowIso()).run();
        await insertEval(env, {
          trace_id: ctx.traceId,
          span_id: ctx.spanId,
          agent_class: "glim-think",
          task_kind: "mlip_baseline_cell",
          evaluator_name: "mlip_baseline.gcp_dispatch_contract",
          score: 1,
          label: "pass",
          explanation: `Accepted ${cell.cell_id} for ${cell.target_job} through Cloud Tasks.`,
          action_taken: "accepted",
          retry_count: 0,
          created_at: nowIso(),
        });
        dispatched.push({
          cell_id: cell.cell_id,
          target_job: cell.target_job,
          task_name: result.task_name,
          dev_mode: result.dev_mode,
        });
      },
    );
  }

  await markMlipBaselineRunStatus(env, runId, "awaiting_results");
  return { dispatched, skipped, active, capacity };
}

export async function recordMlipBaselineCellResult(
  env: Env,
  input: MlipBaselineCellResultInput,
): Promise<{ updated: string; status: MlipBaselineCellStatus }> {
  await ensureMlipBaselineSchema(env);
  const stamp = nowIso();
  const status = input.status ?? (input.error ? "failed" : "completed");
  const metrics = input.metrics ? JSON.stringify(input.metrics) : null;
  const span = trace.getActiveSpan();
  const ctx = span?.spanContext();
  const traceId = input.trace_id ?? ctx?.traceId ?? "mlip-baseline-no-trace";
  const spanId = input.span_id ?? ctx?.spanId ?? null;

  await env.LEDGER.prepare(
    `UPDATE mlip_baseline_cells
       SET status = ?3,
           accuracy_score = COALESCE(?4, accuracy_score),
           accuracy_unit = COALESCE(?5, accuracy_unit),
           speed_score = COALESCE(?6, speed_score),
           speed_unit = COALESCE(?7, speed_unit),
           metrics_json = COALESCE(?8, metrics_json),
           artifact_uri = COALESCE(?9, artifact_uri),
           operation_name = COALESCE(?10, operation_name),
           error = ?11,
           trace_id = COALESCE(?12, trace_id),
           span_id = COALESCE(?13, span_id),
           completed_at = CASE WHEN ?3 IN ('completed', 'failed') THEN ?14 ELSE completed_at END,
           updated_at = ?14
     WHERE run_id = ?1 AND cell_id = ?2`,
  ).bind(
    input.run_id,
    input.cell_id,
    status,
    input.accuracy_score ?? null,
    input.accuracy_unit ?? null,
    input.speed_score ?? null,
    input.speed_unit ?? null,
    metrics,
    input.artifact_uri ?? null,
    input.operation_name ?? null,
    input.error ?? null,
    traceId,
    spanId,
    stamp,
  ).run();

  const score = status === "completed" ? input.accuracy_score ?? 1 : 0;
  await insertEval(env, {
    trace_id: traceId,
    span_id: spanId ?? undefined,
    agent_class: "gcp-mlip-runner",
    task_kind: "mlip_baseline_cell",
    evaluator_name: "mlip_baseline.cell_accuracy_speed",
    score,
    label: status === "completed" ? "pass" : "fail",
    explanation:
      status === "completed"
        ? `${input.cell_id} produced accuracy=${input.accuracy_score ?? "n/a"} speed=${input.speed_score ?? "n/a"}`
        : input.error ?? `${input.cell_id} failed`,
    action_taken: status === "completed" ? "accepted" : "failed",
    retry_count: 0,
    created_at: stamp,
  });

  await registerResource(env, {
    resourceId: "gcp-mlip-lab",
    provider: "gcp",
    resourceKind: "gcp-mlip-runner",
    region: "us-central1",
    status: status === "failed" ? "degraded" : "available",
    capacityUnits: 25,
    capabilities: ["cloud-run-jobs", "gpu-burst", "mlip", "l4"],
    costHint: "bounded by MLIP baseline run budget",
    metadata: {
      run_id: input.run_id,
      cell_id: input.cell_id,
      row_id: input.row_id,
      mlip_id: input.mlip_id,
      status,
    },
  });

  try {
    await annotateMlipBaselineCellForPhoenix(env, input, traceId, spanId, status);
  } catch (e) {
    console.warn("Phoenix MLIP cell annotation failed:", e);
  }

  return { updated: input.cell_id, status };
}

export async function recordMlipBaselineBeat(
  env: Env,
  metrics: Record<string, unknown> | undefined,
): Promise<void> {
  if (!metrics) return;
  if (metrics.schema !== "lupine.mlip.cell_result.v1") return;
  const runId = typeof metrics.run_id === "string" ? metrics.run_id : "";
  const cellId = typeof metrics.cell_id === "string" ? metrics.cell_id : "";
  if (!runId || !cellId) return;
  const accuracy = metrics.accuracy as Record<string, unknown> | undefined;
  const speed = metrics.speed as Record<string, unknown> | undefined;
  await recordMlipBaselineCellResult(env, {
    run_id: runId,
    cell_id: cellId,
    row_id: typeof metrics.row_id === "string" ? metrics.row_id : undefined,
    mlip_id: typeof metrics.mlip_id === "string" ? metrics.mlip_id : undefined,
    status:
      metrics.status === "failed" || metrics.status === "running" || metrics.status === "enqueued"
        ? metrics.status
        : "completed",
    accuracy_score:
      typeof accuracy?.score === "number"
        ? accuracy.score
        : typeof metrics.accuracy_score === "number"
          ? metrics.accuracy_score
          : undefined,
    accuracy_unit: typeof accuracy?.unit === "string" ? accuracy.unit : undefined,
    speed_score:
      typeof speed?.score === "number"
        ? speed.score
        : typeof metrics.speed_score === "number"
          ? metrics.speed_score
          : undefined,
    speed_unit: typeof speed?.unit === "string" ? speed.unit : undefined,
    metrics,
    artifact_uri: typeof metrics.artifact_uri === "string" ? metrics.artifact_uri : undefined,
    operation_name: typeof metrics.operation_name === "string" ? metrics.operation_name : undefined,
    error: typeof metrics.error === "string" ? metrics.error : undefined,
  });
}

export async function finalizeMlipBaselineRun(
  env: Env,
  runId: string,
): Promise<{ status: MlipBaselineRunStatus; report_r2_key: string | null }> {
  const state = await getMlipBaselineRun(env, runId);
  if (!state) throw new Error(`MLIP baseline run '${runId}' not found`);
  const status: MlipBaselineRunStatus =
    state.summary.cells_failed > 0
      ? state.summary.cells_completed > 0
        ? "partial"
        : "failed"
      : state.summary.cells_completed === state.summary.cells_total
        ? "completed"
        : "partial";
  const report = await writeMlipBaselineReportArtifacts(env, runId);
  await env.LEDGER.prepare(
    `UPDATE mlip_baseline_runs
       SET status = ?2, report_r2_key = ?3, finished_at = ?4, updated_at = ?4
     WHERE run_id = ?1`,
  ).bind(runId, status, report.report_r2_key, nowIso()).run();
  await insertEval(env, {
    trace_id: "mlip-baseline-grid-finalize",
    span_id: runId,
    agent_class: "glim-think",
    task_kind: "mlip_baseline_grid",
    evaluator_name: "mlip_baseline.grid_completeness",
    score: state.summary.cells_total ? state.summary.cells_completed / state.summary.cells_total : 0,
    label: status === "completed" ? "pass" : "fail",
    explanation: `${state.summary.cells_completed}/${state.summary.cells_total} MLIP baseline cells completed.`,
    action_taken: status === "completed" ? "accepted" : "failed",
    retry_count: 0,
    created_at: nowIso(),
  });
  return { status, report_r2_key: report.report_r2_key };
}

export async function writeMlipBaselineReportArtifacts(
  env: Env,
  runId: string,
): Promise<{ report_r2_key: string; json_r2_key: string }> {
  const state = await getMlipBaselineRun(env, runId);
  if (!state) throw new Error(`MLIP baseline run '${runId}' not found`);
  const reportKey = `reports/mlip-baseline-grid/${runId}/report.html`;
  const jsonKey = `reports/mlip-baseline-grid/${runId}/report.json`;
  await env.ARTIFACTS.put(reportKey, renderMlipBaselineReportHtml(state), {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
  });
  await env.ARTIFACTS.put(jsonKey, JSON.stringify(publicMlipBaselineReport(state), null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return { report_r2_key: reportKey, json_r2_key: jsonKey };
}

export function publicMlipBaselineReport(state: MlipBaselineState) {
  const releaseGate = mlipBaselineReleaseGate(state);
  return {
    schema: "lupine.mlip_baseline_grid.report.v1",
    workflow_id: MLIP_BASELINE_WORKFLOW_ID,
    run: state.run,
    summary: state.summary,
    release_gate: releaseGate,
    rows: DEFAULT_ACCURACY_ROWS,
    mlips: DEFAULT_MLIP_COLUMNS,
    cells: state.cells.map((cell) => ({
      ...cell,
      metrics: parseJsonObject(cell.metrics_json),
      readiness: mlipCellReadiness(state, cell),
    })),
    caveat:
      state.run.profile === "smoke"
        ? "Smoke profile uses deterministic canonical values to verify control-plane wiring."
        : releaseGate.ready
          ? "Lab profile dispatches real MLIP inference over V2 release fixtures and row-native physical metrics."
          : "Lab profile dispatches real MLIP inference, but release claims remain blocked until every cell has V2 fixture and row-native metric evidence.",
  };
}

function fmtScore(value: number | null, digits = 3): string {
  return finiteNumber(value) ? value.toFixed(digits) : "pending";
}

function fmtAccuracy(value: number | null): string {
  if (!finiteNumber(value)) return "pending";
  const pct = clamp01(value) * 100;
  if (pct > 0 && pct < 0.1) return `${pct.toFixed(4)}%`;
  if (pct >= 99.95) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
}

function fmtSpeed(value: number | null): string {
  if (!finiteNumber(value)) return "pending";
  if (value >= 100) return `${value.toFixed(1)} /s`;
  if (value >= 1) return `${value.toFixed(2)} /s`;
  if (value > 0) return `${value.toFixed(3)} /s`;
  return "0 /s";
}

function fmtUsd(value: number | null | undefined): string {
  return finiteNumber(value) ? `$${value.toFixed(2)}` : "pending";
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "not recorded";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().replace("T", " ").replace(".000Z", "Z");
}

function fmtDurationMs(value: number | null): string {
  if (!finiteNumber(value)) return "not reported";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

function fmtCount(value: number): string {
  return Number.isFinite(value) ? String(Math.trunc(value)) : "0";
}

function percentWidth(value: number | null): string {
  return `${(finiteNumber(value) ? clamp01(value) : 0) * 100}%`;
}

function safeClassToken(value: unknown): string {
  return String(value ?? "missing").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function statusLabel(value: unknown): string {
  return String(value ?? "missing").replace(/_/g, "-");
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function recordField(record: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> | null {
  return toRecord(record?.[key]);
}

function stringField(record: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberField(record: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = record?.[key];
  return finiteNumber(value) ? value : null;
}

function boolField(record: Record<string, unknown> | null | undefined, key: string): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function htmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellFor(state: MlipBaselineState, rowId: string, mlipId: string): MlipBaselineCellRecord | undefined {
  return state.cells.find((cell) => cell.row_id === rowId && cell.mlip_id === mlipId);
}

function metricsForCell(cell: MlipBaselineCellRecord | undefined): Record<string, unknown> | null {
  return cell ? parseJsonObject(cell.metrics_json) : null;
}

function versionsForCell(cell: MlipBaselineCellRecord | undefined): Record<string, unknown> | null {
  return recordField(metricsForCell(cell), "versions");
}

function durationMsForCell(cell: MlipBaselineCellRecord | undefined): number | null {
  return numberField(recordField(metricsForCell(cell), "speed"), "duration_ms");
}

function nStructuresForCell(cell: MlipBaselineCellRecord | undefined): number | null {
  return numberField(metricsForCell(cell), "n_structures");
}

function versionTextForCell(cell: MlipBaselineCellRecord | undefined): string {
  const versions = versionsForCell(cell);
  if (!versions) return "not reported";
  const keys = ["torch", "mace-torch", "chgnet", "matgl", "orb-models", "sevenn", "ase", "numpy", "python"];
  const parts = keys
    .map((key) => {
      const value = versions[key];
      return typeof value === "string" && value ? `${key} ${value}` : null;
    })
    .filter((value): value is string => Boolean(value));
  return parts.length ? parts.join("; ") : "not reported";
}

function cudaTextForCell(cell: MlipBaselineCellRecord | undefined): string {
  const versions = versionsForCell(cell);
  if (!versions) return "CUDA not reported";
  const available = boolField(versions, "cuda_available");
  const device = stringField(versions, "cuda_device");
  if (available === true) return device ? `CUDA: ${device}` : "CUDA: available";
  if (available === false) return "CUDA: no";
  const error = stringField(versions, "cuda_probe_error");
  return error ? `CUDA probe error: ${error}` : "CUDA not reported";
}

function modelTextForCell(cell: MlipBaselineCellRecord | undefined): string {
  const metrics = metricsForCell(cell);
  const fields = ["model_id", "model_identifier", "model_name", "checkpoint", "checkpoint_id"];
  for (const key of fields) {
    const value = stringField(metrics, key);
    if (value) return value;
  }
  return "not reported";
}

function imageTextForCell(cell: MlipBaselineCellRecord | undefined): string {
  const metrics = metricsForCell(cell);
  const fields = ["image_digest", "container_image_digest", "runner_image_digest", "image"];
  for (const key of fields) {
    const value = stringField(metrics, key);
    if (value) return value;
  }
  return "not reported";
}

function finiteMean(values: Array<number | null>): number | null {
  const finite = values.filter((value): value is number => finiteNumber(value));
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function bestCellBy(cells: MlipBaselineCellRecord[], key: "accuracy_score" | "speed_score"): MlipBaselineCellRecord | null {
  return cells.reduce<MlipBaselineCellRecord | null>((best, cell) => {
    const value = cell[key];
    if (!finiteNumber(value)) return best;
    if (!best || value > (best[key] ?? Number.NEGATIVE_INFINITY)) return cell;
    return best;
  }, null);
}

function cellsCompleted(cells: MlipBaselineCellRecord[]): MlipBaselineCellRecord[] {
  return cells.filter((cell) => cell.status === "completed");
}

function rowLabel(rowId: string): string {
  return DEFAULT_ACCURACY_ROWS.find((row) => row.id === rowId)?.label ?? rowId;
}

function mlipLabel(mlipId: string): string {
  return DEFAULT_MLIP_COLUMNS.find((mlip) => mlip.id === mlipId)?.label ?? mlipId;
}

function orderedCells(state: MlipBaselineState): MlipBaselineCellRecord[] {
  const ordered: MlipBaselineCellRecord[] = [];
  const seen = new Set<string>();
  for (const row of DEFAULT_ACCURACY_ROWS) {
    for (const mlip of DEFAULT_MLIP_COLUMNS) {
      const cell = cellFor(state, row.id, mlip.id);
      if (cell) {
        ordered.push(cell);
        seen.add(cell.cell_id);
      }
    }
  }
  return [
    ...ordered,
    ...state.cells.filter((cell) => !seen.has(cell.cell_id)),
  ];
}

function observedCellWindowSeconds(cells: MlipBaselineCellRecord[]): number | null {
  const starts = cells
    .map((cell) => Date.parse(cell.enqueued_at ?? cell.created_at))
    .filter(Number.isFinite);
  const ends = cells
    .map((cell) => Date.parse(cell.completed_at ?? ""))
    .filter(Number.isFinite);
  if (!starts.length || !ends.length) return null;
  return Math.max(0, Math.round((Math.max(...ends) - Math.min(...starts)) / 1000));
}

function fmtSeconds(value: number | null): string {
  if (!finiteNumber(value)) return "pending";
  if (value >= 3600) return `${(value / 3600).toFixed(2)}h`;
  if (value >= 60) return `${(value / 60).toFixed(1)}m`;
  return `${value}s`;
}

function scoreTone(value: number | null): string {
  if (!finiteNumber(value)) return "pending";
  if (value >= 0.9) return "high";
  if (value >= 0.6) return "mid";
  if (value >= 0.25) return "watch";
  return "low";
}

function verdictForState(state: MlipBaselineState): { className: string; label: string; headline: string; detail: string } {
  const summary = state.summary;
  const releaseGate = mlipBaselineReleaseGate(state);
  if (state.run.status === "failed_preflight") {
    return {
      className: "bad",
      label: "failed-preflight",
      headline: "Preflight failed before the baseline could run.",
      detail: state.run.error ?? "Configuration, quota, or dispatch validation blocked the run before any cell result could be trusted.",
    };
  }
  if (summary.cells_total > 0 && summary.cells_completed === summary.cells_total && summary.cells_failed === 0) {
    if (!releaseGate.ready) {
      return {
        className: "warn",
        label: releaseGate.label,
        headline: "Baseline Readout: orchestration complete, release gate blocked.",
        detail: releaseGate.blockers[0] ?? "The baseline needs V2 fixture and row-native metric evidence before it can anchor research claims.",
      };
    }
    return {
      className: "ok",
      label: "release-ready",
      headline: "Baseline Readout: complete release-grade 5x5 result set.",
      detail: "All 25 baseline cells returned V2 fixture-backed, row-native physical metrics and are ready for Distill accuracy and accelerate comparison gates.",
    };
  }
  if (summary.cells_failed > 0 && summary.cells_completed > 0) {
    return {
      className: "warn",
      label: "partial",
      headline: "Baseline Readout: partial evidence set.",
      detail: `${summary.cells_completed}/${summary.cells_total} cells completed and ${summary.cells_failed} failed. Use ops and maintain to repair before making a research claim.`,
    };
  }
  if (summary.cells_failed > 0) {
    return {
      className: "bad",
      label: "failed-cell",
      headline: "Baseline Readout: cells failed.",
      detail: "The run produced failed cells and needs repair before it can anchor the 5x5x3 comparison.",
    };
  }
  return {
    className: "wait",
    label: "awaiting-beats",
    headline: "Baseline Readout: awaiting result beats.",
    detail: `${summary.cells_completed}/${summary.cells_total} cells are complete; ${summary.cells_running + summary.cells_enqueued + summary.cells_queued} are still queued, running, or awaiting projection.`,
  };
}

export function renderMlipBaselineReportHtml(state: MlipBaselineState): string {
  const cost = parseJsonObject(state.run.cost_estimate_json) as unknown as MlipBaselineCostEstimate | null;
  const verdict = verdictForState(state);
  const maxSpeed = Math.max(
    0,
    ...state.cells
      .map((cell) => cell.speed_score)
      .filter((value): value is number => finiteNumber(value)),
  );
  const cellWindow = state.summary.observed_runtime_seconds ?? observedCellWindowSeconds(state.cells);
  const progress = state.summary.cells_total > 0 ? state.summary.cells_completed / state.summary.cells_total : 0;

  const matrixRows = DEFAULT_ACCURACY_ROWS.map((row) => {
    const cells = DEFAULT_MLIP_COLUMNS.map((mlip) => {
      const cell = cellFor(state, row.id, mlip.id);
      const status = cell?.status ?? "missing";
      const accuracy = cell?.accuracy_score ?? null;
      const speed = cell?.speed_score ?? null;
      const speedWidth = maxSpeed > 0 && finiteNumber(speed) ? `${clamp01(speed / maxSpeed) * 100}%` : "0%";
      const statusClass = safeClassToken(status);
      return `<td class="matrix-cell cell-status-${statusClass} tone-${scoreTone(accuracy)}">
        <div class="cell-top">
          <span class="status-pill status-${statusClass}">${htmlEscape(statusLabel(status))}</span>
          <span>${cell ? `retry ${fmtCount(cell.retry_count)}` : "not created"}</span>
        </div>
        <div class="cell-metric"><span>Accuracy</span><strong>${fmtAccuracy(accuracy)}</strong></div>
        <div class="bar accuracy-bar"><span style="width:${percentWidth(accuracy)}"></span></div>
        <div class="cell-metric"><span>Speed</span><strong>${fmtSpeed(speed)}</strong></div>
        <div class="bar speed-bar"><span style="width:${speedWidth}"></span></div>
        <div class="meta">${htmlEscape(cell?.target_job ?? (state.run.profile === "smoke" ? "smoke fixture" : "missing target job"))}</div>
      </td>`;
    }).join("");
    return `<tr><th><span>${htmlEscape(row.label)}</span><small>${htmlEscape(row.id)}</small></th>${cells}</tr>`;
  }).join("\n");

  const rowSummaryRows = DEFAULT_ACCURACY_ROWS.map((row) => {
    const cells = state.cells.filter((cell) => cell.row_id === row.id);
    const completed = cellsCompleted(cells);
    const meanAccuracy = finiteMean(completed.map((cell) => cell.accuracy_score));
    const meanSpeed = finiteMean(completed.map((cell) => cell.speed_score));
    const bestAccuracy = bestCellBy(completed, "accuracy_score");
    const bestSpeed = bestCellBy(completed, "speed_score");
    return `<tr>
      <td><strong>${htmlEscape(row.label)}</strong><span>${htmlEscape(row.id)}</span></td>
      <td>${completed.length}/${cells.length}</td>
      <td>${fmtAccuracy(meanAccuracy)} <span class="raw">score ${fmtScore(meanAccuracy, 4)}</span></td>
      <td>${fmtSpeed(meanSpeed)}</td>
      <td>${bestAccuracy ? htmlEscape(mlipLabel(bestAccuracy.mlip_id)) : "pending"}</td>
      <td>${bestSpeed ? htmlEscape(mlipLabel(bestSpeed.mlip_id)) : "pending"}</td>
    </tr>`;
  }).join("");

  const mlipSummaryRows = DEFAULT_MLIP_COLUMNS.map((mlip) => {
    const cells = state.cells.filter((cell) => cell.mlip_id === mlip.id);
    const completed = cellsCompleted(cells);
    const meanAccuracy = finiteMean(completed.map((cell) => cell.accuracy_score));
    const meanSpeed = finiteMean(completed.map((cell) => cell.speed_score));
    const firstWithVersions = completed.find((cell) => versionsForCell(cell));
    return `<tr>
      <td><strong>${htmlEscape(mlip.label)}</strong><span>${htmlEscape(mlip.id)}</span></td>
      <td>${completed.length}/${cells.length}</td>
      <td>${fmtAccuracy(meanAccuracy)} <span class="raw">score ${fmtScore(meanAccuracy, 4)}</span></td>
      <td>${fmtSpeed(meanSpeed)}</td>
      <td>${htmlEscape(versionTextForCell(firstWithVersions))}</td>
      <td>${htmlEscape(cudaTextForCell(firstWithVersions))}</td>
    </tr>`;
  }).join("");

  const evidenceRows = orderedCells(state).map((cell) => {
    const duration = durationMsForCell(cell);
    const nStructures = nStructuresForCell(cell);
    return `<tr>
      <td><strong>${htmlEscape(rowLabel(cell.row_id))}</strong><span>${htmlEscape(cell.row_id)}</span></td>
      <td><strong>${htmlEscape(mlipLabel(cell.mlip_id))}</strong><span>${htmlEscape(cell.mlip_id)}</span></td>
      <td><span class="status-inline status-${safeClassToken(cell.status)}">${htmlEscape(statusLabel(cell.status))}</span></td>
      <td>${fmtAccuracy(cell.accuracy_score)}<span class="raw">score ${fmtScore(cell.accuracy_score, 6)}</span></td>
      <td>${fmtSpeed(cell.speed_score)}<span class="raw">${fmtDurationMs(duration)} for ${nStructures ?? "?"} structure(s)</span></td>
      <td>${htmlEscape(cell.artifact_uri ?? "not written")}</td>
      <td>${htmlEscape(cell.task_name ?? "not enqueued")}</td>
      <td>${htmlEscape(cell.operation_name ?? "not returned")}</td>
      <td>${htmlEscape(cell.trace_id ?? "not traced")}<span class="raw">span ${htmlEscape(cell.span_id ?? "not recorded")}</span></td>
      <td>${fmtCount(cell.retry_count)}</td>
      <td>${htmlEscape(versionTextForCell(cell))}<span class="raw">${htmlEscape(cudaTextForCell(cell))}</span></td>
      <td>${htmlEscape(modelTextForCell(cell))}</td>
      <td>${htmlEscape(imageTextForCell(cell))}</td>
      <td>${htmlEscape(cell.error ?? "")}</td>
    </tr>`;
  }).join("");

  const publicReport = publicMlipBaselineReport(state);
  const caveat = publicReport.caveat;
  const releaseBlockers = publicReport.release_gate.blockers.length
    ? publicReport.release_gate.blockers.map((blocker) => `<li>${htmlEscape(blocker)}</li>`).join("")
    : "<li>Release gate is clear.</li>";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(state.run.title)} - Baseline Readout</title>
  <style>
    :root {
      color-scheme: light;
      --ink:#182026;
      --muted:#60717a;
      --soft:#eef3f5;
      --line:#d7e0e5;
      --bg:#f6f8f9;
      --panel:#ffffff;
      --ok:#0d6b4f;
      --ok-bg:#e8f5ef;
      --warn:#8a6413;
      --warn-bg:#fff4d8;
      --bad:#a53737;
      --bad-bg:#faeaea;
      --blue:#275f91;
      --blue-bg:#e8f1f8;
    }
    * { box-sizing:border-box; }
    body {
      margin:0;
      font-family:Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      color:var(--ink);
      background:var(--bg);
      letter-spacing:0;
    }
    header { background:var(--panel); border-bottom:1px solid var(--line); }
    .wrap { width:min(1460px, calc(100vw - 40px)); margin:0 auto; }
    .hero { padding:34px 0 24px; }
    .eyebrow { margin:0 0 8px; color:var(--muted); font-size:13px; font-weight:700; letter-spacing:0; text-transform:uppercase; }
    h1 { margin:0; max-width:980px; font-size:34px; line-height:1.12; letter-spacing:0; }
    h2 { margin:34px 0 12px; font-size:21px; line-height:1.25; letter-spacing:0; }
    h3 { margin:0 0 8px; font-size:16px; line-height:1.25; letter-spacing:0; }
    p { line-height:1.55; }
    main { padding:28px 0 54px; }
    .lede { margin:14px 0 0; color:var(--muted); max-width:980px; line-height:1.55; }
    .verdict { display:flex; align-items:flex-start; gap:16px; margin-top:22px; padding:16px; border:1px solid var(--line); border-radius:8px; background:#fbfdfe; }
    .verdict.ok { border-color:#b9d9cb; background:var(--ok-bg); }
    .verdict.warn, .verdict.wait { border-color:#ead18e; background:var(--warn-bg); }
    .verdict.bad { border-color:#e2b1b1; background:var(--bad-bg); }
    .verdict-badge { flex:0 0 auto; min-width:116px; padding:8px 10px; border-radius:8px; font-weight:800; text-align:center; color:#fff; background:var(--blue); }
    .verdict.ok .verdict-badge { background:var(--ok); }
    .verdict.warn .verdict-badge, .verdict.wait .verdict-badge { background:var(--warn); }
    .verdict.bad .verdict-badge { background:var(--bad); }
    .verdict p { margin:0; color:#34444c; }
    .facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin-top:18px; }
    .fact { min-width:0; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; }
    .label { color:var(--muted); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0; }
    .value { margin-top:5px; font-weight:800; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
    .section-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,390px); gap:18px; align-items:start; }
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    .panel p { margin:0; color:var(--muted); }
    .compact-list { margin:0; padding-left:19px; color:#34444c; line-height:1.55; }
    .compact-list li + li { margin-top:7px; }
    .progress-track { height:10px; margin-top:12px; overflow:hidden; background:#dfe7eb; border-radius:8px; }
    .progress-track span { display:block; height:100%; background:var(--ok); }
    .table-wrap { overflow:auto; border:1px solid var(--line); border-radius:8px; background:var(--panel); }
    table { width:100%; border-collapse:separate; border-spacing:0; background:var(--panel); }
    th, td { border-right:1px solid var(--line); border-bottom:1px solid var(--line); padding:12px; vertical-align:top; text-align:left; }
    tr:last-child th, tr:last-child td { border-bottom:0; }
    th:last-child, td:last-child { border-right:0; }
    thead th { position:sticky; top:0; z-index:1; background:#e9f0f3; color:#28343a; font-size:13px; }
    tbody th { width:210px; min-width:190px; background:#fbfdfe; font-size:13px; }
    tbody th span, td strong { display:block; }
    tbody th small, td span { display:block; margin-top:4px; color:var(--muted); font-size:12px; font-weight:500; overflow-wrap:anywhere; }
    .matrix-cell { min-width:168px; background:#fff; }
    .cell-top { display:flex; justify-content:space-between; gap:8px; color:var(--muted); font-size:12px; }
    .status-pill, .status-inline { display:inline-block; margin:0; border-radius:8px; padding:3px 7px; font-size:12px; font-weight:800; background:var(--blue-bg); color:var(--blue); }
    .status-completed { background:var(--ok-bg); color:var(--ok); }
    .status-failed, .status-failed_preflight { background:var(--bad-bg); color:var(--bad); }
    .status-queued, .status-enqueued, .status-running, .status-missing { background:var(--warn-bg); color:var(--warn); }
    .cell-metric { display:flex; justify-content:space-between; gap:10px; margin-top:10px; font-size:13px; }
    .cell-metric span { margin:0; color:var(--muted); }
    .cell-metric strong { font-size:15px; font-variant-numeric:tabular-nums; }
    .bar { height:7px; margin-top:5px; overflow:hidden; background:#e3eaee; border-radius:8px; }
    .bar span { display:block; height:100%; min-width:2px; border-radius:8px; }
    .accuracy-bar span { background:var(--ok); }
    .speed-bar span { background:var(--blue); }
    .tone-low .accuracy-bar span { background:var(--bad); }
    .tone-watch .accuracy-bar span { background:var(--warn); }
    .tone-mid .accuracy-bar span { background:var(--blue); }
    .meta { margin-top:10px; color:var(--muted); font-size:12px; overflow-wrap:anywhere; }
    .summary-table td:first-child { min-width:190px; }
    .evidence-table { min-width:1680px; }
    .evidence-table td { max-width:280px; overflow-wrap:anywhere; font-size:12px; }
    .raw { display:block; margin-top:4px; color:var(--muted); font-size:12px; font-weight:500; font-variant-numeric:tabular-nums; }
    .note { color:var(--muted); line-height:1.55; }
    .callout { border-left:4px solid var(--blue); padding:12px 14px; background:#f8fbfd; border-radius:8px; }
    .code-list { margin:0; padding:12px; background:#11191f; color:#edf7fa; border-radius:8px; overflow:auto; font-size:13px; line-height:1.45; }
    @media (max-width: 860px) {
      .wrap { width:min(100vw - 24px, 1460px); }
      .hero { padding:26px 0 20px; }
      h1 { font-size:27px; }
      .section-grid { grid-template-columns:1fr; }
      .verdict { display:block; }
      .verdict-badge { display:inline-block; margin-bottom:10px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap hero">
      <div class="eyebrow">MLIP baseline grid report</div>
      <h1>${htmlEscape(verdict.headline)}</h1>
      <p class="lede">This page is the durable baseline packet for the first 5x5 research grid: five potential-accuracy rows, five MLIP columns, and one governed Lab execution path. Cloudflare remains the control plane and public surface; GCP Cloud Run Jobs are the compute instrument.</p>
      <div class="verdict ${htmlEscape(verdict.className)}">
        <div class="verdict-badge">${htmlEscape(verdict.label)}</div>
        <div>
          <h3>${htmlEscape(state.run.title)}</h3>
          <p>${htmlEscape(verdict.detail)}</p>
          <div class="progress-track" aria-label="Baseline completion"><span style="width:${percentWidth(progress)}"></span></div>
        </div>
      </div>
      <div class="facts">
        <div class="fact"><div class="label">Run</div><div class="value">${htmlEscape(state.run.run_id)}</div></div>
        <div class="fact"><div class="label">Result verdict</div><div class="value">${htmlEscape(verdict.label)}</div></div>
        <div class="fact"><div class="label">Ledger state</div><div class="value">${htmlEscape(statusLabel(state.run.status))}</div></div>
        <div class="fact"><div class="label">Profile</div><div class="value">${htmlEscape(state.run.profile)}</div></div>
        <div class="fact"><div class="label">Fixture</div><div class="value">${htmlEscape(state.run.fixture_id)}</div></div>
        <div class="fact"><div class="label">Progress</div><div class="value">${state.summary.cells_completed}/${state.summary.cells_total}</div></div>
        <div class="fact"><div class="label">Failed cells</div><div class="value">${state.summary.cells_failed}</div></div>
        <div class="fact"><div class="label">Mean accuracy</div><div class="value">${fmtAccuracy(state.summary.mean_accuracy)}</div></div>
        <div class="fact"><div class="label">Mean speed</div><div class="value">${fmtSpeed(state.summary.mean_speed)}</div></div>
        <div class="fact"><div class="label">Estimated hourly</div><div class="value">${fmtUsd(cost?.estimated_hourly_usd ?? state.summary.estimated_hourly_cost)}</div></div>
        <div class="fact"><div class="label">Hourly ceiling</div><div class="value">${fmtUsd(state.run.max_dollars_per_hour)}</div></div>
        <div class="fact"><div class="label">Cell beat window</div><div class="value">${fmtSeconds(cellWindow)}</div></div>
      </div>
    </div>
  </header>
  <main class="wrap">
    <section class="section-grid">
      <div>
        <h2>What This Baseline Proves</h2>
        <div class="panel">
          <ul class="compact-list">
            <li>The control plane expanded and tracked a 25-cell baseline grid with one row per potential-accuracy target and one column per MLIP backend.</li>
            <li>The Lab lane returned accuracy and speed values per cell, plus package versions, CUDA facts, artifacts, task names, retry counts, and trace identifiers.</li>
            <li>The result set is ready to anchor the next two variants: Lupine Distill accuracy, then Lupine Distill accuracy plus accelerate.</li>
          </ul>
        </div>
      </div>
      <aside>
        <h2>Next Research Gate</h2>
        <div class="panel">
          <p>Hold this fixture and evidence contract stable, then fill the Distill and Distill+Accelerate grids. The claim is not that every baseline score is strong; the claim is that we now have a reproducible baseline surface where lift and speedup can be measured cell by cell.</p>
        </div>
      </aside>
    </section>

    <h2>Baseline Matrix</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Potential accuracy row</th>${DEFAULT_MLIP_COLUMNS.map((m) => `<th>${htmlEscape(m.label)}</th>`).join("")}</tr></thead>
        <tbody>${matrixRows}</tbody>
      </table>
    </div>

    <h2>Row Summary</h2>
    <div class="table-wrap">
      <table class="summary-table">
        <thead><tr><th>Potential accuracy row</th><th>Complete</th><th>Mean accuracy</th><th>Mean speed</th><th>Best accuracy</th><th>Best speed</th></tr></thead>
        <tbody>${rowSummaryRows}</tbody>
      </table>
    </div>

    <h2>MLIP Summary</h2>
    <div class="table-wrap">
      <table class="summary-table">
        <thead><tr><th>MLIP backend</th><th>Complete</th><th>Mean accuracy</th><th>Mean speed</th><th>Package versions</th><th>GPU fact</th></tr></thead>
        <tbody>${mlipSummaryRows}</tbody>
      </table>
    </div>

    <h2>Run Contract And Provenance</h2>
    <div class="facts">
      <div class="fact"><div class="label">Manifest</div><div class="value">${htmlEscape(state.run.manifest_url)}</div></div>
      <div class="fact"><div class="label">Artifacts</div><div class="value">${htmlEscape(state.run.artifact_prefix)}</div></div>
      <div class="fact"><div class="label">Workflow instance</div><div class="value">${htmlEscape(state.run.workflow_instance_id ?? "not started")}</div></div>
      <div class="fact"><div class="label">Hypothesis</div><div class="value">${htmlEscape(state.run.hypothesis_id)}</div></div>
      <div class="fact"><div class="label">Max active GPU cells</div><div class="value">${state.run.max_active_gpu_cells}</div></div>
      <div class="fact"><div class="label">Requested GPU cells</div><div class="value">${state.run.requested_max_active_gpu_cells}</div></div>
      <div class="fact"><div class="label">Cost shape</div><div class="value">${cost ? `${cost.assumptions.region}; ${cost.assumptions.cpu} CPU; ${cost.assumptions.memory_gib} GiB; ${cost.assumptions.gpu_l4} L4` : "not recorded"}</div></div>
      <div class="fact"><div class="label">Created</div><div class="value">${fmtDate(state.run.created_at)}</div></div>
      <div class="fact"><div class="label">Updated</div><div class="value">${fmtDate(state.run.updated_at)}</div></div>
      <div class="fact"><div class="label">Finished</div><div class="value">${fmtDate(state.run.finished_at)}</div></div>
    </div>

    <h2>Caveats</h2>
    <div class="callout">
      <ul class="compact-list">
        <li>${htmlEscape(caveat)}</li>
        <li>This is a baseline-only run. It does not yet show Lupine Distill lift or acceleration lift.</li>
        <li>Baseline evidence is release-grade only when every square reports V2 fixture validation and a row-native physical metric.</li>
        <li>Runner image digests and model identifiers are shown when a beat reports them; older cells may say "not reported" until the runner contract emits those fields.</li>
        ${releaseBlockers}
      </ul>
    </div>

    <h2>Phoenix And Evaluators</h2>
    <div class="callout">
      <p class="note">Phoenix is the comparison home for model upgrades. The machine-readable dataset, experiment, and evaluator packet for this run is available at <strong>?format=phoenix</strong>.</p>
    </div>
    <pre class="code-list">mlip_baseline.gcp_dispatch_contract
mlip_baseline.cell_accuracy_speed
mlip_baseline.grid_completeness
${MLIP_PHOENIX_EVALUATOR_SPECS.map((spec) => htmlEscape(spec.name)).join("\n")}</pre>

    <h2>Evidence Package</h2>
    <div class="table-wrap">
      <table class="evidence-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>MLIP</th>
            <th>Status</th>
            <th>Accuracy</th>
            <th>Speed</th>
            <th>GCS artifact</th>
            <th>Cloud Task</th>
            <th>Cloud Run operation</th>
            <th>Phoenix trace/span</th>
            <th>Retry</th>
            <th>Versions and GPU</th>
            <th>Model</th>
            <th>Image</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>${evidenceRows}</tbody>
      </table>
    </div>
  </main>
</body>
</html>`;
}
