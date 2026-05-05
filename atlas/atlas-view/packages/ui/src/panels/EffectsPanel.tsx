/**
 * EffectsPanel — Rendering & Post-Processing Controls
 *
 * Rebuilt as a precision scientific instrument panel. Every effect is
 * contextualized with its physical meaning in molecular visualization.
 * The panel groups controls into Rendering Presets, Lighting & Depth,
 * Post-Processing, and Tone Mapping — each with scientific rationale.
 */

import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { getElementSpec } from '@atlas/core';
import {
  QuantumSection,
  OrbitalToggle,
  WaveformSlider,
  IsotopeChip,
} from '@lupine/ui';

// ─── Icons (0px radius, precision geometry) ─────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// ─── Rendering Presets ──────────────────────────────────────────────
// These are curated combinations that make scientific sense together.

interface RenderingPreset {
  id: string;
  label: string;
  description: string;
  apply: () => void;
}

function useRenderingPresets(): RenderingPreset[] {
  const store = useStore;
  return useMemo(() => [
    {
      id: 'publication',
      label: 'Publication',
      description: 'Clean SSAO + ACES filmic. No bloom. Optimized for journal-quality figure export with accurate depth cues.',
      apply: () => {
        const s = store.getState();
        if (!s.ssao) s.toggleSSAO();
        s.setSSAOIntensity(0.6);
        if (s.bloom) s.toggleBloom();
        if (s.dof) s.toggleDOF();
        s.setToneMapping('aces');
      },
    },
    {
      id: 'presentation',
      label: 'Presentation',
      description: 'Moderate bloom + strong SSAO. Atoms "glow" under ambient lighting for dark-background slides and posters.',
      apply: () => {
        const s = store.getState();
        if (!s.ssao) s.toggleSSAO();
        s.setSSAOIntensity(0.5);
        if (!s.bloom) s.toggleBloom();
        s.setBloomIntensity(0.4);
        if (s.dof) s.toggleDOF();
        s.setToneMapping('aces');
      },
    },
    {
      id: 'cinematic',
      label: 'Cinematic',
      description: 'Full pipeline: SSAO + Bloom + DOF. Shallow focus isolates structural features while bloom enhances contrast.',
      apply: () => {
        const s = store.getState();
        if (!s.ssao) s.toggleSSAO();
        s.setSSAOIntensity(0.7);
        if (!s.bloom) s.toggleBloom();
        s.setBloomIntensity(0.5);
        if (!s.dof) s.toggleDOF();
        s.setDOFFocus(50);
        s.setToneMapping('aces');
      },
    },
    {
      id: 'raw',
      label: 'Raw Data',
      description: 'All post-processing disabled. Linear color space. Shows atoms as the renderer computes them — useful for debugging.',
      apply: () => {
        const s = store.getState();
        if (s.ssao) s.toggleSSAO();
        if (s.bloom) s.toggleBloom();
        if (s.dof) s.toggleDOF();
        s.setToneMapping('none');
      },
    },
  ], []);
}

export function EffectsPanel() {
  const {
    ssao, ssaoIntensity, bloom, bloomIntensity,
    dof, dofFocus, toneMapping,
    toggleSSAO, toggleBloom, toggleDOF,
    setSSAOIntensity, setBloomIntensity, setDOFFocus,
    setToneMapping, setActivePanel,
  } = useStore();

  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const presets = useRenderingPresets();

  // Compute system size for DOF context
  const systemInfo = useMemo(() => {
    if (!file) return null;
    const f = file.trajectory.frames[frame];
    if (!f) return null;

    // Prefer globalBounds (always computed from atom positions, never NaN)
    // Fall back to boxBounds if available
    const gb = file.trajectory.globalBounds;
    let dx: number, dy: number, dz: number;
    if (gb && isFinite(gb.min[0]) && isFinite(gb.max[0])) {
      dx = gb.max[0] - gb.min[0];
      dy = gb.max[1] - gb.min[1];
      dz = gb.max[2] - gb.min[2];
    } else if (f.boxBounds && f.boxBounds[1] - f.boxBounds[0] > 0) {
      dx = f.boxBounds[1] - f.boxBounds[0];
      dy = f.boxBounds[3] - f.boxBounds[2];
      dz = f.boxBounds[5] - f.boxBounds[4];
    } else {
      dx = dy = dz = 0;
    }
    const diag = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Count unique types and determine dominant element
    const counts = new Map<number, number>();
    for (let i = 0; i < f.natoms; i++) {
      const t = f.types[i];
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let dominantType = 1;
    let maxCount = 0;
    counts.forEach((c, t) => { if (c > maxCount) { maxCount = c; dominantType = t; } });
    const dominant = getElementSpec(dominantType);

    return {
      natoms: f.natoms,
      diag: diag > 0 ? diag.toFixed(1) : '—',
      maxDim: Math.max(dx, dy, dz) > 0 ? Math.max(dx, dy, dz).toFixed(1) : '—',
      dominantElement: dominant.symbol,
      dominantRadius: dominant.radius,
      suggestedFocus: diag > 0 ? Math.round(diag * 0.5) : 50,
      suggestedSSAORadius: Math.min(0.5, dominant.radius * 0.4),
    };
  }, [file, frame]);

  // Active effects count for header badge
  const activeCount = [ssao, bloom, dof, toneMapping !== 'none'].filter(Boolean).length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0a0c',
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
            width: 4, height: 14,
            background: '#1edce0',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#e2e8f0',
          }}>
            Rendering
          </span>
          {activeCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: '#0a0a0c',
              background: '#1edce0',
              padding: '1px 6px',
              marginLeft: 4,
            }}>{activeCount} active</span>
          )}
        </div>
        <button
          onClick={() => setActivePanel(null)}
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

          {/* ═══ Rendering Presets ═══ */}
          <Section title="RENDERING PRESETS">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={p.apply}
                  title={p.description}
                  style={{
                    padding: '10px 12px',
                    background: '#121418',
                    border: '1px solid #334155',
                    borderRadius: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 150ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1edce0'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
                >
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: '#f8fafc',
                    marginBottom: 4,
                  }}>{p.label}</div>
                  <div style={{
                    fontSize: 10, color: '#64748b',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>{p.description}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* ═══ Ambient Occlusion ═══ */}
          <Section title="AMBIENT OCCLUSION">
            <ExpandableDetails>
              Simulates soft shadows in crevices between closely-packed atoms.
              Essential for reading 3D structure from 2D projections.
              {systemInfo && (
                <span style={{ color: '#0ea5e9' }}>
                  {' '}Recommended for {systemInfo.dominantElement}-dominant lattice
                  (r<sub>cov</sub> = {systemInfo.dominantRadius}Å).
                </span>
              )}
            </ExpandableDetails>
            <ToggleRow
              label="Screen-Space AO"
              active={ssao}
              onToggle={toggleSSAO}
            />
            {ssao && (
              <div style={{ marginTop: 8 }}>
                <WaveformSlider
                  label="OCCLUSION INTENSITY"
                  value={ssaoIntensity}
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={setSSAOIntensity}
                />
                <div style={{
                  fontSize: 9, color: '#475569', marginTop: 4,
                  fontFamily: 'var(--font-mono)',
                }}>
                  Low (0.1–0.3): subtle depth · Med (0.4–0.8): structural clarity · High (1.0+): dramatic
                </div>
              </div>
            )}
          </Section>

          {/* ═══ Bloom ═══ */}
          <Section title="EMISSION BLOOM">
            <ExpandableDetails>
              Adds luminous halos around bright atoms. Useful for highlighting
              high-energy sites, emissive dopants, or atoms with extreme property values.
            </ExpandableDetails>
            <ToggleRow
              label="Bloom Filter"
              active={bloom}
              onToggle={toggleBloom}
            />
            {bloom && (
              <div style={{ marginTop: 8 }}>
                <WaveformSlider
                  label="BLOOM INTENSITY"
                  value={bloomIntensity}
                  min={0.05}
                  max={1.5}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={setBloomIntensity}
                />
                <div style={{
                  fontSize: 9, color: '#475569', marginTop: 4,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {"<"}0.3: publication safe · 0.3–0.7: presentation · {">"}0.7: cinematic
                </div>
              </div>
            )}
          </Section>

          {/* ═══ Depth of Field ═══ */}
          <Section title="DEPTH OF FIELD">
            <ExpandableDetails>
              Optical blur simulates focal depth to isolate crystallographic planes
              or surface features. Focus distance is measured from camera origin.
              {systemInfo && (
                <span style={{ color: '#0ea5e9' }}>
                  {' '}System diagonal: {systemInfo.diag}Å — suggested focus: ~{systemInfo.suggestedFocus}Å.
                </span>
              )}
            </ExpandableDetails>
            <ToggleRow
              label="Depth Blur"
              active={dof}
              onToggle={toggleDOF}
            />
            {dof && (
              <div style={{ marginTop: 8 }}>
                <WaveformSlider
                  label="FOCUS DISTANCE"
                  value={dofFocus}
                  min={1}
                  max={200}
                  step={1}
                  format={(v) => `${v.toFixed(0)}Å`}
                  onChange={setDOFFocus}
                />
              </div>
            )}
          </Section>

          {/* ═══ Tone Mapping ═══ */}
          <Section title="TONE MAPPING">
            <ExpandableDetails>
              Controls how HDR radiance values are compressed to display range.
              ACES preserves highlight rolloff (recommended for figures).
              Reinhard maximizes brightness.
            </ExpandableDetails>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { id: 'none' as const, label: 'Linear', desc: 'Raw HDR values, no compression' },
                { id: 'aces' as const, label: 'ACES Filmic', desc: 'Academy standard, highlight rolloff' },
                { id: 'reinhard' as const, label: 'Reinhard', desc: 'Simple luminance mapping' },
              ]).map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setToneMapping(mode.id)}
                  title={mode.desc}
                  style={{
                    flex: 1, padding: '8px 6px',
                    background: toneMapping === mode.id ? 'rgba(30, 220, 224, 0.1)' : '#121418',
                    border: `1px solid ${toneMapping === mode.id ? 'rgba(30, 220, 224, 0.4)' : '#334155'}`,
                    borderRadius: 0,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 150ms',
                  }}
                >
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: toneMapping === mode.id ? '#1edce0' : '#94a3b8',
                  }}>{mode.label}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* ═══ System Context ═══ */}
          {systemInfo && (
            <div style={{
              background: '#0d1117',
              border: '1px solid #1f2937',
              padding: '12px',
              marginTop: 4,
            }}>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em', color: '#64748b',
                textTransform: 'uppercase', marginBottom: 8,
              }}>
                SYSTEM CONTEXT
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                fontSize: 11, fontFamily: 'var(--font-mono)',
              }}>
                <div>
                  <span style={{ color: '#64748b' }}>Atoms: </span>
                  <span style={{ color: '#f8fafc' }}>{systemInfo.natoms.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Diagonal: </span>
                  <span style={{ color: '#f8fafc' }}>{systemInfo.diag}Å</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Max Dim: </span>
                  <span style={{ color: '#f8fafc' }}>{systemInfo.maxDim}Å</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Primary: </span>
                  <span style={{ color: '#1edce0' }}>{systemInfo.dominantElement}</span>
                </div>
              </div>
              <div style={{
                fontSize: 9, color: '#475569', marginTop: 8,
                fontFamily: 'var(--font-mono)', lineHeight: '1.4',
              }}>
                These values are derived from the loaded trajectory and inform
                recommended effect parameters (e.g., DOF focus, AO radius scaling).
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1f2937',
      padding: '16px',
    }}>
      <h3 style={{
        fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif',
        letterSpacing: '0.05em', color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 12px 0',
      }}>{title}</h3>
      {children}
    </div>
  );
}

function ExpandableDetails({ summary, children }: { summary?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: '#1edce0', fontSize: 10, fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}
      >
        <svg 
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
        >
          <path d="M9 18l6-6-6-6"/>
        </svg>
        {open ? 'Hide details' : (summary || 'Show details')}
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          background: 'rgba(30, 220, 224, 0.05)',
          borderLeft: '2px solid rgba(30, 220, 224, 0.3)',
          fontSize: 12, color: '#94a3b8', lineHeight: '1.5',
          fontFamily: 'Space Grotesk, sans-serif',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '8px 10px',
        background: active ? 'rgba(30, 220, 224, 0.06)' : '#121418',
        border: `1px solid ${active ? 'rgba(30, 220, 224, 0.25)' : '#334155'}`,
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      <span style={{
        fontSize: 12, fontWeight: 500,
        fontFamily: 'Space Grotesk, sans-serif',
        color: active ? '#e2e8f0' : '#94a3b8',
      }}>{label}</span>
      <div style={{
        width: 32, height: 16,
        background: active ? '#1edce0' : '#334155',
        position: 'relative',
        transition: 'background 200ms',
      }}>
        <div style={{
          width: 12, height: 12,
          background: active ? '#0a0a0c' : '#64748b',
          position: 'absolute',
          top: 2,
          left: active ? 18 : 2,
          transition: 'left 200ms, background 200ms',
        }} />
      </div>
    </button>
  );
}
