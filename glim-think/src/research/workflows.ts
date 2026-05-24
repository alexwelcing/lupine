import type { Env } from "../types";
import {
  getResearchWorkflowAdapter,
  listResearchWorkflowAdapters,
  listResearchWorkflowDescriptors,
} from "./workflowRegistry";
import {
  workflowError,
  workflowJson,
} from "./workflowTypes";

function decodePathSegment(value: string | undefined): string {
  return decodeURIComponent(value ?? "");
}

function parseLimit(url: URL, fallback = 1, max = 25): number {
  return Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? String(fallback), 10), 1), max);
}

export async function handleResearchWorkflowRoute(
  env: Env,
  url: URL,
  method: string,
  bodyText: string,
): Promise<Response | null> {
  if (url.pathname === "/research/workflows" && method === "GET") {
    return workflowJson({ workflows: listResearchWorkflowDescriptors() });
  }

  const workflowDescriptorMatch = url.pathname.match(/^\/research\/workflows\/([^/]+)$/);
  if (workflowDescriptorMatch && method === "GET") {
    const workflowId = decodePathSegment(workflowDescriptorMatch[1]);
    const adapter = getResearchWorkflowAdapter(workflowId);
    if (!adapter) return workflowError(`Workflow '${workflowId}' not found`, 404);
    return workflowJson({ workflow: adapter.describe() });
  }

  const campaignMatch = url.pathname.match(/^\/research\/workflows\/([^/]+)\/campaigns(?:\/([^/]+))?$/);
  if (campaignMatch) {
    const workflowId = decodePathSegment(campaignMatch[1]);
    const campaignId = campaignMatch[2] ? decodePathSegment(campaignMatch[2]) : "";
    const adapter = getResearchWorkflowAdapter(workflowId);
    if (!adapter) return workflowError(`Workflow '${workflowId}' not found`, 404);
    if (!campaignId && method === "POST") return adapter.createCampaign(env, bodyText);
    if (campaignId && method === "GET") return adapter.getCampaign(env, campaignId);
    return workflowError("Unsupported workflow campaign route", 405);
  }

  const campaignActionMatch = url.pathname.match(/^\/research\/workflows\/([^/]+)\/campaigns\/([^/]+)\/([^/]+)$/);
  if (campaignActionMatch) {
    const workflowId = decodePathSegment(campaignActionMatch[1]);
    const campaignId = decodePathSegment(campaignActionMatch[2]);
    const action = decodePathSegment(campaignActionMatch[3]);
    const adapter = getResearchWorkflowAdapter(workflowId);
    if (!adapter) return workflowError(`Workflow '${workflowId}' not found`, 404);
    if (action === "units" && method === "GET") return adapter.listUnits(env, campaignId);
    if (action === "enqueue" && method === "POST") return adapter.enqueueCampaign(env, campaignId, bodyText);
    if (action === "ops" && method === "GET") {
      const snapshot = await adapter.inspectCampaign(env, campaignId);
      return snapshot instanceof Response ? snapshot : workflowJson(snapshot);
    }
    if (action === "report" && method === "GET" && adapter.reportCampaign) {
      return adapter.reportCampaign(env, campaignId, url);
    }
    if (action === "maintain" && method === "POST" && adapter.maintainCampaign) {
      return adapter.maintainCampaign(env, campaignId, bodyText);
    }
    if (action === "phoenix-sync" && method === "POST" && adapter.syncPhoenix) {
      return adapter.syncPhoenix(env, campaignId, bodyText);
    }
    return workflowError("Unsupported workflow campaign action", 405);
  }

  const nextUnitsMatch = url.pathname.match(/^\/research\/workflows\/([^/]+)\/campaigns\/([^/]+)\/units\/next$/);
  if (nextUnitsMatch && method === "GET") {
    const workflowId = decodePathSegment(nextUnitsMatch[1]);
    const campaignId = decodePathSegment(nextUnitsMatch[2]);
    const adapter = getResearchWorkflowAdapter(workflowId);
    if (!adapter) return workflowError(`Workflow '${workflowId}' not found`, 404);
    return adapter.nextUnits(env, campaignId, parseLimit(url));
  }

  const unitActionMatch = url.pathname.match(
    /^\/research\/workflows\/([^/]+)\/campaigns\/([^/]+)\/units\/([^/]+)\/([^/]+)$/,
  );
  if (unitActionMatch) {
    const workflowId = decodePathSegment(unitActionMatch[1]);
    const campaignId = decodePathSegment(unitActionMatch[2]);
    const unitId = decodePathSegment(unitActionMatch[3]);
    const action = decodePathSegment(unitActionMatch[4]);
    const adapter = getResearchWorkflowAdapter(workflowId);
    if (!adapter) return workflowError(`Workflow '${workflowId}' not found`, 404);
    if (action === "enqueue" && method === "POST") return adapter.enqueueUnit(env, campaignId, unitId, bodyText);
    if (action === "evaluate" && method === "POST") return adapter.evaluateUnit(env, campaignId, unitId, bodyText);
    if (action === "result" && method === "POST" && adapter.recordUnitResult) {
      return adapter.recordUnitResult(env, campaignId, unitId, bodyText);
    }
    return workflowError("Unsupported workflow unit action", 405);
  }

  for (const adapter of listResearchWorkflowAdapters()) {
    const legacy = await adapter.handleLegacyRoute?.(env, url, method, bodyText);
    if (legacy) return legacy;
  }

  return null;
}
