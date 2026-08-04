import { useMemo, useState } from 'react';
import { MillionAtomPreview, type SceneMode } from './MillionAtomPreview';
import { MASSIVE_LATTICE_SEO, useSeo } from '../seo';

const SCENE_ID = 'massive_1m';
const SCENE_VIEWER_HREF = `/?sim=${SCENE_ID}`;

const PREVIEW_MODES: Array<{ id: SceneMode; label: string; detail: string; color: string }> = [
  { id: 'orbit', label: 'Orbit', detail: 'camera-ready overview', color: '#5eead4' },
  { id: 'slice', label: 'Slice', detail: 'cutaway read', color: '#38bdf8' },
  { id: 'color', label: 'Color', detail: 'element legibility', color: '#fbbf24' },
  { id: 'density', label: 'Density', detail: '953,312 atoms', color: '#fb7185' },
];

const FACTS = [
  ['Atoms', '953,312'],
  ['Structure', 'FCC copper lattice'],
  ['Scene file', 'massive_1m.glimbin'],
  ['Data stance', 'no inferred bonds'],
];

const LEARNING_POINTS = [
  {
    title: 'A materials-scale first impression',
    body:
      'The scene exists to make scale tangible: a familiar FCC metal lattice, large enough to test streaming and rendering behavior, but simple enough for students and researchers to reason about what they are seeing.',
  },
  {
    title: 'A viewer surface worth teaching with',
    body:
      'Once opened, the same controls used for smaller molecules apply to the lattice: camera motion, visual styling, atom inspection, scene sharing, and export-oriented views all live in one workspace.',
  },
  {
    title: 'A clear boundary around the data',
    body:
      'This page describes the loaded atom positions and element identity. It does not claim measured forces, validated material properties, or bond topology unless those are provided by a source dataset.',
  },
];

export function SceneLandingPage() {
  useSeo(MASSIVE_LATTICE_SEO);

  const [mode, setMode] = useState<SceneMode>('density');
  const activeMode = useMemo(() => PREVIEW_MODES.find((item) => item.id === mode) ?? PREVIEW_MODES[0], [mode]);

  return (
    <main className="lupi-scene-page">
      <style>{SCENE_CSS}</style>
      <section className="lupi-scene-hero" aria-labelledby="lupi-scene-title">
        <div className="lupi-scene-copy">
          <a className="lupi-scene-eyebrow" href="/">
            Lupi scenes
          </a>
          <h1 id="lupi-scene-title">953,312 copper atoms in one browser-controlled lattice.</h1>
          <p>
            Open the FCC copper scale-test scene in Lupi and inspect a nearly million-atom structure without turning the page into a pre-rendered video.
          </p>
          <div className="lupi-scene-actions" aria-label="Scene actions">
            <a className="lupi-scene-primary" href={SCENE_VIEWER_HREF}>
              Open interactive scene
            </a>
            <a className="lupi-scene-secondary" href="/#gallery">
              Browse structure gallery
            </a>
          </div>
        </div>

        <div className="lupi-scene-stage" aria-label="1M copper lattice preview">
          <div className="lupi-scene-stagebar">
            <span>1M Atom Scale Test</span>
            <strong>{activeMode.detail}</strong>
          </div>
          <div className="lupi-scene-preview">
            <MillionAtomPreview mode={mode} className="lupi-scene-preview-canvas" />
            <div className="lupi-scene-grid" />
            <div className="lupi-scene-readout">
              <span>Sample preview</span>
              <strong>{activeMode.label}</strong>
            </div>
          </div>
          <div className="lupi-scene-modebar" aria-label="Preview mode">
            {PREVIEW_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === mode ? 'active' : ''}
                onClick={() => setMode(item.id)}
                style={item.id === mode ? { borderColor: item.color } : undefined}
              >
                <span style={{ background: item.color }} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="lupi-scene-facts" aria-label="Scene facts">
        {FACTS.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="lupi-scene-learning" aria-labelledby="lupi-scene-learning-title">
        <div className="lupi-scene-learning-intro">
          <h2 id="lupi-scene-learning-title">Why this belongs on the first page of a serious molecular viewer.</h2>
          <p>
            The scene gives new visitors a fast truth test: if Lupi can keep a nearly million-atom lattice controllable, then smaller organic, materials, and OMol25 examples have room to become teaching objects instead of thumbnails.
          </p>
        </div>
        <div className="lupi-scene-learning-list">
          {LEARNING_POINTS.map((point) => (
            <article key={point.title}>
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lupi-scene-snapshot" aria-labelledby="lupi-scene-snapshot-title">
        <div>
          <h2 id="lupi-scene-snapshot-title">The share preview uses the actual scene snapshot.</h2>
          <p>
            Search engines and social cards point to the same public snapshot that the gallery uses for the 1M lattice. The live viewer still opens the interactive `.glimbin` file.
          </p>
        </div>
        <img src="/gallery/snapshots/massive_1m.jpg" alt="Rendered snapshot of the 953,312-atom FCC copper lattice in Lupi." />
      </section>
    </main>
  );
}

const SCENE_CSS = `
.lupi-scene-page {
  width: 100%;
  min-height: 100vh;
  overflow-x: clip;
  background: #020204;
  color: #f8fafc;
}
.lupi-scene-hero {
  box-sizing: border-box;
  width: min(1440px, 100%);
  min-height: calc(100dvh - 104px);
  margin: 0 auto;
  padding: 62px 28px 30px;
  display: grid;
  grid-template-columns: minmax(380px, 0.82fr) minmax(560px, 1.18fr);
  gap: 42px;
  align-items: center;
}
.lupi-scene-copy {
  max-width: 640px;
}
.lupi-scene-eyebrow {
  display: inline-flex;
  color: #7dd3fc;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 780;
  letter-spacing: 0;
}
.lupi-scene-copy h1 {
  margin: 18px 0 0;
  color: #f8fafc;
  font-size: 62px;
  line-height: 0.98;
  font-weight: 860;
  letter-spacing: 0;
  text-wrap: balance;
}
.lupi-scene-copy p {
  max-width: 40rem;
  margin: 22px 0 0;
  color: rgba(226, 232, 240, 0.72);
  font-size: 18px;
  line-height: 1.62;
  letter-spacing: 0;
  text-wrap: pretty;
}
.lupi-scene-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}
.lupi-scene-primary,
.lupi-scene-secondary {
  min-height: 44px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding: 0 18px;
  text-decoration: none;
  font-size: 14px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
}
.lupi-scene-primary {
  color: #08111a;
  border: 1px solid rgba(94, 234, 212, 0.55);
  background: linear-gradient(135deg, #5eead4, #fbbf24);
}
.lupi-scene-secondary {
  color: rgba(248, 250, 252, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
}
.lupi-scene-primary:hover,
.lupi-scene-secondary:hover,
.lupi-scene-modebar button:hover {
  transform: translateY(-1px);
}
.lupi-scene-stage {
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.56), rgba(5, 8, 13, 0.92));
  box-shadow: 0 34px 90px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.lupi-scene-stagebar {
  min-height: 34px;
  padding: 0 4px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(226, 232, 240, 0.68);
  font-size: 13px;
  line-height: 1.3;
  letter-spacing: 0;
}
.lupi-scene-stagebar strong {
  color: #f8fafc;
  font-weight: 760;
  letter-spacing: 0;
}
.lupi-scene-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #05070d;
}
.lupi-scene-preview-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.lupi-scene-grid {
  position: absolute;
  inset: 0;
  opacity: 0.32;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}
.lupi-scene-readout {
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
.lupi-scene-readout span,
.lupi-scene-readout strong {
  display: block;
  letter-spacing: 0;
}
.lupi-scene-readout span {
  color: rgba(226, 232, 240, 0.58);
  font-size: 11px;
  line-height: 1.2;
}
.lupi-scene-readout strong {
  margin-top: 4px;
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.15;
}
.lupi-scene-modebar {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.lupi-scene-modebar button {
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
.lupi-scene-modebar button.active {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.09);
}
.lupi-scene-modebar button span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.lupi-scene-facts {
  width: min(1280px, 100%);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 28px 44px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.lupi-scene-facts div {
  min-width: 0;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
}
.lupi-scene-facts span,
.lupi-scene-facts strong {
  display: block;
  letter-spacing: 0;
}
.lupi-scene-facts span {
  color: rgba(226, 232, 240, 0.52);
  font-size: 12px;
  line-height: 1.3;
}
.lupi-scene-facts strong {
  margin-top: 7px;
  color: #f8fafc;
  font-size: 18px;
  line-height: 1.15;
  font-weight: 780;
  overflow-wrap: anywhere;
}
.lupi-scene-learning {
  width: min(1280px, 100%);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 62px 28px 72px;
  display: grid;
  grid-template-columns: minmax(320px, 0.75fr) minmax(520px, 1.25fr);
  gap: 46px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.lupi-scene-learning-intro h2,
.lupi-scene-snapshot h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 34px;
  line-height: 1.12;
  font-weight: 820;
  letter-spacing: 0;
  text-wrap: balance;
}
.lupi-scene-learning-intro p,
.lupi-scene-snapshot p {
  max-width: 42rem;
  margin: 16px 0 0;
  color: rgba(226, 232, 240, 0.68);
  font-size: 16px;
  line-height: 1.65;
  letter-spacing: 0;
  text-wrap: pretty;
}
.lupi-scene-learning-list {
  display: grid;
  gap: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.lupi-scene-learning-list article {
  padding: 22px 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.lupi-scene-learning-list h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 21px;
  line-height: 1.25;
  font-weight: 780;
  letter-spacing: 0;
}
.lupi-scene-learning-list p {
  max-width: 44rem;
  margin: 10px 0 0;
  color: rgba(226, 232, 240, 0.66);
  font-size: 15px;
  line-height: 1.62;
  letter-spacing: 0;
}
.lupi-scene-snapshot {
  width: min(1280px, 100%);
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 28px 88px;
  display: grid;
  grid-template-columns: minmax(320px, 0.8fr) minmax(460px, 1.2fr);
  gap: 34px;
  align-items: center;
}
.lupi-scene-snapshot img {
  width: 100%;
  display: block;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #05070d;
}
@media (max-width: 1080px) {
  .lupi-scene-hero,
  .lupi-scene-learning,
  .lupi-scene-snapshot {
    grid-template-columns: 1fr;
  }
  .lupi-scene-copy {
    max-width: 760px;
  }
  .lupi-scene-copy h1 {
    font-size: 54px;
  }
  .lupi-scene-stage,
  .lupi-scene-snapshot img {
    max-width: 860px;
  }
}
@media (max-width: 720px) {
  .lupi-scene-hero {
    min-height: auto;
    padding: 50px 16px 22px;
    gap: 16px;
  }
  .lupi-scene-copy h1 {
    font-size: 34px;
    line-height: 1;
  }
  .lupi-scene-copy p {
    font-size: 15px;
    line-height: 1.48;
  }
  .lupi-scene-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 22px;
  }
  .lupi-scene-primary,
  .lupi-scene-secondary {
    width: auto;
    min-height: 42px;
    padding: 0 10px;
    font-size: 13px;
  }
  .lupi-scene-stage {
    padding: 9px;
  }
  .lupi-scene-stagebar {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .lupi-scene-preview {
    aspect-ratio: 16 / 10;
  }
  .lupi-scene-modebar {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .lupi-scene-modebar button {
    min-height: 34px;
    gap: 4px;
    font-size: 11px;
  }
  .lupi-scene-modebar button span {
    width: 6px;
    height: 6px;
  }
  .lupi-scene-facts {
    padding: 0 16px 34px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .lupi-scene-learning,
  .lupi-scene-snapshot {
    padding-left: 16px;
    padding-right: 16px;
  }
  .lupi-scene-learning-intro h2,
  .lupi-scene-snapshot h2 {
    font-size: 29px;
  }
}
`;
