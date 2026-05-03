/**
 * Orchestrator: the swarm commander.
 *
 * Upgraded to Think — uses subAgent() + chat() for parallel sub-agent
 * dispatch instead of manual fetch RPC. The Orchestrator itself is an
 * agentic Think that reasons about research strategy, delegates to
 * specialist sub-agents, and synthesizes cross-agent findings.
 *
 * Sub-agent topology:
 *   Orchestrator
 *     ├── Manifold (α)  — PCA eigenvalue extraction
 *     ├── Causal  (δ)   — Simpson's Paradox detection
 *     ├── Theorist (γ)  — Hypothesis generation
 *     └── Experiment (ε) — LAMMPS experiment design & queueing
 */

import { GlimThinkAgent } from "./base";
import { selectModel } from "./models";
import { Manifold } from "./manifold";
import { Causal } from "./causal";
import { Theorist } from "./theorist";
import { Experiment } from "./experiment";
import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";

export class Orchestrator extends GlimThinkAgent {
  /**
   * Orchestrator uses the fast-deep tier (MiniMax-M2.7-highspeed when
   * MINIMAX_API_KEY is set). Many short dispatch turns benefit more from
   * 3x throughput than from extra reasoning depth — the actual hypothesis
   * generation runs on the Theorist sub-agent which uses the base M2.7.
   * Falls back to Workers AI when MINIMAX_API_KEY is unset.
   */
  getModel() {
    return selectModel(this.env, "fast-deep");
  }

  getSystemPrompt(): string {
    return `You are the Research Orchestrator of the GLIM autoresearch swarm.

You command a team of specialist sub-agents:
- **Manifold Agent (α)**: PCA eigenvalue analysis, hyper-ribbon detection
- **Causal Agent (δ)**: Simpson's Paradox screening, ecological fallacy detection
- **Theorist Agent (γ)**: Competing hypothesis generation from statistical claims
- **Experiment Agent (ε)**: Discriminative LAMMPS experiment design and queueing

Your role:
1. Assess the current state of research by querying the D1 ledger
2. Dispatch specialist analyses by delegating tasks to sub-agents
3. Synthesize cross-agent findings into coherent research conclusions
4. Drive the investigate → hypothesize → test cycle forward

Research loop:
  a) Run Manifold + Causal analyses in parallel
  b) Feed high-confidence claims to the Theorist
  c) Feed competing hypotheses to the Experiment agent
  d) Check for converged/completed results
  e) Synthesize and report

Be strategic. Don't re-run analyses that are already cached. Focus on the highest-impact next step.`;
  }

  getTools(): ToolSet {
    return {
      dispatch_manifold: tool({
        description: "Delegate a manifold analysis task to the Manifold sub-agent (α). The sub-agent will use its own Think loop to analyze eigenvalue spectra.",
        inputSchema: z.object({
          element: z.string().describe("Element to analyze (e.g. 'Cu') or 'all'"),
          instruction: z.string().optional().describe("Additional instructions for the manifold agent"),
        }),
        execute: async ({ element, instruction }) => {
          const child = await this.subAgent(Manifold, `manifold-${element}`);
          const prompt = instruction
            ? `Analyze the error manifold for element: ${element}. ${instruction}`
            : `Analyze the error manifold for element: ${element}. Query the ledger for all potential families, compute eigenvalue spectra, participation ratios, and check for hyper-ribbon geometry. Report your findings with numbers.`;
          const response = await this.runChildChat(child, prompt);
          return { agent: "manifold", element, response };
        },
      }),

      dispatch_causal: tool({
        description: "Delegate a causal screening task to the Causal sub-agent (δ). The sub-agent will screen for Simpson's Paradox across grouping variables.",
        inputSchema: z.object({
          instruction: z.string().optional().describe("Additional instructions for the causal agent"),
        }),
        execute: async ({ instruction }) => {
          const child = await this.subAgent(Causal, "causal-main");
          const prompt = instruction
            ? `Screen for Simpson's Paradox. ${instruction}`
            : `Screen all grouping variables (element, pair_style, potential_label) for Simpson's Paradox. For each, compute pooled and within-group correlations and report any reversals.`;
          const response = await this.runChildChat(child, prompt);
          return { agent: "causal", response };
        },
      }),

      dispatch_theorist: tool({
        description: "Delegate hypothesis generation to the Theorist sub-agent (γ). Pass it the statistical claims to generate competing hypotheses.",
        inputSchema: z.object({
          claimsDescription: z.string().describe("Description of the statistical claims to theorize about"),
          instruction: z.string().optional().describe("Additional instructions"),
        }),
        execute: async ({ claimsDescription, instruction }) => {
          const child = await this.subAgent(Theorist, "theorist-main");
          const prompt = instruction
            ? `Generate competing hypotheses for: ${claimsDescription}. ${instruction}`
            : `Generate 2-3 competing, falsifiable physical hypotheses for the following observations: ${claimsDescription}. For each, specify the discriminative property and test strategy.`;
          const response = await this.runChildChat(child, prompt);
          return { agent: "theorist", response };
        },
      }),

      dispatch_experiment: tool({
        description: "Delegate experiment design to the Experiment sub-agent (ε). Pass it hypotheses to queue discriminative LAMMPS experiments.",
        inputSchema: z.object({
          hypothesesDescription: z.string().describe("Description of hypotheses to test"),
          maxExperiments: z.number().optional().describe("Maximum experiments to queue (default 3)"),
          instruction: z.string().optional(),
        }),
        execute: async ({ hypothesesDescription, maxExperiments, instruction }) => {
          const child = await this.subAgent(Experiment, "experiment-main");
          const prompt = instruction
            ? `Design experiments for: ${hypothesesDescription}. Max ${maxExperiments ?? 3} experiments. ${instruction}`
            : `Design and queue up to ${maxExperiments ?? 3} discriminative LAMMPS experiments to test these hypotheses: ${hypothesesDescription}. Select element-potential combinations that maximize information gain.`;
          const response = await this.runChildChat(child, prompt);
          return { agent: "experiment", response };
        },
      }),

      parallel_sweep: tool({
        description: "Run manifold analysis across multiple elements in parallel using sub-agent swarm",
        inputSchema: z.object({
          elements: z.array(z.string()).describe("Elements to analyze in parallel"),
        }),
        execute: async ({ elements }) => {
          const results = await Promise.all(
            elements.map(async (element) => {
              try {
                const child = await this.subAgent(Manifold, `manifold-${element}`);
                const response = await this.runChildChat(child,
                  `Analyze the error manifold for ${element}. Report eigenvalues, participation ratio, and hyper-ribbon status.`
                );
                return { element, status: "complete", response };
              } catch (e) {
                return { element, status: "failed", error: String(e) };
              }
            })
          );
          return { swept: elements.length, results };
        },
      }),

      get_research_state: tool({
        description: "Query the current state of the research — record counts, pending experiments, etc.",
        inputSchema: z.object({}),
        execute: async () => {
          const [records, pending, elements, families] = await Promise.all([
            this.queryLedger<{ total: number }>(`SELECT COUNT(*) as total FROM records`),
            this.queryLedger<{ total: number }>(`SELECT COUNT(*) as total FROM pending_experiments WHERE status = 'pending'`),
            this.queryLedger<{ element: string; count: number }>(`SELECT element, COUNT(*) as count FROM records GROUP BY element ORDER BY count DESC LIMIT 20`),
            this.queryLedger<{ family: string; count: number }>(`SELECT pair_style as family, COUNT(*) as count FROM records GROUP BY pair_style ORDER BY count DESC`),
          ]);

          return {
            totalRecords: records[0]?.total ?? 0,
            pendingExperiments: pending[0]?.total ?? 0,
            elementCoverage: elements,
            familyCoverage: families,
          };
        },
      }),

      save_state: tool({
        description: "Save orchestrator state for resume/tracking",
        inputSchema: z.object({
          key: z.string(),
          value: z.string(),
        }),
        execute: async ({ key, value }) => {
          await this.sql`
            INSERT INTO orchestrator_state (key, value, updated_at)
            VALUES (${key}, ${value}, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
          `;
          return { saved: true };
        },
      }),
    };
  }

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS orchestrator_state (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `;
  }

  private async runChildChat(child: { chat: (prompt: string, relay: { onEvent(json: string): void; onDone(): void; onError?(error: string): void }) => Promise<void> }, prompt: string): Promise<string> {
    const events: string[] = [];
    await child.chat(prompt, {
      onEvent: (json: string) => {
        events.push(json);
      },
      onDone: () => {},
      onError: (error: string) => {
        events.push(JSON.stringify({ type: "error", error }));
      },
    });
    return events.slice(-8).join("\n");
  }
}
