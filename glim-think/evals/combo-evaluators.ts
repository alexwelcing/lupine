/**
 * Combo evaluators: code validation + LLM judgment working together.
 *
 * Each evaluator:
 *   1. Extracts structured data from a Phoenix span's output.value attribute
 *   2. Runs fast code-level validation (math checks, bounds, consistency)
 *   3. Runs LLM-as-a-judge on semantic quality
 *   4. Combines scores with domain-specific weights
 *
 * Designed to run in the Node.js eval runner (outside the Worker).
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// ─── Shared types ───

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

// ─── Helper: safe JSON parse ───
function parseOutput(attr: unknown): Record<string, unknown> | null {
  if (typeof attr === "string") {
    try {
      return JSON.parse(attr) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (attr && typeof attr === "object") return attr as Record<string, unknown>;
  return null;
}

// ─── Helper: LLM judge ───
async function llmJudge(prompt: string): Promise<{ score: number; explanation: string }> {
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are a rigorous scientific reviewer scoring research outputs.
Respond in EXACTLY this format (no extra text):
SCORE: <number 0.0-1.0>
EXPLANATION: <one sentence>`
,
    prompt,
  });
  const text = result.text.trim();
  const scoreMatch = text.match(/SCORE:\s*([0-9]*\.?[0-9]+)/);
  const explanationMatch = text.match(/EXPLANATION:\s*(.+)/);
  const score = scoreMatch ? Math.max(0, Math.min(1, parseFloat(scoreMatch[1]))) : 0.5;
  const explanation = explanationMatch ? explanationMatch[1].trim() : text.slice(0, 200);
  return { score, explanation };
}

// ═══════════════════════════════════════════════════════════════════
// 1. CAUSAL VALIDITY (Simpson's Paradox detection)
// ═══════════════════════════════════════════════════════════════════

export async function evalCausalValidity(span: SpanInput): Promise<ComboEvalResult | null> {
  if (!span.name.includes("Causal.runScreen")) return null;
  const data = parseOutput(span.attributes["output.value"]);
  if (!data) return null;

  const checks: string[] = [];
  let codeScore = 0;

  // Code validation
  const pooledR = Number(data.pooled_r ?? 0);
  const meanWithinR = Number(data.mean_within_r ?? 0);
  const reversal = Boolean(data.reversal);
  const withinCount = Number(data.within_count ?? 0);

  // Check 1: correlations in valid range
  if (Math.abs(pooledR) <= 1 && Math.abs(meanWithinR) <= 1) {
    codeScore += 0.25;
    checks.push("correlations_in_range");
  } else {
    checks.push("correlation_out_of_range");
  }

  // Check 2: sign consistency with reversal flag
  const signDiffers = (pooledR > 0 && meanWithinR < 0) || (pooledR < 0 && meanWithinR > 0);
  if (reversal === signDiffers) {
    codeScore += 0.25;
    checks.push("reversal_sign_consistent");
  } else {
    checks.push("reversal_sign_mismatch");
  }

  // Check 3: minimum groups for meaningful stratification
  if (withinCount >= 2) {
    codeScore += 0.25;
    checks.push("min_groups_met");
  } else {
    checks.push("insufficient_groups");
  }

  // Check 4: pattern text is non-empty and mentions the actual correlation values
  const pattern = String(data.pattern ?? "");
  if (pattern.length > 10 && pattern.includes(String(pooledR.toFixed(2)))) {
    codeScore += 0.25;
    checks.push("pattern_has_numbers");
  } else {
    checks.push("pattern_vague");
  }

  // LLM judgment
  const prompt = `
A research agent detected ${reversal ? "Simpson's Paradox" : "no paradox"} in materials science data.

Results:
- Pooled correlation: r = ${pooledR.toFixed(4)}
- Mean within-group correlation: r = ${meanWithinR.toFixed(4)}
- Groups with ≥3 records: ${withinCount}
- Pattern description: "${pattern}"

Score the quality of this causal screening on a scale 0.0–1.0 considering:
1. Did the agent correctly identify the direction of correlations?
2. Is the explanation precise about which groups drive the effect?
3. Does it avoid overstating causation from correlation?
`;
  const llm = await llmJudge(prompt);

  // Combined: 60% code, 40% LLM
  const score = Math.round((codeScore * 0.6 + llm.score * 0.4) * 100) / 100;
  const label = score >= 0.7 ? "valid" : score >= 0.4 ? "questionable" : "invalid";

  return {
    name: "causal_validity",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | llm=${llm.score.toFixed(2)}: ${llm.explanation}`,
    codeScore,
    llmScore: llm.score,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 2. D-BAND STATISTICAL RIGOR
// ═══════════════════════════════════════════════════════════════════

export async function evalDBandRigor(span: SpanInput): Promise<ComboEvalResult | null> {
  if (!span.name.includes("Causal.runDBandAnalysis")) return null;
  const data = parseOutput(span.attributes["output.value"]);
  if (!data) return null;

  const checks: string[] = [];
  let codeScore = 0;

  const rho = Number(data.spearman_rho ?? 0);
  const pParam = Number(data.spearman_p_param ?? 1);
  const pPerm = Number(data.spearman_p_perm ?? 1);
  const ci = data.bootstrap_ci_95 as [number, number] | undefined;
  const mwP = Number(data.mann_whitney_p ?? 1);
  const n = Number(data.n_elements ?? 0);
  const verdict = String(data.verdict ?? "inconclusive");

  // Check 1: rho in [-1, 1]
  if (Math.abs(rho) <= 1) {
    codeScore += 0.2;
    checks.push("rho_in_range");
  } else {
    checks.push("rho_out_of_range");
  }

  // Check 2: p-values in [0, 1]
  if (pParam >= 0 && pParam <= 1 && pPerm >= 0 && pPerm <= 1 && mwP >= 0 && mwP <= 1) {
    codeScore += 0.2;
    checks.push("p_values_valid");
  } else {
    checks.push("p_values_invalid");
  }

  // Check 3: CI lower < upper and contains rho
  if (ci && ci.length === 2 && ci[0] < ci[1] && rho >= ci[0] && rho <= ci[1]) {
    codeScore += 0.2;
    checks.push("ci_contains_rho");
  } else {
    checks.push("ci_suspect");
  }

  // Check 4: adequate sample size (≥ 10 for Spearman)
  if (n >= 10) {
    codeScore += 0.2;
    checks.push("sample_adequate");
  } else {
    checks.push("sample_small");
  }

  // Check 5: verdict consistency with p-values
  const significant = pPerm < 0.05;
  const strongEffect = Math.abs(rho) > 0.5;
  const verdictConsistent =
    (verdict === "supports" && significant && strongEffect && rho > 0) ||
    (verdict === "refutes" && significant && strongEffect && rho < 0) ||
    (verdict === "inconclusive" && (!significant || !strongEffect));
  if (verdictConsistent) {
    codeScore += 0.2;
    checks.push("verdict_consistent");
  } else {
    checks.push("verdict_inconsistent");
  }

  // LLM judgment
  const prompt = `
A research agent ran a D-band closure analysis with these statistics:
- Spearman ρ = ${rho.toFixed(3)} (parametric p = ${pParam.toFixed(4)}, permutation p = ${pPerm.toFixed(4)})
- Bootstrap 95% CI: [${ci ? ci[0].toFixed(3) : "?"}, ${ci ? ci[1].toFixed(3) : "?"}]
- Mann-Whitney U p = ${mwP.toFixed(4)}
- Sample: n = ${n} elements
- Verdict: ${verdict}

Score the statistical rigor (0.0–1.0). Consider:
1. Are the reported statistics internally consistent?
2. Is the verdict justified by the evidence?
3. Does the agent appropriately hedge uncertainty?
`;
  const llm = await llmJudge(prompt);

  const score = Math.round((codeScore * 0.5 + llm.score * 0.5) * 100) / 100;
  const label = score >= 0.7 ? "rigorous" : score >= 0.4 ? "mixed" : "weak";

  return {
    name: "dband_rigor",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | llm=${llm.score.toFixed(2)}: ${llm.explanation}`,
    codeScore,
    llmScore: llm.score,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 3. MANIFOLD QUALITY
// ═══════════════════════════════════════════════════════════════════

export async function evalManifoldQuality(span: SpanInput): Promise<ComboEvalResult | null> {
  if (!span.name.includes("Manifold.runAnalysis")) return null;
  const data = parseOutput(span.attributes["output.value"]);
  if (!data) return null;

  const checks: string[] = [];
  let codeScore = 0;

  const eigenvalues = (data.eigenvalues as number[] | undefined) ?? [];
  const pr = Number(data.pr ?? 0);
  const logR2 = Number(data.log_spacing_r2 ?? 0);
  const hyperRibbon = Boolean(data.hyper_ribbon);
  const potCount = Number(data.potential_count ?? 0);
  const propCount = Number(data.property_count ?? 0);

  // Check 1: all eigenvalues positive (covariance matrix PSD)
  const allPositive = eigenvalues.every(v => v > 0);
  if (allPositive) {
    codeScore += 0.2;
    checks.push("eigenvalues_positive");
  } else {
    checks.push("non_positive_eigenvalue");
  }

  // Check 2: eigenvalues sorted descending
  const sorted = eigenvalues.every((v, i) => i === 0 || v <= eigenvalues[i - 1]);
  if (sorted) {
    codeScore += 0.2;
    checks.push("eigenvalues_sorted");
  } else {
    checks.push("eigenvalues_unsorted");
  }

  // Check 3: PR in reasonable range [1, dim]
  const dim = propCount;
  if (dim > 0 && pr >= 1 && pr <= dim) {
    codeScore += 0.2;
    checks.push("pr_in_range");
  } else {
    checks.push("pr_out_of_range");
  }

  // Check 4: sufficient data for covariance
  if (potCount >= 3 && propCount >= 3) {
    codeScore += 0.2;
    checks.push("data_sufficient");
  } else {
    checks.push("data_insufficient");
  }

  // Check 5: log-spacing R² in [-1, 1]
  if (Math.abs(logR2) <= 1) {
    codeScore += 0.2;
    checks.push("log_r2_valid");
  } else {
    checks.push("log_r2_invalid");
  }

  // LLM judgment
  const prompt = `
A research agent analyzed the manifold structure of interatomic potential error data.

Results:
- Eigenvalues: [${eigenvalues.map(v => v.toFixed(4)).join(", ")}]
- Participation Ratio: ${pr.toFixed(3)}
- Log-spacing R²: ${logR2.toFixed(3)}
- Hyper-ribbon detected: ${hyperRibbon ? "yes" : "no"}
- Data size: ${potCount} potentials × ${propCount} properties

Score the quality of this manifold analysis (0.0–1.0). Consider:
1. Does the PR correctly indicate dimensionality given the eigenvalue spectrum?
2. Is the hyper-ribbon conclusion supported by the data?
3. Are the eigenvalues physically plausible for a covariance matrix?
`;
  const llm = await llmJudge(prompt);

  const score = Math.round((codeScore * 0.6 + llm.score * 0.4) * 100) / 100;
  const label = score >= 0.7 ? "sound" : score >= 0.4 ? "mixed" : "unsound";

  return {
    name: "manifold_quality",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | llm=${llm.score.toFixed(2)}: ${llm.explanation}`,
    codeScore,
    llmScore: llm.score,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. STATISTICAL RIGOR (generic — any span with numeric claims)
// ═══════════════════════════════════════════════════════════════════

export async function evalStatisticalRigor(span: SpanInput): Promise<ComboEvalResult | null> {
  const output = String(span.attributes["output.value"] ?? span.attributes["ai.text"] ?? "");
  if (!output) return null;

  const checks: string[] = [];
  let codeScore = 0;

  // Extract statistical claims with regex
  const pValues = [...output.matchAll(/p\s*=\s*([0-9]*\.?[0-9]+(?:e[+-]?\d+)?)/gi)].map(m => parseFloat(m[1]));
  const correlations = [...output.matchAll(/r\s*=\s*([+-]?[0-9]*\.?[0-9]+)/gi)].map(m => parseFloat(m[1]));
  const cis = [...output.matchAll(/(\d+%)\s*CI[:\s]*\[\s*([+-]?[0-9]*\.?[0-9]+)\s*,\s*([+-]?[0-9]*\.?[0-9]+)\s*\]/gi)];
  const sampleSizes = [...output.matchAll(/n\s*=\s*(\d+)/gi)].map(m => parseInt(m[1]));

  // Validate p-values
  const validPs = pValues.every(p => p >= 0 && p <= 1);
  if (validPs && pValues.length > 0) {
    codeScore += 0.25;
    checks.push("p_values_valid");
  } else if (pValues.length > 0) {
    checks.push("p_values_invalid");
  }

  // Validate correlations
  const validRs = correlations.every(r => Math.abs(r) <= 1);
  if (validRs && correlations.length > 0) {
    codeScore += 0.25;
    checks.push("correlations_valid");
  } else if (correlations.length > 0) {
    checks.push("correlation_out_of_range");
  }

  // Validate CIs
  let validCis = 0;
  for (const ci of cis) {
    const lo = parseFloat(ci[2]);
    const hi = parseFloat(ci[3]);
    if (lo < hi) validCis++;
  }
  if (cis.length > 0 && validCis === cis.length) {
    codeScore += 0.25;
    checks.push("cis_valid");
  } else if (cis.length > 0) {
    checks.push("cis_invalid");
  }

  // Validate sample sizes
  const adequateNs = sampleSizes.every(n => n >= 3);
  if (adequateNs && sampleSizes.length > 0) {
    codeScore += 0.25;
    checks.push("sample_sizes_adequate");
  } else if (sampleSizes.length > 0) {
    checks.push("sample_sizes_small");
  }

  if (checks.length === 0) return null; // no statistical claims found

  // LLM judgment
  const prompt = `
Evaluate the statistical rigor of this research output (0.0–1.0).

Output excerpt:
"${output.slice(0, 1200)}"

Consider:
1. Does the agent correctly interpret p-values and significance?
2. Are confidence intervals explained appropriately?
3. Does the agent avoid p-hacking language or overstating evidence?
4. Is the sample size acknowledged as a limitation where appropriate?
`;
  const llm = await llmJudge(prompt);

  const score = Math.round((codeScore * 0.5 + llm.score * 0.5) * 100) / 100;
  const label = score >= 0.7 ? "rigorous" : score >= 0.4 ? "mixed" : "weak";

  return {
    name: "statistical_rigor",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | llm=${llm.score.toFixed(2)}: ${llm.explanation}`,
    codeScore,
    llmScore: llm.score,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. JSON SCHEMA VALIDITY (generic — any structured output)
// ═══════════════════════════════════════════════════════════════════

export async function evalJsonSchemaValidity(span: SpanInput): Promise<ComboEvalResult | null> {
  const raw = span.attributes["output.value"];
  if (!raw) return null;

  const checks: string[] = [];
  let codeScore = 0;

  // Must parse as JSON
  const parsed = parseOutput(raw);
  if (!parsed) {
    return {
      name: "json_schema_validity",
      score: 0,
      label: "invalid",
      explanation: "output is not valid JSON",
      codeScore: 0,
      llmScore: 0,
      checks: ["parse_failed"],
    };
  }

  checks.push("parse_ok");
  codeScore += 0.3;

  // Must have expected top-level fields for known span types
  if (span.name.includes("Causal.runScreen")) {
    const required = ["ok", "pooled_r", "mean_within_r", "reversal"];
    const missing = required.filter(k => !(k in parsed));
    if (missing.length === 0) {
      codeScore += 0.35;
      checks.push("required_fields_present");
    } else {
      checks.push(`missing_fields:${missing.join(",")}`);
    }
  } else if (span.name.includes("Manifold.runAnalysis")) {
    const required = ["ok", "pr", "eigenvalues"];
    const missing = required.filter(k => !(k in parsed));
    if (missing.length === 0) {
      codeScore += 0.35;
      checks.push("required_fields_present");
    } else {
      checks.push(`missing_fields:${missing.join(",")}`);
    }
  } else {
    codeScore += 0.35;
    checks.push("generic_json_ok");
  }

  // No undefined or null values in required fields
  const hasNulls = Object.entries(parsed).some(([_, v]) => v === undefined);
  if (!hasNulls) {
    codeScore += 0.35;
    checks.push("no_null_values");
  } else {
    checks.push("null_values_found");
  }

  // LLM judgment — minimal for schema validity
  const prompt = `
This research agent output is structured JSON:
${JSON.stringify(parsed, null, 2).slice(0, 800)}

Score whether the JSON schema is complete and well-formed for a ${span.name} result (0.0–1.0).
`;
  const llm = await llmJudge(prompt);

  const score = Math.round((codeScore * 0.7 + llm.score * 0.3) * 100) / 100;
  const label = score >= 0.7 ? "valid" : score >= 0.4 ? "partial" : "invalid";

  return {
    name: "json_schema_validity",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | llm=${llm.score.toFixed(2)}: ${llm.explanation}`,
    codeScore,
    llmScore: llm.score,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. EXPERIMENT DESIGN VALIDITY
// ═══════════════════════════════════════════════════════════════════

export async function evalExperimentValidity(span: SpanInput): Promise<ComboEvalResult | null> {
  if (!span.name.includes("Experiment")) return null;
  const valid = span.attributes["eval.code.experiment.valid"];
  if (valid === undefined || valid === null) return null;

  const checks: string[] = [];
  let codeScore = 0;

  const checkKeys = [
    "element_valid",
    "structure_matches_element",
    "pair_style_nonempty",
    "discriminative_property_nonempty",
    "discriminative_property_specific",
    "lammps_type_known",
  ];

  for (const key of checkKeys) {
    const attrKey = `eval.code.experiment.${key}`;
    const val = span.attributes[attrKey];
    if (val === true) {
      codeScore += 1 / checkKeys.length;
      checks.push(key);
    } else {
      checks.push(`!${key}`);
    }
  }

  codeScore = Math.round(codeScore * 100) / 100;
  const score = codeScore; // pure code eval, no LLM
  const label = score >= 0.7 ? "valid" : score >= 0.4 ? "partial" : "invalid";

  return {
    name: "experiment_validity",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")})`,
    codeScore,
    llmScore: 0,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 7. QUEUE HEALTH
// ═══════════════════════════════════════════════════════════════════

export async function evalQueueHealth(span: SpanInput): Promise<ComboEvalResult | null> {
  if (!span.name.startsWith("queue.task")) return null;
  const latency = Number(span.attributes["queue.task.latency_ms"] ?? -1);
  if (latency < 0) return null;

  const checks: string[] = [];
  let codeScore = 0;

  const success = Boolean(span.attributes["queue.task.success"]);
  const anomaly = Boolean(span.attributes["queue.task.latency_anomaly"]);

  if (success) {
    codeScore += 0.5;
    checks.push("success");
  } else {
    checks.push("failed");
  }

  if (!anomaly) {
    codeScore += 0.5;
    checks.push("latency_ok");
  } else {
    checks.push("latency_anomaly");
  }

  const score = codeScore;
  const label = score >= 0.7 ? "healthy" : score >= 0.4 ? "degraded" : "unhealthy";

  return {
    name: "queue_health",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | latency=${latency}ms`,
    codeScore,
    llmScore: 0,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 8. GATEWAY PERFORMANCE
// ═══════════════════════════════════════════════════════════════════

export async function evalGatewayPerformance(span: SpanInput): Promise<ComboEvalResult | null> {
  if (!span.name.includes("gateway.complete") && !span.attributes["gateway.provider"]) return null;
  const provider = String(span.attributes["gateway.provider"] ?? "");
  if (!provider) return null;

  const checks: string[] = [];
  let codeScore = 0;

  const fallbackIndex = Number(span.attributes["gateway.fallback_index"] ?? 0);
  const cacheHit = Boolean(span.attributes["gateway.cache_hit"]);
  const latency = Number(span.attributes["gateway.latency_ms"] ?? 0);
  const gateTriggered = Boolean(span.attributes["gateway.quality_gate_triggered"]);

  // First-choice provider succeeded
  if (fallbackIndex === 0) {
    codeScore += 0.3;
    checks.push("first_choice");
  } else {
    checks.push(`fallback_${fallbackIndex}`);
  }

  // Cache hit = cheaper/faster
  if (cacheHit) {
    codeScore += 0.3;
    checks.push("cache_hit");
  } else {
    checks.push("cache_miss");
  }

  // Latency acceptable (< 5s)
  if (latency > 0 && latency < 5000) {
    codeScore += 0.2;
    checks.push("latency_ok");
  } else {
    checks.push("latency_high");
  }

  // Quality gate did NOT trigger (gate = previous provider failed heuristic)
  if (!gateTriggered) {
    codeScore += 0.2;
    checks.push("no_gate_trigger");
  } else {
    checks.push("gate_triggered");
  }

  const score = Math.round(codeScore * 100) / 100;
  const label = score >= 0.7 ? "optimal" : score >= 0.4 ? "acceptable" : "poor";

  return {
    name: "gateway_performance",
    score,
    label,
    explanation: `code=${codeScore.toFixed(2)}(${checks.join(",")}) | provider=${provider} latency=${latency}ms`,
    codeScore,
    llmScore: 0,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Registry: all combo evaluators
// ═══════════════════════════════════════════════════════════════════

export const COMBO_EVALUATORS = [
  evalCausalValidity,
  evalDBandRigor,
  evalManifoldQuality,
  evalStatisticalRigor,
  evalJsonSchemaValidity,
  evalExperimentValidity,
  evalQueueHealth,
  evalGatewayPerformance,
];
