import type { Env, BenchmarkRecord } from "../types";
import {
  normalizeBenchmarkRecord,
  benchmarkAbsError,
  benchmarkRelativeError,
} from "./benchmarkRecords";
import {
  buildMlipDiscoverySnapshot,
  buildMlipDiscoveryUnits,
  MLIP_DISCOVERY_DESCRIPTOR,
  MLIP_DISCOVERY_WORKFLOW_ID,
  type MlipDiscoveryUnit,
} from "./mlipDiscoveryWorkflowOps";
import { insertWorkflowAgendaTasks } from "./workflowOps";
import {
  workflowError,
  workflowJson,
  type ResearchWorkflowAdapter,
} from "./workflowTypes";

interface CreateDiscoveryCampaignInput {
  campaign_id?: string;
  github_run_id?: string;
  run_url?: string;
  artifact_name?: string;
  records?: unknown[];
}

function campaignIdFromInput(input: CreateDiscoveryCampaignInput): string {
  const explicit = input.campaign_id?.trim();
  if (explicit) return explicit;
  const runId = input.github_run_id?.trim();
  if (runId) return `github:${runId}`;
  return `manual:${new Date().toISOString().replace(/[^0-9A-Za-z]/g, "-")}`;
}

function provenanceCampaignId(record: BenchmarkRecord): string | null {
  const direct = record.provenance.discovery_campaign_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const runId = record.provenance.github_run_id;
  if (typeof runId === "string" && runId.trim()) return `github:${runId.trim()}`;
  if (typeof runId === "number" && Number.isFinite(runId)) return `github:${Math.trunc(runId)}`;
  return null;
}

function normalizeRecords(records: unknown[] | undefined, campaignId: string, input: CreateDiscoveryCampaignInput) {
  return (records ?? [])
    .map((raw) => {
      const record = normalizeBenchmarkRecord(raw);
      if (!record) return null;
      record.provenance = {
        ...record.provenance,
        discovery_campaign_id: campaignId,
        ...(input.github_run_id ? { github_run_id: input.github_run_id } : {}),
        ...(input.run_url ? { github_run_url: input.run_url } : {}),
        ...(input.artifact_name ? { artifact_name: input.artifact_name } : {}),
      };
      return record;
    })
    .filter((record): record is BenchmarkRecord => Boolean(record));
}

function dbRowToRecord(row: Record<string, unknown>): BenchmarkRecord | null {
  return normalizeBenchmarkRecord(row);
}

async function loadCampaignRecords(env: Env, campaignId: string): Promise<BenchmarkRecord[]> {
  const rows = await env.LEDGER.prepare(`
    SELECT record_id, element, potential_id, potential_label, pair_style, property,
           reference, predicted, unit, provenance, agent_id, timestamp
    FROM records
    WHERE json_extract(provenance, '$.discovery_campaign_id') = ?1
       OR json_extract(provenance, '$.github_run_id') = ?2
    ORDER BY element ASC, potential_id ASC, property ASC
    LIMIT 1000
  `).bind(
    campaignId,
    campaignId.startsWith("github:") ? campaignId.slice("github:".length) : campaignId,
  ).all();
  return (rows.results as Record<string, unknown>[])
    .map(dbRowToRecord)
    .filter((record): record is BenchmarkRecord => Boolean(record))
    .filter((record) => provenanceCampaignId(record) === campaignId);
}

function campaignBody(records: BenchmarkRecord[], campaignId: string) {
  const units = buildMlipDiscoveryUnits(records);
  return {
    workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
    campaign_id: campaignId,
    records_total: records.length,
    elements: [...new Set(records.map((record) => record.element))].sort(),
    potentials: [...new Set(records.map((record) => record.potentialId))].sort(),
    units_total: units.length,
    ops_url: `/research/workflows/${MLIP_DISCOVERY_WORKFLOW_ID}/campaigns/${encodeURIComponent(campaignId)}/ops`,
    maintain_url: `/research/workflows/${MLIP_DISCOVERY_WORKFLOW_ID}/campaigns/${encodeURIComponent(campaignId)}/maintain`,
  };
}

function findUnit(records: BenchmarkRecord[], unitId: string): MlipDiscoveryUnit | undefined {
  return buildMlipDiscoveryUnits(records).find((unit) => unit.unit_id === unitId);
}

export const mlipDiscoveryWorkflowAdapter: ResearchWorkflowAdapter = {
  workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
  label: "MLIP elastic benchmark discovery loop",

  describe() {
    return MLIP_DISCOVERY_DESCRIPTOR;
  },

  async createCampaign(_env, bodyText) {
    const body = JSON.parse(bodyText || "{}") as CreateDiscoveryCampaignInput;
    const campaignId = campaignIdFromInput(body);
    const records = normalizeRecords(body.records, campaignId, body);
    const snapshot = buildMlipDiscoverySnapshot(_env, campaignId, records);
    return workflowJson({
      ...campaignBody(records, campaignId),
      state: snapshot.state,
      counters: snapshot.counters,
      next_actions: snapshot.next_actions.slice(0, 8),
    }, { status: 202 });
  },

  async getCampaign(env, campaignId) {
    const records = await loadCampaignRecords(env, campaignId);
    return workflowJson({
      ...campaignBody(records, campaignId),
      snapshot: buildMlipDiscoverySnapshot(env, campaignId, records),
    });
  },

  async listUnits(env, campaignId) {
    const records = await loadCampaignRecords(env, campaignId);
    return workflowJson({
      workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
      campaign_id: campaignId,
      units: buildMlipDiscoveryUnits(records),
    });
  },

  async nextUnits(env, campaignId, limit) {
    const records = await loadCampaignRecords(env, campaignId);
    return workflowJson({
      workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
      campaign_id: campaignId,
      units: buildMlipDiscoveryUnits(records).slice(0, limit),
    });
  },

  async enqueueCampaign(_env, campaignId) {
    return workflowError(
      `Discovery campaign '${campaignId}' does not dispatch compute directly; call /maintain to queue agenda tasks.`,
      400,
    );
  },

  async enqueueUnit(_env, campaignId) {
    return workflowError(
      `Discovery campaign '${campaignId}' does not dispatch compute directly; agenda tasks own follow-up execution.`,
      400,
    );
  },

  async evaluateUnit(env, campaignId, unitId) {
    const records = await loadCampaignRecords(env, campaignId);
    const unit = findUnit(records, unitId);
    if (!unit) return workflowError(`Discovery unit '${unitId}' not found`, 404);
    const related = records.filter((record) => {
      if (unit.sentinel_kind === "summary") return true;
      return record.element === unit.element &&
        (unit.potential_id === "multi-mlip" || record.potentialId === unit.potential_id) &&
        (!unit.property || record.property === unit.property);
    });
    return workflowJson({
      workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
      campaign_id: campaignId,
      unit,
      evaluator_name: `mlip_discovery.${unit.sentinel_kind}`,
      verdict: unit.sentinel_kind === "stability_violation" ? "inspect_before_promotion" : "follow_up",
      related_records: related.map((record) => ({
        record_id: record.recordId,
        element: record.element,
        potential_id: record.potentialId,
        property: record.property,
        predicted: record.predicted,
        reference: record.reference,
        abs_error: benchmarkAbsError(record),
        relative_error: benchmarkRelativeError(record),
      })),
    });
  },

  async inspectCampaign(env, campaignId) {
    const records = await loadCampaignRecords(env, campaignId);
    return buildMlipDiscoverySnapshot(env, campaignId, records);
  },

  async maintainCampaign(env, campaignId, bodyText) {
    const body = JSON.parse(bodyText || "{}") as { mode?: "agenda"; limit?: number };
    const mode = body.mode ?? "agenda";
    if (mode !== "agenda") return workflowError("Only agenda maintenance is implemented for this workflow", 400);
    const records = await loadCampaignRecords(env, campaignId);
    const snapshot = buildMlipDiscoverySnapshot(env, campaignId, records);
    const agenda = await insertWorkflowAgendaTasks(env, snapshot, body.limit ?? 10);
    return workflowJson({
      workflow_id: MLIP_DISCOVERY_WORKFLOW_ID,
      campaign_id: campaignId,
      mode,
      agenda,
      state: snapshot.state,
      counters: snapshot.counters,
      next_actions: snapshot.next_actions.slice(0, Math.max(1, Math.trunc(body.limit ?? 10))),
    });
  },
};
