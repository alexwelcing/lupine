import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { getElementSpec } from '@atlas/core';
import { COLOR_SCHEMES, SCHEME_ORDER } from '../coloring';
import {
  QuantumSection,
  WaveformSlider,
  IsotopeChip,
} from '@lupine/ui';
import { AnimatedOrbitalToggle as OrbitalToggle } from '../rive';

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// ─── Background Presets ───────────────────────────────────────────────
const BG_PRESETS = [
  { id: 'dark', label: 'Dark', top: '#1a1a1f', bottom: '#0a0a0c' },
  { id: 'deep', label: 'Deep Field', top: '#080a14', bottom: '#000000' },
  { id: 'void', label: 'Void', top: '#000000', bottom: '#000000' },
  { id: 'white', label: 'White', top: '#ffffff', bottom: '#f0f0f5' },
  { id: 'blueprint', label: 'Blueprint', top: '#0b162c', bottom: '#050a14' },
];

export function VisualsPanel({ availableProperties }: { availableProperties: string[] }) {
  const {
    // General
    setActivePanel,
    applyVisualProfile,
    activeProfile,
    // Data Rep
    colorMode, setColorMode,
    colorScheme, setColorScheme,
    colorProperty, setColorProperty,
    colormap, setColormap,
    atomScale, setAtomScale,
    showBonds, toggleBonds,
    bondCutoff, setBondCutoff,
    bondColorMode, setBondColorMode,
    useGpuBonds, setUseGpuBonds,
    propertyEmissionStrength, setPropertyEmissionStrength,
    annotations, addAnnotation, removeAnnotation, clearAnnotations,
    labelStyle, setLabelStyle,
    selectedAtoms,
    hiddenAtomTypes, toggleAtomType,
    atomTypeScales, setAtomTypeScale,
    // Materials & Lighting
    materialPreset, setMaterialPreset,
    // atomTexture is exposed under Material & Lighting still — kept for now.
    atomTexture, setAtomTexture,
    environmentPreset, setEnvironmentPreset,
    ambientLightIntensity, setAmbientLightIntensity,
    dirLightIntensity, setDirLightIntensity,
    // Effects
    // Post-process state moved to the Effects ("Look") panel — these
    // destructures are no longer needed by the UI in this file.
    // Context
    backgroundPreset, setBackgroundPreset,
    backgroundVideo, setBackgroundVideo,
    showAxes, toggleAxes,
    showCell, toggleCell,
  } = useStore();

  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const lookPreset = useStore(s => s.postprocessPreset);
  const setLookPreset = useStore(s => s.setPostprocessPreset);

  // Derive system context for recommended settings
  const systemInfo = useMemo(() => {
    if (!file) return null;
    const f = file.trajectory.frames[frame];
    if (!f) return null;

    const gb = file.trajectory.globalBounds;
    let dx = 0, dy = 0, dz = 0;
    if (gb && isFinite(gb.min[0]) && isFinite(gb.max[0])) {
      dx = gb.max[0] - gb.min[0]; dy = gb.max[1] - gb.min[1]; dz = gb.max[2] - gb.min[2];
    } else if (f.boxBounds && f.boxBounds[1] - f.boxBounds[0] > 0) {
      dx = f.boxBounds[1] - f.boxBounds[0]; dy = f.boxBounds[3] - f.boxBounds[2]; dz = f.boxBounds[5] - f.boxBounds[4];
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

    const types = Array.from(counts.entries()).map(([t, count]) => ({
      type: t, count, spec: getElementSpec(t)
    })).sort((a, b) => b.count - a.count);

    return {
      natoms: f.natoms,
      diag: diag > 0 ? diag.toFixed(1) : '—',
      maxDim: Math.max(dx, dy, dz) > 0 ? Math.max(dx, dy, dz).toFixed(1) : '—',
      dominantElement: dominant.symbol,
      suggestedFocus: diag > 0 ? Math.round(diag * 0.5) : 50,
      types,
    };
  }, [file, frame]);

  // (activeEffectsCount removed — post-process is the Effects panel's job.)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0a0c', borderLeft: '1px solid #1f2937',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #1f2937', background: '#121318', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 14, background: '#1edce0' }} />
          <span style={{
            fontSize: 12, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2e8f0',
          }}>
            Visuals & Rendering
          </span>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, background: 'transparent', border: '1px solid #334155',
            borderRadius: 0, color: '#94a3b8', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#1edce0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
        >
          <IconClose />
        </button>
      </div>

      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ═══ Look ═══
              Postprocess preset picker. Each preset is a directorial recipe:
              HDRI + tone curve + a single signature effect (or none, for
              Diagram). Replaces the legacy "Cinematic Profiles" panel which
              mapped to a different abstraction. The legacy applyVisualProfile
              path remains for store consumers; setPostprocessPreset is the
              new canonical knob. */}
          <div style={{ background: '#0d1117', border: '1px solid #1f2937', padding: '16px' }}>
            <h3 style={{
              fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif',
              letterSpacing: '0.05em', color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 12px 0',
            }}>Look</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {([
                { id: 'paper',     label: 'Paper',     signature: 'SSAO',          desc: 'Print-faithful · neutral exposure' },
                { id: 'studio',    label: 'Studio',    signature: 'SSAO + bloom',  desc: 'Balanced default · clean lighting' },
                { id: 'editorial', label: 'Editorial', signature: 'Strong bloom',  desc: 'Moody · for dark slides' },
                { id: 'cinematic', label: 'Cinematic', signature: 'DOF + bloom',   desc: 'Hero shot · sunset HDRI' },
                { id: 'diagram',   label: 'Diagram',   signature: '— none —',      desc: 'Pixel-faithful figure mode' },
              ] as const).map(p => {
                const active = lookPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setLookPreset(p.id)}
                    title={p.desc}
                    style={{
                      padding: '10px 12px',
                      background: active ? '#0c1a2a' : '#121418',
                      border: `1px solid ${active ? '#1edce0' : '#334155'}`,
                      borderRadius: 0, cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1edce0'}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = '#334155'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif',
                        color: '#f8fafc',
                      }}>{p.label}</span>
                      <span style={{ fontSize: 9, color: '#1edce0', fontFamily: 'ui-monospace, monospace' }}>{p.signature}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', lineHeight: '1.4' }}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ Data Representation ═══ */}
          <QuantumSection label="Data Representation" defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              {/* Color scheme — directorial choice. Picks atom color source +
                  mode + bond default in one decision. Property selector and
                  colormap appear below only when relevant to the active scheme. */}
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Color Scheme</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {SCHEME_ORDER.map(id => {
                    const scheme = COLOR_SCHEMES[id];
                    return (
                      <IsotopeChip
                        key={id}
                        label={scheme.label}
                        selected={colorScheme === id}
                        onClick={() => setColorScheme(id)}
                      />
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>
                  {COLOR_SCHEMES[colorScheme].tagline}
                </div>
              </div>

              {/* Property picker — only shown when the active scheme actually
                  uses property data. Hidden otherwise to keep the panel quiet. */}
              {colorScheme === 'property' && availableProperties.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Property</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {availableProperties.map(p => (
                      <IsotopeChip
                        key={p}
                        label={p}
                        selected={colorProperty === p}
                        onClick={() => setColorProperty(p)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Colormap selector — only relevant when the scheme uses one.
                  Element / Botanical / Uniform schemes don't, so we hide it. */}
              {(colorScheme === 'property' || colorScheme === 'family') && (
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Palette</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['viridis', 'inferno', 'coolwarm', 'plasma', 'magma', 'cividis', 'neon', 'sunset', 'vaporwave', 'ocean', 'fire', 'ice', 'forest', 'cyberpunk', 'autumn', 'grayscale', 'turbo'].map(c => (
                      <IsotopeChip key={c} label={c.charAt(0).toUpperCase() + c.slice(1)} selected={colormap === c} onClick={() => setColormap(c as any)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Property emission glow — atoms with high property values
                  emit additional light proportional to their colormap-mapped
                  color. Only shown when property scheme is active (which is
                  the only mode where it has any effect). */}
              {colorScheme === 'property' && (
                <div>
                  <WaveformSlider
                    label="PROPERTY GLOW"
                    value={propertyEmissionStrength}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={setPropertyEmissionStrength}
                    format={v => v.toFixed(2)}
                  />
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                    Hot atoms emit light. 0 = colormap shading only · 1 = strong glow on high-property sites.
                  </div>
                </div>
              )}

              <div>
                <WaveformSlider label="Global Atom Scale" value={atomScale} min={0.1} max={2.0} step={0.05} onChange={setAtomScale} format={v => v.toFixed(2)} />
              </div>

              <div style={{ borderTop: '1px solid #1f2937', paddingTop: 12 }}>
                <OrbitalToggle label="Show Bonds" active={showBonds} onClick={toggleBonds} />
                {showBonds && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <WaveformSlider label="Bond Cutoff (Å)" value={bondCutoff} min={1.0} max={4.0} step={0.1} onChange={setBondCutoff} format={v => v.toFixed(1)} />
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Bond Color Mode</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <IsotopeChip label="Element Type" selected={bondColorMode === 'type'} onClick={() => setBondColorMode('type')} />
                        <IsotopeChip label="Bond Length" selected={bondColorMode === 'length'} onClick={() => setBondColorMode('length')} />
                        <IsotopeChip label="Energy" selected={bondColorMode === 'energy'} onClick={() => setBondColorMode('energy')} />
                        <IsotopeChip label="Screening" selected={bondColorMode === 'screening'} onClick={() => setBondColorMode('screening')} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Compute Backend</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <IsotopeChip label="CPU Worker" selected={!useGpuBonds} onClick={() => setUseGpuBonds(false)} />
                        <IsotopeChip label="WebGPU" selected={useGpuBonds} onClick={() => setUseGpuBonds(true)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {systemInfo && systemInfo.types.length > 0 && (
                <div style={{ borderTop: '1px solid #1f2937', paddingTop: 12 }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Atom Types</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {systemInfo.types.map(t => (
                      <div key={t.type} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', background: '#121418', border: '1px solid #1f2937'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <OrbitalToggle label="" active={!hiddenAtomTypes.has(t.type)} onClick={() => toggleAtomType(t.type)} />
                          <span style={{ color: '#f8fafc', fontSize: 12, fontWeight: 500 }}>{t.spec.symbol}</span>
                          <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono)' }}>({t.count})</span>
                        </div>
                        <input
                          type="range" min="0" max="2" step="0.1"
                          value={atomTypeScales[t.type] ?? 1.0}
                          onChange={(e) => setAtomTypeScale(t.type, parseFloat(e.target.value))}
                          style={{ width: 80 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </QuantumSection>

          {/* ═══ Material & Lighting ═══ */}
          <QuantumSection label="Material & Lighting" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Base Material Override</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['default', 'matte', 'metallic', 'glass', 'plastic'].map(m => (
                    <IsotopeChip key={m} label={m.charAt(0).toUpperCase() + m.slice(1)} selected={materialPreset === m} onClick={() => setMaterialPreset(m as any)} />
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>
                  Default uses per-element identity (Cu metallic, O glass, …). Other presets force one look across all atoms.
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Environment Lighting</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['studio', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'none'].map(e => (
                    <IsotopeChip key={e} label={e.charAt(0).toUpperCase() + e.slice(1)} selected={environmentPreset === e} onClick={() => setEnvironmentPreset(e as any)} />
                  ))}
                </div>
              </div>
              <div>
                <WaveformSlider label="Ambient Light" value={ambientLightIntensity} min={0.0} max={2.0} step={0.05} onChange={setAmbientLightIntensity} format={v => v.toFixed(2)} />
                <div style={{ marginTop: 8 }}>
                  <WaveformSlider label="Directional Light" value={dirLightIntensity} min={0.0} max={3.0} step={0.05} onChange={setDirLightIntensity} format={v => v.toFixed(2)} />
                </div>
              </div>
            </div>
          </QuantumSection>

          {/* Post-processing controls live in the dedicated Effects ("Look")
             panel as a directorial preset gallery. Don't duplicate here. */}

          {/* ═══ Annotations ═══ */}
          <QuantumSection label="Annotations" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                <strong style={{ color: '#cbd5e1' }}>Shift + click</strong> any atom in the scene to add a label.
                Same data renders in four distinct presentation modes — pick one and watch the scene re-flex.
              </div>

              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Label Style</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <IsotopeChip label="Tag" selected={labelStyle === 'tag'} onClick={() => setLabelStyle('tag')} />
                  <IsotopeChip label="Glyph" selected={labelStyle === 'glyph'} onClick={() => setLabelStyle('glyph')} />
                  <IsotopeChip label="Halo" selected={labelStyle === 'halo'} onClick={() => setLabelStyle('halo')} />
                  <IsotopeChip label="Etched" selected={labelStyle === 'etched'} onClick={() => setLabelStyle('etched')} />
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                  {labelStyle === 'tag' && 'Frosted-glass card with leader line. Best for readability.'}
                  {labelStyle === 'glyph' && 'Big, minimal text floating above the atom. Billboarded.'}
                  {labelStyle === 'halo' && 'Text characters orbit the atom in 3D, slowly rotating.'}
                  {labelStyle === 'etched' && 'Subtle inline pin — pairs with shader-side surface engraving.'}
                </div>
              </div>

              {selectedAtoms.length > 0 && (
                <button
                  onClick={() => {
                    const atomIndex = selectedAtoms[0];
                    const text = window.prompt('Annotation text', `atom #${atomIndex}`);
                    if (text && text.trim()) addAnnotation(atomIndex, text.trim());
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #1e3a5f, #2a5080)',
                    border: '1px solid #3a6bb0',
                    borderRadius: 6,
                    color: '#cfe5ff',
                    padding: '8px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Annotate atom #{selectedAtoms[0]}
                </button>
              )}

              {annotations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>{annotations.length} pinned</span>
                    <button
                      onClick={() => clearAnnotations()}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      clear all
                    </button>
                  </div>
                  {annotations.map(ann => (
                    <div
                      key={ann.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 8px',
                        background: 'rgba(30, 41, 59, 0.4)',
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: '#64748b', fontFamily: 'var(--font-mono)', minWidth: 36 }}>#{ann.atomIndex}</span>
                      <span style={{ color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.text}</span>
                      <button
                        onClick={() => removeAnnotation(ann.id)}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>No annotations yet.</div>
              )}
            </div>
          </QuantumSection>

          {/* ═══ Environment ═══ */}
          <QuantumSection label="Environment & Overlays" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Background Preset</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {BG_PRESETS.map(p => (
                    <IsotopeChip key={p.id} label={p.label} selected={backgroundPreset === p.id} onClick={() => setBackgroundPreset(p.id)} />
                  ))}
                  <IsotopeChip label="Custom Video" selected={!!backgroundVideo} onClick={() => {
                    const url = prompt('Enter video URL (mp4/webm):', backgroundVideo || '');
                    if (url !== null) setBackgroundVideo(url || null);
                  }} />
                </div>
              </div>
              <div style={{ borderTop: '1px solid #1f2937', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <OrbitalToggle label="Show Spatial Axes" active={showAxes} onClick={toggleAxes} />
                <OrbitalToggle label="Show Unit Cell Box" active={showCell} onClick={toggleCell} />
              </div>
            </div>
          </QuantumSection>

        </div>
      </div>
    </div>
  );
}
