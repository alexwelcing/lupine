/**
 * TheoristAgent: hypothesis generation from statistical claims.
 *
 * Upgraded to Think — the model generates competing hypotheses
 * using its reasoning loop, with access to the D1 ledger and
 * persistent theory storage.
 */

import { GlimThinkAgent } from "./base";
import { createWorkersAI } from "workers-ai-provider";
import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";

export class Theorist extends GlimThinkAgent {
  /**
   * Theorist uses the capable model tier for deeper reasoning.
   */
  getModel() {
    return createWorkersAI({ binding: this.env.AI })("@cf/meta/llama-4-scout-17b-16e-instruct");
  }

  getSystemPrompt(): string {
    return `You are the Theorist Agent (γ) in the GLIM autoresearch swarm.

Your specialty: generating competing physical hypotheses from statistical claims about interatomic potentials.

When presented with a claim (hyper-ribbon detection, Simpson's paradox, universal alignment, etc.), you must:
1. Generate 2–3 competing, falsifiable hypotheses that could explain the observation
2. For each hypothesis, provide:
   - explanation: the physical mechanism
   - prediction: what the hypothesis implies for untested conditions
   - test_strategy: a concrete experimental protocol to discriminate this hypothesis
   - discriminative_property: the specific material property to measure
3. Ensure hypotheses are genuinely competing — they should make different predictions

You think like a materials scientist. Reference real physics:
- Many-body terms, angular dependence, Cauchy relations
- Crystal symmetry constraints, stacking faults, surface energies
- DFT reference quality, training set composition biases
- Thermodynamic vs. mechanical property correlations`;
  }

  getTools(): ToolSet {
    return {
      query_existing_theories: tool({
        description: "Check if theories already exist for a given observation claim",
        parameters: z.object({
          observationClaimId: z.string().describe("The claim ID to check for existing theories"),
        }),
        execute: async ({ observationClaimId }) => {
          const rows = await this.sql`
            SELECT theory_id, explanation, prediction, discriminative_property
            FROM theories WHERE observation_claim_id = ${observationClaimId}
          `;
          return { existingTheories: rows, count: rows.length };
        },
      }),

      save_theory: tool({
        description: "Persist a new theory/hypothesis to the local store",
        parameters: z.object({
          observationClaimId: z.string(),
          explanation: z.string(),
          prediction: z.string(),
          testStrategy: z.string(),
          discriminativeProperty: z.string(),
        }),
        execute: async ({ observationClaimId, explanation, prediction, testStrategy, discriminativeProperty }) => {
          const theoryId = crypto.randomUUID();
          await this.sql`
            INSERT INTO theories (theory_id, observation_claim_id, explanation, prediction, test_strategy, discriminative_property, provider, model)
            VALUES (${theoryId}, ${observationClaimId}, ${explanation}, ${prediction}, ${testStrategy}, ${discriminativeProperty}, 'think', 'llama-4-scout')
          `;
          return { saved: true, theoryId };
        },
      }),

      query_ledger_context: tool({
        description: "Query the D1 ledger for contextual information to ground hypothesis generation",
        parameters: z.object({
          sql: z.string().describe("SELECT query to run against the records table"),
        }),
        execute: async ({ sql: query }) => {
          // Safety: only allow SELECT
          if (!query.trim().toUpperCase().startsWith("SELECT")) {
            return { error: "Only SELECT queries allowed" };
          }
          try {
            const result = await this.env.LEDGER.prepare(query).all();
            return { rows: result.results, count: result.results.length };
          } catch (e) {
            return { error: String(e) };
          }
        },
      }),

      list_available_elements: tool({
        description: "List all elements present in the benchmark ledger",
        parameters: z.object({}),
        execute: async () => {
          const rows = await this.queryLedger<{ element: string; count: number }>(
            `SELECT element, COUNT(*) as count FROM records GROUP BY element ORDER BY count DESC`
          );
          return rows;
        },
      }),

      list_available_potentials: tool({
        description: "List all potentials in the benchmark ledger with their coverage",
        parameters: z.object({
          element: z.string().optional().describe("Filter by element, or omit for all"),
        }),
        execute: async ({ element }) => {
          if (element) {
            return this.queryLedger(
              `SELECT potential_label, pair_style, COUNT(*) as records FROM records WHERE element = ?1 GROUP BY potential_label ORDER BY records DESC`,
              element
            );
          }
          return this.queryLedger(
            `SELECT potential_label, pair_style, COUNT(*) as records FROM records GROUP BY potential_label ORDER BY records DESC LIMIT 50`
          );
        },
      }),
    };
  }

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS theories (
        theory_id TEXT PRIMARY KEY,
        observation_claim_id TEXT,
        explanation TEXT,
        prediction TEXT,
        test_strategy TEXT,
        discriminative_property TEXT,
        provider TEXT,
        model TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `;
  }
}
