use crate::db::WikiDb;
use crate::graph::{Edge, Node, Sphere};
use anyhow::Result;
use serde_json;
use std::fs;
use std::path::Path;

pub struct Renderer;

impl Renderer {
    pub fn render_to_dir(db: &WikiDb, output_dir: &Path) -> Result<()> {
        fs::create_dir_all(output_dir)?;

        let spheres = db.get_spheres()?;
        let nodes = db.get_nodes(None, None, None)?;
        let edges = db.get_edges(None, None, None)?;

        let html = Self::render_html(&spheres, &nodes, &edges)?;
        fs::write(output_dir.join("index.html"), html)?;

        Ok(())
    }

    fn render_html(spheres: &[Sphere], nodes: &[Node], edges: &[Edge]) -> Result<String> {
        let spheres_json = serde_json::to_string(&spheres)?;
        let nodes_json = serde_json::to_string(&nodes)?;
        let edges_json = serde_json::to_string(&edges)?;

        Ok(format!(
            r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lupine Sphere-Grid Wiki</title>
  <script src="https://unpkg.com/cytoscape@3.26.0/dist/cytoscape.min.js"></script>
  <style>
    :root {{
      --bg: #0f172a;
      --panel: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --border: #334155;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }}
    header {{
      padding: 0.75rem 1rem;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }}
    header h1 {{ margin: 0; font-size: 1.1rem; }}
    header select, header button, header input {{
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.35rem 0.6rem;
      font-size: 0.85rem;
    }}
    header button {{ cursor: pointer; }}
    header button:hover {{ border-color: var(--muted); }}
    #main {{ display: flex; flex: 1; min-height: 0; }}
    #cy {{ flex: 1; }}
    #sidebar {{
      width: 320px;
      background: var(--panel);
      border-left: 1px solid var(--border);
      padding: 1rem;
      overflow-y: auto;
      font-size: 0.85rem;
    }}
    #sidebar h2 {{ margin-top: 0; font-size: 1rem; }}
    #sidebar .stat {{ display: flex; justify-content: space-between; margin: 0.25rem 0; }}
    #sidebar .label {{ color: var(--muted); }}
    #sidebar pre {{
      background: var(--bg);
      padding: 0.5rem;
      border-radius: 4px;
      overflow-x: auto;
      border: 1px solid var(--border);
    }}
    .legend-item {{ display: flex; align-items: center; gap: 0.5rem; margin: 0.2rem 0; }}
    .dot {{ width: 10px; height: 10px; border-radius: 50%; }}
  </style>
</head>
<body>
  <header>
    <h1>Lupine Sphere-Grid Wiki</h1>
    <select id="view">
      <option value="overview">Overview</option>
      <option value="all">All nodes</option>
    </select>
    <select id="sphereFilter">
      <option value="">All spheres</option>
    </select>
    <input id="search" type="text" placeholder="Search nodes..." />
    <button id="reset">Reset view</button>
    <button id="fit">Fit</button>
  </header>
  <div id="main">
    <div id="cy"></div>
    <div id="sidebar">
      <h2>Stats</h2>
      <div class="stat"><span class="label">Spheres</span><span id="stat-spheres">0</span></div>
      <div class="stat"><span class="label">Nodes</span><span id="stat-nodes">0</span></div>
      <div class="stat"><span class="label">Edges</span><span id="stat-edges">0</span></div>
      <h2>Legend</h2>
      <div id="legend"></div>
      <h2>Selected</h2>
      <div id="details">Click a node to inspect.</div>
    </div>
  </div>
  <script>
    const SPHERES = {spheres_json};
    const RAW_NODES = {nodes_json};
    const RAW_EDGES = {edges_json};

    const sphereById = Object.fromEntries(SPHERES.map(s => [s.id, s]));

    function makeElements(view, sphereFilter, search) {{
      const nodes = [];
      const edges = [];
      const lowerSearch = search.toLowerCase();

      if (view === 'overview') {{
        for (const s of SPHERES) {{
          if (sphereFilter && s.id !== sphereFilter) continue;
          const count = RAW_NODES.filter(n => n.sphere_id === s.id).length;
          nodes.push({{
            data: {{
              id: s.id,
              label: s.name,
              color: s.color,
              kind: 'sphere',
              count,
              description: s.description,
              priority: s.priority,
            }},
          }});
        }}
        // Connect spheres that share edges
        for (const e of RAW_EDGES) {{
          const src = RAW_NODES.find(n => n.id === e.src_id);
          const dst = RAW_NODES.find(n => n.id === e.dst_id);
          if (!src || !dst) continue;
          if (sphereFilter && src.sphere_id !== sphereFilter && dst.sphere_id !== sphereFilter) continue;
          if (src.sphere_id !== dst.sphere_id) {{
            const sid = src.sphere_id;
            const did = dst.sphere_id;
            const eid = sid + '->' + did;
            if (!edges.find(x => x.data.id === eid)) {{
              edges.push({{ data: {{ id: eid, source: sid, target: did, label: e.kind }} }});
            }}
          }}
        }}
      }} else {{
        for (const n of RAW_NODES) {{
          if (sphereFilter && n.sphere_id !== sphereFilter) continue;
          if (search && !n.name.toLowerCase().includes(lowerSearch)) continue;
          const sphere = sphereById[n.sphere_id];
          nodes.push({{
            data: {{
              id: n.id,
              label: n.name,
              color: sphere ? sphere.color : '#94a3b8',
              kind: n.kind,
              sphere_id: n.sphere_id,
              status: n.status,
              provenance: n.provenance,
              uri: n.uri,
              owner_profile: n.owner_profile,
              config_hash: n.config_hash,
            }},
          }});
        }}
        for (const e of RAW_EDGES) {{
          const srcIn = nodes.find(x => x.data.id === e.src_id);
          const dstIn = nodes.find(x => x.data.id === e.dst_id);
          if (srcIn && dstIn) {{
            edges.push({{
              data: {{
                id: e.id,
                source: e.src_id,
                target: e.dst_id,
                label: e.kind,
                provenance: e.provenance,
              }}
            }});
          }}
        }}
      }}
      return [...nodes, ...edges];
    }}

    let cy = cytoscape({{
      container: document.getElementById('cy'),
      elements: makeElements('overview', '', ''),
      style: [
        {{
          selector: 'node',
          style: {{
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#e2e8f0',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '10px',
            'width': (ele) => ele.data('kind') === 'sphere' ? 40 + Math.sqrt(ele.data('count') || 0) * 2 : 12,
            'height': (ele) => ele.data('kind') === 'sphere' ? 40 + Math.sqrt(ele.data('count') || 0) * 2 : 12,
          }}
        }},
        {{
          selector: 'edge',
          style: {{
            'width': 1,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'color': '#94a3b8',
          }}
        }},
      ],
      layout: {{ name: 'cose', padding: 20, animate: false }}
    }});

    function rebuild() {{
      const view = document.getElementById('view').value;
      const sphereFilter = document.getElementById('sphereFilter').value;
      const search = document.getElementById('search').value;
      cy.elements().remove();
      cy.add(makeElements(view, sphereFilter, search));
      cy.layout({{ name: view === 'overview' ? 'circle' : 'cose', padding: 20, animate: false }}).run();
      updateStats();
    }}

    function updateStats() {{
      document.getElementById('stat-spheres').textContent = SPHERES.length;
      document.getElementById('stat-nodes').textContent = RAW_NODES.length;
      document.getElementById('stat-edges').textContent = RAW_EDGES.length;
      const legend = document.getElementById('legend');
      legend.innerHTML = '';
      for (const s of SPHERES) {{
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `<span class="dot" style="background:${{s.color}}"></span><span>${{s.name}}</span>`;
        legend.appendChild(div);
      }}
    }}

    cy.on('tap', 'node', function(evt) {{
      const d = evt.target.data();
      const detail = document.getElementById('details');
      detail.innerHTML = '<pre>' + JSON.stringify(d, null, 2) + '</pre>';
    }});

    document.getElementById('view').addEventListener('change', rebuild);
    document.getElementById('sphereFilter').addEventListener('change', rebuild);
    document.getElementById('search').addEventListener('input', rebuild);
    document.getElementById('reset').addEventListener('click', () => {{
      document.getElementById('view').value = 'overview';
      document.getElementById('sphereFilter').value = '';
      document.getElementById('search').value = '';
      rebuild();
    }});
    document.getElementById('fit').addEventListener('click', () => cy.fit());

    const sphereSelect = document.getElementById('sphereFilter');
    for (const s of SPHERES) {{
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      sphereSelect.appendChild(opt);
    }}

    updateStats();
    cy.layout({{ name: 'circle', padding: 20, animate: false }}).run();
  </script>
</body>
</html>
"#,
            spheres_json = spheres_json,
            nodes_json = nodes_json,
            edges_json = edges_json,
        ))
    }
}
