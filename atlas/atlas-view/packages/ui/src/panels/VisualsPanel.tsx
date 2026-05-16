import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { getElementSpec } from '@atlas/core';
import { COLOR_SCHEMES, SCHEME_ORDER } from '../coloring';
import {
  QuantumSection,
  WaveformSlider,
  IsotopeChip,
  OrbitalToggle,
} from '@lupine/ui';
import { Slider } from '../controls';
import { MATERIAL_SCENES, type MaterialScene } from '@atlas/scene/materials';
import { TrackballPanner, ScrubbableNumber, RotaryKnob, ProColorSwatch } from './ProControls';

// ─── Material Scene Card ──────────────────────────────────────────────
function MaterialSceneCard({ scene, active, onClick }: { scene: MaterialScene, active: boolean, onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const snapshotUrl = `/gallery/snapshots/scene_${scene.id}.jpg`;

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => {
        // Dev utility: right-click to take a snapshot of this preset
        e.preventDefault();
        const state = useStore.getState();
        state.triggerExport({
          type: 'image',
          resolution: { width: 140, height: 128 },
          format: 'jpeg',
          baseName: `scene_${scene.id}`,
        });
      }}
      title="Left-click to apply. Right-click to generate snapshot."
      style={{
        position: 'relative',
        flex: '1 1 calc(25% - 6px)',
        minWidth: 70,
        height: 64,
        background: scene.cardGradient,
        borderRadius: 8,
        border: `1px solid ${active ? scene.accentColor : '#334155'}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: active ? `0 0 16px ${scene.accentColor}40, inset 0 0 8px ${scene.accentColor}20` : 'none',
      }}
    >
      {!imgError && (
        <img
          src={snapshotUrl}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: active ? 1 : 0.4,
            transition: 'opacity 0.2s', zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      )}
      <div style={{ zIndex: 1, position: 'relative', fontSize: 20, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{scene.icon}</div>
      <div style={{ zIndex: 1, position: 'relative', fontSize: 10, fontWeight: 600, color: active ? '#fff' : '#94a3b8', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
        {scene.label}
      </div>
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: scene.accentColor,
          boxShadow: `0 0 8px ${scene.accentColor}`,
          zIndex: 2
        }} />
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// ─── Background Presets ───────────────────────────────────────────────
const BG_GRADIENT_PRESETS = [
  { id: 'dark', label: 'Dark', top: '#1a1a1f', bottom: '#0a0a0c' },
  { id: 'deep', label: 'Deep Field', top: '#080a14', bottom: '#000000' },
  { id: 'void', label: 'Void', top: '#000000', bottom: '#000000' },
  { id: 'white', label: 'White', top: '#ffffff', bottom: '#f0f0f5' },
  { id: 'blueprint', label: 'Blueprint', top: '#0b162c', bottom: '#050a14' },
  { id: 'midnight', label: 'Midnight', top: '#080c18', bottom: '#141e38' },
  { id: 'studio', label: 'Studio', top: '#1a1a2e', bottom: '#16213e' },
  { id: 'warm', label: 'Warm Dark', top: '#1a100c', bottom: '#0d0906' },
  { id: 'fog', label: 'Fog', top: '#101418', bottom: '#1c2028' },
];

const BG_TEXTURE_CATEGORIES = [
  { label: 'Cosmic', presets: [
    { id: 'nebula',         label: 'Nebula',        image: '/backgrounds/bg_nebula_indigo.jpg' },
    { id: 'aurora',         label: 'Aurora',        image: '/backgrounds/bg_aurora_teal.jpg' },
    { id: 'plasma-smoke',   label: 'Plasma Smoke',  image: '/backgrounds/bg_plasma_smoke.jpg' },
    { id: 'starfield',      label: 'Starfield',     image: '/backgrounds/bg_deep_starfield.jpg' },
    { id: 'spacetime',      label: 'Spacetime',     image: '/backgrounds/bg_spacetime.jpg' },
  ]},
  { label: 'Material', presets: [
    { id: 'copper',         label: 'Copper',        image: '/backgrounds/bg_copper_shimmer.jpg' },
    { id: 'crystal',        label: 'Crystal Ice',   image: '/backgrounds/bg_crystal_ice.jpg' },
    { id: 'volcanic',       label: 'Volcanic',      image: '/backgrounds/bg_volcanic_ember.jpg' },
    { id: 'rose-gold',      label: 'Rose Gold',     image: '/backgrounds/bg_rose_gold.jpg' },
    { id: 'iridescent',     label: 'Iridescent',    image: '/backgrounds/bg_iridescent.jpg' },
  ]},
  { label: 'Lab', presets: [
    { id: 'phosphor',       label: 'Phosphor',      image: '/backgrounds/bg_phosphor_screen.jpg' },
    { id: 'plasma-arc',     label: 'Plasma Arc',    image: '/backgrounds/bg_plasma_discharge.jpg' },
    { id: 'circuit',        label: 'Circuit',       image: '/backgrounds/bg_circuit_trace.jpg' },
    { id: 'hex-lattice',    label: 'Hex Lattice',   image: '/backgrounds/bg_hex_lattice.jpg' },
  ]},
  { label: 'Studio', presets: [
    { id: 'navy-grad',      label: 'Navy',          image: '/backgrounds/bg_navy_gradient.jpg' },
    { id: 'marble',         label: 'Marble',        image: '/backgrounds/bg_white_marble.jpg' },
    { id: 'cream',          label: 'Cream',         image: '/backgrounds/bg_warm_cream.jpg' },
    { id: 'concrete',       label: 'Concrete',      image: '/backgrounds/bg_studio_concrete.jpg' },
    { id: 'lavender',       label: 'Lavender',      image: '/backgrounds/bg_lavender.jpg' },
  ]},
  { label: 'Environment', presets: [
    { id: 'bioluminescent', label: 'Bioluminescent', image: '/backgrounds/bg_bioluminescent.jpg' },
    { id: 'cellular',       label: 'Cellular',      image: '/backgrounds/bg_cellular.jpg' },
    { id: 'arctic',         label: 'Arctic',        image: '/backgrounds/bg_arctic_terrain.jpg' },
    { id: 'ocean',          label: 'Deep Ocean',    image: '/backgrounds/bg_deep_ocean.jpg' },
    { id: 'topographic',    label: 'Topographic',   image: '/backgrounds/bg_topographic.jpg' },
  ]},
];

// Backwards-compat flat list for the gradient chips
const BG_PRESETS = BG_GRADIENT_PRESETS;


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
    bondTolerance, setBondTolerance,
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
    materialScene, applyMaterialScene,
    materialIntensity, setMaterialIntensity,
    surfaceRoughness, setSurfaceRoughness,
    surfacePolish, setSurfacePolish,
    surfaceClearcoat, setSurfaceClearcoat,
    atomTexture, setAtomTexture,
    environmentPreset, setEnvironmentPreset,
    ambientLightIntensity, setAmbientLightIntensity,
    dirLightIntensity, setDirLightIntensity,
    rimLightIntensity, setRimLightIntensity,
    keyLightAzimuth, setKeyLightAzimuth,
    keyLightElevation, setKeyLightElevation,
    fillLightAzimuth, setFillLightAzimuth,
    fillLightElevation, setFillLightElevation,
    rimLightAzimuth, setRimLightAzimuth,
    rimLightElevation, setRimLightElevation,
    fillLightColor, setFillLightColor,
    rimLightColor, setRimLightColor,
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

  const [presetToken, setPresetToken] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);

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

          {/* Look-Dev Preset System */}
          <QuantumSection label="Look-Dev Configuration" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                Export your current visual state as a compact token, or paste a token to restore a Laboratory look.
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={presetToken}
                  onChange={e => setPresetToken(e.target.value)}
                  placeholder="Paste preset token..."
                  style={{
                    flex: 1,
                    background: '#0d1117',
                    border: '1px solid #1f2937',
                    color: '#f8fafc',
                    padding: '6px 8px',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => {
                    if (presetToken) {
                      useStore.getState().decodeFromURL(presetToken);
                      setPresetToken('');
                    }
                  }}
                  style={{
                    background: '#1edce020',
                    color: '#1edce0',
                    border: '1px solid #1edce040',
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  Load
                </button>
                <button
                  onClick={() => {
                    const token = useStore.getState().encodeToURL();
                    navigator.clipboard.writeText(token);
                    setTokenCopied(true);
                    setTimeout(() => setTokenCopied(false), 2000);
                  }}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: '1px solid #475569',
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {tokenCopied ? 'Copied' : 'Export'}
                </button>
              </div>
            </div>
          </QuantumSection>

          {/* ═══ Look ═══ */}
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
                const snapshotUrl = `/gallery/snapshots/look_${p.id}.jpg`;
                return (
                  <button
                    key={p.id}
                    onClick={() => setLookPreset(p.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const state = useStore.getState();
                      // Force apply the preset first
                      setLookPreset(p.id);
                      
                      // Wait a beat for the render, then capture and upload
                      setTimeout(() => {
                        state.triggerExport({
                          type: 'image',
                          resolution: { width: 320, height: 160 },
                          format: 'jpeg',
                          baseName: `look_${p.id}`,
                          onComplete: async (success, blob) => {
                            if (success && blob) {
                              const form = new FormData();
                              form.append('id', `look_${p.id}`);
                              form.append('type', 'snapshot');
                              form.append('file', blob, `look_${p.id}.jpg`);
                              try {
                                const res = await fetch('/api/gallery-assets/upload', { method: 'POST', body: form });
                                if (res.ok) console.log(`✓ Snapshot generated: look_${p.id}.jpg`);
                              } catch (err) {
                                console.error('Failed to upload snapshot:', err);
                              }
                            }
                          }
                        });
                      }, 250);
                    }}
                    title={p.desc}
                    style={{
                      position: 'relative',
                      padding: '10px 12px',
                      background: active ? '#0c1a2a' : '#121418',
                      border: `1px solid ${active ? '#1edce0' : '#334155'}`,
                      borderRadius: 4, cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms',
                      overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1edce0'}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = '#334155'; }}
                  >
                    <img 
                      src={snapshotUrl} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        objectFit: 'cover', opacity: active ? 0.8 : 0.2, zIndex: 0, pointerEvents: 'none',
                        transition: 'opacity 0.2s'
                      }}
                    />
                    <div style={{ zIndex: 1, position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif',
                        color: active ? '#fff' : '#f8fafc', textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                      }}>{p.label}</span>
                      <span style={{ fontSize: 9, color: active ? '#1edce0' : '#94a3b8', fontFamily: 'ui-monospace, monospace', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{p.signature}</span>
                    </div>
                    <div style={{ zIndex: 1, position: 'relative', fontSize: 10, color: active ? '#cbd5e1' : '#64748b', lineHeight: '1.4', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{p.desc}</div>
                    {active && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: '#1edce0', boxShadow: '0 0 8px #1edce0', zIndex: 2
                      }} />
                    )}
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
                    <WaveformSlider label="Bond Tolerance (Å)" value={bondTolerance} min={0.0} max={1.5} step={0.05} onChange={setBondTolerance} format={v => v.toFixed(2)} />
                    <BondCutoffReadout tolerance={bondTolerance} />
                    {/* Slider is now the tolerance knob: every per-pair
                        cutoff is r_cov(A)+r_cov(B)+tolerance. The hard
                        upper cap (formerly the slider value) auto-derives
                        from the largest covalent pair in the loaded file. */}
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
                        <div style={{ width: 80 }}>
                          <Slider
                            min={0} max={2} step={0.1}
                            value={atomTypeScales[t.type] ?? 1.0}
                            onChange={(e) => setAtomTypeScale(t.type, parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </QuantumSection>

          {/* ═══ Material & Lighting ═══ */}
          <QuantumSection label="Material Lab" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 12 }}>
              
              {/* Material Scenes */}
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Material Scene</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {MATERIAL_SCENES.map(scene => (
                    <MaterialSceneCard
                      key={scene.id}
                      scene={scene}
                      active={materialScene === scene.id}
                      onClick={() => applyMaterialScene(scene.id)}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>
                  {MATERIAL_SCENES.find(s => s.id === materialScene)?.description}
                </div>
              </div>

              {/* Surface Character */}
              <div style={{ padding: '12px', background: '#0a0d14', borderRadius: 8, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Surface Character
                  </div>
                  {(surfaceRoughness !== 0 || surfacePolish !== 0 || surfaceClearcoat !== 0) && (
                    <button
                      onClick={() => {
                        setSurfaceRoughness(0);
                        setSurfacePolish(0);
                        setSurfaceClearcoat(0);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid #334155',
                        borderRadius: 4,
                        color: '#94a3b8',
                        fontSize: 9,
                        padding: '2px 6px',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#64748b'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
                    >
                      Reset to Scene
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <WaveformSlider 
                    label="Element Identity" 
                    value={1.0 - materialIntensity} 
                    min={0.0} max={1.0} step={0.05} 
                    onChange={v => setMaterialIntensity(1.0 - v)} 
                    format={v => Math.round(v * 100) + '%'} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', marginTop: -8 }}>
                    <span>Global Preset</span>
                    <span>Per-Element</span>
                  </div>
                  
                  {/* Granular Surface Tuning */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, padding: '16px 12px', background: '#121318', borderRadius: 6, border: '1px solid #1e293b' }}>
                    <RotaryKnob 
                      label="Roughness" 
                      value={surfaceRoughness} 
                      min={-1.0} max={1.0} step={0.05} 
                      fractionDigits={2}
                      onChange={setSurfaceRoughness} 
                    />
                    <RotaryKnob 
                      label="Polish" 
                      value={surfacePolish} 
                      min={-1.0} max={1.0} step={0.05} 
                      fractionDigits={2}
                      onChange={setSurfacePolish} 
                    />
                    <RotaryKnob 
                      label="Clearcoat" 
                      value={surfaceClearcoat} 
                      min={0.0} max={1.0} step={0.05} 
                      fractionDigits={2}
                      onChange={setSurfaceClearcoat} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    <IsotopeChip label="Glass" selected={materialPreset === 'glass'} onClick={() => setMaterialPreset('glass')} />
                    <IsotopeChip label="Plastic" selected={materialPreset === 'plastic'} onClick={() => setMaterialPreset('plastic')} />
                    <IsotopeChip label="Default" selected={materialPreset === 'default'} onClick={() => setMaterialPreset('default')} />
                  </div>
                </div>
              </div>

              {/* Light Rig */}
              <div style={{ padding: '16px', background: '#0a0d14', borderRadius: 8, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 6 }}>highlight</span>
                    STUDIO LIGHTING RIG
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase' }}>3-Point System</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {/* Key Light */}
                  <div style={{ padding: '12px', background: '#121318', borderRadius: 6, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#f8fafc', fontWeight: 600 }}>KEY</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', background: '#050608', borderRadius: 4, border: '1px inset #222', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                      <TrackballPanner azimuth={keyLightAzimuth} elevation={keyLightElevation} size={80} onChange={(az, el) => { setKeyLightAzimuth(az); setKeyLightElevation(el); }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <RotaryKnob label="Intensity" value={dirLightIntensity} min={0.0} max={5.0} step={0.05} fractionDigits={2} size={48} onChange={setDirLightIntensity} />
                    </div>
                  </div>

                  {/* Fill Light */}
                  <div style={{ padding: '12px', background: '#121318', borderRadius: 6, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#f8fafc', fontWeight: 600 }}>FILL</span>
                      <ProColorSwatch color={fillLightColor} onChange={setFillLightColor} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', background: '#050608', borderRadius: 4, border: '1px inset #222', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                      <TrackballPanner azimuth={fillLightAzimuth} elevation={fillLightElevation} size={80} onChange={(az, el) => { setFillLightAzimuth(az); setFillLightElevation(el); }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <RotaryKnob label="Intensity" value={ambientLightIntensity} min={0.0} max={5.0} step={0.05} fractionDigits={2} size={48} onChange={setAmbientLightIntensity} />
                    </div>
                  </div>

                  {/* Rim Light */}
                  <div style={{ padding: '12px', background: '#121318', borderRadius: 6, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#f8fafc', fontWeight: 600 }}>RIM</span>
                      <ProColorSwatch color={rimLightColor} onChange={setRimLightColor} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', background: '#050608', borderRadius: 4, border: '1px inset #222', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                      <TrackballPanner azimuth={rimLightAzimuth} elevation={rimLightElevation} size={80} onChange={(az, el) => { setRimLightAzimuth(az); setRimLightElevation(el); }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <RotaryKnob label="Intensity" value={rimLightIntensity} min={0.0} max={5.0} step={0.05} fractionDigits={2} size={48} onChange={setRimLightIntensity} />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>Environment Map</div>
                  <select
                    value={environmentPreset}
                    onChange={e => setEnvironmentPreset(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: '#121824',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: 4,
                      padding: '6px 8px',
                      fontSize: 11,
                      outline: 'none'
                    }}
                  >
                    <option value="studio">Studio (Neutral)</option>
                    <option value="apartment">Apartment (Warm)</option>
                    <option value="warehouse">Warehouse (Industrial)</option>
                    <option value="city">City (Cool)</option>
                    <option value="dawn">Dawn (Soft)</option>
                    <option value="night">Night (Dark)</option>
                    <option value="forest">Forest (Organic)</option>
                    <option value="none">None (Direct Only)</option>
                  </select>
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
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Gradient Presets</div>
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
              {/* ── Texture Backgrounds ── */}
              {BG_TEXTURE_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginTop: 4, letterSpacing: '0.05em' }}>
                    {cat.label} Textures
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                    {cat.presets.map(p => {
                      const active = backgroundPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setBackgroundPreset(p.id)}
                          title={p.label}
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '1',
                            border: `2px solid ${active ? '#1edce0' : '#1f2937'}`,
                            borderRadius: 4,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            padding: 0,
                            background: '#0a0a0c',
                            transition: 'border-color 150ms, box-shadow 150ms',
                            boxShadow: active ? '0 0 8px rgba(30, 220, 224, 0.3)' : 'none',
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#1edce060'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#1f2937'; }}
                        >
                          <img
                            src={p.image}
                            alt={p.label}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              opacity: active ? 1 : 0.7,
                              transition: 'opacity 200ms',
                            }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '2px 4px',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                            fontSize: 8,
                            fontWeight: 600,
                            fontFamily: 'Space Grotesk, sans-serif',
                            color: active ? '#1edce0' : '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'center',
                            lineHeight: '14px',
                          }}>
                            {p.label}
                          </div>
                          {active && (
                            <div style={{
                              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                              background: '#1edce0', boxShadow: '0 0 6px #1edce0',
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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

/**
 * Active per-pair cutoff readout — surfaces the math the slider drives so
 * the user can see the link between "tolerance" and the bond cutoffs that
 * actually fire. Walks the unique types in the current frame, computes
 * cutoff = r_cov(A) + r_cov(B) + tolerance for every pair, and shows
 * the min/max range. Two-element systems also render the single pair
 * inline (e.g., "C–C: 1.97 Å") so common materials read clearly.
 */
function BondCutoffReadout({ tolerance }: { tolerance: number }) {
  const file = useStore(s => s.file);
  const frameIdx = useStore(s => s.frame);

  const info = useMemo(() => {
    if (!file) return null;
    const f = file.trajectory.frames[frameIdx];
    if (!f) return null;

    const seen = new Set<number>();
    for (let i = 0; i < f.natoms; i++) seen.add(f.types[i]);
    const types = Array.from(seen);
    if (types.length === 0) return null;

    const radii = types.map((t) => ({ t, sym: getElementSpec(t).symbol, r: getElementSpec(t).radius }));
    const pairs: Array<{ key: string; cutoff: number }> = [];
    for (let i = 0; i < radii.length; i++) {
      for (let j = i; j < radii.length; j++) {
        const a = radii[i]; const b = radii[j];
        const cutoff = a.r + b.r + tolerance;
        const key = a.t <= b.t ? `${a.sym}–${b.sym}` : `${b.sym}–${a.sym}`;
        pairs.push({ key, cutoff });
      }
    }
    pairs.sort((p, q) => q.cutoff - p.cutoff); // longest first
    return { pairs, count: types.length };
  }, [file, frameIdx, tolerance]);

  if (!info) return null;

  const { pairs, count } = info;
  const min = pairs[pairs.length - 1].cutoff;
  const max = pairs[0].cutoff;
  const inline = count <= 2
    ? pairs.map(p => `${p.key} ${p.cutoff.toFixed(2)} Å`).join(' · ')
    : `${pairs.length} pairs · ${min.toFixed(2)}–${max.toFixed(2)} Å`;

  return (
    <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4, fontStyle: 'italic' }}>
      Active cutoffs: {inline}
    </div>
  );
}
