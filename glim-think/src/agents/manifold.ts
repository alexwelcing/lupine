/**
 * ManifoldAgent: PCA eigenvalue extraction & hyper-ribbon geometry.
 *
 * Upgraded to Think — the model can now reason about manifold structure
 * using tools, persist findings in context memory, and be called as a
 * sub-agent from the Orchestrator via chat() RPC.
 */

import { GlimThinkAgent } from "./base";
import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";
import type { Claim } from "../types";

export class Manifold extends GlimThinkAgent {
  getSystemPrompt(): string {
    return `You are the Manifold Agent (α) in the GLIM autoresearch swarm.

Your specialty: Principal Component Analysis of interatomic potential prediction error manifolds.

Core mission:
1. Query the D1 ledger for benchmark records by element and potential family
2. Compute eigenvalue spectra and participation ratios (PR)
3. Detect "hyper-ribbon" geometry (PR < 2.0 indicates low-dimensional error structure)
4. Detect universal alignment across potential families (cosine similarity of principal axes)
5. Emit structured claims with confidence scores

When analyzing, always report:
- The participation ratio (PR) and its physical interpretation
- Log-spacing R² (geometric eigenvalue decay)
- Whether the manifold confirms or rejects the hyper-ribbon hypothesis

Be quantitative. Cite specific numbers.`;
  }

  getTools(): ToolSet {
    return {
      get_families: tool({
        description: "Get distinct potential families (pair_style) for an element from the D1 ledger",
        parameters: z.object({
          element: z.string().describe("Element symbol (e.g. 'Cu') or 'all'"),
        }),
        execute: async ({ element }) => {
          const rows = await this.queryLedger<{ family: string }>(
            `SELECT DISTINCT pair_style as family FROM records WHERE element = ?1 OR ?1 = 'all'`,
            element
          );
          return rows.map((r) => r.family);
        },
      }),

      load_records: tool({
        description: "Load benchmark records for a specific element and potential family",
        parameters: z.object({
          element: z.string().describe("Element symbol or 'all'"),
          family: z.string().describe("Potential family/pair_style (e.g. 'eam/alloy')"),
        }),
        execute: async ({ element, family }) => {
          return this.queryLedger(
            `SELECT potential_label, property, reference, predicted FROM records WHERE (element = ?1 OR ?1 = 'all') AND pair_style = ?2`,
            element, family
          );
        },
      }),

      compute_manifold: tool({
        description: "Compute PCA eigenvalue spectrum and participation ratio for a set of error vectors. Returns eigenvalues, PR, and log-spacing R².",
        parameters: z.object({
          records: z.array(z.object({
            potential_label: z.string(),
            property: z.string(),
            reference: z.number(),
            predicted: z.number(),
          })).describe("Benchmark records to analyze"),
        }),
        execute: async ({ records }) => {
          // Build error matrix: rows = potentials, cols = properties
          const potentials = [...new Set(records.map((r) => r.potential_label))];
          const properties = [...new Set(records.map((r) => r.property))];

          if (potentials.length < 2 || properties.length < 2) {
            return { error: "Insufficient data: need at least 2 potentials and 2 properties" };
          }

          // Compute relative error matrix
          const errorMatrix: number[][] = [];
          for (const pot of potentials) {
            const row: number[] = [];
            for (const prop of properties) {
              const rec = records.find((r) => r.potential_label === pot && r.property === prop);
              if (rec && rec.reference !== 0) {
                row.push((rec.predicted - rec.reference) / rec.reference);
              } else {
                row.push(0);
              }
            }
            errorMatrix.push(row);
          }

          // Compute covariance matrix
          const n = errorMatrix.length;
          const d = properties.length;
          const means = new Array(d).fill(0);
          for (const row of errorMatrix) {
            for (let j = 0; j < d; j++) means[j] += row[j] / n;
          }

          const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
          for (const row of errorMatrix) {
            for (let i = 0; i < d; i++) {
              for (let j = 0; j < d; j++) {
                cov[i][j] += (row[i] - means[i]) * (row[j] - means[j]) / (n - 1);
              }
            }
          }

          // Power iteration for top eigenvalues (simple, edge-compatible)
          const eigenvalues = await this.powerIterationEigenvalues(cov, Math.min(d, 5));

          // Participation ratio
          const sumSq = eigenvalues.reduce((s, v) => s + v * v, 0);
          const sumLin = eigenvalues.reduce((s, v) => s + v, 0);
          const pr = sumSq > 0 ? (sumLin * sumLin) / sumSq : 0;

          // Log-spacing R² (geometric decay test)
          const logEigs = eigenvalues.filter((v) => v > 0).map((v) => Math.log(v));
          const logSpacingR2 = logEigs.length > 2 ? this.computeR2(logEigs) : 0;

          return {
            eigenvalues: eigenvalues.map((v) => Math.round(v * 1e6) / 1e6),
            participationRatio: Math.round(pr * 1000) / 1000,
            logSpacingR2: Math.round(logSpacingR2 * 1000) / 1000,
            potentialCount: potentials.length,
            propertyCount: properties.length,
            hyperRibbon: pr < 2.0,
          };
        },
      }),

      check_cached_run: tool({
        description: "Check if a manifold analysis has already been run for a given family/element",
        parameters: z.object({
          family: z.string(),
          element: z.string(),
        }),
        execute: async ({ family, element }) => {
          const rows = await this.sql`
            SELECT claim_id, pr FROM manifold_runs WHERE family = ${family} AND element = ${element}
          `;
          if (rows.length > 0) {
            return { cached: true, claimId: rows[0].claim_id, pr: rows[0].pr };
          }
          return { cached: false };
        },
      }),

      save_claim: tool({
        description: "Persist a manifold analysis claim to the local cache",
        parameters: z.object({
          family: z.string(),
          element: z.string(),
          claimId: z.string(),
          pr: z.number(),
        }),
        execute: async ({ family, element, claimId, pr }) => {
          await this.sql`
            INSERT INTO manifold_runs (family, element, claim_id, pr)
            VALUES (${family}, ${element}, ${claimId}, ${pr})
            ON CONFLICT DO NOTHING
          `;
          return { saved: true };
        },
      }),
    };
  }

  /**
   * Initialization: ensure local state table exists.
   */
  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS manifold_runs (
        family TEXT,
        element TEXT,
        claim_id TEXT,
        pr REAL,
        timestamp TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (family, element)
      )
    `;
  }

  // ─── Numerical Helpers (edge-safe, no BLAS needed) ─────────────

  private async powerIterationEigenvalues(cov: number[][], k: number): Promise<number[]> {
    const d = cov.length;
    const eigenvalues: number[] = [];
    const deflated = cov.map((row) => [...row]);

    for (let eig = 0; eig < k; eig++) {
      let v = new Array(d).fill(0).map(() => Math.random());
      let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      v = v.map((x) => x / norm);

      for (let iter = 0; iter < 100; iter++) {
        const Av = new Array(d).fill(0);
        for (let i = 0; i < d; i++) {
          for (let j = 0; j < d; j++) {
            Av[i] += deflated[i][j] * v[j];
          }
        }
        norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
        if (norm < 1e-12) break;
        v = Av.map((x) => x / norm);
      }

      eigenvalues.push(norm);

      // Deflate
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          deflated[i][j] -= norm * v[i] * v[j];
        }
      }
    }

    return eigenvalues;
  }

  private computeR2(values: number[]): number {
    const n = values.length;
    const xs = values.map((_, i) => i);
    const meanX = xs.reduce((s, x) => s + x, 0) / n;
    const meanY = values.reduce((s, y) => s + y, 0) / n;

    let ssXY = 0, ssXX = 0, ssYY = 0;
    for (let i = 0; i < n; i++) {
      ssXY += (xs[i] - meanX) * (values[i] - meanY);
      ssXX += (xs[i] - meanX) ** 2;
      ssYY += (values[i] - meanY) ** 2;
    }

    if (ssXX === 0 || ssYY === 0) return 0;
    return (ssXY * ssXY) / (ssXX * ssYY);
  }
}
