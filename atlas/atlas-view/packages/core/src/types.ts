// ═══════════════════════════════════════════════════════════════════
// glimPSE — Core Type Definitions
// Shared across parsers, renderer, scene, and UI packages
// ═══════════════════════════════════════════════════════════════════

/** LAMMPS unit styles — determines how to label axes and interpret values */
export type UnitStyle = 'lj' | 'real' | 'metal' | 'si' | 'cgs' | 'electron' | 'micro' | 'nano';

/** Mapping of physical quantity names to display units per LAMMPS unit style */
export const UNIT_LABELS: Record<UnitStyle, Record<string, string>> = {
  metal:    { distance: 'Å', time: 'ps', energy: 'eV',      temperature: 'K', pressure: 'bar',  velocity: 'Å/ps', force: 'eV/Å' },
  real:     { distance: 'Å', time: 'fs', energy: 'kcal/mol', temperature: 'K', pressure: 'atm',  velocity: 'Å/fs', force: 'kcal/(mol·Å)' },
  lj:       { distance: 'σ', time: 'τ',  energy: 'ε',        temperature: 'ε/k_B', pressure: 'ε/σ³', velocity: 'σ/τ', force: 'ε/σ' },
  si:       { distance: 'm', time: 's',  energy: 'J',        temperature: 'K', pressure: 'Pa',   velocity: 'm/s', force: 'N' },
  cgs:      { distance: 'cm', time: 's', energy: 'erg',      temperature: 'K', pressure: 'dyn/cm²', velocity: 'cm/s', force: 'dyn' },
  electron: { distance: 'Bohr', time: 'fs', energy: 'Ha',    temperature: 'K', pressure: 'Pa',   velocity: 'Bohr/atu', force: 'Ha/Bohr' },
  micro:    { distance: 'μm', time: 'μs', energy: 'pg·μm²/μs²', temperature: 'K', pressure: 'pg/(μm·μs²)', velocity: 'μm/μs', force: 'pg·μm/μs²' },
  nano:     { distance: 'nm', time: 'ns', energy: 'attog·nm²/ns²', temperature: 'K', pressure: 'attog/(nm·ns²)', velocity: 'nm/ns', force: 'attog·nm/ns²' },
};

/** Known thermo keywords and which physical quantity they represent */
export const THERMO_QUANTITIES: Record<string, string> = {
  Step: 'step', Time: 'time',
  Temp: 'temperature', TotEng: 'energy', KinEng: 'energy', PotEng: 'energy',
  E_pair: 'energy', E_mol: 'energy', E_bond: 'energy', E_angle: 'energy',
  E_dihed: 'energy', E_impro: 'energy', E_vdwl: 'energy', E_coul: 'energy',
  E_long: 'energy', E_tail: 'energy',
  Press: 'pressure', Pxx: 'pressure', Pyy: 'pressure', Pzz: 'pressure',
  Volume: 'volume', Density: 'density',
  Lx: 'distance', Ly: 'distance', Lz: 'distance',
};

// ─── Frame data ─────────────────────────────────────────────────────

/** A single frame of atomic data (returned from WASM parser) */
export interface Frame {
  timestep: number;
  natoms: number;
  boxBounds: Float64Array;  // [xlo, xhi, ylo, yhi, zlo, zhi]
  boxTilt: Float64Array;    // [xy, xz, yz]
  triclinic: boolean;
  columns: string[];
  ids: Int32Array;
  types: Int32Array;
  positions: Float32Array;  // Flat: [x0,y0,z0, x1,y1,z1, ...]
  bonds: Int32Array;        // Flat: [a1,b1, a2,b2, ...]
  properties: Map<string, Float32Array>;
}

/** A loaded trajectory (multiple frames) */
export interface Trajectory {
  frames: Frame[];
  totalFrames: number;
  /** Unique atom types across all frames */
  atomTypes: number[];
  /** Global bounding box encompassing all frames */
  globalBounds: { min: [number, number, number]; max: [number, number, number] };
}

// ─── Thermo data ────────────────────────────────────────────────────

export interface ThermoRun {
  columns: string[];
  nrows: number;
  /** Get column data by name */
  getColumn(name: string): Float64Array | null;
}

export interface ThermoData {
  numRuns: number;
  runs: ThermoRun[];
}

// ─── Visualization state ────────────────────────────────────────────

export type ColorMode = 'type' | 'property' | 'uniform';
export type ColormapName = 'viridis' | 'inferno' | 'coolwarm' | 'plasma' | 'magma' | 'cividis' | 'neon' | 'sunset' | 'vaporwave';
export type RenderStyle = 'standard' | 'toon';

export interface VisualizationState {
  /** Current frame index */
  frame: number;
  /** Color mapping mode */
  colorMode: ColorMode;
  /** Property name for property color mode */
  colorProperty: string | null;
  /** Colormap for property mode */
  colormap: ColormapName;
  /** Post-processing effects */
  effects: {
    ssao: boolean;
    ssaoIntensity: number;
    bloom: boolean;
    bloomIntensity: number;
    dof: boolean;
    dofFocusDistance: number;
    dofAperture: number;
    antialiasing: 'none' | 'fxaa' | 'msaa4x';
    toneMapping: 'none' | 'aces' | 'reinhard';
  };
  /** Display toggles */
  display: {
    showCell: boolean;
    showBonds: boolean;
    showAxes: boolean;
    atomScale: number;
    bondRadius: number;
    backgroundColor: string;
  };
  /** Camera state */
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
    fov: number;
    near: number;
    far: number;
  };
  /** Playback */
  playback: {
    playing: boolean;
    speed: number;
    loop: boolean;
    range: [number, number];
  };
}

/** Default visualization state */
export const DEFAULT_STATE: VisualizationState = {
  frame: 0,
  colorMode: 'type',
  colorProperty: null,
  colormap: 'viridis',
  effects: {
    ssao: true, ssaoIntensity: 0.5,
    bloom: false, bloomIntensity: 0.3,
    dof: false, dofFocusDistance: 50, dofAperture: 0.025,
    antialiasing: 'fxaa',
    toneMapping: 'aces',
  },
  display: {
    showCell: true, showBonds: false, showAxes: true,
    atomScale: 1.0, bondRadius: 0.15, backgroundColor: '#08090e',
  },
  camera: {
    position: [0, 0, 50], target: [0, 0, 0], up: [0, 1, 0],
    fov: 50, near: 0.1, far: 1000,
  },
  playback: {
    playing: false, speed: 1.0, loop: true, range: [0, -1],
  },
};

// ─── Export formats ─────────────────────────────────────────────────

export interface ExportImageOptions {
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  quality: number;          // 0-1 for jpeg/webp
  transparentBackground: boolean;
  supersampling: 1 | 2 | 4; // Render at Nx resolution and downscale
}

export interface ExportVideoOptions {
  width: number;
  height: number;
  fps: number;
  codec: 'h264' | 'vp9' | 'av1';
  bitrate: number;          // bits per second
  frameRange: [number, number];
  cameraPath: 'static' | 'orbit' | 'custom';
  orbitSpeed: number;       // degrees per frame for orbit mode
}

// ─── URL state serialization ────────────────────────────────────────

/** Encode visualization state into a URL-safe string for sharing */
export function encodeState(state: Partial<VisualizationState>): string {
  return btoa(JSON.stringify(state));
}

/** Decode visualization state from a URL parameter */
export function decodeState(encoded: string): Partial<VisualizationState> {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return {};
  }
}
