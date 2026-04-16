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
