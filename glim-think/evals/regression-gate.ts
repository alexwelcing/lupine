/**
 * Eval regression gate + Evolver auto-revert backstop.
 *
 * The Evolver (evals/evolver.ts) auto-merges prompt/criteria variants on
 * green. This is the safety net: it compares the two most recent
 * ModelScorecard claims and fails CI if any model's mean pass-rate dropped
 * more than the threshold. With AUTO_REVERT=1, a detected regression also
 * reverts the most recent `evolver:auto` commit — but only if that commit
 * is confined to the Evolver's allowlist (glim-think/src/registry/), never
 * touching logic/infra. Fails closed.
 *
 * Usage:
 *   npx tsx evals/regression-gate.ts [--threshold 0.10] [--dry-run]
 *                                    [--seed-regression]
 *
 * Sources scorecards from the worker's public /feed/recent-claims (no new
 * endpoint, no secrets needed for the read).
 */
import { execSync } from "node:child_process";

const WORKER_URL =
  process.env.WORKER_URL ?? "https://glim-think-v1.aw-ab5.workers.dev";
const THRESHOLD = (() => {
  const i = process.argv.indexOf("--threshold");
  if (i >= 0 && process.argv[i + 1]) return Number(process.argv[i + 1]);
  return Number(process.env.EVAL_REGRESSION_THRESHOLD) || 0.1;
})();
const DRY_RUN = process.argv.includes("--dry-run");
const SEED_REGRESSION = process.argv.includes("--seed-regression");
const AUTO_REVERT = process.env.AUTO_REVERT === "1";
const ALLOWLIST_PREFIX = "glim-think/src/registry/";

type Cell = { n: number; pass_rate: number };
type Scorecard = Record<string, Record<string, Cell>>;
interface ClaimRow {
  claim_type?: string;
  claim_data?: string;
  created_at?: string;
}

/** Mean pass-rate per model bucket (skip model|agent, workers-ai, unknown). */
function modelMeans(sc: Scorecard): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [bucket, evs] of Object.entries(sc)) {
    if (bucket.includes("|") || bucket === "workers-ai" || bucket === "unknown")
      continue;
    const cells = Object.values(evs);
    if (cells.length === 0) continue;
    out[bucket] =
      cells.reduce((s, c) => s + (c.pass_rate ?? 0), 0) / cells.length;
  }
  return out;
}

function summary(lines: string[]): void {
  const text = lines.join("\n") + "\n";
  process.stdout.write(text);
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) {
    try {
      // Append, don't clobber other steps' summaries.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("node:fs").appendFileSync(f, text);
    } catch {
      /* non-fatal */
    }
  }
}

async function fetchScorecards(): Promise<
  { scorecard: Scorecard; created_at: string }[]
> {
  if (DRY_RUN) {
    const base: Scorecard = {
      "MiniMax-M2.7": { completeness: { n: 20, pass_rate: 0.82 } },
      "glm-5.1": { completeness: { n: 20, pass_rate: 0.79 } },
    };
    const newer: Scorecard = SEED_REGRESSION
      ? {
          "MiniMax-M2.7": { completeness: { n: 20, pass_rate: 0.6 } }, // -0.22
          "glm-5.1": { completeness: { n: 20, pass_rate: 0.8 } },
        }
      : {
          "MiniMax-M2.7": { completeness: { n: 20, pass_rate: 0.85 } },
          "glm-5.1": { completeness: { n: 20, pass_rate: 0.81 } },
        };
    return [
      { scorecard: newer, created_at: "2026-01-02T00:00:00Z" },
      { scorecard: base, created_at: "2026-01-01T00:00:00Z" },
    ];
  }
  const res = await fetch(`${WORKER_URL}/feed/recent-claims`);
  if (!res.ok) throw new Error(`/feed/recent-claims ${res.status}`);
  const body = (await res.json()) as ClaimRow[] | { claims?: ClaimRow[] };
  const rows: ClaimRow[] = Array.isArray(body) ? body : body.claims ?? [];
  return rows
    .filter((r) => r.claim_type === "ModelScorecard" && r.claim_data)
    .map((r) => {
      try {
        const d = JSON.parse(r.claim_data as string) as {
          scorecard?: Scorecard;
        };
        return d.scorecard
          ? { scorecard: d.scorecard, created_at: r.created_at ?? "" }
          : null;
      } catch {
        return null;
      }
    })
    .filter((x): x is { scorecard: Scorecard; created_at: string } => !!x)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function revertLastEvolverCommit(): void {
  const sha = execSync(`git log --grep "evolver:auto" -n1 --format=%H`)
    .toString()
    .trim();
  if (!sha) {
    summary(["⚠️ regression detected but no `evolver:auto` commit to revert."]);
    return;
  }
  const stat = execSync(`git show --stat --format= --name-only ${sha}`)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  const outside = stat.filter((p) => !p.startsWith(ALLOWLIST_PREFIX));
  if (outside.length > 0) {
    summary([
      `🛑 Refusing to auto-revert ${sha.slice(0, 9)} — it touches paths`,
      `outside ${ALLOWLIST_PREFIX}: ${outside.join(", ")}.`,
      "Manual intervention required (fails closed).",
    ]);
    process.exit(1);
  }
  if (DRY_RUN) {
    summary([`(dry-run) would revert ${sha.slice(0, 9)} (registry-only ✓).`]);
    return;
  }
  execSync(`git revert --no-edit ${sha}`);
  execSync(`git push`);
  summary([`↩️ Auto-reverted \`evolver:auto\` commit ${sha.slice(0, 9)}.`]);
}

async function main(): Promise<void> {
  const cards = await fetchScorecards();
  if (cards.length < 2) {
    summary([
      "## Eval regression gate",
      "",
      `Only ${cards.length} ModelScorecard(s) available — need 2 to compare. Pass.`,
    ]);
    return;
  }
  const cur = modelMeans(cards[0].scorecard);
  const prev = modelMeans(cards[1].scorecard);

  const regressions: string[] = [];
  const rows: string[] = ["| model | prev | cur | Δ |", "|---|---|---|---|"];
  for (const [model, curScore] of Object.entries(cur)) {
    const prevScore = prev[model];
    if (prevScore === undefined) continue;
    const delta = curScore - prevScore;
    rows.push(
      `| ${model} | ${prevScore.toFixed(3)} | ${curScore.toFixed(3)} | ${
        delta >= 0 ? "+" : ""
      }${delta.toFixed(3)} |`,
    );
    if (delta < -THRESHOLD)
      regressions.push(
        `${model}: ${prevScore.toFixed(3)} → ${curScore.toFixed(3)} (${delta.toFixed(3)})`,
      );
  }

  if (regressions.length === 0) {
    summary([
      "## ✅ Eval regression gate — PASS",
      "",
      `Threshold: ${THRESHOLD}`,
      ...rows,
    ]);
    return;
  }

  summary([
    "## ❌ Eval regression gate — FAIL",
    "",
    `Threshold: ${THRESHOLD}. Regressed:`,
    ...regressions.map((r) => `- ${r}`),
    "",
    ...rows,
  ]);
  if (AUTO_REVERT) revertLastEvolverCommit();
  process.exit(1);
}

main().catch((e) => {
  // Infra failure (worker down, etc.) must not silently pass the gate, but
  // also must not block deploys on a transient — warn and pass non-fatally.
  summary([`## ⚠️ Eval regression gate — could not evaluate: ${String(e)}`]);
  process.exit(0);
});
