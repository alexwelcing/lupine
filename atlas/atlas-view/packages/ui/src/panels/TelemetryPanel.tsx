/**
 * TelemetryPanel — Property Spike Detection for 3D Viewer
 *
 * Renders real-time material property telemetry overlaid on the
 * molecular visualization. Shows thermo sparklines across frames,
 * highlights spike frames, and controls per-atom property coloring
 * to visually map stress/energy to the 3D structure.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { ThermoData, ThermoRun, Frame } from '@atlas/core/types';
import type { AppState } from '../store';
import { useStore } from '../store';

// ── Types ──────────────────────────────────────────────────────────────

interface TelemetryPanelProps {
  thermo: ThermoData | null;
  currentFrame: Frame | undefined;
  totalFrames: number;
}

interface PropertyStats {
  column: string;
  min: number;
  max: number;
  mean: number;
  current: number;
  spikeLevel: 'nominal' | 'warning' | 'spike' | 'severe';
  /** Indices of spike frames */
  spikeFrames: number[];
  values: Float64Array;
}

// ── Constants ──────────────────────────────────────────────────────────

const SPIKE_COLORS = {
  nominal: '#4ecdc4',
  warning: '#d4a843',
  spike: '#e8834a',
  severe: '#ff4060',
} as const;

const THERMO_PROPERTY_INFO: Record<string, { label: string; unit: string; icon: string }> = {
  Temp:   { label: 'Temperature',     unit: 'K',        icon: '🌡' },
  PotEng: { label: 'Potential Energy', unit: 'eV',       icon: '⚡' },
  KinEng: { label: 'Kinetic Energy',   unit: 'eV',       icon: '💨' },
  TotEng: { label: 'Total Energy',     unit: 'eV',       icon: '∑' },
  Press:  { label: 'Pressure',         unit: 'bar',      icon: '◉' },
  Volume: { label: 'Volume',           unit: 'Å³',       icon: '⬡' },
  Lx:     { label: 'Box Lx',           unit: 'Å',        icon: '↔' },
  Ly:     { label: 'Box Ly',           unit: 'Å',        icon: '↕' },
  Lz:     { label: 'Box Lz',           unit: 'Å',        icon: '⊡' },
  Density:{ label: 'Density',          unit: 'g/cm³',    icon: '◆' },
  Pxx:    { label: 'Pxx',              unit: 'bar',      icon: '⟶' },
  Pyy:    { label: 'Pyy',              unit: 'bar',      icon: '⟶' },
  Pzz:    { label: 'Pzz',              unit: 'bar',      icon: '⟶' },
};

// ── Spike Analysis ─────────────────────────────────────────────────────

function analyzeProperty(
  run: ThermoRun,
  column: string,
  currentFrameIdx: number,
  totalFrames: number,
): PropertyStats | null {
  const data = run.getColumn(column);
  if (!data || data.length === 0) return null;

  let min = Infinity, max = -Infinity, sum = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
    sum += data[i];
  }
  const mean = sum / data.length;
  const range = max - min || 1;

  // Compute standard deviation for spike detection
  let sumSqDiff = 0;
  for (let i = 0; i < data.length; i++) {
    sumSqDiff += (data[i] - mean) ** 2;
  }
  const stdDev = Math.sqrt(sumSqDiff / data.length);

  // Spike detection: frame where value deviates > 2σ from mean
  const spikeFrames: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const deviation = Math.abs(data[i] - mean);
    if (deviation > 2 * stdDev) {
      // Map thermo index to frame index
      const frameIdx = Math.round((i / Math.max(1, data.length - 1)) * (totalFrames - 1));
      spikeFrames.push(frameIdx);
    }
  }

  // Current value (map frame index to thermo index)
  const thermoIdx = Math.min(
    Math.round((currentFrameIdx / Math.max(1, totalFrames - 1)) * (data.length - 1)),
    data.length - 1,
  );
  const current = data[thermoIdx];
  const currentDeviation = Math.abs(current - mean) / (stdDev || 1);

  let spikeLevel: PropertyStats['spikeLevel'] = 'nominal';
  if (currentDeviation > 3) spikeLevel = 'severe';
  else if (currentDeviation > 2) spikeLevel = 'spike';
  else if (currentDeviation > 1.5) spikeLevel = 'warning';

  return { column, min, max, mean, current, spikeLevel, spikeFrames, values: data };
}

// ── Error Heatmap Component ──────────────────────────────────────────────

interface HeatmapProps {
  /** rows: materials, cols: properties, values: error magnitudes */
  data: { material: string; property: string; absError: number }[];
  materials: string[];
  properties: string[];
  width?: number;
  height?: number;
  onCellClick?: (material: string, property: string) => void;
}

export function ErrorHeatmap({
  data, materials, properties,
  width = 240, height = 120,
}: HeatmapProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = 2;
    c.width = width * dpr;
    c.height = height * dpr;
    ctx.scale(dpr, dpr);

    const labelW = 28;
    const labelH = 14;
    const cellW = (width - labelW) / properties.length;
    const cellH = (height - labelH) / materials.length;

    ctx.clearRect(0, 0, width, height);

    // Column headers
    ctx.fillStyle = '#4a5570';
    ctx.font = "bold 8px 'Inter', monospace";
    ctx.textAlign = 'center';
    properties.forEach((p, i) => {
      ctx.fillText(p, labelW + i * cellW + cellW / 2, 10);
    });

    // Row labels + cells
    materials.forEach((m, mi) => {
      ctx.fillStyle = '#4a5570';
      ctx.font = "bold 8px 'Inter', monospace";
      ctx.textAlign = 'right';
      ctx.fillText(m, labelW - 4, labelH + mi * cellH + cellH / 2 + 3);

      properties.forEach((p, pi) => {
        const record = data.find(d => d.material === m && d.property === p);
        const absErr = record?.absError ?? 0;
        
        let level = 'nominal';
        if (absErr >= 0.25) level = 'severe';
        else if (absErr >= 0.10) level = 'spike';
        else if (absErr >= 0.05) level = 'warning';
        
        const sColor = SPIKE_COLORS[level as keyof typeof SPIKE_COLORS];

        const x = labelW + pi * cellW + 1;
        const y = labelH + mi * cellH + 1;
        const w = cellW - 2;
        const h = cellH - 2;

        ctx.fillStyle = sColor + '30';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = sColor + '60';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, w, h);

        // Value
        ctx.fillStyle = sColor;
        ctx.font = "600 7px 'Inter', monospace";
        ctx.textAlign = 'center';
        ctx.fillText(
          (absErr * 100).toFixed(0),
          x + w / 2, y + h / 2 + 3
        );
      });
    });
  }, [data, materials, properties, width, height]);

  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}

// ── Telemetry Panel Component ──────────────────────────────────────────

function TelemetrySparkline({
  values,
  currentIdx,
  spikeFrames,
  totalFrames,
  width = 260,
  height = 48,
  color = '#00fbfb',
  onClick,
}: {
  values: Float64Array;
  currentIdx: number;
  spikeFrames: number[];
  totalFrames: number;
  width?: number;
  height?: number;
  color?: string;
  onClick?: (frame: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = 2;
    c.width = width * dpr;
    c.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (values.length === 0) return;

    const padT = 4, padB = 4, padL = 2, padR = 2;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < values.length; i++) {
      if (values[i] < mn) mn = values[i];
      if (values[i] > mx) mx = values[i];
    }
    const range = mx - mn || 1;

    // Area fill
    ctx.fillStyle = color + '0a';
    ctx.beginPath();
    ctx.moveTo(padL, height - padB);
    for (let i = 0; i < values.length; i++) {
      const x = padL + (i / Math.max(1, values.length - 1)) * chartW;
      const y = padT + chartH - ((values[i] - mn) / range) * chartH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(padL + chartW, height - padB);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
      const x = padL + (i / Math.max(1, values.length - 1)) * chartW;
      const y = padT + chartH - ((values[i] - mn) / range) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Spike markers (map spike frame indices to thermo indices)
    const spikeSet = new Set(spikeFrames);
    for (let i = 0; i < values.length; i++) {
      const frameIdx = Math.round((i / Math.max(1, values.length - 1)) * (totalFrames - 1));
      if (spikeSet.has(frameIdx)) {
        const x = padL + (i / Math.max(1, values.length - 1)) * chartW;
        const y = padT + chartH - ((values[i] - mn) / range) * chartH;
        ctx.fillStyle = SPIKE_COLORS.spike;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0d16';
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Current frame indicator
    const thermoIdx = Math.min(
      Math.round((currentIdx / Math.max(1, totalFrames - 1)) * (values.length - 1)),
      values.length - 1,
    );
    const cx = padL + (thermoIdx / Math.max(1, values.length - 1)) * chartW;
    const cy = padT + chartH - ((values[thermoIdx] - mn) / range) * chartH;

    // Vertical line
    ctx.strokeStyle = '#ffffff30';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, padT);
    ctx.lineTo(cx, height - padB);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current dot
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0d16';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }, [values, currentIdx, spikeFrames, totalFrames, width, height, color]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onClick) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const frame = Math.round((x / rect.width) * (totalFrames - 1));
    onClick(Math.max(0, Math.min(frame, totalFrames - 1)));
  }, [onClick, totalFrames]);

  return (
    <canvas
      ref={ref}
      style={{ width, height, display: 'block', cursor: onClick ? 'pointer' : 'default' }}
      onClick={handleClick}
    />
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────

export function TelemetryPanel({ thermo, currentFrame, totalFrames }: TelemetryPanelProps) {
  const frame = useStore(s => s.frame);
  const setFrame = useStore(s => s.setFrame);
  const colorMode = useStore(s => s.colorMode);
  const colorProperty = useStore(s => s.colorProperty);
  const setColorMode = useStore(s => s.setColorMode);
  const setColorProperty = useStore(s => s.setColorProperty);
  const setColormap = useStore(s => s.setColormap);
  const colormap = useStore(s => s.colormap);

  const [expandedProp, setExpandedProp] = useState<string | null>(null);
  const [autoJumpSpikes, setAutoJumpSpikes] = useState(false);

  // Per-atom properties available in the current frame
  const atomProperties = useMemo(() => {
    if (!currentFrame?.properties) return [];
    return Array.from(currentFrame.properties.keys());
  }, [currentFrame]);

  // Analyze all thermo columns
  const thermoStats = useMemo(() => {
    if (!thermo || thermo.runs.length === 0) return [];
    const run = thermo.runs[0];
    const stats: PropertyStats[] = [];
    for (const col of run.columns) {
      if (col === 'Step' || col === 'Time') continue;
      const s = analyzeProperty(run, col, frame, totalFrames);
      if (s) stats.push(s);
    }
    return stats;
  }, [thermo, frame, totalFrames]);

  // Total spike count across all properties
  const totalSpikes = useMemo(
    () => thermoStats.reduce((sum, s) => sum + s.spikeFrames.length, 0),
    [thermoStats],
  );

  // Handle applying a per-atom property color mode
  const applyPropertyColoring = useCallback((propName: string) => {
    setColorMode('property');
    setColorProperty(propName);
  }, [setColorMode, setColorProperty]);

  // Detect if this is a research showcase entry
  const fileName = useStore(s => s.file?.name);
  const sourceUrl = useStore(s => s.file?.sourceUrl);
  const isResearch = useMemo(() => {
    return fileName?.includes('Potential Benchmark') || fileName?.includes('research_')
      || sourceUrl?.includes('gallery/research/');
  }, [fileName, sourceUrl]);

  // Extract the material symbol from the file name or source URL
  const materialKey = useMemo(() => {
    if (!isResearch) return null;
    // From gallery name: "Cu Potential Benchmark" → "cu"
    const nameMatch = fileName?.match(/^(\w+)\s+Potential/);
    if (nameMatch) return nameMatch[1].toLowerCase();
    // From source URL: "gallery/research/research_cu_benchmark.lammpstrj" → "cu"
    const urlMatch = sourceUrl?.match(/research_(\w+)_benchmark/);
    if (urlMatch) return urlMatch[1].toLowerCase();
    return null;
  }, [isResearch, fileName, sourceUrl]);

  // Fetch research manifest to get potential names
  const [researchManifest, setResearchManifest] = useState<Array<{
    id: string;
    potentialNames?: string[];
  }> | null>(null);

  useEffect(() => {
    if (!isResearch) return;
    fetch('/gallery/research/research_manifest.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => setResearchManifest(data))
      .catch(() => setResearchManifest(null));
  }, [isResearch]);

  // Get current potential name
  const potentialNames = useMemo(() => {
    if (!researchManifest || !materialKey) return null;
    const entry = researchManifest.find(e => e.id === `research_${materialKey}`);
    return entry?.potentialNames ?? null;
  }, [researchManifest, materialKey]);

  const currentPotentialName = useMemo(() => {
    if (!potentialNames || frame >= potentialNames.length) return null;
    return potentialNames[frame];
  }, [potentialNames, frame]);

  // Per-atom error stats from the current frame
  const errorStats = useMemo(() => {
    if (!isResearch || !currentFrame?.properties) return null;
    const errorProp = currentFrame.properties.get('error');
    const strainProp = currentFrame.properties.get('strain');
    const stiffProp = currentFrame.properties.get('stiffness');
    if (!errorProp) return null;

    let errMin = Infinity, errMax = -Infinity, errSum = 0;
    for (let i = 0; i < errorProp.length; i++) {
      if (errorProp[i] < errMin) errMin = errorProp[i];
      if (errorProp[i] > errMax) errMax = errorProp[i];
      errSum += errorProp[i];
    }
    const errMean = errSum / errorProp.length;

    return {
      error: { min: errMin, max: errMax, mean: errMean },
      hasStrain: !!strainProp,
      hasStiffness: !!stiffProp,
    };
  }, [isResearch, currentFrame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', overflow: 'hidden' }}>
      {/* Header stats */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--text-dim)', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            {isResearch ? 'RESEARCH SHOWCASE' : 'TELEMETRY OVERVIEW'}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                {isResearch ? totalFrames : thermoStats.length}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>
                {isResearch ? 'POTENTIALS' : 'CHANNELS'}
              </span>
            </div>
            <div>
              <span style={{
                fontSize: 20, fontWeight: 700,
                color: totalSpikes > 0 ? SPIKE_COLORS.spike : SPIKE_COLORS.nominal,
              }}>
                {isResearch ? atomProperties.length : totalSpikes}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>
                {isResearch ? 'PROPERTIES' : 'SPIKES'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => useStore.setState({ activePanel: null })}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
          title="Close Panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Research Showcase Context */}
      {isResearch && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
        }}>
          {/* Current potential indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 10,
          }}>
            <div style={{
              width: 8, height: 8,
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent)',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {currentPotentialName ?? `Potential ${frame + 1}`}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text-dim)',
                display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <span>{frame + 1} / {totalFrames}</span>
                <span style={{ color: 'var(--border-subtle)' }}>|</span>
                <span>Scrub timeline to compare</span>
              </div>
            </div>
          </div>

          {/* Error stats for current potential */}
          {errorStats && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 4, marginBottom: 10,
            }}>
              {[
                { label: 'MIN ERR', value: errorStats.error.min, color: SPIKE_COLORS.nominal },
                { label: 'MEAN ERR', value: errorStats.error.mean, color: SPIKE_COLORS.warning },
                { label: 'MAX ERR', value: errorStats.error.max, color: errorStats.error.max > 5 ? SPIKE_COLORS.severe : SPIKE_COLORS.spike },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    padding: '4px 6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                    color: 'var(--text-dim)', marginBottom: 2,
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color,
                  }}>
                    {value.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick-action heatmap buttons */}
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--text-dim)', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            ERROR HEATMAP
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['error', 'strain', 'stiffness'].map(prop => {
              const isActive = colorMode === 'property' && colorProperty === prop;
              const available = atomProperties.includes(prop);
              return (
                <button
                  key={prop}
                  disabled={!available}
                  onClick={() => {
                    if (isActive) {
                      setColorMode('type');
                      setColorProperty(null);
                    } else {
                      applyPropertyColoring(prop);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 10, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    background: isActive ? SPIKE_COLORS.spike : 'var(--bg-surface)',
                    color: isActive ? '#000' : available ? SPIKE_COLORS.spike : 'var(--text-dim)',
                    border: `1px solid ${isActive ? SPIKE_COLORS.spike : 'var(--border-subtle)'}`,
                    cursor: available ? 'pointer' : 'default',
                    opacity: available ? 1 : 0.4,
                    transition: 'all 0.15s',
                  }}
                >
                  {prop === 'stiffness' ? 'C11' : prop}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-atom property selector */}
      {atomProperties.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--text-dim)', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            PER-ATOM PROPERTY COLORING
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button
              onClick={() => { setColorMode('type'); setColorProperty(null); }}
              style={{
                padding: '3px 8px',
                fontSize: 10, fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                background: colorMode === 'type' ? 'var(--accent)' : 'var(--bg-elevated)',
                color: colorMode === 'type' ? '#000' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              TYPE
            </button>
            {atomProperties.map(prop => (
              <button
                key={prop}
                onClick={() => applyPropertyColoring(prop)}
                style={{
                  padding: '3px 8px',
                  fontSize: 10, fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  background: colorMode === 'property' && colorProperty === prop
                    ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: colorMode === 'property' && colorProperty === prop
                    ? '#000' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                {prop}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MANIFOLD HUD OVERLAY */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          color: 'var(--text-dim)', textTransform: 'uppercase',
          marginBottom: 6, display: 'flex', justifyContent: 'space-between'
        }}>
          <span>MANIFOLD EIGENVALUES</span>
          <span style={{ color: 'var(--lupine-400)' }}>PR = 1.15 / 5</span>
        </div>
        
        {/* Eigenvalue variance sparklines */}
        <div style={{ display: 'flex', gap: 2, height: 24, marginBottom: 12 }}>
           {[0.930, 0.066, 0.003, 0.001, 0.000].map((v, i) => (
             <div key={i} style={{
               flex: 1, 
               background: i === 0 ? 'var(--accent)' : 'var(--border-subtle)',
               opacity: i === 0 ? 1 : 0.5,
               position: 'relative'
             }}>
               <div style={{
                 position: 'absolute', bottom: 0, left: 0, right: 0,
                 height: `${v * 100}%`,
                 background: i === 0 ? 'var(--accent)' : 'var(--text-dim)',
               }} />
             </div>
           ))}
        </div>

        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          color: 'var(--text-dim)', textTransform: 'uppercase',
          marginBottom: 6, display: 'flex', justifyContent: 'space-between'
        }}>
          <span>PROPERTY ERROR MANIFOLD</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ErrorHeatmap
            materials={['Al', 'Cu', 'Ni', 'Fe', 'Au', 'W']}
            properties={['C11', 'C12', 'C44', 'a0', 'Ecoh']}
            data={[
              { material: 'Al', property: 'C11', absError: 0.05 },
              { material: 'Al', property: 'C12', absError: 0.004 },
              { material: 'Al', property: 'C44', absError: 0.108 },
              { material: 'Al', property: 'a0', absError: 0.000 },
              { material: 'Al', property: 'Ecoh', absError: 0.008 },

              { material: 'Cu', property: 'C11', absError: 0.008 },
              { material: 'Cu', property: 'C12', absError: 0.009 },
              { material: 'Cu', property: 'C44', absError: 0.010 },
              { material: 'Cu', property: 'a0', absError: 0.000 },
              { material: 'Cu', property: 'Ecoh', absError: 0.000 },

              { material: 'Ni', property: 'C11', absError: 0.005 },
              { material: 'Ni', property: 'C12', absError: 0.003 },
              { material: 'Ni', property: 'C44', absError: 0.001 },
              { material: 'Ni', property: 'a0', absError: 0.001 },
              { material: 'Ni', property: 'Ecoh', absError: 0.002 },

              { material: 'Fe', property: 'C11', absError: 0.005 },
              { material: 'Fe', property: 'C12', absError: 0.012 },
              { material: 'Fe', property: 'C44', absError: 0.006 },
              { material: 'Fe', property: 'a0', absError: 0.000 },
              { material: 'Fe', property: 'Ecoh', absError: 0.000 },

              { material: 'Au', property: 'C11', absError: 0.047 },
              { material: 'Au', property: 'C12', absError: 0.026 },
              { material: 'Au', property: 'C44', absError: 0.065 },
              { material: 'Au', property: 'a0', absError: 0.000 },
              { material: 'Au', property: 'Ecoh', absError: 0.000 },

              { material: 'W', property: 'C11', absError: 0.001 },
              { material: 'W', property: 'C12', absError: 0.002 },
              { material: 'W', property: 'C44', absError: 0.002 },
              { material: 'W', property: 'a0', absError: 0.000 },
              { material: 'W', property: 'Ecoh', absError: 0.000 },
            ]}
          />
        </div>

        <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 8 }}>
           First principal direction captures 93.0% of error variance.
        </div>
      </div>

      {/* Thermo channels list */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {thermoStats.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center',
            color: 'var(--text-dim)', fontSize: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📡</div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>No Thermo Data</div>
            <div style={{ fontSize: 11 }}>
              Load a LAMMPS log or trajectory with thermo output to view property telemetry.
            </div>
          </div>
        ) : (
          thermoStats.map(stat => {
            const info = THERMO_PROPERTY_INFO[stat.column];
            const isExpanded = expandedProp === stat.column;
            const sColor = SPIKE_COLORS[stat.spikeLevel];

            return (
              <div
                key={stat.column}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background 0.15s',
                  background: isExpanded ? 'var(--bg-elevated)' : 'transparent',
                }}
              >
                {/* Property row */}
                <button
                  onClick={() => setExpandedProp(isExpanded ? null : stat.column)}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {/* Spike indicator */}
                  <div style={{
                    width: 3, height: 28, flexShrink: 0,
                    background: sColor,
                    boxShadow: stat.spikeLevel !== 'nominal' ? `0 0 6px ${sColor}` : 'none',
                  }} />

                  {/* Icon */}
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                    {info?.icon ?? '·'}
                  </span>

                  {/* Label + value */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {info?.label ?? stat.column}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {info?.unit ?? ''}
                    </div>
                  </div>

                  {/* Current value */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: sColor,
                    }}>
                      {formatValue(stat.current)}
                    </div>
                    {stat.spikeFrames.length > 0 && (
                      <div style={{
                        fontSize: 9, fontWeight: 600,
                        color: SPIKE_COLORS.spike,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        ⚡ {stat.spikeFrames.length}
                      </div>
                    )}
                  </div>

                  {/* Inline mini sparkline */}
                  <div style={{ width: 60, flexShrink: 0 }}>
                    <TelemetrySparkline
                      values={stat.values}
                      currentIdx={frame}
                      spikeFrames={[]}
                      totalFrames={totalFrames}
                      width={60}
                      height={24}
                      color={sColor}
                    />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 12px 16px' }}>
                    {/* Full sparkline */}
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 8,
                      marginBottom: 8,
                    }}>
                      <TelemetrySparkline
                        values={stat.values}
                        currentIdx={frame}
                        spikeFrames={stat.spikeFrames}
                        totalFrames={totalFrames}
                        width={260}
                        height={56}
                        color={sColor}
                        onClick={setFrame}
                      />
                    </div>

                    {/* Stats grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 4, marginBottom: 8,
                    }}>
                      {[
                        { label: 'MIN', value: stat.min },
                        { label: 'MEAN', value: stat.mean },
                        { label: 'MAX', value: stat.max },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          style={{
                            padding: '4px 6px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                            color: 'var(--text-dim)', marginBottom: 2,
                          }}>
                            {label}
                          </div>
                          <div style={{
                            fontSize: 11, fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-primary)',
                          }}>
                            {formatValue(value)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Spike list */}
                    {stat.spikeFrames.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                          color: SPIKE_COLORS.spike, marginBottom: 4,
                        }}>
                          DETECTED SPIKES ({stat.spikeFrames.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {stat.spikeFrames.slice(0, 12).map((sf, i) => (
                            <button
                              key={i}
                              onClick={() => setFrame(sf)}
                              style={{
                                padding: '2px 6px',
                                fontSize: 9,
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                background: sf === frame ? SPIKE_COLORS.spike : 'var(--bg-elevated)',
                                color: sf === frame ? '#000' : SPIKE_COLORS.spike,
                                border: `1px solid ${SPIKE_COLORS.spike}30`,
                                cursor: 'pointer',
                              }}
                            >
                              F{sf}
                            </button>
                          ))}
                          {stat.spikeFrames.length > 12 && (
                            <span style={{
                              fontSize: 9, color: 'var(--text-dim)',
                              padding: '2px 4px',
                            }}>
                              +{stat.spikeFrames.length - 12} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Colormap hint */}
      {colorMode === 'property' && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 10, color: 'var(--text-dim)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 40, height: 6,
            background: 'linear-gradient(90deg, #440154, #31688e, #35b779, #fde725)',
            borderRadius: 2,
          }} />
          <span>
            Atoms colored by <strong style={{ color: 'var(--accent)' }}>{colorProperty}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatValue(v: number): string {
  if (Math.abs(v) >= 1e6) return v.toExponential(2);
  if (Math.abs(v) >= 1000) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(3);
  if (Math.abs(v) >= 0.001) return v.toFixed(4);
  return v.toExponential(2);
}
