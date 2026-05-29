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
import { RotaryKnob } from './ProControls';
import { BG_PRESETS as SHARED_BG_PRESETS, MATH_BACKGROUND_IDS, type BgPreset } from '../backgroundPresets';

// ─── Material Scene Card ──────────────────────────────────────────────
function MaterialSceneCard({ scene, active, onClick }: { scene: MaterialScene, active: boolean, onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const snapshotUrl = `/gallery/snapshots/scene_${scene.id}.jpg`;
  const materialLabel = scene.materialPreset === 'default' ? 'Element' : scene.materialPreset;
  const lightingLabel = scene.rimLightIntensity > 0.6
    ? 'Rim'
    : scene.dirLightIntensity >= 1.5
      ? 'Key'
      : 'Soft';

  return (
    <button
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
        minWidth: 116,
        minHeight: 104,
        background: scene.cardGradient,
        borderRadius: 8,
        border: `1px solid ${active ? scene.accentColor : '#334155'}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: 8,
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: active ? `0 0 16px ${scene.accentColor}40, inset 0 0 8px ${scene.accentColor}20` : 'none',
        padding: 10,
        textAlign: 'left',
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
      <div style={{ zIndex: 1, position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 750, color: active ? '#fff' : '#e2e8f0', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {scene.label}
          </div>
          <div style={{ marginTop: 3, fontSize: 9, color: active ? '#dbeafe' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {scene.postprocessPreset}
          </div>
        </div>
        <div style={{
          height: 22,
          minWidth: 34,
          padding: '4px 6px',
          borderRadius: 4,
          border: `1px solid ${active ? scene.accentColor : 'rgba(148,163,184,0.35)'}`,
          background: 'rgba(2,6,23,0.68)',
          color: active ? scene.accentColor : '#cbd5e1',
          fontSize: 10,
          fontWeight: 800,
          lineHeight: 1,
          textAlign: 'center',
        }}>
          {scene.code}
        </div>
      </div>
      <div style={{
        zIndex: 1,
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 5,
        fontSize: 9,
        color: '#cbd5e1',
        textShadow: '0 1px 3px rgba(0,0,0,0.85)',
      }}>
        <span>Material {materialLabel}</span>
        <span>Light {lightingLabel}</span>
        <span>Env {scene.environmentPreset}</span>
        <span>Blend {Math.round(scene.materialIntensity * 100)}%</span>
      </div>
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: scene.accentColor,
          boxShadow: `0 0 8px ${scene.accentColor}`,
          zIndex: 2
        }} />
      )}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// ─── Background Presets ───────────────────────────────────────────────
type BackgroundPanelPreset = {
  id: string;
  label: string;
  image?: string;
  preview?: string;
  procedural?: BgPreset['procedural'];
};

function backgroundPanelPreset(id: string): BackgroundPanelPreset {
  const preset = SHARED_BG_PRESETS[id];
  return {
    id,
    label: preset?.label ?? id,
    image: preset?.image,
    preview: preset?.preview,
    procedural: preset?.procedural,
  };
}

const BG_GRADIENT_PRESETS = [
  'dark',
  'deep',
  'void',
  'white',
  'blueprint',
  'midnight',
  'studio',
  'slate',
  'warm',
  'fog',
].map(backgroundPanelPreset);

const BG_TEXTURE_CATEGORIES: Array<{ label: string; presets: BackgroundPanelPreset[] }> = [
  { label: 'Mathematical', presets: MATH_BACKGROUND_IDS.map(backgroundPanelPreset) },
  { label: 'Cosmic', presets: ['nebula', 'aurora', 'plasma-smoke', 'starfield', 'spacetime'].map(backgroundPanelPreset) },
  { label: 'Material', presets: ['copper', 'crystal', 'volcanic', 'rose-gold', 'iridescent'].map(backgroundPanelPreset) },
  { label: 'Lab', presets: ['phosphor', 'plasma-arc', 'circuit', 'hex-lattice'].map(backgroundPanelPreset) },
  { label: 'Studio', presets: ['navy-grad', 'marble', 'cream', 'concrete', 'lavender'].map(backgroundPanelPreset) },
  { label: 'Environment', presets: ['bioluminescent', 'cellular', 'arctic', 'ocean', 'topographic'].map(backgroundPanelPreset) },
];

// Backwards-compat flat list for the gradient chips
const BG_PRESETS = BG_GRADIENT_PRESETS;

const ENVIRONMENT_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Warm Interior' },
  { value: 'warehouse', label: 'Industrial' },
  { value: 'city', label: 'City' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'night', label: 'Night' },
  { value: 'forest', label: 'Forest' },
  { value: 'none', label: 'Direct Only' },
] as const;

const LOOK_OPTIONS = [
  { id: 'paper', label: 'Paper', signature: 'SSAO', desc: 'Print-faithful · neutral exposure' },
  { id: 'studio', label: 'Studio', signature: 'SSAO + bloom', desc: 'Balanced default · clean lighting' },
  { id: 'editorial', label: 'Editorial', signature: 'Strong bloom', desc: 'Moody · for dark slides' },
  { id: 'cinematic', label: 'Cinematic', signature: 'Auto focus + bloom', desc: 'Target-tracked depth blur for hero shots' },
  { id: 'diagram', label: 'Diagram', signature: 'none', desc: 'Pixel-faithful figure mode' },
] as const;

export function VisualsPanel({ availableProperties, embedded = false }: { availableProperties: string[]; embedded?: boolean }) {
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
    propertyEmissionStrength, setPropertyEmissionStrength,
    annotations, addAnnotation, removeAnnotation, clearAnnotations,
    labelStyle, setLabelStyle,
    selectedAtoms,
    hiddenAtomTypes, toggleAtomType,
    atomTypeScales, setAtomTypeScale,
    // Materials & Lighting
    materialPreset,
    materialScene, applyMaterialScene,
    materialIntensity, setMaterialIntensity,
    surfaceRoughness, setSurfaceRoughness,
    surfacePolish, setSurfacePolish,
    surfaceClearcoat, setSurfaceClearcoat,
    atomTexture, setAtomTexture,
    environmentPreset, setEnvironmentPreset,
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

  const activeMaterialScene = useMemo(
    () => MATERIAL_SCENES.find(s => s.id === materialScene),
    [materialScene],
  );

  const sceneDrifted = Boolean(activeMaterialScene && (
    materialPreset !== activeMaterialScene.materialPreset ||
    Math.abs(materialIntensity - activeMaterialScene.materialIntensity) > 0.001 ||
    environmentPreset !== activeMaterialScene.environmentPreset ||
    lookPreset !== activeMaterialScene.postprocessPreset ||
    atomTexture !== activeMaterialScene.atomTexture
  ));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: embedded ? 'transparent' : '#0a0a0c',
      borderLeft: embedded ? 'none' : '1px solid #1f2937',
    }}>
      {/* ─── Header (suppressed when embedded: DockableWindow provides
            its own title bar + close control) ─── */}
      {!embedded && (
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
      )}

      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ═══ Look ═══ */}
          <div style={{ background: '#0d1117', border: '1px solid #1f2937', padding: '16px' }}>
            <h3 style={{
              fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif',
              letterSpacing: '0.05em', color: '#e2e8f0', textTransform: 'uppercase', margin: '0 0 12px 0',
            }}>Look</h3>
            <select
              value={lookPreset}
              onChange={(e) => setLookPreset(e.target.value as typeof LOOK_OPTIONS[number]['id'])}
              style={{
                width: '100%',
                background: '#121824',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: 4,
                padding: '9px 10px',
                fontSize: 12,
                fontWeight: 650,
                outline: 'none',
              }}
            >
              {LOOK_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label} - {option.signature}
                </option>
              ))}
            </select>
            {LOOK_OPTIONS.filter(option => option.id === lookPreset).map(option => (
              <div key={option.id} style={{ marginTop: 8, fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                {option.desc}
              </div>
            ))}
            <div style={{ display: 'none', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {([
                { id: 'paper',     label: 'Paper',     signature: 'SSAO',          desc: 'Print-faithful · neutral exposure' },
                { id: 'studio',    label: 'Studio',    signature: 'SSAO + bloom',  desc: 'Balanced default · clean lighting' },
                { id: 'editorial', label: 'Editorial', signature: 'Strong bloom',  desc: 'Moody · for dark slides' },
                { id: 'cinematic', label: 'Cinematic', signature: 'Auto focus + bloom', desc: 'Target-tracked depth blur for hero shots' },
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
                                if (res.ok) console.log(`Snapshot generated: look_${p.id}.jpg`);
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
          <QuantumSection label="Data Representation" defaultOpen={false}>
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
                    {['viridis', 'plasma', 'inferno', 'coolwarm', 'turbo', 'grayscale'].map(c => (
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
          <QuantumSection label="Material & Lighting" defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 12 }}>
              
              {/* Material Scenes */}
              <div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', letterSpacing: '0.05em', fontWeight: 700 }}>
                  <span>Scene Preset</span>
                  <span>{activeMaterialScene?.label ?? 'Custom'}</span>
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
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 10, lineHeight: 1.45 }}>
                  Scene presets apply a matched material, light rig, environment, background, and look in one action. Refine the sections below after choosing a baseline.
                </div>
                <div style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                  fontSize: 10,
                  color: '#94a3b8',
                }}>
                  <div style={{ padding: '8px', background: '#0a0d14', border: '1px solid #1e293b', borderRadius: 6 }}>
                    Material: <span style={{ color: '#e2e8f0' }}>{materialPreset}</span>
                  </div>
                  <div style={{ padding: '8px', background: '#0a0d14', border: '1px solid #1e293b', borderRadius: 6 }}>
                    Look: <span style={{ color: '#e2e8f0' }}>{lookPreset}</span>
                  </div>
                  <div style={{ padding: '8px', background: '#0a0d14', border: '1px solid #1e293b', borderRadius: 6 }}>
                    Environment: <span style={{ color: '#e2e8f0' }}>{environmentPreset}</span>
                  </div>
                  <div style={{ padding: '8px', background: '#0a0d14', border: '1px solid #1e293b', borderRadius: 6 }}>
                    Texture: <span style={{ color: '#e2e8f0' }}>{atomTexture}</span>
                  </div>
                  <button
                    onClick={() => activeMaterialScene && applyMaterialScene(activeMaterialScene.id)}
                    disabled={!activeMaterialScene || !sceneDrifted}
                    style={{
                      padding: '8px',
                      background: sceneDrifted ? 'rgba(30,220,224,0.12)' : '#0a0d14',
                      border: sceneDrifted ? '1px solid rgba(30,220,224,0.55)' : '1px solid #1e293b',
                      borderRadius: 6,
                      color: sceneDrifted ? '#9ff7ff' : '#64748b',
                      cursor: sceneDrifted ? 'pointer' : 'default',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Reapply Preset
                  </button>
                </div>
                {activeMaterialScene && (
                  <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
                    {activeMaterialScene.description}
                  </div>
                )}
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
                  <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
                    Surface knobs are local refinements layered on top of the selected scene preset. Resetting this block keeps the authored light rig intact.
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', background: '#0a0d14', borderRadius: 8, border: '1px solid #1e293b' }}>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>
                  Scene Environment
                </div>
                <select
                  value={environmentPreset}
                  onChange={e => setEnvironmentPreset(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: '#121824',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: 4,
                    padding: '8px 10px',
                    fontSize: 11,
                    outline: 'none'
                  }}
                >
                  {ENVIRONMENT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
                  Environment controls image-based lighting. The Look selector above controls post effects only, so the two systems stay separate.
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
                    {cat.label} {cat.label === 'Mathematical' ? 'Fields' : 'Textures'}
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
                          {p.image ? (
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
                          ) : (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: p.preview ?? 'radial-gradient(circle at 50% 50%, #1edce0, #050914 58%, #000 100%)',
                              opacity: active ? 1 : 0.76,
                            }}>
                              <div style={{
                                position: 'absolute',
                                inset: '18%',
                                border: '1px solid rgba(182,244,255,0.55)',
                                borderRadius: '50%',
                                transform: 'rotate(18deg)',
                                boxShadow: '0 0 18px rgba(30,220,224,0.35), inset 0 0 18px rgba(108,76,255,0.28)',
                              }} />
                              <div style={{
                                position: 'absolute',
                                inset: '30% 14%',
                                borderTop: '1px solid rgba(255,179,90,0.55)',
                                borderBottom: '1px solid rgba(30,220,224,0.42)',
                                transform: 'skewY(-18deg)',
                              }} />
                            </div>
                          )}
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
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
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
