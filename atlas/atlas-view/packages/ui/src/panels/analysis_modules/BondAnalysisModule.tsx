import React, { useMemo, useState } from 'react';
import { QuantumSection, AtomicGlass, OrbitalToggle, WaveformSlider } from '@lupine/ui';
import { useStore } from '../../store';

function formatNumber(n: number, digits = 2): string {
  if (!isFinite(n)) return '—';
  if (n >= 10000) return n.toLocaleString(undefined, { maximumFractionDigits: digits });
  return n.toFixed(digits);
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <AtomicGlass level={1} flush style={{ padding: '8px 10px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--lupine-300)' }}>
        {value}{unit && <span style={{ fontSize: 10, color: 'var(--slate-500)', marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 9, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
        {label}
      </div>
    </AtomicGlass>
  );
}

export function BondAnalysisModule() {
  const {
    bondStats,
    bondCutoff,
    setBondCutoff,
    bondColorMode,
    setBondColorMode,
    bondThresholdMode,
    setBondThresholdMode,
    bondPercentileRange,
    setBondPercentileRange,
    applyPercentileCutoff,
    filamentMode,
    toggleFilamentMode,
    meamScreening,
    toggleMeamScreening,
    grDrivenCutoff,
    toggleGrDrivenCutoff,
  } = useStore();

  const [hoveredBin, setHoveredBin] = useState<number | null>(null);

  const histogram = bondStats?.histogram;
  const maxBin = histogram ? Math.max(...histogram.bins, 1) : 1;

  const typePairs = useMemo(() => {
    if (!bondStats) return [];
    return Object.entries(bondStats.typePairCounts)
      .map(([key, count]) => ({
        key,
        count,
        mean: bondStats.typePairMeans[key] ?? 0,
        pct: bondStats.count > 0 ? (count / bondStats.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [bondStats]);

  const totalPairCount = bondStats?.count || 1;

  return (
    <QuantumSection label="Bond Topology" defaultOpen={true} accent="var(--lupine-400)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>

        {/* ─── Header ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>
            {bondStats ? (
              <span>
                <strong style={{ color: 'var(--slate-200)' }}>{bondStats.count.toLocaleString()}</strong> bonds detected
              </span>
            ) : (
              'No bond data yet'
            )}
          </div>
          {bondStats && (
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--lupine-400)',
              boxShadow: '0 0 6px var(--lupine-400)',
              animation: 'pulse 2s infinite',
            }} />
          )}
        </div>

        {/* ─── Stats Cards ─── */}
        {bondStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <StatCard label="Min" value={formatNumber(bondStats.minLength, 2)} unit="Å" />
            <StatCard label="Mean" value={formatNumber(bondStats.meanLength, 2)} unit="Å" />
            <StatCard label="Median" value={formatNumber(bondStats.medianLength, 2)} unit="Å" />
            <StatCard label="Max" value={formatNumber(bondStats.maxLength, 2)} unit="Å" />
            <StatCard label="Std Dev" value={formatNumber(bondStats.stdDev, 3)} unit="Å" />
            <StatCard label="95th %ile" value={formatNumber(bondStats.percentiles['p95'] ?? 0, 2)} unit="Å" />
          </div>
        )}

        {/* ─── SVG Histogram ─── */}
        {histogram && (
          <div style={{ position: 'relative' }}>
            <svg
              viewBox={`0 0 ${histogram.bins.length * 10} 80`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: 80, display: 'block' }}
              onMouseLeave={() => setHoveredBin(null)}
            >
              <defs>
                <linearGradient id="bondHistGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="33%" stopColor="#10b981" />
                  <stop offset="66%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              {/* Background grid lines */}
              {[0, 0.33, 0.66, 1].map((p) => (
                <line
                  key={p}
                  x1={p * histogram.bins.length * 10}
                  y1={0}
                  x2={p * histogram.bins.length * 10}
                  y2={80}
                  stroke="var(--slate-800)"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
              ))}
              {/* Bars */}
              {histogram.bins.map((count, i) => {
                const h = count > 0 ? (count / maxBin) * 70 : 0;
                const x = i * 10 + 1;
                const y = 75 - h;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={8}
                    height={h}
                    rx={1}
                    fill="url(#bondHistGrad)"
                    opacity={hoveredBin === i ? 1 : 0.75}
                    onMouseEnter={() => setHoveredBin(i)}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                  />
                );
              })}
              {/* Cutoff indicator line */}
              {bondStats && bondCutoff >= bondStats.minLength && bondCutoff <= bondStats.maxLength && bondStats.maxLength > bondStats.minLength && (
                <line
                  x1={((bondCutoff - bondStats.minLength) / (bondStats.maxLength - bondStats.minLength)) * histogram.bins.length * 10}
                  y1={2}
                  x2={((bondCutoff - bondStats.minLength) / (bondStats.maxLength - bondStats.minLength)) * histogram.bins.length * 10}
                  y2={78}
                  stroke="#fff"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0.9}
                />
              )}
              {/* X-axis */}
              <line x1={0} y1={76} x2={histogram.bins.length * 10} y2={76} stroke="var(--slate-600)" strokeWidth={0.5} />
            </svg>
            {/* Hover tooltip */}
            {hoveredBin !== null && histogram && (
              <div style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--slate-900)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 8px',
                fontSize: 10,
                color: 'var(--slate-200)',
                fontFamily: 'var(--font-mono)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}>
                {formatNumber(histogram.binEdges[hoveredBin], 2)}–{formatNumber(histogram.binEdges[hoveredBin + 1], 2)} Å:
                {' '}<strong>{histogram.bins[hoveredBin].toLocaleString()}</strong> bonds
              </div>
            )}
            {/* Axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--slate-500)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              <span>{bondStats ? formatNumber(bondStats.minLength, 1) : '0'} Å</span>
              <span>{bondStats ? formatNumber(bondStats.maxLength, 1) : '4'} Å</span>
            </div>
          </div>
        )}

        {/* ─── Dynamic Threshold Controls ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <OrbitalToggle
            label="g(r)-Driven Cutoff"
            active={grDrivenCutoff}
            onClick={toggleGrDrivenCutoff}
          />
          {grDrivenCutoff && bondStats && (
            <div style={{ fontSize: 10, color: 'var(--slate-400)', padding: '4px 0' }}>
              {bondStats.bondLengthHistogramFirstMinimum != null
                ? <>Histogram minimum: <strong style={{ color: 'var(--lupine-300)' }}>{formatNumber(bondStats.bondLengthHistogramFirstMinimum, 2)} Å</strong></>
                : 'Analyzing histogram for first minimum...'}
            </div>
          )}
          <OrbitalToggle
            label="Auto Threshold (percentile)"
            active={bondThresholdMode === 'percentile'}
            onClick={() => setBondThresholdMode(bondThresholdMode === 'percentile' ? 'manual' : 'percentile')}
          />
          {bondThresholdMode === 'percentile' ? (
            <>
              <WaveformSlider
                label="Upper Percentile"
                value={bondPercentileRange[1]}
                min={50}
                max={100}
                step={1}
                format={(v) => `${v}th`}
                onChange={(v) => setBondPercentileRange([bondPercentileRange[0], v])}
              />
              <button
                onClick={applyPercentileCutoff}
                style={{
                  width: '100%', padding: '8px 0',
                  fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  color: 'var(--slate-900)', background: 'var(--lupine-400)',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Apply {bondPercentileRange[1]}th Percentile Cutoff
              </button>
              {bondStats && (() => {
                const roundedPct = Math.round(bondPercentileRange[1] / 5) * 5;
                const cutoffVal = bondStats.percentiles[`p${roundedPct}`];
                return (
                  <div style={{ fontSize: 10, color: 'var(--slate-400)', textAlign: 'center' }}>
                    Cutoff would be <strong style={{ color: 'var(--lupine-300)' }}>{formatNumber(cutoffVal as number, 2)} Å</strong> ({roundedPct}th %ile)
                  </div>
                );
              })()}
            </>
          ) : (
            bondStats && (
              <div style={{ fontSize: 10, color: 'var(--slate-400)', padding: '6px 0' }}>
                Detected range: <strong style={{ color: 'var(--slate-200)' }}>{formatNumber(bondStats.minLength, 2)} – {formatNumber(bondStats.maxLength, 2)} Å</strong>
              </div>
            )
          )}
        </div>

        {/* ─── Per-Type-Pair Breakdown ─── */}
        {typePairs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Top Bond Types
            </div>
            {typePairs.map((tp) => (
              <div key={tp.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--slate-200)', width: 36, flexShrink: 0 }}>
                  {tp.key}
                </span>
                <div style={{ flex: 1, height: 6, background: 'var(--slate-800)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(tp.count / totalPairCount) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--lupine-600), var(--lupine-400))',
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--slate-400)', width: 70, textAlign: 'right', flexShrink: 0 }}>
                  {tp.count.toLocaleString()} ({tp.pct.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─── Filament Mode Toggle ─── */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
          <OrbitalToggle
            label="Electron Sea Filaments"
            active={filamentMode}
            onClick={toggleFilamentMode}
          />
          <div style={{ fontSize: 10, color: 'var(--slate-500)', marginTop: 4, lineHeight: 1.4 }}>
            {filamentMode
              ? 'Rendering delocalized electron density filaments with coordination-based glow'
              : 'Toggle to visualize EAM/MEAM bonding as an overlapping density field'}
          </div>
          {filamentMode && (
            <div style={{ marginTop: 8 }}>
              <OrbitalToggle
                label="MEAM Angular Screening"
                active={meamScreening}
                onClick={toggleMeamScreening}
              />
              <div style={{ fontSize: 10, color: 'var(--slate-500)', marginTop: 4, lineHeight: 1.4 }}>
                {meamScreening
                  ? 'Ghosting bonds screened by intermediate atoms — crystal structure self-organizes'
                  : 'Toggle to fade bonds that are geometrically screened by third atoms'}
              </div>
            </div>
          )}
        </div>

        {/* ─── Bond Dimensionality Toggle ─── */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
          <OrbitalToggle
            label="Color Bonds by Length"
            active={bondColorMode === 'length'}
            onClick={() => setBondColorMode(bondColorMode === 'length' ? 'type' : 'length')}
          />
          {bondColorMode === 'length' && (
            <div style={{
              marginTop: 6, height: 8, borderRadius: 4,
              background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b, #ef4444)',
            }} />
          )}
        </div>

      </div>
    </QuantumSection>
  );
}
