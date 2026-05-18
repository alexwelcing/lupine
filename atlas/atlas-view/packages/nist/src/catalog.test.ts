// @vitest-environment node
/**
 * @atlas/nist catalog query engine + shipped-catalog integrity.
 *
 * Two layers:
 *  1. Pure-function behaviour on hand-built fixtures (deterministic).
 *  2. Validation of the real shipped apps/web/public/nist/nist_catalog.json
 *     so a bad `npm run nist:build` is caught before launch.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  shortLabel,
  extractYear,
  isSingleElement,
  isEamFamily,
  isMeamFamily,
  summarize,
  filterCatalog,
  allElements,
  allPairStyles,
} from './catalog';
import type { NistCatalogEntry, NistFilterState } from './types';

const entry = (over: Partial<NistCatalogEntry>): NistCatalogEntry => ({
  id: 'x',
  potid: '1999--Mishin-Y--Al',
  pair_style: 'eam/alloy',
  elements: ['Al'],
  year: 1999,
  short_label: 'Mishin-1999',
  ...over,
});

const FIXTURE: NistCatalogEntry[] = [
  entry({ id: 'a', potid: '1999--Mishin-Y--Al', short_label: 'Mishin-1999', pair_style: 'eam/alloy', elements: ['Al'], year: 1999, doi: '10.1/x' }),
  entry({ id: 'b', potid: '1985--Foiles-S-M--Cu-Ni', short_label: 'Foiles-1985', pair_style: 'eam', elements: ['Cu', 'Ni'], year: 1985, demo_path: 'demos/b.glimbin' }),
  entry({ id: 'c', potid: '2012--Lee-B--Mg', short_label: 'Lee-2012', pair_style: 'meam', elements: ['Mg'], year: 2012 }),
  entry({ id: 'd', potid: '2020--Author-Q--Fe-C', short_label: 'Author-2020', pair_style: 'tersoff', elements: ['Fe', 'C'], year: 2020, doi: '10.1/y' }),
];

const emptyFilter = (over: Partial<NistFilterState> = {}): NistFilterState => ({
  query: '',
  elements: [],
  pair_styles: [],
  year_min: null,
  year_max: null,
  single_element_only: false,
  ...over,
});

describe('NIST pure helpers', () => {
  it('shortLabel derives Author-Year from potid', () => {
    expect(shortLabel('1999--Mishin-Y--Al')).toBe('Mishin-1999');
    expect(shortLabel('no-separator')).toBe('no-separator');
  });

  it('extractYear parses first segment, 0 on garbage', () => {
    expect(extractYear('1985--Foiles--Cu')).toBe(1985);
    expect(extractYear('abc--x')).toBe(0);
  });

  it('element/family predicates', () => {
    expect(isSingleElement(FIXTURE[0])).toBe(true);
    expect(isSingleElement(FIXTURE[1])).toBe(false);
    expect(isEamFamily(entry({ pair_style: 'eam/fs' }))).toBe(true);
    expect(isEamFamily(entry({ pair_style: 'meam' }))).toBe(false);
    expect(isMeamFamily(entry({ pair_style: 'meam/spline' }))).toBe(true);
  });
});

describe('summarize', () => {
  const s = summarize(FIXTURE);
  it('counts totals and single/multi split', () => {
    expect(s.total_potentials).toBe(4);
    expect(s.single_element).toBe(2);
    expect(s.multi_element).toBe(2);
  });
  it('counts unique elements / pair styles and doi coverage', () => {
    expect(s.unique_elements).toBe(allElements(FIXTURE).length);
    expect(s.unique_pair_styles).toBe(allPairStyles(FIXTURE).length);
    expect(s.with_doi).toBe(2);
  });
  it('pair_style_counts sorted desc', () => {
    const counts = s.pair_style_counts.map((p) => p.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});

describe('filterCatalog', () => {
  it('no filters returns all', () => {
    expect(filterCatalog(FIXTURE, emptyFilter())).toHaveLength(4);
  });
  it('text query matches id/potid/elements', () => {
    expect(filterCatalog(FIXTURE, emptyFilter({ query: 'mishin' })).map((c) => c.id)).toEqual(['a']);
    expect(filterCatalog(FIXTURE, emptyFilter({ query: 'cu' })).map((c) => c.id)).toEqual(['b']);
  });
  it('element filter is AND logic', () => {
    expect(filterCatalog(FIXTURE, emptyFilter({ elements: ['Cu', 'Ni'] })).map((c) => c.id)).toEqual(['b']);
    expect(filterCatalog(FIXTURE, emptyFilter({ elements: ['Cu', 'Fe'] }))).toHaveLength(0);
  });
  it('pair style filter is OR logic', () => {
    const ids = filterCatalog(FIXTURE, emptyFilter({ pair_styles: ['meam', 'tersoff'] })).map((c) => c.id);
    expect(ids.sort()).toEqual(['c', 'd']);
  });
  it('year range and single-element-only', () => {
    expect(filterCatalog(FIXTURE, emptyFilter({ year_min: 2000 })).map((c) => c.id).sort()).toEqual(['c', 'd']);
    expect(filterCatalog(FIXTURE, emptyFilter({ year_max: 1990 })).map((c) => c.id)).toEqual(['b']);
    expect(filterCatalog(FIXTURE, emptyFilter({ single_element_only: true })).map((c) => c.id).sort()).toEqual(['a', 'c']);
  });
});

describe('allElements / allPairStyles', () => {
  it('returns sorted unique values', () => {
    expect(allElements(FIXTURE)).toEqual(['Al', 'C', 'Cu', 'Fe', 'Mg', 'Ni']);
    expect(allPairStyles(FIXTURE)).toEqual(['eam', 'eam/alloy', 'meam', 'tersoff']);
  });
});

describe('shipped nist_catalog.json integrity', () => {
  const path = fileURLToPath(new URL('../../../apps/web/public/nist/nist_catalog.json', import.meta.url));

  it('exists (npm run nist:build output is committed)', () => {
    expect(existsSync(path), `missing ${path}`).toBe(true);
  });

  it('is a non-empty array with unique ids and a pair_style on every entry', () => {
    const cat = JSON.parse(readFileSync(path, 'utf8')) as NistCatalogEntry[];
    expect(Array.isArray(cat)).toBe(true);
    expect(cat.length).toBeGreaterThan(100);
    const ids = new Set<string>();
    for (const c of cat) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(ids.has(c.id), `duplicate id ${c.id}`).toBe(false);
      ids.add(c.id);
      expect(typeof c.pair_style, c.id).toBe('string');
      expect(c.pair_style.length, c.id).toBeGreaterThan(0);
      expect(Array.isArray(c.elements), c.id).toBe(true);
    }
  });

  // build-nist-catalog recovers elements from the potid system suffix when
  // master_index has none. Only genuinely non-element systems ("water",
  // "TWIP") remain empty. A growth here means the parser regressed.
  it('only genuinely non-element systems lack elements (regression tripwire)', () => {
    const cat = JSON.parse(readFileSync(path, 'utf8')) as NistCatalogEntry[];
    const empty = cat.filter((c) => !Array.isArray(c.elements) || c.elements.length === 0);
    expect(empty.length, `element-less ids: ${empty.map((e) => e.id).join(', ')}`).toBeLessThanOrEqual(3);
    for (const e of empty) {
      expect(/water|twip/i.test(e.potid), `unexpected element-less potid: ${e.potid}`).toBe(true);
    }
  });

  it('summarize runs cleanly on the real catalog', () => {
    const cat = JSON.parse(readFileSync(path, 'utf8')) as NistCatalogEntry[];
    const s = summarize(cat);
    expect(s.total_potentials).toBe(cat.length);
    expect(s.single_element + s.multi_element).toBe(cat.length);
    expect(s.unique_pair_styles).toBeGreaterThan(0);
  });
});
