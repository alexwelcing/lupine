/**
 * FleetOrchestrator: parallel research fleet commander.
 */

const ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb", "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"];

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
    const elements = opts.elements ?? ELEMENTS;
    const iterations = opts.iterations ?? 1;

    const promises = elements.map(async (el) => {
      const fleetId = `fleet-${el}-${Date.now()}`;
      this.state.storage.sql.exec(
        `INSERT INTO fleets (fleet_id, element, status, started_at) VALUES (?, ?, 'running', datetime('now'))`,
        fleetId, el
      );

      try {
        const id = this.env.ORCHESTRATOR.idFromName(`orchestrator-${el}`);
        const stub = this.env.ORCHESTRATOR.get(id);
        const response = await stub.fetch(new Request("http://internal/run", {
          method: "POST",
          body: JSON.stringify({ element: el, iterations }),
        }));
        const result = await response.json() as { done?: boolean };

        const recordsRes = await this.env.LEDGER.prepare(
          `SELECT COUNT(*) as count FROM records WHERE element = ?1`
        ).bind(el).all();
        const recordsCount = (recordsRes.results[0] as { count: number }).count;

        this.state.storage.sql.exec(
          `UPDATE fleets SET status = 'complete', records_count = ?, completed_at = datetime('now') WHERE fleet_id = ?`,
          recordsCount, fleetId
        );

        return { element: el, status: "complete", records: recordsCount };
      } catch (e) {
        this.state.storage.sql.exec(
          `UPDATE fleets SET status = 'failed', completed_at = datetime('now') WHERE fleet_id = ?`,
          fleetId
        );
        return { element: el, status: "failed", error: String(e) };
      }
    });

    const results = await Promise.all(promises);

    // Auto-schedule next run if not already scheduled
    try {
      await this.scheduleNextRun();
    } catch (e) {
      console.warn("Failed to schedule next alarm:", e);
    }

    return { fleets: results.length, results };
  }

  async scheduleNextRun(delayMs: number = 3600_000) {
    const alarm = await this.state.storage.getAlarm();
    if (alarm === null) {
      await this.state.storage.setAlarm(Date.now() + delayMs);
    }
  }

  async alarm() {
    console.log("FleetOrchestrator alarm fired — starting scheduled run");
    await this.runFleet({ iterations: 1 });
    await this.scheduleNextRun();
  }
}
