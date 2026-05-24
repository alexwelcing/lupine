import type { MlipBaselineCellRecord, MlipBaselineProfile, MlipBaselineState } from "./mlipBaselineGrid";

export const MLIP_BASELINE_RELEASE_FIXTURE_ID = "canonical-structures-v2";
export const MLIP_BASELINE_RELEASE_SCHEMA = "lupine.mlip.fixture_manifest.v2";

const ROW_MIN_CASES: Record<string, number> = {
  elastic_constants: 6,
  energy_volume: 5,
  forces: 5,
  stress: 5,
  relaxation_stability: 3,
};

export interface MlipFixtureTargetReadiness {
  release_candidate: boolean;
  label: "smoke" | "legacy_v1" | "release_candidate" | "unknown";
  blockers: string[];
}

export interface MlipCellReadiness {
  score: 0 | 1;
  label: "v2_ready" | "needs_v2_fixture";
  explanation: string;
  metadata: Record<string, unknown>;
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
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringField(record: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function boolField(record: Record<string, unknown> | null | undefined, key: string): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

export function classifyMlipFixtureTarget(
  profile: MlipBaselineProfile,
  fixtureId: string,
  manifestUrl: string,
): MlipFixtureTargetReadiness {
  const id = fixtureId.toLowerCase();
  const url = manifestUrl.toLowerCase();
  const blockers: string[] = [];
  if (profile === "smoke" || id.includes("smoke") || url.includes("tiny")) {
    blockers.push("smoke fixtures are pipeline checks, not release baselines");
    return { release_candidate: false, label: "smoke", blockers };
  }
  if (id.endsWith("-v1") || url.includes("canonical-structures-v1")) {
    blockers.push("canonical-structures-v1 is legacy smoke-grade data");
    return { release_candidate: false, label: "legacy_v1", blockers };
  }
  if (id.endsWith("-v2") || url.includes("-v2/") || url.includes("canonical-structures-v2")) {
    return { release_candidate: true, label: "release_candidate", blockers };
  }
  blockers.push("fixture must advertise a V2 release contract through fixture_id, manifest_url, or manifest metrics");
  return { release_candidate: false, label: "unknown", blockers };
}

export function mlipCellReadiness(
  state: Pick<MlipBaselineState, "run">,
  cell: MlipBaselineCellRecord,
): MlipCellReadiness {
  const metrics = parseJsonObject(cell.metrics_json);
  const contract = recordField(metrics, "fixture_contract");
  const rowMetrics = recordField(metrics, "row_metrics") ?? recordField(metrics, "accuracy");
  const target = classifyMlipFixtureTarget(state.run.profile, state.run.fixture_id, state.run.manifest_url);
  const blockers = [...target.blockers];
  const schema = stringField(contract, "schema");
  const releaseReady = boolField(contract, "release_ready");
  const nStructures = numberField(metrics, "n_structures") ?? 0;
  const minCases = ROW_MIN_CASES[cell.row_id] ?? 1;
  const primaryMetric = stringField(rowMetrics, "primary_metric");

  if (schema && schema !== MLIP_BASELINE_RELEASE_SCHEMA) {
    blockers.push(`manifest schema ${schema} is not ${MLIP_BASELINE_RELEASE_SCHEMA}`);
  }
  if (releaseReady === false) {
    blockers.push("runner manifest validation reported release_ready=false");
  }
  if (nStructures < minCases) {
    blockers.push(`${cell.row_id} needs at least ${minCases} physical cases; saw ${nStructures}`);
  }
  if (!primaryMetric || cell.accuracy_unit === "reference_relative_error_score") {
    blockers.push("cell did not report a row-native physical metric");
  }

  const ready = cell.status === "completed" && target.release_candidate && blockers.length === 0;
  return {
    score: ready ? 1 : 0,
    label: ready ? "v2_ready" : "needs_v2_fixture",
    explanation: ready
      ? "The cell is backed by a V2 release fixture and row-native physical metrics."
      : blockers.join("; ") || "Cell is not completed with release-grade fixture evidence.",
    metadata: {
      fixture_id: state.run.fixture_id,
      manifest_url: state.run.manifest_url,
      fixture_target: target.label,
      manifest_schema: schema ?? null,
      manifest_hash: contract?.manifest_hash ?? null,
      n_structures: nStructures,
      min_cases: minCases,
      primary_metric: primaryMetric,
      blockers,
    },
  };
}

export function mlipBaselineReleaseGate(state: MlipBaselineState): {
  ready: boolean;
  label: "release_ready" | "needs_canonical_v2_fixture" | "incomplete";
  blockers: string[];
} {
  const blockers: string[] = [];
  const target = classifyMlipFixtureTarget(state.run.profile, state.run.fixture_id, state.run.manifest_url);
  blockers.push(...target.blockers);
  if (state.summary.cells_completed !== state.summary.cells_total) {
    blockers.push("Campaign is not complete.");
  }
  const unready = state.cells
    .map((cell) => ({ cell, readiness: mlipCellReadiness(state, cell) }))
    .filter((item) => item.readiness.score < 1);
  if (unready.length > 0) {
    blockers.push(`${unready.length} cells are missing V2 fixture or row-native metric evidence.`);
  }
  return {
    ready: blockers.length === 0,
    label: blockers.length === 0
      ? "release_ready"
      : state.summary.cells_completed !== state.summary.cells_total
        ? "incomplete"
        : "needs_canonical_v2_fixture",
    blockers,
  };
}
