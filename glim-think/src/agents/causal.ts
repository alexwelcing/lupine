/**
 * CausalAgent (δ): Simpson's Paradox detection & causal screening.
 *
 * Upgraded to Think — the model reasons through stratified analysis
 * using tools, detects ecological fallacies, and persists findings.
 */

import { GlimThinkAgent } from "./base";
import { selectModel } from "./models";
import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";

const GROUPINGS = ["element", "pair_style", "potential_label"] as const;

export class Causal extends GlimThinkAgent {
  /**
   * Causal uses the deep tier (MiniMax-M2 when available) — paradox
   * detection requires inferring confounders from numeric stratification,
   * which Llama 4 Scout struggles with. Falls back to Workers AI when
   * MINIMAX_API_KEY is unset.
   */
  getModel() {
    return selectModel(this.env, "deep");
  }

  getSystemPrompt(): string {
    return `You are the Causal Agent (δ) — the Paradox Detector — in the GLIM autoresearch swarm.

Your specialty: Simpson's Paradox detection and causal inference across stratified benchmark data.

Core mission:
1. For each grouping variable (element, pair_style, potential_label), compute pooled and within-group correlations between reference and predicted values
2. Detect Simpson's Paradox: cases where the pooled correlation has opposite sign from within-group correlations
3. Identify confounders and explain causal mechanisms
4. Emit structured claims about detected paradoxes

When reporting, always include:
- Pooled Pearson r (across all groups)
- Mean within-group r (average of per-group correlations)
- Whether a reversal (Simpson's Paradox) is present
- Physical interpretation of the confounder

Be rigorous. A paradox claim requires both statistical evidence and a plausible causal explanation.`;
  }

  getTools(): ToolSet {
    return {
      load_grouped_data: tool({
        description: "Load benchmark records grouped by a specified column from the D1 ledger",
        inputSchema: z.object({
          grouping: z.enum(["element", "pair_style", "potential_label"]).describe("Column to group by"),
        }),
        execute: async ({ grouping }) => {
          const rows = await this.queryLedger<{ key: string; property: string; reference: number; predicted: number }>(
            `SELECT ${grouping} as key, property, reference, predicted FROM records ORDER BY key`
          );

          const groups = new Map<string, { key: string; records: { property: string; reference: number; predicted: number }[] }>();
          for (const row of rows) {
            if (!groups.has(row.key)) groups.set(row.key, { key: row.key, records: [] });
            groups.get(row.key)!.records.push(row);
          }

          return {
            grouping,
            groupCount: groups.size,
            groups: Array.from(groups.values()).map((g) => ({
              key: g.key,
              recordCount: g.records.length,
            })),
            totalRecords: rows.length,
          };
        },
      }),

      compute_correlations: tool({
        description: "Compute pooled and within-group Pearson correlations for a grouping variable. Detects Simpson's Paradox.",
        inputSchema: z.object({
          grouping: z.enum(["element", "pair_style", "potential_label"]),
        }),
        execute: async ({ grouping }) => {
          const rows = await this.queryLedger<{ key: string; reference: number; predicted: number }>(
            `SELECT ${grouping} as key, reference, predicted FROM records`
          );

          if (rows.length < 4) {
            return { error: "Insufficient data for correlation analysis" };
          }

          // Pooled correlation
          const pooledR = this.pearsonR(
            rows.map((r) => r.reference),
            rows.map((r) => r.predicted)
          );

          // Within-group correlations
          const groups = new Map<string, { refs: number[]; preds: number[] }>();
          for (const row of rows) {
            if (!groups.has(row.key)) groups.set(row.key, { refs: [], preds: [] });
            const g = groups.get(row.key)!;
            g.refs.push(row.reference);
            g.preds.push(row.predicted);
          }

          const withinCorrs: { key: string; r: number; n: number }[] = [];
          for (const [key, g] of groups) {
            if (g.refs.length >= 3) {
              withinCorrs.push({ key, r: this.pearsonR(g.refs, g.preds), n: g.refs.length });
            }
          }

          const meanWithinR = withinCorrs.length > 0
            ? withinCorrs.reduce((s, c) => s + c.r, 0) / withinCorrs.length
            : 0;

          // Detect paradox
          const reversal = (pooledR > 0 && meanWithinR < 0) || (pooledR < 0 && meanWithinR > 0);
          const pattern = reversal
            ? `Simpson's Paradox: pooled r=${pooledR.toFixed(4)} but mean within-group r=${meanWithinR.toFixed(4)}`
            : pooledR * meanWithinR >= 0
              ? "No paradox: correlations agree in direction"
              : "Weak signal: correlations near zero";

          return {
            grouping,
            pooledR: Math.round(pooledR * 10000) / 10000,
            meanWithinR: Math.round(meanWithinR * 10000) / 10000,
            withinGroupCorrelations: withinCorrs.map((c) => ({
              key: c.key,
              r: Math.round(c.r * 10000) / 10000,
              n: c.n,
            })),
            reversal,
            pattern,
            totalRecords: rows.length,
          };
        },
      }),

      check_screened: tool({
        description: "Check if a causal screen has already been run for a grouping",
        inputSchema: z.object({
          grouping: z.string(),
        }),
        execute: async ({ grouping }) => {
          const rows = await this.sql`SELECT 1 FROM causal_screens WHERE grouping = ${grouping}`;
          return { screened: rows.length > 0 };
        },
      }),

      mark_screened: tool({
        description: "Mark a grouping as screened to avoid duplicate work",
        inputSchema: z.object({
          grouping: z.string(),
        }),
        execute: async ({ grouping }) => {
          await this.sql`INSERT INTO causal_screens (grouping) VALUES (${grouping}) ON CONFLICT DO NOTHING`;
          return { marked: true };
        },
      }),
    };
  }

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS causal_screens (
        grouping TEXT PRIMARY KEY,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `;
  }

  // ─── Numerical Helpers ─────────────

  private pearsonR(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const meanX = x.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;

    let ssXY = 0, ssXX = 0, ssYY = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (x[i] - meanX) * (y[i] - meanY);
      ssXX += (x[i] - meanX) ** 2;
      ssYY += (y[i] - meanY) ** 2;
    }

    if (ssXX === 0 || ssYY === 0) return 0;
    return ssXY / Math.sqrt(ssXX * ssYY);
  }
}
