import type { Env } from "../types";

export const WORKFLOW_JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Internal-Token",
} as const;

export function workflowJson(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: { ...WORKFLOW_JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}

export function workflowError(message: string, status: number): Response {
  return workflowJson({ error: message }, { status });
}

export interface ResearchWorkflowAdapter {
  workflow_id: string;
  label: string;
  describe(): ResearchWorkflowDescriptor;
  createCampaign(env: Env, bodyText: string): Promise<Response>;
  getCampaign(env: Env, campaignId: string): Promise<Response>;
  listUnits(env: Env, campaignId: string): Promise<Response>;
  nextUnits(env: Env, campaignId: string, limit: number): Promise<Response>;
  enqueueCampaign(env: Env, campaignId: string, bodyText: string): Promise<Response>;
  enqueueUnit(env: Env, campaignId: string, unitId: string, bodyText: string): Promise<Response>;
  evaluateUnit(env: Env, campaignId: string, unitId: string, bodyText: string): Promise<Response>;
  inspectCampaign(env: Env, campaignId: string): Promise<WorkflowOpsSnapshot | Response>;
  maintainCampaign?(env: Env, campaignId: string, bodyText: string): Promise<Response>;
  syncPhoenix?(env: Env, campaignId: string, bodyText: string): Promise<Response>;
  recordUnitResult?(env: Env, campaignId: string, unitId: string, bodyText: string): Promise<Response>;
  reportCampaign?(env: Env, campaignId: string, url: URL): Promise<Response>;
  handleLegacyRoute?(env: Env, url: URL, method: string, bodyText: string): Promise<Response | null>;
}

export interface ResearchWorkflowDescriptor {
  workflow_id: string;
  label: string;
  unit_kind: string;
  version: number;
  purpose: string;
  git: {
    owners: string[];
    files: string[];
    checks: string[];
  };
  cloudflare: {
    routes: string[];
    bindings: string[];
    queue_consumers: string[];
  };
  phoenix: {
    lifecycle_spans: string[];
    evaluators: string[];
    annotations: string[];
  };
  extension_contract: {
    adapter_methods: string[];
    evidence_required: string[];
  };
}

export interface WorkflowActionRoute {
  method: "GET" | "POST" | "PATCH";
  path: string;
  body?: Record<string, unknown>;
}

export interface WorkflowAction {
  action_id: string;
  kind:
    | "enqueue_unit"
    | "evaluate_unit"
    | "repair_input"
    | "inspect_failure"
    | "evaluate_hypothesis"
    | "revise_hypothesis"
    | "sync_phoenix"
    | "summarize_campaign";
  label: string;
  reason: string;
  priority: number;
  unit_id?: string;
  route?: WorkflowActionRoute;
  can_auto_execute: boolean;
  surfaces: Array<"git" | "cloudflare" | "phoenix" | "ledger" | "agenda">;
}

export interface WorkflowOpsSnapshot {
  workflow_id: string;
  campaign_id: string;
  generated_at: string;
  state: "ready" | "active" | "needs_input" | "complete" | "failed";
  descriptor: ResearchWorkflowDescriptor;
  counters: Record<string, number>;
  cloudflare: {
    bindings: Record<string, boolean>;
    routes_ready: string[];
  };
  phoenix: {
    configured: boolean;
    project_name: string;
    expected_evaluators: string[];
    expected_annotations: string[];
  };
  git: {
    files: string[];
    checks: string[];
  };
  next_actions: WorkflowAction[];
}
