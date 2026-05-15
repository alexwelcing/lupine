/**
 * DashboardAgent: real-time WebSocket dashboard for the autoresearch fleet.
 */

import type { Env } from "../types";

export class DashboardAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private clients = new Set<WebSocket>();
  private started = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async ensureStarted() {
    if (this.started) return;
    this.started = true;
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureStarted();
    const url = new URL(request.url);

    if (url.pathname === "/dashboard") {
      return new Response(DASHBOARD_HTML, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/dashboard/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.handleConnection(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  private handleConnection(ws: WebSocket) {
    this.clients.add(ws);
    ws.accept();

    ws.addEventListener("message", async (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "subscribe" && msg.fleet) {
          ws.send(JSON.stringify({ type: "subscribed", fleet: msg.fleet }));
        }
        if (msg.type === "trigger" && msg.fleet) {
          const id = this.env.FLEET_ORCHESTRATOR.idFromName("fleet-main-v2");
          const stub = this.env.FLEET_ORCHESTRATOR.get(id);
          await stub.fetch(new Request("http://internal/fleet/run", {
            method: "POST",
            body: JSON.stringify({ elements: [msg.fleet] }),
          }));
          this.broadcast({ type: "triggered", fleet: msg.fleet, at: new Date().toISOString() });
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: String(e) }));
      }
    });

    ws.addEventListener("close", () => {
      this.clients.delete(ws);
    });

    this.sendSnapshot(ws);
  }

  async sendSnapshot(ws: WebSocket) {
    try {
      const records = await this.env.LEDGER.prepare(`SELECT COUNT(*) as total FROM records`).all();
      const experiments = await this.env.LEDGER.prepare(`SELECT COUNT(*) as total FROM records WHERE agent_id = 'agent_epsilon_experiment'`).all();
      ws.send(JSON.stringify({
        type: "snapshot",
        totalRecords: (records.results[0] as { total: number }).total,
        experimentRecords: (experiments.results[0] as { total: number }).total,
        at: new Date().toISOString(),
      }));
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", message: String(e) }));
    }
  }

  broadcast(msg: Record<string, unknown>) {
    const data = JSON.stringify(msg);
    for (const ws of this.clients) {
      try {
        ws.send(data);
      } catch {
        this.clients.delete(ws);
      }
    }
  }
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lupine — Live Dashboard</title>
<style>
:root { --bg: #0a0b12; --surface: #12131a; --text: #e2e2e9; --muted: #8e8e99; --accent: #5b8cff; --lpn-aurora: #00d4aa; --lpn-signal: #5b8cff; --lpn-text-muted: #5a5e75; --lpn-border: #1e2030; --lpn-bg-raised: #12131a; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: "Inter", system-ui, -apple-system, sans-serif; line-height: 1.5; -webkit-font-smoothing: antialiased; }
header { padding: 2rem; border-bottom: 1px solid var(--lpn-border); display:flex; align-items:center; justify-content:space-between; }
h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; font-family: "Space Grotesk", sans-serif; }
.brand-pill { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--lpn-text-muted); border: 1px solid var(--lpn-border); padding: 3px 10px; border-radius: 999px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; padding: 2rem; }
.card { background: var(--surface); border: 1px solid #1e1f27; border-radius: 12px; padding: 1.25rem; }
.card h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 0.5rem; }
.card .value { font-size: 2rem; font-weight: 700; color: var(--accent); }
#log { padding: 2rem; max-height: 400px; overflow-y: auto; }
#log .entry { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.8125rem; color: var(--muted); padding: 0.25rem 0; border-bottom: 1px solid #1e1f27; }
#log .entry b { color: var(--text); }
button { background: var(--accent); color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; margin: 0 2rem 2rem; }
button:hover { opacity: 0.9; }
</style>
</head>
<body>
<header><h1>Lupine // Live Dashboard</h1><span class="brand-pill">Via Hermes Hive</span></header>
<div class="grid">
  <div class="card"><h3>Total Records</h3><div class="value" id="totalRecords">—</div></div>
  <div class="card"><h3>Experiments Run</h3><div class="value" id="experimentRecords">—</div></div>
  <div class="card"><h3>Active Fleets</h3><div class="value" id="activeFleets">—</div></div>
  <div class="card"><h3>Status</h3><div class="value" id="status" style="font-size:1rem;line-height:2rem;">Connecting…</div></div>
</div>
<button onclick="triggerRun()">Trigger Fleet Run (Al)</button>
<div id="log"></div>
<script>
  const ws = new WebSocket(location.origin.replace(/^http/, 'ws') + '/dashboard/ws');
  const log = document.getElementById('log');
  function push(type, msg) {
    const el = document.createElement('div'); el.className = 'entry';
    el.innerHTML = '<b>' + new Date().toLocaleTimeString() + '</b> [' + type + '] ' + msg;
    log.prepend(el);
  }
  ws.onopen = () => { document.getElementById('status').textContent = 'Connected'; push('system', 'WebSocket connected'); };
  ws.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (data.type === 'snapshot') {
      document.getElementById('totalRecords').textContent = data.totalRecords.toLocaleString();
      document.getElementById('experimentRecords').textContent = data.experimentRecords.toLocaleString();
    }
    push(data.type, JSON.stringify(data).slice(0, 200));
  };
  ws.onclose = () => { document.getElementById('status').textContent = 'Disconnected'; push('system', 'WebSocket closed'); };
  function triggerRun() {
    ws.send(JSON.stringify({ type: 'trigger', fleet: 'Al' }));
    push('user', 'Triggered Al fleet');
  }
</script>
</body>
</html>`;
