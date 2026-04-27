/**
 * StylePanel — Atom coloring, sizing, background, cell display
 * 
 * Fully integrated with @lupine/ui "Atomic Understanding" component library.
 * Every section is a QuantumSection (collapsible with phase-transition).
 * Every toggle is an OrbitalToggle. Every slider is a WaveformSlider.
 * Every colormap chip is an IsotopeChip. Presets live in a CovalentGrid.
 */

import { useStore } from '../store';
import type { ColormapName, ColorMode } from '@atlas/core/types';
import {
  AtomicGlass,
  OrbitalToggle,
  CovalentGrid,
  WaveformSlider,
  QuantumSection,
  IsotopeChip,
} from '@lupine/ui';

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const COLORMAPS: { id: ColormapName; label: string; gradient: string; tag?: string }[] = [
  { id: 'viridis',   label: 'Viridis',    gradient: 'linear-gradient(90deg, #440154, #31688e, #35b779, #fde725)' },
  { id: 'inferno',   label: 'Inferno',    gradient: 'linear-gradient(90deg, #000004, #6a176e, #e8461c, #fcffa4)' },
  { id: 'coolwarm',  label: 'Coolwarm',   gradient: 'linear-gradient(90deg, #3b4cc0, #ddd, #b40426)' },
  { id: 'plasma',    label: 'Plasma',     gradient: 'linear-gradient(90deg, #0d0887, #7e03a8, #cc4778, #f0f921)' },
  { id: 'magma',     label: 'Magma',      gradient: 'linear-gradient(90deg, #000004, #6a176e, #de4968, #fcfdbf)' },
  { id: 'cividis',   label: 'Cividis',    gradient: 'linear-gradient(90deg, #002051, #5d7a99, #cabb5b, #fde724)' },
  { id: 'neon',      label: 'Neon',       gradient: 'linear-gradient(90deg, #00ff66, #00ccff, #9900ff, #ff0099)', tag: 'NEW' },
  { id: 'sunset',    label: 'Sunset',     gradient: 'linear-gradient(90deg, #1e004d, #cc2666, #ff8c26, #ffeb80)', tag: 'NEW' },
  { id: 'vaporwave', label: 'Vaporwave',  gradient: 'linear-gradient(90deg, #0dd9d9, #8c4df2, #ff66b2, #ffd966)', tag: 'NEW' },
];

interface StylePanelProps {
  availableProperties: string[];
  bgPresets: Record<string, { top: string; bottom: string; label: string }>;
}

export function StylePanel({ availableProperties, bgPresets }: StylePanelProps) {
  const {
    file,
    colorMode, colorProperty, colormap, atomScale,
    showCell, showAxes, showBonds, bondCutoff,
    backgroundPreset, setBackgroundPreset,
    backgroundStyle, setBackgroundStyle,
    setColorMode, setColorProperty, setColormap,
    setAtomScale, toggleCell, toggleAxes, toggleBonds,
    setBondCutoff, setRenderStyle,
  } = useStore();

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
            Style
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

          {/* ═══ Quick Presets ═══ */}
          <QuantumSection label="Quick Looks" defaultOpen={true}>
            <CovalentGrid columns={2} gap={8}>
              <PresetButton label="Classic" onClick={() => {
                setColorMode('type'); setColormap('viridis');
                setRenderStyle('standard'); setBackgroundPreset('deep'); setAtomScale(1.0);
              }} />
              <PresetButton label="Neon" onClick={() => {
                setColorMode('type'); setColormap('neon');
                setRenderStyle('standard'); setBackgroundPreset('void'); setAtomScale(1.0);
              }} />
              <PresetButton label="Publication" onClick={() => {
                setColorMode('type'); setColormap('coolwarm');
                setRenderStyle('standard'); setBackgroundPreset('studio'); setAtomScale(1.0);
              }} />
              <PresetButton label="Minimal" onClick={() => {
                setColorMode('uniform'); setColormap('viridis');
                setRenderStyle('standard'); setBackgroundPreset('fog'); setAtomScale(0.9);
              }} />
              {file?.name?.toLowerCase().includes('lupine') && (
                <PresetButton label="🌿 Botanical" onClick={() => {
                  setColorMode('type'); setColormap('viridis');
                  setRenderStyle('botanical'); setBackgroundPreset('studio'); setAtomScale(1.0);
                }} />
              )}
            </CovalentGrid>
          </QuantumSection>

          {/* ═══ Color By ═══ */}
          <QuantumSection label="Color by" defaultOpen={true}>
            <div style={{ display: 'flex', gap: 4 }}>
              {([
                { id: 'type' as ColorMode, label: 'Atom type' },
                { id: 'property' as ColorMode, label: 'Property' },
                { id: 'uniform' as ColorMode, label: 'Single' },
              ]).map(mode => (
                <IsotopeChip
                  key={mode.id}
                  label={mode.label}
                  selected={colorMode === mode.id}
                  onClick={() => setColorMode(mode.id)}
                />
              ))}
            </div>

            {colorMode === 'property' && (
              <div style={{ marginTop: 10 }}>
                <div style={{
                  fontSize: 10, color: 'var(--slate-500)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}>
                  Data Channel
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {availableProperties.length > 0 ? (
                    availableProperties.map((prop, i) => (
                      <IsotopeChip
                        key={prop}
                        label={prop}
                        number={i + 1}
                        selected={colorProperty === prop}
                        onClick={() => setColorProperty(prop)}
                      />
                    ))
                  ) : (
                    <div style={{
                      fontSize: 11, color: 'var(--slate-600)',
                      fontStyle: 'italic', padding: '4px 0',
                    }}>
                      No data channels in this file
                    </div>
                  )}
                </div>
              </div>
            )}
          </QuantumSection>

          {/* ═══ Palette ═══ */}
          <QuantumSection label="Palette" defaultOpen={true}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
            }}>
              {COLORMAPS.map((cm, i) => (
                <button
                  key={cm.id}
                  onClick={() => setColormap(cm.id)}
                  className={`isotope ${colormap === cm.id ? 'isotope--selected' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px',
                    width: '100%', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 24, height: 24,
                    borderRadius: 'var(--radius-xs)',
                    background: cm.gradient,
                    flexShrink: 0,
                    border: '1px solid var(--glass-border-hi)',
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: colormap === cm.id ? 600 : 400,
                    color: colormap === cm.id ? 'var(--slate-100)' : 'var(--slate-400)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {cm.label}
                  </span>
                  {cm.tag && (
                    <span className="isotope__tag">{cm.tag}</span>
                  )}
                </button>
              ))}
            </div>
          </QuantumSection>

          {/* ═══ Atom Size ═══ */}
          <QuantumSection label="Atom Size" defaultOpen={true}>
            <WaveformSlider
              label="Scale factor"
              value={atomScale}
              min={0.1}
              max={3.0}
              step={0.05}
              format={(v) => `${v.toFixed(2)}x`}
              onChange={setAtomScale}
            />
          </QuantumSection>

          {/* ═══ Display Toggles ═══ */}
          <QuantumSection label="Show / Hide" defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <OrbitalToggle label="Unit cell outline" active={showCell} onClick={toggleCell} />
              <OrbitalToggle label="Crystallographic axes" active={showAxes} onClick={toggleAxes} />
              <OrbitalToggle label="Interatomic bonds" active={showBonds} onClick={toggleBonds} hint="covalent radii" />
              {showBonds && (
                <div style={{ paddingLeft: 16, paddingTop: 4 }}>
                  <WaveformSlider
                    label="Bond cutoff"
                    value={bondCutoff}
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    format={(v) => v.toFixed(1)}
                    unit="Å"
                    onChange={setBondCutoff}
                  />
                </div>
              )}
            </div>
          </QuantumSection>

          {/* ═══ Background ═══ */}
          <QuantumSection label="Background" defaultOpen={false}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {([
                { id: 'linear' as const, label: 'Linear' },
                { id: 'radial' as const, label: 'Radial' },
                { id: 'spotlight' as const, label: 'Spotlight' },
              ]).map(bs => (
                <IsotopeChip
                  key={bs.id}
                  label={bs.label}
                  selected={backgroundStyle === bs.id}
                  onClick={() => setBackgroundStyle(bs.id)}
                />
              ))}
            </div>

            <CovalentGrid columns={2} gap={8}>
              {Object.entries(bgPresets).map(([key, preset]) => (
                <AtomicGlass
                  key={key}
                  level={1}
                  interactive
                  flush
                  onClick={() => setBackgroundPreset(key)}
                  style={{
                    borderColor: backgroundPreset === key
                      ? 'rgba(85, 101, 212, 0.4)'
                      : undefined,
                    boxShadow: backgroundPreset === key
                      ? '0 0 12px rgba(85, 101, 212, 0.15)'
                      : undefined,
                  }}
                >
                  <div style={{
                    padding: '16px 0',
                    background: `linear-gradient(180deg, ${preset.top}, ${preset.bottom})`,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: backgroundPreset === key
                        ? 'var(--lupine-300)'
                        : 'rgba(255,255,255,0.5)',
                    }}>
                      {preset.label}
                    </span>
                  </div>
                </AtomicGlass>
              ))}
            </CovalentGrid>

            {/* Video Background Sub-section */}
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: 10, color: 'var(--slate-500)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}>
                Video Background
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label className="lupine-glass lupine-glass--1 lupine-glass--interactive" style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 11, fontWeight: 500,
                  color: 'var(--slate-300)',
                }}>
                  Load Video
                  <input 
                    type="file" 
                    accept="video/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        useStore.getState().setBackgroundVideo(url);
                      }
                    }}
                  />
                </label>
                {useStore.getState().backgroundVideo && (
                  <button
                    className="lupine-glass lupine-glass--1 lupine-glass--interactive"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11, fontWeight: 500,
                      color: 'var(--danger)',
                    }}
                    onClick={() => useStore.getState().setBackgroundVideo(null)}
                  >
                    Clear Video
                  </button>
                )}
              </div>
            </div>
          </QuantumSection>

        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <AtomicGlass level={1} interactive onClick={onClick}>
      <div style={{
        textAlign: 'center',
        padding: '2px 0',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          color: 'var(--slate-300)',
        }}>
          {label}
        </span>
      </div>
    </AtomicGlass>
  );
}
