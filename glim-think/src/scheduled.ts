/**
 * Scheduled handler: nightly fleet sweep + diary snapshot to R2.
 *
 * Cron trigger: 0 7 * * * (07:00 UTC = ~midnight US Pacific).
 *
 * Flow:
 *   1. Invoke FleetOrchestrator.runFleet() across the default 15 elements.
 *   2. After completion, gather summary stats from D1.
 *   3. Generate a markdown diary snapshot.
 *   4. Write it to R2 at `diary/snapshots/YYYY-MM-DD.md` (UTC date).
 *   5. Insert a `deployments` row tagged `service='cron-fleet'`.
 */
import type { Env } from "./types";

const FLEET_ELEMENTS = [
  "Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
  "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta",
];

const FLEET_DO_NAME = "fleet-main-v2";

interface FleetRunResult {
  fleets?: number;
  results?: Array<{ element: string; status: string; records?: number; error?: string }>;
}

interface CountRow {
  n: number;
}

/**
 * Format a Date as YYYY-MM-DD in UTC.
 */
function utcDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Run the FleetOrchestrator over the default element list.
 */
async function runNightlyFleet(env: Env): Promise<FleetRunResult> {
  const id = env.FLEET_ORCHESTRATOR.idFromName(FLEET_DO_NAME);
  const stub = env.FLEET_ORCHESTRATOR.get(id);
  const response = await stub.fetch(new Request("http://internal/fleet/run", {
    method: "POST",
    body: JSON.stringify({ elements: FLEET_ELEMENTS, iterations: 1 }),
  }));
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fleet run returned ${response.status}: ${body.slice(0, 500)}`);
  }
  return await response.json() as FleetRunResult;
}

/**
 * Pull lightweight summary counts so the diary entry has substance.
 */
async function gatherSnapshotStats(env: Env): Promise<{
  totalRecords: number;
  totalClaims: number;
  pendingHypotheses: number;
  manifoldFindings: Array<{ family: string; element: string; pr: number }>;
}> {
  const [recordsRes, claimsRes, pendingRes, manifoldRes] = await Promise.all([
    env.LEDGER.prepare("SELECT COUNT(*) as n FROM records").all(),
    env.LEDGER.prepare("SELECT COUNT(*) as n FROM claims").all(),
    env.LEDGER.prepare(
      "SELECT COUNT(*) as n FROM pending_experiments WHERE status = 'pending'",
    ).all(),
    env.LEDGER.prepare(
      `SELECT family, element, pr
       FROM manifold_runs
       WHERE timestamp >= datetime('now', '-1 day')
       ORDER BY timestamp DESC
       LIMIT 10`,
    ).all().catch((e) => {
      console.warn("manifold_runs query failed (may not exist yet):", e);
      return { results: [] as unknown[] };
    }),
  ]);

  const readN = (res: { results: unknown[] }): number => {
    const row = res.results[0] as unknown as CountRow | undefined;
    return typeof row?.n === "number" ? row.n : 0;
  };

  return {
    totalRecords: readN(recordsRes),
    totalClaims: readN(claimsRes),
    pendingHypotheses: readN(pendingRes),
    manifoldFindings: (manifoldRes.results ?? []) as Array<{
      family: string;
      element: string;
      pr: number;
    }>,
  };
}

/**
 * Build the markdown body for the snapshot.
 */
function buildSnapshotMarkdown(args: {
  dateKey: string;
  startedAt: string;
  completedAt: string;
  fleet: FleetRunResult;
  stats: Awaited<ReturnType<typeof gatherSnapshotStats>>;
}): string {
  const { dateKey, startedAt, completedAt, fleet, stats } = args;
  const fleetResults = fleet.results ?? [];
  const okCount = fleetResults.filter((r) => r.status === "complete").length;
  const failCount = fleetResults.filter((r) => r.status !== "complete").length;

  let md = `---\n`;
  md += `type: nightly-fleet-snapshot\n`;
  md += `date: ${dateKey}\n`;
  md += `started_at: ${startedAt}\n`;
  md += `completed_at: ${completedAt}\n`;
  md += `service: cron-fleet\n`;
  md += `---\n\n`;

  md += `# Nightly Fleet Sweep — ${dateKey}\n\n`;
  md += `Cron sweep ran across ${fleetResults.length} element(s); `;
  md += `${okCount} completed, ${failCount} failed.\n\n`;

  md += `## Ledger Snapshot\n\n`;
  md += `- **Total records:** ${stats.totalRecords}\n`;
  md += `- **Total claims:** ${stats.totalClaims}\n`;
  md += `- **Hypotheses still pending:** ${stats.pendingHypotheses}\n\n`;

  md += `## Per-Element Fleet Results\n\n`;
  if (fleetResults.length === 0) {
    md += `_No fleet results returned._\n\n`;
  } else {
    md += `| Element | Status | Records |\n|---------|--------|---------|\n`;
    for (const r of fleetResults) {
      const records = typeof r.records === "number" ? String(r.records) : "—";
      const status = r.status === "complete" ? "complete" : `${r.status}${r.error ? `: ${r.error.slice(0, 80)}` : ""}`;
      md += `| ${r.element} | ${status} | ${records} |\n`;
    }
    md += `\n`;
  }

  md += `## New Manifold Findings (last 24h)\n\n`;
  if (stats.manifoldFindings.length === 0) {
    md += `_No new manifold runs recorded._\n`;
  } else {
    md += `| Family | Element | Participation Ratio |\n|--------|---------|---------------------|\n`;
    for (const f of stats.manifoldFindings) {
      md += `| ${f.family} | ${f.element} | ${typeof f.pr === "number" ? f.pr.toFixed(4) : "—"} |\n`;
    }
  }

  return md;
}

/**
 * Insert a row in the deployments table to record this cron run.
 *
 * The deployments schema requires repo, workflow, run_id, status, service.
 * For cron we synthesize sensible stub values.
 */
async function recordDeployment(env: Env, args: {
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  runId: string;
  logs: string;
}): Promise<void> {
  try {
    await env.LEDGER.prepare(
      `INSERT INTO deployments (repo, workflow, run_id, status, commit_sha, branch, service, run_url, started_at, completed_at, logs)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    ).bind(
      "glim-think",
      "cron-nightly-fleet",
      args.runId,
      args.status,
      null,
      null,
      "cron-fleet",
      null,
      args.startedAt,
      args.completedAt,
      args.logs,
    ).run();
  } catch (e) {
    console.error("Failed to insert deployments row:", e);
  }
}

/**
 * The actual long-running work driven by ctx.waitUntil().
 */
async function runScheduledSweep(event: ScheduledController, env: Env): Promise<void> {
  const startedDate = new Date(event.scheduledTime);
  const startedAt = startedDate.toISOString();
  const dateKey = utcDateKey(startedDate);
  const runId = `cron-fleet-${dateKey}-${startedDate.getTime()}`;

  console.log(`[cron-fleet] start cron=${event.cron} run_id=${runId}`);

  try {
    const fleet = await runNightlyFleet(env);
    const stats = await gatherSnapshotStats(env);

    const completedAt = new Date().toISOString();
    const markdown = buildSnapshotMarkdown({
      dateKey,
      startedAt,
      completedAt,
      fleet,
      stats,
    });

    const snapshotKey = `diary/snapshots/${dateKey}.md`;
    await env.ARTIFACTS.put(snapshotKey, markdown, {
      httpMetadata: { contentType: "text/markdown" },
      customMetadata: {
        type: "nightly-snapshot",
        date: dateKey,
        service: "cron-fleet",
      },
    });

    const fleetResults = fleet.results ?? [];
    const okCount = fleetResults.filter((r) => r.status === "complete").length;
    const failCount = fleetResults.length - okCount;
    const logs = `fleet ok=${okCount} failed=${failCount} records=${stats.totalRecords} claims=${stats.totalClaims} pending=${stats.pendingHypotheses} snapshot=${snapshotKey}`;

    await recordDeployment(env, {
      status: "completed",
      startedAt,
      completedAt,
      runId,
      logs,
    });

    console.log(`[cron-fleet] success ${logs}`);
  } catch (e) {
    const completedAt = new Date().toISOString();
    const logs = `Fleet sweep failed: ${String(e).slice(0, 800)}`;
    console.error(`[cron-fleet] ${logs}`);
    await recordDeployment(env, {
      status: "failed",
      startedAt,
      completedAt,
      runId,
      logs,
    });
  }
}

/**
 * Cloudflare Workers `scheduled` entry point.
 * Defers the heavy work to ctx.waitUntil so the trigger can return promptly.
 */
export async function scheduled(
  event: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(runScheduledSweep(event, env));
}

/**
 * Lab broadcast — emits a timestamped snapshot of the lab state for the
 * dashboard's `/broadcasts/trigger` endpoint and recurring lab-broadcast
 * crons. The richer implementation referenced from server.ts before
 * this file existed never landed; this minimal shim unblocks the main
 * build by returning a structurally complete broadcast payload sourced
 * from D1 when available.
 */
export interface LabBroadcast {
  id: string;
  source: string;
  timestamp: string;
  summary: {
    records: number;
    claims: number;
    hypotheses: number;
    pending_critiques: number;
  };
}

export async function createLabBroadcast(
  env: Env,
  source: string,
): Promise<LabBroadcast> {
  const now = new Date();
  const id = `broadcast-${utcDateKey(now)}-${now.getTime()}`;

  const summary = {
    records: 0,
    claims: 0,
    hypotheses: 0,
    pending_critiques: 0,
  };

  // Best-effort D1 summary; missing tables / unbound DB simply leave zeros.
  try {
    const db = (env as unknown as { DB?: D1Database }).DB;
    if (db) {
      const safe = async (sql: string): Promise<number> => {
        try {
          const row = await db.prepare(sql).first<CountRow>();
          return row?.n ?? 0;
        } catch {
          return 0;
        }
      };
      summary.records = await safe("SELECT COUNT(*) AS n FROM records");
      summary.claims = await safe("SELECT COUNT(*) AS n FROM claims");
      summary.hypotheses = await safe(
        "SELECT COUNT(*) AS n FROM hypotheses WHERE status = 'proposed'",
      );
      summary.pending_critiques = await safe(
        "SELECT COUNT(*) AS n FROM critiques WHERE status = 'pending'",
      );
    }
  } catch {
    // Fail closed; never let a broadcast call throw at the worker boundary.
  }

  return {
    id,
    source,
    timestamp: now.toISOString(),
    summary,
  };
}
