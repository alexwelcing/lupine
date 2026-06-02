import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { getElementSpec } from '@atlas/core';
import type { ColormapName, RenderStyle } from '@atlas/core/types';
import { MATERIAL_SCENES, type MaterialScene } from '@atlas/scene/materials';
import { COLOR_SCHEMES, SCHEME_ORDER, type ColorSchemeId } from './coloring';
import { isClickSoundEnabled, playClick, setClickSoundEnabled, subscribeClickSound } from './lib/clickSound';
import { useStore, type FilterShellPreset, type FilterShellShape } from './store';
import {
  BG_GRADIENT_PRESETS,
  BG_TEXTURE_CATEGORIES,
  BG_VIDEO_PRESETS,
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

const PALETTE_OPTIONS: Array<{ id: ColormapName; label: string; accent: string }> = [
  { id: 'viridis', label: 'Viridis', accent: '#35d07f' },
  { id: 'plasma', label: 'Plasma', accent: '#f97316' },
  { id: 'inferno', label: 'Inferno', accent: '#fb7185' },
  { id: 'coolwarm', label: 'Coolwarm', accent: '#60a5fa' },
  { id: 'turbo', label: 'Turbo', accent: '#facc15' },
  { id: 'neon', label: 'Neon', accent: '#22d3ee' },
  { id: 'cyberpunk', label: 'Cyber', accent: '#e879f9' },
  { id: 'grayscale', label: 'Gray', accent: '#cbd5e1' },
];

const COLORMAP_PREVIEWS: Partial<Record<ColormapName, string>> = {
  viridis: 'linear-gradient(90deg, #440154, #21918c, #fde725)',
  plasma: 'linear-gradient(90deg, #0d0887, #cc4778, #f0f921)',
  inferno: 'linear-gradient(90deg, #000004, #bc3754, #fcffa4)',
  coolwarm: 'linear-gradient(90deg, #3b4cc0, #f7f7f7, #b40426)',
  turbo: 'linear-gradient(90deg, #30123b, #1ae4b6, #faba39, #7a0403)',
  neon: 'linear-gradient(90deg, #00f5ff, #ff00f5, #faff00)',
  cyberpunk: 'linear-gradient(90deg, #00e5ff, #7c3aed, #ff3b8d)',
  grayscale: 'linear-gradient(90deg, #111827, #94a3b8, #f8fafc)',
};

const FILTER_SHELL_SHAPES: Array<{ id: FilterShellShape; label: string; code: string; accent: string }> = [
  { id: 'off', label: 'Off', code: 'OFF', accent: '#64748b' },
  { id: 'sphere', label: 'Sphere', code: 'SPH', accent: '#7de9ff' },
  { id: 'cube', label: 'Cube', code: 'CUB', accent: '#f59e0b' },
];

const FILTER_SHELL_PRESETS: Array<{ id: FilterShellPreset; label: string; code: string; accent: string }> = [
  { id: 'haze', label: 'Haze', code: 'HAZ', accent: '#d9f7ff' },
  { id: 'cryo', label: 'Cryo', code: 'CRY', accent: '#84c9ff' },
  { id: 'prism', label: 'Prism', code: 'PRI', accent: '#ff7ab6' },
  { id: 'graphite', label: 'Graphite', code: 'GRF', accent: '#d1d5db' },
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
  bottomOffset = 0,
  maxHeight = 'none',
  variant = 'overlay',
}: {
  mode: StudioDeckMode;
  onClose: () => void;
  bottomOffset?: number;
  maxHeight?: string;
  variant?: 'overlay' | 'drawer';
}) {
  const isDrawer = variant === 'drawer';
  const postprocessPreset = useStore(s => s.postprocessPreset);
  const setPostprocessPreset = useStore(s => s.setPostprocessPreset);
  const postprocessIntensity = useStore(s => s.postprocessIntensity);
  const setPostprocessIntensity = useStore(s => s.setPostprocessIntensity);
  const colorScheme = useStore(s => s.colorScheme);
  const setColorScheme = useStore(s => s.setColorScheme);
  const colorProperty = useStore(s => s.colorProperty);
  const setColorProperty = useStore(s => s.setColorProperty);
  const colormap = useStore(s => s.colormap);
  const setColormap = useStore(s => s.setColormap);
  const uniformAtomColor = useStore(s => s.uniformAtomColor);
  const setUniformAtomColor = useStore(s => s.setUniformAtomColor);
  const elementColorOverrides = useStore(s => s.elementColorOverrides);
  const setElementColorOverride = useStore(s => s.setElementColorOverride);
  const resetElementColorOverride = useStore(s => s.resetElementColorOverride);
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
  const showAxes = useStore(s => s.showAxes);
  const toggleAxes = useStore(s => s.toggleAxes);
  const showCell = useStore(s => s.showCell);
  const toggleCell = useStore(s => s.toggleCell);
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const [selectedAtomicNumber, setSelectedAtomicNumber] = useState<number | null>(null);

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
  const backgroundGroups = useMemo(() => [
    { label: 'Math', presets: mathPresets },
    { label: 'Motion', presets: BG_VIDEO_PRESETS.slice(0, 8) },
    { label: 'Publication', presets: publicationPresets },
    { label: 'Signature', presets: signaturePresets },
    { label: 'Base', presets: gradientPresets },
  ], [gradientPresets, mathPresets, publicationPresets, signaturePresets]);
  const selectedMaterialScene = useMemo(
    () => materialScenes.find(scene => scene.id === materialScene) ?? materialScenes[0],
    [materialScene, materialScenes],
  );
  const selectedBackground = useMemo(() => {
    for (const group of backgroundGroups) {
      const preset = group.presets.find(item => item.id === backgroundPreset);
      if (preset) return preset;
    }
    return gradientPresets[0];
  }, [backgroundGroups, backgroundPreset, gradientPresets]);
  const activeBackgroundIsVideo = useMemo(
    () => BG_VIDEO_PRESETS.some(preset => preset.id === backgroundPreset),
    [backgroundPreset],
  );
  const availableProperties = useMemo(() => {
    const props = file?.trajectory.frames[frame]?.properties;
    return props ? Array.from(props.keys()) : [];
  }, [file, frame]);
  const presentElements = useMemo(() => {
    const types = file?.trajectory.frames[frame]?.types;
    if (!types) return [];
    const atomicNumbers = new Set<number>();
    for (let i = 0; i < types.length; i++) atomicNumbers.add(types[i]);
    return Array.from(atomicNumbers)
      .sort((a, b) => a - b)
      .map(atomicNumber => ({ atomicNumber, spec: getElementSpec(atomicNumber) }));
  }, [file, frame]);
  const activeElement = presentElements.find(element => element.atomicNumber === selectedAtomicNumber) ?? presentElements[0] ?? null;
  const activeElementColor = activeElement
    ? elementColorOverrides[activeElement.atomicNumber] ?? activeElement.spec.color
    : uniformAtomColor;
  const activeElementHasOverride = activeElement
    ? Boolean(elementColorOverrides[activeElement.atomicNumber])
    : false;

  useEffect(() => {
    if (presentElements.length === 0) {
      if (selectedAtomicNumber !== null) setSelectedAtomicNumber(null);
      return;
    }
    if (!presentElements.some(element => element.atomicNumber === selectedAtomicNumber)) {
      setSelectedAtomicNumber(presentElements[0].atomicNumber);
    }
  }, [presentElements, selectedAtomicNumber]);

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

  const applyColorScheme = (scheme: ColorSchemeId) => {
    setColorScheme(scheme);
    if (scheme === 'property' && !colorProperty && availableProperties.length > 0) {
      setColorProperty(availableProperties[0]);
    }
  };

  const applyUniformAtomColor = (color: string) => {
    setUniformAtomColor(color);
    setColorScheme('uniform');
  };

  const applyElementColor = (atomicNumber: number, color: string) => {
    setElementColorOverride(atomicNumber, color);
    setColorScheme('element');
  };

  const applyColormap = (map: ColormapName) => {
    setColormap(map);
    if (colorScheme !== 'property') {
      setColorScheme('family');
    }
  };

  // Procedural-click preference (module-local, not store state — see lib/clickSound).
  const [clickSound, setClickSound] = useState(isClickSoundEnabled());
  useEffect(() => subscribeClickSound(setClickSound), []);
  const toggleClickSound = () => {
    const next = !clickSound;
    setClickSoundEnabled(next);
    if (next) playClick(); // preview the tick when enabling, inside this user gesture
  };

  const title = mode === 'look' ? 'Look' : mode === 'surface' ? 'Surface' : 'World';
  const subtitle = mode === 'look'
    ? `${postprocessPreset} grade / ${colorScheme} color`
    : mode === 'surface'
      ? `${renderStyle} / ${materialScene}`
      : backgroundPreset;

  return (
    <div
      data-testid="studio-control-deck"
      style={{
        position: isDrawer ? 'relative' : 'absolute',
        left: isDrawer ? undefined : 0,
        right: isDrawer ? undefined : 0,
        bottom: isDrawer ? undefined : bottomOffset,
        display: 'flex',
        justifyContent: isDrawer ? 'stretch' : 'center',
        pointerEvents: isDrawer ? 'auto' : 'none',
        zIndex: isDrawer ? undefined : 148,
        padding: isDrawer ? 0 : '0 12px',
        minHeight: 0,
        height: isDrawer ? '100%' : undefined,
      }}
    >
      <style>{`
        @keyframes lupi-press-snap {
          0% { transform: scale(1); box-shadow: 0 0 16px rgba(30, 220, 224, 0.42); }
          38% { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes lupi-press-flash {
          0% { opacity: 0.78; transform: scale(0.96); }
          100% { opacity: 0; transform: scale(1.06); }
        }
        .lupi-press-snap {
          animation: lupi-press-snap 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .lupi-press-flash {
          animation: lupi-press-flash 150ms ease-out forwards;
        }
        .lupi-rive-dial:focus-visible {
          outline: 2px solid rgba(30, 220, 224, 0.85);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .lupi-press-snap,
          .lupi-press-flash {
            animation: none;
          }
          .lupi-press-flash {
            display: none;
          }
        }
        .lupi-deck-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
          align-items: stretch;
        }
        .lupi-studio-segments {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
          gap: 4px;
        }
        .lupi-studio-slider-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
        }
        .lupi-native-color::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .lupi-native-color::-webkit-color-swatch {
          border: 0;
          border-radius: 5px;
        }
        .lupi-studio-deck-drawer .lupi-deck-grid {
          grid-template-columns: 1fr;
          gap: 6px;
        }
        @media (max-width: 768px) {
          .lupi-deck-grid {
            gap: 5px;
          }
          .lupi-studio-slider-grid {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }
      `}</style>
      <div
        className={isDrawer ? 'lupi-studio-deck lupi-studio-deck-drawer' : 'lupi-studio-deck'}
        style={{
          pointerEvents: 'auto',
          width: isDrawer ? '100%' : 'min(940px, calc(100vw - 24px))',
          height: isDrawer ? '100%' : undefined,
          maxHeight: isDrawer ? 'none' : maxHeight,
          overflowY: isDrawer ? 'auto' : 'hidden',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          border: isDrawer ? 'none' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: isDrawer ? 0 : 8,
          background: isDrawer ? 'transparent' : 'linear-gradient(180deg, rgba(4,9,17,0.88), rgba(0,0,0,0.78))',
          boxShadow: isDrawer ? 'none' : '0 24px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.08)',
          backdropFilter: isDrawer ? 'none' : 'blur(18px)',
          WebkitBackdropFilter: isDrawer ? 'none' : 'blur(18px)',
          padding: isDrawer ? 8 : 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 6,
              height: 26,
              borderRadius: 3,
              background: 'linear-gradient(180deg, #1edce0, #f59e0b)',
              boxShadow: '0 0 16px rgba(30,220,224,0.28)',
              flexShrink: 0,
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#f8fafc', fontSize: 12, fontWeight: 780, lineHeight: 1.1 }}>{title}</div>
              <div style={{ color: '#94a3b8', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', lineHeight: 1.25 }}>
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
          <div className="lupi-deck-grid">
            <ControlGroup title="Grade">
              <div className="lupi-studio-segments">
                {LOOK_OPTIONS.map(option => (
                  <SegmentButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={postprocessPreset === option.id}
                    accent={option.accent}
                    onClick={() => setPostprocessPreset(option.id)}
                  />
                ))}
              </div>
              <CompactSlider
                label="Effect"
                value={postprocessIntensity}
                min={0}
                max={2}
                step={0.05}
                onChange={setPostprocessIntensity}
                format={value => `${Math.round(value * 100)}%`}
              />
            </ControlGroup>

            <ControlGroup title="Atoms">
              <div className="lupi-studio-segments">
                {SCHEME_ORDER.map(schemeId => {
                  const scheme = COLOR_SCHEMES[schemeId];
                  return (
                    <SegmentButton
                      key={scheme.id}
                      label={scheme.label}
                      active={colorScheme === scheme.id}
                      accent={scheme.id === 'botanical' ? '#69f0ae' : '#1edce0'}
                      onClick={() => applyColorScheme(scheme.id as ColorSchemeId)}
                    />
                  );
                })}
              </div>
              {availableProperties.length > 0 && (
                <CompactSelect
                  label="Property"
                  value={colorProperty ?? ''}
                  onChange={(value) => {
                    setColorProperty(value || null);
                    if (value) setColorScheme('property');
                  }}
                  options={availableProperties.slice(0, 12).map(property => ({ value: property, label: property }))}
                  placeholder="Property"
                />
              )}
            </ControlGroup>

            <ControlGroup title="Color">
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.1fr)', gap: 5, minWidth: 0 }}>
                <ColorPicker
                  label="Uniform"
                  value={uniformAtomColor}
                  active={colorScheme === 'uniform'}
                  onChange={applyUniformAtomColor}
                />
                {activeElement && (
                  <ElementColorPicker
                    active={colorScheme === 'element' || activeElementHasOverride}
                    atomicNumber={activeElement.atomicNumber}
                    value={activeElementColor}
                    options={presentElements.map(element => ({
                      value: element.atomicNumber,
                      label: `${element.spec.symbol} ${element.atomicNumber}`,
                    }))}
                    overridden={activeElementHasOverride}
                    onSelect={setSelectedAtomicNumber}
                    onChange={(color) => applyElementColor(activeElement.atomicNumber, color)}
                    onReset={() => {
                      resetElementColorOverride(activeElement.atomicNumber);
                      setColorScheme('element');
                    }}
                  />
                )}
              </div>
              <div style={paletteRailStyle}>
                {PALETTE_OPTIONS.map(option => (
                  <SwatchButton
                    key={option.id}
                    label={option.label}
                    active={colormap === option.id && colorScheme !== 'uniform'}
                    background={COLORMAP_PREVIEWS[option.id] ?? option.accent}
                    onClick={() => applyColormap(option.id)}
                  />
                ))}
              </div>
              <SegmentButton
                label={clickSound ? 'Clicks on' : 'Clicks off'}
                active={clickSound}
                accent="#f59e0b"
                onClick={toggleClickSound}
              />
            </ControlGroup>
          </div>
        )}

        {mode === 'surface' && (
          <div className="lupi-deck-grid">
            <ControlGroup title="Shape">
              <div className="lupi-studio-segments">
                {RENDER_OPTIONS.map(option => (
                  <SegmentButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={renderStyle === option.id}
                    accent={option.accent}
                    onClick={() => setRenderStyle(option.id)}
                  />
                ))}
              </div>
              <CompactSelect
                label="Recipe"
                value={materialScene}
                onChange={(value) => {
                  const scene = materialScenes.find(item => item.id === value);
                  if (scene) applyMoleculeRecipe(scene);
                }}
                options={materialScenes.map(scene => ({ value: scene.id, label: `${scene.label} / ${scene.materialPreset}` }))}
              />
              {selectedMaterialScene && (
                <div style={{
                  height: 22,
                  borderRadius: 5,
                  border: `1px solid ${selectedMaterialScene.accentColor}66`,
                  background: selectedMaterialScene.cardGradient,
                  boxShadow: `inset 0 0 18px ${selectedMaterialScene.accentColor}18`,
                }} />
              )}
            </ControlGroup>

            <ControlGroup title="Material">
              <div className="lupi-studio-slider-grid">
                <CompactSlider label="Atom" value={atomScale} min={0.1} max={2} step={0.05} onChange={setAtomScale} format={value => value.toFixed(2)} />
                <CompactSlider label="Mix" value={materialIntensity} min={0} max={1} step={0.02} onChange={setMaterialIntensity} />
                <CompactSlider label="Rough" value={surfaceRoughness} min={-1} max={1} step={0.02} onChange={setSurfaceRoughness} />
                <CompactSlider label="Polish" value={surfacePolish} min={-1} max={1} step={0.02} onChange={setSurfacePolish} />
                <CompactSlider label="Coat" value={surfaceClearcoat} min={0} max={1} step={0.02} onChange={setSurfaceClearcoat} />
                <CompactSlider label="Bond" value={bondTolerance} min={0} max={1.2} step={0.02} onChange={setBondTolerance} format={value => value.toFixed(2)} />
              </div>
            </ControlGroup>

            <ControlGroup title="Bonds">
              <div className="lupi-studio-segments">
                <SegmentButton label={showBonds ? 'Bonds on' : 'Bonds off'} active={showBonds} accent="#1edce0" onClick={toggleBonds} />
                <SegmentButton label="Type" active={bondColorMode === 'type'} accent="#7de9ff" onClick={() => setBondColorMode('type')} />
                <SegmentButton label="Length" active={bondColorMode === 'length'} accent="#f59e0b" onClick={() => setBondColorMode('length')} />
              </div>
              <ColorPicker
                label="Uniform"
                value={uniformAtomColor}
                active={colorScheme === 'uniform'}
                onChange={applyUniformAtomColor}
              />
            </ControlGroup>
          </div>
        )}

        {mode === 'world' && (
          <div className="lupi-deck-grid">
            <ControlGroup title="Backdrop">
              <BackgroundSelect
                value={backgroundPreset}
                groups={backgroundGroups}
                onChange={setBackgroundPreset}
              />
              {selectedBackground && (
                <div style={{
                  height: 28,
                  borderRadius: 6,
                  border: '1px solid rgba(148,163,184,0.22)',
                  background: selectedBackground.preview
                    ? `linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.64)), ${selectedBackground.preview}`
                    : `linear-gradient(135deg, ${selectedBackground.top}, ${selectedBackground.bottom})`,
                  boxShadow: activeBackgroundIsVideo ? '0 0 18px rgba(30,220,224,0.22)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }} />
              )}
            </ControlGroup>

            <ControlGroup title="Shell">
              <div className="lupi-studio-segments">
                {FILTER_SHELL_SHAPES.map(option => (
                  <SegmentButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={filterShellShape === option.id}
                    accent={option.accent}
                    onClick={() => setFilterShellShape(option.id)}
                  />
                ))}
              </div>
              <div className="lupi-studio-segments">
                {FILTER_SHELL_PRESETS.map(option => (
                  <SegmentButton
                    key={option.id}
                    label={option.label}
                    meta={option.code}
                    active={filterShellPreset === option.id}
                    accent={option.accent}
                    onClick={() => setFilterShellPreset(option.id)}
                  />
                ))}
              </div>
              <div className="lupi-studio-slider-grid">
                <RiveKnob
                  label="Tint"
                  value={filterShellOpacity}
                  min={0}
                  max={0.65}
                  step={0.01}
                  onChange={setFilterShellOpacity}
                  format={value => `${Math.round(value * 100)}%`}
                />
                <RiveKnob
                  label="Radius"
                  value={filterShellRadius}
                  min={0.75}
                  max={1.6}
                  step={0.01}
                  onChange={setFilterShellRadius}
                  format={value => value.toFixed(2)}
                />
              </div>
            </ControlGroup>

            <ControlGroup title="Motion">
              <div className="lupi-studio-segments">
                <SegmentButton label="Random loop" active={activeBackgroundIsVideo} accent="#f59e0b" onClick={handleRandomVideo} />
                <SegmentButton label={showCell ? 'Cell on' : 'Cell off'} active={showCell} accent="#7de9ff" onClick={toggleCell} />
                <SegmentButton label={showAxes ? 'Axes on' : 'Axes off'} active={showAxes} accent="#a7f3d0" onClick={toggleAxes} />
              </div>
            </ControlGroup>

            <ControlGroup title="Color">
              <ColorPicker
                label="Uniform"
                value={uniformAtomColor}
                active={colorScheme === 'uniform'}
                onChange={applyUniformAtomColor}
              />
              <div style={paletteRailStyle}>
                {PALETTE_OPTIONS.map(option => (
                  <SwatchButton
                    key={option.id}
                    label={option.label}
                    active={colormap === option.id && colorScheme !== 'uniform'}
                    background={COLORMAP_PREVIEWS[option.id] ?? option.accent}
                    onClick={() => applyColormap(option.id)}
                  />
                ))}
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
    <section title={note} style={{ display: 'grid', gap: 4, alignContent: 'start', minWidth: 0 }}>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ color: '#64748b', fontSize: 9, fontWeight: 760, textTransform: 'uppercase', letterSpacing: 0, lineHeight: 1 }}>
          {title}
        </div>
      </div>
      {children}
    </section>
  );
}

function SegmentButton({
  active,
  label,
  meta,
  onClick,
  accent = '#1edce0',
}: {
  active?: boolean;
  label: string;
  meta?: string;
  onClick: () => void;
  accent?: string;
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
      aria-label={meta ? `${label} ${meta}` : label}
      aria-pressed={active}
      className={pulse ? 'lupi-press-snap' : undefined}
      style={{
        position: 'relative',
        minWidth: 0,
        width: '100%',
        minHeight: 34,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 5,
        padding: '6px 7px',
        height: 'auto',
        overflow: 'visible',
        borderRadius: 6,
        border: active ? `1px solid ${accent}` : '1px solid rgba(148,163,184,0.2)',
        background: active
          ? `linear-gradient(135deg, ${accent}2b, rgba(9,14,22,0.86))`
          : 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(3,7,18,0.78))',
        color: active ? '#f8fafc' : '#cbd5e1',
        boxShadow: active ? `0 0 14px ${accent}24, inset 0 0 10px ${accent}10` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 760,
        lineHeight: 1.05,
        whiteSpace: 'normal',
        letterSpacing: 0,
        touchAction: 'manipulation',
      }}
    >
      {pulse && <span className="lupi-press-flash" style={{ position: 'absolute', inset: 0, borderRadius: 6, background: accent, mixBlendMode: 'screen', pointerEvents: 'none' }} />}
      <span style={{ minWidth: 0, overflow: 'visible', textOverflow: 'clip', whiteSpace: 'normal', position: 'relative' }}>
        {label}
      </span>
      {meta && (
        <span style={{
          position: 'relative',
          flexShrink: 0,
          color: active ? accent : '#64748b',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 820,
        }}>
          {meta}
        </span>
      )}
    </button>
  );
}

function CompactSlider({
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
  const percent = clamp((value - min) / (max - min), 0, 1);
  return (
    <label style={{
      display: 'grid',
      gap: 2,
      minWidth: 0,
      padding: '4px 5px',
      borderRadius: 5,
      border: '1px solid rgba(148,163,184,0.18)',
      background: 'rgba(9,14,22,0.64)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
        <span style={{ color: '#94a3b8', fontSize: 9, fontWeight: 760, textTransform: 'uppercase', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color: '#e2e8f0', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 760, lineHeight: 1 }}>{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={{
          width: '100%',
          height: 3,
          accentColor: '#1edce0',
          background: `linear-gradient(90deg, #1edce0 0%, #1edce0 ${percent * 100}%, rgba(71,85,105,0.7) ${percent * 100}%, rgba(71,85,105,0.7) 100%)`,
        }}
      />
    </label>
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
    setValue(dragRef.current.value + (dy / 118) * (max - min));
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
      minHeight: 62,
      display: 'grid',
      gridTemplateColumns: '48px minmax(0, 1fr)',
      alignItems: 'center',
      gap: 7,
      minWidth: 0,
      padding: '5px 6px',
      borderRadius: 6,
      border: dragging ? '1px solid rgba(245,158,11,0.62)' : '1px solid rgba(148,163,184,0.2)',
      background: dragging ? 'rgba(245,158,11,0.08)' : 'rgba(9,14,22,0.66)',
      boxShadow: dragging ? '0 0 18px rgba(245,158,11,0.18)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        className="lupi-rive-dial"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          width: 44,
          height: 44,
          aspectRatio: '1 / 1',
          flexShrink: 0,
          borderRadius: '50%',
          position: 'relative',
          cursor: 'ns-resize',
          outline: 'none',
          touchAction: 'none',
          background: `conic-gradient(from 225deg, ${accent} 0deg, ${accent} ${percent * 270}deg, #1f2937 ${percent * 270}deg, #1f2937 270deg, transparent 270deg)`,
          boxShadow: dragging ? `0 0 18px ${accent}52` : '0 6px 18px rgba(0,0,0,0.34)',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #334155, #0f172a 72%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          transform: `rotate(${angle}deg)`,
          transition: dragging ? 'none' : 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div style={{
            position: 'absolute',
            top: 2,
            left: '50%',
            width: 3,
            height: 9,
            transform: 'translateX(-50%)',
            borderRadius: 3,
            background: accent,
            boxShadow: `0 0 10px ${accent}78`,
          }} />
        </div>
      </div>
      <div style={{ minWidth: 0, display: 'grid', gap: 5 }}>
        <span style={{ color: '#94a3b8', fontSize: 9, fontWeight: 780, textTransform: 'uppercase', lineHeight: 1 }}>{label}</span>
        <span style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 820, lineHeight: 1 }}>
          {format(value)}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={`${label} fine control`}
          onChange={(event) => setValue(Number(event.currentTarget.value))}
          style={{
            width: '100%',
            height: 3,
            accentColor: accent,
          }}
        />
      </div>
    </div>
  );
}

function CompactSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={compactFieldStyle}>
      <span style={compactFieldLabelStyle}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={compactSelectStyle}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function BackgroundSelect({
  value,
  groups,
  onChange,
}: {
  value: string;
  groups: Array<{ label: string; presets: BgPresetWithId[] }>;
  onChange: (value: string) => void;
}) {
  return (
    <label style={compactFieldStyle}>
      <span style={compactFieldLabelStyle}>Scene</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={compactSelectStyle}
      >
        {groups.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.presets.map(preset => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function ColorPicker({
  active,
  label,
  value,
  onChange,
}: {
  active?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{
      display: 'grid',
      gridTemplateColumns: '42px minmax(0, 1fr)',
      gap: 6,
      alignItems: 'center',
      minWidth: 0,
      padding: 4,
      borderRadius: 6,
      border: active ? '1px solid #1edce0' : '1px solid rgba(148,163,184,0.2)',
      background: active ? 'rgba(30,220,224,0.12)' : 'rgba(9,14,22,0.64)',
      boxShadow: active ? '0 0 16px rgba(30,220,224,0.18)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <input
        className="lupi-native-color"
        type="color"
        value={value}
        title={label}
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={{
          width: 38,
          height: 26,
          padding: 0,
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 6,
          background: 'transparent',
          cursor: 'pointer',
        }}
      />
      <span style={{ minWidth: 0, display: 'grid', gap: 2 }}>
        <span style={{ color: '#94a3b8', fontSize: 9, fontWeight: 760, textTransform: 'uppercase', lineHeight: 1 }}>{label}</span>
        <span style={{ color: active ? '#f8fafc' : '#cbd5e1', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 760, lineHeight: 1 }}>{value.toUpperCase()}</span>
      </span>
    </label>
  );
}

function ElementColorPicker({
  active,
  atomicNumber,
  value,
  options,
  overridden,
  onSelect,
  onChange,
  onReset,
}: {
  active?: boolean;
  atomicNumber: number;
  value: string;
  options: Array<{ value: number; label: string }>;
  overridden?: boolean;
  onSelect: (atomicNumber: number) => void;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '34px minmax(0, 1fr) 39px',
      gap: 5,
      alignItems: 'center',
      minWidth: 0,
      padding: 4,
      borderRadius: 6,
      border: active ? '1px solid #facc15' : '1px solid rgba(148,163,184,0.2)',
      background: active ? 'rgba(250,204,21,0.12)' : 'rgba(9,14,22,0.64)',
      boxShadow: active ? '0 0 16px rgba(250,204,21,0.16)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <input
        className="lupi-native-color"
        type="color"
        value={value}
        title={`Atomic number ${atomicNumber}`}
        aria-label={`Atomic number ${atomicNumber} color`}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={{
          width: 30,
          height: 26,
          padding: 0,
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 6,
          background: 'transparent',
          cursor: 'pointer',
        }}
      />
      <label style={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <span style={compactFieldLabelStyle}>Element</span>
        <select
          value={atomicNumber}
          onChange={(event) => onSelect(Number(event.currentTarget.value))}
          style={{ ...compactSelectStyle, height: 20, padding: '0 4px' }}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        title="Reset element color"
        onClick={onReset}
        disabled={!overridden}
        style={{
          height: 26,
          minWidth: 0,
          borderRadius: 5,
          border: overridden ? '1px solid rgba(250,204,21,0.56)' : '1px solid rgba(148,163,184,0.16)',
          background: overridden ? 'rgba(250,204,21,0.14)' : 'rgba(15,23,42,0.6)',
          color: overridden ? '#f8fafc' : '#64748b',
          cursor: overridden ? 'pointer' : 'default',
          fontSize: 9,
          fontWeight: 760,
          letterSpacing: 0,
        }}
      >
        Base
      </button>
    </div>
  );
}

function SwatchButton({
  active,
  label,
  background,
  onClick,
}: {
  active?: boolean;
  label: string;
  background: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        height: 25,
        flex: '1 1 24px',
        minWidth: 24,
        borderRadius: 5,
        border: active ? '1px solid #f8fafc' : '1px solid rgba(148,163,184,0.22)',
        background,
        boxShadow: active ? '0 0 14px rgba(248,250,252,0.32)' : 'inset 0 1px 0 rgba(255,255,255,0.1)',
        cursor: 'pointer',
      }}
    />
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
  width: 28,
  height: 28,
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

const compactFieldStyle: CSSProperties = {
  display: 'grid',
  gap: 3,
  minWidth: 0,
  padding: '4px 5px',
  borderRadius: 5,
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(9,14,22,0.64)',
};

const compactFieldLabelStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 9,
  fontWeight: 760,
  textTransform: 'uppercase',
  lineHeight: 1,
};

const compactSelectStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 26,
  borderRadius: 5,
  border: '1px solid rgba(148,163,184,0.24)',
  background: 'rgba(2,6,23,0.82)',
  color: '#e2e8f0',
  fontSize: 10,
  fontWeight: 720,
  padding: '0 7px',
  outline: 'none',
};

const paletteRailStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  minWidth: 0,
};
