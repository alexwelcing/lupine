/**
 * GlimThinkAgent: base class for all glim-think agents.
 *
 * Extends @cloudflare/think's Think class to gain:
 * - Built-in agentic loop (plan → tool → observe → respond)
 * - Persistent SQLite-backed sessions with context blocks
 * - Workspace (virtual filesystem) with read/write/edit/list/find/grep/delete
 * - MCP integration (addMcpServer / removeMcpServer)
 * - Sub-agent RPC via this.subAgent() + child.chat()
 * - Tool approval, per-turn overrides, lifecycle hooks
 *
 * Each specialist agent overrides getTools() and getSystemPrompt()
 * to inject domain-specific capabilities.
 */

import { Think, Session } from "@cloudflare/think";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, type LanguageModel, type ToolSet } from "ai";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { DurableObjectState } from "@cloudflare/workers-types";
import type { Env } from "../types";
import { recordMiniMaxSpend, miniMaxModel, hasMiniMaxBudget, selectDeepRoute } from "./models";
import { getPrompt } from "../registry/promptRegistry";
import { PhoenixApi } from "../phoenix/api";
import { runHeuristics } from "../evals/heuristics";
import { insertEval, getAgentQualityTrend } from "../evals/store";
import { traceEnv } from "../telemetry/storage";
import {
  loadFacetState,
  loadFacetTheorems,
  summarizeInventory,
  toFormalBasis,
  type AtlasFacetState,
  type AtlasTheoremRef,
  type FormalBasis,
  type TheoremInventory,
} from "../atlas/theorems";

export abstract class GlimThinkAgent extends Think<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    traceEnv(env);
    super(ctx, env);
  }
  /**
   * Default model: Workers AI Kimi K2.5 (fast, free tier, zero egress).
   * Subclasses override for specific model requirements.
   */
  getModel() {
    return createWorkersAI({ binding: this.env.AI })("@cf/moonshotai/kimi-k2.5");
  }

  /**
   * When true, the one-shot `synthesize()` RPC path routes through the
   * eval-aware multi-provider deep tier (`selectDeepRoute`: MiniMax/GLM
   * scorecard-balanced, OpenAI gpt-5.5 last decider) instead of the sync
   * `getModel()`. Deep specialists (Theorist/Causal/Orchestrator) set this
   * to true. The Think framework's agentic tool-loop still uses `getModel()`
   * (sync) regardless — only the one-shot synthesis path is eval-steered.
   */
  protected deepTier = false;

  /**
   * Default system prompt. Overridden by each specialist.
   */
  getSystemPrompt(): string {
    return getPrompt(this.constructor.name);
  }

  /**
   * Session configuration: persistent memory + search.
   * All GLIM agents share the same context block structure.
   */
  configureSession(session: Session) {
    return session
      .withContext("soul", {
        provider: {
          get: async () => this.getSystemPrompt(),
        },
      })
      .withContext("memory", {
        description: "Important findings, claims, and hypotheses discovered during this research session.",
        maxTokens: 4000,
      })
      .withCachedPrompt();
  }

  /**
   * Base toolset — empty. Each specialist adds its own.
   * These merge with built-in workspace tools automatically.
   */
  getTools(): ToolSet {
    return {};
  }

  /**
   * Maximum agentic steps per turn.
   */
  override maxSteps = 15;

  /**
   * Helper: query D1 ledger.
   * Available to all agents for cross-agent data access.
   */
  protected async queryLedger<T = Record<string, unknown>>(sql: string, ...bindings: unknown[]): Promise<T[]> {
    const stmt = this.env.LEDGER.prepare(sql);
    const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt;
    const result = await bound.all();
    return result.results as T[];
  }

  /**
   * Storage-stats RPC. Returns the row counts of any DO-local SQL tables
   * this agent owns. Default is empty; subclasses with private tables
   * override to declare them. Surfaced by /graph/agents.json so the FE
   * can render the dark-matter store alongside env.LEDGER.
   */
  async getStorageStats(): Promise<Record<string, number>> {
    return {};
  }

  // ─── ATLAS-Lean formal context (§8.4) ───
  //
  // A facet imports/verifies/extends a bounded set of theorems from the
  // ATLAS-Lean layer. The agent keeps only REFERENCES in memory (name + module
  // + revision + status) — never proof bodies — so DO state stays bounded.

  /**
   * The ATLAS facet this agent maps to. Defaults to the agent's class name
   * (the same key used everywhere else for prompts/evals). Override only if a
   * facet's theorem inventory is keyed differently from the class name.
   */
  getFacet(): string {
    return this.constructor.name;
  }

  /**
   * Bounded in-memory cache of this facet's theorem REFERENCES. Populated by
   * loadAtlasContext(); intentionally references only (no proofs) so the DO's
   * heap footprint is bounded by the inventory cap, not by proof size.
   */
  private atlasContext: {
    readonly state: AtlasFacetState | null;
    readonly theorems: ReadonlyArray<AtlasTheoremRef>;
    readonly inventory: TheoremInventory;
  } | null = null;

  /**
   * Load (and cache) the ATLAS theorem references + per-facet reference state
   * for this agent's facet from the shared ledger. Idempotent: pass
   * `{ refresh: true }` to re-read after the inventory changes. Never throws —
   * an unprovisioned facet resolves to an empty inventory.
   */
  async loadAtlasContext(opts?: { refresh?: boolean }): Promise<{
    readonly state: AtlasFacetState | null;
    readonly theorems: ReadonlyArray<AtlasTheoremRef>;
    readonly inventory: TheoremInventory;
  }> {
    if (this.atlasContext && !opts?.refresh) return this.atlasContext;
    const facet = this.getFacet();
    const [theorems, state] = await Promise.all([
      loadFacetTheorems(this.env, facet),
      loadFacetState(this.env, facet),
    ]);
    const inventory = summarizeInventory(facet, theorems);
    this.atlasContext = { state, theorems, inventory };
    return this.atlasContext;
  }

  /**
   * The cached theorem references for this facet, or an empty list if
   * loadAtlasContext() has not run yet. Synchronous accessor for callers that
   * have already loaded context (e.g. inside a turn).
   */
  getAtlasTheorems(): ReadonlyArray<AtlasTheoremRef> {
    return this.atlasContext?.theorems ?? [];
  }

  /**
   * Build the `formal_basis[]` array for a facet-to-facet RPC payload (§8.4):
   * compact theorem references (+ optional helper) drawn from this facet's
   * loaded inventory. Loads context on demand if not already cached.
   *
   * Pass `theoremNames` to scope the basis to the theorems actually relied on
   * for a given dispatch (recommended — keeps payloads minimal); omit to attach
   * the whole facet inventory. `helpers` maps a theorem name to its grounding
   * note.
   */
  async buildFormalBasis(opts?: {
    theoremNames?: ReadonlyArray<string>;
    helpers?: Readonly<Record<string, string>>;
  }): Promise<FormalBasis[]> {
    const { theorems } = await this.loadAtlasContext();
    const wanted = opts?.theoremNames ? new Set(opts.theoremNames) : null;
    const helpers = opts?.helpers ?? {};
    return theorems
      .filter((t) => (wanted ? wanted.has(t.theorem_name) : true))
      .map((t) => toFormalBasis(t, helpers[t.theorem_name]));
  }

  /**
   * Helper: store an artifact in R2.
   */
  protected async storeArtifact(key: string, data: string | ArrayBuffer): Promise<void> {
    await this.env.ARTIFACTS.put(key, data);
  }

  /**
   * Helper: retrieve an artifact from R2.
   */
  protected async loadArtifact(key: string): Promise<string | null> {
    const obj = await this.env.ARTIFACTS.get(key);
    if (!obj) return null;
    return obj.text();
  }

  /**
   * Diagnostic — does this DO instance see the CONFIG KV binding and
   * can it write/read? Returns the actual binding name + a round-trip
   * probe result. Used by /admin/diag-do-kv to isolate whether the
   * /budget bug is a KV-binding issue or a middleware issue.
   */
  async kvProbe(): Promise<{
    binding_present: boolean;
    write_ok: boolean;
    read_back?: string | null;
    error?: string;
  }> {
    if (!this.env.CONFIG) {
      return { binding_present: false, write_ok: false, error: "this.env.CONFIG is undefined inside the DO" };
    }
    const probeKey = `kv-probe:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const probeValue = `do-write-at-${new Date().toISOString()}`;
    try {
      await this.env.CONFIG.put(probeKey, probeValue);
      const readBack = await this.env.CONFIG.get(probeKey);
      return {
        binding_present: true,
        write_ok: readBack === probeValue,
        read_back: readBack,
      };
    } catch (e) {
      return {
        binding_present: true,
        write_ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /**
   * One-shot synthesis call. RPC-callable from the worker handler / queue
   * consumer (DO methods are auto-exposed via stub since
   * compatibility_date >= 2024-04-03).
   *
   * Routes through this.getModel() so subclasses inherit MiniMax-M2.7
   * (Theorist/Causal/Orchestrator) or Workers AI (Manifold/Experiment/
   * Literaturist) automatically. The wrapped model also runs through
   * spendMiddleware so /budget ticks on each call.
   *
   * MiniMax now runs over the Anthropic Messages API, so thinking arrives as a
   * structured field rather than an inline <think> prefix: `text` is the clean
   * answer; `text_with_reasoning` carries the reasoning chain when present.
   */
  async synthesize(opts: {
    systemPrompt?: string;
    prompt: string;
    maxOutputTokens?: number;
  }): Promise<{
    text: string;
    text_with_reasoning: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      reasoningTokens?: number;
      totalTokens?: number;
    };
    finish_reason?: string;
    latency_ms: number;
  }> {
    const tracer = trace.getTracer("glim-think.agent");
    return tracer.startActiveSpan(`${this.constructor.name}.synthesize`, async (span) => {
      span.setAttribute("agent.class", this.constructor.name);
      const start = Date.now();
      try {
        // ─── Eval-aware model escalation ───
        // If this agent's recent pass rate is poor, escalate to MiniMax
        // (if budget allows) or boost token budget for deeper reasoning.
        let model: LanguageModel = this.getModel();
        if (this.deepTier) {
          // Eval-aware multi-provider deep tier (replaces MiniMax-only
          // selectModel('deep')). Scorecard-steered; span carries the
          // resolved provider/model so the model×agent scorecard is real.
          const route = await selectDeepRoute(this.env);
          model = route.model;
          span.setAttribute("llm.provider", route.provider);
          span.setAttribute("llm.model", route.modelId);
        }
        let maxOutputTokens = opts.maxOutputTokens ?? 768;
        try {
          const trend = await getAgentQualityTrend(this.env, this.constructor.name, 1);
          if (trend.count >= 3 && trend.pass_rate < 0.6) {
            if (await hasMiniMaxBudget(this.env)) {
              console.log(
                `[agent] ${this.constructor.name} pass rate ${(trend.pass_rate * 100).toFixed(1)}% — escalating to MiniMax`
              );
              model = miniMaxModel(this.env);
              span.setAttribute("agent.escalated", true);
              span.setAttribute("agent.escalation_reason", "low_pass_rate");
            } else {
              maxOutputTokens = Math.min(Math.round(maxOutputTokens * 1.5), 2048);
              console.log(
                `[agent] ${this.constructor.name} pass rate ${(trend.pass_rate * 100).toFixed(1)}% — boosting tokens to ${maxOutputTokens}`
              );
              span.setAttribute("agent.boosted_tokens", true);
            }
          }
        } catch (e) {
          console.warn(`[agent] quality trend lookup failed for ${this.constructor.name}:`, e);
        }

        const result = await generateText({
          model,
          system: opts.systemPrompt ?? this.getSystemPrompt(),
          prompt: opts.prompt,
          maxOutputTokens,
          experimental_telemetry: {
            isEnabled: true,
            functionId: `agent.${this.constructor.name}`,
            metadata: { agent: this.constructor.name },
          },
        });
        // Anthropic Messages API: text is already clean; thinking is structured.
        const cleaned = (result.text ?? "").trim();
        const reasoningText = (result.reasoningText ?? "").trim();
        const raw = reasoningText ? `<think>${reasoningText}</think>\n${cleaned}` : cleaned;

        // Direct spend recording — the spendMiddleware closure from
        // selectModel() doesn't fire in DO context (silent KV write failure
        // we haven't diagnosed yet). Recording here from the DO ensures
        // /budget reflects every cron-driven agent invocation. Once the
        // middleware bug is fixed in Fix A, this becomes a no-op double-
        // count which we can drop.
        const usage = result.usage as {
          inputTokens?: number;
          outputTokens?: number;
          reasoningTokens?: number;
          totalTokens?: number;
        } | undefined;
        const totalTokens =
          (usage?.inputTokens ?? 0) +
          (usage?.outputTokens ?? 0) +
          (usage?.reasoningTokens ?? 0);
        if (totalTokens > 0) {
          await recordMiniMaxSpend(this.env, totalTokens);
        }

        // ─── Self-evaluation + feedback loop ───
        const activeSpan = trace.getActiveSpan();
        const traceId = activeSpan?.spanContext().traceId;
        const evalResult = runHeuristics(cleaned);
        let finalText = cleaned;
        let finalRaw = raw;
        let action = "accepted";

        if (traceId) {
          span.setAttribute("eval.score", evalResult.score);
          span.setAttribute("eval.label", evalResult.label);

          // Push eval annotation to Phoenix
          try {
            const phoenix = new PhoenixApi(
              this.env.PHOENIX_COLLECTOR_ENDPOINT ?? "",
              this.env.PHOENIX_API_KEY ?? "",
              "glim-think"
            );
            await phoenix.annotateTraces([{
              trace_id: traceId,
              name: "self-eval.completeness",
              annotator_kind: "CODE",
              result: {
                score: evalResult.score,
                label: evalResult.label,
                explanation: evalResult.explanation,
              },
              identifier: `self-eval-${traceId}`,
            }]);

            // Retry on low quality
            if (evalResult.score < 0.5) {
              action = "retried";
              const retryResult = await generateText({
                model,
                system: `${opts.systemPrompt ?? this.getSystemPrompt()}\n\nIMPORTANT: Your previous response was flagged as incomplete. Be more thorough, specific, and quantitative. Include units, numerical values, and detailed reasoning.`,
                prompt: opts.prompt,
                maxOutputTokens: Math.min(maxOutputTokens * 2, 2048),
                experimental_telemetry: {
                  isEnabled: true,
                  functionId: `agent.${this.constructor.name}.retry`,
                  metadata: { agent: this.constructor.name, retry_reason: evalResult.explanation },
                },
              });
              finalText = (retryResult.text ?? "").trim();
              const retryReasoning = (retryResult.reasoningText ?? "").trim();
              finalRaw = retryReasoning ? `<think>${retryReasoning}</think>\n${finalText}` : finalText;

              const retryEval = runHeuristics(finalText);
              await phoenix.annotateTraces([{
                trace_id: traceId,
                name: "self-eval.completeness.retry",
                annotator_kind: "CODE",
                result: {
                  score: retryEval.score,
                  label: retryEval.label,
                  explanation: retryEval.explanation,
                },
                identifier: `self-eval-retry-${traceId}`,
              }]);

              if (retryEval.score < 0.5) {
                action = "failed";
              }
              span.setAttribute("eval.retry_score", retryEval.score);
              span.setAttribute("eval.retry_label", retryEval.label);
            }
          } catch (annotErr) {
            console.warn("Phoenix annotation failed:", annotErr);
          }

          // Store eval history in D1
          try {
            await insertEval(this.env, {
              trace_id: traceId,
              agent_class: this.constructor.name,
              evaluator_name: "self-eval.completeness",
              score: evalResult.score,
              label: evalResult.label,
              explanation: evalResult.explanation,
              action_taken: action,
              retry_count: action === "retried" ? 1 : action === "failed" ? 1 : 0,
              created_at: new Date().toISOString(),
            });
          } catch (storeErr) {
            console.warn("Eval storage failed:", storeErr);
          }
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return {
          text: finalText,
          text_with_reasoning: finalRaw,
          usage: result.usage,
          finish_reason: result.finishReason,
          latency_ms: Date.now() - start,
        };
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
