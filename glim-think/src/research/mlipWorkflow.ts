import type { Env } from "../types";
import {
  createMlipCampaign,
  evaluateCampaignTriplet,
  getMlipCampaign,
  markMlipCampaignCellEnqueued,
  nextMlipCampaignTriplets,
  recordMlipCampaignResult,
  type CreateMlipCampaignInput,
  type MlipCampaignCell,
  type MlipCampaignTriplet,
} from "./mlipCampaign";
import {
  inspectMlipWorkflowCampaign,
  maintainMlipWorkflowCampaign,
  MLIP_WORKFLOW_DESCRIPTOR,
} from "./mlipWorkflowOps";
import { enqueueTask, type ResearchTask } from "./queue";
import {
  workflowError,
  workflowJson,
  type ResearchWorkflowAdapter,
} from "./workflowTypes";

const WORKFLOW_ID = "mlip-5x5x3";

type MlipCampaignState = NonNullable<Awaited<ReturnType<typeof getMlipCampaign>>>;

function nowIso(): string {
  return new Date().toISOString();
}

function unitId(rowId: string, mlipId: string): string {
  return `${rowId}:${mlipId}`;
}

function decodeUnitId(value: string): { rowId: string; mlipId: string } {
  const parts = value.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("unit_id must be formatted as row_id:mlip_id");
  }
  return { rowId: parts[0], mlipId: parts[1] };
}

function withUnitId(triplet: MlipCampaignTriplet): MlipCampaignTriplet & { unit_id: string; unit_kind: string } {
  return {
    ...triplet,
    unit_id: unitId(triplet.row_id, triplet.mlip_id),
    unit_kind: "mlip_triplet",
  };
}

function campaignModelPairs(campaign: MlipCampaignState): string[] {
  try {
    const parsed = JSON.parse(campaign.campaign.model_pairs_json) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

async function loadCampaign(env: Env, campaignId: string): Promise<MlipCampaignState | Response> {
  const campaign = await getMlipCampaign(env, campaignId);
  return campaign ?? workflowError(`Campaign '${campaignId}' not found`, 404);
}

async function dispatchCampaignCells(
  env: Env,
  campaignId: string,
  campaign: MlipCampaignState,
  cells: MlipCampaignCell[],
  opts: { dryRun?: boolean } = {},
): Promise<{
  dispatched: Array<Record<string, unknown>>;
  skipped: Array<Record<string, unknown>>;
  considered: number;
}> {
  const dispatched: Array<Record<string, unknown>> = [];
  const skipped: Array<Record<string, unknown>> = [];
  const modelPairs = campaignModelPairs(campaign);
  for (const cell of cells) {
    if (!cell.fixture_url) {
      skipped.push({ cell_id: cell.cell_id, reason: "missing fixture_url" });
      continue;
    }
    if (opts.dryRun) {
      dispatched.push({ cell_id: cell.cell_id, fixture_url: cell.fixture_url, dry_run: true });
      continue;
    }
    const task: ResearchTask = {
      kind: "model_geometry_distill",
      dedup_key: `mlip-campaign:${campaignId}:${cell.cell_id}`,
      enqueued_at: nowIso(),
      hypothesis_id: campaign.campaign.hypothesis_id,
      fixture_url: cell.fixture_url,
      campaign_id: campaignId,
      cell_id: cell.cell_id,
      row_id: cell.row_id,
      mlip_id: cell.mlip_id,
      variant_id: cell.variant_id,
      model_pairs: modelPairs,
      quality_gate: campaign.campaign.quality_gate as "none" | "fit" | "physics" | "accuracy",
      top_k: campaign.campaign.top_k,
    };
    const result = await enqueueTask(env, task);
    await markMlipCampaignCellEnqueued(env, campaignId, cell.cell_id, result.job_id);
    dispatched.push({ cell_id: cell.cell_id, job_id: result.job_id, status: result.status });
  }
  return { dispatched, skipped, considered: cells.length };
}

async function enqueueTriplet(
  env: Env,
  campaignId: string,
  campaign: MlipCampaignState,
  rowId: string,
  mlipId: string,
  dryRun?: boolean,
): Promise<Response> {
  const triplet = campaign.triplets.find((candidate) => candidate.row_id === rowId && candidate.mlip_id === mlipId);
  if (!triplet) return workflowError(`Triplet '${rowId}:${mlipId}' not found`, 404);
  const tripletCells = [
    triplet.baseline,
    triplet.distill_accuracy,
    triplet.distill_accuracy_accelerate,
  ].filter((cell): cell is MlipCampaignCell => Boolean(cell));
  const stale = tripletCells
    .filter((cell) => cell.status !== "queued")
    .map((cell) => ({ cell_id: cell.cell_id, status: cell.status, reason: "not queued" }));
  const queued = tripletCells.filter((cell) => cell.status === "queued");
  const result = await dispatchCampaignCells(env, campaignId, campaign, queued, { dryRun });
  return workflowJson({
    workflow_id: WORKFLOW_ID,
    campaign_id: campaignId,
    unit_id: unitId(rowId, mlipId),
    row_id: rowId,
    mlip_id: mlipId,
    unit_status: triplet.status,
    dispatched: result.dispatched,
    skipped: [...stale, ...result.skipped],
    considered: tripletCells.length,
  });
}

export const mlipWorkflowAdapter: ResearchWorkflowAdapter = {
  workflow_id: WORKFLOW_ID,
  label: "MLIP 5x5x3 accuracy and speed campaign",

  describe() {
    return MLIP_WORKFLOW_DESCRIPTOR;
  },

  async createCampaign(env, bodyText) {
    try {
      const body = JSON.parse(bodyText || "{}") as CreateMlipCampaignInput;
      const result = await createMlipCampaign(env, body);
      return workflowJson({ workflow_id: WORKFLOW_ID, ...result });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  },

  async getCampaign(env, campaignId) {
    const campaign = await loadCampaign(env, campaignId);
    if (campaign instanceof Response) return campaign;
    return workflowJson({ workflow_id: WORKFLOW_ID, ...campaign });
  },

  async listUnits(env, campaignId) {
    const campaign = await loadCampaign(env, campaignId);
    if (campaign instanceof Response) return campaign;
    const units = campaign.triplets.map(withUnitId);
    return workflowJson({
      workflow_id: WORKFLOW_ID,
      campaign_id: campaignId,
      units,
      triplets: units,
      summary: campaign.summary,
    });
  },

  async nextUnits(env, campaignId, limit) {
    const campaign = await loadCampaign(env, campaignId);
    if (campaign instanceof Response) return campaign;
    const units = nextMlipCampaignTriplets(campaign.cells, limit).map(withUnitId);
    return workflowJson({
      workflow_id: WORKFLOW_ID,
      campaign_id: campaignId,
      units,
      triplets: units,
    });
  },

  async enqueueCampaign(env, campaignId, bodyText) {
    const campaign = await loadCampaign(env, campaignId);
    if (campaign instanceof Response) return campaign;
    const body = JSON.parse(bodyText || "{}") as {
      limit?: number;
      variant_id?: string;
      row_id?: string;
      mlip_id?: string;
      dry_run?: boolean;
    };
    const limit = Math.min(Math.max(Math.trunc(body.limit ?? 75), 1), 75);
    const cells = campaign.cells
      .filter((cell) => cell.status === "queued")
      .filter((cell) => !body.variant_id || cell.variant_id === body.variant_id)
      .filter((cell) => !body.row_id || cell.row_id === body.row_id)
      .filter((cell) => !body.mlip_id || cell.mlip_id === body.mlip_id)
      .slice(0, limit);
    const result = await dispatchCampaignCells(env, campaignId, campaign, cells, { dryRun: body.dry_run });
    return workflowJson({ workflow_id: WORKFLOW_ID, campaign_id: campaignId, ...result });
  },

  async enqueueUnit(env, campaignId, rawUnitId, bodyText) {
    const campaign = await loadCampaign(env, campaignId);
    if (campaign instanceof Response) return campaign;
    const body = JSON.parse(bodyText || "{}") as { dry_run?: boolean };
    try {
      const { rowId, mlipId } = decodeUnitId(rawUnitId);
      return enqueueTriplet(env, campaignId, campaign, rowId, mlipId, body.dry_run);
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  },

  async evaluateUnit(env, campaignId, rawUnitId) {
    try {
      const { rowId, mlipId } = decodeUnitId(rawUnitId);
      const evaluation = await evaluateCampaignTriplet(env, campaignId, rowId, mlipId, "operator");
      return workflowJson({
        workflow_id: WORKFLOW_ID,
        campaign_id: campaignId,
        unit_id: rawUnitId,
        row_id: rowId,
        mlip_id: mlipId,
        evaluation,
      });
    } catch (e) {
      return workflowError(e instanceof Error ? e.message : String(e), 400);
    }
  },

  inspectCampaign(env, campaignId) {
    return inspectMlipWorkflowCampaign(env, campaignId);
  },

  maintainCampaign(env, campaignId, bodyText) {
    return maintainMlipWorkflowCampaign(env, campaignId, bodyText);
  },

  async recordUnitResult(env, campaignId, rawUnitId, bodyText) {
    const body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
    const result = await recordMlipCampaignResult(env, {
      campaign_id: campaignId,
      cell_id: rawUnitId,
      accuracy_score: typeof body.accuracy_score === "number" ? body.accuracy_score : undefined,
      accuracy_unit: typeof body.accuracy_unit === "string" ? body.accuracy_unit : undefined,
      speed_score: typeof body.speed_score === "number" ? body.speed_score : undefined,
      speed_unit: typeof body.speed_unit === "string" ? body.speed_unit : undefined,
      status:
        body.status === "running" || body.status === "failed" || body.status === "completed"
          ? body.status
          : "completed",
      metrics: typeof body.metrics === "object" && body.metrics !== null && !Array.isArray(body.metrics)
        ? body.metrics as Record<string, unknown>
        : undefined,
      source: "manual",
    });
    return workflowJson({ workflow_id: WORKFLOW_ID, campaign_id: campaignId, unit_id: rawUnitId, ...result });
  },

  async handleLegacyRoute(env, url, method, bodyText) {
    if (url.pathname === "/research/mlip-campaign" && method === "POST") {
      return this.createCampaign(env, bodyText);
    }

    const campaignMatch = url.pathname.match(/^\/research\/mlip-campaign\/([^/]+)$/);
    if (campaignMatch && method === "GET") {
      return this.getCampaign(env, decodeURIComponent(campaignMatch[1]));
    }

    const campaignEnqueueMatch = url.pathname.match(/^\/research\/mlip-campaign\/([^/]+)\/enqueue$/);
    if (campaignEnqueueMatch && method === "POST") {
      return this.enqueueCampaign(env, decodeURIComponent(campaignEnqueueMatch[1]), bodyText);
    }

    const tripletsMatch = url.pathname.match(/^\/research\/mlip-campaign\/([^/]+)\/triplets$/);
    if (tripletsMatch && method === "GET") {
      return this.listUnits(env, decodeURIComponent(tripletsMatch[1]));
    }

    const nextTripletsMatch = url.pathname.match(/^\/research\/mlip-campaign\/([^/]+)\/triplets\/next$/);
    if (nextTripletsMatch && method === "GET") {
      const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "1", 10), 1), 25);
      return this.nextUnits(env, decodeURIComponent(nextTripletsMatch[1]), limit);
    }

    const tripletEnqueueMatch = url.pathname.match(
      /^\/research\/mlip-campaign\/([^/]+)\/triplets\/([^/]+)\/([^/]+)\/enqueue$/,
    );
    if (tripletEnqueueMatch && method === "POST") {
      const campaignId = decodeURIComponent(tripletEnqueueMatch[1]);
      const rowId = decodeURIComponent(tripletEnqueueMatch[2]);
      const mlipId = decodeURIComponent(tripletEnqueueMatch[3]);
      const campaign = await loadCampaign(env, campaignId);
      if (campaign instanceof Response) return campaign;
      const body = JSON.parse(bodyText || "{}") as { dry_run?: boolean };
      return enqueueTriplet(env, campaignId, campaign, rowId, mlipId, body.dry_run);
    }

    const tripletEvaluateMatch = url.pathname.match(
      /^\/research\/mlip-campaign\/([^/]+)\/triplets\/([^/]+)\/([^/]+)\/evaluate$/,
    );
    if (tripletEvaluateMatch && method === "POST") {
      const campaignId = decodeURIComponent(tripletEvaluateMatch[1]);
      const rowId = decodeURIComponent(tripletEvaluateMatch[2]);
      const mlipId = decodeURIComponent(tripletEvaluateMatch[3]);
      const evaluation = await evaluateCampaignTriplet(env, campaignId, rowId, mlipId, "operator");
      return workflowJson({
        workflow_id: WORKFLOW_ID,
        campaign_id: campaignId,
        unit_id: unitId(rowId, mlipId),
        row_id: rowId,
        mlip_id: mlipId,
        evaluation,
      });
    }

    const cellResultMatch = url.pathname.match(/^\/research\/mlip-campaign\/([^/]+)\/cells\/([^/]+)\/result$/);
    if (cellResultMatch && method === "POST") {
      return this.recordUnitResult?.(
        env,
        decodeURIComponent(cellResultMatch[1]),
        decodeURIComponent(cellResultMatch[2]),
        bodyText,
      ) ?? workflowError("Unit result route is not implemented", 501);
    }

    return null;
  },
};
