import { useState, useEffect, useRef, useMemo } from "react";

/* ─── Generate realistic LAMMPS thermo data ─── */
function generateThermoData(steps=2000, targetTemp=300, dt=0.5) {
  const data = [];
  let temp = targetTemp * 0.1;
  let pe = -4.2;
  let ke = 0.01;
  let press = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const eqFactor = 1 - Math.exp(-i / 200);
    temp = targetTemp * eqFactor + (Math.random() - 0.5) * targetTemp * 0.08 * eqFactor;
    ke = temp * 0.0019872 * 0.5 + (Math.random() - 0.5) * 0.01;
    pe = -4.2 + 0.3 * (1 - eqFactor) + (Math.random() - 0.5) * 0.015 * eqFactor;
    press = (Math.random() - 0.5) * 800 * (eqFactor < 0.5 ? 3 : 1) + 1.0;
    const vol = 23000 + Math.sin(i * 0.01) * 50 + (Math.random() - 0.5) * 30;
    data.push({ step: i * 10, time: t, temp, pe, ke, toteng: pe + ke, press, vol });
  }
  return data;
}

function generateRDF(pairs=[[1,1],[1,2]]) {
  const data = [];
  for (let r = 0.1; r <= 8.0; r += 0.04) {
    const row = { r };
    pairs.forEach(([a, b], pi) => {
      const key = `g_${a}${b}`;
      if (pi === 0) {
        const peak1 = 2.8 * Math.exp(-((r - 2.75) ** 2) / 0.06);
        const peak2 = 1.2 * Math.exp(-((r - 4.5) ** 2) / 0.2);
        const peak3 = 0.6 * Math.exp(-((r - 6.8) ** 2) / 0.5);
        row[key] = Math.max(0, peak1 + peak2 + peak3 + (r > 3 ? 1 : 0) + (Math.random() - 0.5) * 0.04);
      } else {
        const peak1 = 3.5 * Math.exp(-((r - 1.9) ** 2) / 0.04);
        const peak2 = 1.0 * Math.exp(-((r - 3.8) ** 2) / 0.15);
        row[key] = Math.max(0, peak1 + peak2 + (r > 2.5 ? 1 : 0) + (Math.random() - 0.5) * 0.03);
      }
    });
    data.push(row);
  }
  return data;
}

function generateMSD() {
  const data = [];
  const D = 2.4e-5;
  for (let t = 0; t <= 500; t += 1) {
    const msd = 6 * D * t * 1000 + (Math.random() - 0.5) * t * 0.02 + (t < 20 ? t * t * 0.001 : 0);
    data.push({ time: t, msd: Math.max(0, msd) });
  }
  return data;
}

/* ─── Color palettes ─── */
const PALETTES = {
  atlas: ["#00d4ff", "#00e88f", "#a78bfa", "#ff8c42", "#ff4d6a", "#fbbf24"],
  nature: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"],
  acs: ["#0072B2", "#D55E00", "#009E73", "#CC79A7", "#F0E442", "#56B4E9"],
  dark: ["#60a5fa", "#34d399", "#c084fc", "#fb923c", "#f87171", "#fbbf24"],
};

/* ─── Mini chart component ─── */
function Chart({ data, xKey, yKeys, xLabel, yLabel, title, palette="atlas", width=560, height=320, showLegend=true, style="atlas" }) {
  const canvasRef = useRef(null);
  const colors = PALETTES[palette] || PALETTES.atlas;
  const isDark = style === "atlas" || style === "dark";
  const bg = isDark ? "#0a0e17" : "#ffffff";
  const gridColor = isDark ? "#1a2540" : "#e5e7eb";
  const textColor = isDark ? "#94a3b8" : "#374151";
  const titleColor = isDark ? "#e2e8f0" : "#111827";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const margin = { top: 36, right: 16, bottom: 48, left: 64 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const xVals = data.map(d => d[xKey]);
    let yMin = Infinity, yMax = -Infinity;
    yKeys.forEach(k => {
      data.forEach(d => {
        if (d[k] < yMin) yMin = d[k];
        if (d[k] > yMax) yMax = d[k];
      });
    });
    const yPad = (yMax - yMin) * 0.08 || 1;
    yMin -= yPad; yMax += yPad;

    const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
    const scaleX = v => margin.left + ((v - xMin) / (xMax - xMin)) * w;
    const scaleY = v => margin.top + h - ((v - yMin) / (yMax - yMin)) * h;

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (h / 5) * i;
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + w, y); ctx.stroke();
    }

    // Data lines
    yKeys.forEach((k, ki) => {
      ctx.strokeStyle = colors[ki % colors.length];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      data.forEach((d, di) => {
        const x = scaleX(d[xKey]), y = scaleY(d[k]);
        di === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Axes
    ctx.strokeStyle = isDark ? "#334155" : "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + h);
    ctx.lineTo(margin.left + w, margin.top + h);
    ctx.stroke();

    // Labels
    ctx.fillStyle = textColor;
    ctx.font = "11px 'DM Mono', monospace";
    ctx.textAlign = "center";
    // X ticks
    for (let i = 0; i <= 4; i++) {
      const val = xMin + ((xMax - xMin) / 4) * i;
      const x = scaleX(val);
      ctx.fillText(val >= 1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(0), x, margin.top + h + 18);
    }
    // Y ticks
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const val = yMin + ((yMax - yMin) / 5) * i;
      const y = scaleY(val);
      ctx.fillText(val.toFixed(val > 100 ? 0 : val > 1 ? 1 : 3), margin.left - 8, y + 4);
    }

    // Axis labels
    ctx.fillStyle = titleColor;
    ctx.font = "12px 'Crimson Pro', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(xLabel || xKey, margin.left + w / 2, height - 4);
    ctx.save();
    ctx.translate(14, margin.top + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel || yKeys.join(", "), 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = titleColor;
    ctx.font = "bold 13px 'Crimson Pro', Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText(title || "", margin.left, margin.top - 12);

    // Legend
    if (showLegend && yKeys.length > 1) {
      const lx = margin.left + w - yKeys.length * 80;
      yKeys.forEach((k, ki) => {
        const x = lx + ki * 80;
        ctx.fillStyle = colors[ki % colors.length];
        ctx.fillRect(x, margin.top - 6, 14, 3);
        ctx.fillStyle = textColor;
        ctx.font = "10px 'DM Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(k, x + 18, margin.top - 2);
      });
    }
  }, [data, xKey, yKeys, width, height, palette, style]);

  return <canvas ref={canvasRef} style={{ width, height, borderRadius: 8 }} />;
}

/* ═══ MAIN ═══ */
export default function AtlasViewDemo() {
  const [activeTab, setActiveTab] = useState("thermo");
  const [style, setStyle] = useState("atlas");
  const thermoData = useMemo(() => generateThermoData(), []);
  const rdfData = useMemo(() => generateRDF(), []);
  const msdData = useMemo(() => generateMSD(), []);
  const [codeVisible, setCodeVisible] = useState(true);

  const isDark = style === "atlas" || style === "dark";
  const bg = isDark ? "#060a12" : "#f8fafc";
  const cardBg = isDark ? "#0c1220" : "#ffffff";
  const border = isDark ? "#1a2540" : "#e2e8f0";
  const text = isDark ? "#c8d6e5" : "#334155";
  const dim = isDark ? "#5a6e8a" : "#94a3b8";
  const accent = "#00d4ff";

  const tabs = [
    { key: "thermo", label: "Thermo", icon: "📊" },
    { key: "energy", label: "Energy", icon: "⚡" },
    { key: "rdf", label: "RDF", icon: "◎" },
    { key: "msd", label: "MSD", icon: "↝" },
    { key: "atoms", label: "3D Atoms", icon: "⚛" },
  ];

  const codeSnippets = {
    thermo: `import atlas_view as av

# One line — publication-quality thermo plot
av.thermo("log.lammps", y=["Temp", "Press"],
          style="${style}")`,
    energy: `import atlas_view as av

# Energy decomposition — auto-detects components
av.energy_breakdown("log.lammps",
                     style="${style}")`,
    rdf: `import atlas_view as av

# Radial distribution function from dump file
av.rdf("dump.lammpstrj",
       pairs=[(1,1), (1,2)],
       style="${style}")`,
    msd: `import atlas_view as av

# Mean squared displacement with diffusion fit
av.msd("dump.lammpstrj",
       style="${style}")`,
    atoms: `import atlas_view as av

# Interactive 3D view in Jupyter notebook
av.atoms("dump.lammpstrj",
         color="type", frame=-1)`,
  };

  return (
    <div style={{
      minHeight: "100vh", background: bg, color: text,
      fontFamily: "'Crimson Pro', Georgia, serif",
      padding: 24, boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Mono:wght@300;400;500&family=Crimson+Pro:wght@300;400;600&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${accent}33; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: 6, color: dim, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>
          First Product Release
        </div>
        <h1 style={{
          fontSize: 48, fontWeight: 900, margin: 0,
          fontFamily: "'Playfair Display', serif",
          color: isDark ? "#fff" : "#0f172a",
        }}>atlas-view</h1>
        <p style={{ fontSize: 16, color: dim, marginTop: 6, fontWeight: 300, fontStyle: "italic" }}>
          Publication-quality LAMMPS visualization in one line
        </p>
        <code style={{
          display: "inline-block", marginTop: 12,
          background: isDark ? "#111a2e" : "#f1f5f9",
          border: `1px solid ${border}`,
          borderRadius: 6, padding: "6px 16px",
          fontFamily: "'DM Mono', monospace", fontSize: 13,
          color: accent,
        }}>pip install atlas-view</code>
      </div>

      {/* Style selector */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
        <span style={{ fontSize: 11, color: dim, fontFamily: "'DM Mono', monospace", marginRight: 8, paddingTop: 5 }}>Style:</span>
        {["atlas", "nature", "acs", "dark"].map(s => (
          <button key={s} onClick={() => setStyle(s)} style={{
            padding: "4px 12px", borderRadius: 4, fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            background: style === s ? (isDark ? "#1a2540" : "#e2e8f0") : "transparent",
            border: `1px solid ${style === s ? accent : border}`,
            color: style === s ? accent : dim,
            cursor: "pointer",
          }}>{s}</button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 13,
            fontFamily: "'DM Mono', monospace",
            background: activeTab === t.key ? (isDark ? "#1a2540" : "#e2e8f0") : "transparent",
            border: `1px solid ${activeTab === t.key ? accent : "transparent"}`,
            color: activeTab === t.key ? (isDark ? "#fff" : "#0f172a") : dim,
            cursor: "pointer", transition: "all 0.2s",
          }}>
            <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Code snippet */}
        <div style={{
          background: isDark ? "#0a0e17" : "#1e293b",
          border: `1px solid ${isDark ? "#1a2540" : "#334155"}`,
          borderRadius: "10px 10px 0 0", padding: "14px 18px",
          fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 1.7,
          color: "#94a3b8", whiteSpace: "pre-wrap",
          cursor: "pointer",
        }} onClick={() => setCodeVisible(!codeVisible)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: codeVisible ? 8 : 0 }}>
            <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#475569" }}>
              Python — {activeTab === "atoms" ? "Jupyter Notebook" : "one-line command"}
            </span>
            <span style={{ fontSize: 9, color: "#475569" }}>{codeVisible ? "▼" : "▶"}</span>
          </div>
          {codeVisible && (
            <div>
              {codeSnippets[activeTab].split("\n").map((line, i) => (
                <div key={i} style={{
                  color: line.startsWith("#") ? "#475569"
                    : line.startsWith("import") ? "#60a5fa"
                    : line.includes("av.") ? "#34d399"
                    : line.includes('"') ? "#fbbf24"
                    : line.includes("style=") ? "#c084fc"
                    : "#94a3b8"
                }}>{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* Chart area */}
        <div style={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: 20,
          display: "flex", justifyContent: "center",
        }}>
          {activeTab === "thermo" && (
            <Chart
              data={thermoData} xKey="time"
              yKeys={["temp", "press"]}
              xLabel="Time (ps)" yLabel="Value"
              title="Temperature & Pressure vs. Time"
              palette={style} style={style}
              width={580} height={320}
            />
          )}
          {activeTab === "energy" && (
            <Chart
              data={thermoData} xKey="time"
              yKeys={["pe", "ke", "toteng"]}
              xLabel="Time (ps)" yLabel="Energy (eV/atom)"
              title="Energy Decomposition"
              palette={style} style={style}
              width={580} height={320}
            />
          )}
          {activeTab === "rdf" && (
            <Chart
              data={rdfData} xKey="r"
              yKeys={["g_11", "g_12"]}
              xLabel="r (Å)" yLabel="g(r)"
              title="Radial Distribution Function"
              palette={style} style={style}
              width={580} height={320}
            />
          )}
          {activeTab === "msd" && (
            <Chart
              data={msdData} xKey="time"
              yKeys={["msd"]}
              xLabel="Time (ps)" yLabel="MSD (Å²)"
              title="Mean Squared Displacement"
              palette={style} style={style}
              width={580} height={320}
              showLegend={false}
            />
          )}
          {activeTab === "atoms" && (
            <div style={{
              width: 580, height: 320,
              background: isDark ? "#0a0e17" : "#f8fafc",
              borderRadius: 8,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              border: `1px dashed ${border}`,
              position: "relative", overflow: "hidden",
            }}>
              {/* Fake 3D atom view */}
              <svg width={560} height={300} viewBox="0 0 560 300">
                {(() => {
                  const atoms = [];
                  const R = 8;
                  for (let ix = 0; ix < 8; ix++) {
                    for (let iy = 0; iy < 6; iy++) {
                      for (let iz = 0; iz < 3; iz++) {
                        const x = 60 + ix * 58 + (iy % 2) * 29 + iz * 12;
                        const y = 30 + iy * 42 + iz * 18;
                        const depth = iz / 3;
                        const type = (ix + iy) % 3 === 0 ? 1 : 0;
                        atoms.push({ x, y, depth, type });
                      }
                    }
                  }
                  atoms.sort((a, b) => a.depth - b.depth);
                  const c0 = PALETTES[style]?.[0] || "#00d4ff";
                  const c1 = PALETTES[style]?.[1] || "#00e88f";
                  return atoms.map((a, i) => (
                    <g key={i}>
                      <circle cx={a.x} cy={a.y} r={R * (0.8 + a.depth * 0.4)}
                        fill={a.type === 0 ? c0 : c1}
                        opacity={0.4 + a.depth * 0.5}
                        stroke={a.type === 0 ? c0 : c1}
                        strokeWidth={0.5}
                      />
                      <circle cx={a.x - 2} cy={a.y - 2} r={R * 0.3 * (0.8 + a.depth * 0.4)}
                        fill="white" opacity={0.15 + a.depth * 0.15}
                      />
                    </g>
                  ));
                })()}
              </svg>
              <div style={{ fontSize: 10, color: dim, fontFamily: "'DM Mono', monospace", position: "absolute", bottom: 8 }}>
                Interactive WebGL — rotate, zoom, pan in Jupyter
              </div>
            </div>
          )}
        </div>

        {/* Feature callouts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 20 }}>
          {[
            { icon: "📦", title: "pip install", desc: "Pre-built wheels for Linux, macOS, Windows. No compilation." },
            { icon: "🎨", title: "Journal styles", desc: "Nature, ACS, APS presets. Publication-ready defaults." },
            { icon: "⚡", title: "Rust-powered", desc: "Parse 100M atom dumps. Streaming, lazy, indexed." },
            { icon: "📓", title: "Jupyter-native", desc: "Interactive 3D, inline plots, widget animations." },
            { icon: "🔬", title: "LAMMPS-aware", desc: "Auto-detect units, equilibration, atom types." },
            { icon: "🆓", title: "Apache 2.0", desc: "100% free, forever. No Pro tiers. No seat limits." },
          ].map((f, i) => (
            <div key={i} style={{
              background: cardBg, border: `1px solid ${border}`, borderRadius: 8,
              padding: "14px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#fff" : "#0f172a", fontFamily: "'DM Mono', monospace" }}>{f.title}</div>
              <div style={{ fontSize: 11, color: dim, marginTop: 4, lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* API preview */}
        <div style={{
          marginTop: 20, background: cardBg, border: `1px solid ${border}`,
          borderRadius: 10, padding: "18px 20px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? accent : "#0f172a", fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
            Full API surface — V1.0
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4,
            fontFamily: "'DM Mono', monospace", fontSize: 11,
          }}>
            {[
              ["av.thermo()", "One-line thermo plots"],
              ["av.thermo_compare()", "Multi-sim comparison"],
              ["av.energy_breakdown()", "Energy decomposition"],
              ["av.atoms()", "3D WebGL atom viewer"],
              ["av.trajectory()", "Animated trajectory"],
              ["av.rdf()", "Radial distribution fn"],
              ["av.msd()", "Mean squared displacement"],
              ["av.density_profile()", "Spatial density profiles"],
              ["av.stress_strain()", "Mechanical response"],
              ["av.coordination()", "Coordination analysis"],
              ["av.set_style()", "Journal style presets"],
              ["fig.save()", "PDF/SVG/PNG export"],
            ].map(([fn, desc], i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "4px 8px", borderRadius: 4, background: isDark ? "#0a0e1788" : "#f8fafc" }}>
                <span style={{ color: "#34d399", fontWeight: 600, minWidth: 170 }}>{fn}</span>
                <span style={{ color: dim }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison */}
        <div style={{
          marginTop: 20, background: cardBg, border: `1px solid ${border}`,
          borderRadius: 10, padding: "18px 20px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#fff" : "#0f172a", fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
            Before & After
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#ff4d6a", fontFamily: "'DM Mono', monospace", marginBottom: 6, fontWeight: 600 }}>BEFORE — 47 lines of matplotlib</div>
              <div style={{
                background: isDark ? "#0a0e17" : "#1e293b", borderRadius: 6, padding: "10px 12px",
                fontFamily: "'DM Mono', monospace", fontSize: 9, lineHeight: 1.6, color: "#64748b",
                maxHeight: 120, overflow: "hidden",
              }}>
                import matplotlib.pyplot as plt<br/>
                import numpy as np<br/>
                import re<br/>
                <br/>
                data = {"{'Step':[], 'Temp':[], ...}"}<br/>
                with open('log.lammps') as f:<br/>
                &nbsp;&nbsp;reading = False<br/>
                &nbsp;&nbsp;for line in f:<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;if line.startswith('Step'):<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;headers = line.split()<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;reading = True<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;continue<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;# ... 35 more lines ...<br/>
                fig, ax = plt.subplots(figsize=...)<br/>
                ax.plot(data['Step'], data['Temp'])<br/>
                ax.set_xlabel('Step')<br/>
                # ... formatting, legends, ...
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#00e88f", fontFamily: "'DM Mono', monospace", marginBottom: 6, fontWeight: 600 }}>AFTER — 1 line of atlas-view</div>
              <div style={{
                background: isDark ? "#0a0e17" : "#1e293b", borderRadius: 6, padding: "10px 12px",
                fontFamily: "'DM Mono', monospace", fontSize: 11, lineHeight: 1.8, color: "#34d399",
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 120,
              }}>
                <div>
                  <span style={{ color: "#60a5fa" }}>import</span> <span style={{ color: "#94a3b8" }}>atlas_view</span> <span style={{ color: "#60a5fa" }}>as</span> <span style={{ color: "#94a3b8" }}>av</span><br/>
                  <br/>
                  <span style={{ color: "#34d399" }}>av.thermo</span>(<span style={{ color: "#fbbf24" }}>"log.lammps"</span>)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 32, paddingBottom: 24 }}>
          <div style={{
            width: 40, height: 1,
            background: `linear-gradient(90deg,transparent,${accent},transparent)`,
            margin: "0 auto 16px",
          }}/>
          <div style={{ fontSize: 11, color: dim, fontFamily: "'DM Mono', monospace" }}>
            Part of <strong style={{ color: isDark ? "#fff" : "#0f172a" }}>ATLAS</strong> — Atomic-scale Theory, Learning, and Simulation
          </div>
          <div style={{ fontSize: 10, color: isDark ? "#334155" : "#cbd5e1", marginTop: 6, fontFamily: "'DM Mono', monospace" }}>
            Apache 2.0 · github.com/atlas-sim/atlas-view · Ship target: 8 weeks
          </div>
        </div>
      </div>
    </div>
  );
}
