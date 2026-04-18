/**
 * glimPSE — Global State (Zustand)
 *
 * URL-serializable: encode/decode full scene state into ?s= parameter
 * for shareable links that recreate the exact visualization.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Frame, Trajectory, ThermoData, ColormapName, ColorMode, RenderStyle } from '@atlas/core/types';

export interface ExportRequest {
  type: 'image' | 'video' | 'complete' | null;
  resolution?: { width: number; height: number; flexAspect?: boolean };
  format?: 'png' | 'jpeg' | 'webp' | 'mp4' | 'webm';
  transparent?: boolean;
  durationSeconds?: number;
  orbit?: boolean;
  baseName?: string;
  onComplete?: (success: boolean) => void;
}

export interface LoadedFile {
  name: string;
  size: number;
  trajectory: Trajectory;
  thermo: ThermoData | null;
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

  // ─── Effects ───
  ssao: boolean;
  ssaoIntensity: number;
  bloom: boolean;
  bloomIntensity: number;
  dof: boolean;
  dofFocus: number;
  toneMapping: 'none' | 'aces' | 'reinhard';
  antialiasing: 'none' | 'fxaa' | 'msaa4x';

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
  activePanel: 'style' | 'effects' | 'export' | 'analysis' | 'measurement' | 'atoms' | null;
  showStats: boolean;
  showThermo: boolean;

  // ─── Selection ───
  selectedAtoms: number[];

  // ─── Hover ───
  hoveredAtom: number | null;

  // ─── Atom visibility ───
  hiddenAtomTypes: Set<number>;
  atomTypeScales: Record<number, number>; // per-type scale overrides

  // ─── Export Pipeline ───
  exportRequest: ExportRequest;
  triggerExport: (req: Partial<ExportRequest>) => void;
  clearExportRequest: () => void;

  // ─── Actions: Camera ───
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
  toggleSSAO: () => void;
  toggleBloom: () => void;
  toggleDOF: () => void;
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
  ssao: true,
  ssaoIntensity: 0.5,
  bloom: false,
  bloomIntensity: 0.3,
  dof: false,
  dofFocus: 50,
  toneMapping: 'aces' as const,
  antialiasing: 'fxaa' as const,
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
  viewportMode: 'standard' as const,
  exportRequest: { type: null } as ExportRequest,
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

    toggleSSAO: () => set(s => ({ ssao: !s.ssao })),
    toggleBloom: () => set(s => ({ bloom: !s.bloom })),
    toggleDOF: () => set(s => ({ dof: !s.dof })),
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
      const state = {
        f: s.frame,
        cm: s.colorMode,
        cp: s.colorProperty,
        cmap: s.colormap,
        ssao: s.ssao ? 1 : 0,
        bloom: s.bloom ? 1 : 0,
        dof: s.dof ? 1 : 0,
        cell: s.showCell ? 1 : 0,
        axes: s.showAxes ? 1 : 0,
        as: s.atomScale,
        bg: s.backgroundPreset,
        cp3: s.cameraPosition,
        ct: s.cameraTarget,
        fov: s.cameraFov,
        spd: s.playbackSpeed,
        si: s.ssaoIntensity,
        bi: s.bloomIntensity,
        df: s.dofFocus,
        tm: s.toneMapping,
        bonds: s.showBonds ? 1 : 0,
        bc: s.bondCutoff,
        rs: s.renderStyle,
      };
      return btoa(JSON.stringify(state));
    },

    decodeFromURL: (params) => {
      try {
        const s = JSON.parse(atob(params));
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
