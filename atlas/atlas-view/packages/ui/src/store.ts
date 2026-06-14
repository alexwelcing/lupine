/**
 * LUPI - global viewer state (Zustand).
 *
 * URL-serializable: encode/decode full scene state into ?s= parameter
 * for shareable links that recreate the exact visualization.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Frame, Trajectory, ThermoData, ColormapName, ColorMode, RenderStyle, BondStats } from '@atlas/core/types';
import type { NistCatalogEntry } from '@atlas/nist';
import type { FlythroughSequence, FlythroughKeyframe } from './flythrough';
import { COLOR_SCHEMES, pickInitialScheme, type ColorSchemeId, type AtomColorSource } from './coloring';
import { MATERIAL_SCENES, getScene, DEFAULT_SCENE_ID } from '@atlas/scene/materials';

/** A pinned text annotation tied to a specific atom by index in the
 *  current frame. Persists across frame changes; if the atom moves, the
 *  label moves with it (the AnnotationsLayer reads the latest position). */
export interface Annotation {
  id: string;
  atomIndex: number;
  text: string;
  /** ISO timestamp — used for stable ordering and "newest" hero treatment. */
  createdAt: number;
}

/** Visual presentation modes for annotations. Each is a distinct R3F/drei
 *  technique applied to the same underlying data so the user can compare
 *  styles without re-authoring the labels themselves.
 *
 *  - `tag`     : drei `<Html>` frosted-glass card + SVG leader line. Most readable.
 *  - `glyph`   : drei `<Text>` SDF floating directly above the atom, billboarded.
 *  - `halo`    : a 3D ring of text characters orbiting the atom in world space.
 *  - `etched`  : text rasterized to a texture, sampled inside the atom impostor
 *                shader, modulating albedo so it reads as engraved into the surface. */
export type LabelStyle = 'tag' | 'glyph' | 'halo' | 'etched';
export type FilterShellShape = 'off' | 'sphere' | 'cube';
export type FilterShellPreset = 'haze' | 'cryo' | 'prism' | 'graphite';

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function sanitizeHexColor(value: string, fallback = '#1edce0') {
  return isHexColor(value) ? value : fallback;
}

function sanitizeElementColorOverrides(value: unknown): Record<number, string> {
  if (!value || typeof value !== 'object') return {};
  const next: Record<number, string> = {};
  for (const [key, color] of Object.entries(value as Record<string, unknown>)) {
    const atomicNumber = Number(key);
    if (!Number.isInteger(atomicNumber) || atomicNumber < 1 || atomicNumber > 255 || !isHexColor(color)) continue;
    next[atomicNumber] = color;
  }
  return next;
}

function sanitizeFilterShellShape(value: unknown): FilterShellShape {
  if (value === 'sphere' || value === 'cube' || value === 'off') return value;
  return value === 'box' ? 'cube' : 'off';
}

function sanitizeFilterShellPreset(value: unknown): FilterShellPreset {
  return value === 'haze' || value === 'cryo' || value === 'prism' || value === 'graphite'
    ? value
    : 'haze';
}

function sanitizeAtomColorSource(value: unknown, fallback: AtomColorSource): AtomColorSource {
  return value === 'colormap' || value === 'element' || value === 'botanical' ? value : fallback;
}

function sanitizeColorMode(value: unknown, fallback: ColorMode): ColorMode {
  return value === 'type' || value === 'property' || value === 'uniform' ? value : fallback;
}

function resolveUrlColorScheme(value: unknown, delta: Record<string, unknown>): ColorSchemeId {
  if (typeof value === 'string' && value in COLOR_SCHEMES) return value as ColorSchemeId;
  if (delta.cm === 'property') return 'property';
  if (delta.cm === 'uniform') return 'uniform';
  if (delta.acs === 'botanical') return 'botanical';
  if (delta.acs === 'colormap' || typeof delta.cmap === 'string') return 'family';
  return 'element';
}

function sanitizePostprocessPreset(value: unknown): AppState['postprocessPreset'] {
  return value === 'paper' || value === 'studio' || value === 'editorial' || value === 'cinematic' || value === 'diagram'
    ? value
    : 'studio';
}

function sanitizeMaterialPreset(value: unknown): AppState['materialPreset'] {
  return value === 'default' || value === 'matte' || value === 'metallic' || value === 'glass' || value === 'plastic'
    ? value
    : 'default';
}

function sanitizeMaterialScene(value: unknown): string {
  return typeof value === 'string' && MATERIAL_SCENES.some(scene => scene.id === value)
    ? value
    : DEFAULT_SCENE_ID;
}

function sanitizeEnvironmentPreset(value: unknown): AppState['environmentPreset'] {
  return value === 'city' || value === 'studio' || value === 'dawn' || value === 'night' || value === 'warehouse' || value === 'forest' || value === 'apartment' || value === 'none'
    ? value
    : 'studio';
}

export interface BondDataset {
  id: string;
  source: 'webgpu' | 'cpu' | 'file';
  label: string;
  timestamp: number;
  data?: {
    pairs: Int32Array;
    distances: Float32Array;
  };
}

export interface ExportRequest {
  type: 'image' | 'video' | 'glb' | 'usdz' | 'complete' | null;
  resolution?: { width: number; height: number; flexAspect?: boolean };
  format?: 'png' | 'jpeg' | 'webp' | 'mp4' | 'webm' | 'glb' | 'usdz';
  flythrough?: FlythroughSequence;
  transparent?: boolean;
  durationSeconds?: number;
  orbit?: boolean;
  cinematic?: boolean;
  baseName?: string;
  fileStream?: FileSystemWritableFileStream;
  onComplete?: (success: boolean, blob?: Blob, filename?: string) => void;
}

export interface LoadedFile {
  name: string;
  size: number;
  trajectory: Trajectory;
  thermo: ThermoData | null;
  sourceUrl?: string;
  /** Visual playback cadence for files that expand sparse measured frames
   *  into viewer-only display frames. Scientific frame data remains in the
   *  artifact; this only controls how quickly the rendered trajectory flows. */
  playbackFrameRate?: number;
}

export interface EquilibriumSolveState {
  report: Record<string, unknown>;
  entryId: string;
  material: string;
  potential: string;
  offset: {
    strainPercent: number;
    displacementAngstrom: number;
    steps: number;
    frames: number;
  };
}

export interface AppState {
  // ─── File state ───
  file: LoadedFile | null;
  /** Optional comparison trajectory rendered as a translucent reference layer.
   *  This is viewer-only and is cleared whenever a normal dataset is loaded. */
  ghostFile: LoadedFile | null;
  loading: boolean;
  loadProgress: number;
  /** id of the gallery card whose dataset is loaded/loading (UI + E2E tracking). */
  activeCardId: string | null;
  error: string | null;
  /** Non-blocking renderer warning surfaced to the UI (e.g. the optional
   *  WebGPU bond accelerator failed or timed out, falling back to the CPU
   *  path). Distinct from `error`: the scene still renders. Audit findings:
   *  no-offline-fallback-webgpu-init. Null when there's nothing to surface. */
  rendererWarning: string | null;
  streamingTelemetry: {
    bytesTransferred: number;
    cacheHits: number;
    cacheMisses: number;
    cacheSize: number;
  } | null;

  // ─── Visualization ───
  frame: number;
  /** The directorial color choice. Drives atomColorMode / atomColorSource /
   *  botanical via setColorScheme. Smart-defaulted on file load. */
  colorScheme: ColorSchemeId;
  /** Source of per-type colors when atomColorMode === 'type'. Set by the
   *  scheme but exposed independently so power users can override. */
  atomColorSource: AtomColorSource;
  colorMode: ColorMode;
  colorProperty: string | null;
  colormap: ColormapName;
  uniformAtomColor: string;
  elementColorOverrides: Record<number, string>;
  propRange: [number, number];

  // ─── Display ───
  showCell: boolean;
  showAxes: boolean;
  showBonds: boolean;
  /** Hard upper-cap on bond length (Å). Auto-derived per-frame from
   *  `2·max(r_cov) + bondTolerance + slack` so the spatial-hash cell size
   *  always covers what the element-aware filter would accept. Kept in the
   *  store for URL round-tripping, but the slider no longer drives it
   *  directly — `bondTolerance` is the user-facing knob. */
  bondCutoff: number;
  /** Element-aware tolerance (Å) added on top of `r_cov(A) + r_cov(B)` when
   *  deciding whether two atoms are bonded. This is now the slider's value:
   *  raising it loosens every per-pair cutoff at once, lowering it tightens
   *  them. 0.45 Å is the default Cordero-pair slack and matches the
   *  worker's previous hard-coded value. */
  bondTolerance: number;
  bondColorMode: 'type' | 'length' | 'energy' | 'screening';
  /** Computed bond-length statistics for the current frame (histogram,
   *  percentiles, per-type-pair breakdown). Null until analysis runs;
   *  consumed by the Bond Topology analysis panel. */
  bondStats: BondStats | null;
  /** How the bond cutoff is chosen: 'manual' uses bondCutoff directly,
   *  'percentile' derives it from bondPercentileRange via applyPercentileCutoff. */
  bondThresholdMode: 'manual' | 'percentile';
  /** [lower, upper] percentile bounds (0–100) for percentile thresholding. */
  bondPercentileRange: [number, number];
  /** Snap bondCutoff to the first minimum of the bond-length histogram. */
  grDrivenCutoff: boolean;
  /** Render delocalized electron-density filaments instead of discrete bonds. */
  filamentMode: boolean;
  /** Fade bonds geometrically screened by a third atom (MEAM-style). */
  meamScreening: boolean;
  /** Use the WebGPU compute pipeline for bond detection. Falls back to the
   *  CPU spatial-hash worker when WebGPU is unavailable or init fails. */
  useGpuBonds: boolean;
  /** Live status of the GPU pipeline. Drives the HUD and the fallback UI. */
  gpuBondsStatus: 'idle' | 'ready' | 'unsupported';
  /** Backend that produced the most recent bond pairs. 'none' until first
   *  detection completes. Drives the dev HUD; not used by render path. */
  bondSource: 'cpu' | 'gpu' | 'none';
  /** Bond count from the most recent detection — for HUD + telemetry. */
  lastBondCount: number;
  
  // ─── Bond Registry (Phase 3) ───
  bondRegistry: Record<string, BondDataset>;
  activeBondDataset: string | null;

  renderStyle: RenderStyle;
  atomScale: number;
  backgroundPreset: string;
  backgroundStyle: 'linear' | 'radial' | 'spotlight';
  filterShellShape: FilterShellShape;
  filterShellPreset: FilterShellPreset;
  filterShellOpacity: number;
  filterShellRadius: number;
  environmentPreset: 'city' | 'studio' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'none';
  materialPreset: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';
  /** Active material scene ID. Scenes coordinate material + lighting + env
   *  + post into a holistic authored look. */
  materialScene: string;
  /** 0 = pure per-element identity, 1 = full preset override. Scenes set
   *  this; user can refine with a slider. */
  materialIntensity: number;

  // ─── Lighting & Texture ───
  ambientLightIntensity: number;
  dirLightIntensity: number;
  /** Rim / backlight intensity. Adds a backlit edge for depth separation. */
  rimLightIntensity: number;
  /** Runtime-only: true while WebXR light-estimation is feeding real-world
   *  lighting into the AR scene. Lets the static 3-point rig dim out so the
   *  live environment dominates. Never serialized to the URL. */
  arLightEstimationActive: boolean;
  atomTexture: 'none' | 'scratched' | 'noise';
  surfaceRoughness: number;
  surfacePolish: number;
  surfaceClearcoat: number;
  keyLightAzimuth: number;
  keyLightElevation: number;
  fillLightAzimuth: number;
  fillLightElevation: number;
  rimLightAzimuth: number;
  rimLightElevation: number;
  fillLightColor: string;
  rimLightColor: string;

  // ─── Effects ───
  /** Active postprocess preset. The renderer reads this. Individual ssao /
   *  bloom / dof flags below are legacy and no longer drive rendering — they
   *  remain for MobileHUD and AnomalyTracker which read them. */
  postprocessPreset: 'paper' | 'studio' | 'editorial' | 'cinematic' | 'diagram';
  /** 0..2 — scales the active preset's effect strengths. 0 disables all
   *  effects (preset still selected); 1 = preset's authored values. */
  postprocessIntensity: number;
  /** 0..1 — when colorScheme is 'property', atoms with high property values
   *  emit additional light proportional to value × this strength × the
   *  colormap-mapped color. Reads as "this atom is doing something." */
  propertyEmissionStrength: number;
  ssao: boolean;
  ssaoIntensity: number;
  bloom: boolean;
  bloomIntensity: number;
  dof: boolean;
  autoDepthOfField: boolean;
  dofFocus: number;
  toneMapping: 'none' | 'aces' | 'reinhard';
  antialiasing: 'none' | 'fxaa' | 'msaa4x' | 'smaa';

  // ─── Playback ───
  playing: boolean;
  playbackSpeed: number;
  loopMode: 'loop' | 'bounce' | 'once';

  // ─── Camera ───
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  cameraPreset: 'free' | 'front' | 'side' | 'top' | 'iso';

  // ─── Viewport Modes ───
  viewportMode: 'standard' | 'chronos' | 'volcanic';

  // ─── Publication ───
  showScaleBar: boolean;
  colorblindMode: boolean;

  // ─── UI ───
  activePanel: 'studio' | 'export' | 'flythrough' | 'telemetry' | 'equilibrium' | 'mlipLongRun' | null;
  /** Sign-in callout visibility. Defaults CLOSED — the app never auto-prompts
   *  anonymous visitors to sign up; opened only by an explicit user action. */
  authPromptOpen: boolean;
  /** Landing-page molecule configurator state for the on-page MCP demo. */
  configuratorOpen: boolean;
  configuratorSeed: string | null;
  activeProfile: 'publication' | 'neon' | 'cinematic' | 'raw' | null;
  equilibriumSolve: EquilibriumSolveState | null;

  // ─── NIST IPR potential browser ───
  nistCatalog: NistCatalogEntry[] | null;
  activePotentialId: string | null;
  showPotentialBrowser: boolean;
  showStats: boolean;
  showThermo: boolean;

  // ─── Hover ───
  hoveredAtom: number | null;
  selectedAtoms: number[];

  // ─── Annotations ───
  // Pinned text labels anchored to specific atom indices. The user can
  // create them by clicking an atom + adding text; multiple distinct
  // visual styles (tag/glyph/halo/etched) are selected globally so the
  // user can flex the same data through different presentation modes.
  annotations: Annotation[];
  labelStyle: LabelStyle;
  addAnnotation: (atomIndex: number, text: string) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setLabelStyle: (style: LabelStyle) => void;

  // ─── Atom visibility ───
  hiddenAtomTypes: Set<number>;
  atomTypeScales: Record<number, number>; // per-type scale overrides

  // ─── Anomalies ───
  anomalyTracking: boolean;

  // ─── Streaming (Two-Phase Loading) ───
  streamingProgress: number;
  isStreamingFrames: boolean;
  fullTrajectoryReady: boolean;
  /** Within-frame streaming: how many atoms of `file.trajectory.frames[0]`
   *  have been populated so far. The streaming parser pre-allocates the
   *  full TypedArrays (sized to `frame.natoms`) but only fills indices
   *  [0, loadedAtomCount). The renderer reads this to clamp its upload
   *  upper bound — the unfilled tail is uninitialized memory and must
   *  not render, or atoms appear at the origin until streaming catches up.
   *
   *  When non-streaming, this stays equal to frame.natoms so consumers
   *  can ignore the field. Cleared back to 0 on `clearFile` and re-set
   *  by the streaming load path. */
  loadedAtomCount: number;
  // ─── Export Pipeline ───
  exportRequest: ExportRequest;
  triggerExport: (req: Partial<ExportRequest>) => void;
  clearExportRequest: () => void;

  // ─── Flythrough ───
  flythrough: FlythroughSequence | null;
  flythroughPreview: boolean;
  flythroughTime: number;
  setFlythrough: (seq: FlythroughSequence | null) => void;
  setFlythroughPreview: (active: boolean) => void;
  setFlythroughTime: (time: number) => void;
  addFlythroughKeyframe: (kf: FlythroughKeyframe) => void;
  removeFlythroughKeyframe: (index: number) => void;
  updateFlythroughKeyframe: (index: number, patch: Partial<FlythroughKeyframe>) => void;
  setFlythroughLoop: (loop: boolean) => void;

  // ─── Actions: Camera ───
  setCameraState: (position: [number, number, number], target: [number, number, number]) => void;
  setCameraPreset: (preset: AppState['cameraPreset']) => void;
  setShowScaleBar: (show: boolean) => void;
  setColorblindMode: (enabled: boolean) => void;
  setViewportMode: (mode: AppState['viewportMode']) => void;

  // ─── Actions ───
  setFile: (file: LoadedFile | null) => void;
  setGhostFile: (file: LoadedFile | null) => void;
  setLoading: (loading: boolean, progress?: number) => void;
  setActiveCardId: (id: string | null) => void;
  setError: (error: string | null) => void;
  setRendererWarning: (warning: string | null) => void;
  setStreamingTelemetry: (stats: AppState['streamingTelemetry']) => void;
  setFrame: (frame: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setColorScheme: (id: ColorSchemeId) => void;
  setAtomColorSource: (src: AtomColorSource) => void;
  setColorMode: (mode: ColorMode) => void;
  setColorProperty: (prop: string | null) => void;
  setColormap: (map: ColormapName) => void;
  setUniformAtomColor: (color: string) => void;
  setElementColorOverride: (atomicNumber: number, color: string) => void;
  resetElementColorOverride: (atomicNumber: number) => void;
  resetElementColorOverrides: () => void;
  setAnomalyTracking: (tracking: boolean) => void;
  setPostprocessPreset: (id: AppState['postprocessPreset']) => void;
  setPostprocessIntensity: (v: number) => void;
  setPropertyEmissionStrength: (v: number) => void;
  toggleSSAO: () => void;
  toggleBloom: () => void;
  toggleDOF: () => void;
  toggleAutoDOF: () => void;
  setSSAOIntensity: (v: number) => void;
  setBloomIntensity: (v: number) => void;
  setDOFFocus: (v: number) => void;
  setToneMapping: (mode: 'none' | 'aces' | 'reinhard') => void;
  toggleCell: () => void;
  toggleAxes: () => void;
  toggleBonds: () => void;
  setBondCutoff: (cutoff: number) => void;
  setBondTolerance: (tolerance: number) => void;
  setBondColorMode: (mode: AppState['bondColorMode']) => void;
  setBondStats: (stats: BondStats | null) => void;
  setBondThresholdMode: (mode: AppState['bondThresholdMode']) => void;
  setBondPercentileRange: (range: [number, number]) => void;
  applyPercentileCutoff: () => void;
  toggleGrDrivenCutoff: () => void;
  toggleFilamentMode: () => void;
  toggleMeamScreening: () => void;
  setUseGpuBonds: (v: boolean) => void;
  setGpuBondsStatus: (status: AppState['gpuBondsStatus']) => void;
  reportBondsUpdate: (source: AppState['bondSource'], count: number) => void;
  registerBondDataset: (dataset: BondDataset) => void;
  setActiveBondDataset: (id: string | null) => void;
  setRenderStyle: (style: RenderStyle) => void;
  setAtomScale: (scale: number) => void;
  setBackgroundPreset: (preset: string) => void;
  setBackgroundStyle: (style: AppState['backgroundStyle']) => void;
  setFilterShellShape: (shape: FilterShellShape) => void;
  setFilterShellPreset: (preset: FilterShellPreset) => void;
  setFilterShellOpacity: (opacity: number) => void;
  setFilterShellRadius: (radius: number) => void;
  setEnvironmentPreset: (preset: 'city' | 'studio' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'none') => void;
  setArLightEstimationActive: (active: boolean) => void;
  setMaterialPreset: (preset: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic') => void;
  setMaterialScene: (sceneId: string) => void;
  setMaterialIntensity: (v: number) => void;
  applyMaterialScene: (sceneId: string) => void;
  setAmbientLightIntensity: (val: number) => void;
  setDirLightIntensity: (val: number) => void;
  setRimLightIntensity: (val: number) => void;
  setAtomTexture: (tex: 'none' | 'scratched' | 'noise') => void;
  setSurfaceRoughness: (val: number) => void;
  setSurfacePolish: (val: number) => void;
  setSurfaceClearcoat: (val: number) => void;
  setKeyLightAzimuth: (val: number) => void;
  setKeyLightElevation: (val: number) => void;
  setFillLightAzimuth: (val: number) => void;
  setFillLightElevation: (val: number) => void;
  setRimLightAzimuth: (val: number) => void;
  setRimLightElevation: (val: number) => void;
  setFillLightColor: (val: string) => void;
  setRimLightColor: (val: string) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  setAuthPromptOpen: (open: boolean) => void;
  openConfigurator: (seed?: string) => void;
  closeConfigurator: () => void;
  setEquilibriumSolve: (state: EquilibriumSolveState | null) => void;
  setNistCatalog: (catalog: NistCatalogEntry[] | null) => void;
  setActivePotentialId: (id: string | null) => void;
  setShowPotentialBrowser: (show: boolean) => void;
  clearFile: () => void;
  reset: () => void;
  setHoveredAtom: (atom: number | null) => void;
  setSelectedAtoms: (atoms: number[] | ((prev: number[]) => number[])) => void;
  toggleAtomType: (type: number) => void;
  showAllAtomTypes: () => void;
  soloAtomType: (type: number) => void;
  setAtomTypeScale: (type: number, scale: number) => void;
  resetAtomTypeScales: () => void;
  encodeToURL: () => string;
  decodeFromURL: (params: string) => void;
  applyVisualProfile: (profileId: 'publication' | 'neon' | 'cinematic' | 'raw') => void;

  // ─── Streaming Actions ───
  appendFrames: (frames: Frame[]) => void;
  setStreamingProgress: (p: number) => void;
  setFullTrajectoryReady: (ready: boolean) => void;
  /** Update the within-frame loaded-atom count. Called by the streaming
   *  parser after each chunk lands; read by AtomsOptimized to clamp the
   *  upload upper bound. Setter is intentionally direct (no merging or
   *  clamping) — the streaming pipeline owns this value. */
  setLoadedAtomCount: (count: number) => void;
}

const DEFAULTS = {
  file: null,
  ghostFile: null as LoadedFile | null,
  loading: false,
  loadProgress: 0,
  activeCardId: null,
  error: null,
  rendererWarning: null,
  streamingTelemetry: null,
  frame: 0,
  colorScheme: 'element' as ColorSchemeId,
  atomColorSource: 'element' as AtomColorSource,
  colorMode: 'type' as ColorMode,
  colorProperty: null,
  colormap: 'viridis' as ColormapName,
  uniformAtomColor: '#1edce0',
  elementColorOverrides: {},
  propRange: [0, 1] as [number, number],
  showCell: true,
  showAxes: true,
  showBonds: false,
  bondCutoff: 3.2,
  bondTolerance: 0.45,
  bondColorMode: 'type' as const,
  bondStats: null as BondStats | null,
  bondThresholdMode: 'manual' as const,
  bondPercentileRange: [0, 95] as [number, number],
  grDrivenCutoff: false,
  filamentMode: false,
  meamScreening: false,
  // Default ON: WebGPU bond detection has graceful CPU-worker fallback when
  // unsupported. Treating it as the primary path simplifies the user's first
  // experience — no toggle hunt for "why are bonds slow on my machine".
  useGpuBonds: true,
  gpuBondsStatus: 'idle' as const,
  bondSource: 'none' as const,
  lastBondCount: 0,
  
  // ─── Bond Registry ───
  bondRegistry: {} as Record<string, BondDataset>,
  activeBondDataset: null as string | null,
  renderStyle: 'standard' as RenderStyle,
  atomScale: 1.0,
  backgroundPreset: 'deep',
  backgroundStyle: 'radial' as const,
  filterShellShape: 'off' as FilterShellShape,
  filterShellPreset: 'haze' as FilterShellPreset,
  filterShellOpacity: 0.24,
  filterShellRadius: 1.08,
  environmentPreset: 'studio' as const,
  materialPreset: 'default' as const,
  materialScene: DEFAULT_SCENE_ID,
  materialIntensity: 0.0,

  ambientLightIntensity: 0.5,
  dirLightIntensity: 1.5,
  rimLightIntensity: 0.3,
  arLightEstimationActive: false,
  atomTexture: 'none' as const,
  surfaceRoughness: 0.0,
  surfacePolish: 0.0,
  surfaceClearcoat: 0.0,
  keyLightAzimuth: 40,
  keyLightElevation: 45,
  fillLightAzimuth: -120,
  fillLightElevation: 10,
  rimLightAzimuth: 160,
  rimLightElevation: 30,
  fillLightColor: '#8888ff',
  rimLightColor: '#ffffff',

  // ─── Effects Defaults ───
  postprocessPreset: 'studio' as const,
  postprocessIntensity: 1.0,
  propertyEmissionStrength: 0.6,
  ssao: true,
  ssaoIntensity: 0.65,
  bloom: true,
  bloomIntensity: 0.15,
  dof: false,
  autoDepthOfField: false,
  dofFocus: 50,
  toneMapping: 'aces' as const,
  antialiasing: 'smaa' as const,
  playing: false,
  playbackSpeed: 1.0,
  loopMode: 'loop' as const,
  cameraPosition: [0, 0, 50] as [number, number, number],
  cameraTarget: [0, 0, 0] as [number, number, number],
  cameraFov: 50,
  cameraPreset: 'free' as const,
  showScaleBar: true,
  colorblindMode: false,
  activePanel: null,
  authPromptOpen: false,
  configuratorOpen: false,
  configuratorSeed: null,
  activeProfile: null,
  equilibriumSolve: null,
  nistCatalog: null,
  activePotentialId: null,
  showPotentialBrowser: false,
  showStats: false,
  showThermo: true,
  hoveredAtom: null as number | null,
  selectedAtoms: [] as number[],
  annotations: [] as Annotation[],
  labelStyle: 'tag' as LabelStyle,
  hiddenAtomTypes: new Set<number>(),
  atomTypeScales: {} as Record<number, number>,
  anomalyTracking: false,
  viewportMode: 'standard' as const,
  exportRequest: { type: null } as ExportRequest,
  flythrough: null as FlythroughSequence | null,
  flythroughPreview: false,
  flythroughTime: 0,
  // ─── Streaming (Two-Phase Loading) ───
  streamingProgress: 0,
  isStreamingFrames: false,
  fullTrajectoryReady: true,
  loadedAtomCount: 0,
};

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULTS,

    setFile: (file) => {
      const firstFrame = file?.trajectory?.frames?.[0];
      const atomCount = firstFrame?.positions?.length ? firstFrame.positions.length / 3 : 0;

      // Drive a sensible first-frame look based on system content. The user
      // can change anything after, but they should never see "should I enable
      // bonds?" or "what's a good color scheme?" — we decide.
      const sceneDirective = pickSceneDirective(atomCount);
      const materialScene = getScene(sceneDirective.materialScene) ?? getScene(DEFAULT_SCENE_ID);

      // Pick a coloring scheme for the first read. Element identity is the
      // default; property coloring remains an explicit Molecule Color choice.
      const hasProperty = !!firstFrame?.properties && firstFrame.properties.size > 0;
      const uniqueTypes = firstFrame?.types
        ? new Set(firstFrame.types).size
        : 0;
      const schemeId = pickInitialScheme({ hasProperty, uniqueTypes });
      const scheme = COLOR_SCHEMES[schemeId];

      set({
        file,
        ghostFile: null,
        frame: 0,
        playing: false,
        error: null,
        loading: false,
        loadProgress: 1,
        showBonds: sceneDirective.showBonds,
        showCell: sceneDirective.showCell,
        showAxes: sceneDirective.showAxes,
        postprocessPreset: sceneDirective.preset,
        postprocessIntensity: sceneDirective.intensity,
        materialScene: materialScene?.id ?? DEFAULT_SCENE_ID,
        materialPreset: materialScene?.materialPreset ?? DEFAULTS.materialPreset,
        materialIntensity: materialScene?.materialIntensity ?? DEFAULTS.materialIntensity,
        environmentPreset: materialScene?.environmentPreset ?? DEFAULTS.environmentPreset,
        ambientLightIntensity: materialScene?.ambientIntensity ?? DEFAULTS.ambientLightIntensity,
        dirLightIntensity: materialScene?.dirLightIntensity ?? DEFAULTS.dirLightIntensity,
        rimLightIntensity: sceneDirective.rimLightIntensity,
        toneMapping: materialScene?.toneMapping ?? DEFAULTS.toneMapping,
        backgroundPreset: sceneDirective.backgroundPreset,
        atomTexture: materialScene?.atomTexture ?? DEFAULTS.atomTexture,
        surfaceRoughness: sceneDirective.surfaceRoughness,
        surfacePolish: sceneDirective.surfacePolish,
        surfaceClearcoat: sceneDirective.surfaceClearcoat,
        fillLightColor: sceneDirective.fillLightColor,
        rimLightColor: sceneDirective.rimLightColor,
        // Coloring directive — visible default, easy to override in UI.
        colorScheme: schemeId,
        atomColorSource: scheme.atomColorSource,
        colorMode: scheme.atomColorMode,
        colorProperty: scheme.atomColorMode === 'property' ? get().colorProperty : null,
        // Legacy mirrors of preset (PresetLegacyBridge re-syncs but writing
        // them here avoids a one-frame flash before the bridge catches up).
        // SSAO follows the same threshold as bond detection / preset
        // selection — anything past 'studio' is large enough that the
        // SSAO depth pass becomes a frame-rate liability. Bloom and DOF
        // are already gated to the most-cinematic presets which never
        // ship for big systems.
        ssao: sceneDirective.preset === 'studio',
        bloom: sceneDirective.preset === 'studio' || sceneDirective.preset === 'editorial' || sceneDirective.preset === 'cinematic',
        dof: sceneDirective.preset === 'cinematic',
        autoDepthOfField: sceneDirective.preset === 'cinematic',
        hoveredAtom: null,
        selectedAtoms: [],
        // Default-fill loadedAtomCount to atomCount so non-streaming
        // consumers don't need to special-case this field. The streaming
        // path overrides via setLoadedAtomCount during the load.
        loadedAtomCount: atomCount,
      });
    },

    setGhostFile: (ghostFile) => set({ ghostFile }),
    setLoading: (loading, progress) => set((s) => ({ loading, loadProgress: progress ?? s.loadProgress })),
    setActiveCardId: (id) => set({ activeCardId: id }),

    setError: (error) => set({ error, loading: false }),
    setRendererWarning: (rendererWarning) => set({ rendererWarning }),
    setStreamingTelemetry: (stats) => set({ streamingTelemetry: stats }),
    setViewportMode: (viewportMode) => set({ viewportMode }),

    setFrame: (frame) => {
      const f = get().file;
      if (!f) return;
      const maxFrame = f.trajectory.totalFrames - 1;
      set({ frame: Math.max(0, Math.min(frame, maxFrame)) });
    },

    nextFrame: () => {
      const { file, frame, loopMode } = get();
      if (!file) return;
      const max = file.trajectory.totalFrames - 1;
      if (frame >= max) {
        if (loopMode === 'loop') set({ frame: 0 });
        else if (loopMode === 'once') set({ playing: false });
      } else {
        set({ frame: frame + 1 });
      }
    },

    prevFrame: () => {
      const { file, frame } = get();
      if (!file) return;
      const max = file.trajectory.totalFrames - 1;
      set({ frame: frame <= 0 ? max : frame - 1 });
    },

    togglePlay: () => set(s => ({ playing: !s.playing })),
    setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

    setColorScheme: (colorScheme) => {
      const scheme = COLOR_SCHEMES[colorScheme];
      set({
        colorScheme,
        atomColorSource: scheme.atomColorSource,
        colorMode: scheme.atomColorMode,
      });
    },
    setAtomColorSource: (atomColorSource) => set({ atomColorSource }),
    setColorMode: (colorMode) => set({ colorMode }),
    setColorProperty: (colorProperty) => set({ colorProperty }),
    setColormap: (colormap) => set({ colormap, activeProfile: null }),
    setUniformAtomColor: (uniformAtomColor) => set({ uniformAtomColor: sanitizeHexColor(uniformAtomColor) }),
    setElementColorOverride: (atomicNumber, color) => set((state) => {
      const key = Math.round(atomicNumber);
      if (!Number.isInteger(key) || key < 1 || key > 255) return {};
      return {
        elementColorOverrides: {
          ...state.elementColorOverrides,
          [key]: sanitizeHexColor(color, state.elementColorOverrides[key] ?? '#1edce0'),
        },
      };
    }),
    resetElementColorOverride: (atomicNumber) => set((state) => {
      const key = Math.round(atomicNumber);
      const { [key]: _removed, ...elementColorOverrides } = state.elementColorOverrides;
      return { elementColorOverrides };
    }),
    resetElementColorOverrides: () => set({ elementColorOverrides: {} }),
    setAnomalyTracking: (anomalyTracking) => set({ anomalyTracking }),

    setPostprocessPreset: (postprocessPreset) => set({ postprocessPreset }),
    setPostprocessIntensity: (postprocessIntensity) =>
      set({ postprocessIntensity: Math.max(0, Math.min(2, postprocessIntensity)) }),
    setPropertyEmissionStrength: (propertyEmissionStrength) =>
      set({ propertyEmissionStrength: Math.max(0, Math.min(1, propertyEmissionStrength)) }),
    // Legacy individual toggles — no longer drive the EffectComposer (the
    // active preset does). Still mutate the legacy flags so MobileHUD's
    // toggles and AnomalyTracker's DOF check stay coherent until those are
    // migrated to read from the preset.
    toggleSSAO: () => set(s => ({ ssao: !s.ssao })),
    toggleBloom: () => set(s => ({ bloom: !s.bloom })),
    toggleDOF: () => set(s => ({ dof: !s.dof })),
    toggleAutoDOF: () => set(s => ({ autoDepthOfField: !s.autoDepthOfField })),
    setSSAOIntensity: (ssaoIntensity) => set({ ssaoIntensity }),
    setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
    setDOFFocus: (dofFocus) => set({ dofFocus }),
    setToneMapping: (toneMapping) => set({ toneMapping }),

    toggleCell: () => set(s => ({ showCell: !s.showCell })),
    toggleAxes: () => set(s => ({ showAxes: !s.showAxes })),
    toggleBonds: () => set(s => ({ showBonds: !s.showBonds })),
    setBondCutoff: (bondCutoff) => set({ bondCutoff }),
    setBondTolerance: (bondTolerance) => set({ bondTolerance }),
    setBondColorMode: (bondColorMode) => set({ bondColorMode }),
    setBondStats: (bondStats) => set({ bondStats }),
    setBondThresholdMode: (bondThresholdMode) => set({ bondThresholdMode }),
    setBondPercentileRange: (bondPercentileRange) => set({ bondPercentileRange }),
    applyPercentileCutoff: () => {
      const { bondStats, bondPercentileRange } = get();
      const cutoff = bondStats?.percentiles[`p${bondPercentileRange[1]}`];
      if (cutoff != null) set({ bondCutoff: cutoff, bondThresholdMode: 'percentile' });
    },
    toggleGrDrivenCutoff: () => set(s => ({ grDrivenCutoff: !s.grDrivenCutoff })),
    toggleFilamentMode: () => set(s => ({ filamentMode: !s.filamentMode })),
    toggleMeamScreening: () => set(s => ({ meamScreening: !s.meamScreening })),
    setUseGpuBonds: (useGpuBonds) => set({ useGpuBonds }),
    setGpuBondsStatus: (gpuBondsStatus) => set({ gpuBondsStatus }),
    reportBondsUpdate: (bondSource, lastBondCount) => set({ bondSource, lastBondCount }),
    
    // Bond Registry Actions
    registerBondDataset: (dataset: BondDataset) => set((s) => ({
      bondRegistry: { ...s.bondRegistry, [dataset.id]: dataset },
      activeBondDataset: s.activeBondDataset === null ? dataset.id : s.activeBondDataset
    })),
    setActiveBondDataset: (id: string | null) => set({ activeBondDataset: id }),

    setRenderStyle: (renderStyle) => set({ renderStyle }),
    setAtomScale: (atomScale) => set({ atomScale }),
    setBackgroundPreset: (backgroundPreset) => set({ backgroundPreset }),
    setBackgroundStyle: (backgroundStyle) => set({ backgroundStyle }),
    setFilterShellShape: (filterShellShape) => set({ filterShellShape }),
    setFilterShellPreset: (filterShellPreset) => set({ filterShellPreset }),
    setFilterShellOpacity: (filterShellOpacity) => set({ filterShellOpacity: Math.max(0, Math.min(0.65, filterShellOpacity)) }),
    setFilterShellRadius: (filterShellRadius) => set({ filterShellRadius: Math.max(0.75, Math.min(1.6, filterShellRadius)) }),
    setEnvironmentPreset: (environmentPreset) => set({ environmentPreset }),
    setMaterialPreset: (materialPreset) => set({ materialPreset }),
    setMaterialScene: (materialScene) => set({ materialScene }),
    setMaterialIntensity: (materialIntensity) => set({ materialIntensity: Math.max(0, Math.min(1, materialIntensity)) }),

    applyMaterialScene: (sceneId: string) => {
      const scene = getScene(sceneId);
      if (!scene) return;
      set({
        materialScene: sceneId,
        materialPreset: scene.materialPreset,
        materialIntensity: scene.materialIntensity,
        environmentPreset: scene.environmentPreset,
        ambientLightIntensity: scene.ambientIntensity,
        dirLightIntensity: scene.dirLightIntensity,
        rimLightIntensity: scene.rimLightIntensity,
        postprocessPreset: scene.postprocessPreset,
        toneMapping: scene.toneMapping,
        backgroundPreset: scene.backgroundPreset,
        atomTexture: scene.atomTexture,
        activeProfile: null, // Clear legacy profile
      });
    },

    setArLightEstimationActive: (arLightEstimationActive) => set({ arLightEstimationActive }),
    setAmbientLightIntensity: (ambientLightIntensity) => set({ ambientLightIntensity }),
    setDirLightIntensity: (dirLightIntensity) => set({ dirLightIntensity }),
    setRimLightIntensity: (rimLightIntensity) => set({ rimLightIntensity: Math.max(0, Math.min(2, rimLightIntensity)) }),
    setAtomTexture: (atomTexture) => set({ atomTexture }),
    setSurfaceRoughness: (surfaceRoughness) => set({ surfaceRoughness: Math.max(-1, Math.min(1, surfaceRoughness)) }),
    setSurfacePolish: (surfacePolish) => set({ surfacePolish: Math.max(-1, Math.min(1, surfacePolish)) }),
    setSurfaceClearcoat: (surfaceClearcoat) => set({ surfaceClearcoat: Math.max(0, Math.min(1, surfaceClearcoat)) }),
    setKeyLightAzimuth: (keyLightAzimuth) => set({ keyLightAzimuth }),
    setKeyLightElevation: (keyLightElevation) => set({ keyLightElevation }),
    setFillLightAzimuth: (fillLightAzimuth) => set({ fillLightAzimuth }),
    setFillLightElevation: (fillLightElevation) => set({ fillLightElevation }),
    setRimLightAzimuth: (rimLightAzimuth) => set({ rimLightAzimuth }),
    setRimLightElevation: (rimLightElevation) => set({ rimLightElevation }),
    setFillLightColor: (fillLightColor) => set({ fillLightColor }),
    setRimLightColor: (rimLightColor) => set({ rimLightColor }),
    setActivePanel: (activePanel) => set(s => ({
      activePanel: s.activePanel === activePanel ? null : activePanel,
    })),
    setAuthPromptOpen: (authPromptOpen) => set({ authPromptOpen }),
    openConfigurator: (seed) => set({ configuratorOpen: true, configuratorSeed: seed ?? null }),
    closeConfigurator: () => set({ configuratorOpen: false }),
    setEquilibriumSolve: (equilibriumSolve) => set({ equilibriumSolve }),
    setNistCatalog: (nistCatalog) => set({ nistCatalog }),
    setActivePotentialId: (activePotentialId) => set({ activePotentialId }),
    setShowPotentialBrowser: (showPotentialBrowser) => set({ showPotentialBrowser }),

    clearFile: () => set({
      file: null,
      ghostFile: null,
      frame: 0,
      playing: false,
      loading: false,
      loadProgress: 0,
      activeCardId: null,
      error: null,
      activePanel: null,
      hoveredAtom: null,
      selectedAtoms: [],
      exportRequest: { type: null },
      loadedAtomCount: 0,
      streamingProgress: 0,
      isStreamingFrames: false,
      fullTrajectoryReady: true,
    }),

    triggerExport: (req) => set(s => ({ exportRequest: { ...req, type: req.type ?? null } as ExportRequest })),
    clearExportRequest: () => set({ exportRequest: { type: null } }),

    // ─── Flythrough Actions ───
    setFlythrough: (flythrough) => set({ flythrough }),
    setFlythroughPreview: (flythroughPreview) => set({ flythroughPreview }),
    setFlythroughTime: (flythroughTime) => set({ flythroughTime }),

    addFlythroughKeyframe: (kf) => set((s) => {
      if (!s.flythrough) {
        return { flythrough: { keyframes: [kf], loop: false } };
      }
      if (s.flythrough.keyframes.length >= 5) return {}; // Max 5
      return {
        flythrough: {
          ...s.flythrough,
          keyframes: [...s.flythrough.keyframes, kf],
        },
      };
    }),

    removeFlythroughKeyframe: (index) => set((s) => {
      if (!s.flythrough) return {};
      const next = s.flythrough.keyframes.filter((_, i) => i !== index);
      if (next.length < 2) return { flythrough: null }; // Need at least 2
      return { flythrough: { ...s.flythrough, keyframes: next } };
    }),

    updateFlythroughKeyframe: (index, patch) => set((s) => {
      if (!s.flythrough) return {};
      const keyframes = s.flythrough.keyframes.map((kf, i) =>
        i === index ? { ...kf, ...patch } : kf
      );
      return { flythrough: { ...s.flythrough, keyframes } };
    }),

    setFlythroughLoop: (loop) => set((s) => {
      if (!s.flythrough) return {};
      return { flythrough: { ...s.flythrough, loop } };
    }),

    reset: () => set(DEFAULTS as any),

    setHoveredAtom: (hoveredAtom) => set({ hoveredAtom }),
    setSelectedAtoms: (nextSelectedAtoms) => set((s) => ({
      selectedAtoms: typeof nextSelectedAtoms === 'function'
        ? nextSelectedAtoms(s.selectedAtoms)
        : nextSelectedAtoms,
    })),

    addAnnotation: (atomIndex, text) => set((s) => ({
      annotations: [
        ...s.annotations,
        {
          id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          atomIndex,
          text,
          createdAt: Date.now(),
        },
      ],
    })),
    removeAnnotation: (id) => set((s) => ({
      annotations: s.annotations.filter(a => a.id !== id),
    })),
    clearAnnotations: () => set({ annotations: [] }),
    setLabelStyle: (labelStyle) => set({ labelStyle }),

    toggleAtomType: (type) => set((s) => {
      const next = new Set(s.hiddenAtomTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { hiddenAtomTypes: next };
    }),

    showAllAtomTypes: () => set({ hiddenAtomTypes: new Set<number>() }),

    soloAtomType: (type) => set((s) => {
      // Get all types from current file
      const file = s.file;
      if (!file) return {};
      const frame = file.trajectory.frames[s.frame];
      if (!frame) return {};
      const allTypes = new Set<number>();
      for (let i = 0; i < frame.natoms; i++) allTypes.add(frame.types[i]);
      // Hide all except the given type
      const hidden = new Set<number>();
      allTypes.forEach(t => { if (t !== type) hidden.add(t); });
      return { hiddenAtomTypes: hidden };
    }),

    setAtomTypeScale: (type, scale) => set((s) => ({
      atomTypeScales: { ...s.atomTypeScales, [type]: scale },
    })),

    resetAtomTypeScales: () => set({ atomTypeScales: {} }),

    setCameraState: (position, target) => set({ cameraPosition: position, cameraTarget: target }),

    setCameraPreset: (cameraPreset) => {
      const state = get();
      if (!state.file) return;
      
      const { min, max } = state.file.trajectory.globalBounds;
      const center: [number, number, number] = [
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2,
      ];
      const dx = max[0] - min[0];
      const dy = max[1] - min[1];
      const dz = max[2] - min[2];
      const size = Math.max(dx, dy, dz);
      const distance = size * 1.5;

      let position: [number, number, number];
      switch (cameraPreset) {
        case 'front':
          position = [center[0], center[1], center[2] + distance];
          break;
        case 'side':
          position = [center[0] + distance, center[1], center[2]];
          break;
        case 'top':
          position = [center[0], center[1] + distance, center[2]];
          break;
        case 'iso':
          position = [
            center[0] + distance * 0.7,
            center[1] + distance * 0.7,
            center[2] + distance * 0.7,
          ];
          break;
        default:
          return;
      }
      
      set({ cameraPreset, cameraPosition: position, cameraTarget: center });
    },
    setShowScaleBar: (showScaleBar) => set({ showScaleBar }),
    setColorblindMode: (colorblindMode) => {
      // Auto-switch to a colorblind-friendly palette
      if (colorblindMode) {
        set({ colorblindMode, colormap: 'viridis' });
      } else {
        set({ colorblindMode });
      }
    },

    applyVisualProfile: (profileId) => set((s) => {
      switch (profileId) {
        case 'publication':
          return {
            activeProfile: 'publication',
            backgroundPreset: 'white',
            toneMapping: 'aces', ssao: true, ssaoIntensity: 0.8,
            bloom: false, dof: false, materialPreset: 'matte', atomTexture: 'none',
            environmentPreset: 'studio', ambientLightIntensity: 0.8, dirLightIntensity: 1.0,
            colormap: 'coolwarm', colorMode: 'type', renderStyle: 'standard'
          };
        case 'neon':
          return {
            activeProfile: 'neon',
            backgroundPreset: 'void',
            toneMapping: 'aces', ssao: false,
            bloom: true, bloomIntensity: 0.6, dof: false,
            materialPreset: 'metallic', atomTexture: 'none',
            environmentPreset: 'none', ambientLightIntensity: 0.1, dirLightIntensity: 0.2,
            colormap: 'neon', colorMode: 'type', renderStyle: 'standard'
          };
        case 'cinematic':
          return {
            activeProfile: 'cinematic',
            backgroundPreset: 'deep',
            toneMapping: 'aces', ssao: true, ssaoIntensity: 0.7,
            bloom: true, bloomIntensity: 0.3, dof: true, dofFocus: 50, autoDepthOfField: true,
            materialPreset: 'metallic', atomTexture: 'scratched',
            environmentPreset: 'studio', ambientLightIntensity: 0.4, dirLightIntensity: 1.5,
            colormap: 'viridis', colorMode: 'type', renderStyle: 'standard'
          };
        case 'raw':
          return {
            activeProfile: 'raw',
            backgroundPreset: 'dark',
            toneMapping: 'none', ssao: false,
            bloom: false, dof: false, materialPreset: 'default', atomTexture: 'none',
            environmentPreset: 'studio', ambientLightIntensity: 0.35, dirLightIntensity: 1.2,
            colormap: 'viridis', colorMode: 'type', renderStyle: 'standard'
          };
        default:
          return {};
      }
    }),

    encodeToURL: () => {
      const s = get();
      // ── Delta encoding: only include values that differ from defaults ──
      const delta: Record<string, unknown> = {};

      // Helper: truncate floats to 2 decimal places
      const r = (n: number) => Math.round(n * 100) / 100;
      const rArr = (a: number[]) => a.map(r);

      // Helper: arrays are "equal" if same length and all elements within epsilon
      const arrEq = (a: number[], b: number[]) =>
        a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.01);

      if (s.frame !== 0)                              delta.f = s.frame;
      if (s.colorScheme !== DEFAULTS.colorScheme)      delta.cs = s.colorScheme;
      if (s.atomColorSource !== COLOR_SCHEMES[s.colorScheme].atomColorSource) delta.acs = s.atomColorSource;
      if (s.colorMode !== 'type')                     delta.cm = s.colorMode;
      if (s.colorProperty !== null)                    delta.cp = s.colorProperty;
      if (s.colormap !== 'viridis')                    delta.cmap = s.colormap;
      if (s.uniformAtomColor !== '#1edce0')            delta.uac = s.uniformAtomColor;
      if (Object.keys(s.elementColorOverrides).length > 0) delta.eco = s.elementColorOverrides;
      if (s.postprocessPreset !== DEFAULTS.postprocessPreset) delta.pp = s.postprocessPreset;
      if (r(s.postprocessIntensity) !== DEFAULTS.postprocessIntensity) delta.pi = r(s.postprocessIntensity);
      if (r(s.propertyEmissionStrength) !== DEFAULTS.propertyEmissionStrength) delta.pe = r(s.propertyEmissionStrength);
      if (!s.ssao)                                     delta.ssao = 0;
      if (!s.bloom)                                    delta.bloom = 0;
      if (s.dof)                                       delta.dof = 1;
      if (!s.showCell)                                 delta.cell = 0;
      if (!s.showAxes)                                 delta.axes = 0;
      if (r(s.atomScale) !== 1.0)                      delta.as = r(s.atomScale);
      if (s.backgroundPreset !== 'deep')               delta.bg = s.backgroundPreset;
      if (s.backgroundStyle !== DEFAULTS.backgroundStyle) delta.bgs = s.backgroundStyle;
      if (s.filterShellShape !== 'off')                delta.fss = s.filterShellShape;
      if (s.filterShellPreset !== 'haze')              delta.fsp = s.filterShellPreset;
      if (r(s.filterShellOpacity) !== 0.24)            delta.fso = r(s.filterShellOpacity);
      if (r(s.filterShellRadius) !== 1.08)             delta.fsr = r(s.filterShellRadius);
      if (!arrEq(s.cameraPosition, [0, 0, 50]))       delta.cp3 = rArr(s.cameraPosition);
      if (!arrEq(s.cameraTarget, [0, 0, 0]))          delta.ct = rArr(s.cameraTarget);
      if (s.cameraFov !== 50)                          delta.fov = s.cameraFov;
      if (r(s.playbackSpeed) !== 1.0)                  delta.spd = r(s.playbackSpeed);
      if (r(s.ssaoIntensity) !== DEFAULTS.ssaoIntensity) delta.si = r(s.ssaoIntensity);
      if (r(s.bloomIntensity) !== DEFAULTS.bloomIntensity) delta.bi = r(s.bloomIntensity);
      if (s.dofFocus !== 50)                           delta.df = s.dofFocus;
      if (s.toneMapping !== 'aces')                    delta.tm = s.toneMapping;
      if (s.showBonds)                                 delta.bonds = 1;
      if (r(s.bondCutoff) !== 3.2)                     delta.bc = r(s.bondCutoff);
      if (r(s.bondTolerance) !== 0.45)                 delta.bt = r(s.bondTolerance);
      if (s.renderStyle !== 'standard')                delta.rs = s.renderStyle;
      if (s.materialScene !== DEFAULTS.materialScene)  delta.ms = s.materialScene;
      if (s.materialPreset !== DEFAULTS.materialPreset) delta.mp = s.materialPreset;
      if (r(s.materialIntensity) !== DEFAULTS.materialIntensity) delta.mi = r(s.materialIntensity);
      if (s.environmentPreset !== DEFAULTS.environmentPreset) delta.env = s.environmentPreset;
      if (r(s.ambientLightIntensity) !== DEFAULTS.ambientLightIntensity) delta.ali = r(s.ambientLightIntensity);
      if (r(s.dirLightIntensity) !== DEFAULTS.dirLightIntensity) delta.dli = r(s.dirLightIntensity);
      if (r(s.rimLightIntensity) !== DEFAULTS.rimLightIntensity) delta.rli = r(s.rimLightIntensity);
      if (s.atomTexture !== 'none')                    delta.at = s.atomTexture;
      if (r(s.surfaceRoughness) !== 0.0)               delta.sr = r(s.surfaceRoughness);
      if (r(s.surfacePolish) !== 0.0)                  delta.sp = r(s.surfacePolish);
      if (r(s.surfaceClearcoat) !== 0.0)               delta.scc = r(s.surfaceClearcoat);
      if (r(s.keyLightAzimuth) !== 40.0)               delta.kla = r(s.keyLightAzimuth);
      if (r(s.keyLightElevation) !== 45.0)             delta.kle = r(s.keyLightElevation);
      if (r(s.fillLightAzimuth) !== -120.0)            delta.fla = r(s.fillLightAzimuth);
      if (r(s.fillLightElevation) !== 10.0)            delta.fle = r(s.fillLightElevation);
      if (r(s.rimLightAzimuth) !== 160.0)              delta.rla = r(s.rimLightAzimuth);
      if (r(s.rimLightElevation) !== 30.0)             delta.rle = r(s.rimLightElevation);
      if (s.fillLightColor !== DEFAULTS.fillLightColor) delta.flc = s.fillLightColor;
      if (s.rimLightColor !== DEFAULTS.rimLightColor)  delta.rlc = s.rimLightColor;

      const json = JSON.stringify(delta);
      // URL-safe base64: replace +/= with -_. for shorter, URL-friendly tokens
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },

    decodeFromURL: (params) => {
      try {
        // Restore URL-safe base64 back to standard base64
        let b64 = params.replace(/-/g, '+').replace(/_/g, '/');
        // Re-pad if needed
        while (b64.length % 4) b64 += '=';

        const s = JSON.parse(atob(b64));
        const colorScheme = resolveUrlColorScheme(s.cs, s);
        const scheme = COLOR_SCHEMES[colorScheme];
        // Merge delta onto defaults — missing keys stay at their default values
        set({
          frame: s.f ?? 0,
          colorScheme,
          atomColorSource: sanitizeAtomColorSource(s.acs, scheme.atomColorSource),
          colorMode: sanitizeColorMode(s.cm, scheme.atomColorMode),
          colorProperty: s.cp ?? null,
          colormap: s.cmap ?? 'viridis',
          uniformAtomColor: sanitizeHexColor(s.uac ?? '#1edce0'),
          elementColorOverrides: sanitizeElementColorOverrides(s.eco),
          postprocessPreset: sanitizePostprocessPreset(s.pp),
          postprocessIntensity: Math.max(0, Math.min(2, s.pi ?? DEFAULTS.postprocessIntensity)),
          propertyEmissionStrength: Math.max(0, Math.min(1, s.pe ?? DEFAULTS.propertyEmissionStrength)),
          ssao: s.ssao !== 0,
          bloom: s.bloom !== 0,
          dof: s.dof === 1,
          showCell: s.cell !== 0,
          showAxes: s.axes !== 0,
          atomScale: s.as ?? 1.0,
          backgroundPreset: s.bg ?? 'deep',
          backgroundStyle: s.bgs ?? DEFAULTS.backgroundStyle,
          filterShellShape: sanitizeFilterShellShape(s.fss),
          filterShellPreset: sanitizeFilterShellPreset(s.fsp),
          filterShellOpacity: Math.max(0, Math.min(0.65, s.fso ?? 0.24)),
          filterShellRadius: Math.max(0.75, Math.min(1.6, s.fsr ?? 1.08)),
          cameraPosition: s.cp3 ?? [0, 0, 50],
          cameraTarget: s.ct ?? [0, 0, 0],
          cameraFov: s.fov ?? 50,
          playbackSpeed: s.spd ?? 1.0,
          ssaoIntensity: s.si ?? DEFAULTS.ssaoIntensity,
          bloomIntensity: s.bi ?? DEFAULTS.bloomIntensity,
          dofFocus: s.df ?? 50,
          toneMapping: s.tm ?? 'aces',
          showBonds: s.bonds === 1,
          bondCutoff: s.bc ?? 3.2,
          bondTolerance: s.bt ?? 0.45,
          renderStyle: s.rs ?? 'standard',
          materialScene: sanitizeMaterialScene(s.ms),
          materialPreset: sanitizeMaterialPreset(s.mp),
          materialIntensity: Math.max(0, Math.min(1, s.mi ?? DEFAULTS.materialIntensity)),
          environmentPreset: sanitizeEnvironmentPreset(s.env),
          ambientLightIntensity: s.ali ?? DEFAULTS.ambientLightIntensity,
          dirLightIntensity: s.dli ?? DEFAULTS.dirLightIntensity,
          rimLightIntensity: Math.max(0, Math.min(2, s.rli ?? DEFAULTS.rimLightIntensity)),
          atomTexture: s.at ?? 'none',
          surfaceRoughness: s.sr ?? 0.0,
          surfacePolish: s.sp ?? 0.0,
          surfaceClearcoat: s.scc ?? 0.0,
          keyLightAzimuth: s.kla ?? 40,
          keyLightElevation: s.kle ?? 45,
          fillLightAzimuth: s.fla ?? -120,
          fillLightElevation: s.fle ?? 10,
          rimLightAzimuth: s.rla ?? 160,
          rimLightElevation: s.rle ?? 30,
          fillLightColor: s.flc ?? DEFAULTS.fillLightColor,
          rimLightColor: s.rlc ?? DEFAULTS.rimLightColor,
        });
      } catch {
        console.warn('Failed to decode URL state');
      }
    },

    // ─── Streaming Actions ───
    appendFrames: (frames: Frame[]) => set(state => {
      if (!state.file) return state;
      const existing = state.file.trajectory.frames;
      const merged = [...existing, ...frames];
      return {
        file: {
          ...state.file,
          trajectory: {
            ...state.file.trajectory,
            frames: merged,
            totalFrames: merged.length,
          },
        },
      };
    }),
    setStreamingProgress: (p: number) => set(() => ({ streamingProgress: p })),
    setFullTrajectoryReady: (ready: boolean) => set(() => ({ fullTrajectoryReady: ready, isStreamingFrames: !ready })),
    setLoadedAtomCount: (count: number) => set(() => ({ loadedAtomCount: count })),
  }))
);

/**
 * Pick the opening-frame visual directive for a freshly-loaded file. This
 * is the place to encode editorial defaults: small molecules open as a
 * polished showcase, medium systems keep the studio read with bonds, large
 * ones step down to paper, and very-large systems drop to diagram.
 * bonds off — performance over polish). The user can override in the panels.
 */
function pickSceneDirective(atomCount: number): {
  showBonds: boolean;
  showCell: boolean;
  showAxes: boolean;
  preset: AppState['postprocessPreset'];
  intensity: number;
  materialScene: string;
  backgroundPreset: string;
  surfaceRoughness: number;
  surfacePolish: number;
  surfaceClearcoat: number;
  rimLightIntensity: number;
  fillLightColor: string;
  rimLightColor: string;
} {
  if (atomCount === 0) {
    return {
      showBonds: false,
      showCell: false,
      showAxes: false,
      preset: 'studio',
      intensity: 1.0,
      materialScene: DEFAULT_SCENE_ID,
      backgroundPreset: 'deep',
      surfaceRoughness: 0,
      surfacePolish: 0,
      surfaceClearcoat: 0,
      rimLightIntensity: 0.3,
      fillLightColor: '#8888ff',
      rimLightColor: '#ffffff',
    };
  }
  if (atomCount < 300) {
    return {
      showBonds: true,
      showCell: false,
      showAxes: false,
      preset: 'editorial',
      intensity: 0.92,
      materialScene: DEFAULT_SCENE_ID,
      backgroundPreset: 'xray-lagoon',
      surfaceRoughness: -0.08,
      surfacePolish: 0.22,
      surfaceClearcoat: 0.18,
      rimLightIntensity: 0.48,
      fillLightColor: '#90b4ff',
      rimLightColor: '#7de9ff',
    };
  }
  if (atomCount < 25_000) {
    return {
      showBonds: true,
      showCell: true,
      showAxes: false,
      preset: 'studio',
      intensity: 1.0,
      materialScene: DEFAULT_SCENE_ID,
      backgroundPreset: 'deep',
      surfaceRoughness: -0.04,
      surfacePolish: 0.14,
      surfaceClearcoat: 0.12,
      rimLightIntensity: 0.36,
      fillLightColor: '#8888ff',
      rimLightColor: '#c7f9ff',
    };
  }
  if (atomCount < 200_000) {
    // 30k-class gallery pieces can infer 60k-180k bonds. Start atoms-first
    // and let the user opt into bonds once oriented.
    return {
      showBonds: false,
      showCell: true,
      showAxes: false,
      preset: 'paper',
      intensity: 0.85,
      materialScene: 'laboratory',
      backgroundPreset: 'white',
      surfaceRoughness: 0,
      surfacePolish: 0,
      surfaceClearcoat: 0,
      rimLightIntensity: 0,
      fillLightColor: '#8888ff',
      rimLightColor: '#ffffff',
    };
  }
  // Very-large systems — performance over polish on the first frame. User
  // can flip back into 'studio' if their machine handles it.
  return {
    showBonds: false,
    showCell: true,
    showAxes: false,
    preset: 'diagram',
    intensity: 1.0,
    materialScene: 'blueprint',
    backgroundPreset: 'slate',
    surfaceRoughness: 0,
    surfacePolish: 0,
    surfaceClearcoat: 0,
    rimLightIntensity: 0,
    fillLightColor: '#8888ff',
    rimLightColor: '#ffffff',
  };
}

// Dev-only window probe. Lets Needle Tools / Three.js DevTools / a paste-and-
// poke browser console reach the store without prop-drilling. Gone in prod.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__atlas = (window as any).__atlas ?? {};
  (window as any).__atlas.store = useStore;
  (window as any).__atlas.getState = () => useStore.getState();
  (window as any).__lupi = (window as any).__atlas;
  // Helpful console one-liners — log on first access, not on every read.
  if (!(window as any).__atlas.__intro) {
    (window as any).__atlas.__intro = true;
    // eslint-disable-next-line no-console
    console.log(
      '%c[lupi dev]%c window.__lupi/window.__atlas available - store, getState(), three (after Canvas mount)',
      'color:#1edce0;font-weight:bold', 'color:#94a3b8',
    );
  }
}
