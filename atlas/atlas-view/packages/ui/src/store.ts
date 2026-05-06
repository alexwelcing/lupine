/**
 * glimPSE — Global State (Zustand)
 *
 * URL-serializable: encode/decode full scene state into ?s= parameter
 * for shareable links that recreate the exact visualization.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Frame, Trajectory, ThermoData, ColormapName, ColorMode, RenderStyle } from '@atlas/core/types';
import type { FlythroughSequence, FlythroughKeyframe } from './flythrough';
import { COLOR_SCHEMES, pickInitialScheme, type ColorSchemeId, type AtomColorSource } from './coloring';

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
  format?: 'png' | 'jpeg' | 'webp' | 'mp4' | 'webm' | 'gif' | 'glb' | 'usdz';
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
}

export interface AppState {
  // ─── File state ───
  file: LoadedFile | null;
  loading: boolean;
  loadProgress: number;
  error: string | null;

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
  propRange: [number, number];

  // ─── Display ───
  showCell: boolean;
  showAxes: boolean;
  showBonds: boolean;
  bondCutoff: number;
  bondColorMode: 'type' | 'length' | 'energy' | 'screening';
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
  backgroundVideo: string | null;
  environmentPreset: 'city' | 'studio' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'none';
  materialPreset: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic';

  // ─── Lighting & Texture ───
  ambientLightIntensity: number;
  dirLightIntensity: number;
  atomTexture: 'none' | 'scratched' | 'noise';

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
  activePanel: 'visuals' | 'export' | 'analysis' | 'measurement' | 'flythrough' | 'telemetry' | null;
  activeProfile: 'publication' | 'neon' | 'cinematic' | 'raw' | null;
  showStats: boolean;
  showThermo: boolean;

  // ─── Selection ───
  selectedAtoms: number[];

  // ─── Hover ───
  hoveredAtom: number | null;

  // ─── Atom visibility ───
  hiddenAtomTypes: Set<number>;
  atomTypeScales: Record<number, number>; // per-type scale overrides

  // ─── Anomalies ───
  anomalyTracking: boolean;

  // ─── Streaming (Two-Phase Loading) ───
  streamingProgress: number;
  isStreamingFrames: boolean;
  fullTrajectoryReady: boolean;
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
  setFile: (file: LoadedFile) => void;
  setLoading: (loading: boolean, progress?: number) => void;
  setError: (error: string | null) => void;
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
  setBondColorMode: (mode: AppState['bondColorMode']) => void;
  setUseGpuBonds: (v: boolean) => void;
  setGpuBondsStatus: (status: AppState['gpuBondsStatus']) => void;
  reportBondsUpdate: (source: AppState['bondSource'], count: number) => void;
  registerBondDataset: (dataset: BondDataset) => void;
  setActiveBondDataset: (id: string | null) => void;
  setRenderStyle: (style: RenderStyle) => void;
  setAtomScale: (scale: number) => void;
  setBackgroundPreset: (preset: string) => void;
  setBackgroundStyle: (style: AppState['backgroundStyle']) => void;
  setBackgroundVideo: (videoUrl: string | null) => void;
  setEnvironmentPreset: (preset: 'city' | 'studio' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'none') => void;
  setMaterialPreset: (preset: 'default' | 'matte' | 'metallic' | 'glass' | 'plastic') => void;
  setAmbientLightIntensity: (val: number) => void;
  setDirLightIntensity: (val: number) => void;
  setAtomTexture: (tex: 'none' | 'scratched' | 'noise') => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  clearFile: () => void;
  reset: () => void;
  setSelectedAtoms: (atoms: number[] | ((prev: number[]) => number[])) => void;
  setHoveredAtom: (atom: number | null) => void;
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
}

const DEFAULTS = {
  file: null,
  loading: false,
  loadProgress: 0,
  error: null,
  frame: 0,
  colorScheme: 'element' as ColorSchemeId,
  atomColorSource: 'element' as AtomColorSource,
  colorMode: 'type' as ColorMode,
  colorProperty: null,
  colormap: 'viridis' as ColormapName,
  propRange: [0, 1] as [number, number],
  showCell: true,
  showAxes: true,
  showBonds: false,
  bondCutoff: 3.2,
  bondColorMode: 'type' as const,
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
  backgroundVideo: null as string | null,
  environmentPreset: 'studio' as const,
  materialPreset: 'default' as const,

  ambientLightIntensity: 0.35,
  dirLightIntensity: 1.2,
  atomTexture: 'none' as const,

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
  activeProfile: null,
  showStats: false,
  showThermo: true,
  selectedAtoms: [] as number[],
  hoveredAtom: null as number | null,
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

      // Pick a coloring scheme based on what the data carries.
      const hasProperty = !!firstFrame?.properties && firstFrame.properties.size > 0;
      const uniqueTypes = firstFrame?.types
        ? new Set(firstFrame.types).size
        : 0;
      const schemeId = pickInitialScheme({ hasProperty, uniqueTypes });
      const scheme = COLOR_SCHEMES[schemeId];

      set({
        file,
        frame: 0,
        playing: false,
        error: null,
        loading: false,
        loadProgress: 1,
        showBonds: sceneDirective.showBonds,
        postprocessPreset: sceneDirective.preset,
        postprocessIntensity: sceneDirective.intensity,
        // Coloring directive — visible default, easy to override in UI.
        colorScheme: schemeId,
        atomColorSource: scheme.atomColorSource,
        colorMode: scheme.atomColorMode,
        // Legacy mirrors of preset (PresetLegacyBridge re-syncs but writing
        // them here avoids a one-frame flash before the bridge catches up).
        ssao: sceneDirective.preset !== 'diagram',
        bloom: sceneDirective.preset === 'studio' || sceneDirective.preset === 'editorial' || sceneDirective.preset === 'cinematic',
        dof: sceneDirective.preset === 'cinematic',
      });
    },

    setLoading: (loading, progress) => set({
      loading,
      loadProgress: progress ?? (loading ? 0 : 1),
    }),

    setError: (error) => set({ error, loading: false }),
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
      const current = get();
      set({
        colorScheme,
        atomColorSource: scheme.atomColorSource,
        colorMode: scheme.atomColorMode,
        renderStyle: scheme.botanical
          ? 'botanical'
          : (current.renderStyle === 'botanical' ? 'standard' : current.renderStyle),
      });
    },
    setAtomColorSource: (atomColorSource) => set({ atomColorSource }),
    setColorMode: (colorMode) => set({ colorMode }),
    setColorProperty: (colorProperty) => set({ colorProperty }),
    setColormap: (colormap) => set({ colormap, activeProfile: null }),
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
    setBondColorMode: (bondColorMode) => set({ bondColorMode }),
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
    setBackgroundVideo: (backgroundVideo) => set({ backgroundVideo }),
    setEnvironmentPreset: (environmentPreset) => set({ environmentPreset }),
    setMaterialPreset: (materialPreset) => set({ materialPreset }),
    setAmbientLightIntensity: (ambientLightIntensity) => set({ ambientLightIntensity }),
    setDirLightIntensity: (dirLightIntensity) => set({ dirLightIntensity }),
    setAtomTexture: (atomTexture) => set({ atomTexture }),
    setActivePanel: (activePanel) => set(s => ({
      activePanel: s.activePanel === activePanel ? null : activePanel,
    })),

    clearFile: () => set({
      file: null,
      frame: 0,
      playing: false,
      loading: false,
      loadProgress: 0,
      error: null,
      activePanel: null,
      exportRequest: { type: null },
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

    setSelectedAtoms: (updater) => set((s) => ({
      selectedAtoms: typeof updater === 'function' ? updater(s.selectedAtoms) : updater,
    })),

    setHoveredAtom: (hoveredAtom) => set({ hoveredAtom }),

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
            backgroundPreset: 'white', backgroundVideo: null,
            toneMapping: 'aces', ssao: true, ssaoIntensity: 0.8,
            bloom: false, dof: false, materialPreset: 'matte', atomTexture: 'none',
            environmentPreset: 'studio', ambientLightIntensity: 0.8, dirLightIntensity: 1.0,
            colormap: 'coolwarm', colorMode: 'type', renderStyle: 'standard'
          };
        case 'neon':
          return {
            activeProfile: 'neon',
            backgroundPreset: 'void', backgroundVideo: null,
            toneMapping: 'aces', ssao: false,
            bloom: true, bloomIntensity: 0.6, dof: false,
            materialPreset: 'metallic', atomTexture: 'none',
            environmentPreset: 'none', ambientLightIntensity: 0.1, dirLightIntensity: 0.2,
            colormap: 'neon', colorMode: 'type', renderStyle: 'standard'
          };
        case 'cinematic':
          return {
            activeProfile: 'cinematic',
            backgroundPreset: 'deep', backgroundVideo: null,
            toneMapping: 'aces', ssao: true, ssaoIntensity: 0.7,
            bloom: true, bloomIntensity: 0.3, dof: true, dofFocus: 50, autoDepthOfField: true,
            materialPreset: 'metallic', atomTexture: 'scratched',
            environmentPreset: 'studio', ambientLightIntensity: 0.4, dirLightIntensity: 1.5,
            colormap: 'viridis', colorMode: 'type', renderStyle: 'standard'
          };
        case 'raw':
          return {
            activeProfile: 'raw',
            backgroundPreset: 'dark', backgroundVideo: null,
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
      if (s.colorMode !== 'type')                     delta.cm = s.colorMode;
      if (s.colorProperty !== null)                    delta.cp = s.colorProperty;
      if (s.colormap !== 'viridis')                    delta.cmap = s.colormap;
      if (!s.ssao)                                     delta.ssao = 0;
      if (s.bloom)                                     delta.bloom = 1;
      if (s.dof)                                       delta.dof = 1;
      if (!s.showCell)                                 delta.cell = 0;
      if (!s.showAxes)                                 delta.axes = 0;
      if (r(s.atomScale) !== 1.0)                      delta.as = r(s.atomScale);
      if (s.backgroundPreset !== 'deep')               delta.bg = s.backgroundPreset;
      if (s.backgroundStyle !== 'linear')              delta.bgs = s.backgroundStyle;
      if (!arrEq(s.cameraPosition, [0, 0, 50]))       delta.cp3 = rArr(s.cameraPosition);
      if (!arrEq(s.cameraTarget, [0, 0, 0]))          delta.ct = rArr(s.cameraTarget);
      if (s.cameraFov !== 50)                          delta.fov = s.cameraFov;
      if (r(s.playbackSpeed) !== 1.0)                  delta.spd = r(s.playbackSpeed);
      if (r(s.ssaoIntensity) !== 0.5)                  delta.si = r(s.ssaoIntensity);
      if (r(s.bloomIntensity) !== 0.3)                 delta.bi = r(s.bloomIntensity);
      if (s.dofFocus !== 50)                           delta.df = s.dofFocus;
      if (s.toneMapping !== 'aces')                    delta.tm = s.toneMapping;
      if (s.showBonds)                                 delta.bonds = 1;
      if (r(s.bondCutoff) !== 3.2)                     delta.bc = r(s.bondCutoff);
      if (s.renderStyle !== 'standard')                delta.rs = s.renderStyle;
      if (r(s.ambientLightIntensity) !== 0.35)         delta.ali = r(s.ambientLightIntensity);
      if (r(s.dirLightIntensity) !== 1.2)              delta.dli = r(s.dirLightIntensity);
      if (s.atomTexture !== 'none')                    delta.at = s.atomTexture;

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
        // Merge delta onto defaults — missing keys stay at their default values
        set({
          frame: s.f ?? 0,
          colorMode: s.cm ?? 'type',
          colorProperty: s.cp ?? null,
          colormap: s.cmap ?? 'viridis',
          ssao: s.ssao !== 0,
          bloom: s.bloom === 1,
          dof: s.dof === 1,
          showCell: s.cell !== 0,
          showAxes: s.axes !== 0,
          atomScale: s.as ?? 1.0,
          backgroundPreset: s.bg ?? 'deep',
          backgroundStyle: s.bgs ?? 'linear',
          cameraPosition: s.cp3 ?? [0, 0, 50],
          cameraTarget: s.ct ?? [0, 0, 0],
          cameraFov: s.fov ?? 50,
          playbackSpeed: s.spd ?? 1.0,
          ssaoIntensity: s.si ?? 0.5,
          bloomIntensity: s.bi ?? 0.3,
          dofFocus: s.df ?? 50,
          toneMapping: s.tm ?? 'aces',
          showBonds: s.bonds === 1,
          bondCutoff: s.bc ?? 3.2,
          renderStyle: s.rs ?? 'standard',
          ambientLightIntensity: s.ali ?? 0.35,
          dirLightIntensity: s.dli ?? 1.2,
          atomTexture: s.at ?? 'none',
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
  }))
);

/**
 * Pick the opening-frame visual directive for a freshly-loaded file. This
 * is the place to encode editorial defaults: small systems get the polished
 * "studio" look, medium ones stay there with bonds, large ones step down to
 * "paper" (cheaper effects), and very-large drop to "diagram" (no postprocess,
 * bonds off — performance over polish). The user can override in the panels.
 */
function pickSceneDirective(atomCount: number): {
  showBonds: boolean;
  preset: AppState['postprocessPreset'];
  intensity: number;
} {
  if (atomCount === 0) {
    return { showBonds: false, preset: 'studio', intensity: 1.0 };
  }
  if (atomCount < 50_000) {
    return { showBonds: true, preset: 'studio', intensity: 1.0 };
  }
  if (atomCount < 200_000) {
    // Bonds still on — the GPU pipeline can handle it. Preset drops to paper
    // for cleaner figure-quality reads at scale; bloom/DOF would clutter.
    return { showBonds: true, preset: 'paper', intensity: 0.85 };
  }
  // Very-large systems — performance over polish on the first frame. User
  // can flip back into 'studio' if their machine handles it.
  return { showBonds: false, preset: 'diagram', intensity: 1.0 };
}

// Dev-only window probe. Lets Needle Tools / Three.js DevTools / a paste-and-
// poke browser console reach the store without prop-drilling. Gone in prod.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__atlas = (window as any).__atlas ?? {};
  (window as any).__atlas.store = useStore;
  (window as any).__atlas.getState = () => useStore.getState();
  // Helpful console one-liners — log on first access, not on every read.
  if (!(window as any).__atlas.__intro) {
    (window as any).__atlas.__intro = true;
    // eslint-disable-next-line no-console
    console.log(
      '%c[atlas dev]%c window.__atlas available — store, getState(), three (after Canvas mount)',
      'color:#1edce0;font-weight:bold', 'color:#94a3b8',
    );
  }
}
