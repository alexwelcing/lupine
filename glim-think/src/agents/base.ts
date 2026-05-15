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
import { recordMiniMaxSpend, miniMaxModel, hasMiniMaxBudget } from "./models";
import { PhoenixApi } from "../phoenix/api";
import { runHeuristics } from "../evals/heuristics";
import { insertEval, getAgentQualityTrend } from "../evals/store";
import { traceEnv } from "../telemetry/storage";

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
   * Default system prompt. Overridden by each specialist.
   */
  getSystemPrompt(): string {
    return "You are a research agent in the GLIM autoresearch swarm. You analyze interatomic potentials, detect statistical anomalies, generate hypotheses, and propose discriminative experiments. Be precise, quantitative, and cite evidence.";
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
   * Strips the <think>...</think> reasoning prefix that M2.7 emits so
   * callers get the clean assistant text only. Caller can keep
   * `text_with_reasoning` if they want the full output.
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
            functionId: "agent.synthesize",
            metadata: { agent: this.constructor.name },
          },
        });
        const raw = result.text ?? "";
        const cleaned = raw.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();

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
                  functionId: "agent.synthesize.retry",
                  metadata: { agent: this.constructor.name, retry_reason: evalResult.explanation },
                },
              });
              finalRaw = retryResult.text ?? "";
              finalText = finalRaw.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();

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
