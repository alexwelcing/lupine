/**
 * Code-based heuristic evaluators for agent outputs.
 *
 * These run synchronously inside the Worker (no external LLM call),
 * making them cheap and fast. They are intentionally calibrated to
 * produce a mix of passes and fails so the feedback loop is visible.
 *
 * Scores are 0.0–1.0. Thresholds:
 *   ≥ 0.7  → "pass"
 *   0.4–0.69 → "marginal"
 *   < 0.4  → "fail"
 */

export interface HeuristicResult {
  score: number;
  label: string;
  explanation: string;
}

/** Evaluate completeness of a research output. */
export function evalCompleteness(output: string): HeuristicResult {
  const o = output.trim();
  let score = 0;
  const checks: string[] = [];

  // Length heuristic (not too short)
  if (o.length > 300) {
    score += 0.25;
    checks.push("length>300");
  } else if (o.length > 150) {
    score += 0.15;
    checks.push("length>150");
  }

  // Contains quantitative data
  if (/\d+(\.\d+)?\s*(eV|GPa|Å|nm|K|J|meV|%)/.test(o)) {
    score += 0.25;
    checks.push("has_units");
  } else if (/\d+(\.\d+)?/.test(o)) {
    score += 0.15;
    checks.push("has_numbers");
  }

  // Contains reasoning / causal language
  if (/\b(because|since|therefore|thus|hence|consequently)\b/i.test(o)) {
    score += 0.2;
    checks.push("has_reasoning");
  }

  // Contains structured sections
  if (/(\n#{1,3}\s|\n\*\s|\n\d+\.\s)/.test(o)) {
    score += 0.15;
    checks.push("has_structure");
  }

  // Not a refusal
  const refusal = /\b(I cannot|I can't|I do not know|I'm unable|unable to|no information|not enough data)\b/i.test(o);
  if (!refusal) {
    score += 0.15;
    checks.push("no_refusal");
  } else {
    score -= 0.3;
    checks.push("refusal_detected");
  }

  score = Math.max(0, Math.min(1, score));

  let label: string;
  if (score >= 0.7) label = "pass";
  else if (score >= 0.4) label = "marginal";
  else label = "fail";

  return {
    score,
    label,
    explanation: `checks=[${checks.join(", ")}], length=${o.length}, score=${score.toFixed(2)}`,
  };
}

/** Evaluate correctness for JSON-structured outputs. */
export function evalJsonValidity(output: string): HeuristicResult {
  try {
    JSON.parse(output);
    return {
      score: 1.0,
      label: "pass",
      explanation: "valid_json",
    };
  } catch {
    return {
      score: 0.0,
      label: "fail",
      explanation: "invalid_json",
    };
  }
}

/** Evaluate that output is not empty or whitespace-only. */
export function evalNonEmpty(output: string): HeuristicResult {
  const o = output.trim();
  if (o.length === 0) {
    return { score: 0, label: "fail", explanation: "empty_output" };
  }
  if (o.length < 20) {
    return { score: 0.3, label: "marginal", explanation: `very_short_length=${o.length}` };
  }
  return { score: 1, label: "pass", explanation: `length=${o.length}` };
}

/** Run all applicable heuristics and return the aggregate result. */
export function runHeuristics(output: string, opts?: { expectJson?: boolean }): HeuristicResult {
  const results: HeuristicResult[] = [evalCompleteness(output), evalNonEmpty(output)];
  if (opts?.expectJson) {
    results.push(evalJsonValidity(output));
  }

  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const allPass = results.every((r) => r.label === "pass");
  const anyFail = results.some((r) => r.label === "fail");

  let label: string;
  if (allPass) label = "pass";
  else if (anyFail) label = "fail";
  else label = "marginal";

  return {
    score: Math.round(avgScore * 100) / 100,
    label,
    explanation: results.map((r) => `${r.label}(${r.score}):${r.explanation}`).join(" | "),
  };
}
