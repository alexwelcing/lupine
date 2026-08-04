/**
 * Omnigents — multi-model coordination for glim-think.
 *
 * The existing deep tier (`selectDeepRoute` in agents/models.ts) does
 * *single-model selection*: it picks ONE model per request (the RFC's
 * "Waterfall/Specialist" pattern). This module elevates the model layer to
 * true *coordination*: it calls multiple models and reconciles their outputs,
 * because in a pool of near-parity LLMs (MiniMax / GLM / GPT / Workers AI)
 * the leverage is in *how* they are combined, not *which* one is picked.
 *
 * RFC alignment (Durablestreams + Flue + Hermes §7):
 *   - Strategy catalog: Race, Fan-out/Merge, Ensemble-of-Experts, plus the
 *     existing Waterfall/Specialist as single-model delegates.
 *   - Coordination primitives: ConfidenceFilter (runHeuristics as the 0–1
 *     proxy — stack-aligned, no extra model call), MergeJudge, TimeoutBudget.
 *   - Strategy Registry: KV-backed, hot-reloadable per the single-egress
 *     principle. Maps (intent, priority) → strategy + provider set.
 *   - Per-call trace: one structured event per coordination call, persisted
 *     to D1 (`coordination_traces`) so coordination-effectiveness KPIs are
 *     computable and the cocoindex evidence pipeline can index them.
 *
 * What this deliberately does NOT do (not aligned with our stack): it does
 * not introduce a separate streaming bus (the feed/ + queues already exist),
 * a separate workflow orchestrator (Cloudflare Workflows already exist), or a
 * portal proxy (providers are already abstracted in models.ts). It slots in
 * above the existing model layer and reuses `generateForProvider`.
 *
 * Testability: every strategy accepts an injectable `callProvider` so the
 * full coordination logic is exercisable without hitting a real LLM.
 */
import type { Env } from "../types";
import {
  type DeepProvider,
  coordinatorPool,
  generateForProvider,
  pickStrongProvider,
  selectDeepProviderId,
} from "./models";
import { runHeuristics } from "../evals/heuristics";
import { recordCoordinationTrace } from "./coordinatorTraces";
import { consultMemory, applyMemoryBias, emitTrace } from "./memoryClient";

/** Coordination strategies (RFC §7.2). */
export type CoordinationStrategy =
  | "race" // all providers concurrently; first confident one wins
  | "fan_out_merge" // N producers → merge judge synthesizes
  | "ensemble_of_experts" // producers → critic → integrator
  | "waterfall" // cheapest-first with confidence escalation
  | "specialist"; // single best provider (delegate to selectDeepRoute)

export type IntentClass =
  | "trivial" // factual lookup, formatting, autocomplete
  | "reasoning" // multi-step analysis, synthesis, planning
  | "expert" // research, strategy, red-teaming, verification
  | "classified" // intent already routed to a specialist model
  | "unknown";

export type Priority = "low" | "normal" | "high";

/** Provider identity reused from models.ts (deep providers + the fast tier). */
export type ProviderId = DeepProvider | "workers-ai";

export interface CoordinationRequest {
  prompt: string;
  system?: string;
  /** OpenInference functionId — the scorecard buckets on this. */
  agentClass: string;
  intent?: IntentClass;
  priority?: Priority;
  /** Pin a strategy instead of resolving from the registry. */
  strategy?: CoordinationStrategy;
  /** Pin the provider set instead of using the whole pool. */
  providers?: ProviderId[];
  maxOutputTokens?: number;
  temperature?: number;
  /** Per-provider wall-clock budget (ms). Default 20s. */
  perProviderTimeoutMs?: number;
  /** Confidence threshold for Race/Waterfall acceptance (0–1). Default 0.5. */
  confidenceThreshold?: number;
}

export interface ProviderAttempt {
  provider: ProviderId;
  model: string;
  text: string;
  confidence: number;
  tokens: number;
  latencyMs: number;
  outcome: "succeeded" | "failed" | "timed_out" | "skipped";
  error?: string;
}

export interface CoordinationResult {
  text: string;
  provider: ProviderId;
  model: string;
  strategy: CoordinationStrategy;
  /** success | partial (degraded, e.g. race fell back to best-effort) | failed. */
  outcome: "success" | "partial" | "failed";
  attempts: ProviderAttempt[];
  /** The single-best-model baseline, for coordination-hit scoring. */
  baselineProvider: ProviderId;
  /** 1 if coordination beat the baseline confidence, else 0. */
  coordinationHit: 0 | 1;
  totalTokens: number;
  latencyMs: number;
}

/** Injectable per-provider call. Defaults to the real generateForProvider. */
export type ProviderCaller = (
  env: Env,
  provider: ProviderId,
  opts: {
    prompt: string;
    system?: string;
    agentClass: string;
    maxOutputTokens?: number;
    temperature?: number;
    timeoutMs?: number;
  },
) => Promise<{ text: string; provider: ProviderId; model: string; tokens: number; latencyMs: number }>;

const DEFAULT_PER_PROVIDER_TIMEOUT_MS = 20_000;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/** Confidence proxy: the existing 0–1 heuristic score (stack-aligned, free). */
export function confidenceScore(text: string): number {
  if (!text.trim()) return 0;
  return runHeuristics(text).score;
}

/** Attempt a single provider, capturing success/failure into an attempt record. */
async function attemptProvider(
  env: Env,
  callProvider: ProviderCaller,
  req: CoordinationRequest,
  provider: ProviderId,
): Promise<ProviderAttempt> {
  const start = Date.now();
  try {
    const res = await callProvider(env, provider, {
      prompt: req.prompt,
      system: req.system,
      agentClass: req.agentClass,
      maxOutputTokens: req.maxOutputTokens,
      temperature: req.temperature,
      timeoutMs: req.perProviderTimeoutMs ?? DEFAULT_PER_PROVIDER_TIMEOUT_MS,
    });
    const text = res.text ?? "";
    return {
      provider,
      model: res.model,
      text,
      confidence: confidenceScore(text),
      tokens: res.tokens ?? 0,
      latencyMs: Date.now() - start,
      outcome: text.trim() ? "succeeded" : "failed",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const timedOut = /timeout|timed?\s*out|abort/i.test(msg);
    return {
      provider,
      model: "unknown",
      text: "",
      confidence: 0,
      tokens: 0,
      latencyMs: Date.now() - start,
      outcome: timedOut ? "timed_out" : "failed",
      error: msg.slice(0, 300),
    };
  }
}

function runJudge(
  env: Env,
  callProvider: ProviderCaller,
  req: CoordinationRequest,
  drafts: ProviderAttempt[],
  role: string,
): Promise<ProviderAttempt> {
  const judge = pickStrongProvider(env);
  const shuffled = [...drafts].filter((d) => d.outcome === "succeeded").sort(() => Math.random() - 0.5);
  // Strip model identifiers to avoid judge anchoring bias (RFC §7.2.2).
  const labeled = shuffled.map((d, i) => `--- DRAFT ${i + 1} ---\n${d.text}`).join("\n\n");
  const judgePrompt = `You are a ${role}. Below are ${shuffled.length} independent draft answers to the same research prompt, produced by different models. Synthesize the single most accurate, complete answer. Do not favor any draft because of order or style — pick the strongest claims from each, reconcile contradictions, and omit nothing correct. Respond with the final answer only.\n\nORIGINAL PROMPT:\n${req.prompt}\n\n${labeled}`;
  return attemptProvider(env, callProvider, { ...req, prompt: judgePrompt }, judge);
}

// ─── Strategies ──────────────────────────────────────────────────────────────

/**
 * Race: fire all providers concurrently; the first response whose confidence
 * clears the threshold wins (RFC §7.2.1). Losers are recorded but discarded.
 * If no draft clears the threshold, falls back to the highest-confidence draft
 * (degraded outcome).
 */
export async function raceStrategy(
  env: Env,
  req: CoordinationRequest,
  providers: ProviderId[],
  callProvider: ProviderCaller,
): Promise<CoordinationResult> {
  const start = Date.now();
  const threshold = req.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const attempts = await Promise.all(
    providers.map((p) => attemptProvider(env, callProvider, req, p)),
  );
  const winner = attempts
    .filter((a) => a.outcome === "succeeded" && a.confidence >= threshold)
    .sort((a, b) => a.latencyMs - b.latencyMs)[0];
  const successful = attempts.filter((a) => a.outcome === "succeeded");
  const chosen = winner ?? successful.sort((a, b) => b.confidence - a.confidence)[0];
  const baseline = bestBaseline(attempts);
  return finalize(
    req,
    "race",
    chosen,
    attempts,
    start,
    !!winner ? "success" : chosen ? "partial" : "failed",
    baseline,
  );
}

/**
 * Fan-out/Merge: N producers answer concurrently → a MergeJudge synthesizes
 * the most accurate answer from the drafts (RFC §7.2.2).
 */
export async function fanOutMergeStrategy(
  env: Env,
  req: CoordinationRequest,
  providers: ProviderId[],
  callProvider: ProviderCaller,
): Promise<CoordinationResult> {
  const start = Date.now();
  const drafts = await Promise.all(
    providers.map((p) => attemptProvider(env, callProvider, req, p)),
  );
  const usable = drafts.filter((d) => d.outcome === "succeeded");
  if (usable.length === 0) {
    const baseline = bestBaseline(drafts);
    return finalize(req, "fan_out_merge", undefined, drafts, start, "failed", baseline);
  }
  if (usable.length === 1) {
    // Nothing to merge — return the single usable draft.
    const baseline = bestBaseline(drafts);
    return finalize(req, "fan_out_merge", usable[0], drafts, start, "success", baseline);
  }
  const judgeAttempt = await runJudge(env, callProvider, req, usable, "MergeJudge");
  const allAttempts = [...drafts];
  if (judgeAttempt.outcome === "succeeded") allAttempts.push(judgeAttempt);
  const baseline = bestBaseline(usable);
  const chosen = judgeAttempt.outcome === "succeeded" ? judgeAttempt : baseline;
  return finalize(
    req,
    "fan_out_merge",
    chosen,
    allAttempts,
    start,
    judgeAttempt.outcome === "succeeded" ? "success" : "partial",
    baseline,
  );
}

/**
 * Ensemble-of-Experts: producers → critic (identifies errors, ranks) →
 * integrator (final synthesis with citations) (RFC §7.2.5). Reserved for
 * expert-intent, high-priority requests.
 */
export async function ensembleOfExpertsStrategy(
  env: Env,
  req: CoordinationRequest,
  providers: ProviderId[],
  callProvider: ProviderCaller,
): Promise<CoordinationResult> {
  const start = Date.now();
  const drafts = await Promise.all(
    providers.map((p) => attemptProvider(env, callProvider, req, p)),
  );
  const usable = drafts.filter((d) => d.outcome === "succeeded");
  if (usable.length === 0) {
    return finalize(req, "ensemble_of_experts", undefined, drafts, start, "failed", bestBaseline(drafts));
  }
  // Critic pass: rank drafts by correctness/completeness.
  const criticAttempt = await runJudge(
    env,
    callProvider,
    req,
    usable,
    "research critic who identifies errors and ranks drafts by correctness and completeness",
  );
  // Integrator pass: final synthesis informed by the critique.
  const integratorInput =
    criticAttempt.outcome === "succeeded"
      ? `Critique:\n${criticAttempt.text}\n\n--- DRAFTS ---\n${usable
          .map((d) => d.text)
          .join("\n\n")}`
      : usable.map((d) => d.text).join("\n\n");
  const integrator = pickStrongProvider(env);
  const integrationAttempt = await attemptProvider(
    env,
    callProvider,
    { ...req, prompt: `Synthesize the single best final answer from these inputs. Cite which draft each claim came from where it matters.\n\nORIGINAL PROMPT:\n${req.prompt}\n\n${integratorInput}` },
    integrator,
  );
  const allAttempts = [...drafts];
  if (criticAttempt.outcome === "succeeded") allAttempts.push(criticAttempt);
  if (integrationAttempt.outcome === "succeeded") allAttempts.push(integrationAttempt);
  const baseline = bestBaseline(usable);
  const chosen =
    integrationAttempt.outcome === "succeeded"
      ? integrationAttempt
      : criticAttempt.outcome === "succeeded"
        ? criticAttempt
        : baseline;
  return finalize(
    req,
    "ensemble_of_experts",
    chosen,
    allAttempts,
    start,
    integrationAttempt.outcome === "succeeded" ? "success" : "partial",
    baseline,
  );
}

/**
 * Waterfall: cheapest-first with confidence escalation (RFC §7.2.3). This is
 * expressed as explicit coordination here so it emits the same trace shape as
 * the other strategies, even though selectDeepRoute already does single-pick.
 */
export async function waterfallStrategy(
  env: Env,
  req: CoordinationRequest,
  providers: ProviderId[],
  callProvider: ProviderCaller,
): Promise<CoordinationResult> {
  const start = Date.now();
  const threshold = req.confidenceThreshold ?? (DEFAULT_CONFIDENCE_THRESHOLD + 0.3); // 0.8 default for waterfall
  const ordered = [...providers]; // coordinatorPool is already cheapest-first
  const attempts: ProviderAttempt[] = [];
  let chosen: ProviderAttempt | undefined;
  for (const p of ordered) {
    const a = await attemptProvider(env, callProvider, req, p);
    attempts.push(a);
    if (a.outcome === "succeeded" && a.confidence >= threshold) {
      chosen = a;
      break;
    }
  }
  if (!chosen) {
    chosen = attempts.filter((a) => a.outcome === "succeeded").sort((a, b) => b.confidence - a.confidence)[0];
  }
  // Remaining providers are recorded as skipped.
  const seen = new Set(attempts.map((a) => a.provider));
  for (const p of ordered) {
    if (!seen.has(p)) attempts.push({ provider: p, model: "", text: "", confidence: 0, tokens: 0, latencyMs: 0, outcome: "skipped" });
  }
  const baseline = bestBaseline(attempts);
  return finalize(req, "waterfall", chosen, attempts, start, chosen ? "success" : "failed", baseline);
}

/**
 * Specialist: route to the single best provider for the intent via the
 * eval-aware scorecard (RFC §7.2.4). Delegates to selectDeepRoute, so it is
 * the existing single-model path expressed as one coordination attempt.
 */
export async function specialistStrategy(
  env: Env,
  req: CoordinationRequest,
  _providers: ProviderId[],
  callProvider: ProviderCaller,
): Promise<CoordinationResult> {
  const start = Date.now();
  // Identity-only routing decision (no eager model construction); the injected
  // callProvider builds the model once when it actually fires.
  const provider = await selectDeepProviderId(env);
  const attempt = await attemptProvider(env, callProvider, req, provider);
  return finalize(req, "specialist", attempt, [attempt], start, attempt.outcome === "succeeded" ? "success" : "failed", attempt);
}

// ─── Strategy Registry (KV-backed, hot-reloadable) ───────────────────────────

export interface StrategyRule {
  when: { intent?: IntentClass[]; priority?: Priority[] };
  strategy: CoordinationStrategy;
}

const DEFAULT_REGISTRY: StrategyRule[] = [
  // RFC §7.8 worked decision tree, expressed as ordered rules (first match wins).
  { when: { intent: ["trivial"] }, strategy: "waterfall" },
  { when: { intent: ["expert"], priority: ["high"] }, strategy: "ensemble_of_experts" },
  { when: { intent: ["reasoning"], priority: ["high"] }, strategy: "fan_out_merge" },
  { when: { intent: ["classified"] }, strategy: "specialist" },
  { when: { priority: ["high"] }, strategy: "fan_out_merge" },
];

const REGISTRY_KV_KEY = "omnigents:strategy-registry";

export async function loadStrategyRegistry(env: Env): Promise<StrategyRule[]> {
  try {
    const raw = await env.CONFIG.get(REGISTRY_KV_KEY);
    if (!raw) return DEFAULT_REGISTRY;
    const parsed = JSON.parse(raw) as StrategyRule[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REGISTRY;
  } catch {
    return DEFAULT_REGISTRY;
  }
}

/** Hot-reload the registry: write to KV (Workers pick it up within ~60s). */
export async function setStrategyRegistry(env: Env, rules: StrategyRule[]): Promise<void> {
  await env.CONFIG.put(REGISTRY_KV_KEY, JSON.stringify(rules));
}

export function resolveStrategy(
  intent: IntentClass,
  priority: Priority,
  registry: StrategyRule[],
): CoordinationStrategy {
  for (const rule of registry) {
    const intentMatch = !rule.when.intent || rule.when.intent.includes(intent);
    const priorityMatch = !rule.when.priority || rule.when.priority.includes(priority);
    if (intentMatch && priorityMatch) return rule.strategy;
  }
  return "waterfall"; // RFC safe default
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * The single entry point for coordinated multi-model research text. Resolves
 * a strategy from the registry (or honors a pinned strategy), runs it across
 * the provider pool, persists a coordination trace, and returns the
 * reconciled result. Falls back to specialist (single-model) if the pool is
 * too small to coordinate or every coordinated call fails.
 */
export async function coordinate(
  env: Env,
  req: CoordinationRequest,
  callProvider: ProviderCaller = generateForProvider as ProviderCaller,
): Promise<CoordinationResult> {
  const start = Date.now();
  const intent = req.intent ?? "unknown";
  const priority = req.priority ?? "normal";
  const registry = await loadStrategyRegistry(env);

  // ─── Memory flywheel ───────────────────────────────────────────────────
  // BEFORE choosing a strategy, consult the evidence index for similar past
  // prompts. If memory strongly favors a different strategy (bias ≥ 0.7 and
  // well-separated), override the registry pick. Non-blocking: on any error
  // or timeout (800ms), falls back to the registry-only path.
  let strategy = req.strategy ?? resolveStrategy(intent, priority, registry);
  let memoryBias: Record<string, number> = {};
  if (!req.strategy) {
    // Only consult if the caller didn't pin a strategy explicitly.
    try {
      const { bias } = await consultMemory(env, req.prompt, intent, 5);
      memoryBias = bias;
      strategy = applyMemoryBias(strategy, bias);
    } catch {
      // Memory is never a dependency — silently fall through.
    }
  }

  const pool = req.providers ?? coordinatorPool(env);

  // Specialist needs no pool; everything else needs ≥2 providers to be worth
  // coordinating. With a single-provider pool, degrade to specialist.
  const effectiveStrategy: CoordinationStrategy =
    strategy === "specialist" ? "specialist" : pool.length >= 2 ? strategy : "specialist";

  let result: CoordinationResult;
  try {
    switch (effectiveStrategy) {
      case "race":
        result = await raceStrategy(env, req, pool, callProvider);
        break;
      case "fan_out_merge":
        result = await fanOutMergeStrategy(env, req, pool, callProvider);
        break;
      case "ensemble_of_experts":
        result = await ensembleOfExpertsStrategy(env, req, pool, callProvider);
        break;
      case "waterfall":
        result = await waterfallStrategy(env, req, pool, callProvider);
        break;
      case "specialist":
      default:
        result = await specialistStrategy(env, req, pool, callProvider);
        break;
    }
  } catch (e) {
    // Coordination itself threw (not a per-provider failure). Emit a failed
    // trace and rethrow so the caller sees the error.
    const trace = {
      agent_class: req.agentClass,
      intent,
      strategy,
      priority,
      requested_providers: pool,
      participating: [],
      winner_provider: null,
      winner_text: "",
      coordination_outcome: "failed" as const,
      baseline_provider: pool[0] ?? "workers-ai",
      coordination_hit: 0 as 0 | 1,
      cost_tokens: 0,
      latency_ms: Date.now() - start,
      error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
    };
    await safeRecordTrace(env, trace);
    throw e;
  }

  // Persist the trace (fire-and-forget failure — tracing must never block).
  await safeRecordTrace(env, {
    agent_class: req.agentClass,
    intent,
    strategy,
    priority,
    requested_providers: pool,
    participating: result.attempts,
    winner_provider: result.provider,
    winner_text: result.text.slice(0, 4000),
    coordination_outcome: result.outcome,
    baseline_provider: result.baselineProvider,
    coordination_hit: result.coordinationHit,
    cost_tokens: result.totalTokens,
    latency_ms: Date.now() - start,
  });

  // ─── Memory flywheel (emit) ────────────────────────────────────────────
  // POST this trace to the GCP evidence index so future consultMemory calls
  // on similar prompts can find it. Fire-and-forget (3000ms timeout); the
  // trace is already in D1 so a missed /ingest is recoverable via backfill.
  await emitTrace(env, {
    id: `${req.agentClass}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: `Strategy: ${strategy}. Outcome: ${result.outcome}. Intent: ${intent}. ` +
          `Coordination hit: ${result.coordinationHit}. Winner: ${result.provider}. ` +
          `Baseline: ${result.baselineProvider}.\n\n${result.text.slice(0, 1000)}`,
    kind: "coordination_trace",
    metadata: {
      strategy,
      coordination_outcome: result.outcome,
      coordination_hit: result.coordinationHit,
      intent,
      agent_class: req.agentClass,
      winner_provider: result.provider,
      baseline_provider: result.baselineProvider,
      memory_overrode_registry: Object.keys(memoryBias).length > 0,
    },
  });

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * The single-best-model baseline: the highest-confidence successful attempt.
 * Coordination-hit = 1 when the chosen result beats this (RFC §7.6).
 */
function bestBaseline(attempts: ProviderAttempt[]): ProviderAttempt | undefined {
  return attempts
    .filter((a) => a.outcome === "succeeded")
    .sort((a, b) => b.confidence - a.confidence)[0];
}

function finalize(
  req: CoordinationRequest,
  strategy: CoordinationStrategy,
  chosen: ProviderAttempt | undefined,
  attempts: ProviderAttempt[],
  start: number,
  outcome: "success" | "partial" | "failed",
  baseline: ProviderAttempt | undefined,
): CoordinationResult {
  const text = chosen?.text ?? "";
  const chosenConfidence = chosen?.confidence ?? 0;
  const baselineConfidence = baseline?.confidence ?? 0;
  const totalTokens = attempts.reduce((s, a) => s + (a.tokens ?? 0), 0);
  return {
    text,
    provider: chosen?.provider ?? "workers-ai",
    model: chosen?.model ?? "unknown",
    strategy,
    outcome,
    attempts,
    baselineProvider: baseline?.provider ?? "workers-ai",
    // Hit when coordination produced a *different* provider than the baseline
    // would have picked AND beat its confidence — i.e. combining models helped.
    coordinationHit:
      chosen && baseline && chosen.provider !== baseline.provider && chosenConfidence > baselineConfidence
        ? 1
        : 0,
    totalTokens,
    latencyMs: Date.now() - start,
  };
  // (agentClass/intent carried through `req` by the caller's trace write)
  void req;
}

async function safeRecordTrace(env: Env, trace: Parameters<typeof recordCoordinationTrace>[1]): Promise<void> {
  try {
    await recordCoordinationTrace(env, trace);
  } catch (e) {
    console.warn("[omnigents] coordination trace write failed:", e);
  }
}
