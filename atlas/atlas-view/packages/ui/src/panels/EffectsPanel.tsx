/**
 * EffectsPanel — Post-processing controls (SSAO, Bloom, DOF, Tone Mapping)
 *
 * Fully integrated with @lupine/ui "Atomic Understanding" component library.
 */

import { useStore } from '../store';
import {
  QuantumSection,
  OrbitalToggle,
  WaveformSlider,
  IsotopeChip,
} from '@lupine/ui';

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export function EffectsPanel() {
  const {
    ssao, ssaoIntensity, bloom, bloomIntensity,
    dof, dofFocus, toneMapping,
    toggleSSAO, toggleBloom, toggleDOF,
    setSSAOIntensity, setBloomIntensity, setDOFFocus,
    setToneMapping, setActivePanel,
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
            Effects
          </span>
        </div>
        <button
          onClick={() => setActivePanel(null)}
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

          {/* ─── Shadows ─── */}
          <QuantumSection label="Depth & Shadows" defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <OrbitalToggle
                label="Screen Space Ambient Occlusion"
                hint="Makes atoms look 3D by darkening gaps"
                active={ssao}
                onClick={toggleSSAO}
              />
              {ssao && (
                <div style={{ paddingLeft: 16, paddingTop: 4 }}>
                  <WaveformSlider
                    label="SSAO Strength"
                    value={ssaoIntensity}
                    min={0.1}
                    max={2}
                    step={0.1}
                    format={(v) => v.toFixed(1)}
                    onChange={setSSAOIntensity}
                  />
                </div>
              )}
            </div>
          </QuantumSection>

          {/* ─── Bloom ─── */}
          <QuantumSection label="Glow (Bloom)" defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <OrbitalToggle
                label="Emission Bloom"
                hint="Soft halo around bright atoms"
                active={bloom}
                onClick={toggleBloom}
              />
              {bloom && (
                <div style={{ paddingLeft: 16, paddingTop: 4 }}>
                  <WaveformSlider
                    label="Bloom Strength"
                    value={bloomIntensity}
                    min={0.05}
                    max={1.5}
                    step={0.05}
                    format={(v) => v.toFixed(2)}
                    onChange={setBloomIntensity}
                  />
                </div>
              )}
            </div>
          </QuantumSection>

          {/* ─── Depth of Field ─── */}
          <QuantumSection label="Focus Blur (DOF)" defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <OrbitalToggle
                label="Depth of Field"
                hint="Blur background for a cinematic look"
                active={dof}
                onClick={toggleDOF}
              />
              {dof && (
                <div style={{ paddingLeft: 16, paddingTop: 4 }}>
                  <WaveformSlider
                    label="Focus distance"
                    value={dofFocus}
                    min={1}
                    max={200}
                    step={1}
                    format={(v) => v.toFixed(0)}
                    unit="Å"
                    onChange={setDOFFocus}
                  />
                </div>
              )}
            </div>
          </QuantumSection>

          {/* ─── Tone Mapping ─── */}
          <QuantumSection label="Color balance" defaultOpen={true}>
            <div style={{ display: 'flex', gap: 4 }}>
              {([
                { id: 'none' as const, label: 'Off' },
                { id: 'aces' as const, label: 'Film (ACES)' },
                { id: 'reinhard' as const, label: 'Bright' },
              ]).map(mode => (
                <IsotopeChip
                  key={mode.id}
                  label={mode.label}
                  selected={toneMapping === mode.id}
                  onClick={() => setToneMapping(mode.id)}
                />
              ))}
            </div>
          </QuantumSection>

        </div>
      </div>
    </div>
  );
}
