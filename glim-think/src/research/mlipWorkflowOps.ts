import type { Env } from "../types";
import {
  campaignVariantIds,
  getMlipCampaign,
  nextMlipCampaignTriplets,
  type MlipCampaignTriplet,
} from "./mlipCampaign";
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
import { evaluateMlipStateHypotheses } from "./mlipStateHypotheses";

const WORKFLOW_ID = "mlip-5x5x3";

export const MLIP_WORKFLOW_DESCRIPTOR: ResearchWorkflowDescriptor = {
  workflow_id: WORKFLOW_ID,
  label: "MLIP 5x5x3 accuracy and speed campaign",
  unit_kind: "mlip_triplet",
  version: 1,
  purpose:
    "Compare baseline MLIP, Distill accuracy, and Distill accuracy plus acceleration across a 5x5 observable by potential grid.",
  git: {
    owners: [
      "glim-think/src/research",
      "atlas-distill/src/commands/model_geometry.rs",
    ],
    files: [
      "glim-think/src/research/workflowTypes.ts",
      "glim-think/src/research/workflowRegistry.ts",
      "glim-think/src/research/workflows.ts",
      "glim-think/src/research/mlipWorkflow.ts",
      "glim-think/src/research/mlipWorkflowOps.ts",
      "glim-think/src/research/mlipCampaign.ts",
      "glim-think/src/research/mlipPhoenix.ts",
      "glim-think/src/research/mlipStateHypotheses.ts",
      "glim-think/src/research/queue.ts",
      "glim-think/src/feed/beats.ts",
      "gcp/mlip-cell-runner/mlip_cell_runner.py",
      "python/lupine_distill_runtime",
      "atlas-distill/src/commands/model_geometry.rs",
    ],
    checks: [
      "just think-lint",
      "npm --prefix glim-think run test -- src/research/__tests__/mlipCampaign.test.ts src/research/__tests__/workflowRoutes.test.ts",
      "just engine-test",
    ],
  },
  cloudflare: {
    routes: [
      "GET /research/workflows",
      "GET /research/workflows/mlip-5x5x3",
      "POST /research/workflows/mlip-5x5x3/campaigns",
      "GET /research/workflows/mlip-5x5x3/campaigns/:campaign_id",
      "GET /research/workflows/mlip-5x5x3/campaigns/:campaign_id/ops",
      "POST /research/workflows/mlip-5x5x3/campaigns/:campaign_id/maintain",
      "GET /research/workflows/mlip-5x5x3/campaigns/:campaign_id/report?format=phoenix",
      "POST /research/workflows/mlip-5x5x3/campaigns/:campaign_id/phoenix-sync",
      "GET /research/workflows/mlip-5x5x3/campaigns/:campaign_id/units/next",
      "POST /research/workflows/mlip-5x5x3/campaigns/:campaign_id/units/:unit_id/enqueue",
      "POST /research/workflows/mlip-5x5x3/campaigns/:campaign_id/units/:unit_id/evaluate",
    ],
    bindings: ["LEDGER", "RESEARCH_QUEUE", "ARTIFACTS", "CONFIG"],
    queue_consumers: ["RESEARCH_QUEUE:mlip_cell_run", "RESEARCH_QUEUE:model_geometry_distill"],
  },
  phoenix: {
    lifecycle_spans: [
      "hypothesis.experiment_design",
      "hypothesis.compute_dispatch",
      "hypothesis.evidence",
      "hypothesis.verdict",
    ],
    evaluators: [
      "model_geometry.dispatch_contract",
      "mlip_cell.dispatch_contract",
      "mlip_triplet.delta_verdict",
      ...MLIP_PHOENIX_EVALUATOR_SPECS.map((spec) => spec.name),
    ],
    annotations: ["mlip_triplet.delta_verdict"],
  },
  extension_contract: {
    adapter_methods: [
      "describe",
      "createCampaign",
      "getCampaign",
      "listUnits",
      "nextUnits",
      "enqueueUnit",
      "evaluateUnit",
      "inspectCampaign",
      "maintainCampaign",
    ],
    evidence_required: [
      "unit_id",
      "accuracy_score",
      "speed_score",
      "trace_id or evaluable local row",
      `Phoenix dataset ${MLIP_PHOENIX_DATASET_NAME}`,
    ],
  },
};

function unitId(triplet: Pick<MlipCampaignTriplet, "row_id" | "mlip_id">): string {
  return `${triplet.row_id}:${triplet.mlip_id}`;
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

export async function inspectMlipWorkflowCampaign(
  env: Env,
  campaignId: string,
): Promise<WorkflowOpsSnapshot | Response> {
  const campaign = await getMlipCampaign(env, campaignId);
  if (!campaign) return workflowError(`Campaign '${campaignId}' not found`, 404);

  const missingFixtureCells = campaign.cells.filter((cell) => !cell.fixture_url);
  const readyToEvaluate = campaign.triplets.filter(
    (triplet) => triplet.status === "completed" && !triplet.evaluation,
  );
  const failedTriplets = campaign.triplets.filter((triplet) => triplet.status === "failed");
  const requiredVariants = campaignVariantIds(campaign.campaign);
  const nextQueued = nextMlipCampaignTriplets(campaign.cells, 5, requiredVariants);
  const stateHypotheses = evaluateMlipStateHypotheses(campaign.cells);
  const campaignStateHypothesis = stateHypotheses.find((evaluation) => evaluation.scope === "campaign");
  const actions: WorkflowAction[] = [];

  for (const cell of missingFixtureCells.slice(0, 5)) {
    actions.push({
      action_id: `repair-input:${cell.cell_id}`,
      kind: "repair_input",
      label: `Repair missing fixture for ${cell.cell_id}`,
      reason: "The unit cannot dispatch until fixture_url resolves to a real artifact.",
      priority: 1,
      unit_id: cell.cell_id,
      can_auto_execute: false,
      surfaces: ["git", "ledger", "agenda"],
    });
  }

  for (const triplet of readyToEvaluate.slice(0, 10)) {
    const id = unitId(triplet);
    actions.push({
      action_id: `evaluate:${id}`,
      kind: "evaluate_unit",
      label: `Evaluate completed MLIP triplet ${id}`,
      reason: requiredVariants.includes("distill_accuracy_accelerate")
        ? "All three variant cells are complete but no durable triplet verdict is recorded yet."
        : "Baseline and Distill Accuracy cells are complete but no durable accuracy verdict is recorded yet.",
      priority: 1,
      unit_id: id,
      route: {
        method: "POST",
        path: workflowActionPath(WORKFLOW_ID, campaignId, id, "evaluate"),
      },
      can_auto_execute: true,
      surfaces: ["cloudflare", "phoenix", "ledger", "agenda"],
    });
  }

  for (const triplet of nextQueued) {
    const id = unitId(triplet);
    actions.push({
      action_id: `enqueue:${id}`,
      kind: "enqueue_unit",
      label: `Dispatch next MLIP triplet ${id}`,
      reason: requiredVariants.includes("distill_accuracy_accelerate")
        ? "This is the next queued row/MLIP unit for the 5x5x3 cadence."
        : "This is the next queued row/MLIP unit for the accuracy-only cadence.",
      priority: 2,
      unit_id: id,
      route: {
        method: "POST",
        path: workflowActionPath(WORKFLOW_ID, campaignId, id, "enqueue"),
        body: { dry_run: false },
      },
      can_auto_execute: missingFixtureCells.length === 0,
      surfaces: ["cloudflare", "ledger", "agenda"],
    });
  }

  for (const triplet of failedTriplets.slice(0, 5)) {
    const id = unitId(triplet);
    actions.push({
      action_id: `inspect-failure:${id}`,
      kind: "inspect_failure",
      label: `Inspect failed MLIP triplet ${id}`,
      reason: "A failed triplet should be classified before more campaign capacity is spent.",
      priority: 1,
      unit_id: id,
      can_auto_execute: false,
      surfaces: ["git", "cloudflare", "phoenix", "ledger"],
    });
  }

  if (actions.length === 0) {
    actions.push({
      action_id: "phoenix-5x5x3-sync",
      kind: "sync_phoenix",
      label: "Sync MLIP 5x5x3 campaign to Phoenix",
      reason: "Phoenix should hold the stable held-out dataset, three variant experiments, and deterministic evaluator rows for future model upgrades.",
      priority: 2,
      route: {
        method: "POST",
        path: `/research/workflows/${WORKFLOW_ID}/campaigns/${encodeURIComponent(campaignId)}/phoenix-sync`,
        body: { reuse_experiments: true },
      },
      can_auto_execute: campaign.summary.completed === campaign.summary.cells,
      surfaces: ["cloudflare", "phoenix", "ledger", "agenda"],
    });
    actions.push({
      action_id: "summarize-campaign",
      kind: "summarize_campaign",
      label: "Summarize MLIP campaign state",
      reason: "No immediate dispatch or evaluation action is pending.",
      priority: 3,
      can_auto_execute: true,
      surfaces: ["phoenix", "ledger", "agenda"],
    });
  }

  if (campaignStateHypothesis?.verdict === "refuted") {
    actions.push({
      action_id: "revise-state-hypothesis",
      kind: "revise_hypothesis",
      label: "Revise state-coupled Distill hypothesis",
      reason:
        "The energy/free-energy anchor did not lift downstream lattice observables; revise support selection, ribbon limits, or row coupling before claiming an accuracy win.",
      priority: 1,
      route: {
        method: "GET",
        path: `/research/workflows/${WORKFLOW_ID}/campaigns/${encodeURIComponent(campaignId)}/report?format=phoenix`,
      },
      can_auto_execute: false,
      surfaces: ["git", "cloudflare", "phoenix", "ledger", "agenda"],
    });
  } else if (campaignStateHypothesis?.verdict === "testing") {
    actions.push({
      action_id: "evaluate-state-hypothesis",
      kind: "evaluate_hypothesis",
      label: "Evaluate state-coupled lattice lift",
      reason:
        "The campaign has partial state-coupled evidence; inspect the Phoenix packet before promoting a new hyperribbon version.",
      priority: 3,
      route: {
        method: "GET",
        path: `/research/workflows/${WORKFLOW_ID}/campaigns/${encodeURIComponent(campaignId)}/report?format=phoenix`,
      },
      can_auto_execute: true,
      surfaces: ["cloudflare", "phoenix", "ledger", "agenda"],
    });
  }

  const state: WorkflowOpsSnapshot["state"] =
    failedTriplets.length > 0
      ? "failed"
      : missingFixtureCells.length > 0
        ? "needs_input"
        : campaign.summary.completed === campaign.summary.cells
          ? "complete"
          : nextQueued.length > 0 || readyToEvaluate.length > 0
            ? "active"
            : "ready";

  const counters = {
    cells_total: campaign.summary.cells,
    cells_completed: campaign.summary.completed,
    triplets_total: campaign.triplets.length,
    evaluations_total: campaign.evaluations.length,
    state_hypotheses_total: stateHypotheses.length,
    state_hypotheses_refuted: stateHypotheses.filter((evaluation) => evaluation.verdict === "refuted").length,
    state_hypotheses_testing: stateHypotheses.filter((evaluation) => evaluation.verdict === "testing").length,
    missing_fixture_cells: missingFixtureCells.length,
    ...Object.fromEntries(
      Object.entries(countBy(campaign.triplets.map((triplet) => triplet.status))).map(([key, value]) => [
        `triplets_${key}`,
        value,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(summarizeActionKinds(actions)).map(([key, value]) => [`actions_${key}`, value]),
    ),
  };

  return {
    workflow_id: WORKFLOW_ID,
    campaign_id: campaignId,
    generated_at: new Date().toISOString(),
    state,
    descriptor: MLIP_WORKFLOW_DESCRIPTOR,
    counters,
    ...workflowRuntimeContext(env, MLIP_WORKFLOW_DESCRIPTOR),
    next_actions: actions.sort((a, b) => a.priority - b.priority || a.action_id.localeCompare(b.action_id)),
  };
}

export async function maintainMlipWorkflowCampaign(
  env: Env,
  campaignId: string,
  bodyText: string,
): Promise<Response> {
  const snapshot = await inspectMlipWorkflowCampaign(env, campaignId);
  if (snapshot instanceof Response) return snapshot;
  const body = JSON.parse(bodyText || "{}") as { mode?: "agenda"; limit?: number };
  const mode = body.mode ?? "agenda";
  if (mode !== "agenda") return workflowError("Only agenda maintenance is implemented for this workflow", 400);
  const agenda = await insertWorkflowAgendaTasks(env, snapshot, body.limit ?? 10);
  return workflowJson({
    workflow_id: WORKFLOW_ID,
    campaign_id: campaignId,
    mode,
    agenda,
    state: snapshot.state,
    counters: snapshot.counters,
    next_actions: snapshot.next_actions.slice(0, Math.max(1, Math.trunc(body.limit ?? 10))),
  });
}
