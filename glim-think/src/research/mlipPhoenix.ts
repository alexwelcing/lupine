import type { Env } from "../types";
import { PhoenixApi, type PhoenixDatasetUploadExample, type TraceAnnotation } from "../phoenix/api";
import { DEFAULT_ACCURACY_ROWS, DEFAULT_MLIP_COLUMNS } from "./mlipCampaign";
import type {
  MlipCampaignCell,
  MlipCampaignRecord,
  MlipCampaignTriplet,
  MlipTripletEvaluationRecord,
} from "./mlipCampaign";
import { mlipBaselineReleaseGate, mlipCellReadiness } from "./mlipBaselineReadiness";
import type {
  MlipBaselineCellRecord,
  MlipBaselineCellResultInput,
  MlipBaselineState,
} from "./mlipBaselineGrid";
import {
  MLIP_STATE_ANCHOR_ROW,
  MLIP_STATE_DOWNSTREAM_ROWS,
  evaluateMlipStateHypotheses,
  type MlipStateHypothesisEvaluation,
} from "./mlipStateHypotheses";

export const MLIP_PHOENIX_DATASET_NAME = "mlip-canonical-v2-heldout";
export const MLIP_PHOENIX_EXPERIMENT_GROUP = "mlip-5x5x3";
export const MLIP_PHOENIX_PROJECT_NAME = "glim-think";

export interface MlipPhoenixEvaluatorSpec {
  name: string;
  kind: "CODE" | "LLM";
  optimization: "maximize" | "minimize" | "none";
  applies_to: string[];
  description: string;
  input_mapping: Record<string, string>;
  release_gate?: {
    threshold: number;
    label: string;
  };
}

export interface MlipPhoenixEvaluationResult {
  evaluator_name: string;
  score: number;
  label: string;
  explanation: string;
  metadata: Record<string, unknown>;
}

export interface MlipPhoenixExperimentPacket {
  schema: "lupine.mlip.phoenix_experiment_packet.v1";
  phoenix: {
    project: {
      name: string;
      source: "PHOENIX_PROJECT_NAME";
      required: true;
    };
    dataset: {
      name: string;
      version_name: string;
      description: string;
      metadata: Record<string, unknown>;
    };
    experiment_group: string;
    evaluator_specs: MlipPhoenixEvaluatorSpec[];
    server_eval_note: string;
  };
  campaign: {
    workflow_id: string;
    run_id: string;
    variant_id: "baseline";
    profile: string;
    fixture_id: string;
    manifest_url: string;
    artifact_prefix: string;
    status: string;
  };
  examples: MlipPhoenixDatasetExample[];
  experiments: MlipPhoenixExperiment[];
  release_gate: {
    ready_for_research_release: boolean;
    label: string;
    blockers: string[];
  };
}

export interface MlipPhoenixDatasetExample {
  example_id: string;
  input: Record<string, unknown>;
  reference: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface MlipPhoenixExperiment {
  experiment_name: string;
  variant_id: "baseline";
  mlip_id?: string;
  run_id: string;
  summary: {
    completed: number;
    mean_accuracy_score: number | null;
    mean_speed_score: number | null;
  };
  runs: MlipPhoenixExperimentRun[];
}

export interface MlipPhoenixExperimentRun {
  example_id: string;
  output: Record<string, unknown>;
  metadata: Record<string, unknown>;
  evaluations: MlipPhoenixEvaluationResult[];
}

export interface Mlip5x5x3PhoenixState {
  campaign: MlipCampaignRecord;
  cells: MlipCampaignCell[];
  triplets: MlipCampaignTriplet[];
  evaluations: MlipTripletEvaluationRecord[];
  summary: Record<string, unknown>;
}

export interface Mlip5x5x3PhoenixExperimentPacket {
  schema: "lupine.mlip.phoenix_5x5x3_packet.v1";
  phoenix: {
    project: {
      name: string;
      source: "PHOENIX_PROJECT_NAME";
      required: true;
    };
    dataset: {
      name: string;
      version_name: string;
      description: string;
      metadata: Record<string, unknown>;
    };
    experiment_group: string;
    evaluator_specs: MlipPhoenixEvaluatorSpec[];
    server_eval_note: string;
  };
  campaign: {
    workflow_id: "mlip-5x5x3";
    campaign_id: string;
    hypothesis_id: string;
    status: string;
    variants: string[];
    rows: string[];
    mlips: string[];
  };
  examples: MlipPhoenixDatasetExample[];
  experiments: Array<{
    experiment_name: string;
    variant_id: string;
    campaign_id: string;
    summary: {
      completed: number;
      mean_accuracy_score: number | null;
      mean_speed_score: number | null;
    };
    runs: MlipPhoenixExperimentRun[];
  }>;
  triplet_evaluations: MlipTripletEvaluationRecord[];
  state_hypotheses: MlipStateHypothesisEvaluation[];
  summary: Record<string, unknown>;
}

export type MlipPhoenixPacket = MlipPhoenixExperimentPacket | Mlip5x5x3PhoenixExperimentPacket;

export interface MlipPhoenixSyncResult {
  schema: "lupine.mlip.phoenix_sync_result.v1";
  project: {
    name: string;
    packet_project_name: string;
    verified: boolean;
  };
  dataset: {
    name: string;
    id: string;
    version_id: string | null;
    upload_action: "create" | "append" | "update";
    examples_submitted: number;
    examples_resolved: number;
  };
  experiments: Array<{
    name: string;
    id: string;
    variant_id: string;
    reused: boolean;
    project_name: string | null;
    project_match: boolean | null;
    metadata_project_match: boolean | null;
    runs_written: number;
    runs_skipped: number;
    evaluations_expected: number;
    evaluations_written: number;
    evaluation_names_written: string[];
  }>;
  evaluator_specs: string[];
  warnings: string[];
}

interface MlipPairedTargetContext {
  row_id: string;
  mlip_id: string;
  baseline_accuracy_score: number | null;
  baseline_speed_score: number | null;
  distill_accuracy_score: number | null;
  distill_speed_score: number | null;
  accelerate_accuracy_score: number | null;
  accelerate_speed_score: number | null;
}

interface MlipPhoenixRunEvaluationOptions {
  variant_id?: string;
  paired?: MlipPairedTargetContext | null;
}

export const MLIP_PHOENIX_EVALUATOR_SPECS: MlipPhoenixEvaluatorSpec[] = [
  {
    name: "mlip.energy.mae_ev_per_atom",
    kind: "CODE",
    optimization: "minimize",
    applies_to: ["energy_volume", "relaxation_stability"],
    description: "Physical energy error against held-out reference configurations.",
    input_mapping: {
      predicted: "output.prediction.energy_ev_per_atom",
      reference: "reference.energy_ev_per_atom",
      material: "metadata.material",
    },
  },
  {
    name: "mlip.force.rmse_ev_per_angstrom",
    kind: "CODE",
    optimization: "minimize",
    applies_to: ["forces", "relaxation_stability"],
    description: "Force RMSE on displaced held-out structures with nonzero reference forces.",
    input_mapping: {
      predicted: "output.prediction.forces_ev_per_angstrom",
      reference: "reference.forces_ev_per_angstrom",
      structure_id: "metadata.structure_id",
    },
  },
  {
    name: "mlip.stress.mae_gpa",
    kind: "CODE",
    optimization: "minimize",
    applies_to: ["stress", "elastic_constants"],
    description: "Stress MAE in GPa on strained cells, avoiding relative error against zero stress.",
    input_mapping: {
      predicted: "output.prediction.stress_gpa",
      reference: "reference.stress_gpa",
      strain_mode: "metadata.strain_mode",
    },
  },
  {
    name: "mlip.elastic.cij_mae_gpa",
    kind: "CODE",
    optimization: "minimize",
    applies_to: ["elastic_constants"],
    description: "Finite-strain elastic tensor error in GPa; replaces the smoke-run stress proxy.",
    input_mapping: {
      predicted: "output.prediction.elastic_constants_gpa",
      reference: "reference.elastic_constants_gpa",
      material: "metadata.material",
    },
  },
  {
    name: "mlip.relaxation.converged",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["relaxation_stability"],
    description: "Checks whether the calculator reaches a stable relaxation under the configured optimizer.",
    input_mapping: {
      converged: "output.relaxation.converged",
      max_force: "output.relaxation.max_force_ev_per_angstrom",
      threshold: "reference.relaxation_force_threshold",
    },
    release_gate: { threshold: 1, label: "converged" },
  },
  {
    name: "mlip.speed.warm_structures_per_second",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Warm inference throughput after model load, separated from cold start latency.",
    input_mapping: {
      throughput: "output.speed.warm_structures_per_second",
      device: "metadata.cuda_device",
      runner_image: "metadata.image_digest",
    },
  },
  {
    name: "mlip.speed.cold_total_seconds",
    kind: "CODE",
    optimization: "minimize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "End-to-end cell runtime including model import/load and artifact emission.",
    input_mapping: {
      duration: "output.speed.cold_total_seconds",
      target_job: "metadata.target_job",
    },
  },
  {
    name: "mlip.gate.distill_accuracy_win",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Passes when Distill accuracy improves held-out accuracy over the paired baseline.",
    input_mapping: {
      baseline: "metadata.baseline_accuracy_score",
      candidate: "output.accuracy.normalized_score",
      row_id: "input.row_id",
    },
    release_gate: { threshold: 1, label: "accuracy_win" },
  },
  {
    name: "mlip.gate.accelerate_accuracy_speed_win",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Passes when Distill+Accelerate preserves accuracy while improving speed over baseline.",
    input_mapping: {
      baseline_accuracy: "metadata.baseline_accuracy_score",
      candidate_accuracy: "output.accuracy.normalized_score",
      baseline_speed: "metadata.baseline_speed_score",
      candidate_speed: "output.speed.warm_structures_per_second",
    },
    release_gate: { threshold: 1, label: "accuracy_and_speed_win" },
  },
  {
    name: "distill.state_surface_anchor",
    kind: "CODE",
    optimization: "maximize",
    applies_to: [MLIP_STATE_ANCHOR_ROW],
    description:
      "Passes when Distill Accuracy improves the same-MLIP energy/free-energy state anchor before downstream claims are credited.",
    input_mapping: {
      baseline: "metadata.baseline_accuracy_score",
      candidate: "output.accuracy.normalized_score",
      row_id: "input.row_id",
    },
    release_gate: { threshold: 1, label: "state_anchor_win" },
  },
  {
    name: "distill.downstream_no_harm",
    kind: "CODE",
    optimization: "maximize",
    applies_to: [...MLIP_STATE_DOWNSTREAM_ROWS],
    description:
      "Requires downstream lattice observables to avoid regression when the Distill state anchor is changed.",
    input_mapping: {
      baseline: "metadata.baseline_accuracy_score",
      candidate: "output.accuracy.normalized_score",
      row_id: "input.row_id",
    },
    release_gate: { threshold: 1, label: "downstream_no_harm" },
  },
  {
    name: "distill.state_coupled_lattice_lift",
    kind: "CODE",
    optimization: "maximize",
    applies_to: [MLIP_STATE_ANCHOR_ROW, ...MLIP_STATE_DOWNSTREAM_ROWS],
    description:
      "Campaign-level hypothesis: a valid hyperribbon improves the energy/free-energy state and lifts or preserves downstream forces, stress, elastic, and relaxation observables.",
    input_mapping: {
      hypothesis_id: "state_hypotheses.0.hypothesis_id",
      verdict: "state_hypotheses.0.verdict",
      score: "state_hypotheses.0.score",
    },
    release_gate: { threshold: 1, label: "state_coupled_lift" },
  },
  {
    name: "mlip.contract.v2_fixture_readiness",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Checks whether an example is backed by a non-degenerate V2 held-out fixture.",
    input_mapping: {
      n_structures: "metadata.n_structures",
      row_id: "input.row_id",
      fixture_id: "metadata.fixture_id",
    },
    release_gate: { threshold: 1, label: "v2_ready" },
  },
  {
    name: "distill.leakage_guard",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Passes when Distill support structures do not overlap the sealed held-out evaluation fixture.",
    input_mapping: {
      support_hash: "output.distill_runtime.support_manifest_hash",
      passed: "output.distill_runtime.leakage_guard.passed",
    },
    release_gate: { threshold: 1, label: "no_leakage" },
  },
  {
    name: "distill.intervention_trace",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Checks that active Distill variants emit a machine-readable intervention trace.",
    input_mapping: {
      interventions: "output.distill_runtime.interventions",
      events_uri: "output.distill_runtime.events_uri",
    },
  },
  {
    name: "distill.refusal_policy",
    kind: "CODE",
    optimization: "none",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Records refusal/guard activity from the in-run Distill policy.",
    input_mapping: {
      refusals: "output.distill_runtime.refusals",
      profile: "output.distill_runtime.profile",
    },
  },
  {
    name: "distill.policy_limits_selected",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Checks whether a Distill run used an explicit selected hyperribbon limits artifact instead of the default policy.",
    input_mapping: {
      policy_hash: "output.distill_runtime.distill_policy_hash",
      policy_limits_id: "output.distill_runtime.policy_decisions.0.theorem_hooks.policy_limits_id",
      ribbon_version: "output.distill_runtime.ribbon_version",
    },
  },
  {
    name: "distill.support_correction_executable",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Distinguishes real executable support corrections from guarded no-op support diagnostics.",
    input_mapping: {
      correction: "output.distill_runtime.support_model.correction",
      candidate_correction: "output.distill_runtime.support_model.candidate_correction",
      applicability_gate: "output.distill_runtime.support_model.diagnostics.applicability_gate",
      row_id: "input.row_id",
    },
  },
  {
    name: "distill.accuracy_delta",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Scores paired Distill Accuracy improvement against the same-MLIP baseline.",
    input_mapping: {
      baseline: "metadata.baseline_accuracy_score",
      candidate: "output.accuracy.normalized_score",
      variant_id: "metadata.variant_id",
    },
    release_gate: { threshold: 1, label: "accuracy_delta_positive" },
  },
  {
    name: "distill.speed_delta",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Scores Distill+Accelerate throughput lift while preserving Distill accuracy.",
    input_mapping: {
      distill_accuracy_speed: "metadata.distill_accuracy_speed_score",
      candidate_speed: "output.speed.warm_structures_per_second",
      variant_id: "metadata.variant_id",
    },
  },
  {
    name: "theorem.speedup_bound_observed",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Tracks observed acceleration against the outer-loop proxy theorem hooks emitted by the runner.",
    input_mapping: {
      kappa1_hat: "output.theorem_hooks.kappa1_hat",
      observed_speedup: "output.theorem_hooks.observed_speedup",
      bridge: "output.theorem_hooks.bridge",
    },
  },
  {
    name: "theorem.lean_bridge_ready",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Tracks whether emitted theorem hooks are still outer-loop proxies or backed by an exact layerwise/Lean bridge.",
    input_mapping: {
      bridge: "output.theorem_hooks.bridge",
      layerwise_exact: "output.theorem_hooks.layerwise_exact",
      ribbon_version: "output.theorem_hooks.ribbon_version",
    },
  },
  {
    name: "distill.target.v2_promotion_gate",
    kind: "CODE",
    optimization: "maximize",
    applies_to: ["energy_volume", "forces", "stress", "elastic_constants", "relaxation_stability"],
    description: "Paired triplet gate for a candidate ribbon: Distill accuracy improves, acceleration preserves accuracy, and speed lifts.",
    input_mapping: {
      baseline_accuracy: "metadata.baseline_accuracy_score",
      distill_accuracy: "metadata.distill_accuracy_score",
      accelerate_accuracy: "output.accuracy.normalized_score",
      speed_ratio: "metadata.accelerate_speed_ratio",
    },
    release_gate: { threshold: 1, label: "v2_candidate" },
  },
];

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

function recordField(record: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> | null {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function numberField(record: Record<string, unknown> | null | undefined, key: string): number | null {
  const value = record?.[key];
  return finiteNumber(value) ? value : null;
}

function stringField(record: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function boolField(record: Record<string, unknown> | null | undefined, key: string): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function arrayField(record: Record<string, unknown> | null | undefined, key: string): unknown[] | null {
  const value = record?.[key];
  return Array.isArray(value) ? value : null;
}

function mean(values: Array<number | null>): number | null {
  const finite = values.filter((value): value is number => finiteNumber(value));
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function metricsForCell(cell: MlipBaselineCellRecord): Record<string, unknown> | null {
  return parseJsonObject(cell.metrics_json);
}

function versionsForMetrics(metrics: Record<string, unknown> | null): Record<string, unknown> | null {
  return recordField(metrics, "versions");
}

function nStructures(metrics: Record<string, unknown> | null): number | null {
  return numberField(metrics, "n_structures");
}

function pairKey(rowId: string, mlipId: string): string {
  return `${rowId}:${mlipId}`;
}

function buildMlipPairContexts(cells: MlipCampaignCell[]): Map<string, MlipPairedTargetContext> {
  const byPair = new Map<string, MlipPairedTargetContext>();
  for (const cell of cells) {
    const key = pairKey(cell.row_id, cell.mlip_id);
    const current = byPair.get(key) ?? {
      row_id: cell.row_id,
      mlip_id: cell.mlip_id,
      baseline_accuracy_score: null,
      baseline_speed_score: null,
      distill_accuracy_score: null,
      distill_speed_score: null,
      accelerate_accuracy_score: null,
      accelerate_speed_score: null,
    };
    if (cell.variant_id === "baseline") {
      current.baseline_accuracy_score = cell.accuracy_score;
      current.baseline_speed_score = cell.speed_score;
    } else if (cell.variant_id === "distill_accuracy") {
      current.distill_accuracy_score = cell.accuracy_score;
      current.distill_speed_score = cell.speed_score;
    } else if (cell.variant_id === "distill_accuracy_accelerate") {
      current.accelerate_accuracy_score = cell.accuracy_score;
      current.accelerate_speed_score = cell.speed_score;
    }
    byPair.set(key, current);
  }
  return byPair;
}

function pairedMetadata(context: MlipPairedTargetContext | null | undefined): Record<string, unknown> {
  if (!context) return {};
  const distillAccuracyDelta = finiteNumber(context.distill_accuracy_score) && finiteNumber(context.baseline_accuracy_score)
    ? context.distill_accuracy_score - context.baseline_accuracy_score
    : null;
  const accelerateAccuracyDelta = finiteNumber(context.accelerate_accuracy_score) && finiteNumber(context.baseline_accuracy_score)
    ? context.accelerate_accuracy_score - context.baseline_accuracy_score
    : null;
  const accelerateSpeedRatio = finiteNumber(context.accelerate_speed_score) && finiteNumber(context.baseline_speed_score) && context.baseline_speed_score > 0
    ? context.accelerate_speed_score / context.baseline_speed_score
    : null;
  return {
    baseline_accuracy_score: context.baseline_accuracy_score,
    baseline_speed_score: context.baseline_speed_score,
    distill_accuracy_score: context.distill_accuracy_score,
    distill_speed_score: context.distill_speed_score,
    accelerate_accuracy_score: context.accelerate_accuracy_score,
    accelerate_speed_score: context.accelerate_speed_score,
    distill_accuracy_delta: distillAccuracyDelta,
    accelerate_accuracy_delta: accelerateAccuracyDelta,
    accelerate_speed_ratio: accelerateSpeedRatio,
  };
}

function durationSeconds(metrics: Record<string, unknown> | null): number | null {
  const ms = numberField(recordField(metrics, "speed"), "duration_ms");
  return finiteNumber(ms) ? ms / 1000 : null;
}

function rowLabel(rowId: string): string {
  return DEFAULT_ACCURACY_ROWS.find((row) => row.id === rowId)?.label ?? rowId;
}

function mlipLabel(mlipId: string): string {
  return DEFAULT_MLIP_COLUMNS.find((mlip) => mlip.id === mlipId)?.label ?? mlipId;
}

export function phoenixProjectName(env?: Pick<Env, "PHOENIX_PROJECT_NAME">): string {
  return env?.PHOENIX_PROJECT_NAME?.trim().replace(/^['"]|['"]$/g, "") || MLIP_PHOENIX_PROJECT_NAME;
}

function cellExampleId(fixtureId: string, rowId: string, mlipId: string): string {
  return `${fixtureId}:${rowId}:${mlipId}`;
}

function metricContract(rowId: string): Record<string, unknown> {
  if (rowId === "forces") {
    return {
      required_reference: "forces_ev_per_angstrom",
      primary_metric: "force_rmse_ev_per_angstrom",
      release_note: "Requires displaced held-out structures with nonzero reference forces.",
    };
  }
  if (rowId === "stress") {
    return {
      required_reference: "stress_gpa",
      primary_metric: "stress_mae_gpa",
      release_note: "Requires strained held-out cells and absolute GPa error, not relative error against zero.",
    };
  }
  if (rowId === "elastic_constants") {
    return {
      required_reference: "elastic_constants_gpa",
      primary_metric: "cij_mae_gpa",
      release_note: "Requires finite-strain Cij calculation; smoke stress proxy is not release-grade.",
    };
  }
  if (rowId === "relaxation_stability") {
    return {
      required_reference: "relaxed_structure_and_energy",
      primary_metric: "convergence_and_final_energy_delta",
      release_note: "Requires actual relaxation from perturbed starts.",
    };
  }
  return {
    required_reference: "energy_ev_per_atom",
    primary_metric: "energy_volume_curve_error",
    release_note: "Requires multiple volume points and held-out EOS references.",
  };
}

export function buildMlipPhoenixDatasetExamples(state: MlipBaselineState): MlipPhoenixDatasetExample[] {
  return DEFAULT_ACCURACY_ROWS.flatMap((row) =>
    DEFAULT_MLIP_COLUMNS.map((mlip) => ({
      example_id: cellExampleId(state.run.fixture_id, row.id, mlip.id),
      input: {
        row_id: row.id,
        row_label: row.label,
        task_kind: row.id,
        mlip_id: mlip.id,
        mlip_label: mlip.label,
        fixture_id: state.run.fixture_id,
        manifest_url: state.run.manifest_url,
      },
      reference: {
        metric_contract: metricContract(row.id),
        heldout_split_required: true,
        physical_units_required: true,
      },
      metadata: {
        example_kind: "mlip_cell_summary",
        example_granularity: "row_mlip_cell",
        split: "heldout",
        fixture_id: state.run.fixture_id,
        manifest_url: state.run.manifest_url,
        manifest_hash: "pending",
        row_id: row.id,
        mlip_id: mlip.id,
      },
    }))
  );
}

function campaignCellExampleId(rowId: string, mlipId: string): string {
  return cellExampleId("canonical-structures-v2", rowId, mlipId);
}

function campaignCellMetrics(cell: MlipCampaignCell): Record<string, unknown> | null {
  return parseJsonObject(cell.metrics_json);
}

function orderedUnique(values: string[], preferred: string[] = []): string[] {
  const seen = [...new Set(values.filter(Boolean))];
  return seen.sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
    return a.localeCompare(b);
  });
}

function campaignCellAsBaselineRecord(
  cell: MlipCampaignCell,
  metrics: Record<string, unknown> | null,
): MlipBaselineCellRecord {
  return {
    cell_id: cell.cell_id,
    run_id: cell.campaign_id,
    row_id: cell.row_id,
    mlip_id: cell.mlip_id,
    status: cell.status as MlipBaselineCellRecord["status"],
    target_job: stringField(metrics, "target_job"),
    manifest_url: cell.fixture_url ?? stringField(metrics, "manifest_url"),
    task_name: stringField(metrics, "task_name"),
    operation_name: stringField(metrics, "operation_name"),
    accuracy_score: cell.accuracy_score,
    accuracy_unit: cell.accuracy_unit,
    speed_score: cell.speed_score,
    speed_unit: cell.speed_unit,
    metrics_json: cell.metrics_json,
    artifact_uri: stringField(metrics, "artifact_uri"),
    trace_id: stringField(metrics, "trace_id"),
    span_id: stringField(metrics, "span_id"),
    retry_count: numberField(metrics, "retry_count") ?? 0,
    error: stringField(metrics, "error"),
    created_at: cell.created_at,
    updated_at: cell.updated_at,
    enqueued_at: null,
    completed_at: cell.status === "completed" ? cell.updated_at : null,
  };
}

export function buildMlip5x5x3DatasetExamples(state: Mlip5x5x3PhoenixState): MlipPhoenixDatasetExample[] {
  const grouped = new Map<string, MlipCampaignCell>();
  for (const cell of state.cells) {
    grouped.set(`${cell.row_id}:${cell.mlip_id}`, cell);
  }
  return [...grouped.values()]
    .sort((a, b) => `${a.row_id}:${a.mlip_id}`.localeCompare(`${b.row_id}:${b.mlip_id}`))
    .map((cell) => ({
      example_id: campaignCellExampleId(cell.row_id, cell.mlip_id),
      input: {
        row_id: cell.row_id,
        row_label: rowLabel(cell.row_id),
        mlip_id: cell.mlip_id,
        mlip_label: mlipLabel(cell.mlip_id),
        fixture_url: cell.fixture_url,
      },
      reference: {
        metric_contract: metricContract(cell.row_id),
        heldout_split_required: true,
        physical_units_required: true,
      },
      metadata: {
        workflow_id: "mlip-5x5x3",
        campaign_id: state.campaign.campaign_id,
        split: "heldout",
        example_kind: "mlip_cell_summary",
        example_granularity: "row_mlip_cell",
        fixture_id: "canonical-structures-v2",
        row_id: cell.row_id,
        mlip_id: cell.mlip_id,
      },
    }));
}

export function buildMlip5x5x3PhoenixPacket(
  state: Mlip5x5x3PhoenixState,
  projectName = MLIP_PHOENIX_PROJECT_NAME,
): Mlip5x5x3PhoenixExperimentPacket {
  const examples = buildMlip5x5x3DatasetExamples(state);
  const stateHypotheses = evaluateMlipStateHypotheses(state.cells);
  const variants = orderedUnique(
    state.cells.map((cell) => cell.variant_id),
    ["baseline", "distill_accuracy", "distill_accuracy_accelerate"],
  );
  const rows = orderedUnique(state.cells.map((cell) => cell.row_id), DEFAULT_ACCURACY_ROWS.map((row) => row.id));
  const mlips = orderedUnique(state.cells.map((cell) => cell.mlip_id), DEFAULT_MLIP_COLUMNS.map((mlip) => mlip.id));
  const pairedContexts = buildMlipPairContexts(state.cells);
  const experiments = variants.map((variantId) => {
    const cells = state.cells.filter((cell) => cell.variant_id === variantId);
    return {
      experiment_name: `${variantId}/${state.campaign.campaign_id}`,
      variant_id: variantId,
      campaign_id: state.campaign.campaign_id,
      summary: {
        completed: cells.filter((cell) => cell.status === "completed").length,
        mean_accuracy_score: mean(cells.map((cell) => cell.accuracy_score)),
        mean_speed_score: mean(cells.map((cell) => cell.speed_score)),
      },
      runs: cells.map((cell) => {
        const metrics = campaignCellMetrics(cell);
        const distillRuntime = recordField(metrics, "distill_runtime");
        const theoremHooks = recordField(metrics, "theorem_hooks");
        const pseudoCell = campaignCellAsBaselineRecord(cell, metrics);
        const paired = pairedContexts.get(pairKey(cell.row_id, cell.mlip_id)) ?? null;
        return {
          example_id: campaignCellExampleId(cell.row_id, cell.mlip_id),
          output: {
            status: cell.status,
            accuracy: {
              normalized_score: cell.accuracy_score,
              unit: cell.accuracy_unit,
            },
            speed: {
              warm_structures_per_second: cell.speed_score,
              unit: cell.speed_unit,
            },
            distill_runtime: distillRuntime,
            theorem_hooks: theoremHooks,
            prediction: {
              artifact_uri: stringField(metrics, "artifact_uri"),
              metrics,
            },
          },
          metadata: {
            workflow_id: "mlip-5x5x3",
            campaign_id: state.campaign.campaign_id,
            cell_id: cell.cell_id,
            row_id: cell.row_id,
            row_label: rowLabel(cell.row_id),
            mlip_id: cell.mlip_id,
            mlip_label: mlipLabel(cell.mlip_id),
            variant_id: cell.variant_id,
            fixture_url: cell.fixture_url,
            manifest_url: stringField(metrics, "manifest_url"),
            support_manifest_url: stringField(metrics, "support_manifest_url"),
            artifact_uri: stringField(metrics, "artifact_uri"),
            trace_id: stringField(metrics, "trace_id"),
            span_id: stringField(metrics, "span_id"),
            completed_at: cell.status === "completed" ? cell.updated_at : null,
            updated_at: cell.updated_at,
            ...pairedMetadata(paired),
          },
          evaluations: evaluateMlipPhoenixRun(pseudoCell, metrics, undefined, {
            variant_id: cell.variant_id,
            paired,
          }),
        };
      }),
    };
  });

  return {
    schema: "lupine.mlip.phoenix_5x5x3_packet.v1",
    phoenix: {
      project: {
        name: projectName,
        source: "PHOENIX_PROJECT_NAME",
        required: true,
      },
      dataset: {
        name: MLIP_PHOENIX_DATASET_NAME,
        version_name: `canonical-structures-v2@${state.campaign.campaign_id}`,
        description:
          "Held-out MLIP 5x5x3 dataset for comparing baseline, Lupine Distill accuracy, and Lupine Distill accuracy plus acceleration variants.",
        metadata: {
          workflow_id: "mlip-5x5x3",
          campaign_id: state.campaign.campaign_id,
          hypothesis_id: state.campaign.hypothesis_id,
        },
      },
      experiment_group: MLIP_PHOENIX_EXPERIMENT_GROUP,
      evaluator_specs: MLIP_PHOENIX_EVALUATOR_SPECS,
      server_eval_note:
        "Register the three variant experiments against one Phoenix dataset. The Worker writes deterministic experiment_evaluations and state_hypotheses immediately; Phoenix server-side dataset evaluators should mirror these specs for Playground/model-upgrade runs.",
    },
    campaign: {
      workflow_id: "mlip-5x5x3",
      campaign_id: state.campaign.campaign_id,
      hypothesis_id: state.campaign.hypothesis_id,
      status: state.campaign.status,
      variants,
      rows,
      mlips,
    },
    examples,
    experiments,
    triplet_evaluations: state.evaluations,
    state_hypotheses: stateHypotheses,
    summary: state.summary,
  };
}

export function evaluateMlipPhoenixRun(
  cell: MlipBaselineCellRecord,
  metrics: Record<string, unknown> | null = metricsForCell(cell),
  state?: Pick<MlipBaselineState, "run">,
  options: MlipPhoenixRunEvaluationOptions = {},
): MlipPhoenixEvaluationResult[] {
  const accuracyScore = cell.accuracy_score;
  const speedScore = cell.speed_score;
  const artifactPresent = Boolean(cell.artifact_uri);
  const tracePresent = Boolean(cell.trace_id);
  const variantId = options.variant_id ?? stringField(metrics, "variant_id") ?? "baseline";
  const distillRuntime = recordField(metrics, "distill_runtime");
  const theoremHooks = recordField(metrics, "theorem_hooks");
  const readiness = mlipCellReadiness(
    state ?? {
      run: {
        profile: metrics?.profile === "smoke" ? "smoke" : "lab-gcp-gpu",
        fixture_id: stringField(metrics, "fixture_id") ?? "unknown",
        manifest_url: stringField(metrics, "manifest_url") ?? cell.manifest_url ?? "unknown",
      },
    } as Pick<MlipBaselineState, "run">,
    { ...cell, metrics_json: metrics ? JSON.stringify(metrics) : cell.metrics_json },
  );
  const evaluations: MlipPhoenixEvaluationResult[] = [
    {
      evaluator_name: "mlip.accuracy.normalized_score",
      score: finiteNumber(accuracyScore) ? accuracyScore : 0,
      label:
        !finiteNumber(accuracyScore)
          ? "missing"
          : accuracyScore >= 0.8
            ? "strong"
            : accuracyScore >= 0.5
              ? "watch"
              : "weak",
      explanation: `Normalized ${cell.row_id} accuracy score for ${cell.mlip_id}.`,
      metadata: { row_id: cell.row_id, mlip_id: cell.mlip_id, accuracy_unit: cell.accuracy_unit },
    },
    {
      evaluator_name: "mlip.speed.throughput_reported",
      score: finiteNumber(speedScore) && speedScore > 0 ? 1 : 0,
      label: finiteNumber(speedScore) && speedScore > 0 ? "reported" : "missing",
      explanation: `Speed is ${finiteNumber(speedScore) ? speedScore : "not reported"} ${cell.speed_unit ?? ""}.`,
      metadata: { row_id: cell.row_id, mlip_id: cell.mlip_id, speed_unit: cell.speed_unit },
    },
    {
      evaluator_name: "mlip.evidence.artifact_present",
      score: artifactPresent ? 1 : 0,
      label: artifactPresent ? "present" : "missing",
      explanation: artifactPresent ? "GCS artifact URI is present." : "No artifact URI was recorded.",
      metadata: { artifact_uri: cell.artifact_uri },
    },
    {
      evaluator_name: "mlip.evidence.trace_present",
      score: tracePresent ? 1 : 0,
      label: tracePresent ? "present" : "missing",
      explanation: tracePresent ? "Phoenix trace id is present on the cell." : "No trace id was recorded.",
      metadata: { trace_id: cell.trace_id, span_id: cell.span_id },
    },
    {
      evaluator_name: "mlip.contract.v2_fixture_readiness",
      score: readiness.score,
      label: readiness.label,
      explanation: readiness.explanation,
      metadata: { ...readiness.metadata, row_id: cell.row_id, mlip_id: cell.mlip_id },
    },
  ];
  if (distillRuntime) {
    const leakage = recordField(distillRuntime, "leakage_guard");
    const leakagePassed = boolField(leakage, "passed");
    const interventionCount = numberField(distillRuntime, "intervention_count");
    const refusalCount = numberField(distillRuntime, "refusal_count");
    const supportModel = recordField(distillRuntime, "support_model");
    const supportCorrection = recordField(supportModel, "correction");
    const supportCandidateCorrection = recordField(supportModel, "candidate_correction");
    const supportDiagnostics = recordField(supportModel, "diagnostics");
    const correctionFields = supportCorrection ? Object.keys(supportCorrection).sort() : [];
    const candidateCorrectionFields = supportCandidateCorrection ? Object.keys(supportCandidateCorrection).sort() : [];
    const applicabilityGate = stringField(supportDiagnostics, "applicability_gate");
    const policyHash = stringField(distillRuntime, "distill_policy_hash") ?? stringField(metrics, "distill_policy_hash");
    const policyDecisions = arrayField(distillRuntime, "policy_decisions") ?? [];
    let policyLimitsId: string | null = null;
    for (const rawDecision of policyDecisions) {
      const decision = rawDecision && typeof rawDecision === "object" && !Array.isArray(rawDecision)
        ? rawDecision as Record<string, unknown>
        : null;
      const hooks = recordField(decision, "theorem_hooks");
      policyLimitsId = stringField(hooks, "policy_limits_id") ?? policyLimitsId;
      if (policyLimitsId) break;
    }
    const hasSelectedLimits = Boolean(policyHash || policyLimitsId);
    const executableFields = correctionFields.length ? correctionFields : candidateCorrectionFields;
    const correctionExecutable = executableFields.length > 0 && !applicabilityGate?.startsWith("blocked");
    evaluations.push(
      {
        evaluator_name: "distill.leakage_guard",
        score: leakagePassed === false ? 0 : 1,
        label: leakagePassed === false ? "leakage" : "clear",
        explanation: leakagePassed === false
          ? "Distill support/eval leakage guard found overlaps."
          : "No support/eval overlap is reported for this Distill run.",
        metadata: { row_id: cell.row_id, mlip_id: cell.mlip_id, leakage_guard: leakage },
      },
      {
        evaluator_name: "distill.intervention_trace",
        score: typeof interventionCount === "number" && interventionCount >= 0 ? 1 : 0,
        label: typeof interventionCount === "number" ? "present" : "missing",
        explanation: typeof interventionCount === "number"
          ? `Distill recorded ${interventionCount} interventions.`
          : "Distill intervention count is missing.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          events_uri: stringField(distillRuntime, "events_uri"),
          intervention_count: interventionCount,
        },
      },
      {
        evaluator_name: "distill.refusal_policy",
        score: typeof refusalCount === "number" ? 1 : 0,
        label: refusalCount && refusalCount > 0 ? "refused" : "observed",
        explanation: typeof refusalCount === "number"
          ? `Runtime refusal/guard count is ${refusalCount}.`
          : "Runtime refusal count is missing.",
        metadata: { row_id: cell.row_id, mlip_id: cell.mlip_id, refusal_count: refusalCount },
      },
      {
        evaluator_name: "distill.policy_limits_selected",
        score: hasSelectedLimits ? 1 : 0,
        label: hasSelectedLimits ? "selected" : "default_limits",
        explanation: hasSelectedLimits
          ? "Distill used an explicit selected policy-limits artifact or policy-limits decision id."
          : "Distill ran on the default ribbon limits; no selected hill-climb policy was recorded.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          variant_id: variantId,
          distill_policy_hash: policyHash,
          policy_limits_id: policyLimitsId,
          policy_limits_path: stringField(distillRuntime, "policy_limits_path"),
        },
      },
      {
        evaluator_name: "distill.support_correction_executable",
        score: correctionExecutable ? 1 : 0,
        label: correctionExecutable ? "executable" : executableFields.length ? "blocked" : "not_executable",
        explanation: correctionExecutable
          ? `Support fit exposed executable correction fields: ${executableFields.join(", ")}.`
          : executableFields.length
            ? `Support correction fields were present but gated by ${applicabilityGate ?? "unknown"}.`
            : "Support diagnostics did not expose an executable correction for this held-out row.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          correction_fields: correctionFields,
          candidate_correction_fields: candidateCorrectionFields,
          applicability_gate: applicabilityGate,
          diagnostics: supportDiagnostics,
        },
      },
    );
  }
  if (theoremHooks) {
    const speedup = numberField(theoremHooks, "observed_speedup");
    const bridge = stringField(theoremHooks, "bridge");
    const layerwiseExact = boolField(theoremHooks, "layerwise_exact") === true;
    evaluations.push({
      evaluator_name: "theorem.speedup_bound_observed",
      score: finiteNumber(speedup) && speedup >= 1 ? 1 : 0,
      label: finiteNumber(speedup) ? "measured" : "pending",
      explanation: finiteNumber(speedup)
        ? `Observed speedup proxy is ${speedup.toFixed(3)}x.`
        : "Theorem speedup proxy is present but not yet paired to a baseline duration.",
      metadata: {
        row_id: cell.row_id,
        mlip_id: cell.mlip_id,
        bridge: stringField(theoremHooks, "bridge"),
        kappa1_hat: numberField(theoremHooks, "kappa1_hat"),
        observed_speedup: speedup,
      },
    }, {
      evaluator_name: "theorem.lean_bridge_ready",
      score: layerwiseExact ? 1 : bridge ? 0.5 : 0,
      label: layerwiseExact ? "exact" : bridge ? "proxy" : "missing",
      explanation: layerwiseExact
        ? "The theorem bridge reports an exact layerwise hook."
        : bridge
          ? `The theorem bridge is present as ${bridge}; Lean-backed exact hooks are not yet asserted.`
          : "No theorem bridge metadata is present.",
      metadata: {
        row_id: cell.row_id,
        mlip_id: cell.mlip_id,
        bridge,
        layerwise_exact: layerwiseExact,
        ribbon_version: stringField(theoremHooks, "ribbon_version"),
      },
    });
  }
  evaluations.push(...evaluateDistillTargetEvaluations(cell, variantId, options.paired ?? null));
  return evaluations;
}

function evaluateDistillTargetEvaluations(
  cell: MlipBaselineCellRecord,
  variantId: string,
  paired: MlipPairedTargetContext | null,
): MlipPhoenixEvaluationResult[] {
  if (variantId === "baseline") return [];
  const baselineAccuracy = paired?.baseline_accuracy_score ?? null;
  const baselineSpeed = paired?.baseline_speed_score ?? null;
  const distillAccuracy = paired?.distill_accuracy_score ?? null;
  const distillSpeed = paired?.distill_speed_score ?? null;
  const candidateAccuracy = cell.accuracy_score;
  const candidateSpeed = cell.speed_score;
  const accuracyDelta = finiteNumber(candidateAccuracy) && finiteNumber(baselineAccuracy)
    ? candidateAccuracy - baselineAccuracy
    : null;
  const speedReference = finiteNumber(distillSpeed) && distillSpeed > 0
    ? distillSpeed
    : finiteNumber(baselineSpeed) && baselineSpeed > 0
      ? baselineSpeed
      : null;
  const speedRatio = finiteNumber(candidateSpeed) && finiteNumber(speedReference) && speedReference > 0
    ? candidateSpeed / speedReference
    : null;
  const distillAccuracyDelta = finiteNumber(distillAccuracy) && finiteNumber(baselineAccuracy)
    ? distillAccuracy - baselineAccuracy
    : null;
  const accuracyPreservedAgainstDistill = finiteNumber(candidateAccuracy) && finiteNumber(distillAccuracy)
    ? candidateAccuracy >= distillAccuracy - 0.02
    : null;
  const accuracyLabel = !finiteNumber(accuracyDelta)
    ? "pending"
    : accuracyDelta > 0
      ? "accuracy_win"
      : accuracyDelta === 0
        ? "neutral"
        : "regression";
  const out: MlipPhoenixEvaluationResult[] = [
    {
      evaluator_name: "distill.accuracy_delta",
      score: finiteNumber(accuracyDelta) && accuracyDelta > 0 ? 1 : 0,
      label: accuracyLabel,
      explanation: finiteNumber(accuracyDelta)
        ? `Paired accuracy delta versus baseline is ${accuracyDelta.toFixed(4)}.`
        : "Baseline and candidate accuracy are not both available yet.",
      metadata: {
        row_id: cell.row_id,
        mlip_id: cell.mlip_id,
        variant_id: variantId,
        baseline_accuracy_score: baselineAccuracy,
        candidate_accuracy_score: candidateAccuracy,
        accuracy_delta: accuracyDelta,
      },
    },
  ];
  if (variantId === "distill_accuracy") {
    out.push({
      evaluator_name: "mlip.gate.distill_accuracy_win",
      score: finiteNumber(accuracyDelta) && accuracyDelta > 0 ? 1 : 0,
      label: accuracyLabel,
      explanation: finiteNumber(accuracyDelta)
        ? `Distill Accuracy changed normalized score by ${accuracyDelta.toFixed(4)} against baseline.`
        : "Distill Accuracy cannot be gated until the paired baseline is complete.",
      metadata: {
        row_id: cell.row_id,
        mlip_id: cell.mlip_id,
        baseline_accuracy_score: baselineAccuracy,
        distill_accuracy_score: candidateAccuracy,
        accuracy_delta: accuracyDelta,
      },
    });
    if (cell.row_id === MLIP_STATE_ANCHOR_ROW) {
      out.push({
        evaluator_name: "distill.state_surface_anchor",
        score: finiteNumber(accuracyDelta) && accuracyDelta > 0 ? 1 : 0,
        label: finiteNumber(accuracyDelta) && accuracyDelta > 0
          ? "state_anchor_win"
          : finiteNumber(accuracyDelta)
            ? "state_anchor_hold"
            : "pending",
        explanation: finiteNumber(accuracyDelta)
          ? `Distill changed the energy/free-energy state anchor by ${accuracyDelta.toFixed(4)}.`
          : "The state anchor cannot be scored until the paired baseline is complete.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          baseline_accuracy_score: baselineAccuracy,
          distill_accuracy_score: candidateAccuracy,
          accuracy_delta: accuracyDelta,
        },
      });
    }
    if ((MLIP_STATE_DOWNSTREAM_ROWS as readonly string[]).includes(cell.row_id)) {
      const downstreamNoHarm = finiteNumber(accuracyDelta) ? accuracyDelta >= -0.0005 : false;
      out.push({
        evaluator_name: "distill.downstream_no_harm",
        score: downstreamNoHarm ? 1 : 0,
        label: !finiteNumber(accuracyDelta)
          ? "pending"
          : downstreamNoHarm
            ? accuracyDelta > 0
              ? "downstream_lift"
              : "downstream_no_harm"
            : "downstream_regression",
        explanation: finiteNumber(accuracyDelta)
          ? `Downstream row changed by ${accuracyDelta.toFixed(4)} against baseline.`
          : "Downstream no-harm cannot be scored until the paired baseline is complete.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          baseline_accuracy_score: baselineAccuracy,
          distill_accuracy_score: candidateAccuracy,
          accuracy_delta: accuracyDelta,
          no_harm_tolerance: 0.0005,
        },
      });
    }
  }
  if (variantId === "distill_accuracy_accelerate") {
    const speedLabel = !finiteNumber(speedRatio)
      ? "pending"
      : speedRatio >= 1.1
        ? "speed_win"
        : speedRatio >= 1
          ? "flat"
          : "slower";
    const accelGate = accuracyPreservedAgainstDistill === true && finiteNumber(speedRatio) && speedRatio >= 1.1;
    const promotionGate = finiteNumber(distillAccuracyDelta)
      && distillAccuracyDelta > 0
      && accuracyPreservedAgainstDistill === true
      && finiteNumber(speedRatio)
      && speedRatio >= 1.1;
    out.push(
      {
        evaluator_name: "distill.speed_delta",
        score: finiteNumber(speedRatio) && speedRatio >= 1.1 ? 1 : 0,
        label: speedLabel,
        explanation: finiteNumber(speedRatio)
          ? `Acceleration speed ratio against ${finiteNumber(distillSpeed) ? "Distill Accuracy" : "baseline"} is ${speedRatio.toFixed(3)}x.`
          : "Acceleration speed cannot be scored until paired speed values are available.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          baseline_speed_score: baselineSpeed,
          distill_speed_score: distillSpeed,
          candidate_speed_score: candidateSpeed,
          speed_ratio: speedRatio,
        },
      },
      {
        evaluator_name: "mlip.gate.accelerate_accuracy_speed_win",
        score: accelGate ? 1 : 0,
        label: accelGate ? "accuracy_and_speed_win" : "hold",
        explanation: accelGate
          ? "Distill+Accelerate preserved Distill Accuracy within 0.02 normalized score and improved speed by at least 1.10x."
          : "Distill+Accelerate has not yet cleared both the accuracy-preservation and speed-lift gates.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          distill_accuracy_score: distillAccuracy,
          candidate_accuracy_score: candidateAccuracy,
          accuracy_preserved_against_distill: accuracyPreservedAgainstDistill,
          speed_ratio: speedRatio,
        },
      },
      {
        evaluator_name: "distill.target.v2_promotion_gate",
        score: promotionGate ? 1 : 0,
        label: promotionGate ? "v2_candidate" : "hold",
        explanation: promotionGate
          ? "This paired triplet clears the V2 ribbon promotion target."
          : "This paired triplet does not yet justify promotion of a new Distill ribbon.",
        metadata: {
          row_id: cell.row_id,
          mlip_id: cell.mlip_id,
          baseline_accuracy_score: baselineAccuracy,
          distill_accuracy_score: distillAccuracy,
          accelerate_accuracy_score: candidateAccuracy,
          distill_accuracy_delta: distillAccuracyDelta,
          accelerate_accuracy_delta: accuracyDelta,
          accuracy_preserved_against_distill: accuracyPreservedAgainstDistill,
          speed_ratio: speedRatio,
        },
      },
    );
  }
  return out;
}

export function buildMlipPhoenixExperimentPacket(
  state: MlipBaselineState,
  projectName = MLIP_PHOENIX_PROJECT_NAME,
): MlipPhoenixExperimentPacket {
  const examples = buildMlipPhoenixDatasetExamples(state);
  const experiments: MlipPhoenixExperiment[] = [{
    experiment_name: `baseline/${state.run.run_id}`,
    variant_id: "baseline",
    run_id: state.run.run_id,
    summary: {
      completed: state.cells.filter((cell) => cell.status === "completed").length,
      mean_accuracy_score: mean(state.cells.map((cell) => cell.accuracy_score)),
      mean_speed_score: mean(state.cells.map((cell) => cell.speed_score)),
    },
    runs: state.cells.map((cell) => {
      const metrics = metricsForCell(cell);
      const versions = versionsForMetrics(metrics);
      return {
        example_id: cellExampleId(state.run.fixture_id, cell.row_id, cell.mlip_id),
        output: {
          status: cell.status,
          accuracy: {
            normalized_score: cell.accuracy_score,
            unit: cell.accuracy_unit,
            mean_relative_error: numberField(recordField(metrics, "accuracy"), "mean_relative_error"),
          },
          speed: {
            warm_structures_per_second: cell.speed_score,
            cold_total_seconds: durationSeconds(metrics),
            unit: cell.speed_unit,
          },
          prediction: {
            artifact_uri: cell.artifact_uri,
            metrics,
          },
        },
        metadata: {
          workflow_id: "mlip-baseline-grid",
          run_id: state.run.run_id,
          cell_id: cell.cell_id,
          row_id: cell.row_id,
          row_label: rowLabel(cell.row_id),
          mlip_id: cell.mlip_id,
          mlip_label: mlipLabel(cell.mlip_id),
          variant_id: "baseline",
          target_job: cell.target_job,
          trace_id: cell.trace_id,
          span_id: cell.span_id,
          task_name: cell.task_name,
          operation_name: cell.operation_name,
          retry_count: cell.retry_count,
          n_structures: nStructures(metrics),
          fixture_id: state.run.fixture_id,
          manifest_url: state.run.manifest_url,
          artifact_uri: cell.artifact_uri,
          torch: stringField(versions, "torch"),
          cuda_available: boolField(versions, "cuda_available"),
          cuda_device: stringField(versions, "cuda_device"),
          completed_at: cell.completed_at,
          updated_at: cell.updated_at,
        },
        evaluations: evaluateMlipPhoenixRun(cell, metrics, state),
      };
    }),
  }];

  const releaseGate = mlipBaselineReleaseGate(state);

  return {
    schema: "lupine.mlip.phoenix_experiment_packet.v1",
    phoenix: {
      project: {
        name: projectName,
        source: "PHOENIX_PROJECT_NAME",
        required: true,
      },
      dataset: {
        name: MLIP_PHOENIX_DATASET_NAME,
        version_name: `${state.run.fixture_id}@${state.run.run_id}`,
        description:
          "Held-out MLIP improvement dataset. V2 expands these cell summaries into physical examples so Phoenix can compare baseline, Distill accuracy, and Distill+Accelerate experiments over time.",
        metadata: {
          workflow_id: "mlip-baseline-grid",
          fixture_id: state.run.fixture_id,
          manifest_url: state.run.manifest_url,
          source_run_id: state.run.run_id,
        },
      },
      experiment_group: MLIP_PHOENIX_EXPERIMENT_GROUP,
      evaluator_specs: MLIP_PHOENIX_EVALUATOR_SPECS,
      server_eval_note:
        "The Worker writes deterministic experiment_evaluations for the baseline run. Attach matching Phoenix dataset evaluators with these JSONPath mappings when running Playground/server-side comparisons.",
    },
    campaign: {
      workflow_id: "mlip-baseline-grid",
      run_id: state.run.run_id,
      variant_id: "baseline",
      profile: state.run.profile,
      fixture_id: state.run.fixture_id,
      manifest_url: state.run.manifest_url,
      artifact_prefix: state.run.artifact_prefix,
      status: state.run.status,
    },
    examples,
    experiments,
    release_gate: {
      ready_for_research_release: releaseGate.ready,
      label: releaseGate.label,
      blockers: releaseGate.blockers,
    },
  };
}

export async function syncMlipPhoenixPacket(
  env: Env,
  packet: MlipPhoenixPacket,
  opts: { reuse_experiments?: boolean } = {},
): Promise<MlipPhoenixSyncResult> {
  const endpoint = env.PHOENIX_COLLECTOR_ENDPOINT?.trim().replace(/^['"]|['"]$/g, "");
  const apiKey = env.PHOENIX_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!endpoint || !apiKey) {
    throw new Error("PHOENIX_COLLECTOR_ENDPOINT and PHOENIX_API_KEY are required for Phoenix dataset sync");
  }

  const project = phoenixProjectName(env);
  const packetProject = packet.phoenix.project.name;
  if (packetProject !== project) {
    throw new Error(`Phoenix project mismatch: packet targets '${packetProject}' but Worker is configured for '${project}'`);
  }

  const phoenix = new PhoenixApi(endpoint, apiKey, project);
  const uploadExamples = buildPhoenixUploadExamples(packet);
  const upload = await phoenix.uploadDataset({
    name: packet.phoenix.dataset.name,
    description: packet.phoenix.dataset.description,
    examples: uploadExamples,
    action: "create",
  });
  let datasetId = upload.dataset_id;
  if (!datasetId) {
    datasetId = (await phoenix.listDatasets({ name: packet.phoenix.dataset.name })).data[0]?.id ?? "";
  }
  if (!datasetId) throw new Error(`Phoenix dataset '${packet.phoenix.dataset.name}' did not return a dataset_id`);

  const resolvedExamples = await phoenix.getDatasetExamples(datasetId, Math.max(uploadExamples.length, 100));
  const exampleIds = resolvePhoenixDatasetExampleIds(resolvedExamples);
  const warnings: string[] = [];
  const experimentResults: MlipPhoenixSyncResult["experiments"] = [];

  for (const experiment of packet.experiments as Array<{
    experiment_name: string;
    variant_id: string;
    summary: Record<string, unknown>;
    runs: MlipPhoenixExperimentRun[];
  }>) {
    const created = await phoenix.createExperiment({
      datasetId,
      name: experiment.experiment_name,
      description: `${packet.phoenix.experiment_group} ${experiment.variant_id} experiment`,
      metadata: {
        workflow_schema: packet.schema,
        experiment_group: packet.phoenix.experiment_group,
        phoenix_project_name: project,
        dataset_name: packet.phoenix.dataset.name,
        dataset_version_name: packet.phoenix.dataset.version_name,
        evaluator_specs: packet.phoenix.evaluator_specs.map((spec) => spec.name),
        variant_id: experiment.variant_id,
        summary: experiment.summary,
        campaign: packet.campaign,
      },
      versionId: upload.version_id || null,
      reuseIfExists: opts.reuse_experiments ?? true,
    });

    const experimentMetadataProject = stringField(created.metadata, "phoenix_project_name");
    const projectMatch = created.project_name
      ? created.project_name === project
      : null;
    const metadataProjectMatch = experimentMetadataProject
      ? experimentMetadataProject === project
      : null;
    if (projectMatch === false) {
      warnings.push(
        `Experiment '${experiment.experiment_name}' returned Phoenix project_name '${created.project_name}' instead of '${project}'`,
      );
    }
    if (metadataProjectMatch === false) {
      warnings.push(
        `Experiment '${experiment.experiment_name}' is missing canonical Phoenix project metadata '${project}'`,
      );
    }

    let runsWritten = 0;
    let runsSkipped = 0;
    let evaluationsWritten = 0;
    let evaluationsExpected = 0;
    const evaluationNamesWritten = new Set<string>();
    for (const run of experiment.runs) {
      evaluationsExpected += run.evaluations.length;
      const datasetExampleId = exampleIds.get(run.example_id);
      if (!datasetExampleId) {
        warnings.push(`No Phoenix dataset example resolved for ${run.example_id}`);
        runsSkipped += 1;
        continue;
      }
      const timestamps = runTimestamps(run);
      let runId = "";
      try {
        runId = (await phoenix.createExperimentRun(created.id, {
          dataset_example_id: datasetExampleId,
          output: run.output,
          start_time: timestamps.start,
          end_time: timestamps.end,
          trace_id: stringField(run.metadata, "trace_id"),
          error: typeof run.output.error === "string" ? run.output.error : null,
        })).id;
        runsWritten += 1;
      } catch (e) {
        if (String(e).includes(": 409 ")) {
          runsSkipped += 1;
          continue;
        }
        throw e;
      }
      for (const evaluation of run.evaluations) {
        await phoenix.upsertExperimentEvaluation({
          experiment_run_id: runId,
          name: evaluation.evaluator_name,
          start_time: timestamps.end,
          end_time: timestamps.end,
          trace_id: stringField(run.metadata, "trace_id"),
          result: {
            score: evaluation.score,
            label: evaluation.label,
            explanation: evaluation.explanation,
          },
          metadata: {
            ...evaluation.metadata,
            phoenix_project_name: project,
            dataset_name: packet.phoenix.dataset.name,
            dataset_example_id: run.example_id,
            variant_id: experiment.variant_id,
          },
        });
        evaluationsWritten += 1;
        evaluationNamesWritten.add(evaluation.evaluator_name);
      }
    }

    experimentResults.push({
      name: experiment.experiment_name,
      id: created.id,
      variant_id: experiment.variant_id,
      reused: created.reused,
      project_name: created.project_name ?? null,
      project_match: projectMatch,
      metadata_project_match: metadataProjectMatch,
      runs_written: runsWritten,
      runs_skipped: runsSkipped,
      evaluations_expected: evaluationsExpected,
      evaluations_written: evaluationsWritten,
      evaluation_names_written: [...evaluationNamesWritten].sort(),
    });
  }

  return {
    schema: "lupine.mlip.phoenix_sync_result.v1",
    project: {
      name: project,
      packet_project_name: packetProject,
      verified: warnings.every((warning) => !warning.includes("Phoenix project")),
    },
    dataset: {
      name: packet.phoenix.dataset.name,
      id: datasetId,
      version_id: upload.version_id || null,
      upload_action: upload.action,
      examples_submitted: uploadExamples.length,
      examples_resolved: exampleIds.size,
    },
    experiments: experimentResults,
    evaluator_specs: packet.phoenix.evaluator_specs.map((spec) => spec.name),
    warnings,
  };
}

function buildPhoenixUploadExamples(packet: MlipPhoenixPacket): PhoenixDatasetUploadExample[] {
  return packet.examples.map((example) => ({
    example_id: example.example_id,
    input: example.input,
    output: example.reference,
    metadata: {
      ...example.metadata,
      phoenix_project_name: packet.phoenix.project.name,
      dataset_name: packet.phoenix.dataset.name,
      dataset_version_name: packet.phoenix.dataset.version_name,
      evaluator_specs: packet.phoenix.evaluator_specs.map((spec) => spec.name),
    },
    split: typeof example.metadata.split === "string" ? example.metadata.split : "heldout",
  }));
}

function resolvePhoenixDatasetExampleIds(
  examples: Array<{ id: string; input: unknown; metadata: Record<string, unknown> }>,
): Map<string, string> {
  const resolved = new Map<string, string>();
  for (const example of examples) {
    const input = recordField({ input: example.input }, "input");
    const metadataExampleId = stringField(example.metadata, "example_id");
    const inputExampleId = stringField(input, "example_id");
    for (const candidate of [metadataExampleId, inputExampleId, example.id]) {
      if (candidate && !resolved.has(candidate)) resolved.set(candidate, example.id);
    }
  }
  return resolved;
}

function runTimestamps(run: MlipPhoenixExperimentRun): { start: string; end: string } {
  const completed = stringField(run.metadata, "completed_at");
  const updated = stringField(run.metadata, "updated_at");
  const end = completed ?? updated ?? new Date().toISOString();
  return { start: end, end };
}

export async function annotateMlipBaselineCellForPhoenix(
  env: Env,
  input: MlipBaselineCellResultInput,
  traceId: string,
  spanId: string | null,
  status: string,
): Promise<void> {
  const endpoint = env.PHOENIX_COLLECTOR_ENDPOINT?.trim().replace(/^['"]|['"]$/g, "");
  const apiKey = env.PHOENIX_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!endpoint || !apiKey || !traceId || traceId === "mlip-baseline-no-trace") return;
  const metrics = input.metrics ?? {};
  const pseudoCell: MlipBaselineCellRecord = {
    cell_id: input.cell_id,
    run_id: input.run_id,
    row_id: input.row_id ?? "",
    mlip_id: input.mlip_id ?? "",
    status: status as MlipBaselineCellRecord["status"],
    target_job: null,
    manifest_url: typeof metrics.manifest_url === "string" ? metrics.manifest_url : null,
    task_name: null,
    operation_name: input.operation_name ?? null,
    accuracy_score: input.accuracy_score ?? null,
    accuracy_unit: input.accuracy_unit ?? null,
    speed_score: input.speed_score ?? null,
    speed_unit: input.speed_unit ?? null,
    metrics_json: JSON.stringify(metrics),
    artifact_uri: input.artifact_uri ?? null,
    trace_id: traceId,
    span_id: spanId,
    retry_count: 0,
    error: input.error ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    enqueued_at: null,
    completed_at: new Date().toISOString(),
  };
  const project = phoenixProjectName(env);
  const phoenix = new PhoenixApi(endpoint, apiKey, project);
  const annotations: TraceAnnotation[] = evaluateMlipPhoenixRun(pseudoCell, metrics).map((evaluation) => ({
    trace_id: traceId,
    name: evaluation.evaluator_name,
    annotator_kind: "CODE",
    result: {
      score: evaluation.score,
      label: evaluation.label,
      explanation: evaluation.explanation,
    },
    identifier: input.cell_id,
    metadata: evaluation.metadata,
  }));
  await phoenix.annotateTraces(annotations);
}
