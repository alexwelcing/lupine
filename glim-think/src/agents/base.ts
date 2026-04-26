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
import type { ToolSet } from "ai";
import type { Env } from "../types";

export abstract class GlimThinkAgent extends Think<Env> {
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
}
