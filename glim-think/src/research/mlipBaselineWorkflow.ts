import type { Env } from "../types";
import {
  attachMlipBaselineWorkflowInstance,
  completeSmokeMlipBaselineRun,
  createMlipBaselineRun,
  dispatchQueuedMlipBaselineCells,
  finalizeMlipBaselineRun,
  getMlipBaselineRun,
  MLIP_BASELINE_WORKFLOW_ID,
  publicMlipBaselineReport,
  recordMlipBaselineCellResult,
  renderMlipBaselineReportHtml,
  type CreateMlipBaselineGridInput,
  type MlipBaselineCellRecord,
  type MlipBaselineCellStatus,
  type MlipBaselineGridWorkflowParams,
} from "./mlipBaselineGrid";
import {
  inspectMlipBaselineCampaign,
  maintainMlipBaselineCampaign,
  MLIP_BASELINE_DESCRIPTOR,
} from "./mlipBaselineWorkflowOps";
import { buildMlipPhoenixExperimentPacket, phoenixProjectName, syncMlipPhoenixPacket } from "./mlipPhoenix";
import {
  workflowError,
  workflowJson,
  type ResearchWorkflowAdapter,
} from "./workflowTypes";

function decodeUnitId(value: string): { cellId?: string; rowId?: string; mlipId?: string } {
  if (value.includes(":baseline:")) return { cellId: value };
  const parts = value.split(":");
  if (parts.length === 2 && parts[0] && parts[1]) return { rowId: parts[0], mlipId: parts[1] };
  return { cellId: value };
}

async function loadRun(env: Env, runId: string) {
  const state = await getMlipBaselineRun(env, runId);
  return state ?? workflowError(`MLIP baseline run '${runId}' not found`, 404);
}

function unitView(cell: MlipBaselineCellRecord) {
  const c = cell;
  return {
    ...c,
    unit_id: c.cell_id,
    short_unit_id: `${c.row_id}:${c.mlip_id}`,
    unit_kind: "mlip_baseline_cell",
  };
}

function workflowInstanceIdForRun(runId: string): string {
  return `${MLIP_BASELINE_WORKFLOW_ID}-${runId}`
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 120);
}

export const mlipBaselineWorkflowAdapter: ResearchWorkflowAdapter = {
  workflow_id: MLIP_BASELINE_WORKFLOW_ID,
  label: "MLIP baseline grid GCP Lab run",

  describe() {
    return MLIP_BASELINE_DESCRIPTOR;
  },

  async createCampaign(env, bodyText) {
    try {
      const body = JSON.parse(bodyText || "{}") as CreateMlipBaselineGridInput;
      const created = await createMlipBaselineRun(env, body);
      const workflow = env.MLIP_BASELINE_GRID;
      let workflowInstanceId: string | null = null;
      let workflowStarted = false;
      if (workflow) {
        const instanceId = workflowInstanceIdForRun(created.run_id);
        const instance = await workflow.create({
          id: instanceId,
          params: { run_id: created.run_id } satisfies MlipBaselineGridWorkflowParams,
          retention: { successRetention: "30 days", errorRetention: "30 days" },
        });
        workflowInstanceId = instance.id;
        workflowStarted = true;
        await attachMlipBaselineWorkflowInstance(env, created.run_id, instance.id);
      } else if (created.profile === "smoke") {
        await completeSmokeMlipBaselineRun(env, created.run_id);
      }
      return workflowJson({
        workflow_id: MLIP_BASELINE_WORKFLOW_ID,
        ...created,
        workflow_instance_id: workflowInstanceId,
        workflow_started: workflowStarted,
        status_url: `/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/${encodeURIComponent(created.run_id)}`,
        report_url: `/research/workflows/${MLIP_BASELINE_WORKFLOW_ID}/campaigns/${encodeURIComponent(created.run_id)}/report`,
      }, { status: 202 });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  },

  async getCampaign(env, runId) {
    const state = await loadRun(env, runId);
    if (state instanceof Response) return state;
    return workflowJson({
      workflow_id: MLIP_BASELINE_WORKFLOW_ID,
      ...state,
      report: publicMlipBaselineReport(state),
    });
  },

  async listUnits(env, runId) {
    const state = await loadRun(env, runId);
    if (state instanceof Response) return state;
    const units = state.cells.map(unitView);
    return workflowJson({
      workflow_id: MLIP_BASELINE_WORKFLOW_ID,
      run_id: runId,
      units,
      summary: state.summary,
    });
  },

  async nextUnits(env, runId, limit) {
    const state = await loadRun(env, runId);
    if (state instanceof Response) return state;
    const units = state.cells
      .filter((cell) => cell.status === "queued")
      .slice(0, limit)
      .map(unitView);
    return workflowJson({ workflow_id: MLIP_BASELINE_WORKFLOW_ID, run_id: runId, units });
  },

  async enqueueCampaign(env, runId, bodyText) {
    try {
      const body = JSON.parse(bodyText || "{}") as { limit?: number; dry_run?: boolean };
      const result = await dispatchQueuedMlipBaselineCells(env, runId, {
        limit: body.limit ?? 5,
        dryRun: body.dry_run,
      });
      return workflowJson({ workflow_id: MLIP_BASELINE_WORKFLOW_ID, run_id: runId, ...result });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  },

  async enqueueUnit(env, runId, rawUnitId, bodyText) {
    try {
      const state = await getMlipBaselineRun(env, runId);
      if (!state) return workflowError(`MLIP baseline run '${runId}' not found`, 404);
      const decoded = decodeUnitId(rawUnitId);
      const cell = decoded.cellId
        ? state.cells.find((candidate) => candidate.cell_id === decoded.cellId)
        : state.cells.find((candidate) => candidate.row_id === decoded.rowId && candidate.mlip_id === decoded.mlipId);
      if (!cell) return workflowError(`MLIP baseline unit '${rawUnitId}' not found`, 404);
      const body = JSON.parse(bodyText || "{}") as { dry_run?: boolean; retry_failed?: boolean };
      const result = await dispatchQueuedMlipBaselineCells(env, runId, {
        limit: 1,
        dryRun: body.dry_run,
        onlyCellId: cell.cell_id,
        allowFailed: cell.status === "failed" && (body.retry_failed ?? true),
      });
      return workflowJson({
        workflow_id: MLIP_BASELINE_WORKFLOW_ID,
        run_id: runId,
        unit_id: cell.cell_id,
        short_unit_id: `${cell.row_id}:${cell.mlip_id}`,
        ...result,
      });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  },

  async evaluateUnit(env, runId, rawUnitId) {
    const state = await loadRun(env, runId);
    if (state instanceof Response) return state;
    const decoded = decodeUnitId(rawUnitId);
    const cell = decoded.cellId
      ? state.cells.find((candidate) => candidate.cell_id === decoded.cellId)
      : state.cells.find((candidate) => candidate.row_id === decoded.rowId && candidate.mlip_id === decoded.mlipId);
    if (!cell) return workflowError(`MLIP baseline unit '${rawUnitId}' not found`, 404);
    return workflowJson({
      workflow_id: MLIP_BASELINE_WORKFLOW_ID,
      run_id: runId,
      unit: unitView(cell),
      evaluator_name: "mlip_baseline.cell_accuracy_speed",
      ready: cell.status === "completed",
    });
  },

  inspectCampaign(env, runId) {
    return inspectMlipBaselineCampaign(env, runId);
  },

  maintainCampaign(env, runId, bodyText) {
    return maintainMlipBaselineCampaign(env, runId, bodyText);
  },

  async recordUnitResult(env, runId, rawUnitId, bodyText) {
    try {
      const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
      const status = ["queued", "enqueued", "running", "completed", "failed"].includes(String(body.status))
        ? body.status as MlipBaselineCellStatus
        : undefined;
      const result = await recordMlipBaselineCellResult(env, {
        run_id: runId,
        cell_id: rawUnitId,
        status,
        accuracy_score: typeof body.accuracy_score === "number" ? body.accuracy_score : undefined,
        accuracy_unit: typeof body.accuracy_unit === "string" ? body.accuracy_unit : undefined,
        speed_score: typeof body.speed_score === "number" ? body.speed_score : undefined,
        speed_unit: typeof body.speed_unit === "string" ? body.speed_unit : undefined,
        artifact_uri: typeof body.artifact_uri === "string" ? body.artifact_uri : undefined,
        operation_name: typeof body.operation_name === "string" ? body.operation_name : undefined,
        error: typeof body.error === "string" ? body.error : undefined,
        metrics: typeof body.metrics === "object" && body.metrics !== null && !Array.isArray(body.metrics)
          ? body.metrics as Record<string, unknown>
          : undefined,
      });
      await finalizeMlipBaselineRun(env, runId);
      return workflowJson({ workflow_id: MLIP_BASELINE_WORKFLOW_ID, run_id: runId, unit_id: rawUnitId, ...result });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  },

  async reportCampaign(env, runId, url) {
    const state = await loadRun(env, runId);
    if (state instanceof Response) return state;
    const format = url.searchParams.get("format") ?? "html";
    if (format === "json") return workflowJson(publicMlipBaselineReport(state));
    if (format === "phoenix") return workflowJson(buildMlipPhoenixExperimentPacket(state, phoenixProjectName(env)));
    if (format === "markdown") {
      const report = publicMlipBaselineReport(state);
      return new Response(
        `# ${state.run.title}\n\n` +
          `Status: ${state.run.status}\n\n` +
          `Progress: ${state.summary.cells_completed}/${state.summary.cells_total}\n\n` +
          `Profile: ${state.run.profile}\n\n` +
          `Mean accuracy: ${state.summary.mean_accuracy ?? "pending"}\n\n` +
          `Mean speed: ${state.summary.mean_speed ?? "pending"}\n\n` +
          `${report.caveat}\n`,
        { headers: { "Content-Type": "text/markdown; charset=utf-8", "Access-Control-Allow-Origin": "*" } },
      );
    }
    return new Response(renderMlipBaselineReportHtml(state), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" },
    });
  },

  async syncPhoenix(env, runId, bodyText) {
    try {
      const state = await loadRun(env, runId);
      if (state instanceof Response) return state;
      const body = JSON.parse(bodyText || "{}") as { reuse_experiments?: boolean };
      const packet = buildMlipPhoenixExperimentPacket(state, phoenixProjectName(env));
      const result = await syncMlipPhoenixPacket(env, packet, {
        reuse_experiments: body.reuse_experiments ?? true,
      });
      return workflowJson({ workflow_id: MLIP_BASELINE_WORKFLOW_ID, run_id: runId, ...result });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 502);
    }
  },
};
