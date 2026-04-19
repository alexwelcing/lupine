export type ElementData = { symbol: string, name: string, mass: number, radius: number, block: string, role: string, color: string };

export const ELEMENT_DATA: Record<number, ElementData> = {
  1: { symbol: 'H', name: 'Hydrogen', mass: 1.008, radius: 0.31, block: 's', role: 'Terminator', color: '#ffffff' },
  2: { symbol: 'He', name: 'Helium', mass: 4.0026, radius: 0.28, block: 's', role: 'Inert Gas', color: '#d9ffff' },
  3: { symbol: 'Li', name: 'Lithium', mass: 6.94, radius: 1.28, block: 's', role: 'Intercalant', color: '#cc80ff' },
  4: { symbol: 'Be', name: 'Beryllium', mass: 9.0122, radius: 0.96, block: 's', role: 'Matrix', color: '#c2ff00' },
  5: { symbol: 'B', name: 'Boron', mass: 10.81, radius: 0.84, block: 'p', role: 'Dopant', color: '#ffb5b5' },
  6: { symbol: 'C', name: 'Carbon', mass: 12.011, radius: 0.76, block: 'p', role: 'Framework', color: '#909090' },
  7: { symbol: 'N', name: 'Nitrogen', mass: 14.007, radius: 0.71, block: 'p', role: 'Ligand', color: '#3050f8' },
  8: { symbol: 'O', name: 'Oxygen', mass: 15.999, radius: 0.66, block: 'p', role: 'Framework', color: '#ff0d0d' },
  9: { symbol: 'F', name: 'Fluorine', mass: 18.998, radius: 0.57, block: 'p', role: 'Ligand', color: '#90e050' },
  10: { symbol: 'Ne', name: 'Neon', mass: 20.180, radius: 0.58, block: 'p', role: 'Inert Gas', color: '#b3e3f5' },
  11: { symbol: 'Na', name: 'Sodium', mass: 22.990, radius: 1.66, block: 's', role: 'Intercalant', color: '#ab5cf2' },
  12: { symbol: 'Mg', name: 'Magnesium', mass: 24.305, radius: 1.41, block: 's', role: 'Matrix', color: '#8aff00' },
  13: { symbol: 'Al', name: 'Aluminum', mass: 26.982, radius: 1.21, block: 'p', role: 'Framework', color: '#bfa6a6' },
  14: { symbol: 'Si', name: 'Silicon', mass: 28.085, radius: 1.11, block: 'p', role: 'Semiconductor', color: '#f0c8a0' },
  15: { symbol: 'P', name: 'Phosphorus', mass: 30.974, radius: 1.07, block: 'p', role: 'Dopant', color: '#ff8000' },
  16: { symbol: 'S', name: 'Sulfur', mass: 32.06, radius: 1.05, block: 'p', role: 'Ligand', color: '#ffff30' },
  17: { symbol: 'Cl', name: 'Chlorine', mass: 35.45, radius: 1.02, block: 'p', role: 'Ligand', color: '#1ff01f' },
  18: { symbol: 'Ar', name: 'Argon', mass: 39.95, radius: 1.06, block: 'p', role: 'Inert Gas', color: '#80d1e3' },
  19: { symbol: 'K', name: 'Potassium', mass: 39.098, radius: 2.03, block: 's', role: 'Intercalant', color: '#8f40d4' },
  20: { symbol: 'Ca', name: 'Calcium', mass: 40.078, radius: 1.76, block: 's', role: 'Matrix', color: '#3dff00' },
  22: { symbol: 'Ti', name: 'Titanium', mass: 47.867, radius: 1.60, block: 'd', role: 'Alloy Matrix', color: '#bfc2c7' },
  23: { symbol: 'V', name: 'Vanadium', mass: 50.942, radius: 1.53, block: 'd', role: 'Alloy Component', color: '#a6a6ab' },
  24: { symbol: 'Cr', name: 'Chromium', mass: 51.996, radius: 1.39, block: 'd', role: 'Alloy Component', color: '#8a99c7' },
  25: { symbol: 'Mn', name: 'Manganese', mass: 54.938, radius: 1.39, block: 'd', role: 'Alloy Component', color: '#9c7ac7' },
  26: { symbol: 'Fe', name: 'Iron', mass: 55.845, radius: 1.32, block: 'd', role: 'Magnetic Core', color: '#e06633' },
  27: { symbol: 'Co', name: 'Cobalt', mass: 58.933, radius: 1.26, block: 'd', role: 'Magnetic Core', color: '#f090a0' },
  28: { symbol: 'Ni', name: 'Nickel', mass: 58.693, radius: 1.24, block: 'd', role: 'Alloy Matrix', color: '#50d050' },
  29: { symbol: 'Cu', name: 'Copper', mass: 63.546, radius: 1.32, block: 'd', role: 'Conductor', color: '#c88033' },
  30: { symbol: 'Zn', name: 'Zinc', mass: 65.38, radius: 1.22, block: 'd', role: 'Alloy Component', color: '#7d80b0' },
  40: { symbol: 'Zr', name: 'Zirconium', mass: 91.224, radius: 1.75, block: 'd', role: 'Alloying Agent', color: '#94e0e0' },
  42: { symbol: 'Mo', name: 'Molybdenum', mass: 95.95, radius: 1.54, block: 'd', role: 'Alloying Agent', color: '#54b5b5' },
  46: { symbol: 'Pd', name: 'Palladium', mass: 106.42, radius: 1.39, block: 'd', role: 'Catalyst', color: '#006985' },
  47: { symbol: 'Ag', name: 'Silver', mass: 107.87, radius: 1.45, block: 'd', role: 'Conductor', color: '#c0c0c0' },
  54: { symbol: 'Xe', name: 'Xenon', mass: 131.29, radius: 1.40, block: 'p', role: 'Inert Gas', color: '#429eb0' },
  74: { symbol: 'W', name: 'Tungsten', mass: 183.84, radius: 1.62, block: 'd', role: 'Refractory', color: '#2194d6' },
  78: { symbol: 'Pt', name: 'Platinum', mass: 195.08, radius: 1.36, block: 'd', role: 'Catalyst', color: '#d0d0e0' },
  79: { symbol: 'Au', name: 'Gold', mass: 196.97, radius: 1.36, block: 'd', role: 'Conductor', color: '#ffd123' },
};

export function getElementSpec(type: number): ElementData {
  if (ELEMENT_DATA[type]) return ELEMENT_DATA[type];
  const hue = (type * 137.508) % 360;
  return {
    symbol: `X${type}`,
    name: 'Unknown Isotope',
    mass: 0.00,
    radius: 1.0,
    block: '?',
    role: 'Unassigned',
    color: `hsl(${hue}, 70%, 65%)`
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  if (hex.startsWith('hsl')) {
    // very basic fallback: mostly gray for generated ones where rgb is expected
    return [0.6, 0.6, 0.6];
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255.0,
    parseInt(result[2], 16) / 255.0,
    parseInt(result[3], 16) / 255.0,
  ] : [0.6, 0.6, 0.6];
}
