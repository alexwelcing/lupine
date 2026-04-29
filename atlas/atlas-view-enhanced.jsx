import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════
   ATLAS VIEW ENHANCED — Atom Inspector + Measurements + Timeline
   ═══════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════
// SPATIAL HASH for O(1) atom lookup
// ═══════════════════════════════════════════════════════════════
class SpatialHash {
  constructor(cellSize = 20) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  insert(atom, screenX, screenY) {
    const cx = Math.floor(screenX / this.cellSize);
    const cy = Math.floor(screenY / this.cellSize);
    const key = `${cx},${cy}`;
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push({ ...atom, screenX, screenY });
  }

  query(x, y, radius = 15) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const nearby = [];
    const rCells = Math.ceil(radius / this.cellSize);

    for (let dx = -rCells; dx <= rCells; dx++) {
      for (let dy = -rCells; dy <= rCells; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        if (this.cells.has(key)) {
          const cellAtoms = this.cells.get(key);
          for (const atom of cellAtoms) {
            const dist = Math.hypot(atom.screenX - x, atom.screenY - y);
            if (dist < radius) {
              nearby.push({ ...atom, dist });
            }
          }
        }
      }
    }

    return nearby.sort((a, b) => a.dist - b.dist);
  }
}

// ═══════════════════════════════════════════════════════════════
// MEASUREMENT MATH
// ═══════════════════════════════════════════════════════════════
const measureDistance = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const measureAngle = (a, b, c) => {
  // b is the vertex
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);
  const cosAngle = dot / (magBA * magBC);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
};

const measureDihedral = (a, b, c, d) => {
  // Calculate dihedral angle between planes abc and bcd
  const cross = (u, v) => ({
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x
  });
  const dot = (u, v) => u.x * v.x + u.y * v.y + u.z * v.z;
  const sub = (u, v) => ({ x: u.x - v.x, y: u.y - v.y, z: u.z - v.z });
  const normalize = (v) => {
    const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
    return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
  };

  const b1 = normalize(sub(b, a));
  const b2 = normalize(sub(c, b));
  const b3 = normalize(sub(d, c));

  const n1 = normalize(cross(b1, b2));
  const n2 = normalize(cross(b2, b3));
  const m1 = cross(n1, b2);

  const x = dot(n1, n2);
  const y = dot(m1, n2);

  return Math.atan2(y, x) * (180 / Math.PI);
};

// ═══════════════════════════════════════════════════════════════
// DATA GENERATION
// ═══════════════════════════════════════════════════════════════
function generateAtoms(n = 800, frame = 0) {
  const atoms = [];
  const types = [1, 1, 1, 2, 2, 3];
  const seed = frame * 0.01;
  for (let i = 0; i < n; i++) {
    const latticeX = (i % 10) * 32 + ((Math.floor(i / 10) % 2) * 16);
    const latticeY = (Math.floor(i / 10) % 10) * 32;
    const latticeZ = Math.floor(i / 100) * 32;
    const thermal = 2.5 + frame * 0.015;
    const x = latticeX + Math.sin(i * 1.37 + seed * 3.1) * thermal;
    const y = latticeY + Math.cos(i * 2.41 + seed * 2.7) * thermal;
    const z = latticeZ + Math.sin(i * 0.83 + seed * 4.2) * thermal;
    const type = types[i % types.length];
    const ke = 0.5 * (Math.sin(i * 0.7 + frame * 0.05) ** 2) * 0.3 + 0.01;
    const pe = -2.1 + Math.sin(i * 0.3 + frame * 0.02) * 0.4;
    const stress = Math.sin(i * 0.5 + frame * 0.03) * 100;
    const vx = Math.sin(i * 0.9 + seed) * 0.5;
    const vy = Math.cos(i * 1.1 + seed) * 0.5;
    const vz = Math.sin(i * 1.3 + seed) * 0.3;
    atoms.push({ x, y, z, type, ke, pe, stress, vx, vy, vz, id: i });
  }
  return atoms;
}

function generateThermo(frames = 300) {
  const data = [];
  for (let i = 0; i < frames; i++) {
    const eq = 1 - Math.exp(-i / 40);
    data.push({
      step: i * 100,
      temp: 300 * eq + (Math.random() - 0.5) * 24 * eq,
      pe: -4.2 + 0.3 * (1 - eq) + (Math.random() - 0.5) * 0.015 * eq,
      ke: 0.3 * eq + (Math.random() - 0.5) * 0.01,
      press: (Math.random() - 0.5) * 600 * (eq < 0.5 ? 3 : 1),
      vol: 23000 + Math.sin(i * 0.01) * 50,
    });
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════
// COLOR MAPS
// ═══════════════════════════════════════════════════════════════
const TYPE_COLORS = { 1: "#4db8ff", 2: "#ff6b8a", 3: "#7ddf64" };
const TYPE_RADII = { 1: 1.0, 2: 0.75, 3: 1.2 };
const TYPE_LABELS = { 1: "Cu", 2: "O", 3: "Zr" };

function viridis(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(68 + t * (253 - 68) * (1 - t) + t * t * (231 - 68));
  const g = Math.round(1 + t * 215);
  const b = Math.round(84 + t * (37 - 84) + (1 - t) * (150 - 84) * t * 2);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

function inferno(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.round(t < 0.5 ? t * 2 * 200 : 200 + (t - 0.5) * 2 * 55);
  const g = Math.round(t < 0.5 ? t * 2 * 50 : 50 + (t - 0.5) * 2 * 200);
  const b = Math.round(t < 0.3 ? 80 + t * 3 * 120 : 200 - (t - 0.3) * 1.4 * 200);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

// ═══════════════════════════════════════════════════════════════
// THERMO MINIMAP COMPONENT
// ═══════════════════════════════════════════════════════════════
function ThermoMinimap({ data, width, height, currentFrame, onFrameSelect, rangeStart, rangeEnd, onRangeChange }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null); // null, 'start', 'end', 'both'
  const margin = { left: 2, right: 2, top: 2, bottom: 2 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    // Clear
    ctx.fillStyle = "#0a0e17";
    ctx.fillRect(0, 0, width, height);

    // Calculate temperature range
    const temps = data.map(d => d.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    // Draw temperature bars (1 pixel per frame)
    data.forEach((d, i) => {
      const t = (d.temp - minTemp) / (maxTemp - minTemp || 1);
      const hue = 240 - t * 240; // Blue (240) → Red (0)
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      const x = margin.left + (i / (data.length - 1)) * w;
      ctx.fillRect(x, margin.top, Math.max(1, w / data.length), h);
    });

    // Draw range selection overlay
    if (rangeStart !== null && rangeEnd !== null) {
      const startX = margin.left + (rangeStart / (data.length - 1)) * w;
      const endX = margin.left + (rangeEnd / (data.length - 1)) * w;
      ctx.fillStyle = "rgba(77, 184, 255, 0.2)";
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Range handles
      ctx.fillStyle = "#4db8ff";
      ctx.fillRect(startX - 2, 0, 4, height);
      ctx.fillRect(endX - 2, 0, 4, height);
    }

    // Draw current frame indicator
    const frameX = margin.left + (currentFrame / (data.length - 1)) * w;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(frameX, 0);
    ctx.lineTo(frameX, height);
    ctx.stroke();

  }, [data, width, height, currentFrame, rangeStart, rangeEnd]);

  const handleMouseDown = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const w = width - margin.left - margin.right;
    const frame = Math.round((x / w) * (data.length - 1));
    const clampedFrame = Math.max(0, Math.min(data.length - 1, frame));

    // Check if clicking near range handles
    if (rangeStart !== null) {
      const startX = (rangeStart / (data.length - 1)) * w;
      const endX = (rangeEnd / (data.length - 1)) * w;
      const distStart = Math.abs(x - startX);
      const distEnd = Math.abs(x - endX);

      if (distStart < 10 && distStart < distEnd) {
        setDragging('start');
        return;
      } else if (distEnd < 10) {
        setDragging('end');
        return;
      } else if (x > startX && x < endX) {
        setDragging('both');
        return;
      }
    }

    onFrameSelect(clampedFrame);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const w = width - margin.left - margin.right;
    const frame = Math.round((x / w) * (data.length - 1));
    const clampedFrame = Math.max(0, Math.min(data.length - 1, frame));

    if (dragging === 'start') {
      onRangeChange(clampedFrame, rangeEnd);
    } else if (dragging === 'end') {
      onRangeChange(rangeStart, clampedFrame);
    } else if (dragging === 'both') {
      // Could implement dragging entire range
    }
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, cursor: dragging ? 'grabbing' : 'pointer', borderRadius: 4 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// MEASUREMENT OVERLAY
// ═══════════════════════════════════════════════════════════════
function MeasurementOverlay({ atoms, selectedIndices, projection, camera, onClear }) {
  if (selectedIndices.length < 2) return null;

  const selectedAtoms = selectedIndices.map(i => atoms[i]);
  let measurement = null;

  if (selectedIndices.length === 2) {
    const dist = measureDistance(selectedAtoms[0], selectedAtoms[1]);
    measurement = { type: 'distance', value: dist, unit: 'Å' };
  } else if (selectedIndices.length === 3) {
    const angle = measureAngle(selectedAtoms[0], selectedAtoms[1], selectedAtoms[2]);
    measurement = { type: 'angle', value: angle, unit: '°' };
  } else if (selectedIndices.length === 4) {
    const dihedral = measureDihedral(selectedAtoms[0], selectedAtoms[1], selectedAtoms[2], selectedAtoms[3]);
    measurement = { type: 'dihedral', value: dihedral, unit: '°' };
  }

  // Project 3D to screen coordinates
  const project = (atom) => {
    const { cosR, sinR, sc, cx, cy } = projection;
    const ax = atom.x - 144, ay = atom.y - 144, az = atom.z - 128;
    const rx = ax * cosR - az * sinR;
    const rz = ax * sinR + az * cosR;
    const px = cx + rx * sc;
    const py = cy + ay * sc - rz * sc * 0.3;
    return { x: px, y: py };
  };

  const positions = selectedAtoms.map(project);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {/* Measurement lines */}
        {selectedIndices.length >= 2 && (
          <line
            x1={positions[0].x} y1={positions[0].y}
            x2={positions[1].x} y2={positions[1].y}
            stroke="#4db8ff"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
        )}
        {selectedIndices.length >= 3 && (
          <line
            x1={positions[1].x} y1={positions[1].y}
            x2={positions[2].x} y2={positions[2].y}
            stroke="#4db8ff"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
        )}
        {selectedIndices.length >= 4 && (
          <line
            x1={positions[2].x} y1={positions[2].y}
            x2={positions[3].x} y2={positions[3].y}
            stroke="#4db8ff"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
        )}

        {/* Atom markers with numbers */}
        {positions.map((pos, i) => (
          <g key={i}>
            <circle cx={pos.x} cy={pos.y} r="12" fill="#4db8ff" opacity="0.3" />
            <circle cx={pos.x} cy={pos.y} r="8" fill="#4db8ff" />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
              {i + 1}
            </text>
          </g>
        ))}

        {/* Measurement label */}
        {measurement && (
          <g>
            <rect
              x={(positions[0].x + positions[positions.length - 1].x) / 2 - 40}
              y={(positions[0].y + positions[positions.length - 1].y) / 2 - 25}
              width="80"
              height="22"
              rx="4"
              fill="#0e1018"
              stroke="#4db8ff"
              strokeWidth="1"
            />
            <text
              x={(positions[0].x + positions[positions.length - 1].x) / 2}
              y={(positions[0].y + positions[positions.length - 1].y) / 2 - 10}
              textAnchor="middle"
              fill="#4db8ff"
              fontSize="11"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {measurement.type === 'distance' && `d = ${measurement.value.toFixed(3)} Å`}
              {measurement.type === 'angle' && `θ = ${measurement.value.toFixed(1)}°`}
              {measurement.type === 'dihedral' && `φ = ${measurement.value.toFixed(1)}°`}
            </text>
          </g>
        )}
      </svg>

      {/* Clear button */}
      <button
        onClick={onClear}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          pointerEvents: 'auto',
          background: '#ff5c72',
          border: 'none',
          borderRadius: 4,
          color: '#fff',
          padding: '4px 12px',
          fontSize: 10,
          cursor: 'pointer',
        }}
      >
        Clear Selection (Esc)
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ATOM INSPECTOR PANEL
// ═══════════════════════════════════════════════════════════════
function AtomInspector({ atom, pinned, onPin, onClose }) {
  if (!atom) return null;

  const fields = [
    { label: 'ID', value: atom.id },
    { label: 'Type', value: `${TYPE_LABELS[atom.type]} (${atom.type})` },
    { label: 'Position', value: `(${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})` },
    { label: 'Potential Energy', value: `${atom.pe.toFixed(4)} eV` },
    { label: 'Kinetic Energy', value: `${atom.ke.toFixed(4)} eV` },
    { label: 'Total Energy', value: `${(atom.pe + atom.ke).toFixed(4)} eV` },
    { label: 'Stress', value: `${atom.stress.toFixed(2)} MPa` },
    { label: 'Velocity', value: `(${atom.vx.toFixed(3)}, ${atom.vy.toFixed(3)}, ${atom.vz.toFixed(3)}) Å/fs` },
    { label: 'Speed', value: `${Math.sqrt(atom.vx ** 2 + atom.vy ** 2 + atom.vz ** 2).toFixed(3)} Å/fs` },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        right: 10,
        width: 240,
        background: 'rgba(14, 16, 24, 0.95)',
        border: `1px solid ${pinned ? '#4db8ff' : '#1a1d2a'}`,
        borderRadius: 8,
        padding: 12,
        backdropFilter: 'blur(8px)',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ color: '#c4cede', fontSize: 12, fontWeight: 600 }}>
          {pinned ? '📌 Atom Inspector' : '👆 Hovering'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onPin}
            style={{
              background: pinned ? '#4db8ff22' : 'transparent',
              border: `1px solid ${pinned ? '#4db8ff' : '#3a3f52'}`,
              borderRadius: 4,
              color: pinned ? '#4db8ff' : '#8892a8',
              padding: '2px 8px',
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            {pinned ? 'Pinned' : 'Pin (Space)'}
          </button>
          {pinned && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #3a3f52',
                borderRadius: 4,
                color: '#8892a8',
                padding: '2px 8px',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {fields.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ color: '#8892a8' }}>{label}</span>
            <span style={{ color: '#c4cede', fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
          </div>
        ))}
      </div>

      {pinned && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1a1d2a', fontSize: 9, color: '#4db8ff' }}>
          Click another atom to measure distance
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN VIEWPORT COMPONENT
// ═══════════════════════════════════════════════════════════════
function Viewport({
  atoms,
  colorBy,
  rotation,
  zoom,
  effects,
  showBonds,
  showCell,
  onAtomHover,
  onAtomClick,
  hoveredAtom,
  selectedIndices,
  measurementMode,
}) {
  const canvasRef = useRef(null);
  const spatialHash = useRef(new SpatialHash(20));
  const [projection, setProjection] = useState(null);
  const W = 720, H = 520;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#08090e";
    ctx.fillRect(0, 0, W, H);

    // Build spatial hash for hover detection
    spatialHash.current.clear();

    // Projection params
    const cx = W / 2, cy = H / 2;
    const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
    const sc = zoom * 1.6;

    // Project atoms and build spatial hash
    const projected = atoms.map(a => {
      const ax = a.x - 144, ay = a.y - 144, az = a.z - 128;
      const rx = ax * cosR - az * sinR;
      const rz = ax * sinR + az * cosR;
      const ry = ay;
      const depth = rz;
      const px = cx + rx * sc;
      const py = cy + ry * sc - depth * sc * 0.3;
      return { ...a, px, py, depth, rx, ry, rz };
    });

    // Store projection for measurements
    setProjection({ cosR, sinR, sc, cx, cy });

    // Sort by depth for proper rendering
    projected.sort((a, b) => a.depth - b.depth);

    // Build spatial hash from visible atoms
    projected.forEach(a => {
      if (a.px > -20 && a.px < W + 20 && a.py > -20 && a.py < H + 20) {
        spatialHash.current.insert(a, a.px, a.py);
      }
    });

    // Draw cell
    if (showCell) {
      ctx.strokeStyle = "#1e2a40";
      ctx.lineWidth = 0.5;
      const corners = [
        [-144, -144, -128], [176, -144, -128], [176, 176, -128], [-144, 176, -128],
        [-144, -144, 128], [176, -144, 128], [176, 176, 128], [-144, 176, 128]
      ].map(([x, y, z]) => {
        const rx2 = x * cosR - z * sinR;
        const rz2 = x * sinR + z * cosR;
        return [cx + rx2 * sc, cy + y * sc - rz2 * sc * 0.3];
      });
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(corners[i][0], corners[i][1]);
        ctx.lineTo(corners[j][0], corners[j][1]);
        ctx.stroke();
      });
    }

    // Draw bonds
    if (showBonds) {
      ctx.strokeStyle = "#1a2538";
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < Math.min(i + 8, projected.length); j++) {
          const dx = projected[i].px - projected[j].px;
          const dy = projected[i].py - projected[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 28 * sc) {
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.moveTo(projected[i].px, projected[i].py);
            ctx.lineTo(projected[j].px, projected[j].py);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw atoms
    const minPe = Math.min(...atoms.map(a => a.pe));
    const maxPe = Math.max(...atoms.map(a => a.pe));
    const minKe = Math.min(...atoms.map(a => a.ke));
    const maxKe = Math.max(...atoms.map(a => a.ke));
    const minStress = Math.min(...atoms.map(a => a.stress));
    const maxStress = Math.max(...atoms.map(a => a.stress));

    projected.forEach(a => {
      const isHovered = hoveredAtom && hoveredAtom.id === a.id;
      const isSelected = selectedIndices.includes(a.id);

      const depthFade = 0.35 + Math.max(0, Math.min(0.65, (a.depth + 160) / 320));
      let color, baseR;

      if (colorBy === "type") {
        color = TYPE_COLORS[a.type] || "#888";
        baseR = (TYPE_RADII[a.type] || 1) * 5.5;
      } else if (colorBy === "pe") {
        const t = (a.pe - minPe) / (maxPe - minPe || 1);
        color = viridis(t);
        baseR = 5.5;
      } else if (colorBy === "ke") {
        const t = (a.ke - minKe) / (maxKe - minKe || 1);
        color = inferno(t);
        baseR = 5.5;
      } else if (colorBy === "stress") {
        const t = (a.stress - minStress) / (maxStress - minStress || 1);
        color = viridis(t);
        baseR = 5.5;
      } else {
        color = "#6e8caa";
        baseR = 5.5;
      }

      const r = baseR * sc * depthFade * (isHovered || isSelected ? 1.3 : 1);
      if (a.px < -20 || a.px > W + 20 || a.py < -20 || a.py > H + 20) return;

      // Selection/hover ring
      if (isHovered || isSelected) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = isSelected ? "#4db8ff" : "#fff";
        ctx.beginPath();
        ctx.arc(a.px, a.py, r * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // SSAO shadow
      if (effects.ssao) {
        ctx.globalAlpha = 0.12 * depthFade;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(a.px + 1, a.py + 2, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Atom sphere
      ctx.globalAlpha = depthFade;
      const grad = ctx.createRadialGradient(a.px - r * 0.3, a.py - r * 0.35, r * 0.1, a.px, a.py, r);
      grad.addColorStop(0, "#ffffff44");
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, "#00000088");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(a.px, a.py, r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    // Bloom
    if (effects.bloom) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.06;
      projected.slice(-100).forEach(a => {
        const r = 18 * sc;
        const c = colorBy === "type" ? TYPE_COLORS[a.type] : "#4488cc";
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(a.px, a.py, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    // DOF vignette
    if (effects.dof) {
      const vg = ctx.createRadialGradient(cx, cy, H * 0.35, cx, cy, H * 0.7);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, "rgba(8,9,14,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // Grid
    ctx.strokeStyle = "#0d1220";
    ctx.lineWidth = 0.3;
    for (let gx = 0; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

  }, [atoms, colorBy, rotation, zoom, effects, showBonds, showCell, hoveredAtom, selectedIndices]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nearby = spatialHash.current.query(x, y, 20);
    onAtomHover(nearby[0] || null);
  };

  const handleClick = () => {
    if (hoveredAtom) {
      onAtomClick(hoveredAtom);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: W,
        height: H,
        borderRadius: 0,
        display: "block",
        cursor: measurementMode ? 'crosshair' : hoveredAtom ? 'pointer' : 'default'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onAtomHover(null)}
      onClick={handleClick}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function AtlasViewEnhanced() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [colorBy, setColorBy] = useState("type");
  const [rotation, setRotation] = useState(0.4);
  const [zoom, setZoom] = useState(1.0);
  const [effects, setEffects] = useState({ ssao: true, bloom: false, dof: false });
  const [showBonds, setShowBonds] = useState(false);
  const [showCell, setShowCell] = useState(true);
  const [panel, setPanel] = useState("inspector");
  const [hoveredAtom, setHoveredAtom] = useState(null);
  const [pinnedAtom, setPinnedAtom] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);

  const totalFrames = 300;
  const thermoData = useMemo(() => generateThermo(totalFrames), []);
  const atoms = useMemo(() => generateAtoms(800, frame), [frame]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setFrame(f => (f + 1) % totalFrames), 33);
    return () => clearInterval(iv);
  }, [playing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Space: pin atom or play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (hoveredAtom && !measurementMode) {
          setPinnedAtom(hoveredAtom);
        } else {
          setPlaying(p => !p);
        }
      }

      // Arrow keys: navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFrame(f => Math.min(totalFrames - 1, f + (e.shiftKey ? 10 : 1)));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFrame(f => Math.max(0, f - (e.shiftKey ? 10 : 1)));
      }

      // Number keys: color by
      if (e.key >= '1' && e.key <= '5') {
        const modes = ['type', 'pe', 'ke', 'stress', 'velocity'];
        setColorBy(modes[parseInt(e.key) - 1]);
      }

      // Letter keys
      if (e.key === 'b') setShowBonds(b => !b);
      if (e.key === 'c') setShowCell(c => !c);
      if (e.key === 'r') { setRotation(0.4); setZoom(1.0); }
      if (e.key === 'm') setMeasurementMode(m => !m);
      if (e.key === 'Escape') {
        setSelectedIndices([]);
        setPinnedAtom(null);
        setMeasurementMode(false);
      }

      // Home/End
      if (e.key === 'Home') setFrame(0);
      if (e.key === 'End') setFrame(totalFrames - 1);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hoveredAtom, measurementMode, totalFrames]);

  const handleAtomClick = (atom) => {
    if (measurementMode) {
      const idx = selectedIndices.indexOf(atom.id);
      if (idx >= 0) {
        // Remove if already selected
        setSelectedIndices(selectedIndices.filter(id => id !== atom.id));
      } else if (selectedIndices.length < 4) {
        // Add to selection (max 4 for dihedral)
        setSelectedIndices([...selectedIndices, atom.id]);
      }
    } else {
      setPinnedAtom(atom);
    }
  };

  const C = {
    bg: "#0a0b10", panel: "#0e1018", border: "#1a1d2a",
    text: "#8892a8", bright: "#c4cede", accent: "#4db8ff",
    green: "#5de8a0", red: "#ff5c72", gold: "#e8b84d",
    dim: "#3a3f52",
  };

  return (
    <div style={{
      width: "100%", height: "100vh", background: C.bg, color: C.text,
      display: "flex", flexDirection: "column",
      fontFamily: "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace",
      fontSize: 11, overflow: "hidden", userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; background: ${C.border}; height: 3px; border-radius: 2px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%; background: ${C.accent}; cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.dim}; border-radius: 2px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        height: 36, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px", borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 600, color: C.bright, fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: -0.5 }}>
            ATLAS<span style={{ color: C.accent }}>View</span>
          </span>
          <span style={{ color: C.dim, fontSize: 9 }}>v0.2.0-enhanced</span>
          <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />
          <span style={{ color: C.green, fontSize: 10 }}>800 atoms × {totalFrames} frames</span>
          {measurementMode && (
            <span style={{ color: C.gold, fontSize: 10, marginLeft: 8 }}>
              📏 Measurement Mode ({selectedIndices.length}/4 atoms)
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setMeasurementMode(!measurementMode)}
            style={{
              background: measurementMode ? C.accent : 'transparent',
              border: `1px solid ${measurementMode ? C.accent : C.dim}`,
              borderRadius: 4,
              color: measurementMode ? '#0a0b10' : C.text,
              padding: "3px 10px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            {measurementMode ? 'Exit Measure (m)' : 'Measure (m)'}
          </button>
          <button style={{
            background: C.accent, border: "none", borderRadius: 4,
            color: "#0a0b10", padding: "3px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer",
          }}>Export ↓</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* SIDEBAR */}
        <div style={{ width: 200, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
            {["inspector", "style"].map(tab => (
              <button
                key={tab}
                onClick={() => setPanel(tab)}
                style={{
                  flex: 1,
                  background: panel === tab ? "#141824" : "transparent",
                  border: "none",
                  borderBottom: panel === tab ? `2px solid ${C.accent}` : "none",
                  color: panel === tab ? C.bright : C.text,
                  padding: "8px 0",
                  fontSize: 10,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: 12, overflow: "auto", flex: 1 }}>
            {panel === "inspector" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>Keyboard Shortcuts</div>
                <div style={{ fontSize: 10, lineHeight: 1.6 }}>
                  <div><span style={{ color: C.accent }}>Space</span> Pin atom / Play</div>
                  <div><span style={{ color: C.accent }}>← →</span> Navigate frames</div>
                  <div><span style={{ color: C.accent }}>Shift+← →</span> Skip 10</div>
                  <div><span style={{ color: C.accent }}>1-5</span> Color by mode</div>
                  <div><span style={{ color: C.accent }}>B</span> Toggle bonds</div>
                  <div><span style={{ color: C.accent }}>C</span> Toggle cell</div>
                  <div><span style={{ color: C.accent }}>M</span> Measurement mode</div>
                  <div><span style={{ color: C.accent }}>R</span> Reset camera</div>
                  <div><span style={{ color: C.accent }}>Esc</span> Clear selection</div>
                </div>

                {selectedIndices.length >= 2 && (
                  <>
                    <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Measurement</div>
                    <div style={{ fontSize: 10, color: C.accent }}>
                      {selectedIndices.length} atoms selected
                    </div>
                  </>
                )}

                {rangeStart !== null && (
                  <>
                    <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Export Range</div>
                    <div style={{ fontSize: 10 }}>Frames {rangeStart}–{rangeEnd}</div>
                  </>
                )}
              </div>
            )}

            {panel === "style" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>Color By</div>
                {[
                  { key: "type", label: "Atom Type", shortcut: "1" },
                  { key: "pe", label: "Potential Energy", shortcut: "2" },
                  { key: "ke", label: "Kinetic Energy", shortcut: "3" },
                  { key: "stress", label: "Stress", shortcut: "4" },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setColorBy(opt.key)}
                    style={{
                      background: colorBy === opt.key ? `${C.accent}18` : "transparent",
                      border: `1px solid ${colorBy === opt.key ? C.accent : C.border}`,
                      borderRadius: 4,
                      color: colorBy === opt.key ? C.accent : C.text,
                      padding: "6px 8px",
                      fontSize: 10,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    {opt.label}
                    <span style={{ color: C.dim }}>{opt.shortcut}</span>
                  </button>
                ))}

                <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>Effects</div>
                {[
                  { key: "ssao", label: "SSAO Shadows" },
                  { key: "bloom", label: "Bloom" },
                  { key: "dof", label: "Depth of Field" },
                ].map(fx => (
                  <label key={fx.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={effects[fx.key]}
                      onChange={() => setEffects(e => ({ ...e, [fx.key]: !e[fx.key] }))}
                      style={{ accentColor: C.accent }}
                    />
                    <span style={{ fontSize: 10 }}>{fx.label}</span>
                  </label>
                ))}

                <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>View</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={showBonds} onChange={() => setShowBonds(!showBonds)} style={{ accentColor: C.accent }} />
                  <span style={{ fontSize: 10 }}>Show Bonds (B)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={showCell} onChange={() => setShowCell(!showCell)} style={{ accentColor: C.accent }} />
                  <span style={{ fontSize: 10 }}>Show Cell (C)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* VIEWPORT AREA */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#08090e", position: "relative" }}>
            <Viewport
              atoms={atoms}
              colorBy={colorBy}
              rotation={rotation}
              zoom={zoom}
              effects={effects}
              showBonds={showBonds}
              showCell={showCell}
              onAtomHover={setHoveredAtom}
              onAtomClick={handleAtomClick}
              hoveredAtom={hoveredAtom}
              selectedIndices={selectedIndices}
              measurementMode={measurementMode}
            />

            {/* Measurement Overlay */}
            {selectedIndices.length >= 2 && (
              <MeasurementOverlay
                atoms={atoms}
                selectedIndices={selectedIndices}
                projection={{ cosR: Math.cos(rotation), sinR: Math.sin(rotation), sc: zoom * 1.6, cx: 360, cy: 260 }}
                onClear={() => setSelectedIndices([])}
              />
            )}

            {/* Atom Inspector */}
            {(hoveredAtom || pinnedAtom) && (
              <AtomInspector
                atom={pinnedAtom || hoveredAtom}
                pinned={!!pinnedAtom}
                onPin={() => setPinnedAtom(pinnedAtom ? null : hoveredAtom)}
                onClose={() => setPinnedAtom(null)}
              />
            )}

            {/* Stats overlay */}
            <div style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              background: "rgba(14, 16, 24, 0.9)",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 10,
              lineHeight: 1.6,
            }}>
              <div style={{ color: C.bright, marginBottom: 4 }}>Frame {frame} / {totalFrames}</div>
              <div>T = {thermoData[frame]?.temp.toFixed(1)} K</div>
              <div>PE = {thermoData[frame]?.pe.toFixed(4)} eV/atom</div>
              <div>P = {thermoData[frame]?.press.toFixed(1)} bar</div>
            </div>
          </div>

          {/* ENHANCED TIMELINE */}
          <div style={{
            height: 100,
            background: C.panel,
            borderTop: `1px solid ${C.border}`,
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            {/* Thermo Minimap */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: C.dim, width: 50 }}>TEMP</span>
              <ThermoMinimap
                data={thermoData}
                width={600}
                height={24}
                currentFrame={frame}
                onFrameSelect={setFrame}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onRangeChange={(start, end) => { setRangeStart(start); setRangeEnd(end); }}
              />
            </div>

            {/* Playback controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setPlaying(!playing)}
                style={{
                  width: 28, height: 28,
                  background: C.accent,
                  border: "none",
                  borderRadius: 4,
                  color: "#0a0b10",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {playing ? "⏸" : "▶"}
              </button>

              <input
                type="range"
                min={0}
                max={totalFrames - 1}
                value={frame}
                onChange={(e) => setFrame(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />

              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setFrame(0)} style={{ padding: "4px 8px", fontSize: 9, background: C.border, border: "none", borderRadius: 4, color: C.text, cursor: "pointer" }}>⏮</button>
                <button onClick={() => setFrame(f => Math.max(0, f - 1))} style={{ padding: "4px 8px", fontSize: 9, background: C.border, border: "none", borderRadius: 4, color: C.text, cursor: "pointer" }}>◀</button>
                <button onClick={() => setFrame(f => Math.min(totalFrames - 1, f + 1))} style={{ padding: "4px 8px", fontSize: 9, background: C.border, border: "none", borderRadius: 4, color: C.text, cursor: "pointer" }}>▶</button>
                <button onClick={() => setFrame(totalFrames - 1)} style={{ padding: "4px 8px", fontSize: 9, background: C.border, border: "none", borderRadius: 4, color: C.text, cursor: "pointer" }}>⏭</button>
              </div>

              {rangeStart !== null && (
                <button
                  onClick={() => alert(`Export frames ${rangeStart}-${rangeEnd}`)}
                  style={{
                    background: C.green,
                    border: "none",
                    borderRadius: 4,
                    color: "#0a0b10",
                    padding: "4px 12px",
                    fontSize: 9,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Export Range
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
