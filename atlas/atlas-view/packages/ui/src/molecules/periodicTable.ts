/**
 * Periodic-table layout for the OMol25 collection navigator.
 *
 * Each cell carries its standard 18-column grid placement (col/row) so the table
 * renders in the familiar shape. We include the main groups + period 4 (through
 * the elements OMol25 actually uses, plus their neighbors) so present elements
 * light up and absent ones read as dim — which itself shows OMol25's organic /
 * light-main-group character at a glance. Lanthanides/actinides are omitted (the
 * dataset slice uses none); the full OMol25 dataset spans 83 elements and a
 * future server-backed index can extend this list.
 */
export interface PeriodicCell {
  symbol: string;
  name: string;
  /** 1-based CSS grid column (1..18). */
  col: number;
  /** 1-based CSS grid row (period). */
  row: number;
}

export const PERIODIC_TABLE: PeriodicCell[] = [
  // Period 1
  { symbol: 'H', name: 'Hydrogen', col: 1, row: 1 },
  { symbol: 'He', name: 'Helium', col: 18, row: 1 },
  // Period 2
  { symbol: 'Li', name: 'Lithium', col: 1, row: 2 },
  { symbol: 'Be', name: 'Beryllium', col: 2, row: 2 },
  { symbol: 'B', name: 'Boron', col: 13, row: 2 },
  { symbol: 'C', name: 'Carbon', col: 14, row: 2 },
  { symbol: 'N', name: 'Nitrogen', col: 15, row: 2 },
  { symbol: 'O', name: 'Oxygen', col: 16, row: 2 },
  { symbol: 'F', name: 'Fluorine', col: 17, row: 2 },
  { symbol: 'Ne', name: 'Neon', col: 18, row: 2 },
  // Period 3
  { symbol: 'Na', name: 'Sodium', col: 1, row: 3 },
  { symbol: 'Mg', name: 'Magnesium', col: 2, row: 3 },
  { symbol: 'Al', name: 'Aluminium', col: 13, row: 3 },
  { symbol: 'Si', name: 'Silicon', col: 14, row: 3 },
  { symbol: 'P', name: 'Phosphorus', col: 15, row: 3 },
  { symbol: 'S', name: 'Sulfur', col: 16, row: 3 },
  { symbol: 'Cl', name: 'Chlorine', col: 17, row: 3 },
  { symbol: 'Ar', name: 'Argon', col: 18, row: 3 },
  // Period 4 (s-block + the halogen/noble; d/p neighbors kept for shape)
  { symbol: 'K', name: 'Potassium', col: 1, row: 4 },
  { symbol: 'Ca', name: 'Calcium', col: 2, row: 4 },
  { symbol: 'Sc', name: 'Scandium', col: 3, row: 4 },
  { symbol: 'Ti', name: 'Titanium', col: 4, row: 4 },
  { symbol: 'V', name: 'Vanadium', col: 5, row: 4 },
  { symbol: 'Cr', name: 'Chromium', col: 6, row: 4 },
  { symbol: 'Mn', name: 'Manganese', col: 7, row: 4 },
  { symbol: 'Fe', name: 'Iron', col: 8, row: 4 },
  { symbol: 'Co', name: 'Cobalt', col: 9, row: 4 },
  { symbol: 'Ni', name: 'Nickel', col: 10, row: 4 },
  { symbol: 'Cu', name: 'Copper', col: 11, row: 4 },
  { symbol: 'Zn', name: 'Zinc', col: 12, row: 4 },
  { symbol: 'Ga', name: 'Gallium', col: 13, row: 4 },
  { symbol: 'Ge', name: 'Germanium', col: 14, row: 4 },
  { symbol: 'As', name: 'Arsenic', col: 15, row: 4 },
  { symbol: 'Se', name: 'Selenium', col: 16, row: 4 },
  { symbol: 'Br', name: 'Bromine', col: 17, row: 4 },
  { symbol: 'Kr', name: 'Krypton', col: 18, row: 4 },
  // Period 5 (only the elements OMol25 reaches: I)
  { symbol: 'Rb', name: 'Rubidium', col: 1, row: 5 },
  { symbol: 'Sr', name: 'Strontium', col: 2, row: 5 },
  { symbol: 'I', name: 'Iodine', col: 17, row: 5 },
  { symbol: 'Xe', name: 'Xenon', col: 18, row: 5 },
];
