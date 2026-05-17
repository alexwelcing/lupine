/**
 * Evolver — the self-improving eval loop spine for glim-think.
 *
 * Pipeline (DIAGNOSE → SYNTHESIZE → A/B → DECIDE) with hard safety rails:
 *   1. DIAGNOSE   pull recent low-score / fail eval annotations for the
 *                 target agent(s) from Phoenix, cluster by failure mode on
 *                 the evaluator `explanation` text, pick the worst cluster.
 *   2. SYNTHESIZE read the agent's active prompt, ask the deep tier (via the
 *                 worker `POST /ops/experiment-generate`, keeping provider
 *                 keys server-side) for ONE minimal additive amendment.
 *   3. A/B        write candidate variant, run the ab-oracle CLI, parse
 *                 verdict.
 *   4. DECIDE     on `adopt` + no regression: bump active.json, commit ONLY
 *                 registry paths, push branch, open PR, auto-merge on green.
 *                 on `reject`: delete candidate, revert, commit nothing.
 *
 * The Evolver is dangerous-by-design. It is conservative and fails closed:
 *   - PATH ALLOWLIST  every staged path must match ^glim-think/src/registry/
 *   - KILL SWITCH     no-op unless EVOLVER_ENABLED is truthy
 *   - CIRCUIT BREAKER halt if 3 consecutive auto-patches did not improve score
 *   - --dry-run       plan only; write/commit/merge nothing
 *
 * It never touches secrets, infra, or agent logic — only prompt text and the
 * active-variant pointer under glim-think/src/registry/.
 *
 * Stable contracts (depended on by path/CLI/HTTP, NOT TS-imported — sibling
 * units may not be merged yet, so we code defensively):
 *   - Unit 1 prompt registry: src/registry/prompts/<Class>.<variant>.md +
 *     src/registry/active.json `{ "<Class>": "v1" }`.
 *   - Unit 4 ab-oracle CLI: `npx tsx evals/ab-oracle.ts --agent <Class>
 *     --baseline <v> --candidate <v> --dataset <name> --limit N --axis prompt
 *     --json` → stdout JSON `{verdict:"adopt"|"reject",regression:bool,n,...}`.
 *   - Phoenix annotations (read): phoenixRest.ts conventions (Bearer key,
 *     base from PHOENIX_COLLECTOR_ENDPOINT, NO custom User-Agent).
 *
 * CLI: npx tsx evals/evolver.ts [--agent <Class>] [--dataset glim-research-qa]
 *      [--limit N] [--dry-run] [--self-test]
 */

import { config } from "dotenv";
// Invoked as `cd glim-think && npx tsx evals/evolver.ts` (cwd = glim-think/),
// but also tolerate cwd = glim-think/evals/. Load whichever resolves.
config({ path: ".dev.vars" });
config({ path: "../.dev.vars" });
config({ path: ".env" });
config({ path: "../.env" });

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

// ─── Constants & config ──────────────────────────────────────────────────

/** Repo-relative path prefix the Evolver is permitted to ever write/stage. */
const ALLOWLIST_PREFIX = "glim-think/src/registry/";
const ALLOWLIST_RE = /^glim-think\/src\/registry\//;

/** Evals dir = cwd convention (CLI is invoked from glim-think/). */
const EVALS_DIR = process.cwd();
/** glim-think/ (parent of evals/). */
const GLIM_THINK_DIR = resolve(EVALS_DIR, "..");
/** Repo root (parent of glim-think/). */
const REPO_ROOT = resolve(GLIM_THINK_DIR, "..");

const REGISTRY_DIR = join(GLIM_THINK_DIR, "src", "registry");
const PROMPTS_DIR = join(REGISTRY_DIR, "prompts");
const ACTIVE_JSON = join(REGISTRY_DIR, "active.json");
const LEDGER_JSON = join(REGISTRY_DIR, ".evolver-ledger.json");

const DEFAULT_WORKER_URL = "https://glim-think-v1.aw-ab5.workers.dev";
const DEFAULT_DATASET = "glim-research-qa";
const DEFAULT_LIMIT = 30;
const EVOLVER_TAG = "evolver:auto";

function minClusterSize(): number {
  const v = Number(process.env.EVOLVER_MIN_CLUSTER);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 5;
}

function isTruthyEnv(v: string | undefined): boolean {
  if (!v) return false;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

// ─── CLI args ────────────────────────────────────────────────────────────

interface Args {
  agent?: string;
  dataset: string;
  limit: number;
  dryRun: boolean;
  selfTest: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    dataset: DEFAULT_DATASET,
    limit: DEFAULT_LIMIT,
    dryRun: false,
    selfTest: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--agent") a.agent = argv[++i];
    else if (t === "--dataset") a.dataset = argv[++i] ?? DEFAULT_DATASET;
    else if (t === "--limit") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) a.limit = Math.floor(n);
    } else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--self-test") a.selfTest = true;
  }
  return a;
}

// ─── SAFETY RAIL: path allowlist guard ───────────────────────────────────

/**
 * Assert every supplied repo-relative path is inside the registry allowlist.
 * Throws (fail-closed) on the FIRST out-of-scope path. This is the single
 * choke point all write/stage operations route through.
 */
export function assertPathsAllowed(repoRelPaths: string[]): void {
  if (repoRelPaths.length === 0) {
    throw new Error("path-allowlist: refusing to operate on an empty path set");
  }
  for (const p of repoRelPaths) {
    const norm = p.replace(/\\/g, "/").replace(/^\.\//, "");
    if (!ALLOWLIST_RE.test(norm) || norm.includes("..")) {
      throw new Error(
        `path-allowlist VIOLATION: "${p}" is outside ${ALLOWLIST_PREFIX} — aborting, nothing written`,
      );
    }
  }
}

/** Convert an absolute path to a repo-relative POSIX path. */
function toRepoRel(absPath: string): string {
  return resolve(absPath)
    .slice(resolve(REPO_ROOT).length)
    .replace(/\\/g, "/")
    .replace(/^\//, "");
}

// ─── Phoenix annotation fetch (slim, inline) ─────────────────────────────
// TODO consolidate onto phoenixExperiments.ts

function phoenixBase(): string {
  const e = process.env.PHOENIX_COLLECTOR_ENDPOINT;
  if (!e) throw new Error("PHOENIX_COLLECTOR_ENDPOINT must be set");
  return e.replace(/\/$/, "").replace(/\/v1\/traces$/, "");
}

function phoenixProject(): string {
  return process.env.PHOENIX_PROJECT_NAME || "glim-think";
}

function phoenixAuth(): Record<string, string> {
  const key = process.env.PHOENIX_API_KEY?.trim();
  if (!key) throw new Error("PHOENIX_API_KEY not set");
  // NO custom User-Agent — Phoenix Cloud's WAF redirects product UAs to
  // /login (HTML). The default runtime UA is allowed.
  return { Authorization: `Bearer ${key}`, accept: "application/json" };
}

interface FailureRecord {
  spanId: string;
  agent: string;
  evaluator: string;
  label: string;
  score: number;
  explanation: string;
}

/**
 * Pull recent spans for the target agent and their eval annotations,
 * keeping only low-score / fail-labelled ones. Defensive: tolerates the
 * span list lacking embedded annotations and falls back to the
 * span_annotations list endpoint.
 */
async function fetchFailures(
  agentFilter: string | undefined,
  max: number,
): Promise<FailureRecord[]> {
  const base = phoenixBase();
  const proj = encodeURIComponent(phoenixProject());
  const out: FailureRecord[] = [];

  const u = new URL(`${base}/v1/projects/${proj}/spans`);
  u.searchParams.set("limit", String(Math.min(500, Math.max(50, max * 10))));
  u.searchParams.set("sort", "-start_time");

  const r = await fetch(u, { headers: phoenixAuth() });
  if (!r.ok) {
    throw new Error(
      `Phoenix spans REST ${r.status}: ${(await r.text()).slice(0, 200)}`,
    );
  }
  const j = (await r.json()) as { data?: Array<Record<string, unknown>> };
  const spans = j.data ?? [];

  for (const s of spans) {
    const attrs = (s.attributes as Record<string, unknown>) ?? {};
    const ctx = (s.context as { span_id?: string }) ?? {};
    const spanId = String(ctx.span_id ?? s.span_id ?? s.id ?? "");
    if (!spanId) continue;
    const agent = String(
      attrs["gateway.agent_class"] ??
        attrs["agent.class"] ??
        attrs["agent"] ??
        "",
    );
    if (agentFilter && agent && agent !== agentFilter) continue;

    // Annotations may be embedded on the span (Phoenix Cloud sometimes
    // projects them) or only reachable via the list endpoint. Try embedded.
    const embedded = (s.annotations ??
      (s as Record<string, unknown>)["span_annotations"]) as
      | Array<Record<string, unknown>>
      | undefined;
    if (Array.isArray(embedded)) {
      for (const ann of embedded) {
        const rec = toFailure(ann, spanId, agent || agentFilter || "?");
        if (rec) out.push(rec);
      }
    }
  }

  // Fallback / supplement: query the span_annotations list endpoint for the
  // span ids we collected (best effort — endpoint shape varies by version).
  if (out.length === 0 && spans.length > 0) {
    const ids = spans
      .map((s) => {
        const ctx = (s.context as { span_id?: string }) ?? {};
        return String(ctx.span_id ?? s.span_id ?? s.id ?? "");
      })
      .filter(Boolean)
      .slice(0, 100);
    try {
      const au = new URL(`${base}/v1/projects/${proj}/span_annotations`);
      for (const id of ids) au.searchParams.append("span_ids", id);
      au.searchParams.set("limit", "1000");
      const ar = await fetch(au, { headers: phoenixAuth() });
      if (ar.ok) {
        const aj = (await ar.json()) as {
          data?: Array<Record<string, unknown>>;
        };
        for (const ann of aj.data ?? []) {
          const sid = String(ann.span_id ?? "");
          if (!sid) continue;
          const rec = toFailure(ann, sid, agentFilter || "?");
          if (rec) out.push(rec);
        }
      }
    } catch {
      // List endpoint absent on this Phoenix version — embedded path only.
    }
  }

  return out.slice(0, Math.max(max, 200));
}

const FAIL_LABELS = new Set([
  "incomplete",
  "hallucinated",
  "flawed",
  "fail",
  "incorrect",
  "wrong",
]);

function toFailure(
  ann: Record<string, unknown>,
  spanId: string,
  agent: string,
): FailureRecord | null {
  const result = (ann.result as Record<string, unknown>) ?? ann;
  const label = String(result.label ?? ann.label ?? "").toLowerCase();
  const rawScore = result.score ?? ann.score;
  const score =
    rawScore == null || rawScore === ""
      ? Number.NaN
      : Number(rawScore);
  const explanation = String(
    result.explanation ?? ann.explanation ?? "",
  ).trim();
  const evaluator = String(ann.name ?? ann.evaluator ?? "unknown");

  const isLowScore = Number.isFinite(score) && score < 0.5;
  const isFailLabel = FAIL_LABELS.has(label);
  if (!isLowScore && !isFailLabel) return null;

  return {
    spanId,
    agent,
    evaluator,
    label: label || "fail",
    score: Number.isFinite(score) ? score : 0,
    explanation,
  };
}

// ─── DIAGNOSE: cluster failures by mode ──────────────────────────────────

/** Salient failure-mode keywords. First match wins; order = priority. */
const MODE_KEYWORDS: Array<{ mode: string; re: RegExp }> = [
  { mode: "units", re: /\bunit(s|less)?\b|\bGPa\b|\beV\b|\bdimension/i },
  {
    mode: "causation",
    re: /\bcausa(l|tion)\b|\bcorrelat|\bconfound|\bspurious\b/i,
  },
  {
    mode: "hallucinated",
    re: /\bhallucinat|\bfabricat|\binvent(ed)?\b|\bunsupported\b|\bmade up\b/i,
  },
  {
    mode: "incomplete",
    re: /\bincomplete\b|\bmissing\b|\bdoes not address\b|\bunanswered\b|\bvague\b|\bgeneric\b/i,
  },
  {
    mode: "reasoning",
    re: /\breasoning\b|\billogical\b|\bcontradic|\bnon[- ]?sequitur\b/i,
  },
  {
    mode: "overconfident",
    re: /\boverstat|\boverconfiden|\bdefinitive\b|\bhedg|\buncertainty\b/i,
  },
];

interface Cluster {
  mode: string;
  count: number;
  meanScore: number;
  exemplars: FailureRecord[];
}

function classifyMode(explanation: string): string {
  for (const { mode, re } of MODE_KEYWORDS) {
    if (re.test(explanation)) return mode;
  }
  return "other";
}

function clusterFailures(records: FailureRecord[]): Cluster[] {
  const groups = new Map<string, FailureRecord[]>();
  for (const r of records) {
    const mode = classifyMode(r.explanation);
    const arr = groups.get(mode) ?? [];
    arr.push(r);
    groups.set(mode, arr);
  }
  const clusters: Cluster[] = [];
  for (const [mode, arr] of groups) {
    const meanScore =
      arr.reduce((s, r) => s + r.score, 0) / Math.max(1, arr.length);
    clusters.push({
      mode,
      count: arr.length,
      meanScore,
      exemplars: arr.slice(0, 5),
    });
  }
  // Worst cluster = most frequent, tie-break lowest mean score.
  clusters.sort(
    (a, b) => b.count - a.count || a.meanScore - b.meanScore,
  );
  return clusters;
}

// ─── Registry helpers (defensive — Unit 1 may be unmerged) ───────────────

interface ActiveMap {
  [agent: string]: string;
}

function readActiveMap(): ActiveMap {
  try {
    const parsed = JSON.parse(readFileSync(ACTIVE_JSON, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as ActiveMap) : {};
  } catch {
    return {};
  }
}

function activeVariant(agent: string, map = readActiveMap()): string {
  return map[agent] ?? "v1";
}

function variantPath(agent: string, variant: string): string {
  return join(PROMPTS_DIR, `${agent}.${variant}.md`);
}

function nextVariant(active: string): string {
  const m = /^v(\d+)$/.exec(active);
  const n = m ? Number(m[1]) : 1;
  return `v${n + 1}`;
}

function readActivePrompt(agent: string, active: string): string | null {
  const p = variantPath(agent, active);
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

// ─── SAFETY RAIL: circuit breaker ledger ─────────────────────────────────

interface LedgerEntry {
  ts: string;
  agent: string;
  fromVariant: string;
  toVariant: string;
  mode: string;
  baselineScore: number;
  candidateScore: number;
  improved: boolean;
}

function readLedger(): LedgerEntry[] {
  try {
    const j = JSON.parse(readFileSync(LEDGER_JSON, "utf8"));
    return Array.isArray(j) ? (j as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Circuit breaker: if the last 3 adopted patches all failed to improve the
 * aggregate score, halt. Returns a reason string when tripped, else null.
 */
function circuitBreakerTripped(ledger: LedgerEntry[]): string | null {
  const adopted = ledger.filter((e) => e && typeof e.improved === "boolean");
  const last3 = adopted.slice(-3);
  if (last3.length === 3 && last3.every((e) => !e.improved)) {
    return `circuit-breaker: last 3 ${EVOLVER_TAG} patches did not improve aggregate score (${last3
      .map((e) => `${e.agent} ${e.fromVariant}->${e.toVariant}`)
      .join(", ")}) — halting`;
  }
  return null;
}

// ─── SYNTHESIZE: ask the deep tier via the worker ────────────────────────

interface Amendment {
  amendment: string;
  rationale: string;
}

async function synthesizeAmendment(
  agent: string,
  currentPrompt: string,
  cluster: Cluster,
): Promise<Amendment> {
  const workerUrl = (
    process.env.WORKER_URL || DEFAULT_WORKER_URL
  ).replace(/\/$/, "");
  const token =
    process.env.INTERNAL_TASK_TOKEN || process.env.X_INTERNAL_TOKEN || "";
  if (!token) {
    throw new Error(
      "INTERNAL_TASK_TOKEN not set — cannot call worker /ops/experiment-generate",
    );
  }

  const exemplars = cluster.exemplars
    .map(
      (e, i) =>
        `  ${i + 1}. [${e.evaluator}=${e.label}, score=${e.score.toFixed(
          2,
        )}] ${e.explanation.slice(0, 280)}`,
    )
    .join("\n");

  const prompt = [
    `You are improving the system prompt of the "${agent}" agent.`,
    ``,
    `Recurring failure mode: "${cluster.mode}" (${cluster.count} cases, mean eval score ${cluster.meanScore.toFixed(2)}).`,
    `Evaluator explanations:`,
    exemplars,
    ``,
    `CURRENT SYSTEM PROMPT:`,
    `"""`,
    currentPrompt.slice(0, 6000),
    `"""`,
    ``,
    `Propose exactly ONE minimal ADDITIVE amendment that directly targets`,
    `this failure mode: either a short appended directive (1-3 sentences)`,
    `OR a single concise few-shot exemplar. Do NOT rewrite or remove any`,
    `existing text. Keep it tight and surgical.`,
    ``,
    `Respond as strict JSON: {"amendment": "<text to append>", "rationale": "<one sentence>"}`,
  ].join("\n");

  const res = await fetch(`${workerUrl}/ops/experiment-generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Internal-Token": token,
    },
    body: JSON.stringify({
      agentClass: "EvolverSynthesize",
      prompt,
      mode: "synthesize",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `worker /ops/experiment-generate ${res.status}: ${(await res.text()).slice(0, 200)}`,
    );
  }
  const body = (await res.json()) as Record<string, unknown>;
  const text = String(
    body.text ?? body.output ?? body.result ?? body.completion ?? "",
  );
  return parseAmendment(text);
}

/** Tolerant parse of the model's JSON (handles code-fences / prose wrap). */
function parseAmendment(text: string): Amendment {
  const fenced = text.replace(/```(?:json)?/gi, "").trim();
  const m = fenced.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const o = JSON.parse(m[0]) as Record<string, unknown>;
      const amendment = String(o.amendment ?? "").trim();
      if (amendment) {
        return {
          amendment,
          rationale: String(o.rationale ?? "").trim() || "(no rationale)",
        };
      }
    } catch {
      // fall through to raw-text fallback
    }
  }
  const raw = fenced.trim();
  if (!raw) throw new Error("synthesize: model returned empty amendment");
  return { amendment: raw.slice(0, 1200), rationale: "(unparsed; raw text)" };
}

function buildCandidate(currentPrompt: string, amendment: string): string {
  const sep = currentPrompt.endsWith("\n") ? "" : "\n";
  return `${currentPrompt}${sep}\n<!-- ${EVOLVER_TAG} amendment -->\n${amendment.trim()}\n`;
}

// ─── A/B: invoke the ab-oracle CLI subprocess ────────────────────────────

interface Verdict {
  verdict: "adopt" | "reject" | "unknown";
  regression: boolean;
  n: number;
  baselineScore?: number;
  candidateScore?: number;
  raw: string;
}

function runAbOracle(
  agent: string,
  baseline: string,
  candidate: string,
  dataset: string,
  limit: number,
): Verdict {
  const oraclePath = join(EVALS_DIR, "ab-oracle.ts");
  if (!existsSync(oraclePath)) {
    return {
      verdict: "unknown",
      regression: true,
      n: 0,
      raw: `ab-oracle.ts not present at ${oraclePath} (Unit 4 unmerged)`,
    };
  }
  const r = spawnSync(
    "npx",
    [
      "tsx",
      "evals/ab-oracle.ts",
      "--agent",
      agent,
      "--baseline",
      baseline,
      "--candidate",
      candidate,
      "--dataset",
      dataset,
      "--limit",
      String(limit),
      "--axis",
      "prompt",
      "--json",
    ],
    {
      cwd: GLIM_THINK_DIR,
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 10 * 60 * 1000,
    },
  );
  const stdout = r.stdout ?? "";
  const stderr = r.stderr ?? "";
  const jsonMatch = stdout.match(/\{[\s\S]*\}\s*$/);
  if (!jsonMatch) {
    return {
      verdict: "unknown",
      regression: true,
      n: 0,
      raw: `ab-oracle produced no JSON (exit ${r.status}). stderr: ${stderr.slice(0, 300)}`,
    };
  }
  try {
    const o = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const v = String(o.verdict ?? "unknown");
    return {
      verdict: v === "adopt" || v === "reject" ? v : "unknown",
      regression: Boolean(o.regression),
      n: Number(o.n ?? 0),
      baselineScore: numOrUndef(o.baselineScore ?? o.baseline_score),
      candidateScore: numOrUndef(o.candidateScore ?? o.candidate_score),
      raw: jsonMatch[0].slice(0, 600),
    };
  } catch (e) {
    return {
      verdict: "unknown",
      regression: true,
      n: 0,
      raw: `ab-oracle JSON parse error: ${(e as Error).message}`,
    };
  }
}

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ─── git/gh helpers (allowlist-gated) ────────────────────────────────────

function git(args: string[]): { ok: boolean; out: string } {
  const r = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return {
    ok: r.status === 0,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim(),
  };
}

/**
 * Stage ONLY the given registry paths. Re-asserts the allowlist on every
 * path AND on `git diff --cached --name-only` after staging so nothing
 * outside the registry can ride along.
 */
function stageRegistryPaths(repoRelPaths: string[]): void {
  assertPathsAllowed(repoRelPaths);
  for (const p of repoRelPaths) {
    const r = git(["add", "--", p]);
    if (!r.ok) throw new Error(`git add failed for ${p}: ${r.out}`);
  }
  const staged = git(["diff", "--cached", "--name-only"]);
  if (!staged.ok) throw new Error(`git diff --cached failed: ${staged.out}`);
  const stagedPaths = staged.out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Fail-closed: ANY staged path outside the allowlist aborts.
  assertPathsAllowed(stagedPaths);
}

// ─── Pipeline ────────────────────────────────────────────────────────────

interface PlanResult {
  agent: string;
  cluster: Cluster | null;
  amendment: Amendment | null;
  active: string;
  next: string;
  verdict: Verdict | null;
  decision: "adopt" | "reject" | "skip";
  reason: string;
}

async function runForAgent(
  agent: string,
  args: Args,
  dryRun: boolean,
): Promise<PlanResult> {
  const active = activeVariant(agent);
  const next = nextVariant(active);
  const plan: PlanResult = {
    agent,
    cluster: null,
    amendment: null,
    active,
    next,
    verdict: null,
    decision: "skip",
    reason: "",
  };

  // 1. DIAGNOSE
  const failures = await fetchFailures(agent, Math.max(args.limit * 5, 100));
  const clusters = clusterFailures(failures);
  const top = clusters.find((c) => c.count >= minClusterSize()) ?? null;
  if (!top) {
    plan.reason = `no failure cluster ≥ EVOLVER_MIN_CLUSTER (${minClusterSize()}). Found ${failures.length} failures across ${clusters.length} modes: ${clusters
      .map((c) => `${c.mode}=${c.count}`)
      .join(", ") || "none"}`;
    return plan;
  }
  plan.cluster = top;

  // 2. SYNTHESIZE
  const currentPrompt = readActivePrompt(agent, active);
  if (currentPrompt == null) {
    plan.reason = `active prompt not found: ${variantPath(
      agent,
      active,
    )} (Unit 1 registry may be unmerged) — cannot synthesize`;
    return plan;
  }
  plan.amendment = await synthesizeAmendment(agent, currentPrompt, top);
  const candidateText = buildCandidate(
    currentPrompt,
    plan.amendment.amendment,
  );
  const candidateAbs = variantPath(agent, next);
  const candidateRel = toRepoRel(candidateAbs);

  if (dryRun) {
    // Verify the allowlist guard accepts the would-be path and rejects a
    // synthetic out-of-scope path, but write nothing.
    assertPathsAllowed([candidateRel]);
    let guardRejected = false;
    try {
      assertPathsAllowed(["glim-think/src/server.ts"]);
    } catch {
      guardRejected = true;
    }
    if (!guardRejected) {
      throw new Error(
        "self-check failed: allowlist guard did NOT reject an out-of-scope path",
      );
    }
    plan.decision = "skip";
    plan.reason =
      "dry-run: candidate synthesized, allowlist guard verified (accepts registry path, rejects src/server.ts); nothing written";
    return plan;
  }

  // 3. A/B — write candidate (allowlist-gated), run oracle.
  assertPathsAllowed([candidateRel]);
  mkdirSync(dirname(candidateAbs), { recursive: true });
  writeFileSync(candidateAbs, candidateText, "utf8");
  const verdict = runAbOracle(agent, active, next, args.dataset, args.limit);
  plan.verdict = verdict;

  // 4. DECIDE
  if (verdict.verdict === "adopt" && verdict.regression === false) {
    plan.decision = "adopt";
  } else {
    plan.decision = "reject";
    plan.reason = `oracle verdict=${verdict.verdict} regression=${verdict.regression} n=${verdict.n} :: ${verdict.raw}`;
    // Revert: delete candidate, leave active.json untouched.
    rmSync(candidateAbs, { force: true });
    return plan;
  }

  // ADOPT: bump active.json, append ledger, stage ONLY registry, commit,
  // push branch, open PR, auto-merge on green.
  const activeMap = readActiveMap();
  const newMap: ActiveMap = { ...activeMap, [agent]: next };
  mkdirSync(REGISTRY_DIR, { recursive: true });
  writeFileSync(ACTIVE_JSON, `${JSON.stringify(newMap, null, 2)}\n`, "utf8");

  const ledger = readLedger();
  const improved =
    verdict.candidateScore != null && verdict.baselineScore != null
      ? verdict.candidateScore > verdict.baselineScore
      : true; // oracle said adopt w/o regression ⇒ treat as improvement
  const entry: LedgerEntry = {
    ts: new Date().toISOString(),
    agent,
    fromVariant: active,
    toVariant: next,
    mode: top.mode,
    baselineScore: verdict.baselineScore ?? Number.NaN,
    candidateScore: verdict.candidateScore ?? Number.NaN,
    improved,
  };
  writeFileSync(
    LEDGER_JSON,
    `${JSON.stringify([...ledger, entry], null, 2)}\n`,
    "utf8",
  );

  const stagePaths = [
    candidateRel,
    toRepoRel(ACTIVE_JSON),
    toRepoRel(LEDGER_JSON),
  ];
  stageRegistryPaths(stagePaths);

  const delta =
    verdict.candidateScore != null && verdict.baselineScore != null
      ? `score ${verdict.baselineScore.toFixed(3)} → ${verdict.candidateScore.toFixed(3)}`
      : "score delta unavailable (oracle adopt, no regression)";
  const branch = `evolver/${agent.toLowerCase()}-${active}-to-${next}-${Date.now()}`;
  const commitMsg = [
    `feat(glim-think/registry): ${agent} ${active}→${next} [${EVOLVER_TAG}]`,
    ``,
    `Failure cluster: "${top.mode}" — ${top.count} cases, mean eval ${top.meanScore.toFixed(2)}.`,
    `A/B (n=${verdict.n}): ${delta}; oracle verdict=adopt regression=false.`,
    `Amendment rationale: ${plan.amendment.rationale}`,
    ``,
    `Generated by the Evolver (${EVOLVER_TAG}). Registry-only change.`,
  ].join("\n");

  const co = git(["checkout", "-b", branch]);
  if (!co.ok) throw new Error(`git checkout -b failed: ${co.out}`);
  const commit = git(["commit", "-m", commitMsg]);
  if (!commit.ok) throw new Error(`git commit failed: ${commit.out}`);
  const push = git(["push", "-u", "origin", branch]);
  if (!push.ok) {
    plan.reason = `committed ${branch} but push failed: ${push.out}`;
    return plan;
  }

  const pr = spawnSync(
    "gh",
    [
      "pr",
      "create",
      "--base",
      "consolidate-llm-path",
      "--head",
      branch,
      "--title",
      `[${EVOLVER_TAG}] ${agent} ${active}→${next} (${top.mode})`,
      "--body",
      `${commitMsg}\n\nAuto-generated by the Evolver. Merges automatically on green CI.`,
    ],
    { cwd: REPO_ROOT, encoding: "utf8", shell: process.platform === "win32" },
  );
  const prOut = `${pr.stdout ?? ""}${pr.stderr ?? ""}`.trim();
  if (pr.status !== 0) {
    plan.reason = `pushed ${branch}; gh pr create failed: ${prOut.slice(0, 300)}`;
    return plan;
  }
  const prUrl = (prOut.match(/https?:\/\/\S+/) ?? [""])[0];
  const merge = spawnSync(
    "gh",
    ["pr", "merge", "--auto", "--squash", prUrl || branch],
    { cwd: REPO_ROOT, encoding: "utf8", shell: process.platform === "win32" },
  );
  plan.reason = `adopted; PR ${prUrl || "(url unknown)"}; auto-merge ${
    merge.status === 0 ? "armed (squash on green)" : "request failed: " + `${merge.stderr ?? ""}`.slice(0, 200)
  }`;
  return plan;
}

// ─── Self-test (path-allowlist guard) ────────────────────────────────────

function selfTest(): number {
  let failures = 0;
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`[self-test] PASS ${name}`);
    } catch (e) {
      failures++;
      console.error(`[self-test] FAIL ${name}: ${(e as Error).message}`);
    }
  };

  check("allows registry prompt path", () =>
    assertPathsAllowed(["glim-think/src/registry/prompts/Theorist.v2.md"]),
  );
  check("allows active.json + ledger", () =>
    assertPathsAllowed([
      "glim-think/src/registry/active.json",
      "glim-think/src/registry/.evolver-ledger.json",
    ]),
  );
  const mustReject = (paths: string[]) => () => {
    let rejected = false;
    try {
      assertPathsAllowed(paths);
    } catch {
      rejected = true;
    }
    if (!rejected)
      throw new Error(`guard did NOT reject ${JSON.stringify(paths)}`);
  };
  check("rejects src/server.ts", mustReject(["glim-think/src/server.ts"]));
  check(
    "rejects mixed (one bad path)",
    mustReject([
      "glim-think/src/registry/active.json",
      "glim-think/src/agents/theorist.ts",
    ]),
  );
  check("rejects path traversal", mustReject(["glim-think/src/registry/../../../etc/passwd"]));
  check("rejects .github workflow", mustReject([".github/workflows/x.yml"]));
  check("rejects empty set", mustReject([]));
  check(
    "rejects sibling registry prefix spoof",
    mustReject(["glim-think/src/registry-evil/x.md"]),
  );

  return failures === 0 ? 0 : 1;
}

// ─── main ────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (args.selfTest) return selfTest();

  const killOn = isTruthyEnv(process.env.EVOLVER_ENABLED);
  const dryRun = args.dryRun || !killOn;

  console.log(
    `[evolver] start :: agent=${args.agent ?? "(all known)"} dataset=${args.dataset} limit=${args.limit} ` +
      `EVOLVER_ENABLED=${killOn ? "on" : "OFF"} mode=${dryRun ? (args.dryRun ? "dry-run" : "kill-switch-OFF→plan-only") : "ARMED"}`,
  );

  // CIRCUIT BREAKER (checked before any synthesis/write).
  const tripped = circuitBreakerTripped(readLedger());
  if (tripped) {
    console.error(`[evolver] ${tripped}`);
    return 2;
  }

  // Resolve target agents. With no --agent, derive from active.json keys;
  // if the registry is unmerged, there is nothing to do (fail-closed soft).
  let agents: string[];
  if (args.agent) {
    agents = [args.agent];
  } else {
    agents = Object.keys(readActiveMap());
    if (agents.length === 0) {
      console.log(
        "[evolver] no --agent and active.json absent/empty (registry unmerged?) — nothing to do",
      );
      return 0;
    }
  }

  let exit = 0;
  for (const agent of agents) {
    try {
      const plan = await runForAgent(agent, args, dryRun);
      console.log(
        `\n[evolver] ── ${agent} ──────────────────────────────────────`,
      );
      if (plan.cluster) {
        console.log(
          `  cluster: "${plan.cluster.mode}" count=${plan.cluster.count} meanScore=${plan.cluster.meanScore.toFixed(2)}`,
        );
        for (const ex of plan.cluster.exemplars.slice(0, 3)) {
          console.log(
            `    - [${ex.evaluator}] ${ex.explanation.slice(0, 140)}`,
          );
        }
      }
      if (plan.amendment) {
        console.log(`  proposed amendment (${plan.next}):`);
        console.log(
          plan.amendment.amendment
            .split("\n")
            .map((l) => `    | ${l}`)
            .join("\n"),
        );
        console.log(`  rationale: ${plan.amendment.rationale}`);
      }
      if (plan.verdict) {
        console.log(
          `  oracle: verdict=${plan.verdict.verdict} regression=${plan.verdict.regression} n=${plan.verdict.n}`,
        );
      }
      console.log(`  decision: ${plan.decision.toUpperCase()}`);
      console.log(`  ${plan.reason}`);
    } catch (e) {
      exit = 1;
      console.error(`[evolver] ${agent}: ERROR ${(e as Error).message}`);
    }
  }
  return exit;
}

// Set exitCode and let the loop drain rather than forcing process.exit():
// on Node + Windows, exiting while undici keep-alive sockets are still
// closing triggers a libuv `UV_HANDLE_CLOSING` assertion (spurious 127).
main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    console.error(`[evolver] FATAL ${(e as Error).stack ?? e}`);
    process.exitCode = 1;
  });
