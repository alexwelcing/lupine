/**
 * Device-capability tuning for atom-count-heavy scenes.
 *
 * Background: the 1M-atom scale test was capable of crashing mobile devices
 * outright (page freeze + GPU restart) because the impostor-sphere fragment
 * shader (Cook-Torrance + IBL + per-fragment depth) costs far more than a
 * phone's tile-based GPU can sustain at 1M instances. Add to that ~28MB of
 * CPU-side instance buffers and an equivalent GPU-side allocation, and a
 * mid-range phone is well past its per-tab budget before the first frame.
 *
 * This module is the single source of truth for quality defaults and the
 * absolute single-scene atom ceiling. Mobile/low devices use cheaper shader
 * paths, but they are no longer blocked from opening large molecules just
 * because the viewport is small. Used by:
 *   - Gallery.tsx - decline only scenes above the global buffer ceiling
 *   - FileDropZone.tsx - decline only scenes above the global buffer ceiling
 *   - App.tsx - pass as `maxAtoms` to AtomsOptimized as defense-in-depth
 *
 * SSR-safe: returns a desktop tier when `navigator` is unavailable.
 */

export type DeviceTier = 'mobile' | 'low' | 'desktop' | 'high';

/** Quality tier selects the impostor-sphere fragment-shader complexity.
 *  See AtomsOptimized.tsx for the per-tier work breakdown. */
export type QualityTier = 0 | 1 | 2;

export const GLOBAL_BROWSER_ATOM_CEILING = 50_000_000;

interface DeviceProfile {
  tier: DeviceTier;
  /** Soft budget for future warnings/auto-tuning. This is not a load gate. */
  recommendedAtoms: number;
  /** Hard cap on rendered atom count. This is global, not device-specific.
   *  The quality-tier system handles GPU cost; this ceiling only protects the
   *  single-scene JS heap and GPU buffer footprint. */
  maxAtoms: number;
  /** Quality tier the renderer should default to on this device. */
  qualityTier: QualityTier;
  /** Human-readable reason the cap exists, surfaced in error messaging. */
  reason: string;
}

const PROFILES: Record<DeviceTier, DeviceProfile> = {
  mobile: {
    tier: 'mobile',
    recommendedAtoms: 2_000_000,
    maxAtoms: GLOBAL_BROWSER_ATOM_CEILING,
    // Fast fragment path: skips gl_FragDepth (restores early-Z), no IBL,
    // no Cook-Torrance. 5-10x more fragment throughput on tile-based GPUs.
    qualityTier: 0,
    reason: 'the single-scene browser buffer ceiling would be exceeded',
  },
  low: {
    tier: 'low',
    recommendedAtoms: 4_000_000,
    maxAtoms: GLOBAL_BROWSER_ATOM_CEILING,
    qualityTier: 1,
    reason: 'the single-scene browser buffer ceiling would be exceeded',
  },
  desktop: {
    tier: 'desktop',
    recommendedAtoms: 10_000_000,
    maxAtoms: GLOBAL_BROWSER_ATOM_CEILING,
    qualityTier: 1,
    reason: 'the single-scene browser buffer ceiling would be exceeded',
  },
  high: {
    tier: 'high',
    // Discrete GPU + plenty of RAM. The renderer itself doesn't have an
    // architectural limit beyond instance attribute capacity.
    recommendedAtoms: GLOBAL_BROWSER_ATOM_CEILING,
    maxAtoms: GLOBAL_BROWSER_ATOM_CEILING,
    qualityTier: 2,
    reason: 'the single-scene browser buffer ceiling would be exceeded',
  },
};

/** True for phones and small tablets — UA + touch + screen-size signal. */
function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iOS first — iPad reports as "MacIntel" with touch points >= 1 since iOS 13.
  if (/iPhone|iPod/.test(ua)) return true;
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)) {
    return true;
  }
  // Android phones / small tablets.
  if (/Android/.test(ua) && /Mobile/.test(ua)) return true;
  if (/Android/.test(ua)) return true;
  // Windows phone / generic mobile UA tokens.
  if (/Mobi|Phone/.test(ua)) return true;
  // Last-ditch: tiny screen + touch input is overwhelmingly a phone.
  if (typeof window !== 'undefined') {
    const minDim = Math.min(window.innerWidth || 0, window.innerHeight || 0);
    const touch = (navigator as any).maxTouchPoints > 0;
    if (touch && minDim > 0 && minDim < 600) return true;
  }
  return false;
}

/** Best-effort device tier classification. Conservative — when in doubt,
 *  prefer the lower tier so we err toward not melting users' phones. */
export function getDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'desktop';

  if (detectMobile()) return 'mobile';

  // navigator.deviceMemory: GB of RAM, in {0.25, 0.5, 1, 2, 4, 8}. Chrome only.
  const mem = (navigator as any).deviceMemory as number | undefined;
  // hardwareConcurrency: logical CPU cores. Reasonable proxy for "this is
  // a chromebook / underpowered laptop" when memory hint is missing.
  const cores = navigator.hardwareConcurrency || 0;

  if (typeof mem === 'number' && mem > 0) {
    if (mem <= 2) return 'low';
    if (mem >= 8 && cores >= 8) return 'high';
    return 'desktop';
  }
  if (cores > 0 && cores < 4) return 'low';
  if (cores >= 8) return 'high';
  return 'desktop';
}

/** Absolute single-scene atom cap. Device tier does not reduce access. */
export function getMaxSafeAtomCount(): number {
  return PROFILES[getDeviceTier()].maxAtoms;
}

/** Quality tier the renderer should default to on this device. */
export function getDefaultQualityTier(): QualityTier {
  return PROFILES[getDeviceTier()].qualityTier;
}

/** Full profile (cap + tier + reason string for messaging). */
export function getDeviceProfile(): DeviceProfile {
  return PROFILES[getDeviceTier()];
}

/** Parse a display-formatted atom-count string ("1,000,000", "150,000+",
 *  "930") into a numeric estimate. Returns 0 when no digits are present. */
export function parseAtomCountLabel(label: string | undefined): number {
  if (!label) return 0;
  const digits = label.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Format an integer with thousand separators for messaging. */
export function formatAtomCount(n: number): string {
  return n.toLocaleString();
}
