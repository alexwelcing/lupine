/**
 * Layer-2 of the locked hypothesis-loop architecture.
 *
 * The scorecard's fitness function is **resolved-science throughput**, not
 * output polish. Layer-1 (a sibling module) instruments hypothesis-lifecycle
 * spans with `hypothesis.*` attributes (stage, status, confidence, resolved,
 * outcome, confidence_delta, resolution_latency_ms, discriminative_property).
 * This module turns those spans into eval scores answering ONE question:
 *
 *   "Is the swarm resolving real science faster?"
 *
 * Falsifiability + discriminative power gate the *front* of the loop (good
 * hypotheses are testable and separable). Resolution latency, refutation
 * health, and information gain measure the *back* of the loop (the swarm
 * actually closes hypotheses, decisively, with movement). High aggregate
 * scores ⇒ the swarm is doing science, not just emitting polished prose.
 *
 * STRUCTURE MIRRORS `combo-evaluators.ts` EXACTLY so the coordinator can
 * register `THROUGHPUT_EVALUATORS` in run-evals.ts the same way it registers
 * `COMBO_EVALUATORS`:
 *   - same `SpanInput` shape
 *   - each evaluator is `async (span) => ComboEvalResult | null`
 *   - code-heuristic primary, optional gpt-4o-mini LLM-judge secondary with
 *     weighted blend (code-only fallback when OPENAI_API_KEY is absent)
 *   - returns null when the span is out of scope (wrong stage / not a
 *     lifecycle span) so the runner skips it cleanly
 *
 * Every `evaluate` defensively handles missing attributes and NEVER throws.
 *
 * Designed to run in the Node.js eval runner (outside the Worker), same as
 * combo-evaluators.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// ─── Shared types (identical shape to combo-evaluators) ───

export interface ComboEvalResult {
  name: string;
  score: number; // 0.0 – 1.0
  label: string;
  explanation: string;
  codeScore: number;
  llmScore: number;
  checks: string[];
}

export interface SpanInput {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
}

// ─── Attribute helpers ───

function attrStr(span: SpanInput, key: string): string {
  const v = span.attributes[key];
  return v == null ? "" : String(v);
}

function attrNum(span: SpanInput, key: string): number | null {
  const v = span.attributes[key];
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function attrBool(span: SpanInput, key: string): boolean {
  const v = span.attributes[key];
  return v === true || v === "true" || v === 1 || v === "1";
}

/** True only when the span carries ANY hypothesis.* lifecycle attribute. */
function hasHypothesisAttrs(span: SpanInput): boolean {
  return Object.keys(span.attributes).some((k) => k.startsWith("hypothesis."));
}

/** Uniform "not a lifecycle span" result — neutral-low, never throws. */
function notLifecycle(name: string): ComboEvalResult {
  return {
    name,
    score: 0,
    label: "n/a",
    explanation: "no hypothesis.* attributes — not a lifecycle span",
    codeScore: 0,
    llmScore: 0,
    checks: ["not_lifecycle_span"],
  };
}

// ─── LLM judge (same pattern + degradation as combo-evaluators) ───

/**
 * Returns `null` (not a thrown error) when no OPENAI_API_KEY is configured or
 * the call fails, so callers fall back to a pure code score — exactly the
 * "code-only fallback if no key" contract combo-evaluators relies on.
 */
async function llmJudge(
  prompt: string,
): Promise<{ score: number; explanation: string } | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You are a rigorous scientific reviewer scoring research-process quality.
Respond in EXACTLY this format (no extra text):
SCORE: <number 0.0-1.0>
EXPLANATION: <one sentence>`,
      prompt,
    });
    const text = result.text.trim();
    const scoreMatch = text.match(/SCORE:\s*([0-9]*\.?[0-9]+)/);
    const explanationMatch = text.match(/EXPLANATION:\s*(.+)/);
    const score = scoreMatch
      ? Math.max(0, Math.min(1, parseFloat(scoreMatch[1])))
      : 0.5;
    const explanation = explanationMatch
      ? explanationMatch[1].trim()
      : text.slice(0, 200);
    return { score, explanation };
  } catch {
    return null;
  }
}

/** Blend code + (optional) LLM score with combo-evaluators' weighting style. */
function blend(
  codeScore: number,
  llm: { score: number; explanation: string } | null,
  codeWeight: number,
): { score: number; llmScore: number; tail: string } {
  if (!llm) {
    return {
      score: Math.round(codeScore * 100) / 100,
      llmScore: 0,
      tail: "",
    };
  }
  const score =
    Math.round((codeScore * codeWeight + llm.score * (1 - codeWeight)) * 100) /
    100;
  return {
    score,
    llmScore: llm.score,
    tail: ` | llm=${llm.score.toFixed(2)}: ${llm.explanation}`,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 1. FALSIFIABILITY  — on hypothesis.formation spans
//    Does the hypothesis state a concrete refutable prediction AND name
//    a discriminative property? A hypothesis you can't lose is worthless.
// ═══════════════════════════════════════════════════════════════════

const PREDICTION_CUES =
  /\b(predict|expect|will|should|if\b.*\bthen|increase|decrease|higher|lower|correlat|greater than|less than|>=?|<=?|differ|outperform|exceed|fall|rise)\b/i;
const FALSIFIER_CUES =
  /\b(refut|falsif|disconfirm|reject|fail(s|ed)? to|would be wrong|null hypothesis|otherwise|unless|disprove)\b/i;
const GENERIC_PROPERTY =
  /^(value|property|metric|result|output|data|number|score|thing)?$/i;

export async function evalFalsifiability(
  span: SpanInput,
): Promise<ComboEvalResult | null> {
  if (!hasHypothesisAttrs(span)) {
    return span.name.toLowerCase().includes("hypothesis")
      ? notLifecycle("falsifiability")
      : null;
  }
  if (attrStr(span, "hypothesis.stage") !== "formation") return null;

  const checks: string[] = [];
  let codeScore = 0;

  // Hypothesis prose is carried in standard IO; fall back across conventions.
  const text =
    attrStr(span, "hypothesis.text") ||
    attrStr(span, "output.value") ||
    attrStr(span, "ai.text") ||
    attrStr(span, "input.value");
  const prop = attrStr(span, "hypothesis.discriminative_property").trim();

  // Check 1: a concrete, directional prediction is stated.
  if (PREDICTION_CUES.test(text)) {
    codeScore += 0.4;
    checks.push("has_prediction");
  } else {
    checks.push("no_prediction");
  }

  // Check 2: an explicit refutation condition is present.
  if (FALSIFIER_CUES.test(text)) {
    codeScore += 0.25;
    checks.push("has_falsifier");
  } else {
    checks.push("no_falsifier");
  }

  // Check 3: a discriminative property is named and not generic boilerplate.
  if (prop && !GENERIC_PROPERTY.test(prop)) {
    codeScore += 0.35;
    checks.push("discriminative_property_specific");
  } else if (prop) {
    checks.push("discriminative_property_generic");
  } else {
    checks.push("no_discriminative_property");
  }

  codeScore = Math.round(codeScore * 100) / 100;

  const llm = await llmJudge(`
A research swarm proposed this hypothesis (formation stage):

"${text.slice(0, 1200)}"

Discriminative property tagged: "${prop || "(none)"}"

Score genuine falsifiability 0.0–1.0. Consider:
1. Is there a concrete, refutable prediction (not a vague aspiration)?
2. Could a single experiment plausibly DISPROVE it?
3. Is the discriminative property a real, measurable quantity?
Penalize unfalsifiable / tautological / "more research needed" framings.
`);

  const b = blend(codeScore, llm, 0.6);
  const label =
    b.score >= 0.7 ? "valid" : b.score >= 0.4 ? "weak" : "unfalsifiable";

  return {
    name: "falsifiability",
    score: b.score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")})${b.tail}`,
    codeScore,
    llmScore: b.llmScore,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 2. DISCRIMINATIVE POWER — on hypothesis.experiment_design spans
//    Does the design isolate a specific property that SEPARATES the
//    competing hypotheses (vs. a generic "measure stuff" plan)?
// ═══════════════════════════════════════════════════════════════════

const SEPARATION_CUES =
  /\b(distinguish|differentiate|separat|discriminat|contrast|versus|vs\.?|rule out|compet(e|ing)|alternative hypothes|control(?: group)?|ablat|isolate|hold .* constant|vary only)\b/i;

export async function evalDiscriminativePower(
  span: SpanInput,
): Promise<ComboEvalResult | null> {
  if (!hasHypothesisAttrs(span)) {
    return span.name.toLowerCase().includes("hypothesis")
      ? notLifecycle("discriminative_power")
      : null;
  }
  if (attrStr(span, "hypothesis.stage") !== "experiment_design") return null;

  const checks: string[] = [];
  let codeScore = 0;

  const prop = attrStr(span, "hypothesis.discriminative_property").trim();
  const design =
    attrStr(span, "hypothesis.design") ||
    attrStr(span, "output.value") ||
    attrStr(span, "ai.text") ||
    attrStr(span, "input.value");

  // Check 1: a discriminative property is named at all.
  if (prop) {
    codeScore += 0.25;
    checks.push("property_present");
  } else {
    checks.push("property_missing");
  }

  // Check 2: it is specific, not generic boilerplate.
  if (prop && !GENERIC_PROPERTY.test(prop) && prop.length >= 3) {
    codeScore += 0.35;
    checks.push("property_specific");
  } else {
    checks.push("property_generic");
  }

  // Check 3: the design text actually describes separating hypotheses.
  if (SEPARATION_CUES.test(design)) {
    codeScore += 0.4;
    checks.push("design_separates");
  } else {
    checks.push("design_unseparated");
  }

  codeScore = Math.round(codeScore * 100) / 100;

  const llm = await llmJudge(`
A research swarm designed an experiment to test a hypothesis.

Discriminative property: "${prop || "(none)"}"
Experiment design:
"${design.slice(0, 1200)}"

Score discriminative power 0.0–1.0. Consider:
1. Will the measured property actually SEPARATE the competing hypotheses,
   or could every hypothesis produce the same result?
2. Is the property specific (a named, measurable quantity) vs. generic?
3. Are confounds controlled so the signal is attributable?
`);

  const b = blend(codeScore, llm, 0.6);
  const label =
    b.score >= 0.7 ? "strong" : b.score >= 0.4 ? "partial" : "none";

  return {
    name: "discriminative_power",
    score: b.score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")})${b.tail}`,
    codeScore,
    llmScore: b.llmScore,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 3. RESOLUTION LATENCY — on hypothesis.verdict spans (code-only)
//    A hypothesis that takes days to resolve (or never resolves)
//    starves throughput. Score inversely on wall-clock latency.
// ═══════════════════════════════════════════════════════════════════

const HOUR_MS = 3_600_000;

export async function evalResolutionLatency(
  span: SpanInput,
): Promise<ComboEvalResult | null> {
  if (!hasHypothesisAttrs(span)) {
    return span.name.toLowerCase().includes("hypothesis")
      ? notLifecycle("resolution_latency")
      : null;
  }
  if (attrStr(span, "hypothesis.stage") !== "verdict") return null;

  const checks: string[] = [];
  const resolved = attrBool(span, "hypothesis.resolved");
  const latency = attrNum(span, "hypothesis.resolution_latency_ms");

  // Unresolved or no latency recorded ⇒ stalled, zero throughput credit.
  if (!resolved || latency == null || latency <= 0) {
    checks.push(resolved ? "latency_absent" : "unresolved");
    return {
      name: "resolution_latency",
      score: 0,
      label: "stalled",
      explanation: `code=0.00(${checks.join(",")}) — hypothesis not resolved with a recorded latency`,
      codeScore: 0,
      llmScore: 0,
      checks,
    };
  }

  // Graded inverse curve: ≤6h excellent → 1.0; degrades to 0 by ~72h.
  const hours = latency / HOUR_MS;
  let codeScore: number;
  if (hours <= 6) {
    codeScore = 1.0;
    checks.push("under_6h");
  } else if (hours <= 12) {
    codeScore = 0.85;
    checks.push("under_12h");
  } else if (hours <= 24) {
    codeScore = 0.65;
    checks.push("under_24h");
  } else if (hours <= 48) {
    codeScore = 0.4;
    checks.push("under_48h");
  } else if (hours <= 72) {
    codeScore = 0.2;
    checks.push("under_72h");
  } else {
    codeScore = 0.05;
    checks.push("over_72h");
  }

  const label =
    codeScore >= 0.65 ? "fast" : codeScore >= 0.2 ? "slow" : "stalled";

  return {
    name: "resolution_latency",
    score: codeScore,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | latency=${hours.toFixed(2)}h`,
    codeScore,
    llmScore: 0,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. REFUTATION HEALTH — on hypothesis.verdict spans (code-only)
//    A healthy science loop REFUTES, it doesn't only confirm. Decisive
//    outcomes (confirmed|refuted) beat "inconclusive" dithering.
// ═══════════════════════════════════════════════════════════════════

export async function evalRefutationHealth(
  span: SpanInput,
): Promise<ComboEvalResult | null> {
  if (!hasHypothesisAttrs(span)) {
    return span.name.toLowerCase().includes("hypothesis")
      ? notLifecycle("refutation_health")
      : null;
  }
  if (attrStr(span, "hypothesis.stage") !== "verdict") return null;

  const checks: string[] = [];
  const outcome = attrStr(span, "hypothesis.outcome").toLowerCase();
  const status = attrStr(span, "hypothesis.status").toLowerCase();

  let codeScore: number;
  let label: string;

  if (outcome === "refuted" || status === "refuted") {
    // Refutation is the highest-information, hardest-to-fake outcome.
    codeScore = 1.0;
    label = "decisive";
    checks.push("refuted");
  } else if (outcome === "confirmed" || status === "confirmed") {
    // Decisive and useful, but confirmation bias is the cheaper path.
    codeScore = 0.8;
    label = "decisive";
    checks.push("confirmed");
  } else if (outcome === "inconclusive") {
    codeScore = 0.2;
    label = "inconclusive";
    checks.push("inconclusive");
  } else {
    // Verdict span with no decisive outcome recorded.
    codeScore = 0.1;
    label = "inconclusive";
    checks.push("no_outcome");
  }

  return {
    name: "refutation_health",
    score: codeScore,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | outcome=${outcome || "(none)"}`,
    codeScore,
    llmScore: 0,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. INFORMATION GAIN — on hypothesis.verdict spans (code-only)
//    Proxy: |confidence_delta|. A resolution that barely moved the
//    swarm's belief gained little information regardless of outcome.
// ═══════════════════════════════════════════════════════════════════

export async function evalInformationGain(
  span: SpanInput,
): Promise<ComboEvalResult | null> {
  if (!hasHypothesisAttrs(span)) {
    return span.name.toLowerCase().includes("hypothesis")
      ? notLifecycle("information_gain")
      : null;
  }
  if (attrStr(span, "hypothesis.stage") !== "verdict") return null;

  const checks: string[] = [];
  const delta = attrNum(span, "hypothesis.confidence_delta");

  if (delta == null) {
    checks.push("no_confidence_delta");
    return {
      name: "information_gain",
      score: 0,
      label: "low",
      explanation: "code=0.00(no_confidence_delta) — no confidence movement recorded",
      codeScore: 0,
      llmScore: 0,
      checks,
    };
  }

  // confidence is 0..1, so |delta| is 0..1; grade the belief swing.
  const mag = Math.min(1, Math.abs(delta));
  let codeScore: number;
  let label: string;
  if (mag >= 0.4) {
    codeScore = 1.0;
    label = "high";
    checks.push("large_swing");
  } else if (mag >= 0.2) {
    codeScore = 0.7;
    label = "moderate";
    checks.push("moderate_swing");
  } else if (mag >= 0.05) {
    codeScore = 0.4;
    label = "moderate";
    checks.push("small_swing");
  } else {
    codeScore = 0.1;
    label = "low";
    checks.push("negligible_swing");
  }

  return {
    name: "information_gain",
    score: codeScore,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | |Δconfidence|=${mag.toFixed(3)}`,
    codeScore,
    llmScore: 0,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Registry: all throughput evaluators (mirrors COMBO_EVALUATORS shape).
// ═══════════════════════════════════════════════════════════════════

export const THROUGHPUT_EVALUATORS = [
  evalFalsifiability,
  evalDiscriminativePower,
  evalResolutionLatency,
  evalRefutationHealth,
  evalInformationGain,
];
