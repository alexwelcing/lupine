import { afterEach, describe, it, expect, vi } from 'vitest';
import { deriveFacets, omolProvider, type OmolRecord } from './providers/omol';
import { PERIODIC_TABLE } from './periodicTable';

// A tiny fixture shaped like the real OMol25 neutral-validation records:
// gap is null across the slice and src is a single constant — the facet
// derivation must NOT surface either as a navigable facet.
const FIXTURE = [
  { id: 'nval-0', formula: 'CH4', elements: ['C', 'H'], natoms: 5, gap: null, energy: -40, src: 'DS_x' },
  { id: 'nval-1', formula: 'H2O', elements: ['H', 'O'], natoms: 3, gap: null, energy: -76, src: 'DS_x' },
  { id: 'nval-2', formula: 'C2H6O', elements: ['C', 'H', 'O'], natoms: 9, gap: null, energy: -154, src: 'DS_x', functionalGroups: ['alcohol-phenol'] },
  { id: 'nval-3', formula: 'C3H6O', elements: ['C', 'H', 'O'], natoms: 10, gap: null, energy: -193, src: 'DS_x', functionalGroups: ['ketone'] },
] satisfies OmolRecord[];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OMol25 — deriveFacets', () => {
  it('counts each element across the structures that contain it', () => {
    const f = deriveFacets(FIXTURE);
    const count = (el: string) => f.elementCounts.find((e) => e.element === el)?.count;
    expect(count('H')).toBe(4); // in all four
    expect(count('C')).toBe(3); // CH4 + C2H6O + C3H6O
    expect(count('O')).toBe(3); // H2O + C2H6O + C3H6O
  });

  it('orders elements by descending count (H first here)', () => {
    const f = deriveFacets(FIXTURE);
    expect(f.elementCounts[0].element).toBe('H');
    // monotonic non-increasing
    for (let i = 1; i < f.elementCounts.length; i++) {
      expect(f.elementCounts[i - 1].count).toBeGreaterThanOrEqual(f.elementCounts[i].count);
    }
  });

  it('reports the atom-count range and median', () => {
    const f = deriveFacets(FIXTURE);
    expect(f.total).toBe(4);
    expect(f.natoms.min).toBe(3);
    expect(f.natoms.max).toBe(10);
    expect(f.natoms.median).toBe(9);
  });

  it('reports functional-group counts when records carry geometry-derived tags', () => {
    const f = deriveFacets(FIXTURE);
    expect(f.functionalGroupCounts).toEqual([
      {
        id: 'alcohol-phenol',
        label: 'Alcohols & Phenols',
        family: 'Oxygen groups',
        color: '#34d399',
        count: 1,
      },
      {
        id: 'ketone',
        label: 'Ketones',
        family: 'Carbonyl groups',
        color: '#f472b6',
        count: 1,
      },
    ]);
  });

  it('does NOT derive a gap or src facet (both are unusable in this slice)', () => {
    const f = deriveFacets(FIXTURE);
    expect(f).not.toHaveProperty('gap');
    expect(f).not.toHaveProperty('src');
    // only the real facets exist
    expect(Object.keys(f).sort()).toEqual(['elementCounts', 'functionalGroupCounts', 'natoms', 'total']);
  });

  it('handles an empty record set without throwing', () => {
    const f = deriveFacets([]);
    expect(f.total).toBe(0);
    expect(f.elementCounts).toEqual([]);
    expect(f.functionalGroupCounts).toEqual([]);
    expect(f.natoms).toEqual({ min: 0, max: 0, median: 0 });
  });
});

describe('OMol25 — periodic table layout', () => {
  it('places every cell in a valid 18-column grid slot with a unique symbol', () => {
    const seen = new Set<string>();
    for (const cell of PERIODIC_TABLE) {
      expect(cell.col, cell.symbol).toBeGreaterThanOrEqual(1);
      expect(cell.col, cell.symbol).toBeLessThanOrEqual(18);
      expect(cell.row, cell.symbol).toBeGreaterThanOrEqual(1);
      expect(seen.has(cell.symbol)).toBe(false);
      seen.add(cell.symbol);
    }
  });

  it('includes every element OMol25 actually uses', () => {
    const omolElements = ['H', 'C', 'O', 'N', 'S', 'F', 'Cl', 'Br', 'P', 'I', 'Si', 'B', 'K', 'Li', 'Na', 'Ca', 'Mg'];
    const symbols = new Set(PERIODIC_TABLE.map((c) => c.symbol));
    for (const el of omolElements) {
      expect(symbols.has(el), `periodic table missing ${el}`).toBe(true);
    }
  });

  it('does not place two cells in the same (col,row) slot', () => {
    const slots = new Set<string>();
    for (const cell of PERIODIC_TABLE) {
      const key = `${cell.col}:${cell.row}`;
      expect(slots.has(key), `${cell.symbol} collides at ${key}`).toBe(false);
      slots.add(key);
    }
  });
});

describe('OMol25 provider search', () => {
  it('filters records by functional group and returns group metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: FIXTURE }),
    }));

    const hits = await omolProvider.search({ text: '', functionalGroups: ['ketone'], limit: 10 });

    expect(hits.map((hit) => hit.id)).toEqual(['nval-3']);
    expect(hits[0].functionalGroups).toEqual(['ketone']);
    expect(hits[0].tags).toContain('Ketones');
  });
});
