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

export interface ExportRequest {
  type: 'image' | 'video' | 'complete' | null;
  resolution?: { width: number; height: number; flexAspect?: boolean };
  format?: 'png' | 'jpeg' | 'webp' | 'mp4' | 'webm' | 'gif';
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
  colorMode: ColorMode;
  colorProperty: string | null;
  colormap: ColormapName;
  propRange: [number, number];

  // ─── Display ───
  showCell: boolean;
  showAxes: boolean;
  showBonds: boolean;
  bondCutoff: number;
  renderStyle: RenderStyle;
  atomScale: number;
  backgroundPreset: string;
  backgroundStyle: 'linear' | 'radial' | 'spotlight';
  backgroundVideo: string | null;

  // ─── Effects ───
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
  activePanel: 'style' | 'effects' | 'export' | 'analysis' | 'measurement' | 'atoms' | 'flythrough' | 'telemetry' | null;
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
  setColorMode: (mode: ColorMode) => void;
  setColorProperty: (prop: string | null) => void;
  setColormap: (map: ColormapName) => void;
  setAnomalyTracking: (tracking: boolean) => void;
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
  setRenderStyle: (style: RenderStyle) => void;
  setAtomScale: (scale: number) => void;
  setBackgroundPreset: (preset: string) => void;
  setBackgroundStyle: (style: AppState['backgroundStyle']) => void;
  setBackgroundVideo: (url: string | null) => void;
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
}

const DEFAULTS = {
  file: null,
  loading: false,
  loadProgress: 0,
  error: null,
  frame: 0,
  colorMode: 'type' as ColorMode,
  colorProperty: null,
  colormap: 'viridis' as ColormapName,
  propRange: [0, 1] as [number, number],
  showCell: true,
  showAxes: true,
  showBonds: false,
  bondCutoff: 2.5,
  renderStyle: 'standard' as RenderStyle,
  atomScale: 1.0,
  backgroundPreset: 'deep',
  backgroundStyle: 'linear' as const,
  backgroundVideo: null as string | null,
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
};

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULTS,

    setFile: (file) => set({
      file,
      frame: 0,
      playing: false,
      error: null,
      loading: false,
      loadProgress: 1,
    }),

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

    setColorMode: (colorMode) => set({ colorMode }),
    setColorProperty: (colorProperty) => set({ colorProperty }),
    setColormap: (colormap) => set({ colormap, backgroundPreset: `palette:${colormap}` }),
    setAnomalyTracking: (anomalyTracking) => set({ anomalyTracking }),

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
    setRenderStyle: (renderStyle) => set({ renderStyle }),
    setAtomScale: (atomScale) => set({ atomScale }),
    setBackgroundPreset: (backgroundPreset) => set({ backgroundPreset }),
    setBackgroundStyle: (backgroundStyle) => set({ backgroundStyle }),
    setBackgroundVideo: (backgroundVideo) => set({ backgroundVideo }),
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
      if (r(s.bondCutoff) !== 2.5)                     delta.bc = r(s.bondCutoff);
      if (s.renderStyle !== 'standard')                delta.rs = s.renderStyle;

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
          bondCutoff: s.bc ?? 2.5,
          renderStyle: s.rs ?? 'standard',
        });
      } catch {
        console.warn('Failed to decode URL state');
      }
    },
  }))
);
