import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { RenderStyle } from '@atlas/core/types';
import { MATERIAL_SCENES, type MaterialScene } from '@atlas/scene/materials';
import { COLOR_SCHEMES, SCHEME_ORDER, type ColorSchemeId } from './coloring';
import { useStore } from './store';
import {
  BG_GRADIENT_PRESETS,
  BG_TEXTURE_CATEGORIES,
  BG_VIDEO_PRESETS,
  getBgBadge,
  getBgMedia,
  getBgPoster,
  type BgPresetWithId,
} from './backgroundPresets';

export type StudioDeckMode = 'look' | 'surface' | 'world';

const LOOK_OPTIONS = [
  { id: 'paper', label: 'Paper', code: 'FIG', accent: '#e5e7eb' },
  { id: 'studio', label: 'Studio', code: 'STD', accent: '#1edce0' },
  { id: 'editorial', label: 'Editorial', code: 'EDT', accent: '#38bdf8' },
  { id: 'cinematic', label: 'Cinematic', code: 'CIN', accent: '#f59e0b' },
  { id: 'diagram', label: 'Diagram', code: 'DGM', accent: '#a7f3d0' },
] as const;

const RENDER_OPTIONS: Array<{ id: RenderStyle; label: string; code: string; accent: string }> = [
  { id: 'standard', label: 'Standard', code: 'STD', accent: '#1edce0' },
  { id: 'toon', label: 'Toon', code: 'INK', accent: '#facc15' },
  { id: 'botanical', label: 'Botanical', code: 'BOT', accent: '#69f0ae' },
];

const FEATURED_SCENE_IDS = [
  'laboratory',
  'specimen',
  'blueprint',
  'forge',
  'crystallography',
  'deep_space',
  'holograph',
  'subsurface',
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function categoryPresets(label: string): BgPresetWithId[] {
  return BG_TEXTURE_CATEGORIES.find(category => category.label === label)?.presets ?? [];
}

export function StudioControlDeck({
  mode,
  onClose,
  bottomOffset,
}: {
  mode: StudioDeckMode;
  onClose: () => void;
  bottomOffset: number;
}) {
  const postprocessPreset = useStore(s => s.postprocessPreset);
  const setPostprocessPreset = useStore(s => s.setPostprocessPreset);
  const postprocessIntensity = useStore(s => s.postprocessIntensity);
  const setPostprocessIntensity = useStore(s => s.setPostprocessIntensity);
  const colorScheme = useStore(s => s.colorScheme);
  const setColorScheme = useStore(s => s.setColorScheme);
  const renderStyle = useStore(s => s.renderStyle);
  const setRenderStyle = useStore(s => s.setRenderStyle);

  const materialScene = useStore(s => s.materialScene);
  const setMaterialScene = useStore(s => s.setMaterialScene);
  const setMaterialPreset = useStore(s => s.setMaterialPreset);
  const setEnvironmentPreset = useStore(s => s.setEnvironmentPreset);
  const setAmbientLightIntensity = useStore(s => s.setAmbientLightIntensity);
  const setDirLightIntensity = useStore(s => s.setDirLightIntensity);
  const setRimLightIntensity = useStore(s => s.setRimLightIntensity);
  const setAtomTexture = useStore(s => s.setAtomTexture);
  const atomScale = useStore(s => s.atomScale);
  const setAtomScale = useStore(s => s.setAtomScale);
  const materialIntensity = useStore(s => s.materialIntensity);
  const setMaterialIntensity = useStore(s => s.setMaterialIntensity);
  const surfaceRoughness = useStore(s => s.surfaceRoughness);
  const setSurfaceRoughness = useStore(s => s.setSurfaceRoughness);
  const surfacePolish = useStore(s => s.surfacePolish);
  const setSurfacePolish = useStore(s => s.setSurfacePolish);
  const surfaceClearcoat = useStore(s => s.surfaceClearcoat);
  const setSurfaceClearcoat = useStore(s => s.setSurfaceClearcoat);
  const showBonds = useStore(s => s.showBonds);
  const toggleBonds = useStore(s => s.toggleBonds);
  const bondTolerance = useStore(s => s.bondTolerance);
  const setBondTolerance = useStore(s => s.setBondTolerance);
  const bondColorMode = useStore(s => s.bondColorMode);
  const setBondColorMode = useStore(s => s.setBondColorMode);

  const backgroundPreset = useStore(s => s.backgroundPreset);
  const setBackgroundPreset = useStore(s => s.setBackgroundPreset);
  const showAxes = useStore(s => s.showAxes);
  const toggleAxes = useStore(s => s.toggleAxes);
  const showCell = useStore(s => s.showCell);
  const toggleCell = useStore(s => s.toggleCell);

  const materialScenes = useMemo(
    () => MATERIAL_SCENES.filter(scene => FEATURED_SCENE_IDS.includes(scene.id)),
    [],
  );
  const mathPresets = useMemo(() => categoryPresets('Mathematical Fields'), []);
  const publicationPresets = useMemo(() => categoryPresets('Publication Contexts').slice(0, 8), []);
  const signaturePresets = useMemo(() => categoryPresets('Signature Stills').slice(0, 8), []);
  const gradientPresets = useMemo(
    () => BG_GRADIENT_PRESETS.filter(preset => ['white', 'deep', 'void', 'fog', 'blueprint', 'warm'].includes(preset.id)),
    [],
  );
  const activeBackgroundIsVideo = useMemo(
    () => BG_VIDEO_PRESETS.some(preset => preset.id === backgroundPreset),
    [backgroundPreset],
  );

  const handleRandomVideo = () => {
    if (BG_VIDEO_PRESETS.length === 0) return;
    const next = BG_VIDEO_PRESETS[Math.floor(Math.random() * BG_VIDEO_PRESETS.length)];
    setBackgroundPreset(next.id);
  };

  const applyMoleculeRecipe = (scene: MaterialScene) => {
    setMaterialScene(scene.id);
    setMaterialPreset(scene.materialPreset);
    setMaterialIntensity(scene.materialIntensity);
    setEnvironmentPreset(scene.environmentPreset);
    setAmbientLightIntensity(scene.ambientIntensity);
    setDirLightIntensity(scene.dirLightIntensity);
    setRimLightIntensity(scene.rimLightIntensity);
    setAtomTexture(scene.atomTexture);
  };

  const title = mode === 'look' ? 'Look' : mode === 'surface' ? 'Surface' : 'World';
  const subtitle = mode === 'look'
    ? `R3F ${postprocessPreset} / molecule ${colorScheme}`
    : mode === 'surface'
      ? `${renderStyle} / ${materialScene}`
      : backgroundPreset;

  return (
    <div
      data-testid="studio-control-deck"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: bottomOffset,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 148,
        padding: '0 12px',
      }}
    >
      <style>{`
        @keyframes lupi-rive-snap {
          0% { transform: scale(1); box-shadow: 0 0 16px rgba(30, 220, 224, 0.45); }
          38% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes lupi-rive-flash {
          0% { opacity: 0.9; transform: scale(0.96); }
          100% { opacity: 0; transform: scale(1.05); }
        }
        .lupi-rive-snap {
          animation: lupi-rive-snap 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .lupi-rive-flash {
          animation: lupi-rive-flash 150ms ease-out forwards;
        }
        @media (max-width: 768px) {
          .lupi-studio-deck {
            max-height: min(43vh, 330px);
          }
          .lupi-studio-knobs {
            grid-template-columns: repeat(3, minmax(82px, 1fr));
          }
        }
      `}</style>
      <div
        className="lupi-studio-deck"
        style={{
          pointerEvents: 'auto',
          width: 'min(940px, calc(100vw - 24px))',
          maxHeight: 'min(48vh, 380px)',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          background: 'linear-gradient(180deg, rgba(4,9,17,0.88), rgba(0,0,0,0.78))',
          boxShadow: '0 24px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          padding: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 8,
              height: 32,
              borderRadius: 4,
              background: 'linear-gradient(180deg, #1edce0, #f59e0b)',
              boxShadow: '0 0 16px rgba(30,220,224,0.28)',
              flexShrink: 0,
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 780, lineHeight: 1.2 }}>{title}</div>
              <div style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', lineHeight: 1.4 }}>
                {subtitle}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={iconButtonStyle}
          >
            <IconClose />
          </button>
        </div>

        {mode === 'look' && (
          <div style={stackStyle}>
            <ControlGroup
              title="R3F Quality"
              note="Post effects, tone, depth cues, and composer cost."
            >
              <div style={buttonGridStyle}>
                {LOOK_OPTIONS.map(option => (
                  <RiveButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={postprocessPreset === option.id}
                    accent={option.accent}
                    onClick={() => setPostprocessPreset(option.id)}
                  />
                ))}
              </div>
            </ControlGroup>

            <div className="lupi-studio-knobs" style={singleKnobRowStyle}>
              <RiveKnob
                label="Effect"
                value={postprocessIntensity}
                min={0}
                max={2}
                step={0.05}
                onChange={setPostprocessIntensity}
                format={value => `${Math.round(value * 100)}%`}
              />
              <InfoTile
                title="Renderer layer"
                body="This changes the R3F postprocessing stack only. Molecule geometry, material, and environment stay in Surface."
              />
            </div>

            <ControlGroup
              title="Molecule Color"
              note="Color language for atoms and properties; not lighting or material."
            >
              <div style={buttonGridStyle}>
                {SCHEME_ORDER.map(schemeId => {
                  const scheme = COLOR_SCHEMES[schemeId];
                  return (
                    <RiveButton
                      key={scheme.id}
                      label={scheme.label}
                      meta={scheme.id.slice(0, 3).toUpperCase()}
                      active={colorScheme === scheme.id}
                      accent={scheme.id === 'botanical' ? '#69f0ae' : '#1edce0'}
                      onClick={() => setColorScheme(scheme.id as ColorSchemeId)}
                    />
                  );
                })}
              </div>
            </ControlGroup>
          </div>
        )}

        {mode === 'surface' && (
          <div style={stackStyle}>
            <ControlGroup
              title="Molecule Primitives"
              note="Geometry/render style and atom material identity."
            >
              <div style={buttonGridStyle}>
                {RENDER_OPTIONS.map(option => (
                  <RiveButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={renderStyle === option.id}
                    accent={option.accent}
                    onClick={() => setRenderStyle(option.id)}
                  />
                ))}
              </div>
            </ControlGroup>

            <ControlGroup
              title="Material Recipes"
              note="Molecule material, environment, and light rig. Look grade and background stay untouched."
            >
              <div style={sceneGridStyle}>
                {materialScenes.map(scene => (
                  <SceneButton
                    key={scene.id}
                    scene={scene}
                    active={materialScene === scene.id}
                    onClick={() => applyMoleculeRecipe(scene)}
                  />
                ))}
              </div>
            </ControlGroup>

            <ControlGroup
              title="Surface x Quality"
              note="Intersection controls: how the molecule surface reads under the chosen R3F quality."
            >
            <div className="lupi-studio-knobs" style={knobGridStyle}>
              <RiveKnob label="Atom" value={atomScale} min={0.1} max={2} step={0.05} onChange={setAtomScale} format={value => value.toFixed(2)} />
              <RiveKnob label="Material" value={materialIntensity} min={0} max={1} step={0.02} onChange={setMaterialIntensity} />
              <RiveKnob label="Rough" value={surfaceRoughness} min={-1} max={1} step={0.02} onChange={setSurfaceRoughness} />
              <RiveKnob label="Polish" value={surfacePolish} min={-1} max={1} step={0.02} onChange={setSurfacePolish} />
              <RiveKnob label="Coat" value={surfaceClearcoat} min={0} max={1} step={0.02} onChange={setSurfaceClearcoat} />
              <RiveKnob label="Bond tol" value={bondTolerance} min={0} max={1.2} step={0.02} onChange={setBondTolerance} />
              <RiveButton label="Bonds" meta={showBonds ? 'ON' : 'OFF'} active={showBonds} onClick={toggleBonds} tall />
              <RiveButton label="Type color" meta="BOND" active={bondColorMode === 'type'} onClick={() => setBondColorMode('type')} tall />
              <RiveButton label="Length color" meta="BOND" active={bondColorMode === 'length'} onClick={() => setBondColorMode('length')} tall />
            </div>
            </ControlGroup>
          </div>
        )}

        {mode === 'world' && (
          <div style={stackStyle}>
            <ControlGroup title="Mathematical Fields">
              <div style={worldGridStyle}>
                {mathPresets.map(preset => (
                  <BackgroundTile key={preset.id} preset={preset} active={backgroundPreset === preset.id} onClick={() => setBackgroundPreset(preset.id)} />
                ))}
              </div>
            </ControlGroup>

            <ControlGroup title="Motion">
              <div style={worldGridStyle}>
                <RiveButton label="Random video" meta={`${BG_VIDEO_PRESETS.length} loops`} active={activeBackgroundIsVideo} onClick={handleRandomVideo} tall />
                {BG_VIDEO_PRESETS.slice(0, 7).map(preset => (
                  <BackgroundTile key={preset.id} preset={preset} active={backgroundPreset === preset.id} onClick={() => setBackgroundPreset(preset.id)} />
                ))}
              </div>
            </ControlGroup>

            <ControlGroup title="Publication">
              <div style={worldGridStyle}>
                {publicationPresets.map(preset => (
                  <BackgroundTile key={preset.id} preset={preset} active={backgroundPreset === preset.id} onClick={() => setBackgroundPreset(preset.id)} />
                ))}
              </div>
            </ControlGroup>

            <ControlGroup title="Signature">
              <div style={worldGridStyle}>
                {signaturePresets.map(preset => (
                  <BackgroundTile key={preset.id} preset={preset} active={backgroundPreset === preset.id} onClick={() => setBackgroundPreset(preset.id)} />
                ))}
              </div>
            </ControlGroup>

            <ControlGroup title="Base">
              <div style={worldGridStyle}>
                {gradientPresets.map(preset => (
                  <BackgroundTile key={preset.id} preset={preset} active={backgroundPreset === preset.id} onClick={() => setBackgroundPreset(preset.id)} />
                ))}
                <RiveButton label="Cell" meta={showCell ? 'ON' : 'OFF'} active={showCell} onClick={toggleCell} tall />
                <RiveButton label="Axes" meta={showAxes ? 'ON' : 'OFF'} active={showAxes} onClick={toggleAxes} tall />
              </div>
            </ControlGroup>
          </div>
        )}
      </div>
    </div>
  );
}

function ControlGroup({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ color: '#64748b', fontSize: 10, fontWeight: 760, textTransform: 'uppercase', letterSpacing: 0 }}>
          {title}
        </div>
        {note && (
          <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.35 }}>
            {note}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function InfoTile({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      minHeight: 88,
      display: 'grid',
      alignContent: 'center',
      gap: 6,
      padding: '10px 12px',
      border: '1px solid rgba(30,220,224,0.18)',
      borderRadius: 6,
      background: 'linear-gradient(135deg, rgba(30,220,224,0.08), rgba(9,14,22,0.84))',
      color: '#cbd5e1',
    }}>
      <div style={{ color: '#f8fafc', fontSize: 12, fontWeight: 780 }}>{title}</div>
      <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.35 }}>{body}</div>
    </div>
  );
}

function RiveButton({
  active,
  label,
  meta,
  onClick,
  accent = '#1edce0',
  tall = false,
}: {
  active?: boolean;
  label: string;
  meta?: string;
  onClick: () => void;
  accent?: string;
  tall?: boolean;
}) {
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const handleClick = () => {
    setPulse(false);
    window.requestAnimationFrame(() => setPulse(true));
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPulse(false), 260);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      className={pulse ? 'lupi-rive-snap' : undefined}
      style={{
        position: 'relative',
        minHeight: tall ? 58 : 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: tall ? '10px 12px' : '8px 10px',
        overflow: 'hidden',
        borderRadius: 6,
        border: active ? `1px solid ${accent}` : '1px solid rgba(148,163,184,0.22)',
        background: active ? `${accent}24` : 'rgba(9,14,22,0.82)',
        color: active ? '#f8fafc' : '#cbd5e1',
        boxShadow: active ? `0 0 18px ${accent}30, inset 0 0 12px ${accent}12` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 120ms ease, background 120ms ease, color 120ms ease, transform 120ms ease',
        touchAction: 'manipulation',
      }}
    >
      {pulse && <span className="lupi-rive-flash" style={{ position: 'absolute', inset: 0, background: accent, mixBlendMode: 'screen', pointerEvents: 'none' }} />}
      <span style={{
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: tall ? 'clip' : 'ellipsis',
        whiteSpace: tall ? 'normal' : 'nowrap',
        lineHeight: 1.12,
        fontSize: 12,
        fontWeight: 760,
      }}>
        {label}
      </span>
      {meta && (
        <span style={{
          flexShrink: 0,
          color: active ? accent : '#64748b',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 760,
        }}>
          {meta}
        </span>
      )}
    </button>
  );
}

function RiveKnob({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = value => value.toFixed(2),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ y: 0, value });
  const percent = clamp((value - min) / (max - min), 0, 1);
  const angle = -135 + percent * 270;
  const accent = dragging ? '#f59e0b' : '#1edce0';

  const setValue = (nextValue: number) => {
    onChange(clamp(snap(nextValue, step), min, max));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { y: event.clientY, value };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dy = dragRef.current.y - event.clientY;
    const range = max - min;
    const sensitivity = 132;
    setValue(dragRef.current.value + (dy / sensitivity) * range);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setValue(value + step);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setValue(value - step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setValue(min);
    } else if (event.key === 'End') {
      event.preventDefault();
      setValue(max);
    }
  };

  return (
    <div style={{
      minHeight: 88,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 7,
      border: `1px solid ${dragging ? 'rgba(245,158,11,0.64)' : 'rgba(148,163,184,0.2)'}`,
      borderRadius: 6,
      background: dragging ? 'rgba(245,158,11,0.08)' : 'rgba(9,14,22,0.7)',
      boxShadow: dragging ? '0 0 18px rgba(245,158,11,0.2)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      padding: 8,
    }}>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          position: 'relative',
          cursor: 'ns-resize',
          outline: 'none',
          touchAction: 'none',
          background: `conic-gradient(from 225deg, ${accent} 0deg, ${accent} ${percent * 270}deg, #1f2937 ${percent * 270}deg, #1f2937 270deg, transparent 270deg)`,
          boxShadow: dragging ? `0 0 18px ${accent}50` : '0 6px 18px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 5,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #334155, #0f172a 72%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 3,
          height: 20,
          transformOrigin: '50% 0%',
          transform: `translate(-50%, -1px) rotate(${angle + 180}deg)`,
        }}>
          <div style={{ width: 3, height: 9, borderRadius: 3, background: accent, boxShadow: `0 0 8px ${accent}` }} />
        </div>
      </div>
      <div style={{ display: 'grid', gap: 1, justifyItems: 'center', minWidth: 0 }}>
        <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 760, textTransform: 'uppercase', letterSpacing: 0 }}>{label}</span>
        <span style={{ color: dragging ? accent : '#e2e8f0', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 760 }}>{format(value)}</span>
      </div>
    </div>
  );
}

function SceneButton({ scene, active, onClick }: { scene: MaterialScene; active: boolean; onClick: () => void }) {
  const [pulse, setPulse] = useState(false);
  const accent = scene.accentColor;
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const handleClick = () => {
    setPulse(false);
    window.requestAnimationFrame(() => setPulse(true));
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPulse(false), 260);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={scene.description}
      className={pulse ? 'lupi-rive-snap' : undefined}
      style={{
        position: 'relative',
        minHeight: 68,
        padding: 10,
        overflow: 'hidden',
        display: 'grid',
        alignContent: 'space-between',
        borderRadius: 6,
        border: active ? `1px solid ${accent}` : '1px solid rgba(148,163,184,0.24)',
        background: scene.cardGradient,
        boxShadow: active ? `0 0 18px ${accent}30, inset 0 0 16px ${accent}14` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        color: '#f8fafc',
        cursor: 'pointer',
        textAlign: 'left',
        touchAction: 'manipulation',
      }}
    >
      {pulse && <span className="lupi-rive-flash" style={{ position: 'absolute', inset: 0, background: accent, mixBlendMode: 'screen', pointerEvents: 'none' }} />}
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8, position: 'relative' }}>
        <span style={{ fontSize: 12, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scene.label}</span>
        <span style={{ color: active ? accent : '#cbd5e1', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{scene.code}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8, color: '#cbd5e1', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
        <span>{scene.materialPreset === 'default' ? 'element' : scene.materialPreset}</span>
        <span>{scene.environmentPreset}</span>
      </div>
    </button>
  );
}

function BackgroundTile({ preset, active, onClick }: { preset: BgPresetWithId; active: boolean; onClick: () => void }) {
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<number | null>(null);
  const poster = getBgPoster(preset);
  const media = getBgMedia(preset);
  const badge = getBgBadge(preset) ?? (media.kind === 'video' ? 'LOOP' : undefined);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const handleClick = () => {
    setPulse(false);
    window.requestAnimationFrame(() => setPulse(true));
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPulse(false), 260);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={pulse ? 'lupi-rive-snap' : undefined}
      style={{
        position: 'relative',
        minHeight: 72,
        display: 'grid',
        alignContent: 'end',
        gap: 4,
        padding: 9,
        overflow: 'hidden',
        borderRadius: 6,
        border: active ? '1px solid #1edce0' : '1px solid rgba(148,163,184,0.22)',
        background: preset.preview
          ? `linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.72)), ${preset.preview}`
          : poster
          ? `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.74)), url("${poster}") center / cover`
          : `linear-gradient(135deg, ${preset.top}, ${preset.bottom})`,
        color: '#f8fafc',
        boxShadow: active ? '0 0 18px rgba(30,220,224,0.28), inset 0 0 12px rgba(30,220,224,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        touchAction: 'manipulation',
      }}
    >
      {pulse && <span className="lupi-rive-flash" style={{ position: 'absolute', inset: 0, background: '#1edce0', mixBlendMode: 'screen', pointerEvents: 'none' }} />}
      <span style={{ position: 'relative', fontSize: 12, fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{preset.label}</span>
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: '#cbd5e1', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{preset.id}</span>
        {badge && <span style={{ color: active ? '#1edce0' : '#f8fafc', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{badge}</span>}
      </span>
    </button>
  );
}

function IconClose() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const iconButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: '#cbd5e1',
  background: 'rgba(15,23,42,0.72)',
  border: '1px solid rgba(148,163,184,0.24)',
  borderRadius: 6,
  cursor: 'pointer',
};

const stackStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
};

const buttonGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))',
  gap: 6,
};

const sceneGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
  gap: 6,
};

const knobGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
  gap: 6,
};

const singleKnobRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(96px, 120px) minmax(180px, 1fr)',
  gap: 6,
};

const worldGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(142px, 1fr))',
  gap: 6,
};
