/**
 * Materials barrel — single import point for the rest of the codebase.
 */

export type { ElementProfile } from './ElementProfile';
export { DEFAULT_PROFILE, packMaterial, packEmission, lerpProfile } from './ElementProfile';
export type { MaterialCategory } from './categoryProfiles';
export { CATEGORY_PROFILES } from './categoryProfiles';
export {
  getElementProfile,
  categoryForAtomicNumber,
  buildMaterialPaletteData,
} from './elementProfiles';
