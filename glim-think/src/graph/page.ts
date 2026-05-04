/**
 * Single-file HTML page that renders the knowledge graph.
 * Three view modes selectable from the header:
 *   data         → /graph.json     (runtime: hypotheses, claims, insights, papers, hits, vignettes, critiques, theories, deployments, experiments)
 *   architecture → /graph/arch.json (CF topology: worker, D1 tables, R2 prefixes, queue, KV, DO classes, crons, external APIs, endpoint groups)
 *   overlay      → both, merged on a single canvas
 *
 * No build step. cytoscape.js loaded from CDN. The whole thing is one string.
 */
export const GRAPH_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>GLIM Knowledge Graph</title>
<script src="https://unpkg.com/cytoscape@3.30.4/dist/cytoscape.min.js"></script>
<script src="https://unpkg.com/layout-base@2.0.1/layout-base.js"></script>
<script src="https://unpkg.com/cose-base@2.2.0/cose-base.js"></script>
<script src="https://unpkg.com/cytoscape-fcose@2.2.0/cytoscape-fcose.js"></script>
<style>
  :root {
    --bg: #0a0b12;
    --bg-2: #12131a;
    --bg-3: #1c1d27;
    --line: #232531;
    --text: #e6e6ec;
    --muted: #8e8e9d;
    --accent: #5b8cff;
    /* runtime data palette */
    --hyp: #ffb454;
    --claim: #c084fc;
    --insight: #4ade80;
    --paper: #38bdf8;
    --hit: #f87171;
    --vignette: #fb923c;
    --critique: #fbbf24;
    --theory: #a78bfa;
    --deployment: #14b8a6;
    --experiment: #22d3ee;
    --pending: #6ee7b7;
    /* architecture palette */
    --arch-worker: #fb7185;
    --arch-table: #94a3b8;
    --arch-r2: #facc15;
    --arch-kv: #67e8f9;
    --arch-queue: #f472b6;
    --arch-do: #c4b5fd;
    --arch-cron: #fca5a5;
    --arch-ai: #34d399;
    --arch-api: #f59e0b;
    --arch-ep: #60a5fa;
    --agent-instance: #ec4899;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: var(--bg); color: var(--text);
    font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; }
  body { display: grid; grid-template-rows: auto 1fr; grid-template-columns: 1fr 360px;
    grid-template-areas: 'header header' 'graph panel'; }
  header { grid-area: header; padding: 10px 18px; border-bottom: 1px solid var(--line);
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap; background: var(--bg-2); }
  header h1 { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  header .stat { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px;
    color: var(--muted); white-space: nowrap; }
  header .stat b { color: var(--text); }
  header .tabs { display: flex; gap: 0; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
  header .tabs button { background: var(--bg-3); color: var(--muted); border: 0; padding: 5px 12px;
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; cursor: pointer;
    border-right: 1px solid var(--line); font-weight: 600; }
  header .tabs button:last-child { border-right: 0; }
  header .tabs button.active { background: var(--accent); color: #fff; }
  header .filters { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
  header .pill { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 3px 7px; border-radius: 999px; border: 1px solid var(--line); cursor: pointer;
    user-select: none; background: var(--bg-3); color: var(--muted); white-space: nowrap; }
  header .pill.active { color: var(--text); border-color: currentColor; }
  /* runtime pill colors */
  header .pill.active[data-type='hypothesis'] { color: var(--hyp); }
  header .pill.active[data-type='claim'] { color: var(--claim); }
  header .pill.active[data-type='insight'] { color: var(--insight); }
  header .pill.active[data-type='paper'] { color: var(--paper); }
  header .pill.active[data-type='hit'] { color: var(--hit); }
  header .pill.active[data-type='vignette'] { color: var(--vignette); }
  header .pill.active[data-type='critique'] { color: var(--critique); }
  header .pill.active[data-type='theory'] { color: var(--theory); }
  header .pill.active[data-type='deployment'] { color: var(--deployment); }
  header .pill.active[data-type='experiment_run'] { color: var(--experiment); }
  header .pill.active[data-type='pending_experiment'] { color: var(--pending); }
  /* arch pill colors */
  header .pill.active[data-type='cf_worker'] { color: var(--arch-worker); }
  header .pill.active[data-type='d1_table'] { color: var(--arch-table); }
  header .pill.active[data-type='r2_prefix'] { color: var(--arch-r2); }
  header .pill.active[data-type='kv_namespace'] { color: var(--arch-kv); }
  header .pill.active[data-type='queue_binding'] { color: var(--arch-queue); }
  header .pill.active[data-type='do_class'] { color: var(--arch-do); }
  header .pill.active[data-type='cron'] { color: var(--arch-cron); }
  header .pill.active[data-type='ai_binding'] { color: var(--arch-ai); }
  header .pill.active[data-type='external_api'] { color: var(--arch-api); }
  header .pill.active[data-type='endpoint_group'] { color: var(--arch-ep); }
  header .pill.active[data-type='agent_instance'] { color: var(--agent-instance); }
  header input[type='search'] { background: var(--bg-3); border: 1px solid var(--line);
    color: var(--text); padding: 5px 10px; border-radius: 6px; width: 200px; font-size: 12px; }
  header button.action { background: var(--accent); color: white; border: 0; padding: 5px 10px;
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; border-radius: 6px;
    cursor: pointer; font-weight: 600; }
  header button.action:hover { opacity: 0.9; }
  #cy { grid-area: graph; background: radial-gradient(ellipse at top, #14151e 0%, var(--bg) 70%); }
  #panel { grid-area: panel; border-left: 1px solid var(--line); background: var(--bg-2);
    overflow-y: auto; padding: 18px; font-size: 12px; }
  #panel .empty { color: var(--muted); font-style: italic; }
  #panel h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--muted); margin-bottom: 8px; }
  #panel h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; word-break: break-word; line-height: 1.4; }
  #panel .badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.05em; margin-right: 4px; margin-bottom: 4px;
    background: var(--bg-3); color: var(--muted); }
  #panel dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px;
    margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
  #panel dt { color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
    align-self: start; padding-top: 1px; }
  #panel dd { color: var(--text); font-family: ui-monospace, monospace; font-size: 11px;
    word-break: break-word; }
  #panel .neighbors { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
  #panel .neighbors h2 { margin-bottom: 8px; }
  #panel .neighbor { display: block; padding: 8px; background: var(--bg-3); border-radius: 4px;
    margin-bottom: 4px; cursor: pointer; border: 1px solid transparent; }
  #panel .neighbor:hover { border-color: var(--accent); }
  #panel .neighbor .meta { color: var(--muted); font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.05em; margin-bottom: 2px; }
  #panel .neighbor .text { color: var(--text); }
  #panel a { color: var(--accent); text-decoration: none; }
  #panel a:hover { text-decoration: underline; }
  #panel .stats-block { display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
    font-family: ui-monospace, monospace; font-size: 10px; }
  #panel .stats-block .k { color: var(--muted); }
  #panel .stats-block .v { color: var(--text); text-align: right; }
  @media (max-width: 900px) {
    body { grid-template-rows: auto 1fr auto; grid-template-columns: 1fr;
      grid-template-areas: 'header' 'graph' 'panel'; }
    #panel { border-left: 0; border-top: 1px solid var(--line); max-height: 40vh; }
  }
</style>
</head>
<body>
<header>
  <h1>GLIM // Graph</h1>
  <div class="tabs" id="tabs">
    <button data-mode="data" class="active">data</button>
    <button data-mode="arch">architecture</button>
    <button data-mode="agents">agents</button>
    <button data-mode="overlay">overlay</button>
  </div>
  <span class="stat" id="stat-nodes">— nodes</span>
  <span class="stat" id="stat-edges">— edges</span>
  <div class="filters" id="type-filters"></div>
  <input type="search" id="search" placeholder="search labels…" />
  <button class="action" id="reload">reload</button>
  <button class="action" id="relayout">relayout</button>
</header>
<div id="cy"></div>
<div id="panel"><div class="empty">click a node to inspect.</div></div>
<script>
  const TYPE_COLORS = {
    // runtime
    hypothesis: '#ffb454', claim: '#c084fc', insight: '#4ade80',
    paper: '#38bdf8', hit: '#f87171', vignette: '#fb923c',
    critique: '#fbbf24', theory: '#a78bfa', deployment: '#14b8a6',
    experiment_run: '#22d3ee', pending_experiment: '#6ee7b7',
    // architecture
    cf_worker: '#fb7185', d1_table: '#94a3b8', r2_prefix: '#facc15',
    kv_namespace: '#67e8f9', queue_binding: '#f472b6', do_class: '#c4b5fd',
    cron: '#fca5a5', ai_binding: '#34d399', external_api: '#f59e0b',
    endpoint_group: '#60a5fa',
    // agents
    agent_instance: '#ec4899',
  };
  const RUNTIME_TYPES = [
    'hypothesis', 'claim', 'insight', 'paper', 'hit',
    'vignette', 'critique', 'theory', 'deployment',
    'experiment_run', 'pending_experiment',
  ];
  const ARCH_TYPES = [
    'cf_worker', 'd1_table', 'r2_prefix', 'kv_namespace', 'queue_binding',
    'do_class', 'cron', 'ai_binding', 'external_api', 'endpoint_group',
  ];
  const AGENT_TYPES = ['agent_instance'];

  let cy = null;
  let snapshot = { nodes: [], edges: [], stats: {} };
  let mode = 'data';

  async function load() {
    let nodes = [], edges = [], stats = {};
    if (mode === 'data') {
      const r = await fetch('/graph.json', { cache: 'no-store' });
      const j = await r.json();
      nodes = j.nodes || []; edges = j.edges || []; stats = j.stats || {};
    } else if (mode === 'arch') {
      const r = await fetch('/graph/arch.json', { cache: 'no-store' });
      const j = await r.json();
      nodes = j.nodes || []; edges = j.edges || []; stats = j.stats || {};
    } else if (mode === 'agents') {
      const r = await fetch('/graph/agents.json', { cache: 'no-store' });
      const j = await r.json();
      ({ nodes, edges, stats } = agentsToGraph(j));
    } else {
      // overlay: data + arch + agents
      const [a, b, c] = await Promise.all([
        fetch('/graph.json', { cache: 'no-store' }).then(r => r.json()),
        fetch('/graph/arch.json', { cache: 'no-store' }).then(r => r.json()),
        fetch('/graph/agents.json', { cache: 'no-store' }).then(r => r.json()),
      ]);
      const ag = agentsToGraph(c);
      nodes = [...(a.nodes || []), ...(b.nodes || []), ...ag.nodes];
      edges = [...(a.edges || []), ...(b.edges || []), ...ag.edges];
      stats = {
        nodes_total: nodes.length,
        edges_total: edges.length,
        by_type: mergeStats(mergeStats(a.stats?.by_type, b.stats?.by_type), ag.stats.by_type),
        by_edge_kind: mergeStats(mergeStats(a.stats?.by_edge_kind, b.stats?.by_edge_kind), ag.stats.by_edge_kind),
      };
    }
    snapshot = { nodes, edges, stats };
    document.getElementById('stat-nodes').innerHTML = '<b>' + stats.nodes_total + '</b> nodes';
    document.getElementById('stat-edges').innerHTML = '<b>' + stats.edges_total + '</b> edges';
    rebuildPills();
    render();
  }

  // Translate /graph/agents.json into the same {nodes, edges, stats} shape
  // the cytoscape render uses. Each DO instance becomes an agent_instance
  // node; edges connect each instance to its DO class node (so in overlay
  // mode they snap onto the architecture's DO class nodes by id).
  function agentsToGraph(j) {
    const nodes = [];
    const edges = [];
    let i = 0;
    const byType = {}; const byEdgeKind = {};
    for (const inst of (j.instances || [])) {
      const id = inst.do_class + ':' + inst.instance_name;
      const tableLabel = Object.entries(inst.tables || {})
        .map(([t, n]) => t + '·' + n).join(', ');
      const label = inst.instance_name + (tableLabel ? ' [' + tableLabel + ']' : '');
      nodes.push({
        id: id,
        type: 'agent_instance',
        label: label,
        do_class: inst.do_class,
        total_rows: inst.total_rows,
        tables: JSON.stringify(inst.tables),
        error: inst.error || null,
      });
      // edge to DO class node (id matches arch view's do:ClassName)
      edges.push({
        id: 'agee' + (++i),
        source: 'do:' + inst.do_class,
        target: id,
        kind: 'instance_of',
      });
      byType.agent_instance = (byType.agent_instance || 0) + 1;
      byEdgeKind.instance_of = (byEdgeKind.instance_of || 0) + 1;
    }
    return {
      nodes, edges,
      stats: {
        nodes_total: nodes.length,
        edges_total: edges.length,
        by_type: byType,
        by_edge_kind: byEdgeKind,
      },
    };
  }

  function mergeStats(a, b) {
    const out = {};
    for (const k of Object.keys(a || {})) out[k] = (a[k] || 0) + (b?.[k] || 0);
    for (const k of Object.keys(b || {})) if (!(k in out)) out[k] = b[k] || 0;
    return out;
  }

  function rebuildPills() {
    const types = mode === 'data' ? RUNTIME_TYPES :
                  mode === 'arch' ? ARCH_TYPES :
                  mode === 'agents' ? AGENT_TYPES :
                  [...RUNTIME_TYPES, ...ARCH_TYPES, ...AGENT_TYPES];
    const present = new Set(snapshot.nodes.map(n => n.type));
    const html = types
      .filter(t => present.has(t))
      .map(t => '<span class="pill active" data-type="' + t + '">' + t + '</span>')
      .join('');
    document.getElementById('type-filters').innerHTML = html;
  }

  function render() {
    const elements = [];
    for (const n of snapshot.nodes) {
      elements.push({ data: { ...n }, classes: 't-' + n.type });
    }
    for (const e of snapshot.edges) {
      elements.push({ data: { id: e.id, source: e.source, target: e.target, kind: e.kind },
        classes: 'k-' + e.kind });
    }

    const nodeStyles = Object.entries(TYPE_COLORS).map(([t, c]) => ({
      selector: 'node.t-' + t, style: { 'background-color': c },
    }));

    cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
      wheelSensitivity: 0.25,
      style: [
        { selector: 'node', style: {
            'background-color': '#444',
            'label': 'data(label)',
            'color': '#e6e6ec',
            'font-size': 9,
            'font-family': 'ui-monospace, monospace',
            'text-wrap': 'wrap',
            'text-max-width': 140,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-outline-width': 2,
            'text-outline-color': '#0a0b12',
            'border-width': 1,
            'border-color': '#0a0b12',
            'width': 14, 'height': 14,
        }},
        ...nodeStyles,
        // size differentiation for big-deal nodes
        { selector: 'node.t-hypothesis', style: { 'width': 30, 'height': 30, 'font-size': 11, 'font-weight': 700 }},
        { selector: 'node.t-claim', style: { 'width': 18, 'height': 18, 'shape': 'round-diamond' }},
        { selector: 'node.t-insight', style: { 'width': 11, 'height': 11, 'font-size': 8 }},
        { selector: 'node.t-paper', style: { 'width': 15, 'height': 15, 'font-size': 8, 'shape': 'round-rectangle' }},
        { selector: 'node.t-hit', style: { 'width': 20, 'height': 20, 'shape': 'triangle', 'border-width': 2 }},
        { selector: 'node.t-vignette', style: { 'width': 14, 'height': 14, 'shape': 'round-rectangle' }},
        { selector: 'node.t-critique', style: { 'width': 16, 'height': 16, 'shape': 'octagon' }},
        { selector: 'node.t-theory', style: { 'width': 16, 'height': 16, 'shape': 'pentagon' }},
        { selector: 'node.t-deployment', style: { 'width': 12, 'height': 12, 'shape': 'tag' }},
        { selector: 'node.t-experiment_run', style: { 'width': 13, 'height': 13, 'shape': 'hexagon' }},
        { selector: 'node.t-pending_experiment', style: { 'width': 13, 'height': 13, 'shape': 'hexagon', 'border-style': 'dashed', 'border-width': 1.5 }},
        // architecture
        { selector: 'node.t-cf_worker', style: { 'width': 56, 'height': 56, 'font-size': 14, 'font-weight': 700, 'shape': 'star', 'border-width': 2 }},
        { selector: 'node.t-d1_table', style: { 'width': 22, 'height': 22, 'shape': 'round-rectangle', 'font-size': 9 }},
        { selector: 'node.t-r2_prefix', style: { 'width': 20, 'height': 20, 'shape': 'cut-rectangle' }},
        { selector: 'node.t-kv_namespace', style: { 'width': 18, 'height': 18, 'shape': 'round-tag' }},
        { selector: 'node.t-queue_binding', style: { 'width': 22, 'height': 22, 'shape': 'barrel' }},
        { selector: 'node.t-do_class', style: { 'width': 22, 'height': 22, 'shape': 'round-pentagon' }},
        { selector: 'node.t-cron', style: { 'width': 18, 'height': 18, 'shape': 'concave-hexagon' }},
        { selector: 'node.t-ai_binding', style: { 'width': 22, 'height': 22, 'shape': 'round-octagon', 'border-width': 2 }},
        { selector: 'node.t-external_api', style: { 'width': 22, 'height': 22, 'shape': 'rhomboid', 'border-style': 'dashed', 'border-width': 1.5 }},
        { selector: 'node.t-endpoint_group', style: { 'width': 24, 'height': 24, 'shape': 'round-rectangle', 'border-width': 2, 'font-size': 10 }},
        // agent instances
        { selector: 'node.t-agent_instance', style: { 'width': 18, 'height': 18, 'shape': 'round-tag', 'font-size': 9, 'border-width': 1.5 }},
        { selector: 'edge.k-instance_of', style: { 'line-color': '#ec4899', 'target-arrow-color': '#ec4899', 'opacity': 0.55, 'line-style': 'dotted' }},
        { selector: 'node.dim', style: { 'opacity': 0.12 } },
        { selector: 'node.match', style: { 'border-width': 3, 'border-color': '#fff' }},
        { selector: 'node:selected', style: { 'border-width': 3, 'border-color': '#fff' }},
        // edges — base then per-kind
        { selector: 'edge', style: {
            'width': 1.2,
            'line-color': '#3a3c47',
            'curve-style': 'bezier',
            'target-arrow-color': '#3a3c47',
            'target-arrow-shape': 'vee',
            'arrow-scale': 0.6,
            'opacity': 0.55,
        }},
        { selector: 'edge.k-has_insight', style: { 'line-color': '#4ade80', 'target-arrow-color': '#4ade80', 'opacity': 0.4 }},
        { selector: 'edge.k-cites_paper', style: { 'line-color': '#38bdf8', 'target-arrow-color': '#38bdf8', 'opacity': 0.3 }},
        { selector: 'edge.k-has_hit', style: { 'line-color': '#f87171', 'target-arrow-color': '#f87171', 'opacity': 0.6, 'width': 2 }},
        { selector: 'edge.k-evidenced_by', style: { 'line-color': '#c084fc', 'target-arrow-color': '#c084fc', 'opacity': 0.5, 'width': 1.6 }},
        { selector: 'edge.k-tested_by', style: { 'line-color': '#a78bfa', 'target-arrow-color': '#a78bfa', 'opacity': 0.5, 'line-style': 'dashed' }},
        { selector: 'edge.k-vignette_of', style: { 'line-color': '#fb923c', 'target-arrow-color': '#fb923c', 'opacity': 0.5 }},
        { selector: 'edge.k-critiques', style: { 'line-color': '#fbbf24', 'target-arrow-color': '#fbbf24', 'opacity': 0.6, 'width': 1.6 }},
        { selector: 'edge.k-theorizes_on', style: { 'line-color': '#a78bfa', 'target-arrow-color': '#a78bfa', 'opacity': 0.5 }},
        // arch
        { selector: 'edge.k-mounts', style: { 'line-color': '#fb7185', 'target-arrow-color': '#fb7185', 'opacity': 0.65, 'width': 2 }},
        { selector: 'edge.k-schedules', style: { 'line-color': '#fca5a5', 'target-arrow-color': '#fca5a5', 'opacity': 0.65, 'width': 1.6, 'line-style': 'dashed' }},
        { selector: 'edge.k-reads', style: { 'line-color': '#94a3b8', 'target-arrow-color': '#94a3b8', 'opacity': 0.4 }},
        { selector: 'edge.k-writes', style: { 'line-color': '#22d3ee', 'target-arrow-color': '#22d3ee', 'opacity': 0.65, 'width': 1.6 }},
        { selector: 'edge.k-calls', style: { 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b', 'opacity': 0.6, 'width': 1.5 }},
        { selector: 'edge.k-delegates', style: { 'line-color': '#c4b5fd', 'target-arrow-color': '#c4b5fd', 'opacity': 0.55 }},
        { selector: 'edge.k-produces', style: { 'line-color': '#f472b6', 'target-arrow-color': '#f472b6', 'opacity': 0.6, 'width': 1.6 }},
        { selector: 'edge.k-consumed_by', style: { 'line-color': '#f472b6', 'target-arrow-color': '#f472b6', 'opacity': 0.55, 'line-style': 'dashed' }},
        { selector: 'edge.k-contains', style: { 'line-color': '#facc15', 'target-arrow-color': '#facc15', 'opacity': 0.4 }},
        { selector: 'edge.dim', style: { 'opacity': 0.04 } },
      ],
      layout: layoutCfg(),
    });

    cy.on('tap', 'node', (evt) => showPanel(evt.target.data()));
    cy.on('tap', (evt) => { if (evt.target === cy) clearStatsPanel(); });
    applyTypeFilter();
    showStatsPanel();
  }

  function layoutCfg() {
    return {
      name: 'fcose',
      quality: 'default',
      animate: false,
      randomize: true,
      nodeRepulsion: mode === 'arch' ? 9000 : 6500,
      idealEdgeLength: mode === 'arch' ? 110 : 80,
      edgeElasticity: 0.45,
      gravity: 0.25,
      numIter: 2500,
      tile: true,
    };
  }

  function showStatsPanel() {
    const panel = document.getElementById('panel');
    const byType = snapshot.stats?.by_type || {};
    const byEdge = snapshot.stats?.by_edge_kind || {};
    const typeRows = Object.entries(byType).filter(([, n]) => n > 0).sort((a,b) => b[1]-a[1]);
    const edgeRows = Object.entries(byEdge).filter(([, n]) => n > 0).sort((a,b) => b[1]-a[1]);
    panel.innerHTML =
      '<h2>view: ' + escapeHtml(mode) + '</h2>' +
      '<h3>' + snapshot.stats.nodes_total + ' nodes / ' + snapshot.stats.edges_total + ' edges</h3>' +
      '<h2 style="margin-top:18px">nodes by type</h2>' +
      '<div class="stats-block">' +
        typeRows.map(([k,n]) => '<span class="k">' + escapeHtml(k) + '</span><span class="v">' + n + '</span>').join('') +
      '</div>' +
      '<h2 style="margin-top:18px">edges by kind</h2>' +
      '<div class="stats-block">' +
        edgeRows.map(([k,n]) => '<span class="k">' + escapeHtml(k) + '</span><span class="v">' + n + '</span>').join('') +
      '</div>' +
      '<p class="empty" style="margin-top:18px">click a node to inspect.</p>';
  }

  function clearStatsPanel() { showStatsPanel(); }

  function showPanel(data) {
    const panel = document.getElementById('panel');
    const t = data.type;
    const fields = [];
    const skip = new Set(['id', 'type', 'label']);
    for (const k of Object.keys(data)) {
      if (skip.has(k)) continue;
      const v = data[k];
      if (v === null || v === undefined || v === '') continue;
      fields.push([k, v]);
    }

    const node = cy.getElementById(data.id);
    const out = node.outgoers('node').map(n => ({ ...n.data(), edge: 'out' }));
    const inc = node.incomers('node').map(n => ({ ...n.data(), edge: 'in' }));
    const neighbors = [...out, ...inc].slice(0, 30);

    let externalLink = '';
    if (t === 'paper' && data.id) {
      const doi = data.id;
      let url = '';
      if (doi.startsWith('arxiv:')) {
        url = 'https://arxiv.org/abs/' + doi.slice(6).replace(/v\\d+$/, '');
      } else if (doi.startsWith('10.')) {
        url = 'https://doi.org/' + doi;
      }
      if (url) externalLink = '<dt>open</dt><dd><a href="' + url + '" target="_blank" rel="noopener">' + url + '</a></dd>';
    } else if (t === 'hypothesis') {
      externalLink = '<dt>raw</dt><dd><a href="/hypotheses/' + encodeURIComponent(data.id) + '" target="_blank">/hypotheses/' + escapeHtml(data.id) + '</a></dd>';
    } else if (t === 'claim') {
      externalLink = '<dt>raw</dt><dd><a href="/claims/' + encodeURIComponent(data.id) + '" target="_blank">/claims/' + escapeHtml(data.id) + '</a></dd>';
    } else if (t === 'd1_table') {
      const tbl = data.id.replace(/^t:/, '');
      externalLink = '<dt>kind</dt><dd>D1 table</dd><dt>name</dt><dd>' + escapeHtml(tbl) + '</dd>';
    } else if (t === 'cf_worker') {
      externalLink = '<dt>url</dt><dd><a href="https://glim-think-v1.aw-ab5.workers.dev" target="_blank">glim-think-v1.aw-ab5.workers.dev</a></dd>';
    }

    panel.innerHTML =
      '<span class="badge" style="background:' + (TYPE_COLORS[t] || '#444') + ';color:#0a0b12">' + escapeHtml(t) + '</span>' +
      '<h3>' + escapeHtml(data.label) + '</h3>' +
      '<dl>' + fields.map(([k, v]) =>
        '<dt>' + escapeHtml(k) + '</dt><dd>' + escapeHtml(String(v)) + '</dd>'
      ).join('') + externalLink + '</dl>' +
      (neighbors.length > 0 ?
        '<div class="neighbors"><h2>connected (' + neighbors.length + ')</h2>' +
          neighbors.map(n =>
            '<div class="neighbor" data-id="' + escapeHtml(n.id) + '">' +
              '<div class="meta">' + n.edge + ' · ' + n.type + '</div>' +
              '<div class="text">' + escapeHtml(n.label) + '</div>' +
            '</div>'
          ).join('') + '</div>' : '');

    panel.querySelectorAll('.neighbor').forEach(el => {
      el.addEventListener('click', () => {
        const target = cy.getElementById(el.getAttribute('data-id'));
        if (target.length) {
          cy.center(target);
          cy.zoom({ level: 1.3, position: target.position() });
          target.select();
          showPanel(target.data());
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // tab switching
  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    load();
  });

  // type filters (delegated since pills get rebuilt per mode)
  document.getElementById('type-filters').addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    pill.classList.toggle('active');
    applyTypeFilter();
  });
  function applyTypeFilter() {
    if (!cy) return;
    const active = new Set(
      Array.from(document.querySelectorAll('#type-filters .pill.active')).map(p => p.dataset.type)
    );
    cy.batch(() => {
      cy.nodes().forEach(n => {
        if (active.has(n.data('type'))) n.removeClass('dim');
        else n.addClass('dim');
      });
      cy.edges().forEach(e => {
        const s = e.source().data('type');
        const t = e.target().data('type');
        if (active.has(s) && active.has(t)) e.removeClass('dim');
        else e.addClass('dim');
      });
    });
  }

  // search
  document.getElementById('search').addEventListener('input', (e) => {
    if (!cy) return;
    const q = e.target.value.trim().toLowerCase();
    cy.batch(() => {
      cy.nodes().removeClass('match');
      if (q.length >= 2) {
        cy.nodes().forEach(n => {
          const lbl = String(n.data('label') || '').toLowerCase();
          const id  = String(n.data('id')    || '').toLowerCase();
          if (lbl.includes(q) || id.includes(q)) n.addClass('match');
        });
      }
    });
  });

  document.getElementById('reload').addEventListener('click', () => load());
  document.getElementById('relayout').addEventListener('click', () => {
    if (cy) cy.layout(layoutCfg()).run();
  });

  load();
</script>
</body>
</html>`;
