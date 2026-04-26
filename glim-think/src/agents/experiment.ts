/**
 * ExperimentAgent (ε): LAMMPS experiment design and queueing.
 *
 * Upgraded to Think — the model reasons about experiment design,
 * selects discriminative candidates, and queues LAMMPS runs via
 * the D1 pending_experiments table.
 */

import { GlimThinkAgent } from "./base";
import { tool } from "ai";
import { z } from "zod";
import type { ToolSet } from "ai";

export class Experiment extends GlimThinkAgent {
  getSystemPrompt(): string {
    return `You are the Experiment Agent (ε) in the GLIM autoresearch swarm.

Your specialty: designing and queueing discriminative LAMMPS experiments.

Core mission:
1. Given hypotheses from the Theorist, select the most information-rich experiments
2. Score candidates by discriminative power — prefer experiments that can falsify hypotheses
3. Queue experiments to the pending_experiments table for local LAMMPS execution
4. Track experiment status and results

Experiment design principles:
- Prefer surface energy, stacking fault, and vacancy calculations over bulk elastic constants (they're more discriminative)
- BCC elements (Fe, Cr, Mo, W, V, Nb, Ta) use bcc lattice; others default to fcc
- Each experiment should target a specific discriminative_property from a hypothesis
- Limit batch size to avoid overloading the local compute queue`;
  }

  getTools(): ToolSet {
    return {
      list_available_experiments: tool({
        description: "List all element-potential combinations available for experiments",
        parameters: z.object({
          element: z.string().optional().describe("Filter by element"),
        }),
        execute: async ({ element }) => {
          if (element) {
            return this.queryLedger(
              `SELECT DISTINCT element, potential_label, pair_style FROM records WHERE element = ?1`,
              element
            );
          }
          return this.queryLedger(
            `SELECT DISTINCT element, potential_label, pair_style FROM records LIMIT 100`
          );
        },
      }),

      check_pending: tool({
        description: "Check for already-pending experiments to avoid duplicates",
        parameters: z.object({
          element: z.string().optional(),
          potential: z.string().optional(),
        }),
        execute: async ({ element, potential }) => {
          let query = `SELECT experiment_id, element, potential_label, status, discriminative_property FROM pending_experiments WHERE status = 'pending'`;
          const bindings: unknown[] = [];
          if (element) {
            query += ` AND element = ?${bindings.length + 1}`;
            bindings.push(element);
          }
          if (potential) {
            query += ` AND potential_label = ?${bindings.length + 1}`;
            bindings.push(potential);
          }
          query += ` ORDER BY created_at DESC LIMIT 20`;
          return this.queryLedger(query, ...bindings);
        },
      }),

      queue_experiment: tool({
        description: "Queue a LAMMPS experiment for local execution",
        parameters: z.object({
          element: z.string().describe("Element to test"),
          potentialLabel: z.string().describe("Potential to test"),
          pairStyle: z.string().describe("LAMMPS pair_style (e.g. 'eam/alloy')"),
          structure: z.enum(["fcc", "bcc", "hcp"]).describe("Crystal structure"),
          discriminativeProperty: z.string().describe("The property this experiment targets"),
          testStrategy: z.string().describe("Description of what this experiment tests"),
          hypothesisId: z.string().optional().describe("ID of the hypothesis being tested"),
        }),
        execute: async ({ element, potentialLabel, pairStyle, structure, discriminativeProperty, testStrategy, hypothesisId }) => {
          const experimentId = crypto.randomUUID();
          const runId = crypto.randomUUID();

          const spec = JSON.stringify({
            lammps_input_type: discriminativeProperty.includes("surface") ? "surface_energy" :
              discriminativeProperty.includes("vacancy") ? "vacancy_energy" :
              discriminativeProperty.includes("stacking") ? "stacking_fault" : "elastic_constants",
            supercell: 3,
            temperature: 0.0,
            relaxation: true,
            discriminative_property: discriminativeProperty,
            test_strategy: testStrategy,
          });

          // Insert into D1
          await this.env.LEDGER.prepare(
            `INSERT INTO pending_experiments (
              experiment_id, run_id, element, potential_label, potential_id,
              pair_style, structure, properties, discriminative_property,
              hypothesis_id, spec, status, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending', datetime('now'))`
          ).bind(
            experimentId, runId, element, potentialLabel,
            "nist-auto", pairStyle, structure, JSON.stringify(["C11", "C12", "C44"]),
            discriminativeProperty,
            hypothesisId ?? null, spec
          ).run();

          // Also track in local DO storage
          await this.sql`
            INSERT INTO experiment_runs (run_id, potential_label, element, status, records_count)
            VALUES (${runId}, ${potentialLabel}, ${element}, 'queued', 0)
          `;

          return {
            queued: true,
            experimentId,
            runId,
            element,
            potential: potentialLabel,
            discriminativeProperty,
          };
        },
      }),

      get_experiment_results: tool({
        description: "Check results of completed experiments",
        parameters: z.object({
          experimentId: z.string().optional(),
          limit: z.number().optional().describe("Max results to return"),
        }),
        execute: async ({ experimentId, limit }) => {
          if (experimentId) {
            return this.queryLedger(
              `SELECT * FROM pending_experiments WHERE experiment_id = ?1`, experimentId
            );
          }
          return this.queryLedger(
            `SELECT experiment_id, element, potential_label, status, discriminative_property, created_at
             FROM pending_experiments ORDER BY created_at DESC LIMIT ?1`,
            limit ?? 20
          );
        },
      }),

      infer_structure: tool({
        description: "Infer the crystal structure for a given element",
        parameters: z.object({
          element: z.string(),
        }),
        execute: async ({ element }) => {
          const bcc = new Set(["Fe", "Cr", "Mo", "W", "V", "Nb", "Ta", "Li", "Na", "K", "Ba"]);
          const hcp = new Set(["Ti", "Zr", "Hf", "Co", "Mg", "Zn", "Cd", "Be"]);
          const structure = bcc.has(element) ? "bcc" : hcp.has(element) ? "hcp" : "fcc";
          return { element, structure };
        },
      }),
    };
  }

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS experiment_runs (
        run_id TEXT PRIMARY KEY,
        potential_label TEXT,
        element TEXT,
        status TEXT,
        records_count INTEGER,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `;
  }
}
