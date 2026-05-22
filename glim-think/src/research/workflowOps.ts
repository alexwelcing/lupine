import { ensureAgendaSchema } from "../agenda";
import type { Env } from "../types";
import type {
  ResearchWorkflowDescriptor,
  WorkflowAction,
  WorkflowOpsSnapshot,
} from "./workflowTypes";

export function workflowRuntimeContext(
  env: Env,
  descriptor: ResearchWorkflowDescriptor,
): Pick<WorkflowOpsSnapshot, "cloudflare" | "phoenix" | "git"> {
  const phoenixEndpoint = env.PHOENIX_COLLECTOR_ENDPOINT?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  const phoenixApiKey = env.PHOENIX_API_KEY?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  return {
    cloudflare: {
      bindings: {
        LEDGER: Boolean(env.LEDGER),
        RESEARCH_QUEUE: Boolean(env.RESEARCH_QUEUE),
        ARTIFACTS: Boolean(env.ARTIFACTS),
        CONFIG: Boolean(env.CONFIG),
        MLIP_BASELINE_GRID: Boolean(env.MLIP_BASELINE_GRID),
        TASKS_CONSUMER_URL: Boolean(env.TASKS_CONSUMER_URL?.trim()),
      },
      routes_ready: descriptor.cloudflare.routes,
    },
    phoenix: {
      configured: Boolean(phoenixEndpoint && phoenixApiKey),
      project_name: env.PHOENIX_PROJECT_NAME?.trim().replace(/^['"]|['"]$/g, "") || "glim-think",
      expected_evaluators: descriptor.phoenix.evaluators,
      expected_annotations: descriptor.phoenix.annotations,
    },
    git: {
      files: descriptor.git.files,
      checks: descriptor.git.checks,
    },
  };
}

export function workflowActionPath(
  workflowId: string,
  campaignId: string,
  unitId: string,
  action: "enqueue" | "evaluate" | "result",
): string {
  return [
    "/research/workflows",
    encodeURIComponent(workflowId),
    "campaigns",
    encodeURIComponent(campaignId),
    "units",
    encodeURIComponent(unitId),
    action,
  ].join("/");
}

export function summarizeActionKinds(actions: WorkflowAction[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const action of actions) {
    counts[action.kind] = (counts[action.kind] ?? 0) + 1;
  }
  return counts;
}

export async function insertWorkflowAgendaTasks(
  env: Env,
  snapshot: WorkflowOpsSnapshot,
  limit = 10,
): Promise<{ attempted: number; task_ids: string[] }> {
  await ensureAgendaSchema(env);
  const actions = snapshot.next_actions
    .filter((action) => action.can_auto_execute)
    .slice(0, Math.max(1, Math.trunc(limit)));
  const taskIds: string[] = [];

  for (const action of actions) {
    const taskId = [
      "workflow",
      snapshot.workflow_id,
      snapshot.campaign_id,
      action.action_id,
    ].join(":");
    await env.LEDGER.prepare(`
      INSERT OR IGNORE INTO intelligence_tasks
      (task_id, title, domain, specialty, horizon, priority, payload, due_at)
      VALUES (?1, ?2, ?3, ?4, 'now', ?5, ?6, datetime('now', '+2 hours'))
    `).bind(
      taskId,
      action.label,
      `workflow:${snapshot.workflow_id}`,
      action.kind === "evaluate_unit" ? "verification" : "experiment",
      action.priority,
      JSON.stringify({
        workflow_id: snapshot.workflow_id,
        campaign_id: snapshot.campaign_id,
        action,
        phoenix: snapshot.phoenix,
        cloudflare: snapshot.cloudflare,
      }),
    ).run();
    taskIds.push(taskId);
  }

  return { attempted: taskIds.length, task_ids: taskIds };
}
