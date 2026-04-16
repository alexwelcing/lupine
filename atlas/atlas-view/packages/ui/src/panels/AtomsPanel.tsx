/**
 * AtomsPanel — Per-type visibility, sizing, and statistics
 *
 * Features:
 * - Toggle visibility per atom type (eye icon)
 * - Solo mode (double-click hides all others)
 * - Per-type size scaling with sliders
 * - Global atom size slider
 * - Live statistics (counts per type, total, bbox)
 * 
 * Fully integrated with @lupine/ui "Atomic Understanding" component library.
 */

import { useMemo } from 'react';
import { useStore } from '../store';
import {
  QuantumSection,
  AtomicGlass,
  CovalentGrid,
  IsotopeChip,
  WaveformSlider
} from '@lupine/ui';

// CPK colors matching AtomsOptimized.tsx
const TYPE_COLORS: Record<number, string> = {
  1: '#4db8ff',   // Cyan blue
  2: '#ff5a7a',   // Coral red
  3: '#6be06f',   // Emerald green
  4: '#ffd129',   // Gold
  5: '#a380eb',   // Lavender
  6: '#ff9440',   // Orange
  7: '#d952ad',   // Magenta
  8: '#47dbd1',   // Teal
};

const TYPE_NAMES: Record<number, string> = {
  1: 'Type 1', 2: 'Type 2', 3: 'Type 3', 4: 'Type 4',
  5: 'Type 5', 6: 'Type 6', 7: 'Type 7', 8: 'Type 8',
};

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 010-.696 10.75 10.75 0 0119.876 0 1 1 0 010 .696 10.75 10.75 0 01-19.876 0z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconTarget = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export function AtomsPanel() {
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const hiddenAtomTypes = useStore(s => s.hiddenAtomTypes);
  const atomTypeScales = useStore(s => s.atomTypeScales);
  const atomScale = useStore(s => s.atomScale);
  const {
    toggleAtomType, showAllAtomTypes, soloAtomType,
    setAtomTypeScale, resetAtomTypeScales, setAtomScale,
  } = useStore();

  const currentFrame = file?.trajectory.frames[frame];

  // Compute per-type statistics
  const typeStats = useMemo(() => {
    if (!currentFrame) return [];
    const counts = new Map<number, number>();
    for (let i = 0; i < currentFrame.natoms; i++) {
      const t = currentFrame.types[i];
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([type, count]) => ({
        type,
        count,
        pct: (count / currentFrame.natoms * 100),
        color: TYPE_COLORS[type] ?? '#999',
        name: TYPE_NAMES[type] ?? `Type ${type}`,
      }));
  }, [currentFrame]);

  // Compute bbox
  const bbox = useMemo(() => {
    if (!currentFrame?.boxBounds) return null;
    const b = currentFrame.boxBounds;
    return {
      x: (b[1] - b[0]).toFixed(1),
      y: (b[3] - b[2]).toFixed(1),
      z: (b[5] - b[4]).toFixed(1),
    };
  }, [currentFrame]);

  const visibleCount = useMemo(() => {
    if (!currentFrame) return 0;
    let count = 0;
    for (let i = 0; i < currentFrame.natoms; i++) {
      if (!hiddenAtomTypes.has(currentFrame.types[i])) count++;
    }
    return count;
  }, [currentFrame, hiddenAtomTypes]);

  const allVisible = hiddenAtomTypes.size === 0;
  const hasScaleOverrides = Object.keys(atomTypeScales).length > 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--slate-900)',
      borderLeft: '1px solid var(--glass-border)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.3), -2px 0 8px rgba(0,0,0,0.15)',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--glass-bg-2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'linear-gradient(180deg, var(--lupine-400), var(--violet-500))',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--lupine-300)',
          }}>
            Atoms
          </span>
        </div>
        <button
          onClick={() => useStore.getState().setActivePanel(null)}
          className="lupine-glass lupine-glass--1 lupine-glass--interactive"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'transparent', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--slate-500)', cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>
      </div>

      {/* ─── Content ─── */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ─── Summary Stats ─── */}
          <CovalentGrid columns={2} gap={8}>
            <StatBox label="Total Atoms" value={currentFrame ? currentFrame.natoms.toLocaleString() : '—'} />
            <StatBox label="Visible Atoms" value={visibleCount.toLocaleString()} accent={!allVisible} />
            <StatBox label="Unique Types" value={typeStats.length.toString()} />
            <StatBox label="Active Frame" value={`${frame + 1} / ${file?.trajectory.totalFrames ?? 0}`} />
          </CovalentGrid>

          {bbox && (
            <AtomicGlass level={1} flush style={{ padding: '10px 14px', marginTop: 4 }}>
              <div style={{
                fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--slate-400)',
              }}>
                <span style={{ color: 'var(--slate-500)', marginRight: 8, letterSpacing: '0.04em' }}>BBOX</span>
                <span style={{ color: 'var(--slate-100)' }}>{bbox.x}</span>
                <span style={{ margin: '0 4px', color: 'var(--slate-500)' }}>×</span>
                <span style={{ color: 'var(--slate-100)' }}>{bbox.y}</span>
                <span style={{ margin: '0 4px', color: 'var(--slate-500)' }}>×</span>
                <span style={{ color: 'var(--slate-100)' }}>{bbox.z}</span>
                <span style={{ color: 'var(--slate-500)', marginLeft: 8 }}>Å</span>
              </div>
            </AtomicGlass>
          )}

          <div style={{ height: 8 }} />

          {/* ─── Global Atom Size ─── */}
          <QuantumSection label="Global Atom Scaling" defaultOpen={true}>
            <div style={{ padding: '4px 0' }}>
              <WaveformSlider
                label="Scale Factor"
                value={atomScale}
                min={0.1}
                max={3.0}
                step={0.05}
                format={(v) => v.toFixed(2)}
                onChange={setAtomScale}
              />
              {/* Quick size chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                {[0.3, 0.5, 0.75, 1.0, 1.5, 2.0].map(s => (
                  <IsotopeChip
                    key={s}
                    label={`${s}×`}
                    selected={atomScale === s}
                    onClick={() => setAtomScale(s)}
                  />
                ))}
            </div>
            </div>
          </QuantumSection>

          {/* ─── Per-Type Controls ─── */}
          <QuantumSection 
            label="Atom Types" 
            defaultOpen={true}
            action={
              <div style={{ display: 'flex', gap: 6 }}>
                {!allVisible && (
                  <MiniButton label="Show All" onClick={showAllAtomTypes} />
                )}
                {hasScaleOverrides && (
                  <MiniButton label="Reset Sizes" onClick={resetAtomTypeScales} />
                )}
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {typeStats.map(({ type, count, pct, color, name }) => {
                const isHidden = hiddenAtomTypes.has(type);
                const typeScaleValue = atomTypeScales[type] ?? 1.0;

                return (
                  <AtomicGlass 
                    key={type} 
                    level={isHidden ? 1 : 2} 
                    flush 
                    style={{ 
                      padding: '10px 12px',
                      opacity: isHidden ? 0.6 : 1,
                      borderColor: isHidden ? 'var(--glass-border)' : 'var(--glass-border-hi)',
                    }}
                  >
                    {/* Top row: color dot, name, count, actions */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      {/* Color indicator */}
                      <div style={{
                        width: 14, height: 14,
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                        boxShadow: isHidden ? 'none' : `0 0 10px ${color}60`,
                      }} />

                      {/* Name & count */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: isHidden ? 'var(--slate-400)' : 'var(--slate-100)',
                        }}>
                          {name}
                        </div>
                        <div style={{
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: isHidden ? 'var(--slate-500)' : 'var(--slate-300)',
                        }}>
                          {count.toLocaleString()} atoms · {pct.toFixed(1)}%
                        </div>
                      </div>

                      {/* Solo button */}
                      <button
                        onClick={() => soloAtomType(type)}
                        title="Solo (show only this type)"
                        className="lupine-glass--interactive"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 26, height: 26,
                          background: 'var(--glass-bg-1)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--slate-400)',
                          cursor: 'pointer',
                        }}
                      >
                        <IconTarget />
                      </button>

                      {/* Visibility toggle */}
                      <button
                        onClick={() => toggleAtomType(type)}
                        title={isHidden ? 'Show type' : 'Hide type'}
                        className="lupine-glass--interactive"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28,
                          background: isHidden ? 'var(--glass-bg-1)' : 'rgba(85, 101, 212, 0.1)',
                          border: `1px solid ${isHidden ? 'var(--glass-border)' : 'rgba(85, 101, 212, 0.4)'}`,
                          borderRadius: 'var(--radius-sm)',
                          color: isHidden ? 'var(--slate-500)' : 'var(--lupine-300)',
                          cursor: 'pointer',
                        }}
                      >
                        {isHidden ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>

                    {/* Per-type size slider (only when visible) */}
                    {!isHidden && (
                      <div style={{ marginTop: 12, paddingLeft: 24, paddingRight: 4, paddingBottom: 4 }}>
                         <WaveformSlider
                            label="Specific Size"
                            value={typeScaleValue}
                            min={0.1}
                            max={3.0}
                            step={0.05}
                            format={(v) => v.toFixed(2)}
                            onChange={(val) => setAtomTypeScale(type, val)}
                          />
                      </div>
                    )}
                  </AtomicGlass>
                );
              })}
            </div>
          </QuantumSection>

          {/* ─── Properties ─── */}
          {currentFrame && currentFrame.properties && currentFrame.properties.size > 0 && (
            <QuantumSection label="Available Data Fields" defaultOpen={true}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Array.from(currentFrame.properties.keys()).map(prop => {
                  const vals = currentFrame.properties!.get(prop)!;
                  let min = Infinity, max = -Infinity;
                  for (let i = 0; i < vals.length; i++) {
                    if (vals[i] < min) min = vals[i];
                    if (vals[i] > max) max = vals[i];
                  }
                  return (
                    <AtomicGlass key={prop} level={2} interactive flush style={{ padding: '8px 12px' }} onClick={() => {
                        useStore.getState().setColorMode('property');
                        useStore.getState().setColorProperty(prop);
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--slate-100)', marginBottom: 2 }}>
                        {prop}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--lupine-300)'
                      }}>
                        {min.toFixed(2)} <span style={{ color: 'var(--slate-500)' }}>→</span> {max.toFixed(2)}
                      </div>
                    </AtomicGlass>
                  );
                })}
              </div>
            </QuantumSection>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <AtomicGlass level={1} flush style={{ padding: '10px 14px' }}>
      <div style={{
        fontSize: 10, color: 'var(--slate-500)',
        fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        color: accent ? 'var(--lupine-400)' : 'var(--slate-100)',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </AtomicGlass>
  );
}

function MiniButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        fontSize: 10, fontWeight: 600,
        fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em',
        color: 'var(--lupine-300)',
        background: 'rgba(85, 101, 212, 0.1)',
        border: '1px solid rgba(85, 101, 212, 0.3)',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 100ms ease-out',
      }}
    >
      {label}
    </button>
  );
}
