/**
 * Auto-iterate — lean-gate-directed research deepening, in-worker.
 *
 * Replaces the external "auto research deepening" routine that called
 * /admin/lean-status + /admin/iterate from a sandboxed agent (whose
 * egress policy could block the worker host). The same algorithm now
 * runs inside the worker on a cron, so the loop keeps moving with no
 * external caller at all.
 *
 * Each run:
 *   1. Snapshot all active hypotheses via leanStatusOverview (cheap).
 *   2. Pick the hypothesis with the most momentum that is NOT yet
 *      saturated on high-relevance insights (rules below).
 *   3. Run iterateOnHypothesis on it (bounded rounds).
 *   4. Write a markdown report to R2 under diary/auto-iterate/ and a
 *      deployments row (service='cron-auto-iterate') for the dashboard.
 *   5. If the lean-readiness gate passes, persist a `reinforcement`
 *      research hit proposing a Lean formalization attempt — that's the
 *      surface operators already triage.
 */
import type { Env } from "../types";
import {
  iterateOnHypothesis,
  leanStatusOverview,
  type IterateResult,
  type LeanStatusEntry,
} from "./insights";
import { persistHits } from "./hits";

export interface AutoIteratePick {
  hypothesis_id: string;
  hypothesis_title: string;
  reason: string;
  score: number;
}

export interface AutoIterateReport {
  picked: AutoIteratePick | null;
  skipped_reason: string | null;
  result: IterateResult | null;
  lean_ready: boolean;
  report_key: string | null;
  hit_ids: string[];
}

function momentumScore(h: LeanStatusEntry): number {
  return h.high_relevance_count * 10 + h.insight_count + (h.confidence ?? 0) * 5;
}

/**
 * Target selection, in priority order:
 *   a. Drop refuted/confirmed hypotheses (already settled).
 *   b. Score by momentum: high_rel*10 + insights + confidence*5.
 *   c. Among the top 3 by score, take the FEWEST high-relevance insights —
 *      deepen the most-progressed hypothesis that isn't saturated yet.
 *   d. Ties break toward the lower insight_count (rotates the portfolio).
 *   e. If every eligible hypothesis already has >= 5 high-relevance
 *      insights, take the lowest confidence (most residual uncertainty).
 */
export function pickAutoIterateTarget(
  entries: LeanStatusEntry[],
): AutoIteratePick | null {
  const eligible = entries.filter(
    (h) => h.status !== "refuted" && h.status !== "confirmed",
  );
  if (eligible.length === 0) return null;

  const allSaturated = eligible.every((h) => h.high_relevance_count >= 5);
  if (allSaturated) {
    const target = [...eligible].sort(
      (a, b) => (a.confidence ?? 0) - (b.confidence ?? 0),
    )[0];
    return {
      hypothesis_id: target.hypothesis_id,
      hypothesis_title: target.hypothesis_title,
      score: momentumScore(target),
      reason: `all ${eligible.length} eligible saturated (>=5 hi-rel); lowest confidence ${target.confidence ?? 0}`,
    };
  }

  const top = [...eligible]
    .sort((a, b) => momentumScore(b) - momentumScore(a))
    .slice(0, 3);
  const target = [...top].sort(
    (a, b) =>
      a.high_relevance_count - b.high_relevance_count ||
      a.insight_count - b.insight_count,
  )[0];
  return {
    hypothesis_id: target.hypothesis_id,
    hypothesis_title: target.hypothesis_title,
    score: momentumScore(target),
    reason: `top-3 momentum (score ${momentumScore(target).toFixed(1)}), least saturated (${target.high_relevance_count} hi-rel, ${target.insight_count} insights)`,
  };
}

function utcStampKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${day}-${h}`;
}

function buildReportMarkdown(args: {
  startedAt: string;
  pick: AutoIteratePick;
  result: IterateResult;
}): string {
  const { startedAt, pick, result } = args;
  const rounds = result.rounds;
  const first = rounds[0];
  const last = rounds[rounds.length - 1];
  const gate = result.lean_readiness;
  const gatesPassed = Object.values(gate.checklist).filter(Boolean).length;
  const failing = Object.entries(gate.checklist)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  const followUps = last?.follow_up_queries ?? [];

  let md = "";
  if (gate.ready) {
    md += `⭐⭐⭐ LEAN-READY HYPOTHESIS DETECTED ⭐⭐⭐\n\n`;
    md += `All 5 gates passed — consider a Lean formalization attempt.\n\n`;
  }
  md += `# Auto-iterate — ${startedAt}\n\n`;
  md += `**Target:** ${pick.hypothesis_id}\n`;
  md += `**Title:** ${pick.hypothesis_title.slice(0, 120)}\n`;
  md += `**Pick reason:** ${pick.reason}\n\n`;
  md += `## Rounds (${rounds.length})\n\n`;
  for (const r of rounds) {
    md += `- R${r.round}: verdict=${r.verdict} conf=${r.confidence ?? "—"} harvested=${r.papers_harvested_this_round} comprehended=${r.papers_comprehended_this_round}\n`;
  }
  md += `\nConverged: ${result.converged} (${result.convergence_reason})\n\n`;
  md += `## Delta\n\n`;
  md += `- Papers added: ${result.total_papers_added}\n`;
  md += `- Insights added: ${result.total_insights_added}\n`;
  md += `- Verdict: ${first && last && first.verdict !== last.verdict ? `${first.verdict} → ${last.verdict}` : `stable (${last?.verdict ?? "—"})`}\n`;
  md += `- Confidence: ${first?.confidence ?? "—"} → ${last?.confidence ?? "—"}\n`;
  md += `- Tokens spent: ${result.total_tokens_spent}\n\n`;
  md += `## Lean readiness\n\n`;
  md += `- Ready: ${gate.ready}\n`;
  md += `- Gates passed: ${gatesPassed}/5\n`;
  if (failing.length > 0) md += `- Failing: ${failing.join(", ")}\n`;
  for (const reason of gate.reasons) md += `- ${reason}\n`;
  md += `\n## Follow-up queries proposed\n\n`;
  if (followUps.length === 0) {
    md += `_None — loop converged or query space exhausted._\n`;
  } else {
    for (const q of followUps) md += `- ${q}\n`;
  }
  return md;
}

async function recordAutoIterateDeployment(env: Env, args: {
  status: "completed" | "failed";
  startedAt: string;
  runId: string;
  logs: string;
}): Promise<void> {
  try {
    await env.LEDGER.prepare(
      `INSERT INTO deployments (repo, workflow, run_id, status, service, started_at, completed_at, logs)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    ).bind(
      "glim-think",
      "cron-auto-iterate",
      args.runId,
      args.status,
      "cron-auto-iterate",
      args.startedAt,
      new Date().toISOString(),
      args.logs,
    ).run();
  } catch (e) {
    console.error("[auto-iterate] failed to insert deployments row:", e);
  }
}

export async function runAutoIterate(
  env: Env,
  opts?: {
    max_rounds?: number;
    papers_per_query?: number;
    sources?: string[];
  },
): Promise<AutoIterateReport> {
  const started = new Date();
  const startedAt = started.toISOString();
  const runId = `auto-iterate-${started.getTime()}`;

  const overview = await leanStatusOverview(env);
  const pick = pickAutoIterateTarget(overview);
  if (!pick) {
    const logs = "no eligible hypotheses (all refuted/confirmed or none active)";
    console.log(`[auto-iterate] ${logs}`);
    await recordAutoIterateDeployment(env, { status: "completed", startedAt, runId, logs });
    return {
      picked: null,
      skipped_reason: logs,
      result: null,
      lean_ready: false,
      report_key: null,
      hit_ids: [],
    };
  }

  console.log(`[auto-iterate] target=${pick.hypothesis_id} reason="${pick.reason}"`);

  try {
    const result = await iterateOnHypothesis(env, {
      hypothesis_id: pick.hypothesis_id,
      max_rounds: opts?.max_rounds ?? 2,
      papers_per_query: opts?.papers_per_query ?? 3,
      sources: opts?.sources ?? ["openalex", "arxiv"],
    });

    const reportKey = `diary/auto-iterate/${utcStampKey(started)}.md`;
    await env.ARTIFACTS.put(reportKey, buildReportMarkdown({ startedAt, pick, result }), {
      httpMetadata: { contentType: "text/markdown" },
      customMetadata: {
        type: "auto-iterate-report",
        hypothesis_id: pick.hypothesis_id,
        lean_ready: String(result.lean_readiness.ready),
      },
    });

    let hitIds: string[] = [];
    if (result.lean_readiness.ready) {
      const lastClaim = result.rounds[result.rounds.length - 1]?.claim_id ?? null;
      const persisted = await persistHits(env, {
        hypothesis_id: pick.hypothesis_id,
        source_claim_id: lastClaim,
        source_insight_ids: [],
        parsed: [{
          kind: "reinforcement",
          summary: `Lean-readiness gate passed (5/5) for "${pick.hypothesis_title.slice(0, 120)}" — verdict + confidence stable, evidence saturated.`,
          proposed_action: `Attempt Lean formalization of hypothesis ${pick.hypothesis_id}; report ${reportKey}`,
        }],
      });
      hitIds = persisted.inserted;
    }

    const last = result.rounds[result.rounds.length - 1];
    const logs =
      `target=${pick.hypothesis_id} rounds=${result.rounds.length} ` +
      `verdict=${last?.verdict ?? "—"} conf=${last?.confidence ?? "—"} ` +
      `papers+=${result.total_papers_added} insights+=${result.total_insights_added} ` +
      `lean_ready=${result.lean_readiness.ready} report=${reportKey}`;
    await recordAutoIterateDeployment(env, { status: "completed", startedAt, runId, logs });
    console.log(`[auto-iterate] success ${logs}`);

    return {
      picked: pick,
      skipped_reason: null,
      result,
      lean_ready: result.lean_readiness.ready,
      report_key: reportKey,
      hit_ids: hitIds,
    };
  } catch (e) {
    const logs = `target=${pick.hypothesis_id} failed: ${String(e).slice(0, 800)}`;
    console.error(`[auto-iterate] ${logs}`);
    await recordAutoIterateDeployment(env, { status: "failed", startedAt, runId, logs });
    throw e;
  }
}
