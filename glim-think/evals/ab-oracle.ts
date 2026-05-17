/**
 * A/B oracle — the decision unit of glim-think's self-improving eval loop.
 *
 * Given a golden dataset and two variants of an agent (a baseline and a
 * candidate, differing on either the `provider` axis or the `promptVariant`
 * axis), this CLI:
 *   1. Pulls N examples from a Phoenix dataset.
 *   2. Generates BASELINE + CANDIDATE outputs via the worker's
 *      `/ops/experiment-generate` endpoint.
 *   3. Scores both with the REUSED combo + Phase-2 LLM evaluators
 *      (combo-evaluators.ts — not reimplemented here).
 *   4. Computes per-evaluator mean deltas and a hard verdict.
 *   5. Prints a stable contract JSON and persists a ModelScorecard claim.
 *
 * Usage:
 *   npx tsx evals/ab-oracle.ts --agent <Class> --baseline <v> --candidate <v> \
 *     --dataset <name> --limit N [--axis provider|prompt] [--json] [--dry-run]
 *
 * Env (loaded from ../.env and ./.dev.vars, like run-evals.ts):
 *   PHOENIX_API_KEY, PHOENIX_COLLECTOR_ENDPOINT, PHOENIX_PROJECT_NAME
 *   WORKER_URL (default https://glim-think-v1.aw-ab5.workers.dev)
 *   INTERNAL_TASK_TOKEN  — required to call the worker / persist claims
 *   OPENAI_API_KEY       — enables Phase-2 LLM judges (else combo-only)
 *   AB_EPSILON  (0.03)   — min mean delta to "adopt"
 *   AB_MIN_N    (8)      — min scored examples to "adopt"
 *   AB_REGRESSION (0.05) — any evaluator dropping more than this => regression
 */

import { config } from "dotenv";
config({ path: "../.env" });
import * as fs from "fs";
import * as path from "path";
import { COMBO_EVALUATORS, type SpanInput } from "./combo-evaluators.js";

// ─── .dev.vars loader (KEY=VALUE), same intent as run-evals env bootstrap ───
// run-evals.ts pulls ../.env via dotenv; the worker secrets live in .dev.vars.
// We load both, without clobbering anything already in process.env.
function loadDevVars(): void {
  for (const candidate of [
    path.resolve(process.cwd(), ".dev.vars"),
    path.resolve(process.cwd(), "..", ".dev.vars"),
  ]) {
    if (!fs.existsSync(candidate)) continue;
    let text: string;
    try {
      text = fs.readFileSync(candidate, "utf8");
    } catch {
      continue;
    }
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
    break; // first found wins
  }
}
loadDevVars();

// ─── Tunables ───
const AB_EPSILON = numEnv("AB_EPSILON", 0.03);
const AB_MIN_N = Math.max(1, Math.floor(numEnv("AB_MIN_N", 8)));
const AB_REGRESSION = numEnv("AB_REGRESSION", 0.05);
const WORKER_URL = (process.env.WORKER_URL || "https://glim-think-v1.aw-ab5.workers.dev").replace(/\/$/, "");

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// ─── CLI parsing ───
type Axis = "provider" | "prompt";

interface Args {
  agent: string;
  baseline: string;
  candidate: string;
  dataset: string;
  limit: number;
  axis: Axis;
  json: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    if (i === -1) return undefined;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) return undefined;
    return v;
  };
  const has = (flag: string) => argv.includes(flag);

  const dryRun = has("--dry-run");
  const agent = get("--agent");
  const baseline = get("--baseline");
  const candidate = get("--candidate");
  if (!agent || !baseline || !candidate) {
    throw new Error(
      "ab-oracle: --agent, --baseline and --candidate are required.\n" +
        "Usage: npx tsx evals/ab-oracle.ts --agent <Class> --baseline <v> " +
        "--candidate <v> --dataset <name> --limit N [--axis provider|prompt] " +
        "[--json] [--dry-run]",
    );
  }

  const axisRaw = (get("--axis") ?? "prompt").toLowerCase();
  if (axisRaw !== "provider" && axisRaw !== "prompt") {
    throw new Error(`ab-oracle: --axis must be "provider" or "prompt", got "${axisRaw}"`);
  }

  const limitRaw = get("--limit");
  let limit = limitRaw === undefined ? 20 : Number(limitRaw);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  limit = Math.floor(limit);

  return {
    agent,
    baseline,
    candidate,
    dataset: get("--dataset") ?? "glim-research-qa",
    limit,
    axis: axisRaw as Axis,
    json: has("--json"),
    dryRun,
  };
}

// ─── Logging that --json silences ───
let JSON_MODE = false;
function log(...parts: unknown[]): void {
  if (!JSON_MODE) console.error("[ab-oracle]", ...parts);
}

// ─── Phoenix dataset fetch (SLIM, inline) ───
// TODO: consolidate onto evals/phoenixExperiments.ts once merged.
// Deliberately not importing the sibling unit so this file compiles
// independently. Same Bearer / no-custom-UA convention as phoenixRest.ts.

interface DatasetExample {
  question: string;
  context: string;
  reference: string;
}

function phoenixBase(): string {
  const e = process.env.PHOENIX_COLLECTOR_ENDPOINT;
  if (!e) throw new Error("PHOENIX_COLLECTOR_ENDPOINT must be set to fetch a dataset");
  return e.replace(/\/$/, "").replace(/\/v1\/traces$/, "");
}

function phoenixAuth(): Record<string, string> {
  const key = process.env.PHOENIX_API_KEY?.trim();
  if (!key) throw new Error("PHOENIX_API_KEY not set");
  // Do NOT set a custom User-Agent — Phoenix Cloud's WAF redirects
  // product UAs to /login (HTML). Mirrors phoenixRest.ts.
  return { Authorization: `Bearer ${key}`, accept: "application/json" };
}

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["question", "answer", "text", "value", "input", "output"]) {
      if (typeof o[k] === "string") return o[k] as string;
    }
    return JSON.stringify(v);
  }
  return String(v);
}

function normalizeExample(input: unknown, output: unknown): DatasetExample {
  const inObj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const question =
    typeof inObj.question === "string" ? inObj.question : asText(input);
  const context = typeof inObj.context === "string" ? inObj.context : "";
  return { question, context, reference: asText(output) };
}

/** Resolve dataset name → id, then page examples (cap at `limit`). */
async function fetchDatasetExamples(name: string, limit: number): Promise<DatasetExample[]> {
  const base = phoenixBase();
  const headers = phoenixAuth();

  const listRes = await fetch(`${base}/v1/datasets?limit=200`, { headers });
  if (!listRes.ok) {
    throw new Error(`Phoenix /v1/datasets ${listRes.status}: ${(await listRes.text()).slice(0, 200)}`);
  }
  const listJson = (await listRes.json()) as { data?: Array<{ id?: string; name?: string }> };
  const match = (listJson.data ?? []).find((d) => d.name === name);
  if (!match?.id) {
    throw new Error(`Phoenix dataset "${name}" not found (${(listJson.data ?? []).length} datasets visible)`);
  }

  const out: DatasetExample[] = [];
  let cursor: string | null = null;
  while (out.length < limit) {
    const u = new URL(`${base}/v1/datasets/${encodeURIComponent(match.id)}/examples`);
    u.searchParams.set("limit", String(Math.min(100, limit - out.length)));
    if (cursor) u.searchParams.set("cursor", cursor);
    const r = await fetch(u, { headers });
    if (!r.ok) {
      throw new Error(`Phoenix dataset examples ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    const j = (await r.json()) as {
      data?: { examples?: Array<{ input?: unknown; output?: unknown }> } | Array<{ input?: unknown; output?: unknown }>;
      next_cursor?: string | null;
    };
    // Phoenix returns either { data: { examples: [...] } } or { data: [...] }.
    const rows = Array.isArray(j.data) ? j.data : j.data?.examples ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      out.push(normalizeExample(row.input, row.output));
      if (out.length >= limit) break;
    }
    cursor = j.next_cursor ?? null;
    if (!cursor) break;
  }
  return out;
}

// ─── Worker generation ───
interface GenResult {
  text: string;
  error?: string;
}

async function generate(
  args: Args,
  variant: string,
  example: DatasetExample,
  token: string,
): Promise<GenResult> {
  const prompt = example.context
    ? `${example.question}\n\nContext: ${example.context}`
    : example.question;
  const body: Record<string, unknown> = {
    agentClass: args.agent,
    prompt,
    system: "You are a rigorous materials-science research agent. Answer precisely.",
    dataset: args.dataset,
  };
  if (args.axis === "provider") body.provider = variant;
  else body.promptVariant = variant;

  try {
    const r = await fetch(`${WORKER_URL}/ops/experiment-generate`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Internal-Token": token },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      return { text: "", error: `HTTP ${r.status}: ${(await r.text()).slice(0, 160)}` };
    }
    const j = (await r.json()) as Record<string, unknown>;
    const text = asText(j.text ?? j.output ?? j.answer ?? j.result ?? j);
    return { text };
  } catch (e) {
    return { text: "", error: String((e as Error).message ?? e) };
  }
}

// ─── Scoring (REUSE combo + Phase-2 evaluators) ───
// Build a synthetic Phoenix-shaped span so the existing evaluators
// (combo-evaluators.ts) score generated text without modification.
function toSpan(
  text: string,
  question: string,
  extraAttrs?: Record<string, unknown>,
): SpanInput {
  return {
    id: `ab-${Math.random().toString(36).slice(2)}`,
    name: "Experiment.abOracle",
    attributes: {
      "output.value": text,
      "ai.text": text,
      "input.value": question,
      ...extraAttrs,
    },
  };
}

interface Phase2 {
  available: boolean;
  evaluate: (input: string, output: string) => Promise<Record<string, number>>;
}

/**
 * Lazily wire the Phase-2 LLM judges from run-evals' templates. If no
 * OPENAI_API_KEY, fall back to combo-only and report it.
 */
async function buildPhase2(): Promise<Phase2> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { available: false, evaluate: async () => ({}) };
  }
  let createClassificationEvaluator: typeof import("@arizeai/phoenix-evals").createClassificationEvaluator;
  let openai: typeof import("@ai-sdk/openai").openai;
  try {
    ({ createClassificationEvaluator } = await import("@arizeai/phoenix-evals"));
    ({ openai } = await import("@ai-sdk/openai"));
  } catch (e) {
    log(`Phase-2 deps unavailable, combo-only: ${String((e as Error).message ?? e)}`);
    return { available: false, evaluate: async () => ({}) };
  }

  const judges = [
    {
      name: "completeness",
      positive: "complete",
      choices: { complete: 1, incomplete: 0 },
      template:
        "You are evaluating whether a glim-think research output completely answers the prompt.\n\nPrompt: {{input}}\n\nGenerated output:\n{{output}}\n\nRespond with ONLY one word: \"complete\" or \"incomplete\". Then a brief explanation.",
    },
    {
      name: "hallucination",
      positive: "factual",
      choices: { factual: 1, hallucinated: 0 },
      template:
        "You are evaluating whether a glim-think research output contains hallucinated or fabricated claims.\n\nPrompt: {{input}}\n\nGenerated output:\n{{output}}\n\nRespond with ONLY one word: \"factual\" or \"hallucinated\". Then a brief explanation.",
    },
    {
      name: "reasoning",
      positive: "sound",
      choices: { sound: 1, flawed: 0 },
      template:
        "You are evaluating the reasoning quality of a glim-think research output.\n\nPrompt: {{input}}\n\nGenerated output:\n{{output}}\n\nRespond with ONLY one word: \"sound\" or \"flawed\". Then a brief explanation.",
    },
  ] as const;

  const evaluators = judges.map((j) => ({
    name: j.name,
    positive: j.positive,
    ev: createClassificationEvaluator({
      model: openai("gpt-4o-mini") as Parameters<typeof createClassificationEvaluator>[0]["model"],
      promptTemplate: j.template,
      choices: j.choices,
      name: j.name,
    }),
  }));

  return {
    available: true,
    evaluate: async (input: string, output: string) => {
      const scores: Record<string, number> = {};
      await Promise.all(
        evaluators.map(async (e) => {
          try {
            const { label, score } = await e.ev.evaluate({ input, output });
            scores[e.name] =
              typeof score === "number" ? score : label === e.positive ? 1 : 0;
          } catch (err) {
            log(`Phase-2 ${e.name} failed: ${String((err as Error).message ?? err)}`);
          }
        }),
      );
      return scores;
    },
  };
}

async function scoreOutput(
  text: string,
  question: string,
  phase2: Phase2,
  extraAttrs?: Record<string, unknown>,
): Promise<Record<string, number>> {
  const scores: Record<string, number> = {};
  const span = toSpan(text, question, extraAttrs);
  for (const evaluator of COMBO_EVALUATORS) {
    try {
      const res = await evaluator(span);
      if (res) scores[res.name] = res.score;
    } catch (e) {
      log(`combo ${evaluator.name} failed: ${String((e as Error).message ?? e)}`);
    }
  }
  if (phase2.available) {
    const p2 = await phase2.evaluate(question, text);
    for (const [k, v] of Object.entries(p2)) scores[k] = v;
  }
  return scores;
}

// ─── Delta aggregation ───
interface Accum {
  baselineSum: number;
  candidateSum: number;
  n: number;
}

function accumulate(
  acc: Map<string, Accum>,
  base: Record<string, number>,
  cand: Record<string, number>,
): Map<string, Accum> {
  const next = new Map(acc);
  const keys = new Set([...Object.keys(base), ...Object.keys(cand)]);
  for (const k of keys) {
    if (!(k in base) || !(k in cand)) continue; // only paired observations
    const prev = next.get(k) ?? { baselineSum: 0, candidateSum: 0, n: 0 };
    next.set(k, {
      baselineSum: prev.baselineSum + base[k],
      candidateSum: prev.candidateSum + cand[k],
      n: prev.n + 1,
    });
  }
  return next;
}

interface Verdict {
  agent: string;
  baseline: string;
  candidate: string;
  axis: Axis;
  dataset: string;
  n: number;
  deltas: Record<string, number>;
  regression: boolean;
  verdict: "adopt" | "reject";
}

function decide(args: Args, acc: Map<string, Accum>, scoredPairs: number): Verdict {
  const deltas: Record<string, number> = {};
  let regression = false;
  const meanDeltas: number[] = [];
  for (const [ev, a] of acc) {
    if (a.n === 0) continue;
    const d = Math.round(((a.candidateSum - a.baselineSum) / a.n) * 1000) / 1000;
    deltas[ev] = d;
    meanDeltas.push(d);
    if (d < -AB_REGRESSION) regression = true;
  }
  const aggregate =
    meanDeltas.length > 0
      ? meanDeltas.reduce((s, v) => s + v, 0) / meanDeltas.length
      : 0;
  const verdict =
    aggregate >= AB_EPSILON && !regression && scoredPairs >= AB_MIN_N
      ? "adopt"
      : "reject";
  return {
    agent: args.agent,
    baseline: args.baseline,
    candidate: args.candidate,
    axis: args.axis,
    dataset: args.dataset,
    n: scoredPairs,
    deltas,
    regression,
    verdict,
  };
}

// ─── ModelScorecard claim (reuse run-evals' POST pattern) ───
async function persistScorecard(v: Verdict, acc: Map<string, Accum>): Promise<void> {
  const token = process.env.INTERNAL_TASK_TOKEN?.trim();
  if (!token) {
    log("INTERNAL_TASK_TOKEN unset — scorecard not persisted.");
    return;
  }
  const now = new Date().toISOString();
  const row: Record<string, { n: number; mean_score: number }> = {};
  for (const [ev, a] of acc) {
    if (a.n === 0) continue;
    row[ev] = { n: a.n, mean_score: Math.round((a.candidateSum / a.n) * 1000) / 1000 };
  }
  const claim = {
    claim_id: `ab_oracle_${Date.now()}`,
    agent_id: "agent_eval_harness",
    claim_type: "ModelScorecard",
    claim_data: JSON.stringify({
      window: "experiment",
      dataset: v.dataset,
      generated_at: now,
      scorecard: { [v.candidate]: row },
      ab: {
        agent: v.agent,
        axis: v.axis,
        baseline: v.baseline,
        candidate: v.candidate,
        n: v.n,
        deltas: v.deltas,
        regression: v.regression,
        verdict: v.verdict,
      },
    }),
    evidence_ids: "[]",
    confidence: 0.9,
    status: "proposed",
    description: `A/B oracle — ${v.agent} ${v.axis} ${v.baseline}→${v.candidate} on ${v.dataset}: ${v.verdict} (n=${v.n}).`,
    created_at: now,
  };
  try {
    const r = await fetch(`${WORKER_URL}/claims/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Token": token },
      body: JSON.stringify({ claims: [claim] }),
    });
    log(`ModelScorecard persisted: HTTP ${r.status}`);
  } catch (e) {
    log(`ModelScorecard persist failed: ${String((e as Error).message ?? e)}`);
  }
}

// ─── Dry-run fixture (no network) ───
// Each side carries `eval.code.experiment.*` attributes so the reused,
// pure-code `evalExperimentValidity` (no LLM, no network) produces a
// deterministic delta. Baseline fails several checks; candidate passes all.
function expAttrs(allPass: boolean): Record<string, unknown> {
  const keys = [
    "element_valid",
    "structure_matches_element",
    "pair_style_nonempty",
    "discriminative_property_nonempty",
    "discriminative_property_specific",
    "lammps_type_known",
  ];
  const out: Record<string, unknown> = { "eval.code.experiment.valid": allPass };
  keys.forEach((k, i) => {
    out[`eval.code.experiment.${k}`] = allPass ? true : i < 3;
  });
  return out;
}

const DRY_RUN_FIXTURE: Array<{
  example: DatasetExample;
  baseline: string;
  candidate: string;
  baselineAttrs: Record<string, unknown>;
  candidateAttrs: Record<string, unknown>;
}> = [
  {
    example: {
      question: "What C11 value does the Mishin-1999 eam/alloy potential predict for Al?",
      context: "Element: Al, Potential: Mishin-1999, Property: C11",
      reference: "C11 ≈ 113.8 GPa vs reference 108.2 GPa (+5.2% error).",
    },
    baseline: '{"ok":true,"answer":"Roughly 110 GPa."}',
    candidate: '{"ok":true,"answer":"C11 = 113.8 GPa (ref 108.2, +5.2%)."}',
    baselineAttrs: expAttrs(false),
    candidateAttrs: expAttrs(true),
  },
  {
    example: {
      question: "Design an experiment to discriminate BCC vs FCC Fe.",
      context: "Element: Fe",
      reference: "Compare C44 / elastic anisotropy under each lattice.",
    },
    baseline: '{"ok":true,"answer":"Run a simulation."}',
    candidate: '{"ok":true,"answer":"bcc/fcc Fe, eam/fs, compare C44 anisotropy."}',
    baselineAttrs: expAttrs(false),
    candidateAttrs: expAttrs(true),
  },
];

async function runDryRun(args: Args): Promise<Verdict> {
  log("dry-run: using inlined fixture, no network.");
  // Some reused combo evaluators (combo-evaluators.ts) call OpenAI
  // internally via llmJudge. The spec requires --dry-run to skip ALL
  // network, so we strip the key for this process: those evaluators then
  // throw offline and are dropped by scoreOutput's per-evaluator catch.
  // The deterministic signal comes from the pure-code evalExperimentValidity.
  delete process.env.OPENAI_API_KEY;
  const phase2: Phase2 = { available: false, evaluate: async () => ({}) };
  let acc = new Map<string, Accum>();
  let scored = 0;
  for (const f of DRY_RUN_FIXTURE) {
    const base = await scoreOutput(f.baseline, f.example.question, phase2, f.baselineAttrs);
    const cand = await scoreOutput(f.candidate, f.example.question, phase2, f.candidateAttrs);
    acc = accumulate(acc, base, cand);
    scored += 1;
  }
  return decide(args, acc, scored);
}

// ─── Main ───
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  JSON_MODE = args.json;

  if (args.dryRun) {
    const verdict = await runDryRun(args);
    process.stdout.write(JSON.stringify(verdict) + "\n");
    return;
  }

  const token = process.env.INTERNAL_TASK_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "ab-oracle: INTERNAL_TASK_TOKEN is required for live runs " +
        "(POST /ops/experiment-generate). Use --dry-run for an offline check.",
    );
  }

  log(`fetching ≤${args.limit} examples from dataset "${args.dataset}"`);
  const examples = await fetchDatasetExamples(args.dataset, args.limit);
  log(`got ${examples.length} examples`);
  if (examples.length === 0) {
    throw new Error(`ab-oracle: dataset "${args.dataset}" returned 0 examples`);
  }

  const phase2 = await buildPhase2();
  log(phase2.available ? "Phase-2 LLM judges enabled" : "Phase-2 disabled (no OPENAI_API_KEY) — combo-only");

  let acc = new Map<string, Accum>();
  let scored = 0;
  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    const [b, c] = await Promise.all([
      generate(args, args.baseline, ex, token),
      generate(args, args.candidate, ex, token),
    ]);
    if (b.error || c.error) {
      log(`example ${i + 1}/${examples.length} skipped: ${b.error ?? c.error}`);
      continue;
    }
    if (!b.text || !c.text) {
      log(`example ${i + 1}/${examples.length} skipped: empty generation`);
      continue;
    }
    const [bs, cs] = await Promise.all([
      scoreOutput(b.text, ex.question, phase2),
      scoreOutput(c.text, ex.question, phase2),
    ]);
    acc = accumulate(acc, bs, cs);
    scored += 1;
    log(`example ${i + 1}/${examples.length} scored (paired evaluators: ${Object.keys(bs).length})`);
  }

  const verdict = decide(args, acc, scored);
  await persistScorecard(verdict, acc);
  process.stdout.write(JSON.stringify(verdict) + "\n");
}

main().catch((e) => {
  console.error(`[ab-oracle] fatal: ${String((e as Error).message ?? e)}`);
  process.exit(1);
});
