export type ElementData = {
  symbol: string,
  name: string,
  mass: number,
  /** Single-bond covalent radius in Å (Cordero et al. 2008, "Covalent radii
   *  revisited"). Drives bond detection: cutoff = r_cov(A)+r_cov(B)+tolerance.
   *  For elements with no published covalent radius (Po, At, Rn, heavy
   *  actinides) the value is taken from Pyykkö 2009 single-bond radii. */
  radius: number,
  /** Render radius in Å used by the atom mesh. Decoupled from `radius` so
   *  bonds remain visible: when an atom is drawn at full covalent radius
   *  the bond cylinder (which spans atom-center to atom-center) is fully
   *  buried inside the sphere for tight pairs (C–C, Cu–Cu, Au–Au, …). The
   *  formula clamp(0.5·radius, 0.30, 0.70) gives a conventional ball-and-
   *  stick proportion across the periodic table. */
  displayRadius: number,
  block: string,
  role: string,
  color: string,
};

/** Convert covalent radius to a sensible ball-and-stick display radius. The
 *  clamp keeps tiny atoms (H, He) visible at ≥0.30 Å and prevents big atoms
 *  (Cs, Ba, La) from swallowing their bonds — for any pair the half-bond
 *  (≈ ½·(r_A + r_B + slack)) exceeds the display radius, so the bond cylinder
 *  pokes out. Fallback elements (`getElementSpec` for unknown types) reuse
 *  this rule. */
function ballAndStickRadius(covalent: number): number {
  return Math.min(0.70, Math.max(0.30, covalent * 0.5));
}

const RAW_ELEMENT_DATA: Record<number, Omit<ElementData, 'displayRadius'> & { displayRadius?: number }> = {
  1:  { symbol: 'H',  name: 'Hydrogen',     mass: 1.008,    radius: 0.31, block: 's', role: 'Terminator',          color: '#ffffff' },
  2:  { symbol: 'He', name: 'Helium',       mass: 4.0026,   radius: 0.28, block: 's', role: 'Inert Gas',           color: '#d9ffff' },
  3:  { symbol: 'Li', name: 'Lithium',      mass: 6.94,     radius: 1.28, block: 's', role: 'Intercalant',         color: '#cc80ff' },
  4:  { symbol: 'Be', name: 'Beryllium',    mass: 9.0122,   radius: 0.96, block: 's', role: 'Matrix',              color: '#c2ff00' },
  5:  { symbol: 'B',  name: 'Boron',        mass: 10.81,    radius: 0.84, block: 'p', role: 'Dopant',              color: '#ffb5b5' },
  6:  { symbol: 'C',  name: 'Carbon',       mass: 12.011,   radius: 0.76, block: 'p', role: 'Framework',           color: '#909090' },
  7:  { symbol: 'N',  name: 'Nitrogen',     mass: 14.007,   radius: 0.71, block: 'p', role: 'Ligand',              color: '#3050f8' },
  8:  { symbol: 'O',  name: 'Oxygen',       mass: 15.999,   radius: 0.66, block: 'p', role: 'Framework',           color: '#ff0d0d' },
  9:  { symbol: 'F',  name: 'Fluorine',     mass: 18.998,   radius: 0.57, block: 'p', role: 'Ligand',              color: '#90e050' },
  10: { symbol: 'Ne', name: 'Neon',         mass: 20.180,   radius: 0.58, block: 'p', role: 'Inert Gas',           color: '#b3e3f5' },
  11: { symbol: 'Na', name: 'Sodium',       mass: 22.990,   radius: 1.66, block: 's', role: 'Intercalant',         color: '#ab5cf2' },
  12: { symbol: 'Mg', name: 'Magnesium',    mass: 24.305,   radius: 1.41, block: 's', role: 'Matrix',              color: '#8aff00' },
  13: { symbol: 'Al', name: 'Aluminum',     mass: 26.982,   radius: 1.21, block: 'p', role: 'Framework',           color: '#bfa6a6' },
  14: { symbol: 'Si', name: 'Silicon',      mass: 28.085,   radius: 1.11, block: 'p', role: 'Semiconductor',       color: '#f0c8a0' },
  15: { symbol: 'P',  name: 'Phosphorus',   mass: 30.974,   radius: 1.07, block: 'p', role: 'Dopant',              color: '#ff8000' },
  16: { symbol: 'S',  name: 'Sulfur',       mass: 32.06,    radius: 1.05, block: 'p', role: 'Ligand',              color: '#ffff30' },
  17: { symbol: 'Cl', name: 'Chlorine',     mass: 35.45,    radius: 1.02, block: 'p', role: 'Ligand',              color: '#1ff01f' },
  18: { symbol: 'Ar', name: 'Argon',        mass: 39.95,    radius: 1.06, block: 'p', role: 'Inert Gas',           color: '#80d1e3' },
  19: { symbol: 'K',  name: 'Potassium',    mass: 39.098,   radius: 2.03, block: 's', role: 'Intercalant',         color: '#8f40d4' },
  20: { symbol: 'Ca', name: 'Calcium',      mass: 40.078,   radius: 1.76, block: 's', role: 'Matrix',              color: '#3dff00' },
  21: { symbol: 'Sc', name: 'Scandium',     mass: 44.956,   radius: 1.70, block: 'd', role: 'Alloy Component',     color: '#e6e6e6' },
  22: { symbol: 'Ti', name: 'Titanium',     mass: 47.867,   radius: 1.60, block: 'd', role: 'Alloy Matrix',        color: '#bfc2c7' },
  23: { symbol: 'V',  name: 'Vanadium',     mass: 50.942,   radius: 1.53, block: 'd', role: 'Alloy Component',     color: '#a6a6ab' },
  24: { symbol: 'Cr', name: 'Chromium',     mass: 51.996,   radius: 1.39, block: 'd', role: 'Alloy Component',     color: '#8a99c7' },
  25: { symbol: 'Mn', name: 'Manganese',    mass: 54.938,   radius: 1.39, block: 'd', role: 'Alloy Component',     color: '#9c7ac7' },
  26: { symbol: 'Fe', name: 'Iron',         mass: 55.845,   radius: 1.32, block: 'd', role: 'Magnetic Core',       color: '#e06633' },
  27: { symbol: 'Co', name: 'Cobalt',       mass: 58.933,   radius: 1.26, block: 'd', role: 'Magnetic Core',       color: '#f090a0' },
  28: { symbol: 'Ni', name: 'Nickel',       mass: 58.693,   radius: 1.24, block: 'd', role: 'Alloy Matrix',        color: '#50d050' },
  29: { symbol: 'Cu', name: 'Copper',       mass: 63.546,   radius: 1.32, block: 'd', role: 'Conductor',           color: '#c88033' },
  30: { symbol: 'Zn', name: 'Zinc',         mass: 65.38,    radius: 1.22, block: 'd', role: 'Alloy Component',     color: '#7d80b0' },
  31: { symbol: 'Ga', name: 'Gallium',      mass: 69.723,   radius: 1.22, block: 'p', role: 'Semiconductor',       color: '#c28f8f' },
  32: { symbol: 'Ge', name: 'Germanium',    mass: 72.630,   radius: 1.20, block: 'p', role: 'Semiconductor',       color: '#668f8f' },
  33: { symbol: 'As', name: 'Arsenic',      mass: 74.922,   radius: 1.19, block: 'p', role: 'Dopant',              color: '#bd80e3' },
  34: { symbol: 'Se', name: 'Selenium',     mass: 78.971,   radius: 1.20, block: 'p', role: 'Chalcogen',           color: '#ffa100' },
  35: { symbol: 'Br', name: 'Bromine',      mass: 79.904,   radius: 1.20, block: 'p', role: 'Ligand',              color: '#a62929' },
  36: { symbol: 'Kr', name: 'Krypton',      mass: 83.798,   radius: 1.16, block: 'p', role: 'Inert Gas',           color: '#5cb8d1' },
  37: { symbol: 'Rb', name: 'Rubidium',     mass: 85.468,   radius: 2.20, block: 's', role: 'Intercalant',         color: '#702eb0' },
  38: { symbol: 'Sr', name: 'Strontium',    mass: 87.62,    radius: 1.95, block: 's', role: 'Matrix',              color: '#00ff00' },
  39: { symbol: 'Y',  name: 'Yttrium',      mass: 88.906,   radius: 1.90, block: 'd', role: 'Alloy Component',     color: '#94ffff' },
  40: { symbol: 'Zr', name: 'Zirconium',    mass: 91.224,   radius: 1.75, block: 'd', role: 'Alloying Agent',      color: '#94e0e0' },
  41: { symbol: 'Nb', name: 'Niobium',      mass: 92.906,   radius: 1.64, block: 'd', role: 'Refractory',          color: '#73c2c9' },
  42: { symbol: 'Mo', name: 'Molybdenum',   mass: 95.95,    radius: 1.54, block: 'd', role: 'Alloying Agent',      color: '#54b5b5' },
  43: { symbol: 'Tc', name: 'Technetium',   mass: 98.0,     radius: 1.47, block: 'd', role: 'Radioisotope',        color: '#3b9e9e' },
  44: { symbol: 'Ru', name: 'Ruthenium',    mass: 101.07,   radius: 1.46, block: 'd', role: 'Catalyst',            color: '#248f8f' },
  45: { symbol: 'Rh', name: 'Rhodium',      mass: 102.91,   radius: 1.42, block: 'd', role: 'Catalyst',            color: '#0a7d8c' },
  46: { symbol: 'Pd', name: 'Palladium',    mass: 106.42,   radius: 1.39, block: 'd', role: 'Catalyst',            color: '#006985' },
  47: { symbol: 'Ag', name: 'Silver',       mass: 107.87,   radius: 1.45, block: 'd', role: 'Conductor',           color: '#c0c0c0' },
  48: { symbol: 'Cd', name: 'Cadmium',      mass: 112.41,   radius: 1.44, block: 'd', role: 'Semiconductor',       color: '#ffd98f' },
  49: { symbol: 'In', name: 'Indium',       mass: 114.82,   radius: 1.42, block: 'p', role: 'Semiconductor',       color: '#a67573' },
  50: { symbol: 'Sn', name: 'Tin',          mass: 118.71,   radius: 1.39, block: 'p', role: 'Solder',              color: '#668080' },
  51: { symbol: 'Sb', name: 'Antimony',     mass: 121.76,   radius: 1.39, block: 'p', role: 'Dopant',              color: '#9e63b5' },
  52: { symbol: 'Te', name: 'Tellurium',    mass: 127.60,   radius: 1.38, block: 'p', role: 'Chalcogen',           color: '#d47a00' },
  53: { symbol: 'I',  name: 'Iodine',       mass: 126.90,   radius: 1.39, block: 'p', role: 'Ligand',              color: '#940094' },
  54: { symbol: 'Xe', name: 'Xenon',        mass: 131.29,   radius: 1.40, block: 'p', role: 'Inert Gas',           color: '#429eb0' },
  55: { symbol: 'Cs', name: 'Cesium',       mass: 132.91,   radius: 2.44, block: 's', role: 'Intercalant',         color: '#57178f' },
  56: { symbol: 'Ba', name: 'Barium',       mass: 137.33,   radius: 2.15, block: 's', role: 'Matrix',              color: '#00c900' },
  57: { symbol: 'La', name: 'Lanthanum',    mass: 138.91,   radius: 2.07, block: 'f', role: 'Garnet Cation',       color: '#70d4ff' },
  58: { symbol: 'Ce', name: 'Cerium',       mass: 140.12,   radius: 2.04, block: 'f', role: 'Catalyst',            color: '#ffffc7' },
  59: { symbol: 'Pr', name: 'Praseodymium', mass: 140.91,   radius: 2.03, block: 'f', role: 'Magnet Component',    color: '#d9ffc7' },
  60: { symbol: 'Nd', name: 'Neodymium',    mass: 144.24,   radius: 2.01, block: 'f', role: 'Magnet Component',    color: '#c7ffc7' },
  61: { symbol: 'Pm', name: 'Promethium',   mass: 145.0,    radius: 1.99, block: 'f', role: 'Radioisotope',        color: '#a3ffc7' },
  62: { symbol: 'Sm', name: 'Samarium',     mass: 150.36,   radius: 1.98, block: 'f', role: 'Magnet Component',    color: '#8fffc7' },
  63: { symbol: 'Eu', name: 'Europium',     mass: 151.96,   radius: 1.98, block: 'f', role: 'Phosphor',            color: '#61ffc7' },
  64: { symbol: 'Gd', name: 'Gadolinium',   mass: 157.25,   radius: 1.96, block: 'f', role: 'Contrast Agent',      color: '#45ffc7' },
  65: { symbol: 'Tb', name: 'Terbium',      mass: 158.93,   radius: 1.94, block: 'f', role: 'Phosphor',            color: '#30ffc7' },
  66: { symbol: 'Dy', name: 'Dysprosium',   mass: 162.50,   radius: 1.92, block: 'f', role: 'Magnet Component',    color: '#1fffc7' },
  67: { symbol: 'Ho', name: 'Holmium',      mass: 164.93,   radius: 1.92, block: 'f', role: 'Magnet Component',    color: '#00ff9c' },
  68: { symbol: 'Er', name: 'Erbium',       mass: 167.26,   radius: 1.89, block: 'f', role: 'Phosphor',            color: '#00e675' },
  69: { symbol: 'Tm', name: 'Thulium',      mass: 168.93,   radius: 1.90, block: 'f', role: 'Phosphor',            color: '#00d452' },
  70: { symbol: 'Yb', name: 'Ytterbium',    mass: 173.05,   radius: 1.87, block: 'f', role: 'Laser Dopant',        color: '#00bf38' },
  71: { symbol: 'Lu', name: 'Lutetium',     mass: 174.97,   radius: 1.87, block: 'd', role: 'Catalyst',            color: '#00ab24' },
  72: { symbol: 'Hf', name: 'Hafnium',      mass: 178.49,   radius: 1.75, block: 'd', role: 'High-K Dielectric',   color: '#4dc2ff' },
  73: { symbol: 'Ta', name: 'Tantalum',     mass: 180.95,   radius: 1.70, block: 'd', role: 'Capacitor',           color: '#4da6ff' },
  74: { symbol: 'W',  name: 'Tungsten',     mass: 183.84,   radius: 1.62, block: 'd', role: 'Refractory',          color: '#2194d6' },
  75: { symbol: 'Re', name: 'Rhenium',      mass: 186.21,   radius: 1.51, block: 'd', role: 'Catalyst',            color: '#267dab' },
  76: { symbol: 'Os', name: 'Osmium',       mass: 190.23,   radius: 1.44, block: 'd', role: 'Refractory',          color: '#266696' },
  77: { symbol: 'Ir', name: 'Iridium',      mass: 192.22,   radius: 1.41, block: 'd', role: 'Catalyst',            color: '#175487' },
  78: { symbol: 'Pt', name: 'Platinum',     mass: 195.08,   radius: 1.36, block: 'd', role: 'Catalyst',            color: '#d0d0e0' },
  79: { symbol: 'Au', name: 'Gold',         mass: 196.97,   radius: 1.36, block: 'd', role: 'Conductor',           color: '#ffd123' },
  80: { symbol: 'Hg', name: 'Mercury',      mass: 200.59,   radius: 1.32, block: 'd', role: 'Liquid Metal',        color: '#b8b8d0' },
  81: { symbol: 'Tl', name: 'Thallium',     mass: 204.38,   radius: 1.45, block: 'p', role: 'Dopant',              color: '#a6544d' },
  82: { symbol: 'Pb', name: 'Lead',         mass: 207.2,    radius: 1.46, block: 'p', role: 'Heavy Shield',        color: '#575961' },
  83: { symbol: 'Bi', name: 'Bismuth',      mass: 208.98,   radius: 1.48, block: 'p', role: 'Topological Solid',   color: '#9e4fb5' },
  84: { symbol: 'Po', name: 'Polonium',     mass: 209.0,    radius: 1.40, block: 'p', role: 'Radioisotope',        color: '#ab5c00' },
  85: { symbol: 'At', name: 'Astatine',     mass: 210.0,    radius: 1.50, block: 'p', role: 'Halogen',             color: '#754f45' },
  86: { symbol: 'Rn', name: 'Radon',        mass: 222.0,    radius: 1.50, block: 'p', role: 'Inert Gas',           color: '#428296' },
  // Selected actinides for hero scenes (U fission, Pu reactor, Th cycle).
  // Pyykkö 2009 single-bond covalent radii.
  88: { symbol: 'Ra', name: 'Radium',       mass: 226.0,    radius: 2.21, block: 's', role: 'Radioisotope',        color: '#42d046' },
  90: { symbol: 'Th', name: 'Thorium',      mass: 232.04,   radius: 2.06, block: 'f', role: 'Reactor Fuel',        color: '#00baff' },
  92: { symbol: 'U',  name: 'Uranium',      mass: 238.03,   radius: 1.96, block: 'f', role: 'Reactor Fuel',        color: '#008fff' },
  94: { symbol: 'Pu', name: 'Plutonium',    mass: 244.0,    radius: 1.87, block: 'f', role: 'Reactor Fuel',        color: '#006bff' },
};

export const ELEMENT_DATA: Record<number, ElementData> = (() => {
  const out: Record<number, ElementData> = {};
  for (const [key, raw] of Object.entries(RAW_ELEMENT_DATA)) {
    out[Number(key)] = {
      ...raw,
      displayRadius: raw.displayRadius ?? ballAndStickRadius(raw.radius),
    };
  }
  return out;
})();

export function getElementSpec(type: number): ElementData {
  if (ELEMENT_DATA[type]) return ELEMENT_DATA[type];
  const hue = (type * 137.508) % 360;
  // Unknown elements still return a usable covalent radius so bond detection
  // doesn't silently drop them. 1.40 Å is the median Cordero covalent radius
  // across the periodic table — a fair guess for "we have no idea what this
  // type is, treat it as a generic mid-row atom".
  const fallbackCovalent = 1.40;
  return {
    symbol: `X${type}`,
    name: 'Unknown Isotope',
    mass: 0.00,
    radius: fallbackCovalent,
    displayRadius: ballAndStickRadius(fallbackCovalent),
    block: '?',
    role: 'Unassigned',
    color: `hsl(${hue}, 70%, 65%)`
  };
}

// Reverse index: element symbol ("Al", "Fe", …) → spec. Built once from
// ELEMENT_DATA. Used by symbol-keyed consumers (e.g. the NIST potential
// browser, which only knows element symbols, not atomic numbers).
const ELEMENT_DATA_BY_SYMBOL: Record<string, ElementData> = (() => {
  const out: Record<string, ElementData> = {};
  for (const spec of Object.values(ELEMENT_DATA)) {
    out[spec.symbol] = spec;
  }
  return out;
})();

/**
 * Look up an element spec by its symbol (case-sensitive, e.g. "Al", "Fe").
 * Returns `undefined` for unknown symbols — callers should fall back
 * (the periodic-number `getElementSpec` is the synthesizing variant).
 */
export function getElementSpecBySymbol(symbol: string): ElementData | undefined {
  return ELEMENT_DATA_BY_SYMBOL[symbol];
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
