import type { ColormapName } from '@atlas/core/types';

/** CPK-inspired element type colors — shared across Atoms and Bonds */
export const TYPE_COLORS: Record<number, [number, number, number]> = {
  1: [0.30, 0.72, 1.0],    // Type 1 — Cyan blue (Cu, metals)
  2: [1.0, 0.35, 0.48],    // Type 2 — Coral red (O, anions)
  3: [0.42, 0.88, 0.44],   // Type 3 — Emerald green (Zr, metals)
  4: [1.0, 0.82, 0.16],    // Type 4 — Gold
  5: [0.64, 0.50, 0.92],   // Type 5 — Lavender purple
  6: [1.0, 0.58, 0.30],    // Type 6 — Warm orange
  7: [0.85, 0.32, 0.68],   // Type 7 — Magenta
  8: [0.28, 0.86, 0.82],   // Type 8 — Teal
};

export const DEFAULT_TYPE_COLOR: [number, number, number] = [0.6, 0.6, 0.6];

export const TYPE_RADII: Record<number, number> = {
  1: 1.28, 2: 0.73, 3: 1.60, 4: 1.44,
  5: 1.20, 6: 1.10, 7: 1.35, 8: 1.50,
};

export function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function makeColormap(
  c0: [number, number, number],
  c1: [number, number, number],
  c2: [number, number, number],
  c3: [number, number, number],
): (t: number) => [number, number, number] {
  return (t: number) => {
    t = Math.max(0, Math.min(1, t));
    if (t < 0.33) return lerpColor(c0, c1, t / 0.33);
    if (t < 0.66) return lerpColor(c1, c2, (t - 0.33) / 0.33);
    return lerpColor(c2, c3, (t - 0.66) / 0.34);
  };
}

export const COLORMAPS: Record<ColormapName, (t: number) => [number, number, number]> = {
  viridis:   makeColormap([0.267, 0.004, 0.329], [0.282, 0.140, 0.458], [0.127, 0.566, 0.551], [0.993, 0.906, 0.144]),
  inferno:   makeColormap([0.001, 0.0, 0.014],   [0.416, 0.065, 0.432], [0.891, 0.298, 0.159], [0.988, 0.998, 0.644]),
  coolwarm:  (t: number) => {
    t = Math.max(0, Math.min(1, t));
    const cold: [number, number, number] = [0.230, 0.299, 0.754];
    const mid: [number, number, number] = [0.865, 0.865, 0.865];
    const warm: [number, number, number] = [0.706, 0.016, 0.150];
    if (t < 0.5) return lerpColor(cold, mid, t * 2);
    return lerpColor(mid, warm, (t - 0.5) * 2);
  },
  plasma:    makeColormap([0.050, 0.030, 0.530], [0.494, 0.012, 0.658], [0.798, 0.280, 0.470], [0.940, 0.975, 0.131]),
  magma:     makeColormap([0.001, 0.0, 0.014],   [0.416, 0.065, 0.432], [0.871, 0.287, 0.381], [0.988, 0.991, 0.750]),
  cividis:   makeColormap([0.0, 0.135, 0.305],   [0.345, 0.376, 0.388], [0.725, 0.660, 0.320], [0.995, 0.883, 0.150]),
  neon:      makeColormap([0.0, 1.0, 0.4],       [0.0, 0.8, 1.0],       [0.6, 0.0, 1.0],       [1.0, 0.0, 0.6]),
  sunset:    makeColormap([0.12, 0.0, 0.30],     [0.80, 0.15, 0.40],    [1.0, 0.55, 0.15],     [1.0, 0.92, 0.50]),
  vaporwave: makeColormap([0.05, 0.85, 0.85],    [0.55, 0.30, 0.95],    [1.0, 0.40, 0.70],     [1.0, 0.85, 0.40]),
};

function toHexChannel(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
}

function toHexColor(rgb: [number, number, number], brightness = 1): string {
  return `#${toHexChannel(rgb[0] * 255 * brightness)}${toHexChannel(rgb[1] * 255 * brightness)}${toHexChannel(rgb[2] * 255 * brightness)}`;
}

export function getBackgroundFromColormap(colormapName: ColormapName): { top: string; bottom: string } {
  const map = COLORMAPS[colormapName] ?? COLORMAPS.viridis;
  const top = toHexColor(map(0.05), 0.22);
  const bottom = toHexColor(map(0.65), 0.4);
  return { top, bottom };
}

export function getTypeColorFromColormap(atomType: number, colormapName: ColormapName): [number, number, number] {
  const maxType = 8.0;
  const t = Math.max(0, Math.min(1, (atomType - 1) / Math.max(maxType - 1.0, 1.0)));
  const map = COLORMAPS[colormapName] ?? COLORMAPS.viridis;
  return map(t);
}
