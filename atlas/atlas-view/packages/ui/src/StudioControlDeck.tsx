import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { ColormapName, RenderStyle } from '@atlas/core/types';
import { MATERIAL_SCENES, type MaterialScene } from '@atlas/scene/materials';
import { COLOR_SCHEMES, SCHEME_ORDER, type ColorSchemeId } from './coloring';
import { isClickSoundEnabled, playClick, setClickSoundEnabled, subscribeClickSound } from './lib/clickSound';
import { useStore, type FilterShellPreset, type FilterShellShape } from './store';
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

const PALETTE_OPTIONS: Array<{ id: ColormapName; label: string; code: string; accent: string }> = [
  { id: 'viridis', label: 'Viridis', code: 'VIR', accent: '#35d07f' },
  { id: 'plasma', label: 'Plasma', code: 'PLS', accent: '#f97316' },
  { id: 'inferno', label: 'Inferno', code: 'INF', accent: '#fb7185' },
  { id: 'coolwarm', label: 'Coolwarm', code: 'C/W', accent: '#60a5fa' },
  { id: 'turbo', label: 'Turbo', code: 'TRB', accent: '#facc15' },
  { id: 'neon', label: 'Neon', code: 'NEO', accent: '#22d3ee' },
  { id: 'cyberpunk', label: 'Cyber', code: 'CYB', accent: '#e879f9' },
  { id: 'grayscale', label: 'Gray', code: 'GRY', accent: '#cbd5e1' },
];

const FILTER_SHELL_SHAPES: Array<{ id: FilterShellShape; label: string; code: string; accent: string }> = [
  { id: 'off', label: 'Off', code: 'OFF', accent: '#64748b' },
  { id: 'sphere', label: 'Sphere', code: 'SPH', accent: '#7de9ff' },
  { id: 'box', label: 'Box', code: 'BOX', accent: '#f59e0b' },
];

const FILTER_SHELL_PRESETS: Array<{ id: FilterShellPreset; label: string; code: string; accent: string }> = [
  { id: 'haze', label: 'Haze', code: 'HAZ', accent: '#d9f7ff' },
  { id: 'cryo', label: 'Cryo', code: 'CRY', accent: '#84c9ff' },
  { id: 'prism', label: 'Prism', code: 'PRI', accent: '#ff7ab6' },
  { id: 'graphite', label: 'Graphite', code: 'GRF', accent: '#d1d5db' },
];

const MATH_FIELD_DNA: Record<string, { code: string; formula: string; accent: string }> = {
  'manifold-field': {
    code: 'MNF',
    formula: 'line(gyroid(p * alpha + beta*t)) * gamma',
    accent: '#84fbff',
  },
  'hopf-current': {
    code: 'HOP',
    formula: 'sin(lon * alpha + lat * alpha + beta*t)',
    accent: '#ffd66f',
  },
  'harmonic-bloom': {
    code: 'HRM',
    formula: 'sum(sin(k*x + beta*t)) -> bloom(gamma)',
    accent: '#b184ff',
  },
  'reaction-lattice': {
    code: 'RXN',
    formula: 'fbm(cells * alpha + beta*t) threshold gamma',
    accent: '#55f5df',
  },
  'moire-crystal': {
    code: 'MOI',
    formula: 'interference(dot(axis,p) * alpha + beta*t)',
    accent: '#f3cf66',
  },
};

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
  const colormap = useStore(s => s.colormap);
  const setColormap = useStore(s => s.setColormap);
  const colorProperty = useStore(s => s.colorProperty);
  const setColorProperty = useStore(s => s.setColorProperty);
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
  const filterShellShape = useStore(s => s.filterShellShape);
  const setFilterShellShape = useStore(s => s.setFilterShellShape);
  const filterShellPreset = useStore(s => s.filterShellPreset);
  const setFilterShellPreset = useStore(s => s.setFilterShellPreset);
  const filterShellOpacity = useStore(s => s.filterShellOpacity);
  const setFilterShellOpacity = useStore(s => s.setFilterShellOpacity);
  const filterShellRadius = useStore(s => s.filterShellRadius);
  const setFilterShellRadius = useStore(s => s.setFilterShellRadius);
  const mathFieldAlpha = useStore(s => s.mathFieldAlpha);
  const setMathFieldAlpha = useStore(s => s.setMathFieldAlpha);
  const mathFieldBeta = useStore(s => s.mathFieldBeta);
  const setMathFieldBeta = useStore(s => s.setMathFieldBeta);
  const mathFieldGamma = useStore(s => s.mathFieldGamma);
  const setMathFieldGamma = useStore(s => s.setMathFieldGamma);
  const resetMathFieldParams = useStore(s => s.resetMathFieldParams);
  const showAxes = useStore(s => s.showAxes);
  const toggleAxes = useStore(s => s.toggleAxes);
  const showCell = useStore(s => s.showCell);
  const toggleCell = useStore(s => s.toggleCell);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);

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
  const availableProperties = useMemo(() => {
    const props = file?.trajectory.frames[frame]?.properties;
    return props ? Array.from(props.keys()) : [];
  }, [file, frame]);
  const activeMathPreset = useMemo(
    () => mathPresets.find(preset => preset.id === backgroundPreset) ?? mathPresets[0],
    [backgroundPreset, mathPresets],
  );
  const activeMathDna = activeMathPreset ? MATH_FIELD_DNA[activeMathPreset.id] : undefined;
  const activateMathPreset = (presetId = activeMathPreset?.id) => {
    if (presetId) setBackgroundPreset(presetId);
  };
  const setMathControl = (setter: (value: number) => void) => (value: number) => {
    activateMathPreset();
    setter(value);
  };

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

  // Procedural-click preference (module-local, not store state — see lib/clickSound).
  const [clickSound, setClickSound] = useState(isClickSoundEnabled());
  useEffect(() => subscribeClickSound(setClickSound), []);
  const toggleClickSound = () => {
    const next = !clickSound;
    setClickSoundEnabled(next);
    if (next) playClick(); // preview the tick when enabling, inside this user gesture
  };

  const applyColorScheme = (scheme: ColorSchemeId) => {
    setColorScheme(scheme);
    if (scheme === 'property' && !colorProperty && availableProperties.length > 0) {
      setColorProperty(availableProperties[0]);
    }
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
        .lupi-studio-deck {
          --lupi-studio-deck-max-height: min(38vh, 330px);
        }
        @media (max-width: 768px) {
          .lupi-studio-deck {
            --lupi-studio-deck-max-height: clamp(220px, 31dvh, 288px);
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
          maxHeight: 'var(--lupi-studio-deck-max-height)',
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
                      onClick={() => applyColorScheme(scheme.id as ColorSchemeId)}
                    />
                  );
                })}
              </div>
            </ControlGroup>

            <ControlGroup title="Palette">
              <div style={buttonGridStyle}>
                {PALETTE_OPTIONS.map(option => (
                  <RiveButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={colormap === option.id}
                    accent={option.accent}
                    onClick={() => setColormap(option.id)}
                  />
                ))}
              </div>
            </ControlGroup>

            {availableProperties.length > 0 && (
              <ControlGroup title="Property Field">
                <div style={buttonGridStyle}>
                  {availableProperties.slice(0, 8).map(property => (
                    <RiveButton
                      key={property}
                      label={property}
                      meta="PROP"
                      active={colorProperty === property}
                      accent="#f59e0b"
                      onClick={() => {
                        setColorProperty(property);
                        setColorScheme('property');
                      }}
                    />
                  ))}
                </div>
              </ControlGroup>
            )}

            <ControlGroup
              title="Feel"
              note="Procedural click on button presses (off by default). The spring-press animation follows your system 'reduce motion' setting automatically."
            >
              <div style={buttonGridStyle}>
                <RiveButton
                  label="Click sound"
                  meta={clickSound ? 'ON' : 'OFF'}
                  active={clickSound}
                  onClick={toggleClickSound}
                  tall
                />
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
            <ControlGroup title="Math Engine">
              <div style={mathEngineLayoutStyle}>
                <div style={mathLibraryGridStyle}>
                  {mathPresets.map(preset => (
                    <MathPresetButton
                      key={preset.id}
                      preset={preset}
                      active={backgroundPreset === preset.id}
                      dna={MATH_FIELD_DNA[preset.id]}
                      onClick={() => setBackgroundPreset(preset.id)}
                    />
                  ))}
                </div>
                {activeMathPreset && activeMathDna && (
                  <MathDnaTile
                    title={activeMathPreset.label}
                    code={activeMathDna.code}
                    formula={activeMathDna.formula}
                    accent={activeMathDna.accent}
                    alpha={mathFieldAlpha}
                    beta={mathFieldBeta}
                    gamma={mathFieldGamma}
                  />
                )}
              </div>
              <div className="lupi-studio-knobs" style={mathKnobRowStyle}>
                <RiveKnob label="Alpha" value={mathFieldAlpha} min={0.1} max={3} step={0.1} onChange={setMathControl(setMathFieldAlpha)} format={value => value.toFixed(1)} />
                <RiveKnob label="Beta" value={mathFieldBeta} min={0.1} max={3} step={0.1} onChange={setMathControl(setMathFieldBeta)} format={value => value.toFixed(1)} />
                <RiveKnob label="Gamma" value={mathFieldGamma} min={0.1} max={3} step={0.1} onChange={setMathControl(setMathFieldGamma)} format={value => value.toFixed(1)} />
                <RiveButton
                  label="Reset"
                  meta="1.0"
                  active={mathFieldAlpha === 1 && mathFieldBeta === 1 && mathFieldGamma === 1}
                  accent={activeMathDna?.accent ?? '#1edce0'}
                  onClick={() => {
                    activateMathPreset();
                    resetMathFieldParams();
                  }}
                  tall
                />
              </div>
            </ControlGroup>

            <ControlGroup title="Molecule Filter">
              <div style={worldGridStyle}>
                {FILTER_SHELL_SHAPES.map(option => (
                  <RiveButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={filterShellShape === option.id}
                    accent={option.accent}
                    onClick={() => setFilterShellShape(option.id)}
                    tall
                  />
                ))}
                {FILTER_SHELL_PRESETS.map(option => (
                  <RiveButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={filterShellPreset === option.id}
                    accent={option.accent}
                    onClick={() => setFilterShellPreset(option.id)}
                    tall
                  />
                ))}
              </div>
              <div className="lupi-studio-knobs" style={filterKnobRowStyle}>
                <RiveKnob label="Tint" value={filterShellOpacity} min={0} max={0.65} step={0.01} onChange={setFilterShellOpacity} format={value => `${Math.round(value * 100)}%`} />
                <RiveKnob label="Radius" value={filterShellRadius} min={0.75} max={1.6} step={0.01} onChange={setFilterShellRadius} format={value => value.toFixed(2)} />
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

// ─── Studio-Quality Spring Physics Hook ───────────────────────────────
function useStudioSpring(targetValue: number, tension = 220, friction = 14) {
  const [value, setValue] = useState(targetValue);
  const velocityRef = useRef(0);
  const positionRef = useRef(targetValue);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const update = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.032);
      lastTime = now;

      const position = positionRef.current;
      const velocity = velocityRef.current;

      const force = tension * (targetValue - position);
      const damping = friction * velocity;
      const acceleration = force - damping;

      const newVelocity = velocity + acceleration * dt;
      const newPosition = position + newVelocity * dt;

      positionRef.current = newPosition;
      velocityRef.current = newVelocity;
      setValue(newPosition);

      if (Math.abs(targetValue - newPosition) > 0.0005 || Math.abs(newVelocity) > 0.0005) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [targetValue, tension, friction]);

  return { value, velocity: velocityRef.current };
}

// ─── Advanced Physical Modeling Audio Synthesizer ─────────────────────
const playPhysicalSound = (type: 'leica_click' | 'relay_clank' | 'plasma_crackle' | 'needle_scrape') => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'leica_click') {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.015);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(8, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    }
    else if (type === 'relay_clank') {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(95, now);
      carrier.frequency.exponentialRampToValueAtTime(32, now + 0.18);

      modulator.type = 'sawtooth';
      modulator.frequency.setValueAtTime(265, now);

      modGain.gain.setValueAtTime(300, now);
      modGain.gain.exponentialRampToValueAtTime(1, now + 0.12);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gain);
      gain.connect(ctx.destination);

      modulator.start(now);
      carrier.start(now);
      modulator.stop(now + 0.22);
      carrier.stop(now + 0.22);
    }
    else if (type === 'plasma_crackle') {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3500, now);
      filter.Q.value = 12;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + 0.08);
    }
    else if (type === 'needle_scrape') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.1);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    // sound synthesis failed
  }
};

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
  const targetAngle = -135 + percent * 270;
  const accent = dragging ? '#f59e0b' : '#1edce0';

  // 1. Physical Spring Wobble on Dial Rotation
  const springAngle = useStudioSpring(targetAngle, 240, 16);
  const speed = Math.abs(springAngle.velocity);

  // 2. Leica mechanical ticks on notch crossings
  const lastStepPlayed = useRef(Math.round(value / step));
  useEffect(() => {
    const currentStep = Math.round(value / step);
    if (currentStep !== lastStepPlayed.current) {
      lastStepPlayed.current = currentStep;
      playPhysicalSound('leica_click');
    }
  }, [value, step]);

  // 3. Disney-quality Squash & Stretch along momentum vector
  const stretchAmount = Math.min(0.2, speed * 0.0002);
  const scaleX = 1 + stretchAmount;
  const scaleY = 1 - stretchAmount;

  const setValue = (nextValue: number) => {
    onChange(clamp(snap(nextValue, step), min, max));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { y: event.clientY, value };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    playPhysicalSound('leica_click');
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
    // Snap haptic ring on release
    playPhysicalSound('leica_click');
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
          inset: 4,
          borderRadius: '50%',
          transform: `rotate(${springAngle.value}deg) scale(${scaleX}, ${scaleY})`,
          boxShadow: speed > 10 ? `0 0 12px ${accent}40` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'box-shadow 0.15s ease',
        }}>
          <div style={{
            position: 'absolute',
            inset: 1,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #334155, #0f172a 72%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position: 'absolute',
            top: 2,
            width: 3,
            height: 9,
            borderRadius: 3,
            background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }} />
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

function MathPresetButton({
  preset,
  active,
  dna,
  onClick,
}: {
  preset: BgPresetWithId;
  active: boolean;
  dna?: { code: string; formula: string; accent: string };
  onClick: () => void;
}) {
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<number | null>(null);
  const accent = dna?.accent ?? '#1edce0';

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
      title={dna?.formula ?? preset.label}
      className={pulse ? 'lupi-rive-snap' : undefined}
      style={{
        position: 'relative',
        minHeight: 72,
        display: 'grid',
        alignContent: 'space-between',
        gap: 6,
        padding: 10,
        overflow: 'hidden',
        borderRadius: 6,
        border: active ? `1px solid ${accent}` : '1px solid rgba(148,163,184,0.22)',
        background: preset.preview
          ? `linear-gradient(180deg, rgba(3,7,18,0.05), rgba(3,7,18,0.78)), ${preset.preview}`
          : `linear-gradient(135deg, ${preset.top}, ${preset.bottom})`,
        color: '#f8fafc',
        boxShadow: active ? `0 0 18px ${accent}34, inset 0 0 14px ${accent}16` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        touchAction: 'manipulation',
      }}
    >
      {pulse && <span className="lupi-rive-flash" style={{ position: 'absolute', inset: 0, background: accent, mixBlendMode: 'screen', pointerEvents: 'none' }} />}
      <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{preset.label}</span>
        <span style={{ flexShrink: 0, color: active ? accent : '#cbd5e1', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{dna?.code ?? 'MTH'}</span>
      </span>
      <span style={{ position: 'relative', color: '#cbd5e1', fontSize: 10, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {dna?.formula ?? preset.id}
      </span>
    </button>
  );
}

function MathDnaTile({
  title,
  code,
  formula,
  accent,
  alpha,
  beta,
  gamma,
}: {
  title: string;
  code: string;
  formula: string;
  accent: string;
  alpha: number;
  beta: number;
  gamma: number;
}) {
  return (
    <div style={{
      minHeight: 150,
      display: 'grid',
      alignContent: 'space-between',
      gap: 10,
      padding: 12,
      border: `1px solid ${accent}55`,
      borderRadius: 6,
      background: `linear-gradient(135deg, ${accent}18, rgba(9,14,22,0.88))`,
      boxShadow: `inset 0 0 18px ${accent}10`,
      color: '#cbd5e1',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 10, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#f8fafc', fontSize: 12, fontWeight: 820, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ color: accent, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 820 }}>{code}</div>
        </div>
        <div style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: 6,
          border: `1px solid ${accent}66`,
          background: `conic-gradient(from 180deg, ${accent}, rgba(255,255,255,0.08), ${accent})`,
          boxShadow: `0 0 18px ${accent}24`,
        }} />
      </div>
      <div style={{
        color: '#e2e8f0',
        fontSize: 11,
        lineHeight: 1.45,
        fontFamily: 'var(--font-mono)',
        wordBreak: 'break-word',
      }}>
        {formula}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        <MathParamChip label="A" value={alpha} accent={accent} />
        <MathParamChip label="B" value={beta} accent={accent} />
        <MathParamChip label="C" value={gamma} accent={accent} />
      </div>
    </div>
  );
}

function MathParamChip({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      display: 'grid',
      gap: 2,
      padding: '6px 7px',
      border: '1px solid rgba(148,163,184,0.18)',
      borderRadius: 5,
      background: 'rgba(2,6,23,0.56)',
      minWidth: 0,
    }}>
      <span style={{ color: accent, fontSize: 10, fontWeight: 820, fontFamily: 'var(--font-mono)' }}>{label}</span>
      <span style={{ color: '#f8fafc', fontSize: 11, fontWeight: 820, fontFamily: 'var(--font-mono)' }}>{value.toFixed(1)}</span>
    </div>
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

const filterKnobRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(92px, 130px))',
  gap: 6,
};

const mathEngineLayoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 6,
};

const mathLibraryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(142px, 1fr))',
  gap: 6,
};

const mathKnobRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 130px))',
  gap: 6,
};

const worldGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(142px, 1fr))',
  gap: 6,
};
