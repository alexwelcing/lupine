import { useMemo } from 'react';
import { useStore } from '../store';
import {
  QuantumSection,
  AtomicGlass,
  IsotopeChip,
  WaveformSlider
} from '@lupine/ui';
import { getElementSpec, ElementData } from '@atlas/core';

// ─── Icons (0px, sharp geometries) ────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M2 12L12 4l10 8-10 8-10-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconTarget = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <rect x="3" y="3" width="18" height="18" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="12" y1="0" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="24" />
    <line x1="0" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="24" y2="12" />
  </svg>
);

// ─── UI Overrides for Brutalist Aesthetics ────────────────────────────
// By overriding border-radius to 0px, removing drop shadows, and relying on harsh lines,
// we realize "The Precision Instrument" North Star layout.

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

  // Compute per-type statistics and map to chemical data
  const typeStats = useMemo(() => {
    if (!currentFrame) return [];
    const counts = new Map<number, number>();
    for (let i = 0; i < currentFrame.natoms; i++) {
      const t = currentFrame.types[i];
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([type, count]) => {
        const spec = getElementSpec(type);
        return {
          type,
          count,
          pct: (count / currentFrame.natoms * 100),
          ...spec
        };
      });
  }, [currentFrame]);

  // Compute bounding box
  const bbox = useMemo(() => {
    if (!currentFrame?.boxBounds) return null;
    const b = currentFrame.boxBounds;
    return {
      x: (b[1] - b[0]).toFixed(3),
      y: (b[3] - b[2]).toFixed(3),
      z: (b[5] - b[4]).toFixed(3),
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
      background: '#0a0a0c', // Obsidian
      borderLeft: '1px solid #1f2937', 
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #1f2937',
        background: '#121318',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 4, height: 14, borderRadius: 0, // 0px radius!
            background: '#1edce0', // Cyan
          }} />
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#e2e8f0',
          }}>
            Atoms & Elements
          </span>
        </div>
        <button
          onClick={() => useStore.getState().setActivePanel(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24,
            background: 'transparent',
            border: '1px solid #334155',
            borderRadius: 0,
            color: '#94a3b8', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#1edce0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
        >
          <IconClose />
        </button>
      </div>

      {/* ─── Content ─── */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ─── Global Composition Summary ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <DataBlock label="Total Atoms" value={currentFrame ? currentFrame.natoms.toLocaleString() : '—'} />
            <DataBlock label="Visible" value={visibleCount.toLocaleString()} accent={!allVisible} />
            <DataBlock label="Unique Elements" value={typeStats.length.toString()} />
            <DataBlock label="Trajectory Frame" value={`${frame + 1} / ${file?.trajectory.totalFrames ?? 0}`} />
          </div>

          {bbox && (
            <div style={{
              background: '#0d1117',
              border: '1px solid #1f2937',
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              marginTop: 4,
            }}>
              <div style={{ color: '#64748b', letterSpacing: '0.08em', marginBottom: 6 }}>LATTICE BOUNDARIES [Å]</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                <span>X: {bbox.x}</span>
                <span>Y: {bbox.y}</span>
                <span>Z: {bbox.z}</span>
              </div>
            </div>
          )}

          {/* ─── Per-Element Breakdown ─── */}
          <div style={{ marginTop: 8 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8
            }}>
              <h3 style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                color: '#94a3b8', textTransform: 'uppercase', margin: 0
              }}>
                Elemental Composition
              </h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {!allVisible && (
                  <CommandButton label="RESET VISIBILITY" onClick={showAllAtomTypes} />
                )}
                {hasScaleOverrides && (
                  <CommandButton label="RESET SIZES" onClick={resetAtomTypeScales} />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {typeStats.map((stat) => {
                const isHidden = hiddenAtomTypes.has(stat.type);
                const typeScaleValue = atomTypeScales[stat.type] ?? 1.0;

                return (
                  <div key={stat.type} style={{
                    background: isHidden ? '#0a0a0c' : '#121418',
                    border: `1px solid ${isHidden ? '#1e293b' : '#334155'}`,
                    borderLeft: `3px solid ${isHidden ? '#334155' : stat.color}`,
                    padding: '12px',
                    opacity: isHidden ? 0.5 : 1,
                    transition: 'opacity 150ms ease'
                  }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: '#f8fafc' }}>
                            {stat.symbol}
                          </span>
                          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                            {stat.name}
                          </span>
                        </div>
                        
                        {/* Chemical Attributes Row */}
                        <div style={{ 
                          display: 'flex', flexWrap: 'wrap', gap: '8px', 
                          marginTop: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#64748b' 
                        }}>
                          <span>M: {stat.mass.toFixed(2)}</span>
                          <span>|</span>
                          <span>Rc: {stat.radius}Å</span>
                          <span>|</span>
                          <span style={{ color: '#0ea5e9' }}>[{stat.block}-block]</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => soloAtomType(stat.type)}
                          title="Isolate"
                          style={{
                            width: 24, height: 24, background: '#1e293b', border: '1px solid #334155',
                            color: '#94a3b8', cursor: 'pointer', display: 'grid', placeItems: 'center'
                          }}
                        >
                          <IconTarget />
                        </button>
                        <button
                          onClick={() => toggleAtomType(stat.type)}
                          title={isHidden ? 'Show' : 'Hide'}
                          style={{
                            width: 24, height: 24, 
                            background: isHidden ? '#0f172a' : 'rgba(30, 220, 224, 0.1)', 
                            border: `1px solid ${isHidden ? '#334155' : 'rgba(30, 220, 224, 0.3)'}`,
                            color: isHidden ? '#64748b' : '#1edce0', 
                            cursor: 'pointer', display: 'grid', placeItems: 'center'
                          }}
                        >
                          {isHidden ? <IconEyeOff /> : <IconEye />}
                        </button>
                      </div>
                    </div>

                    {/* Stats & Sliders Row */}
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 12 }}>
                      <div style={{ 
                        flexShrink: 0, 
                        fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1edce0' 
                      }}>
                        {stat.pct.toFixed(1)}% <span style={{ color: '#64748b', fontWeight: 400 }}>({stat.count.toLocaleString()})</span>
                      </div>
                      
                      {!isHidden && (
                        <div style={{ flex: 1, paddingLeft: 8, borderLeft: '1px solid #334155' }}>
                          <WaveformSlider
                            label="RADIUS MULTIPLIER"
                            value={typeScaleValue}
                            min={0.1}
                            max={3.0}
                            step={0.05}
                            format={(v) => v.toFixed(2)}
                            onChange={(val) => setAtomTypeScale(stat.type, val)}
                          />
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ height: 4 }} />

          {/* ─── Global Atom Size ─── */}
          <div style={{
              background: '#0d1117', border: '1px solid #1f2937', padding: '12px',
          }}>
            <h3 style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 12px 0'
            }}>
              Global Rendering Scale
            </h3>
            <WaveformSlider
              label="Van der Waals Scaling"
              value={atomScale}
              min={0.1} max={3.0} step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={setAtomScale}
            />
          </div>

          {/* ─── Analyzed Data Fields ─── */}
          {currentFrame && currentFrame.properties && currentFrame.properties.size > 0 && (
            <div style={{ marginTop: 8 }}>
              <h3 style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                  color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px 0'
              }}>
                Analyzed Atomic Properties
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from(currentFrame.properties.keys()).map(prop => {
                  const vals = currentFrame.properties!.get(prop)!;
                  let min = Infinity, max = -Infinity;
                  for (let i = 0; i < vals.length; i++) {
                    if (vals[i] < min) min = vals[i];
                    if (vals[i] > max) max = vals[i];
                  }
                  return (
                    <button 
                      key={prop}
                      onClick={() => {
                        useStore.getState().setColorMode('property');
                        useStore.getState().setColorProperty(prop);
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '10px 12px',
                        background: '#121418', border: '1px solid #334155', borderRadius: 0,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1edce0'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{prop}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#1edce0' }}>
                        {min.toFixed(2)} <span style={{ color: '#475569' }}>→</span> {max.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Technical Subcomponents ──────────────────────────────────────────────

function DataBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1f2937',
      padding: '8px 12px',
    }}>
      <div style={{
        fontSize: 10, color: '#64748b',
        fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: accent ? '#1edce0' : '#f8fafc',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  );
}

function CommandButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px',
        fontSize: 9, fontWeight: 600,
        fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em',
        color: '#94a3b8',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 0,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#1edce0'; e.currentTarget.style.borderColor = '#1edce0'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
    >
      {label}
    </button>
  );
}
