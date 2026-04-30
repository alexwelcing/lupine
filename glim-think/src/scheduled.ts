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
 * Cloudflare Workers `scheduled` entry point — dispatches by cron expression
 * so multiple sibling jobs coexist:
 *   - "0 7 * * *"     nightly fleet sweep + diary snapshot
 *   - "0 9 * * MON"   weekly critique drain (originally PR #12)
 *
 * Defers heavy work to `ctx.waitUntil` so the trigger returns promptly.
 */
export async function scheduled(
  event: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  if (event.cron === "0 9 * * MON") {
    ctx.waitUntil(drainCritiques(env, ctx));
    return;
  }
  // Default: nightly sweep on "0 7 * * *" and any unknown cron (defensive —
  // better to run the safe sweep than silently no-op).
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
const CRITIQUE_DRAIN_LIMIT = 10;
const CRITIQUE_DRAIN_SERVICE = "cron-critique-drain";

interface PendingCritique {
  id: string;
  source: string | null;
  question: string;
  target_hypothesis_id: string | null;
}

/**
 * Top-level dispatcher. Routes by cron expression so multiple sibling
 * units can coexist in the same scheduled handler.
export async function drainCritiques(
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const startedAt = new Date().toISOString();
  const runId = `critique-drain-${Date.now()}`;
  let processed = 0;
  let failed = 0;
  let outcome: "success" | "failure" | "skipped" = "success";
  const errors: string[] = [];

  let pending: PendingCritique[] = [];
  try {
    const rows = await env.LEDGER.prepare(
      `SELECT id, source, question, target_hypothesis_id
         FROM critiques
        WHERE status = 'pending'
        LIMIT ?1`,
    )
      .bind(CRITIQUE_DRAIN_LIMIT)
      .all();
    pending = (rows.results as unknown as PendingCritique[]) ?? [];
  } catch (e) {
    const msg = String(e);
    // critiques table belongs to unit 2; if it isn't merged yet, skip cleanly.
    if (/no such table/i.test(msg)) {
      console.log(
        "[critique-drain] critiques table not present yet — skipping",
      );
      outcome = "skipped";
      await logDeployment(env, {
        runId,
        startedAt,
        status: outcome,
        logs: { reason: "critiques_table_missing", processed, failed },
      });
      return;
    }
    // Unknown D1 failure — record and bail.
    console.error("[critique-drain] failed to query critiques:", e);
    outcome = "failure";
    errors.push(`query: ${msg}`);
    await logDeployment(env, {
      runId,
      startedAt,
      status: outcome,
      logs: { processed, failed, errors },
    });
    return;
  }

  if (pending.length === 0) {
    console.log("[critique-drain] no pending critiques");
    await logDeployment(env, {
      runId,
      startedAt,
      status: "success",
      logs: { processed: 0, failed: 0, message: "no_pending_critiques" },
    });
    return;
  }

  for (const critique of pending) {
    try {
      const responseMd = await synthesizeCritiqueResponse(env, critique);
      const artifactKey = `critiques/${critique.id}.md`;
      await env.ARTIFACTS.put(artifactKey, responseMd, {
        httpMetadata: { contentType: "text/markdown" },
        customMetadata: {
          critiqueId: critique.id,
          source: critique.source ?? "unknown",
        },
      });
      await env.LEDGER.prepare(
        `UPDATE critiques
            SET status = 'completed',
                response_md = ?1,
                response_artifact_key = ?2,
                completed_at = ?3
          WHERE id = ?4`,
      )
        .bind(responseMd, artifactKey, new Date().toISOString(), critique.id)
        .run();
      processed++;
    } catch (e) {
      failed++;
      const msg = `${critique.id}: ${String(e)}`;
      errors.push(msg);
      console.error("[critique-drain] critique processing failed:", msg);
    }
  }

  if (failed > 0 && processed === 0) outcome = "failure";

  await logDeployment(env, {
    runId,
    startedAt,
    status: outcome,
    logs: { processed, failed, total: pending.length, errors: errors.slice(0, 5) },
  });
}

/**
 * Dispatch a single critique to the Orchestrator agent and return its
 * markdown response. The Orchestrator will (when wired up) delegate to
 * the Theorist and — if unit 5's Literaturist exists — to that agent
 * for citation lookup.
 */
async function synthesizeCritiqueResponse(
  env: Env,
  critique: PendingCritique,
): Promise<string> {
  const prompt = buildCritiquePrompt(critique);
  const id = env.ORCHESTRATOR.idFromName(`critique-drain-${critique.id}`);
  const stub = env.ORCHESTRATOR.get(id) as DurableObjectStub & {
    chat: (input: { prompt: string }) => Promise<{ text?: string; response?: string }>;
  };

  const result = await stub.chat({ prompt });
  const text = result?.text ?? result?.response ?? "";
  if (!text || !text.trim()) {
    throw new Error("orchestrator_empty_response");
  }
  return text.trim();
}

function buildCritiquePrompt(critique: PendingCritique): string {
  const targetLine = critique.target_hypothesis_id
    ? `\nTarget hypothesis: ${critique.target_hypothesis_id}`
    : "";
  const sourceLine = critique.source ? `\nReviewer source: ${critique.source}` : "";
  return [
    "Synthesize a peer-review response for the following critique.",
    "Draw on the D1 ledger evidence (records, claims, theories, pending_experiments)",
    "and, if available, cite recent literature via the Literaturist sub-agent.",
    "Format the answer as a concise (3-5 paragraph) markdown reply suitable for an IMMI revision letter.",
    `${sourceLine}${targetLine}`,
    "",
    "Critique:",
    critique.question,
  ].join("\n");
}

interface DeploymentLog {
  runId: string;
  startedAt: string;
  status: "success" | "failure" | "skipped";
  logs: Record<string, unknown>;
}

/**
 * Insert a row into `deployments` so the ops dashboard surfaces this
 * cron run. Best-effort: if the deployments table is missing (very
 * early in repo lifecycle) we just log and continue.
 */
async function logDeployment(env: Env, entry: DeploymentLog): Promise<void> {
  try {
    await env.LEDGER.prepare(
      `INSERT INTO deployments
         (repo, workflow, run_id, status, service, started_at, completed_at, logs)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
      .bind(
        "glim-think",
        "scheduled",
        entry.runId,
        entry.status,
        CRITIQUE_DRAIN_SERVICE,
        entry.startedAt,
        new Date().toISOString(),
        JSON.stringify(entry.logs),
      )
      .run();
  } catch (e) {
    console.error("[critique-drain] failed to log deployment row:", e);
  }
}
