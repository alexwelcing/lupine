/**
 * FleetOrchestrator: parallel research fleet commander.
 *
 * REWIRED for Option-C queue-driven dispatch:
 *   runFleet() no longer calls the Orchestrator DO over the broken
 *   /run interface. It enqueues queue tasks (manifold_analysis per
 *   element, causal_screen per grouping) which the queue consumer
 *   dispatches to the corresponding agent DOs via direct RPC.
 *
 *   This kills the silent-failure loop where every hourly alarm
 *   produced 15 status='failed' rows. New rows record the count of
 *   tasks enqueued + status='dispatched'.
 */

import type { Env } from "../types";
import { enqueueTask } from "../research/queue";

const ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb", "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"];
// "structure" (bcc/fcc, derived from element) added for the h2_bccfcc
// causal-shield screen — see Causal.groupKeyExpr.
const GROUPINGS = ["element", "pair_style", "potential_label", "structure"] as const;

export class FleetOrchestrator implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private started = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async ensureStarted() {
    if (this.started) return;
    this.started = true;
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS fleets (
        fleet_id TEXT PRIMARY KEY,
        element TEXT,
        status TEXT,
        claims_count INTEGER DEFAULT 0,
        records_count INTEGER DEFAULT 0,
        started_at TEXT,
        completed_at TEXT
      )
    `);
  }

  async fetch(request: Request): Promise<Response> {
    try {
      await this.ensureStarted();
      const url = new URL(request.url);

      if (url.pathname === "/fleet/run") {
        let body: Record<string, unknown>;
        try {
          body = await request.json() as Record<string, unknown>;
        } catch (e) {
          console.error("Malformed JSON body:", e);
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const result = await this.runFleet({
          elements: Array.isArray(body.elements) ? body.elements as string[] : undefined,
          iterations: typeof body.iterations === "number" ? body.iterations : 1,
        });
        return Response.json(result);
      }

      if (url.pathname === "/fleet/status") {
        const cursor = this.state.storage.sql.exec(`SELECT * FROM fleets ORDER BY started_at DESC LIMIT 50`);
        const rows = cursor.toArray();
        return Response.json({ fleets: rows });
      }

      if (url.pathname === "/fleet/schedule" && request.method === "POST") {
        let body: Record<string, unknown>;
        try {
          body = await request.json() as Record<string, unknown>;
        } catch (e) {
          console.error("Malformed JSON body:", e);
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const intervalMs = typeof body.intervalMs === "number" ? body.intervalMs : 24 * 3600_000;
        await this.scheduleNextRun(intervalMs);
        return Response.json({ scheduled: true, nextRunMs: intervalMs });
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error("FleetOrchestrator error:", e);
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  async runFleet(opts: { elements?: string[]; iterations?: number }) {
    let elements = opts.elements ?? ELEMENTS;
    if (elements.length === 1 && elements[0].toLowerCase() === "all") {
      elements = ELEMENTS;
    }
    const fleetBatchId = `fleet-batch-${Date.now()}`;
    const dateHour = new Date().toISOString().slice(0, 13);
    const results: Array<{ element: string; status: string; manifold_job?: string; error?: string }> = [];

    // 1. One manifold_analysis task per element.
    for (const el of elements) {
      const fleetId = `${fleetBatchId}-${el}`;
      this.state.storage.sql.exec(
        `INSERT INTO fleets (fleet_id, element, status, started_at) VALUES (?, ?, 'dispatched', datetime('now'))`,
        fleetId, el
      );
      try {
        const enq = await enqueueTask(this.env, {
          kind: "manifold_analysis",
          dedup_key: `auto-manifold:${el}:${dateHour}`,
          enqueued_at: new Date().toISOString(),
          element: el,
        });
        this.state.storage.sql.exec(
          `UPDATE fleets SET status = 'enqueued', completed_at = datetime('now') WHERE fleet_id = ?`,
          fleetId
        );
        results.push({ element: el, status: enq.status, manifold_job: enq.job_id });
      } catch (e) {
        this.state.storage.sql.exec(
          `UPDATE fleets SET status = 'failed', completed_at = datetime('now') WHERE fleet_id = ?`,
          fleetId
        );
        results.push({ element: el, status: "failed", error: String(e) });
      }
    }

    // 2. One causal_screen task per grouping variable (only 3 — independent of element).
    const causalResults: Array<{ grouping: string; status: string; job_id?: string; error?: string }> = [];
    for (const grouping of GROUPINGS) {
      try {
        const enq = await enqueueTask(this.env, {
          kind: "causal_screen",
          dedup_key: `auto-causal:${grouping}:${dateHour}`,
          enqueued_at: new Date().toISOString(),
          grouping,
        });
        causalResults.push({ grouping, status: enq.status, job_id: enq.job_id });
      } catch (e) {
        causalResults.push({ grouping, status: "failed", error: String(e) });
      }
    }

    // 3. Round C2 — property-resolved BCC/FCC screen (one per run).
    let structureProperty: { status: string; job_id?: string; error?: string };
    try {
      const enq = await enqueueTask(this.env, {
        kind: "causal_structure_property",
        dedup_key: `auto-structprop:${dateHour}`,
        enqueued_at: new Date().toISOString(),
      });
      structureProperty = { status: enq.status, job_id: enq.job_id };
    } catch (e) {
      structureProperty = { status: "failed", error: String(e) };
    }

    // 4. Round C3′ — scale-free BCC/FCC screen (range-restriction test).
    let structureScaleFree: { status: string; job_id?: string; error?: string };
    try {
      const enq = await enqueueTask(this.env, {
        kind: "causal_structure_scalefree",
        dedup_key: `auto-scalefree:${dateHour}`,
        enqueued_at: new Date().toISOString(),
      });
      structureScaleFree = { status: enq.status, job_id: enq.job_id };
    } catch (e) {
      structureScaleFree = { status: "failed", error: String(e) };
    }

    return {
      fleets: results.length,
      results,
      causal_screens: causalResults,
      structure_property: structureProperty,
      structure_scalefree: structureScaleFree,
    };
  }

  async scheduleNextRun(delayMs: number = 3600_000) {
    const alarm = await this.state.storage.getAlarm();
    if (alarm === null) {
      await this.state.storage.setAlarm(Date.now() + delayMs);
    }
  }

  async alarm() {
    console.log("FleetOrchestrator alarm fired — enqueueing fleet sweep");
    await this.runFleet({ iterations: 1 });
    await this.scheduleNextRun();
  }

  /**
   * Storage-stats RPC for /graph/agents.json. Returns DO-local row counts.
   */
  async getStorageStats(): Promise<Record<string, number>> {
    await this.ensureStarted();
    try {
      const cursor = this.state.storage.sql.exec(`SELECT COUNT(*) AS n FROM fleets`);
      const rows = cursor.toArray();
      return { fleets: Number((rows[0] as { n?: number })?.n ?? 0) };
    } catch {
      return { fleets: 0 };
    }
  }
}
