/**
 * EffectsPanel — directorial postprocess controls.
 *
 * Picks one of five looks (paper / studio / editorial / cinematic / diagram)
 * and tunes intensity. Individual effect knobs live under "Advanced" for
 * the rare moments you need them, but the primary UX is a single coherent
 * decision: what should the scene feel like?
 */

import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { getElementSpec } from '@atlas/core';
import { WaveformSlider } from '@lupine/ui';
import { POSTPROCESS_PRESETS, PRESET_ORDER, type PostprocessPresetId } from '../postprocess/presets';

const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const PERF_TIER_COLOR: Record<'fast' | 'balanced' | 'heavy', string> = {
  fast: '#34d399',     // green
  balanced: '#fbbf24', // amber
  heavy: '#f87171',    // red
};

const PERF_TIER_LABEL: Record<'fast' | 'balanced' | 'heavy', string> = {
  fast: 'FAST',
  balanced: 'BALANCED',
  heavy: 'HEAVY',
};

export function EffectsPanel() {
  const presetId = useStore(s => s.postprocessPreset);
  const intensity = useStore(s => s.postprocessIntensity);
  const setPreset = useStore(s => s.setPostprocessPreset);
  const setIntensity = useStore(s => s.setPostprocessIntensity);
  const autoDof = useStore(s => s.autoDepthOfField);
  const toggleAutoDof = useStore(s => s.toggleAutoDOF);
  const toneMapping = useStore(s => s.toneMapping);
  const setToneMapping = useStore(s => s.setToneMapping);
  const setActivePanel = useStore(s => s.setActivePanel);

  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const activePreset = POSTPROCESS_PRESETS[presetId];
  const usesDof = activePreset.dof.enabled;

  const systemInfo = useMemo(() => {
    if (!file) return null;
    const f = file.trajectory.frames[frame];
    if (!f) return null;
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
    };
  }, [file, frame]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0a0c',
      borderLeft: '1px solid #1f2937',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #1f2937',
        background: '#121318',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 14, background: '#1edce0' }} />
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: '#e2e8f0',
          }}>
            Look
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: '#0a0a0c',
            background: '#1edce0',
            padding: '1px 6px',
            marginLeft: 4,
          }}>{activePreset.label.toUpperCase()}</span>
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

      {/* Content */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Preset gallery */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PRESET_ORDER.map(id => (
              <PresetCard
                key={id}
                preset={POSTPROCESS_PRESETS[id]}
                active={id === presetId}
                onClick={() => setPreset(id)}
              />
            ))}
          </div>

          {/* Intensity */}
          <div style={{
            background: '#0d1117',
            border: '1px solid #1f2937',
            padding: '14px 16px',
          }}>
            <WaveformSlider
              label="INTENSITY"
              value={intensity}
              min={0}
              max={2}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={setIntensity}
            />
            <div style={{
              fontSize: 9, color: '#475569', marginTop: 6,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
            }}>
              0 disables effects · 1 = preset baseline · 2 = over-driven
            </div>
          </div>

          {/* Auto-focus DOF — only meaningful when the active preset uses DOF */}
          {usesDof && (
            <div style={{
              background: '#0d1117',
              border: '1px solid #1f2937',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  fontFamily: 'Space Grotesk, sans-serif',
                  color: '#e2e8f0', marginBottom: 2,
                }}>Auto-focus on orbit target</div>
                <div style={{
                  fontSize: 9, color: '#64748b',
                  fontFamily: 'var(--font-mono)',
                }}>Tracks camera distance for cinematic shallow focus.</div>
              </div>
              <Toggle active={autoDof} onClick={toggleAutoDof} />
            </div>
          )}

          {/* Advanced */}
          <div style={{ background: '#0d1117', border: '1px solid #1f2937' }}>
            <button
              onClick={() => setAdvancedOpen(v => !v)}
              style={{
                width: '100%',
                background: 'transparent', border: 'none',
                padding: '10px 16px',
                color: '#94a3b8',
                fontSize: 11, fontWeight: 600,
                fontFamily: 'Space Grotesk, sans-serif',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>ADVANCED</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: advancedOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
              >
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
            {advancedOpen && (
              <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{
                    fontSize: 9, fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.08em', color: '#64748b',
                    textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    Tone Mapping
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {([
                      { id: 'aces' as const, label: 'ACES' },
                      { id: 'reinhard' as const, label: 'Reinhard' },
                      { id: 'none' as const, label: 'Linear' },
                    ]).map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setToneMapping(mode.id)}
                        style={{
                          flex: 1, padding: '6px 4px',
                          background: toneMapping === mode.id ? 'rgba(30, 220, 224, 0.1)' : '#121418',
                          border: `1px solid ${toneMapping === mode.id ? 'rgba(30, 220, 224, 0.4)' : '#334155'}`,
                          borderRadius: 0, cursor: 'pointer',
                          fontSize: 10, fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
                          color: toneMapping === mode.id ? '#1edce0' : '#94a3b8',
                        }}
                      >{mode.label}</button>
                    ))}
                  </div>
                  <div style={{
                    fontSize: 9, color: '#475569', marginTop: 6,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    Override the active preset's tone mapping. Cheap; safe to change anytime.
                  </div>
                </div>
                <div style={{
                  fontSize: 10, color: '#64748b', lineHeight: '1.5',
                  fontFamily: 'Space Grotesk, sans-serif',
                  borderTop: '1px solid #1f2937', paddingTop: 10,
                }}>
                  Per-effect overrides (SSAO radius, bloom threshold, vignette
                  darkness) are intentionally hidden — they thrash the visual
                  language without improving it. If you need them, edit
                  <code style={{ color: '#1edce0', fontFamily: 'var(--font-mono)', padding: '0 4px' }}>postprocess/presets.ts</code>
                  and create a new preset.
                </div>
              </div>
            )}
          </div>

          {/* System context */}
          {systemInfo && (
            <div style={{
              background: '#0d1117',
              border: '1px solid #1f2937',
              padding: '12px 16px',
            }}>
              <div style={{
                fontSize: 10, fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em', color: '#64748b',
                textTransform: 'uppercase', marginBottom: 8,
              }}>
                SYSTEM
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
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
                  <span style={{ color: '#64748b' }}>Max dim: </span>
                  <span style={{ color: '#f8fafc' }}>{systemInfo.maxDim}Å</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Primary: </span>
                  <span style={{ color: '#1edce0' }}>{systemInfo.dominantElement}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  active,
  onClick,
}: {
  preset: typeof POSTPROCESS_PRESETS[PostprocessPresetId];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column',
        textAlign: 'left',
        padding: '12px 14px',
        background: active ? 'rgba(30, 220, 224, 0.08)' : '#121418',
        border: `1px solid ${active ? 'rgba(30, 220, 224, 0.5)' : '#334155'}`,
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = '#475569'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = '#334155'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          fontSize: 13, fontWeight: 700,
          fontFamily: 'Space Grotesk, sans-serif',
          color: active ? '#1edce0' : '#f8fafc',
          letterSpacing: '0.02em',
        }}>{preset.label}</span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 9, fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          color: PERF_TIER_COLOR[preset.performanceTier],
          letterSpacing: '0.06em',
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6,
            background: PERF_TIER_COLOR[preset.performanceTier],
            borderRadius: '50%',
          }} />
          {PERF_TIER_LABEL[preset.performanceTier]}
        </span>
      </div>
      <div style={{
        fontSize: 11, color: '#94a3b8',
        fontFamily: 'Space Grotesk, sans-serif',
        lineHeight: '1.4',
      }}>{preset.tagline}</div>
    </button>
  );
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32, height: 16,
        background: active ? '#1edce0' : '#334155',
        border: 'none', borderRadius: 0,
        position: 'relative', cursor: 'pointer',
        transition: 'background 200ms',
      }}
    >
      <div style={{
        width: 12, height: 12,
        background: active ? '#0a0a0c' : '#64748b',
        position: 'absolute',
        top: 2,
        left: active ? 18 : 2,
        transition: 'left 200ms, background 200ms',
      }} />
    </button>
  );
}
