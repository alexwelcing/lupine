import type { Env } from "../types";
import { ensureAgendaSchema } from "../agenda";
import { insertEval } from "../evals/store";
import { PhoenixApi } from "../phoenix/api";
import {
  annotateHypothesisVerdict,
  traceHypothesisStage,
} from "../telemetry/hypothesisTrace";

export interface MlipAxisItem {
  id: string;
  label: string;
  description?: string;
}

export interface MlipCampaignVariant extends MlipAxisItem {
  strategy: "baseline" | "distill_accuracy" | "distill_accuracy_accelerate";
}

export type MlipCampaignVariantScope = "baseline" | "accuracy" | "accuracy_accelerate" | "full";

export interface MlipCampaignCell {
  cell_id: string;
  campaign_id: string;
  row_id: string;
  mlip_id: string;
  variant_id: string;
  fixture_url: string | null;
  status: "queued" | "enqueued" | "running" | "completed" | "failed";
  job_id: string | null;
  accuracy_score: number | null;
  accuracy_unit: string | null;
  speed_score: number | null;
  speed_unit: string | null;
  metrics_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface MlipCampaignRecord {
  campaign_id: string;
  hypothesis_id: string;
  title: string;
  status: "draft" | "queued" | "running" | "completed" | "failed";
  rows_json: string;
  mlips_json: string;
  variants_json: string;
  fixture_url_template: string | null;
  model_pairs_json: string;
  top_k: number;
  quality_gate: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMlipCampaignInput {
  campaign_id?: string;
  hypothesis_id: string;
  title?: string;
  rows?: MlipAxisItem[];
  mlips?: MlipAxisItem[];
  variants?: MlipCampaignVariant[];
  variant_scope?: MlipCampaignVariantScope;
  fixture_url_template?: string;
  model_pairs?: string[];
  top_k?: number;
  quality_gate?: "none" | "fit" | "physics" | "accuracy";
}

export interface MlipCampaignResultInput {
  campaign_id: string;
  cell_id: string;
  accuracy_score?: number;
  accuracy_unit?: string;
  speed_score?: number;
  speed_unit?: string;
  status?: "completed" | "failed" | "running";
  metrics?: Record<string, unknown>;
  source?: "manual" | "auto";
}

export type MlipTripletVerdict = "win" | "mixed" | "regression" | "invalid";
export type MlipTripletEvaluationSource = "manual" | "auto" | "operator";

export interface MlipTripletEvaluationRecord {
  triplet_id: string;
  campaign_id: string;
  row_id: string;
  mlip_id: string;
  verdict: MlipTripletVerdict;
  score: number;
  accuracy_delta_distill: number | null;
  accuracy_delta_accelerate: number | null;
  speed_ratio_accelerate: number | null;
  trace_id: string | null;
  span_id: string | null;
  explanation: string;
  metrics_json: string;
  updated_at: string;
}

export interface MlipCampaignTriplet {
  campaign_id: string;
  row_id: string;
  mlip_id: string;
  triplet_id: string;
  status: "queued" | "enqueued" | "running" | "completed" | "failed" | "partial";
  baseline: MlipCampaignCell | null;
  distill_accuracy: MlipCampaignCell | null;
  distill_accuracy_accelerate: MlipCampaignCell | null;
  evaluation: MlipTripletEvaluationRecord | null;
}

export interface MlipTripletEvaluation {
  triplet_id: string;
  campaign_id: string;
  row_id: string;
  mlip_id: string;
  verdict: MlipTripletVerdict;
  score: number;
  baseline_accuracy: number | null;
  baseline_speed: number | null;
  distill_accuracy: number | null;
  distill_speed: number | null;
  accelerate_accuracy: number | null;
  accelerate_speed: number | null;
  distill_accuracy_delta: number | null;
  accelerate_accuracy_delta: number | null;
  accelerate_speed_ratio: number | null;
  explanation: string;
}

export const DEFAULT_MLIP_COLUMNS: MlipAxisItem[] = [
  { id: "mace-mp-0", label: "MACE-MP-0" },
  { id: "chgnet", label: "CHGNet" },
  { id: "m3gnet", label: "M3GNet" },
  { id: "orb-v3", label: "ORB-v3" },
  { id: "sevennet", label: "SevenNet" },
];

export const DEFAULT_ACCURACY_ROWS: MlipAxisItem[] = [
  { id: "elastic_constants", label: "Elastic constants" },
  { id: "energy_volume", label: "Energy-volume curve" },
  { id: "forces", label: "Force accuracy" },
  { id: "stress", label: "Stress accuracy" },
  { id: "relaxation_stability", label: "Relaxation stability" },
];

export const DEFAULT_CAMPAIGN_VARIANTS: MlipCampaignVariant[] = [
  {
    id: "baseline",
    label: "Baseline MLIP",
    strategy: "baseline",
  },
  {
    id: "distill_accuracy",
    label: "Lupine Distill accuracy",
    strategy: "distill_accuracy",
  },
  {
    id: "distill_accuracy_accelerate",
    label: "Lupine Distill accuracy + accelerate",
    strategy: "distill_accuracy_accelerate",
  },
];

export const CAMPAIGN_VARIANTS_BY_SCOPE: Record<MlipCampaignVariantScope, MlipCampaignVariant[]> = {
  baseline: DEFAULT_CAMPAIGN_VARIANTS.slice(0, 1),
  accuracy: DEFAULT_CAMPAIGN_VARIANTS.slice(0, 2),
  accuracy_accelerate: DEFAULT_CAMPAIGN_VARIANTS,
  full: DEFAULT_CAMPAIGN_VARIANTS,
};

const CAMPAIGN_DDL = `
  CREATE TABLE IF NOT EXISTS mlip_campaigns (
    campaign_id TEXT PRIMARY KEY,
    hypothesis_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    rows_json TEXT NOT NULL,
    mlips_json TEXT NOT NULL,
    variants_json TEXT NOT NULL,
    fixture_url_template TEXT,
    model_pairs_json TEXT NOT NULL DEFAULT '[]',
    top_k INTEGER NOT NULL DEFAULT 5,
    quality_gate TEXT NOT NULL DEFAULT 'accuracy',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CELLS_DDL = `
  CREATE TABLE IF NOT EXISTS mlip_campaign_cells (
    cell_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    row_id TEXT NOT NULL,
    mlip_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    fixture_url TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    job_id TEXT,
    accuracy_score REAL,
    accuracy_unit TEXT,
    speed_score REAL,
    speed_unit TEXT,
    metrics_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CELLS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_mlip_campaign_cells_campaign
  ON mlip_campaign_cells(campaign_id, variant_id, row_id, mlip_id)
`;

const TRIPLET_EVALS_DDL = `
  CREATE TABLE IF NOT EXISTS mlip_campaign_triplet_evals (
    triplet_id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    row_id TEXT NOT NULL,
    mlip_id TEXT NOT NULL,
    verdict TEXT NOT NULL,
    score REAL NOT NULL,
    accuracy_delta_distill REAL,
    accuracy_delta_accelerate REAL,
    speed_ratio_accelerate REAL,
    trace_id TEXT,
    span_id TEXT,
    explanation TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

export async function ensureMlipCampaignSchema(env: Env): Promise<void> {
  await env.LEDGER.prepare(CAMPAIGN_DDL).run();
  await env.LEDGER.prepare(CELLS_DDL).run();
  await env.LEDGER.prepare(CELLS_INDEX).run();
  await env.LEDGER.prepare(TRIPLET_EVALS_DDL).run();
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultCampaignFixtureUrl(env: Env): string {
  const configured = env.MLIP_BASELINE_MANIFEST_URL?.trim();
  if (configured) return configured;
  const project = env.GCP_PROJECT_ID?.trim() || "shed-489901";
  return `gs://${project}-atlas-inputs/mlip-baseline/canonical-structures-v2/manifest.json`;
}

function validateAxis<T extends MlipAxisItem>(
  name: string,
  items: T[] | undefined,
  defaults: T[],
  expected: number,
): T[] {
  const resolved = items?.length ? items : defaults;
  if (resolved.length !== expected) {
    throw new Error(`${name} must contain exactly ${expected} entries`);
  }
  const seen = new Set<string>();
  return resolved.map((item) => {
    const id = slug(item.id || item.label);
    if (!id) throw new Error(`${name} contains an entry without an id`);
    if (seen.has(id)) throw new Error(`${name} contains duplicate id ${id}`);
    seen.add(id);
    return { ...item, id };
  });
}

export function campaignVariantIds(campaign: Pick<MlipCampaignRecord, "variants_json">): string[] {
  try {
    const parsed = JSON.parse(campaign.variants_json) as unknown;
    if (Array.isArray(parsed)) {
      const ids = parsed
        .map((item) => item && typeof item === "object" && "id" in item ? String((item as { id?: unknown }).id) : "")
        .filter((id) => id.trim());
      if (ids.length) return ids;
    }
  } catch {
    // Fall back to the canonical full triplet below.
  }
  return DEFAULT_CAMPAIGN_VARIANTS.map((variant) => variant.id);
}

export function renderFixtureUrl(
  template: string | undefined,
  vars: { campaign_id: string; row_id: string; mlip_id: string; variant_id: string; cell_id: string },
): string | null {
  if (!template?.trim()) return null;
  return template.replace(/\{(campaign_id|row_id|mlip_id|variant_id|cell_id)\}/g, (_match, key) => {
    return vars[key as keyof typeof vars];
  });
}

export function buildMlipCampaignCells(
  campaignId: string,
  rows: MlipAxisItem[],
  mlips: MlipAxisItem[],
  variants: MlipCampaignVariant[],
  fixtureTemplate?: string,
): Array<Pick<MlipCampaignCell, "cell_id" | "campaign_id" | "row_id" | "mlip_id" | "variant_id" | "fixture_url">> {
  const cells = [];
  for (const variant of variants) {
    for (const row of rows) {
      for (const mlip of mlips) {
        const cellId = [campaignId, variant.id, row.id, mlip.id].join(":");
        cells.push({
          cell_id: cellId,
          campaign_id: campaignId,
          row_id: row.id,
          mlip_id: mlip.id,
          variant_id: variant.id,
          fixture_url: renderFixtureUrl(fixtureTemplate, {
            campaign_id: campaignId,
            row_id: row.id,
            mlip_id: mlip.id,
            variant_id: variant.id,
            cell_id: cellId,
          }),
        });
      }
    }
  }
  return cells;
}

function tripletId(campaignId: string, rowId: string, mlipId: string): string {
  return [campaignId, rowId, mlipId].join(":");
}

function tripletStatus(
  cells: Array<MlipCampaignCell | null>,
  requiredVariants: string[] = DEFAULT_CAMPAIGN_VARIANTS.map((variant) => variant.id),
): MlipCampaignTriplet["status"] {
  const present = cells.filter(
    (cell): cell is MlipCampaignCell => Boolean(cell) && requiredVariants.includes(cell!.variant_id),
  );
  if (requiredVariants.some((variant) => !present.some((cell) => cell.variant_id === variant))) return "partial";
  if (present.some((cell) => cell.status === "failed")) return "failed";
  if (present.every((cell) => cell.status === "completed")) return "completed";
  if (present.some((cell) => cell.status === "running")) return "running";
  if (present.some((cell) => cell.status === "enqueued")) return "enqueued";
  return "queued";
}

export function groupMlipCampaignTriplets(
  cells: MlipCampaignCell[],
  requiredVariants: string[] = DEFAULT_CAMPAIGN_VARIANTS.map((variant) => variant.id),
): MlipCampaignTriplet[] {
  const grouped = new Map<string, MlipCampaignTriplet>();
  for (const cell of cells) {
    const key = `${cell.row_id}:${cell.mlip_id}`;
    const existing = grouped.get(key) ?? {
      campaign_id: cell.campaign_id,
      row_id: cell.row_id,
      mlip_id: cell.mlip_id,
      triplet_id: tripletId(cell.campaign_id, cell.row_id, cell.mlip_id),
      status: "partial" as const,
      baseline: null,
      distill_accuracy: null,
      distill_accuracy_accelerate: null,
      evaluation: null,
    };
    if (cell.variant_id === "baseline") existing.baseline = cell;
    if (cell.variant_id === "distill_accuracy") existing.distill_accuracy = cell;
    if (cell.variant_id === "distill_accuracy_accelerate") {
      existing.distill_accuracy_accelerate = cell;
    }
    existing.status = tripletStatus([
      existing.baseline,
      existing.distill_accuracy,
      existing.distill_accuracy_accelerate,
    ], requiredVariants);
    grouped.set(key, existing);
  }
  return [...grouped.values()].sort((a, b) =>
    `${a.row_id}:${a.mlip_id}`.localeCompare(`${b.row_id}:${b.mlip_id}`),
  );
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function evaluateMlipTriplet(
  triplet: MlipCampaignTriplet,
  requiredVariants: string[] = DEFAULT_CAMPAIGN_VARIANTS.map((variant) => variant.id),
): MlipTripletEvaluation {
  const baseline = triplet.baseline;
  const distill = triplet.distill_accuracy;
  const accelerate = triplet.distill_accuracy_accelerate;
  const missing = [
    requiredVariants.includes("baseline") && !baseline ? "baseline" : null,
    requiredVariants.includes("distill_accuracy") && !distill ? "distill_accuracy" : null,
    requiredVariants.includes("distill_accuracy_accelerate") && !accelerate ? "distill_accuracy_accelerate" : null,
  ].filter(Boolean);
  if (missing.length > 0) {
    return {
      triplet_id: triplet.triplet_id,
      campaign_id: triplet.campaign_id,
      row_id: triplet.row_id,
      mlip_id: triplet.mlip_id,
      verdict: "invalid",
      score: 0,
      baseline_accuracy: null,
      baseline_speed: null,
      distill_accuracy: null,
      distill_speed: null,
      accelerate_accuracy: null,
      accelerate_speed: null,
      distill_accuracy_delta: null,
      accelerate_accuracy_delta: null,
      accelerate_speed_ratio: null,
      explanation: `Missing triplet cells: ${missing.join(", ")}`,
    };
  }

  const baselineAccuracy = baseline!.accuracy_score;
  const baselineSpeed = baseline!.speed_score;
  const distillAccuracy = distill!.accuracy_score;
  const distillSpeed = distill!.speed_score;
  const accelerateAccuracy = accelerate?.accuracy_score ?? null;
  const accelerateSpeed = accelerate?.speed_score ?? null;
  if (!requiredVariants.includes("distill_accuracy_accelerate")) {
    if (!finite(baselineAccuracy) || !finite(distillAccuracy)) {
      return {
        triplet_id: triplet.triplet_id,
        campaign_id: triplet.campaign_id,
        row_id: triplet.row_id,
        mlip_id: triplet.mlip_id,
        verdict: "invalid",
        score: 0,
        baseline_accuracy: finite(baselineAccuracy) ? baselineAccuracy : null,
        baseline_speed: finite(baselineSpeed) ? baselineSpeed : null,
        distill_accuracy: finite(distillAccuracy) ? distillAccuracy : null,
        distill_speed: finite(distillSpeed) ? distillSpeed : null,
        accelerate_accuracy: null,
        accelerate_speed: null,
        distill_accuracy_delta: null,
        accelerate_accuracy_delta: null,
        accelerate_speed_ratio: null,
        explanation: "Accuracy pair is missing numeric baseline or Distill accuracy scores",
      };
    }
    const distillAccuracyDelta = distillAccuracy - baselineAccuracy;
    const verdict: MlipTripletVerdict =
      distillAccuracyDelta > 0 ? "win" : distillAccuracyDelta < 0 ? "regression" : "mixed";
    return {
      triplet_id: triplet.triplet_id,
      campaign_id: triplet.campaign_id,
      row_id: triplet.row_id,
      mlip_id: triplet.mlip_id,
      verdict,
      score: verdict === "win" ? 1 : verdict === "mixed" ? 0.5 : 0,
      baseline_accuracy: baselineAccuracy,
      baseline_speed: finite(baselineSpeed) ? baselineSpeed : null,
      distill_accuracy: distillAccuracy,
      distill_speed: finite(distillSpeed) ? distillSpeed : null,
      accelerate_accuracy: null,
      accelerate_speed: null,
      distill_accuracy_delta: distillAccuracyDelta,
      accelerate_accuracy_delta: null,
      accelerate_speed_ratio: null,
      explanation:
        `${triplet.mlip_id}/${triplet.row_id}: Distill accuracy delta=${distillAccuracyDelta.toFixed(4)}; ` +
        `accuracy-only verdict=${verdict}`,
    };
  }
  if (
    !finite(baselineAccuracy) ||
    !finite(baselineSpeed) ||
    !finite(distillAccuracy) ||
    !finite(distillSpeed) ||
    !finite(accelerateAccuracy) ||
    !finite(accelerateSpeed) ||
    baselineSpeed <= 0
  ) {
    return {
      triplet_id: triplet.triplet_id,
      campaign_id: triplet.campaign_id,
      row_id: triplet.row_id,
      mlip_id: triplet.mlip_id,
      verdict: "invalid",
      score: 0,
      baseline_accuracy: finite(baselineAccuracy) ? baselineAccuracy : null,
      baseline_speed: finite(baselineSpeed) ? baselineSpeed : null,
      distill_accuracy: finite(distillAccuracy) ? distillAccuracy : null,
      distill_speed: finite(distillSpeed) ? distillSpeed : null,
      accelerate_accuracy: finite(accelerateAccuracy) ? accelerateAccuracy : null,
      accelerate_speed: finite(accelerateSpeed) ? accelerateSpeed : null,
      distill_accuracy_delta: null,
      accelerate_accuracy_delta: null,
      accelerate_speed_ratio: null,
      explanation: "Triplet is missing numeric accuracy or speed scores",
    };
  }

  const distillAccuracyDelta = distillAccuracy - baselineAccuracy;
  const accelerateAccuracyDelta = accelerateAccuracy - baselineAccuracy;
  const accelerateSpeedRatio = accelerateSpeed / baselineSpeed;
  const accuracyWin = distillAccuracyDelta > 0 && accelerateAccuracyDelta >= 0;
  const speedWin = accelerateSpeedRatio > 1;
  const verdict: MlipTripletVerdict =
    accuracyWin && speedWin
      ? "win"
      : distillAccuracyDelta < 0 || accelerateAccuracyDelta < 0 || accelerateSpeedRatio < 1
        ? "regression"
        : "mixed";
  const score = verdict === "win" ? 1 : verdict === "mixed" ? 0.5 : 0;

  return {
    triplet_id: triplet.triplet_id,
    campaign_id: triplet.campaign_id,
    row_id: triplet.row_id,
    mlip_id: triplet.mlip_id,
    verdict,
    score,
    baseline_accuracy: baselineAccuracy,
    baseline_speed: baselineSpeed,
    distill_accuracy: distillAccuracy,
    distill_speed: distillSpeed,
    accelerate_accuracy: accelerateAccuracy,
    accelerate_speed: accelerateSpeed,
    distill_accuracy_delta: distillAccuracyDelta,
    accelerate_accuracy_delta: accelerateAccuracyDelta,
    accelerate_speed_ratio: accelerateSpeedRatio,
    explanation:
      `${triplet.mlip_id}/${triplet.row_id}: Distill accuracy delta=${distillAccuracyDelta.toFixed(4)}; ` +
      `Distill+Accelerate accuracy delta=${accelerateAccuracyDelta.toFixed(4)}; ` +
      `speed ratio=${accelerateSpeedRatio.toFixed(3)}x; verdict=${verdict}`,
  };
}

export function nextMlipCampaignTriplets(
  cells: MlipCampaignCell[],
  limit = 1,
  requiredVariants: string[] = DEFAULT_CAMPAIGN_VARIANTS.map((variant) => variant.id),
): MlipCampaignTriplet[] {
  return groupMlipCampaignTriplets(cells, requiredVariants)
    .filter((triplet) => triplet.status === "queued" || triplet.status === "partial")
    .slice(0, Math.max(1, Math.trunc(limit)));
}

export async function createMlipCampaign(
  env: Env,
  input: CreateMlipCampaignInput,
): Promise<{ campaign_id: string; inserted_cells: number; cells_expected: number }> {
  await ensureMlipCampaignSchema(env);
  await ensureAgendaSchema(env);

  const hypothesisId = input.hypothesis_id?.trim();
  if (!hypothesisId) throw new Error("hypothesis_id is required");
  const rows = validateAxis("rows", input.rows, DEFAULT_ACCURACY_ROWS, 5);
  const mlips = validateAxis("mlips", input.mlips, DEFAULT_MLIP_COLUMNS, 5);
  const defaultVariants = CAMPAIGN_VARIANTS_BY_SCOPE[input.variant_scope ?? "full"];
  const variants = validateAxis("variants", input.variants, defaultVariants, defaultVariants.length);
  const campaignId =
    input.campaign_id?.trim() ||
    `mlip-5x5x3-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const title = input.title?.trim() || "MLIP 5x5x3 accuracy and speed campaign";
  const now = new Date().toISOString();
  const qualityGate = input.quality_gate ?? "accuracy";
  const topK = Math.max(1, Math.trunc(input.top_k ?? 5));
  const modelPairs = input.model_pairs ?? [];
  const fixtureUrlTemplate = input.fixture_url_template ?? defaultCampaignFixtureUrl(env);

  await env.LEDGER.prepare(
    `INSERT OR REPLACE INTO mlip_campaigns
      (campaign_id, hypothesis_id, title, status, rows_json, mlips_json, variants_json,
       fixture_url_template, model_pairs_json, top_k, quality_gate, created_at, updated_at)
     VALUES (?1, ?2, ?3, 'draft', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)`,
  ).bind(
    campaignId,
    hypothesisId,
    title,
    JSON.stringify(rows),
    JSON.stringify(mlips),
    JSON.stringify(variants),
    fixtureUrlTemplate,
    JSON.stringify(modelPairs),
    topK,
    qualityGate,
    now,
  ).run();

  const cells = buildMlipCampaignCells(campaignId, rows, mlips, variants, fixtureUrlTemplate);
  let inserted = 0;
  for (const cell of cells) {
    await env.LEDGER.prepare(
      `INSERT OR IGNORE INTO mlip_campaign_cells
        (cell_id, campaign_id, row_id, mlip_id, variant_id, fixture_url, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'queued', ?7, ?7)`,
    ).bind(
      cell.cell_id,
      cell.campaign_id,
      cell.row_id,
      cell.mlip_id,
      cell.variant_id,
      cell.fixture_url,
      now,
    ).run();
    inserted += 1;
  }

  await env.LEDGER.prepare(
    `INSERT OR IGNORE INTO intelligence_tasks
      (task_id, title, domain, specialty, horizon, priority, payload, due_at)
     VALUES (?1, ?2, 'mlip-5x5x3-campaign', 'experiment', 'now', 1, ?3, datetime('now', '+1 day'))`,
  ).bind(
    `agenda:mlip-5x5x3:${campaignId}`,
    title,
    JSON.stringify({
      campaign_id: campaignId,
      hypothesis_id: hypothesisId,
      cells: cells.length,
      variants: variants.map((v) => v.id),
      rows: rows.map((r) => r.id),
      mlips: mlips.map((m) => m.id),
      variant_scope: input.variant_scope ?? "full",
      objective: variants.some((variant) => variant.id === "distill_accuracy_accelerate")
        ? "show baseline accuracy, distill accuracy lift, and distill+accelerate accuracy plus speed lift"
        : "show baseline accuracy and Distill Accuracy lift over all 25 row/backend pairs",
    }),
  ).run();

  return { campaign_id: campaignId, inserted_cells: inserted, cells_expected: cells.length };
}

export async function getMlipCampaign(
  env: Env,
  campaignId: string,
): Promise<{
  campaign: MlipCampaignRecord;
  cells: MlipCampaignCell[];
  triplets: MlipCampaignTriplet[];
  evaluations: MlipTripletEvaluationRecord[];
  summary: ReturnType<typeof summarizeMlipCampaign>;
} | null> {
  await ensureMlipCampaignSchema(env);
  const campaign = await env.LEDGER.prepare(
    `SELECT * FROM mlip_campaigns WHERE campaign_id = ?1`,
  ).bind(campaignId).first<MlipCampaignRecord>();
  if (!campaign) return null;
  const rows = await env.LEDGER.prepare(
    `SELECT * FROM mlip_campaign_cells
      WHERE campaign_id = ?1
      ORDER BY variant_id, row_id, mlip_id`,
  ).bind(campaignId).all<MlipCampaignCell>();
  const cells = (rows.results ?? []) as MlipCampaignCell[];
  const evalRows = await env.LEDGER.prepare(
    `SELECT * FROM mlip_campaign_triplet_evals
      WHERE campaign_id = ?1
      ORDER BY updated_at DESC`,
  ).bind(campaignId).all<MlipTripletEvaluationRecord>();
  const evaluations = (evalRows.results ?? []) as MlipTripletEvaluationRecord[];
  const evaluationsByTriplet = new Map(evaluations.map((evaluation) => [evaluation.triplet_id, evaluation]));
  const requiredVariants = campaignVariantIds(campaign);
  const triplets = groupMlipCampaignTriplets(cells, requiredVariants).map((triplet) => ({
    ...triplet,
    evaluation: evaluationsByTriplet.get(triplet.triplet_id) ?? null,
  }));
  return { campaign, cells, triplets, evaluations, summary: summarizeMlipCampaign(cells) };
}

export function summarizeMlipCampaign(cells: MlipCampaignCell[]) {
  const byVariant: Record<string, {
    cells: number;
    completed: number;
    mean_accuracy: number | null;
    mean_speed: number | null;
  }> = {};
  for (const cell of cells) {
    const bucket = byVariant[cell.variant_id] ??= {
      cells: 0,
      completed: 0,
      mean_accuracy: null,
      mean_speed: null,
    };
    bucket.cells += 1;
    if (cell.status === "completed") bucket.completed += 1;
  }
  for (const [variant, bucket] of Object.entries(byVariant)) {
    const variantCells = cells.filter((cell) => cell.variant_id === variant);
    const accuracies = variantCells
      .map((cell) => cell.accuracy_score)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const speeds = variantCells
      .map((cell) => cell.speed_score)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    bucket.mean_accuracy = accuracies.length
      ? accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length
      : null;
    bucket.mean_speed = speeds.length
      ? speeds.reduce((sum, value) => sum + value, 0) / speeds.length
      : null;
  }
  return {
    cells: cells.length,
    completed: cells.filter((cell) => cell.status === "completed").length,
    by_variant: byVariant,
  };
}

export async function markMlipCampaignCellEnqueued(
  env: Env,
  campaignId: string,
  cellId: string,
  jobId: string,
): Promise<void> {
  await ensureMlipCampaignSchema(env);
  await env.LEDGER.prepare(
    `UPDATE mlip_campaign_cells
       SET status = 'enqueued', job_id = ?3, updated_at = ?4
     WHERE campaign_id = ?1 AND cell_id = ?2`,
  ).bind(campaignId, cellId, jobId, new Date().toISOString()).run();
  await env.LEDGER.prepare(
    `UPDATE mlip_campaigns
       SET status = 'queued', updated_at = ?2
     WHERE campaign_id = ?1`,
  ).bind(campaignId, new Date().toISOString()).run();
}

export async function recordMlipCampaignResult(
  env: Env,
  input: MlipCampaignResultInput,
): Promise<{ updated: string }> {
  await ensureMlipCampaignSchema(env);
  const status = input.status ?? "completed";
  await env.LEDGER.prepare(
    `UPDATE mlip_campaign_cells
       SET status = ?3,
           accuracy_score = COALESCE(?4, accuracy_score),
           accuracy_unit = COALESCE(?5, accuracy_unit),
           speed_score = COALESCE(?6, speed_score),
           speed_unit = COALESCE(?7, speed_unit),
           metrics_json = COALESCE(?8, metrics_json),
           updated_at = ?9
     WHERE campaign_id = ?1 AND cell_id = ?2`,
  ).bind(
    input.campaign_id,
    input.cell_id,
    status,
    input.accuracy_score ?? null,
    input.accuracy_unit ?? null,
    input.speed_score ?? null,
    input.speed_unit ?? null,
    input.metrics ? JSON.stringify(input.metrics) : null,
    new Date().toISOString(),
  ).run();
  await evaluateCompletedTripletForCell(env, input.campaign_id, input.cell_id, input.source ?? "manual");
  return { updated: input.cell_id };
}

async function persistTripletEvaluation(
  env: Env,
  evaluation: MlipTripletEvaluation,
  traceId?: string,
  spanId?: string,
): Promise<void> {
  await env.LEDGER.prepare(
    `INSERT OR REPLACE INTO mlip_campaign_triplet_evals
      (triplet_id, campaign_id, row_id, mlip_id, verdict, score,
       accuracy_delta_distill, accuracy_delta_accelerate, speed_ratio_accelerate,
       trace_id, span_id, explanation, metrics_json, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
  ).bind(
    evaluation.triplet_id,
    evaluation.campaign_id,
    evaluation.row_id,
    evaluation.mlip_id,
    evaluation.verdict,
    evaluation.score,
    evaluation.distill_accuracy_delta,
    evaluation.accelerate_accuracy_delta,
    evaluation.accelerate_speed_ratio,
    traceId ?? null,
    spanId ?? null,
    evaluation.explanation,
    JSON.stringify(evaluation),
    new Date().toISOString(),
  ).run();
}

async function maybeAnnotatePhoenixTrace(
  env: Env,
  traceId: string,
  evaluation: MlipTripletEvaluation,
): Promise<void> {
  const endpoint = env.PHOENIX_COLLECTOR_ENDPOINT?.trim().replace(/^['"]|['"]$/g, "");
  const apiKey = env.PHOENIX_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!endpoint || !apiKey) return;
  const project = env.PHOENIX_PROJECT_NAME?.trim().replace(/^['"]|['"]$/g, "") || "glim-think";
  const phoenix = new PhoenixApi(endpoint, apiKey, project);
  await phoenix.annotateTraces([
    {
      trace_id: traceId,
      name: "mlip_triplet.delta_verdict",
      annotator_kind: "CODE",
      result: {
        score: evaluation.score,
        label: evaluation.verdict,
        explanation: evaluation.explanation,
      },
      identifier: evaluation.triplet_id,
      metadata: {
        campaign_id: evaluation.campaign_id,
        row_id: evaluation.row_id,
        mlip_id: evaluation.mlip_id,
      },
    },
  ]);
}

export async function traceMlipTripletEvaluation(
  env: Env,
  campaign: MlipCampaignRecord,
  triplet: MlipCampaignTriplet,
  source: MlipTripletEvaluationSource = "auto",
): Promise<MlipTripletEvaluation> {
  const requiredVariants = campaignVariantIds(campaign);
  const evaluation = evaluateMlipTriplet(triplet, requiredVariants);
  return traceHypothesisStage(
    {
      hypothesisId: campaign.hypothesis_id,
      stage: "experiment_design",
      status: "testing",
      attributes: {
        "mlip.campaign_id": campaign.campaign_id,
        "mlip.triplet_id": triplet.triplet_id,
        "mlip.row_id": triplet.row_id,
        "mlip.mlip_id": triplet.mlip_id,
        "mlip.source": source,
      },
    },
    async () => {
      await traceHypothesisStage(
        {
          hypothesisId: campaign.hypothesis_id,
          stage: "compute_dispatch",
          status: "testing",
          attributes: {
            "mlip.triplet_status": triplet.status,
            "mlip.baseline_status": triplet.baseline?.status ?? "missing",
            "mlip.distill_status": triplet.distill_accuracy?.status ?? "missing",
            "mlip.accelerate_status": requiredVariants.includes("distill_accuracy_accelerate")
              ? triplet.distill_accuracy_accelerate?.status ?? "missing"
              : "not_required",
          },
        },
        async () => undefined,
      );
      await traceHypothesisStage(
        {
          hypothesisId: campaign.hypothesis_id,
          stage: "evidence",
          status: "testing",
          attributes: {
            "mlip.baseline_accuracy": evaluation.baseline_accuracy ?? -1,
            "mlip.distill_accuracy": evaluation.distill_accuracy ?? -1,
            "mlip.accelerate_accuracy": evaluation.accelerate_accuracy ?? -1,
            "mlip.baseline_speed": evaluation.baseline_speed ?? -1,
            "mlip.accelerate_speed": evaluation.accelerate_speed ?? -1,
          },
        },
        async () => undefined,
      );
      return traceHypothesisStage(
        {
          hypothesisId: campaign.hypothesis_id,
          stage: "verdict",
          status: evaluation.verdict === "win" ? "confirmed" : "testing",
          confidence: evaluation.score,
          attributes: {
            "mlip.verdict": evaluation.verdict,
            "mlip.delta_accuracy_distill": evaluation.distill_accuracy_delta ?? 0,
            "mlip.delta_accuracy_accelerate": evaluation.accelerate_accuracy_delta ?? 0,
            "mlip.speed_ratio_accelerate": evaluation.accelerate_speed_ratio ?? 0,
          },
        },
        async (span) => {
          annotateHypothesisVerdict(span, {
            hypothesisId: campaign.hypothesis_id,
            resolved: evaluation.verdict === "win" || evaluation.verdict === "regression",
            outcome:
              evaluation.verdict === "win"
                ? "confirmed"
                : evaluation.verdict === "regression"
                  ? "refuted"
                  : "inconclusive",
            confidenceDelta: evaluation.score,
            discriminativePropertyTested: `${triplet.row_id}:${triplet.mlip_id}`,
          });
          const ctx = span.spanContext();
          await insertEval(env, {
            trace_id: ctx.traceId,
            span_id: ctx.spanId,
            agent_class: "glim-think",
            task_kind: "mlip_triplet",
            evaluator_name: "mlip_triplet.delta_verdict",
            score: evaluation.score,
            label: evaluation.verdict,
            explanation: evaluation.explanation,
            action_taken: evaluation.verdict === "invalid" ? "failed" : "accepted",
            retry_count: 0,
            created_at: new Date().toISOString(),
          });
          await persistTripletEvaluation(env, evaluation, ctx.traceId, ctx.spanId);
          try {
            await maybeAnnotatePhoenixTrace(env, ctx.traceId, evaluation);
          } catch (e) {
            console.error("Phoenix triplet annotation failed:", e);
          }
          return evaluation;
        },
      );
    },
  );
}

export async function evaluateCampaignTriplet(
  env: Env,
  campaignId: string,
  rowId: string,
  mlipId: string,
  source: MlipTripletEvaluationSource = "manual",
): Promise<MlipTripletEvaluation> {
  const campaign = await getMlipCampaign(env, campaignId);
  if (!campaign) throw new Error(`Campaign '${campaignId}' not found`);
  const triplet = campaign.triplets.find((candidate) => candidate.row_id === rowId && candidate.mlip_id === mlipId);
  if (!triplet) throw new Error(`Triplet '${rowId}:${mlipId}' not found`);
  return traceMlipTripletEvaluation(env, campaign.campaign, triplet, source);
}

async function evaluateCompletedTripletForCell(
  env: Env,
  campaignId: string,
  cellId: string,
  source: MlipTripletEvaluationSource,
): Promise<void> {
  const campaign = await getMlipCampaign(env, campaignId);
  if (!campaign) return;
  const cell = campaign.cells.find((candidate) => candidate.cell_id === cellId);
  if (!cell) return;
  const triplet = campaign.triplets.find(
    (candidate) => candidate.row_id === cell.row_id && candidate.mlip_id === cell.mlip_id,
  );
  if (!triplet || triplet.status !== "completed") return;
  await traceMlipTripletEvaluation(env, campaign.campaign, triplet, source);
}

export async function recordMlipCampaignBeat(
  env: Env,
  metrics: Record<string, unknown> | undefined,
): Promise<void> {
  if (!metrics) return;
  const campaignId = typeof metrics.campaign_id === "string" ? metrics.campaign_id : "";
  const cellId = typeof metrics.cell_id === "string" ? metrics.cell_id : "";
  if (!campaignId || !cellId) return;

  const accuracy = metrics.accuracy as Record<string, unknown> | undefined;
  const speed = metrics.speed as Record<string, unknown> | undefined;
  const accuracyScore =
    typeof accuracy?.score === "number"
      ? accuracy.score
      : typeof metrics.accuracy_score === "number"
        ? metrics.accuracy_score
        : undefined;
  const speedScore =
    typeof speed?.score === "number"
      ? speed.score
      : typeof metrics.speed_score === "number"
        ? metrics.speed_score
        : undefined;

  await recordMlipCampaignResult(env, {
    campaign_id: campaignId,
    cell_id: cellId,
    accuracy_score: accuracyScore,
    accuracy_unit: typeof accuracy?.unit === "string" ? accuracy.unit : undefined,
    speed_score: speedScore,
    speed_unit: typeof speed?.unit === "string" ? speed.unit : undefined,
    status: metrics.status === "failed" ? "failed" : metrics.status === "running" ? "running" : "completed",
    metrics,
    source: "auto",
  });
}
