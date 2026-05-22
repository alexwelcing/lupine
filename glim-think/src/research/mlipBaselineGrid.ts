import { trace } from "@opentelemetry/api";
import { ensureAgendaSchema } from "../agenda";
import { insertEval } from "../evals/store";
import { registerResource } from "../resource-fabric";
import { traceHypothesisStage } from "../telemetry/hypothesisTrace";
import type { Env } from "../types";
import { dispatchAtlasJob, type TaskPayload } from "./dispatch";
import { DEFAULT_ACCURACY_ROWS, DEFAULT_MLIP_COLUMNS } from "./mlipCampaign";

export const MLIP_BASELINE_WORKFLOW_ID = "mlip-baseline-grid";
export const MLIP_BASELINE_FIXTURE_ID = "canonical-structures-v1";

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
  opts: { limit?: number; dryRun?: boolean; onlyCellId?: string } = {},
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
    .filter((cell) => cell.status === "queued")
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
  return {
    schema: "lupine.mlip_baseline_grid.report.v1",
    workflow_id: MLIP_BASELINE_WORKFLOW_ID,
    run: state.run,
    summary: state.summary,
    rows: DEFAULT_ACCURACY_ROWS,
    mlips: DEFAULT_MLIP_COLUMNS,
    cells: state.cells.map((cell) => ({
      ...cell,
      metrics: parseJsonObject(cell.metrics_json),
    })),
    caveat:
      state.run.profile === "smoke"
        ? "Smoke profile uses deterministic canonical values to verify control-plane wiring."
        : "Lab profile dispatches real MLIP inference to GCP Cloud Run Jobs and reports only authenticated result beats.",
  };
}

function fmtScore(value: number | null, digits = 3): string {
  return finiteNumber(value) ? value.toFixed(digits) : "pending";
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

export function renderMlipBaselineReportHtml(state: MlipBaselineState): string {
  const matrixRows = DEFAULT_ACCURACY_ROWS.map((row) => {
    const cells = DEFAULT_MLIP_COLUMNS.map((mlip) => {
      const cell = cellFor(state, row.id, mlip.id);
      const cls = cell?.status ?? "missing";
      return `<td class="${cls}">
        <div class="cell-status">${htmlEscape(cls)}</div>
        <div class="score">A ${fmtScore(cell?.accuracy_score ?? null)}</div>
        <div class="score">S ${fmtScore(cell?.speed_score ?? null)}</div>
        <div class="meta">${htmlEscape(cell?.target_job ?? "smoke")}</div>
      </td>`;
    }).join("");
    return `<tr><th>${htmlEscape(row.label)}</th>${cells}</tr>`;
  }).join("\n");

  const cost = parseJsonObject(state.run.cost_estimate_json) as unknown as MlipBaselineCostEstimate | null;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(state.run.title)}</title>
  <style>
    :root { color-scheme: light; --ink:#172026; --muted:#5d6b73; --line:#d8e0e5; --ok:#0f7b58; --bad:#b03030; --wait:#74620c; --bg:#f7fafb; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; color:var(--ink); background:var(--bg); }
    header { padding:32px 40px 22px; background:#ffffff; border-bottom:1px solid var(--line); }
    main { padding:28px 40px 48px; }
    h1 { margin:0 0 10px; font-size:30px; line-height:1.1; letter-spacing:0; }
    h2 { margin:30px 0 12px; font-size:18px; }
    .lede { color:var(--muted); max-width:920px; line-height:1.5; }
    .facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin-top:20px; }
    .fact { background:#fff; border:1px solid var(--line); border-radius:8px; padding:12px; }
    .label { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
    .value { margin-top:4px; font-weight:700; overflow-wrap:anywhere; }
    table { width:100%; border-collapse:separate; border-spacing:0; background:#fff; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    th, td { border-right:1px solid var(--line); border-bottom:1px solid var(--line); padding:12px; vertical-align:top; }
    tr:last-child th, tr:last-child td { border-bottom:0; }
    th:last-child, td:last-child { border-right:0; }
    thead th { background:#edf3f6; text-align:left; font-size:13px; }
    tbody th { width:190px; background:#fbfdfe; text-align:left; font-size:13px; }
    td { min-width:130px; }
    .cell-status { font-size:12px; font-weight:700; text-transform:uppercase; }
    .score { margin-top:6px; font-variant-numeric:tabular-nums; }
    .meta { margin-top:8px; color:var(--muted); font-size:12px; overflow-wrap:anywhere; }
    .completed .cell-status { color:var(--ok); }
    .failed .cell-status, .failed_preflight .cell-status { color:var(--bad); }
    .queued .cell-status, .enqueued .cell-status, .running .cell-status { color:var(--wait); }
    pre { background:#101820; color:#edf7fa; padding:14px; border-radius:8px; overflow:auto; }
    .note { color:var(--muted); line-height:1.5; }
  </style>
</head>
<body>
  <header>
    <h1>${htmlEscape(state.run.title)}</h1>
    <div class="lede">Cloudflare owns the research ledger, agenda, Workflow, Phoenix-visible evaluator rows, and public report. GCP Cloud Run Jobs are the governed execution instrument for real MLIP cells.</div>
    <div class="facts">
      <div class="fact"><div class="label">Run</div><div class="value">${htmlEscape(state.run.run_id)}</div></div>
      <div class="fact"><div class="label">Status</div><div class="value">${htmlEscape(state.run.status)}</div></div>
      <div class="fact"><div class="label">Profile</div><div class="value">${htmlEscape(state.run.profile)}</div></div>
      <div class="fact"><div class="label">Fixture</div><div class="value">${htmlEscape(state.run.fixture_id)}</div></div>
      <div class="fact"><div class="label">Progress</div><div class="value">${state.summary.cells_completed}/${state.summary.cells_total}</div></div>
      <div class="fact"><div class="label">Hourly cap</div><div class="value">$${state.run.max_dollars_per_hour.toFixed(2)}</div></div>
      <div class="fact"><div class="label">Estimated hourly</div><div class="value">$${(cost?.estimated_hourly_usd ?? 0).toFixed(2)}</div></div>
      <div class="fact"><div class="label">Max active GPU cells</div><div class="value">${state.run.max_active_gpu_cells}</div></div>
    </div>
  </header>
  <main>
    <h2>Baseline Matrix</h2>
    <table>
      <thead><tr><th>Potential accuracy row</th>${DEFAULT_MLIP_COLUMNS.map((m) => `<th>${htmlEscape(m.label)}</th>`).join("")}</tr></thead>
      <tbody>${matrixRows}</tbody>
    </table>
    <h2>Run Contract</h2>
    <div class="facts">
      <div class="fact"><div class="label">Manifest</div><div class="value">${htmlEscape(state.run.manifest_url)}</div></div>
      <div class="fact"><div class="label">Artifacts</div><div class="value">${htmlEscape(state.run.artifact_prefix)}</div></div>
      <div class="fact"><div class="label">Workflow instance</div><div class="value">${htmlEscape(state.run.workflow_instance_id ?? "not started")}</div></div>
      <div class="fact"><div class="label">Mean accuracy</div><div class="value">${fmtScore(state.summary.mean_accuracy)}</div></div>
      <div class="fact"><div class="label">Mean speed</div><div class="value">${fmtScore(state.summary.mean_speed)}</div></div>
    </div>
    <h2>Caveat</h2>
    <p class="note">${htmlEscape(publicMlipBaselineReport(state).caveat)}</p>
    <h2>Evaluator Names</h2>
    <pre>mlip_baseline.gcp_dispatch_contract
mlip_baseline.cell_accuracy_speed
mlip_baseline.grid_completeness</pre>
  </main>
</body>
</html>`;
}
