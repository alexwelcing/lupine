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
import { createClient } from "@arizeai/phoenix-client";
import { getSpans, logSpanAnnotations } from "@arizeai/phoenix-client/spans";
import { COMBO_EVALUATORS } from "./combo-evaluators.js";
import { fetchSpans } from "./spans.js";

const PROJECT_NAME = process.env.PHOENIX_PROJECT_NAME ?? "glim-think";
const PHOENIX_API_KEY = process.env.PHOENIX_API_KEY;
const PHOENIX_COLLECTOR_ENDPOINT = process.env.PHOENIX_COLLECTOR_ENDPOINT;

function getPhoenixHost(): string {
  if (PHOENIX_COLLECTOR_ENDPOINT) {
    return PHOENIX_COLLECTOR_ENDPOINT.replace(/\/v1\/traces\/?$/, "");
  }
  throw new Error("PHOENIX_COLLECTOR_ENDPOINT or PHOENIX_HOST must be set");
}

const phoenixClient = createClient({
  options: {
    baseUrl: getPhoenixHost(),
    headers: PHOENIX_API_KEY ? { Authorization: `Bearer ${PHOENIX_API_KEY}` } : {},
  },
});

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
}

async function fetchLLMSpans(limit = 500): Promise<LLMSpan[]> {
  const { spans } = await getSpans({
    client: phoenixClient,
    project: { projectName: PROJECT_NAME },
    limit,
  });

  const results: LLMSpan[] = [];
  for (const s of spans as unknown[]) {
    const span = s as {
      name?: string;
      span_name?: string;
      attributes?: Record<string, unknown>;
      context?: { span_id?: string };
      span_id?: string;
      id?: string;
    };
    const name = span.name ?? span.span_name ?? "";
    if (!name.includes("generateText") && !name.includes("streamText") && !name.startsWith("gateway.")) {
      continue;
    }
    const attrs = span.attributes ?? {};
    const rawInput = attrs["input.value"] ?? attrs["ai.prompt"] ?? attrs["input"];
    const rawOutput = attrs["output.value"] ?? attrs["ai.text"] ?? attrs["output"];
    const input = typeof rawInput === "string" ? rawInput : rawInput != null ? JSON.stringify(rawInput) : null;
    const output = typeof rawOutput === "string" ? rawOutput : rawOutput != null ? JSON.stringify(rawOutput) : null;
    const rawId = span.context?.span_id ?? span.span_id ?? span.id;
    const spanId = rawId != null ? String(rawId) : null;
    if (input && output && spanId) results.push({ spanId, input, output });
  }
  return results;
}

async function runLLMEvaluator(evalConfig: EvalConfig, spans: LLMSpan[]) {
  const evaluator = createClassificationEvaluator({
    model: openai("gpt-4o-mini") as Parameters<typeof createClassificationEvaluator>[0]["model"],
    promptTemplate: evalConfig.template,
    choices: evalConfig.choices,
    name: evalConfig.name,
  });

  const spanAnnotations = await Promise.all(
    spans.map(async ({ spanId, input, output }) => {
      const { label, score, explanation } = await evaluator.evaluate({ input, output });
      return {
        spanId,
        name: evalConfig.name as "completeness" | "hallucination" | "reasoning",
        label,
        score,
        explanation,
        annotatorKind: "LLM" as const,
        metadata: { evaluator: evalConfig.name, input: input.slice(0, 500), output: output.slice(0, 500) },
      };
    }),
  );

  await logSpanAnnotations({ client: phoenixClient, spanAnnotations, sync: true });
  const passRate = spanAnnotations.filter((a) => a.label === evalConfig.positiveLabel).length / spanAnnotations.length;
  console.log(`  ${evalConfig.name}: ${spanAnnotations.length} spans, pass rate ${(passRate * 100).toFixed(1)}%`);
  return spanAnnotations;
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

  const comboAnnotations: Array<{
    spanId: string;
    name: string;
    label: string;
    score: number;
    explanation: string;
    annotatorKind: "CODE" | "LLM";
    metadata: Record<string, unknown>;
  }> = [];

  for (const span of domainSpans) {
    for (const evaluator of COMBO_EVALUATORS) {
      try {
        const result = await evaluator(span);
        if (!result) continue;

        comboAnnotations.push({
          spanId: span.id,
          name: result.name,
          label: result.label,
          score: result.score,
          explanation: result.explanation,
          annotatorKind: "CODE",
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
    await logSpanAnnotations({ client: phoenixClient, spanAnnotations: comboAnnotations, sync: true });

    // Summary by evaluator
    const byName: Record<string, { count: number; avgScore: number; avgCode: number; avgLLM: number }> = {};
    for (const a of comboAnnotations) {
      const name = a.name;
      if (!byName[name]) byName[name] = { count: 0, avgScore: 0, avgCode: 0, avgLLM: 0 };
      byName[name].count++;
      byName[name].avgScore += a.score;
      byName[name].avgCode += Number(a.metadata.code_score ?? 0);
      byName[name].avgLLM += Number(a.metadata.llm_score ?? 0);
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
  }

  console.log(`[evals] All evaluations complete. Combo: ${combo.scored}, Generic LLM: ${spans.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
