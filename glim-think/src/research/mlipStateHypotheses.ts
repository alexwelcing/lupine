import type { MlipCampaignCell } from "./mlipCampaign";

export const MLIP_STATE_HYPOTHESIS_ID = "distill.state_surface_lifts_downstream";
export const MLIP_STATE_ANCHOR_ROW = "energy_volume";
export const MLIP_STATE_DOWNSTREAM_ROWS = [
  "forces",
  "stress",
  "elastic_constants",
  "relaxation_stability",
] as const;

export type MlipStateHypothesisScope = "campaign" | "mlip";
export type MlipStateHypothesisVerdict = "confirmed" | "testing" | "refuted" | "insufficient_data";
export type MlipStateRowDeltaLabel = "win" | "no_harm" | "regression" | "missing";

export interface MlipStateRowDelta {
  row_id: string;
  baseline_accuracy_score: number | null;
  distill_accuracy_score: number | null;
  accuracy_delta: number | null;
  label: MlipStateRowDeltaLabel;
}

export interface MlipStateHypothesisEvaluation {
  schema: "lupine.mlip.state_hypothesis_evaluation.v1";
  hypothesis_id: typeof MLIP_STATE_HYPOTHESIS_ID;
  scope: MlipStateHypothesisScope;
  mlip_id?: string;
  hypothesis_motivation: {
    anchor_row_id: typeof MLIP_STATE_ANCHOR_ROW;
    premise: string;
    downstream_rows: string[];
  };
  verdict: MlipStateHypothesisVerdict;
  score: number;
  explanation: string;
  energy_anchor: MlipStateRowDelta;
  downstream: MlipStateRowDelta[];
  blockers: string[];
  next_actions: string[];
}

interface MlipStateHypothesisOptions {
  min_delta?: number;
  no_harm_tolerance?: number;
  require_all_downstream_rows?: boolean;
}

interface PairBucket {
  baseline?: MlipCampaignCell;
  distill?: MlipCampaignCell;
}

const MISSING_ANCHOR: MlipStateRowDelta = {
  row_id: MLIP_STATE_ANCHOR_ROW,
  baseline_accuracy_score: null,
  distill_accuracy_score: null,
  accuracy_delta: null,
  label: "missing",
};

const HYPOTHESIS_MOTIVATION: MlipStateHypothesisEvaluation["hypothesis_motivation"] = {
  anchor_row_id: MLIP_STATE_ANCHOR_ROW,
  premise:
    "Distill must first improve the energy/free-energy lattice state; forces, stress, elastic constants, and relaxation are downstream falsifiers of that state correction.",
  downstream_rows: [...MLIP_STATE_DOWNSTREAM_ROWS],
};

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pairKey(mlipId: string, rowId: string): string {
  return `${mlipId}::${rowId}`;
}

function rowDelta(
  rowId: string,
  bucket: PairBucket | undefined,
  minDelta: number,
  noHarmTolerance: number,
): MlipStateRowDelta {
  const baseline = bucket?.baseline?.status === "completed" ? bucket.baseline.accuracy_score : null;
  const distill = bucket?.distill?.status === "completed" ? bucket.distill.accuracy_score : null;
  const delta = finiteNumber(baseline) && finiteNumber(distill) ? distill - baseline : null;
  const label: MlipStateRowDeltaLabel = !finiteNumber(delta)
    ? "missing"
    : delta > minDelta
      ? "win"
      : delta >= -noHarmTolerance
        ? "no_harm"
        : "regression";
  return {
    row_id: rowId,
    baseline_accuracy_score: finiteNumber(baseline) ? baseline : null,
    distill_accuracy_score: finiteNumber(distill) ? distill : null,
    accuracy_delta: finiteNumber(delta) ? delta : null,
    label,
  };
}

function buildPairBuckets(cells: MlipCampaignCell[]): Map<string, PairBucket> {
  const buckets = new Map<string, PairBucket>();
  for (const cell of cells) {
    if (cell.variant_id !== "baseline" && cell.variant_id !== "distill_accuracy") continue;
    const key = pairKey(cell.mlip_id, cell.row_id);
    const bucket = buckets.get(key) ?? {};
    if (cell.variant_id === "baseline") bucket.baseline = cell;
    if (cell.variant_id === "distill_accuracy") bucket.distill = cell;
    buckets.set(key, bucket);
  }
  return buckets;
}

function hypothesisExplanation(
  mlipId: string,
  energy: MlipStateRowDelta,
  downstream: MlipStateRowDelta[],
  verdict: MlipStateHypothesisVerdict,
): string {
  const energyDelta = finiteNumber(energy.accuracy_delta) ? energy.accuracy_delta.toFixed(4) : "missing";
  const wins = downstream.filter((row) => row.label === "win").length;
  const noHarm = downstream.filter((row) => row.label === "win" || row.label === "no_harm").length;
  const regressions = downstream.filter((row) => row.label === "regression").map((row) => row.row_id);
  if (verdict === "confirmed") {
    return `${mlipId} improved the energy-volume anchor by ${energyDelta} and lifted every available downstream lattice observable.`;
  }
  if (verdict === "refuted") {
    return `${mlipId} improved or attempted the energy-volume anchor, but downstream regressions appeared in ${regressions.join(", ")}.`;
  }
  if (verdict === "insufficient_data") {
    return `${mlipId} does not yet have paired baseline and Distill Accuracy evidence for the energy anchor plus downstream rows.`;
  }
  return `${mlipId} is still testing: energy delta ${energyDelta}, downstream wins ${wins}/${downstream.length}, no-harm rows ${noHarm}/${downstream.length}.`;
}

function evaluateOneMlip(
  mlipId: string,
  buckets: Map<string, PairBucket>,
  options: Required<MlipStateHypothesisOptions>,
): MlipStateHypothesisEvaluation {
  const energy = rowDelta(
    MLIP_STATE_ANCHOR_ROW,
    buckets.get(pairKey(mlipId, MLIP_STATE_ANCHOR_ROW)),
    options.min_delta,
    options.no_harm_tolerance,
  );
  const downstream = MLIP_STATE_DOWNSTREAM_ROWS.map((rowId) =>
    rowDelta(rowId, buckets.get(pairKey(mlipId, rowId)), options.min_delta, options.no_harm_tolerance));
  const presentDownstream = downstream.filter((row) => row.label !== "missing");
  const regressions = presentDownstream.filter((row) => row.label === "regression");
  const downstreamWins = presentDownstream.filter((row) => row.label === "win");
  const downstreamNoHarm = presentDownstream.filter((row) => row.label === "win" || row.label === "no_harm");
  const anchorWin = energy.label === "win";
  const attemptedAnchor = energy.label !== "missing";
  const expectedDownstream = options.require_all_downstream_rows
    ? MLIP_STATE_DOWNSTREAM_ROWS.length
    : Math.max(1, presentDownstream.length);
  let verdict: MlipStateHypothesisVerdict;
  if (energy.label === "missing" || presentDownstream.length === 0) {
    verdict = "insufficient_data";
  } else if ((anchorWin || attemptedAnchor) && regressions.length > 0) {
    verdict = "refuted";
  } else if (anchorWin && downstreamWins.length >= expectedDownstream && presentDownstream.length >= expectedDownstream) {
    verdict = "confirmed";
  } else {
    verdict = "testing";
  }

  const downstreamRowCount: number = MLIP_STATE_DOWNSTREAM_ROWS.length;
  const supportFraction = downstreamNoHarm.length / downstreamRowCount;
  const score = verdict === "refuted"
    ? 0
    : Math.min(1, Math.max(0, (anchorWin ? 0.4 : 0) + supportFraction * 0.6));
  const blockers = [
    ...(energy.label === "missing" ? ["missing_energy_volume_anchor"] : []),
    ...downstream.filter((row) => row.label === "missing").map((row) => `missing_${row.row_id}`),
    ...regressions.map((row) => `downstream_regression_${row.row_id}`),
    ...(!anchorWin && energy.label !== "missing" ? ["energy_anchor_not_improved"] : []),
  ];
  const nextActions = verdict === "refuted"
    ? [
      "revise_ribbon_support_selection",
      "inspect_energy_stress_force_consistency",
      "run_local_distill_growth_loop",
    ]
    : verdict === "testing" || verdict === "insufficient_data"
      ? [
        "complete_baseline_distill_pairs",
        "run_energy_anchor_before_downstream_claim",
      ]
      : ["promote_state_coupled_result_to_report"];

  return {
    schema: "lupine.mlip.state_hypothesis_evaluation.v1",
    hypothesis_id: MLIP_STATE_HYPOTHESIS_ID,
    scope: "mlip",
    mlip_id: mlipId,
    hypothesis_motivation: HYPOTHESIS_MOTIVATION,
    verdict,
    score,
    explanation: hypothesisExplanation(mlipId, energy, downstream, verdict),
    energy_anchor: energy,
    downstream,
    blockers,
    next_actions: nextActions,
  };
}

function aggregateCampaign(evaluations: MlipStateHypothesisEvaluation[]): MlipStateHypothesisEvaluation {
  const refuted = evaluations.filter((evaluation) => evaluation.verdict === "refuted");
  const confirmed = evaluations.filter((evaluation) => evaluation.verdict === "confirmed");
  const informative = evaluations.filter((evaluation) => evaluation.verdict !== "insufficient_data");
  const verdict: MlipStateHypothesisVerdict = evaluations.length === 0 || informative.length === 0
    ? "insufficient_data"
    : refuted.length > 0
      ? "refuted"
      : confirmed.length === evaluations.length
        ? "confirmed"
        : "testing";
  const score = evaluations.length === 0
    ? 0
    : evaluations.reduce((acc, evaluation) => acc + evaluation.score, 0) / evaluations.length;
  const blockers = Array.from(new Set(evaluations.flatMap((evaluation) =>
    evaluation.blockers.map((blocker) => evaluation.mlip_id ? `${evaluation.mlip_id}:${blocker}` : blocker))));
  const nextActions = verdict === "refuted"
    ? ["revise_state_surface_hypothesis", "queue_support_manifest_revision"]
    : verdict === "confirmed"
      ? ["sync_phoenix_state_hypothesis", "publish_state_lift_evidence"]
      : ["complete_campaign_pairs", "keep_state_hypothesis_in_testing"];

  return {
    schema: "lupine.mlip.state_hypothesis_evaluation.v1",
    hypothesis_id: MLIP_STATE_HYPOTHESIS_ID,
    scope: "campaign",
    hypothesis_motivation: HYPOTHESIS_MOTIVATION,
    verdict,
    score,
    explanation: verdict === "confirmed"
      ? "Every MLIP with paired evidence shows an energy-volume anchor win and downstream lattice lift."
      : verdict === "refuted"
        ? "At least one MLIP contradicts the state-coupled lift hypothesis with a downstream regression."
        : verdict === "insufficient_data"
          ? "The campaign does not yet have enough paired baseline and Distill Accuracy cells to test the state-coupled lift hypothesis."
          : "The campaign has partial support for the state-coupled lift hypothesis but still needs broader downstream wins.",
    energy_anchor: MISSING_ANCHOR,
    downstream: [],
    blockers,
    next_actions: nextActions,
  };
}

export function evaluateMlipStateHypotheses(
  cells: MlipCampaignCell[],
  options: MlipStateHypothesisOptions = {},
): MlipStateHypothesisEvaluation[] {
  const resolvedOptions: Required<MlipStateHypothesisOptions> = {
    min_delta: options.min_delta ?? 0,
    no_harm_tolerance: options.no_harm_tolerance ?? 0.0005,
    require_all_downstream_rows: options.require_all_downstream_rows ?? true,
  };
  const buckets = buildPairBuckets(cells);
  const mlipIds = Array.from(new Set(cells.map((cell) => cell.mlip_id))).sort();
  const evaluations = mlipIds.map((mlipId) => evaluateOneMlip(mlipId, buckets, resolvedOptions));
  return [aggregateCampaign(evaluations), ...evaluations];
}
