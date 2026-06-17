import { useMemo, useState, type ReactNode } from 'react';
import { ParticleCanvas } from './ParticleCanvas';
import { AnimatedCounter } from './AnimatedCounter';
import { ALL_EXAMPLES } from './shared';
import { useStore } from '../store';
import { MillionAtomPreview, type SceneMode } from './MillionAtomPreview';

interface SceneModeConfig {
  id: SceneMode;
  label: string;
  value: string;
  caption: string;
  accent: string;
}

const MASSIVE_SCENE_ID = 'massive_1m';

const SCENE_MODES: SceneModeConfig[] = [
  {
    id: 'orbit',
    label: 'Orbit',
    value: 'free camera',
    caption: 'Drag the lattice, inspect the cell, and stay in control of the frame.',
    accent: '#5eead4',
  },
  {
    id: 'slice',
    label: 'Slice',
    value: 'inside view',
    caption: 'Cut through the field visually without losing the larger structure.',
    accent: '#38bdf8',
  },
  {
    id: 'color',
    label: 'Color',
    value: 'element read',
    caption: 'Keep atoms legible as the scene moves from overview to inspection.',
    accent: '#fbbf24',
  },
  {
    id: 'density',
    label: 'Density',
    value: '953,312 atoms',
    caption: 'A nearly million-atom FCC copper lattice opens as one controlled scene.',
    accent: '#fb7185',
  },
];

export function HeroSection() {
  const openConfigurator = useStore((s) => s.openConfigurator);
  const [heroQuery, setHeroQuery] = useState('');
  const [sceneMode, setSceneMode] = useState<SceneMode>('orbit');

  const massiveScene = useMemo(
    () => ALL_EXAMPLES.find((example) => example.id === MASSIVE_SCENE_ID),
    [],
  );

  const stats = useMemo(() => {
    const totalSims = ALL_EXAMPLES.filter((example) => example.available).length;
    const domains = new Set(ALL_EXAMPLES.map((example) => example.domain)).size;
    return { totalSims, domains };
  }, []);

  const currentMode = SCENE_MODES.find((mode) => mode.id === sceneMode) ?? SCENE_MODES[0];

  const submitHeroQuery = () => {
    openConfigurator(heroQuery.trim() || 'large copper lattice');
  };

  const openMassiveScene = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('sim', MASSIVE_SCENE_ID);
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section className="lupi-hero" aria-labelledby="lupi-hero-title">
      <style>{HERO_CSS}</style>
      <ParticleCanvas />

      <div className="lupi-hero-shell">
        <div className="lupi-hero-copy">
          <div className="lupi-hero-product">Lupi molecular viewer</div>
          <h1 id="lupi-hero-title" className="lupi-hero-title">
            1M atoms, fully controllable.
          </h1>
          <p className="lupi-hero-lede">
            Open a nearly million-atom FCC copper lattice and control the scene directly:
            orbit, inspect, color, share, and keep the structure responsive.
          </p>

          <div className="lupi-hero-actions" aria-label="Primary actions">
            <button type="button" className="lupi-hero-primary" onClick={openMassiveScene}>
              <IconPlay />
              <span>Open 1M lattice</span>
            </button>
            <a className="lupi-hero-secondary" href="#dropzone">
              <IconUpload />
              <span>Load your data</span>
            </a>
          </div>

          <div className="lupi-hero-builder" role="search">
            <div className="lupi-hero-builder-icon" aria-hidden="true">
              <IconSearch />
            </div>
            <input
              value={heroQuery}
              onChange={(event) => setHeroQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') submitHeroQuery(); }}
              placeholder="Build another scene: graphene, MOF, LiFePO4..."
              aria-label="Build another molecular scene"
            />
            <button type="button" onClick={submitHeroQuery}>
              Build
            </button>
          </div>

          <div className="lupi-hero-stats" aria-label="Viewer scale">
            <Metric value={<AnimatedCounter target={953312} duration={1800} />} label="Atoms in the hero scene" />
            <Metric value={`${stats.totalSims}+`} label="Loadable structures" />
            <Metric value={stats.domains} label="Scientific domains" />
          </div>
        </div>

        <div className="lupi-hero-stage" aria-label="1M atom lattice scene preview">
          <div className="lupi-hero-stage-topline">
            <span>{massiveScene?.title ?? '1M Atom Scale Test'}</span>
            <span>{massiveScene?.atoms ?? '953,312'} atoms</span>
          </div>

          <button
            type="button"
            className="lupi-hero-preview"
            onClick={openMassiveScene}
            aria-label="Open the 1M atom FCC copper lattice in the viewer"
          >
            <MillionAtomPreview mode={sceneMode} />
            <div className="lupi-hero-preview-grid" />
            <div className="lupi-hero-preview-reticle" />
            <div className="lupi-hero-preview-readout">
              <span>Controlled scene</span>
              <strong>{currentMode.value}</strong>
            </div>
          </button>

          <div className="lupi-hero-modebar" aria-label="Preview controls">
            {SCENE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={mode.id === sceneMode ? 'active' : ''}
                onClick={() => setSceneMode(mode.id)}
                style={mode.id === sceneMode ? { borderColor: mode.accent, color: '#f8fafc' } : undefined}
              >
                <span style={{ background: mode.accent }} />
                {mode.label}
              </button>
            ))}
          </div>

          <div className="lupi-hero-caption">
            <strong>{currentMode.label}</strong>
            <span>{currentMode.caption}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="lupi-hero-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

const HERO_CSS = `
.lupi-hero {
  position: relative;
  width: 100%;
  min-height: calc(100dvh - 104px);
  overflow: hidden;
  background:
    linear-gradient(120deg, rgba(2, 2, 4, 0.98) 0%, rgba(6, 12, 18, 0.96) 48%, rgba(24, 15, 9, 0.94) 100%);
  color: #f8fafc;
  isolation: isolate;
}
.lupi-hero::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 140px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(2, 2, 4, 0), #020204);
  z-index: 1;
}
.lupi-hero-shell {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: min(1440px, 100%);
  min-height: calc(100dvh - 104px);
  margin: 0 auto;
  padding: 50px 28px 24px;
  display: grid;
  grid-template-columns: minmax(380px, 0.82fr) minmax(520px, 1.18fr);
  gap: 40px;
  align-items: center;
}
.lupi-hero-copy {
  max-width: 640px;
}
.lupi-hero-product {
  margin-bottom: 18px;
  font-size: 14px;
  font-weight: 760;
  letter-spacing: 0;
  color: #7dd3fc;
}
.lupi-hero-title {
  margin: 0;
  font-size: 64px;
  line-height: 0.98;
  letter-spacing: 0;
  font-weight: 850;
  text-wrap: balance;
}
.lupi-hero-lede {
  max-width: 590px;
  margin: 20px 0 0;
  color: rgba(226, 232, 240, 0.74);
  font-size: 19px;
  line-height: 1.55;
  letter-spacing: 0;
  text-wrap: pretty;
}
.lupi-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}
.lupi-hero-primary,
.lupi-hero-secondary,
.lupi-hero-builder button {
  appearance: none;
  border-radius: 8px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font: inherit;
  font-size: 14px;
  font-weight: 780;
  letter-spacing: 0;
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.lupi-hero-primary {
  padding: 0 18px;
  color: #08111a;
  border: 1px solid rgba(94, 234, 212, 0.55);
  background: linear-gradient(135deg, #5eead4, #fbbf24);
  box-shadow: 0 18px 48px rgba(20, 184, 166, 0.22);
}
.lupi-hero-secondary {
  padding: 0 16px;
  color: rgba(248, 250, 252, 0.88);
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
}
.lupi-hero-primary:hover,
.lupi-hero-secondary:hover,
.lupi-hero-builder button:hover,
.lupi-hero-modebar button:hover {
  transform: translateY(-1px);
}
.lupi-hero-builder {
  box-sizing: border-box;
  width: min(590px, 100%);
  margin-top: 16px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 7px;
  padding-left: 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 13, 20, 0.72);
  backdrop-filter: blur(12px);
}
.lupi-hero-builder-icon {
  color: rgba(226, 232, 240, 0.48);
  display: grid;
  place-items: center;
}
.lupi-hero-builder input {
  min-width: 0;
  height: 34px;
  color: #f8fafc;
  background: transparent;
  border: 0;
  outline: none;
  font-size: 14px;
  letter-spacing: 0;
}
.lupi-hero-builder input::placeholder {
  color: rgba(226, 232, 240, 0.42);
}
.lupi-hero-builder button {
  min-height: 34px;
  padding: 0 14px;
  color: #dff7ff;
  border: 1px solid rgba(56, 189, 248, 0.34);
  background: rgba(14, 165, 233, 0.12);
}
.lupi-hero-stats {
  width: min(590px, 100%);
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.lupi-hero-metric {
  min-width: 0;
  padding: 14px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.lupi-hero-metric strong {
  display: block;
  font-size: 24px;
  line-height: 1;
  font-weight: 820;
  letter-spacing: 0;
  color: #f8fafc;
  white-space: nowrap;
}
.lupi-hero-metric span {
  display: block;
  margin-top: 8px;
  color: rgba(226, 232, 240, 0.52);
  font-size: 12px;
  line-height: 1.25;
  letter-spacing: 0;
}
.lupi-hero-stage {
  justify-self: stretch;
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.62), rgba(5, 8, 13, 0.9));
  box-shadow: 0 34px 90px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
}
.lupi-hero-stage-topline {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 4px 10px;
  color: rgba(226, 232, 240, 0.68);
  font-size: 13px;
  font-weight: 720;
  letter-spacing: 0;
}
.lupi-hero-preview {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #05070d;
  cursor: pointer;
}
.lupi-hero-preview-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.lupi-hero-preview-grid {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 48px 48px;
  mix-blend-mode: screen;
  pointer-events: none;
}
.lupi-hero-preview-reticle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 128px;
  height: 128px;
  border: 1px solid rgba(125, 211, 252, 0.38);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.14), 0 0 42px rgba(56, 189, 248, 0.12);
  pointer-events: none;
}
.lupi-hero-preview-reticle::before,
.lupi-hero-preview-reticle::after {
  content: "";
  position: absolute;
  background: rgba(125, 211, 252, 0.36);
}
.lupi-hero-preview-reticle::before {
  left: 50%;
  top: -18px;
  bottom: -18px;
  width: 1px;
}
.lupi-hero-preview-reticle::after {
  top: 50%;
  left: -18px;
  right: -18px;
  height: 1px;
}
.lupi-hero-preview-readout {
  position: absolute;
  left: 14px;
  bottom: 14px;
  padding: 9px 10px;
  border-radius: 8px;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(2, 6, 12, 0.68);
  backdrop-filter: blur(10px);
}
.lupi-hero-preview-readout span,
.lupi-hero-preview-readout strong {
  display: block;
  letter-spacing: 0;
}
.lupi-hero-preview-readout span {
  color: rgba(226, 232, 240, 0.58);
  font-size: 11px;
  line-height: 1.2;
}
.lupi-hero-preview-readout strong {
  margin-top: 4px;
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.15;
}
.lupi-hero-modebar {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.lupi-hero-modebar button {
  min-width: 0;
  min-height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(226, 232, 240, 0.66);
  font: inherit;
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: transform 180ms ease, border-color 180ms ease, color 180ms ease, background 180ms ease;
}
.lupi-hero-modebar button.active {
  background: rgba(255, 255, 255, 0.09);
}
.lupi-hero-modebar button span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.lupi-hero-caption {
  min-height: 58px;
  margin-top: 10px;
  padding: 12px 2px 2px;
  display: grid;
  gap: 5px;
}
.lupi-hero-caption strong {
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: 0;
}
.lupi-hero-caption span {
  color: rgba(226, 232, 240, 0.6);
  font-size: 13px;
  line-height: 1.35;
  letter-spacing: 0;
  text-wrap: pretty;
}
@media (max-width: 1080px) {
  .lupi-hero-shell {
    grid-template-columns: 1fr;
    min-height: auto;
    padding-top: 82px;
  }
  .lupi-hero-copy {
    max-width: 760px;
  }
  .lupi-hero-title {
    font-size: 58px;
  }
  .lupi-hero-stage {
    max-width: 860px;
  }
}
@media (max-width: 640px) {
  .lupi-hero {
    min-height: auto;
  }
  .lupi-hero-shell {
    padding: 50px 16px 22px;
    gap: 16px;
  }
  .lupi-hero-product {
    font-size: 13px;
    margin-bottom: 12px;
  }
  .lupi-hero-title {
    font-size: 34px;
    line-height: 1;
  }
  .lupi-hero-lede {
    margin-top: 14px;
    font-size: 15px;
    line-height: 1.45;
  }
  .lupi-hero-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 20px;
  }
  .lupi-hero-primary,
  .lupi-hero-secondary {
    width: auto;
    min-height: 42px;
    padding: 0 10px;
    gap: 6px;
    font-size: 13px;
  }
  .lupi-hero-builder {
    display: none;
  }
  .lupi-hero-stats {
    margin-top: 14px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .lupi-hero-metric {
    padding: 9px 0 8px;
  }
  .lupi-hero-metric strong {
    font-size: 18px;
  }
  .lupi-hero-metric span {
    font-size: 10px;
  }
  .lupi-hero-stage {
    padding: 9px;
  }
  .lupi-hero-stage-topline {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .lupi-hero-preview {
    aspect-ratio: 16 / 10;
  }
  .lupi-hero-modebar {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .lupi-hero-modebar button {
    min-height: 34px;
    gap: 4px;
    font-size: 11px;
  }
  .lupi-hero-modebar button span {
    width: 6px;
    height: 6px;
  }
  .lupi-hero-caption {
    display: none;
  }
  .lupi-hero-preview-reticle {
    width: 92px;
    height: 92px;
  }
}
`;
