import type { Env, BenchmarkRecord } from "../types";
import {
  benchmarkAbsError,
  benchmarkRecordKey,
  benchmarkRelativeError,
} from "./benchmarkRecords";
import {
  summarizeActionKinds,
  workflowRuntimeContext,
} from "./workflowOps";
import type {
  ResearchWorkflowDescriptor,
  WorkflowAction,
  WorkflowOpsSnapshot,
} from "./workflowTypes";

export const MLIP_DISCOVERY_WORKFLOW_ID = "mlip-discovery-loop";

export interface MlipDiscoveryUnit {
  unit_id: string;
  unit_kind: "mlip_discovery_sentinel";
  element: string;
  potential_id: string;
  property?: string;
  sentinel_kind: "high_error" | "stability_violation" | "cross_model_gap" | "summary";
  severity: number;
  reason: string;
  metrics: Record<string, number | string | boolean>;
}

interface DiscoverySummary {
  records_total: number;
  elements_total: number;
  potentials_total: number;
  mean_abs_error: number | null;
  max_abs_error: number | null;
  top_element: string | null;
}

export const MLIP_DISCOVERY_DESCRIPTOR: ResearchWorkflowDescriptor = {
  workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
  label: "MLIP elastic benchmark discovery loop",
  unit_kind: "mlip_discovery_sentinel",
  version: 1,
  purpose:
    "Turn incoming MLIP elastic-constant benchmark evidence into anomaly sentinels, research agenda tasks, and Phoenix-visible evaluator hooks.",
  git: {
    owners: ["glim-think/src/research", ".github/workflows/mlip-benchmark.yml", "tools/glim_mlip.py"],
    files: [
      "glim-think/src/research/mlipDiscoveryWorkflow.ts",
      "glim-think/src/research/mlipDiscoveryWorkflowOps.ts",
      "glim-think/src/research/benchmarkRecords.ts",
      "glim-think/src/research/workflowRegistry.ts",
      "glim-think/src/research/workflows.ts",
      "glim-think/src/server.ts",
      ".github/workflows/mlip-benchmark.yml",
      "tools/glim_mlip.py",
    ],
    checks: [
      "just think-lint",
      "npm --prefix glim-think run test -- src/research/__tests__/mlipDiscoveryWorkflow.test.ts src/research/__tests__/workflowRoutes.test.ts",
    ],
  },
  cloudflare: {
    routes: [
      "GET /research/workflows/mlip-discovery-loop",
      "POST /research/workflows/mlip-discovery-loop/campaigns",
      "GET /research/workflows/mlip-discovery-loop/campaigns/:campaign_id",
      "GET /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/ops",
      "POST /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/maintain",
      "GET /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/units/next",
      "POST /research/workflows/mlip-discovery-loop/campaigns/:campaign_id/units/:unit_id/evaluate",
    ],
    bindings: ["LEDGER", "RESEARCH_QUEUE", "ARTIFACTS", "CONFIG"],
    queue_consumers: ["agenda:intelligence_tasks", "RESEARCH_QUEUE:round"],
  },
  phoenix: {
    lifecycle_spans: [
      "hypothesis.experiment_design",
      "hypothesis.evidence",
      "hypothesis.verdict",
      "mlip_discovery.sentinel_analysis",
    ],
    evaluators: [
      "mlip_discovery.high_error_sentinel",
      "mlip_discovery.stability_guard",
      "mlip_discovery.cross_model_gap",
      "mlip_discovery.agenda_contract",
    ],
    annotations: [
      "mlip_discovery.sentinel_kind",
      "mlip_discovery.element",
      "mlip_discovery.follow_up_priority",
    ],
  },
  extension_contract: {
    adapter_methods: [
      "describe",
      "createCampaign",
      "getCampaign",
      "listUnits",
      "nextUnits",
      "evaluateUnit",
      "inspectCampaign",
      "maintainCampaign",
    ],
    evidence_required: [
      "benchmark record_id",
      "element",
      "potential_id",
      "property",
      "reference",
      "predicted",
      "github_run_id or discovery_campaign_id in provenance",
    ],
  },
};

function roundMetric(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Math.round(value * 1000) / 1000;
}

function unitSafe(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "-");
}

function severityForRecord(record: BenchmarkRecord): number {
  const abs = benchmarkAbsError(record);
  const rel = benchmarkRelativeError(record);
  if (record.property === "a0") return Math.max(abs / 0.03, rel / 0.02);
  return Math.max(abs / 50, rel / 0.35);
}

function isHighError(record: BenchmarkRecord): boolean {
  const abs = benchmarkAbsError(record);
  const rel = benchmarkRelativeError(record);
  if (record.property === "a0") return abs >= 0.05 || rel >= 0.03;
  return abs >= 75 || rel >= 0.5;
}

function summarize(records: BenchmarkRecord[]): DiscoverySummary {
  const errors = records.map(benchmarkAbsError);
  const byElement = new Map<string, number[]>();
  for (const record of records) {
    const list = byElement.get(record.element) ?? [];
    list.push(benchmarkAbsError(record));
    byElement.set(record.element, list);
  }
  let topElement: string | null = null;
  let topElementMean = -1;
  for (const [element, values] of byElement) {
    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
    if (mean > topElementMean) {
      topElement = element;
      topElementMean = mean;
    }
  }
  return {
    records_total: records.length,
    elements_total: new Set(records.map((record) => record.element)).size,
    potentials_total: new Set(records.map((record) => record.potentialId)).size,
    mean_abs_error: roundMetric(errors.length ? errors.reduce((acc, value) => acc + value, 0) / errors.length : null),
    max_abs_error: roundMetric(errors.length ? Math.max(...errors) : null),
    top_element: topElement,
  };
}

export function buildMlipDiscoveryUnits(records: BenchmarkRecord[]): MlipDiscoveryUnit[] {
  const units: MlipDiscoveryUnit[] = [];
  for (const record of records.filter(isHighError)) {
    const abs = benchmarkAbsError(record);
    const rel = benchmarkRelativeError(record);
    units.push({
      unit_id: `error:${unitSafe(benchmarkRecordKey(record))}`,
      unit_kind: "mlip_discovery_sentinel",
      element: record.element,
      potential_id: record.potentialId,
      property: record.property,
      sentinel_kind: "high_error",
      severity: severityForRecord(record),
      reason:
        `${record.element}/${record.potentialId}/${record.property} has error ${roundMetric(abs)} ${record.unit || ""}`.trim(),
      metrics: {
        predicted: roundMetric(record.predicted) ?? record.predicted,
        reference: roundMetric(record.reference) ?? record.reference,
        abs_error: roundMetric(abs) ?? abs,
        relative_error: roundMetric(rel) ?? rel,
      },
    });
  }

  const grouped = new Map<string, BenchmarkRecord[]>();
  for (const record of records) {
    const key = `${record.element}:${record.potentialId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }
  for (const [key, group] of grouped) {
    const [element, potentialId] = key.split(":");
    const byProperty = new Map(group.map((record) => [record.property, record.predicted]));
    const c11 = byProperty.get("C11");
    const c12 = byProperty.get("C12");
    const c44 = byProperty.get("C44");
    if (typeof c11 === "number" && typeof c12 === "number" && c11 <= c12) {
      units.push({
        unit_id: `stability:${unitSafe(key)}:c11_le_c12`,
        unit_kind: "mlip_discovery_sentinel",
        element,
        potential_id: potentialId,
        sentinel_kind: "stability_violation",
        severity: 3,
        reason: `${element}/${potentialId} violates cubic stability guard C11 > C12.`,
        metrics: { c11: roundMetric(c11) ?? c11, c12: roundMetric(c12) ?? c12 },
      });
    }
    if (typeof c44 === "number" && c44 <= 0) {
      units.push({
        unit_id: `stability:${unitSafe(key)}:c44_nonpositive`,
        unit_kind: "mlip_discovery_sentinel",
        element,
        potential_id: potentialId,
        sentinel_kind: "stability_violation",
        severity: 3,
        reason: `${element}/${potentialId} violates cubic stability guard C44 > 0.`,
        metrics: { c44: roundMetric(c44) ?? c44 },
      });
    }
  }

  const potentialsByElement = new Map<string, Set<string>>();
  for (const record of records) {
    const potentials = potentialsByElement.get(record.element) ?? new Set<string>();
    potentials.add(record.potentialId);
    potentialsByElement.set(record.element, potentials);
  }
  const summary = summarize(records);
  if (records.length > 0 && summary.potentials_total < 3) {
    const elementMeans = [...new Set(records.map((record) => record.element))]
      .map((element) => {
        const rows = records.filter((record) => record.element === element);
        const mean = rows.reduce((acc, record) => acc + benchmarkAbsError(record), 0) / rows.length;
        return { element, mean };
      })
      .sort((a, b) => b.mean - a.mean)
      .slice(0, 5);
    for (const item of elementMeans) {
      units.push({
        unit_id: `cross-model:${unitSafe(item.element)}`,
        unit_kind: "mlip_discovery_sentinel",
        element: item.element,
        potential_id: "multi-mlip",
        sentinel_kind: "cross_model_gap",
        severity: Math.max(1, item.mean / 50),
        reason:
          `${item.element} has only ${potentialsByElement.get(item.element)?.size ?? 0} MLIP family in this batch; expand to MACE/SevenNet before making transfer claims.`,
        metrics: {
          mean_abs_error: roundMetric(item.mean) ?? item.mean,
          observed_potentials: potentialsByElement.get(item.element)?.size ?? 0,
        },
      });
    }
  }

  if (records.length > 0) {
    units.push({
      unit_id: "summary:benchmark-discovery",
      unit_kind: "mlip_discovery_sentinel",
      element: summary.top_element ?? "all",
      potential_id: "all",
      sentinel_kind: "summary",
      severity: 1,
      reason: "Summarize this benchmark batch into the discovery ledger and Phoenix annotations.",
      metrics: {
        records_total: summary.records_total,
        elements_total: summary.elements_total,
        potentials_total: summary.potentials_total,
        mean_abs_error: summary.mean_abs_error ?? 0,
        max_abs_error: summary.max_abs_error ?? 0,
      },
    });
  }

  return units.sort((a, b) => b.severity - a.severity || a.unit_id.localeCompare(b.unit_id));
}

function actionForUnit(campaignId: string, unit: MlipDiscoveryUnit): WorkflowAction {
  const encodedCampaign = encodeURIComponent(campaignId);
  const encodedUnit = encodeURIComponent(unit.unit_id);
  if (unit.sentinel_kind === "summary") {
    return {
      action_id: "summarize-discovery-batch",
      kind: "summarize_campaign",
      label: "Summarize MLIP benchmark discovery batch",
      reason: unit.reason,
      priority: 3,
      unit_id: unit.unit_id,
      route: {
        method: "POST",
        path: `/research/workflows/${MLIP_DISCOVERY_WORKFLOW_ID}/campaigns/${encodedCampaign}/units/${encodedUnit}/evaluate`,
      },
      can_auto_execute: true,
      surfaces: ["cloudflare", "phoenix", "ledger", "agenda"],
    };
  }
  if (unit.sentinel_kind === "cross_model_gap") {
    return {
      action_id: `expand:${unit.element}`,
      kind: "enqueue_unit",
      label: `Expand ${unit.element} to cross-MLIP benchmark`,
      reason: unit.reason,
      priority: 2,
      unit_id: unit.unit_id,
      can_auto_execute: true,
      surfaces: ["cloudflare", "ledger", "agenda"],
    };
  }
  return {
    action_id: `analyze:${unit.unit_id}`,
    kind: "evaluate_hypothesis",
    label: `Analyze ${unit.element} ${unit.sentinel_kind.replace(/_/g, " ")}`,
    reason: unit.reason,
    priority: unit.sentinel_kind === "stability_violation" ? 1 : 2,
    unit_id: unit.unit_id,
    route: {
      method: "POST",
      path: `/research/workflows/${MLIP_DISCOVERY_WORKFLOW_ID}/campaigns/${encodedCampaign}/units/${encodedUnit}/evaluate`,
    },
    can_auto_execute: true,
    surfaces: ["cloudflare", "phoenix", "ledger", "agenda"],
  };
}

export function buildMlipDiscoverySnapshot(
  env: Env,
  campaignId: string,
  records: BenchmarkRecord[],
): WorkflowOpsSnapshot {
  const units = buildMlipDiscoveryUnits(records);
  const actions: WorkflowAction[] = records.length === 0
    ? [{
        action_id: "repair-input:no-records",
        kind: "repair_input",
        label: "Repair MLIP discovery campaign input",
        reason: "No benchmark records were found for this campaign id; check ingest provenance and GitHub run metadata.",
        priority: 1,
        can_auto_execute: false,
        surfaces: ["git", "cloudflare", "ledger", "agenda"],
      }]
    : units.slice(0, 12).map((unit) => actionForUnit(campaignId, unit));
  const summary = summarize(records);
  const state: WorkflowOpsSnapshot["state"] =
    records.length === 0 ? "needs_input" : actions.some((action) => action.kind !== "summarize_campaign") ? "active" : "complete";
  const counters = {
    records_total: summary.records_total,
    elements_total: summary.elements_total,
    potentials_total: summary.potentials_total,
    mean_abs_error: summary.mean_abs_error ?? 0,
    max_abs_error: summary.max_abs_error ?? 0,
    units_total: units.length,
    units_high_error: units.filter((unit) => unit.sentinel_kind === "high_error").length,
    units_stability_violation: units.filter((unit) => unit.sentinel_kind === "stability_violation").length,
    units_cross_model_gap: units.filter((unit) => unit.sentinel_kind === "cross_model_gap").length,
    ...Object.fromEntries(
      Object.entries(summarizeActionKinds(actions)).map(([key, value]) => [`actions_${key}`, value]),
    ),
  };
  return {
    workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
    campaign_id: campaignId,
    generated_at: new Date().toISOString(),
    state,
    descriptor: MLIP_DISCOVERY_DESCRIPTOR,
    counters,
    ...workflowRuntimeContext(env, MLIP_DISCOVERY_DESCRIPTOR),
    next_actions: actions.sort((a, b) => a.priority - b.priority || a.action_id.localeCompare(b.action_id)),
  };
}
