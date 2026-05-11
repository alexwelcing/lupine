// ═══════════════════════════════════════════════════════════════════
// glimPSE — Core Exports
// ═══════════════════════════════════════════════════════════════════

export type {
  UnitStyle,
  Frame,
  Trajectory,
  ThermoRun,
  ThermoData,
  ColorMode,
  ColormapName,
  VisualizationState,
  ExportImageOptions,
  ExportVideoOptions,
  BondSourceType,
  BondProperties,
  BondData,
  BondStats,
  BondDivergence,
} from './types';

export {
  UNIT_LABELS,
  THERMO_QUANTITIES,
  DEFAULT_STATE,
  encodeState,
  decodeState,
} from './types';

export * from './elements';
export * from './generators/ProceduralLupine';

// ─── Streaming binary format ────────────────────────────────────────
export type {
  GlimbinHeader,
  FrameIndexEntry,
  GlimbinIndex,
  DatasetMeta,
} from './glimbin';

export {
  GLIMBIN_MAGIC,
  GLIMBIN_VERSION,
  HEADER_SIZE,
  FRAME_ENTRY_SIZE,
  FLAG_COMPRESSED,
  FLAG_LITTLE_ENDIAN,
  FLAG_VARIABLE_ATOMS,
  FLAG_HAS_BONDS,
  FLAG_HAS_PROPERTIES,
  parseHeader,
  parseFrameIndex,
  parseFrameData,
  writeHeader,
} from './glimbin';
