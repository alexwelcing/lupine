import type { Env } from "../types";
import {
  dispatchQueuedMlipBaselineCells,
  getMlipBaselineRun,
  MLIP_BASELINE_WORKFLOW_ID,
  type MlipBaselineCellRecord,
} from "./mlipBaselineGrid";
import { classifyMlipFixtureTarget } from "./mlipBaselineReadiness";
import {
  insertWorkflowAgendaTasks,
  summarizeActionKinds,
  workflowActionPath,
  workflowRuntimeContext,
} from "./workflowOps";
import {
  workflowError,
  workflowJson,
  type ResearchWorkflowDescriptor,
  type WorkflowAction,
  type WorkflowOpsSnapshot,
} from "./workflowTypes";
import { MLIP_PHOENIX_DATASET_NAME, MLIP_PHOENIX_EVALUATOR_SPECS } from "./mlipPhoenix";

export const MLIP_BASELINE_DESCRIPTOR: ResearchWorkflowDescriptor = {
  workflow_id: MLIP_BASELINE_WORKFLOW_ID,
  label: "MLIP baseline grid GCP Lab run",
  unit_kind: "mlip_baseline_cell",
  version: 1,
  purpose:
    "Run a 5x5 baseline-only MLIP accuracy and speed grid with Cloudflare as the control plane and GCP Cloud Run Jobs as governed compute.",
  git: {
    owners: [
      "glim-think/src/research",
      "gcp/tasks-consumer",
      "gcp/mlip-cell-runner",
    ],
    files: [
      "glim-think/src/research/mlipBaselineGrid.ts",
      "glim-think/src/research/mlipBaselineReadiness.ts",
      "glim-think/src/research/mlipBaselineWorkflow.ts",
      "glim-think/src/research/mlipBaselineWorkflowOps.ts",
      "glim-think/src/research/mlipBaselineCloudflareWorkflow.ts",
      "glim-think/src/feed/beats.ts",
      "gcp/tasks-consumer/src/main.rs",
      "gcp/mlip-cell-runner/mlip_cell_runner.py",
      "gcp/mlip-cell-runner/fixture_contract.py",
    ],
    checks: [
      "just think-lint",
      "npm --prefix glim-think run test -- src/research/__tests__/mlipBaselineWorkflow.test.ts src/research/__tests__/workflowRoutes.test.ts",
      "cargo test --release --manifest-path gcp/tasks-consumer/Cargo.toml",
    ],
  },
  cloudflare: {
    routes: [
      "POST /research/workflows/mlip-baseline-grid/campaigns",
      "GET /research/workflows/mlip-baseline-grid/campaigns/:run_id",
      "GET /research/workflows/mlip-baseline-grid/campaigns/:run_id/report",
      "GET /research/workflows/mlip-baseline-grid/campaigns/:run_id/report?format=phoenix",
      "GET /research/workflows/mlip-baseline-grid/campaigns/:run_id/ops",
      "POST /research/workflows/mlip-baseline-grid/campaigns/:run_id/maintain",
      "POST /research/workflows/mlip-baseline-grid/campaigns/:run_id/phoenix-sync",
      "GET /research/workflows/mlip-baseline-grid/campaigns/:run_id/units/next",
      "POST /research/workflows/mlip-baseline-grid/campaigns/:run_id/units/:cell_id/enqueue",
      "POST /research/workflows/mlip-baseline-grid/campaigns/:run_id/units/:cell_id/result",
      "POST /feed/beats",
    ],
    bindings: ["LEDGER", "ARTIFACTS", "CONFIG", "RESEARCH_QUEUE", "MLIP_BASELINE_GRID"],
    queue_consumers: ["Cloud Tasks:tasks-consumer", "GCP Cloud Run Jobs:mlip-cell-*"],
  },
  phoenix: {
    lifecycle_spans: [
      "hypothesis.compute_dispatch",
      "mlip_baseline.cell_result",
      "mlip_baseline.grid_completeness",
    ],
    evaluators: [
      "mlip_baseline.gcp_dispatch_contract",
      "mlip_baseline.cell_accuracy_speed",
      "mlip_baseline.grid_completeness",
      ...MLIP_PHOENIX_EVALUATOR_SPECS.map((spec) => spec.name),
    ],
    annotations: [
      "mlip_baseline.cell_accuracy_speed",
      "mlip.accuracy.normalized_score",
      "mlip.speed.throughput_reported",
      "mlip.evidence.artifact_present",
      "mlip.evidence.trace_present",
      "mlip.contract.v2_fixture_readiness",
    ],
  },
  extension_contract: {
    adapter_methods: [
      "describe",
      "createCampaign",
      "getCampaign",
      "listUnits",
      "nextUnits",
      "enqueueCampaign",
      "enqueueUnit",
      "recordUnitResult",
      "inspectCampaign",
      "maintainCampaign",
      "reportCampaign",
    ],
    evidence_required: [
      "run_id",
      "cell_id",
      "accuracy_score",
      "speed_score",
      "target_job",
      "artifact_uri",
      "trace_id or D1 evaluation row",
      `Phoenix dataset packet for ${MLIP_PHOENIX_DATASET_NAME}`,
    ],
  },
};

function cellUnitId(cell: MlipBaselineCellRecord): string {
  return `${cell.row_id}:${cell.mlip_id}`;
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function cellActionPath(runId: string, cellId: string, action: "enqueue" | "evaluate" | "result"): string {
  return workflowActionPath(MLIP_BASELINE_WORKFLOW_ID, runId, cellId, action);
}

export async function inspectMlipBaselineCampaign(
  env: Env,
  runId: string,
): Promise<WorkflowOpsSnapshot | Response> {
  const state = await getMlipBaselineRun(env, runId);
  if (!state) return workflowError(`MLIP baseline run '${runId}' not found`, 404);

  const actions: WorkflowAction[] = [];
  const queued = state.cells.filter((cell) => cell.status === "queued");
  const failed = state.cells.filter((cell) => cell.status === "failed");
  const active = state.cells.filter((cell) => cell.status === "enqueued" || cell.status === "running");
  const staleCutoff = Date.now() - 2 * 60 * 60 * 1000;
  const stale = active.filter((cell) => {
    const stamp = cell.enqueued_at ?? cell.updated_at;
    return Date.parse(stamp) < staleCutoff;
  });
  const missingConfig: string[] = [];
  if (state.run.profile !== "smoke" && !env.TASKS_CONSUMER_URL?.trim()) missingConfig.push("TASKS_CONSUMER_URL");
  if (state.run.profile !== "smoke" && !state.run.manifest_url.trim()) missingConfig.push("manifest_url");
  if (state.run.profile !== "smoke") {
    const fixtureTarget = classifyMlipFixtureTarget(state.run.profile, state.run.fixture_id, state.run.manifest_url);
    for (const blocker of fixtureTarget.blockers) missingConfig.push(`fixture:${blocker}`);
  }

  for (const item of missingConfig) {
    actions.push({
      action_id: `repair-input:${item}`,
      kind: "repair_input",
      label: `Repair MLIP baseline config: ${item}`,
      reason: "The Lab run cannot dispatch GCP compute until this input is configured.",
      priority: 1,
      can_auto_execute: false,
      surfaces: ["git", "cloudflare", "ledger", "agenda"],
    });
  }

  for (const cell of queued.slice(0, 10)) {
    actions.push({
      action_id: `enqueue:${cell.cell_id}`,
      kind: "enqueue_unit",
      label: `Dispatch MLIP baseline cell ${cellUnitId(cell)}`,
      reason: "This queued cell is ready for the next GCP Lab dispatch wave.",
      priority: 2,
      unit_id: cell.cell_id,
      route: {
        method: "POST",
        path: cellActionPath(runId, cell.cell_id, "enqueue"),
        body: { dry_run: false },
      },
      can_auto_execute: missingConfig.length === 0,
      surfaces: ["cloudflare", "ledger", "phoenix", "agenda"],
    });
  }

  for (const cell of stale.slice(0, 5)) {
    actions.push({
      action_id: `inspect-stale:${cell.cell_id}`,
      kind: "inspect_failure",
      label: `Inspect stale MLIP baseline cell ${cellUnitId(cell)}`,
      reason: "The GCP dispatch is still awaiting a result beat after the stale threshold.",
      priority: 1,
      unit_id: cell.cell_id,
      can_auto_execute: false,
      surfaces: ["cloudflare", "phoenix", "ledger"],
    });
  }

  for (const cell of failed.slice(0, 5)) {
    actions.push({
      action_id: `retry:${cell.cell_id}`,
      kind: "enqueue_unit",
      label: `Retry failed MLIP baseline cell ${cellUnitId(cell)}`,
      reason: cell.error ?? "The cell failed and can be retried after inspection.",
      priority: 1,
      unit_id: cell.cell_id,
      route: {
        method: "POST",
        path: cellActionPath(runId, cell.cell_id, "enqueue"),
        body: { dry_run: false },
      },
      can_auto_execute: false,
      surfaces: ["cloudflare", "ledger", "phoenix", "agenda"],
    });
  }

  if (actions.length === 0) {
    actions.push({
      action_id: "phoenix-experiment-packet",
      kind: "sync_phoenix",
      label: "Sync Phoenix dataset, experiments, and evaluator rows",
      reason: "The run is complete; Phoenix should receive stable held-out dataset examples, a baseline experiment, and deterministic evaluator rows before release comparison.",
      priority: 2,
      route: {
        method: "POST",
        path: `/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/${encodeURIComponent(runId)}/phoenix-sync`,
        body: { reuse_experiments: true },
      },
      can_auto_execute: true,
      surfaces: ["phoenix", "ledger", "agenda"],
    });
    actions.push({
      action_id: "summarize-campaign",
      kind: "summarize_campaign",
      label: "Summarize MLIP baseline run",
      reason: "No immediate dispatch, retry, or repair action is pending.",
      priority: 3,
      can_auto_execute: true,
      surfaces: ["phoenix", "ledger", "agenda"],
    });
  }

  const workflowState: WorkflowOpsSnapshot["state"] =
    state.run.status === "failed" || state.run.status === "failed_preflight"
      ? "failed"
      : missingConfig.length > 0
        ? "needs_input"
        : state.summary.cells_completed === state.summary.cells_total
          ? "complete"
          : queued.length > 0 || active.length > 0
            ? "active"
            : "ready";

  const counters = {
    cells_total: state.summary.cells_total,
    cells_completed: state.summary.cells_completed,
    cells_failed: state.summary.cells_failed,
    cells_queued: state.summary.cells_queued,
    cells_active: active.length,
    stale_cells: stale.length,
    missing_config: missingConfig.length,
    ...Object.fromEntries(
      Object.entries(countBy(state.cells.map((cell) => cell.status))).map(([key, value]) => [
        `cells_${key}`,
        value,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(summarizeActionKinds(actions)).map(([key, value]) => [`actions_${key}`, value]),
    ),
  };

  return {
    workflow_id: MLIP_BASELINE_WORKFLOW_ID,
    campaign_id: runId,
    generated_at: new Date().toISOString(),
    state: workflowState,
    descriptor: MLIP_BASELINE_DESCRIPTOR,
    counters,
    ...workflowRuntimeContext(env, MLIP_BASELINE_DESCRIPTOR),
    next_actions: actions.sort((a, b) => a.priority - b.priority || a.action_id.localeCompare(b.action_id)),
  };
}

export async function maintainMlipBaselineCampaign(
  env: Env,
  runId: string,
  bodyText: string,
): Promise<Response> {
  const body = JSON.parse(bodyText || "{}") as { mode?: "agenda" | "dispatch"; limit?: number; dry_run?: boolean };
  const mode = body.mode ?? "agenda";
  if (mode === "dispatch") {
    try {
      const result = await dispatchQueuedMlipBaselineCells(env, runId, {
        limit: body.limit ?? 5,
        dryRun: body.dry_run,
      });
      return workflowJson({ workflow_id: MLIP_BASELINE_WORKFLOW_ID, run_id: runId, mode, ...result });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  }
  if (mode !== "agenda") return workflowError("Unsupported MLIP baseline maintenance mode", 400);
  const snapshot = await inspectMlipBaselineCampaign(env, runId);
  if (snapshot instanceof Response) return snapshot;
  const agenda = await insertWorkflowAgendaTasks(env, snapshot, body.limit ?? 10);
  return workflowJson({
    workflow_id: MLIP_BASELINE_WORKFLOW_ID,
    run_id: runId,
    mode,
    agenda,
    state: snapshot.state,
    counters: snapshot.counters,
    next_actions: snapshot.next_actions.slice(0, Math.max(1, Math.trunc(body.limit ?? 10))),
  });
}
