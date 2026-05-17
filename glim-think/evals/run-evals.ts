/**
 * Phoenix Cloud evaluation runner for glim-think.
 *
 * Runs outside the Cloudflare Worker (Node.js) because Phoenix eval
 * libraries depend on Node.js APIs. Pulls traces from Phoenix Cloud,
 * scores them with LLM-as-a-judge across multiple dimensions, and
 * pushes annotations back.
 *
 * Two-phase evaluation:
 *   Phase 1: Combo evaluators (code validation + LLM judgment) for
 *            domain-specific spans (Causal, Manifold, DBand, etc.)
 *   Phase 2: Generic LLM evaluators (completeness, hallucination,
 *            reasoning) for all LLM spans
 *
 * Usage:
 *   PHOENIX_API_KEY=xxx OPENAI_API_KEY=xxx PHOENIX_PROJECT_NAME=glim-think npx tsx run-evals.ts
 */

import { config } from "dotenv";
config({ path: "../.env" });
import { createClassificationEvaluator } from "@arizeai/phoenix-evals";
import { openai } from "@ai-sdk/openai";
import { COMBO_EVALUATORS } from "./combo-evaluators.js";
import { fetchSpans } from "./spans.js";
import { classifySpan, extractIO, extractLLMMeta } from "./openinference.js";
import { fetchProjectSpans, logAnnotations, type SpanAnnotation } from "./phoenixRest.js";

const PROJECT_NAME = process.env.PHOENIX_PROJECT_NAME ?? "glim-think";

// ─── Phase 2: Generic LLM evaluators ───

const completenessTemplate = `
You are evaluating whether a glim-think research output completely answers the prompt.

Prompt: {{input}}

Generated output:
{{output}}

To be marked "complete", the output should:
1. Directly address the prompt's request
2. Provide specific, non-generic information
3. Not leave obvious questions unanswered

Respond with ONLY one word: "complete" or "incomplete"
Then provide a brief explanation.
`;

const hallucinationTemplate = `
You are evaluating whether a glim-think research output contains hallucinated or fabricated claims.

Prompt: {{input}}

Generated output:
{{output}}

To be marked "factual", the output should:
1. Only make claims that are supported by the input or well-known scientific facts
2. Not invent specific numbers, citations, or studies that aren't in the input
3. Not make definitive causal claims without evidence

Respond with ONLY one word: "factual" or "hallucinated"
Then provide a brief explanation.
`;

const reasoningTemplate = `
You are evaluating the reasoning quality of a glim-think research output.

Prompt: {{input}}

Generated output:
{{output}}

To be marked "sound", the output should:
1. Follow a clear logical structure (premise → evidence → conclusion)
2. Distinguish correlation from causation appropriately
3. Acknowledge uncertainty rather than overstating confidence
4. Use appropriate hedging language ("appears to", "consistent with") for speculative claims

Respond with ONLY one word: "sound" or "flawed"
Then provide a brief explanation.
`;

interface EvalConfig {
  name: string;
  template: string;
  choices: Record<string, number>;
  positiveLabel: string;
}

const LLM_EVALS: EvalConfig[] = [
  {
    name: "completeness",
    template: completenessTemplate,
    choices: { complete: 1, incomplete: 0 },
    positiveLabel: "complete",
  },
  {
    name: "hallucination",
    template: hallucinationTemplate,
    choices: { factual: 1, hallucinated: 0 },
    positiveLabel: "factual",
  },
  {
    name: "reasoning",
    template: reasoningTemplate,
    choices: { sound: 1, flawed: 0 },
    positiveLabel: "sound",
  },
];

interface LLMSpan {
  spanId: string;
  input: string;
  output: string;
  model: string;
  provider: string;
  agent: string;
}

async function fetchLLMSpans(limit = 500): Promise<LLMSpan[]> {
  const spans = await fetchProjectSpans({ max: limit });
  const results: LLMSpan[] = [];
  for (const s of spans) {
    // Phoenix normalizes openinference.span.kind into span_kind.
    const attrs: Record<string, unknown> = { ...s.attributes };
    if (s.span_kind && s.span_kind !== "UNKNOWN") {
      attrs["openinference.span.kind"] = s.span_kind;
    }
    if (classifySpan(s.name, attrs) !== "llm") continue;
    const { input, output } = extractIO(attrs);
    const spanId = s.span_id || s.id;
    if (!input || !output || !spanId) continue;
    const { model } = extractLLMMeta(attrs);
    // Attribution. The live path is the AI-SDK (`ai.generateText`), which
    // tags the task via `ai.telemetry.functionId` (e.g. agent.synthesize,
    // research.comprehend-paper). The legacy gateway path uses
    // gateway.agent_class. Prefer whichever is present so the model×agent
    // scorecard populates on the path actually in use.
    const provider =
      /^gateway\.([a-z0-9-]+)/i.exec(s.name)?.[1] ??
      String(attrs["ai.model.provider"] ?? "ai-sdk");
    const agent = String(
      attrs["gateway.agent_class"] ??
      attrs["agent.class"] ??
      attrs["ai.telemetry.functionId"] ??
      "unknown",
    );
    results.push({
      spanId, input, output,
      model: model ?? "unknown",
      provider,
      agent,
    });
  }
  return results;
}

// ─── Model-performance scorecard ───
// Attributes every LLM eval score to the model/provider/agent that produced
// the span, so we can answer "which model is actually best, per task" and
// trend it. cell key = `${model}` and `${model}|${agent}`.
interface ScoreCell { n: number; pass: number; sum: number }
const SCORECARD: Map<string, Map<string, ScoreCell>> = new Map(); // bucket → evaluator → cell

function recordScore(bucket: string, evaluator: string, passed: boolean, score: number) {
  if (!SCORECARD.has(bucket)) SCORECARD.set(bucket, new Map());
  const m = SCORECARD.get(bucket)!;
  const c = m.get(evaluator) ?? { n: 0, pass: 0, sum: 0 };
  c.n += 1;
  c.pass += passed ? 1 : 0;
  c.sum += Number.isFinite(score) ? score : 0;
  m.set(evaluator, c);
}

async function runLLMEvaluator(evalConfig: EvalConfig, spans: LLMSpan[]) {
  const evaluator = createClassificationEvaluator({
    model: openai("gpt-4o-mini") as Parameters<typeof createClassificationEvaluator>[0]["model"],
    promptTemplate: evalConfig.template,
    choices: evalConfig.choices,
    name: evalConfig.name,
  });

  const spanAnnotations: SpanAnnotation[] = await Promise.all(
    spans.map(async (sp) => {
      const { label, score, explanation } = await evaluator.evaluate({ input: sp.input, output: sp.output });
      const passed = label === evalConfig.positiveLabel;
      const numScore = typeof score === "number" ? score : passed ? 1 : 0;
      // Attribute to model (and model|agent) for the scorecard + trend.
      recordScore(sp.model, evalConfig.name, passed, numScore);
      recordScore(`${sp.model}|${sp.agent}`, evalConfig.name, passed, numScore);
      return {
        span_id: sp.spanId,
        name: evalConfig.name,
        label,
        score,
        explanation,
        annotator_kind: "LLM" as const,
        metadata: {
          evaluator: evalConfig.name,
          model: sp.model, provider: sp.provider, agent: sp.agent,
          input: sp.input.slice(0, 500), output: sp.output.slice(0, 500),
        },
      };
    }),
  );

  await logAnnotations(spanAnnotations);
  const passRate =
    spanAnnotations.filter((a) => a.label === evalConfig.positiveLabel).length /
    Math.max(1, spanAnnotations.length);
  console.log(`  ${evalConfig.name}: ${spanAnnotations.length} spans, pass rate ${(passRate * 100).toFixed(1)}%`);
  return spanAnnotations;
}

/**
 * Emit the per-model scorecard: log it and persist as a ModelScorecard
 * claim (durable trend, router-consumable later). Skips persistence if the
 * worker token isn't configured (local runs still print).
 */
async function emitModelScorecard() {
  const models = [...SCORECARD.keys()].filter((k) => !k.includes("|")).sort();
  if (models.length === 0) {
    console.log("[evals] Model scorecard: no model-attributed LLM spans this run.");
    return;
  }
  const evaluators = LLM_EVALS.map((e) => e.name);
  const table: Record<string, Record<string, { n: number; pass_rate: number; mean_score: number }>> = {};
  console.log("[evals] ── Model performance scorecard ──");
  for (const bucket of [...SCORECARD.keys()].sort()) {
    const m = SCORECARD.get(bucket)!;
    const row: Record<string, { n: number; pass_rate: number; mean_score: number }> = {};
    const parts: string[] = [];
    for (const ev of evaluators) {
      const c = m.get(ev);
      if (!c || c.n === 0) continue;
      const pr = c.pass / c.n;
      row[ev] = { n: c.n, pass_rate: Math.round(pr * 1000) / 1000, mean_score: Math.round((c.sum / c.n) * 1000) / 1000 };
      parts.push(`${ev}=${(pr * 100).toFixed(0)}%(n${c.n})`);
    }
    if (parts.length) {
      table[bucket] = row;
      console.log(`  ${bucket.padEnd(28)} ${parts.join("  ")}`);
    }
  }

  const worker = process.env.WORKER_URL || "https://glim-think-v1.aw-ab5.workers.dev";
  const token = process.env.INTERNAL_TASK_TOKEN?.trim();
  if (!token) {
    console.log("[evals] INTERNAL_TASK_TOKEN unset — scorecard logged only (not persisted).");
    return;
  }
  const now = new Date().toISOString();
  const claim = {
    claim_id: `model_scorecard_${Date.now()}`,
    agent_id: "agent_eval_harness",
    claim_type: "ModelScorecard",
    claim_data: JSON.stringify({ window: "per_run", generated_at: now, scorecard: table }),
    evidence_ids: "[]",
    confidence: 0.9,
    status: "proposed",
    description: `Model performance scorecard — ${models.length} models × ${evaluators.length} evaluators (completeness/hallucination/reasoning), attributed from LLM span annotations.`,
    created_at: now,
  };
  try {
    const r = await fetch(`${worker}/claims/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Token": token },
      body: JSON.stringify({ claims: [claim] }),
    });
    console.log(`[evals] ModelScorecard persisted: HTTP ${r.status}`);
  } catch (e) {
    console.warn(`[evals] ModelScorecard persist failed: ${String(e)}`);
  }
}

// ─── Phase 1: Combo evaluators ───

async function runComboEvaluators() {
  console.log("[evals] Phase 1: Running combo evaluators (code + LLM)...");

  let comboSpans: Awaited<ReturnType<typeof fetchSpans>>;
  try {
    comboSpans = await fetchSpans(500);
  } catch (e) {
    console.warn(`[evals] Combo span fetch failed (skipping Phase 1): ${(e as Error).message}`);
    return { scored: 0, results: [] as Array<{ spanId: string; annotations: Record<string, string | number> }> };
  }

  const domainSpans = comboSpans.filter(
    s =>
      s.name.includes("Causal.runScreen") ||
      s.name.includes("Causal.runDBandAnalysis") ||
      s.name.includes("Manifold.runAnalysis") ||
      s.name.includes("Experiment") ||
      s.name.startsWith("queue.task") ||
      s.name.includes("gateway.complete")
  );

  console.log(`[evals] Found ${domainSpans.length} domain-specific spans for combo evaluation`);

  const comboAnnotations: SpanAnnotation[] = [];

  for (const span of domainSpans) {
    for (const evaluator of COMBO_EVALUATORS) {
      try {
        const result = await evaluator(span);
        if (!result) continue;

        comboAnnotations.push({
          span_id: span.id,
          name: result.name,
          label: result.label,
          score: result.score,
          explanation: result.explanation,
          annotator_kind: "CODE",
          metadata: {
            code_score: result.codeScore,
            llm_score: result.llmScore,
            checks: result.checks,
            evaluator: evaluator.name,
          },
        });
      } catch (e) {
        console.warn(`[evals] Evaluator ${evaluator.name} failed for span ${span.id}: ${(e as Error).message}`);
      }
    }
  }

  if (comboAnnotations.length > 0) {
    console.log(`[evals] Pushing ${comboAnnotations.length} combo annotations...`);
    await logAnnotations(comboAnnotations);

    // Summary by evaluator
    const byName: Record<string, { count: number; avgScore: number; avgCode: number; avgLLM: number }> = {};
    for (const a of comboAnnotations) {
      const name = a.name;
      if (!byName[name]) byName[name] = { count: 0, avgScore: 0, avgCode: 0, avgLLM: 0 };
      byName[name].count++;
      byName[name].avgScore += a.score ?? 0;
      byName[name].avgCode += Number(a.metadata?.code_score ?? 0);
      byName[name].avgLLM += Number(a.metadata?.llm_score ?? 0);
    }
    for (const [name, stats] of Object.entries(byName)) {
      console.log(
        `  ${name}: ${stats.count} spans | avg score ${(stats.avgScore / stats.count).toFixed(2)} ` +
          `(code ${(stats.avgCode / stats.count).toFixed(2)}, llm ${(stats.avgLLM / stats.count).toFixed(2)})`
      );
    }
  }

  return { scored: comboAnnotations.length, results: comboAnnotations };
}

// ─── Main ───

async function main() {
  console.log(`[evals] Fetching spans from Phoenix project: ${PROJECT_NAME}`);

  // Phase 1: Combo evaluators (domain-specific)
  const combo = await runComboEvaluators();

  // Phase 2: Generic LLM evaluators
  console.log("[evals] Phase 2: Running generic LLM evaluators...");
  const spans = await fetchLLMSpans(500);
  console.log(`[evals] Found ${spans.length} LLM spans to evaluate`);

  if (spans.length === 0) {
    console.log("[evals] No generic LLM spans found.");
  } else {
    for (const evalConfig of LLM_EVALS) {
      console.log(`[evals] Running ${evalConfig.name}...`);
      await runLLMEvaluator(evalConfig, spans);
    }
    await emitModelScorecard();
  }

  console.log(`[evals] All evaluations complete. Combo: ${combo.scored}, Generic LLM: ${spans.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
