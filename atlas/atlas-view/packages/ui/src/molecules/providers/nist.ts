import { filterCatalog, loadNistCatalog, type NistCatalogEntry } from '@atlas/nist';
import type { MoleculeHit, MoleculeProvider, MoleculeQuery } from '../types';

const CATALOG_URL = '/nist/nist_catalog.json';

// Load + cache the catalog once. Failure caches [] so we degrade quietly.
let cache: Promise<NistCatalogEntry[]> | null = null;
function catalog(): Promise<NistCatalogEntry[]> {
  if (!cache) cache = loadNistCatalog(CATALOG_URL).catch(() => [] as NistCatalogEntry[]);
  return cache;
}

/** NIST interatomic-potential catalog (~1000 entries) as searchable structures. */
export const nistProvider: MoleculeProvider = {
  id: 'nist',
  label: 'NIST potentials',
  isAvailable: () => true, // loads lazily; search() returns [] until/if data arrives
  async search(query: MoleculeQuery): Promise<MoleculeHit[]> {
    const entries = await catalog();
    if (entries.length === 0) return [];

    const filtered = filterCatalog(entries, {
      query: query.text,
      elements: query.elements ?? [],
      pair_styles: [],
      year_min: null,
      year_max: null,
      single_element_only: false,
    });

    return filtered.slice(0, query.limit ?? 25).map((e) => ({
      id: e.id,
      source: 'nist',
      title: e.short_label || e.potid,
      subtitle: `${e.elements.join(', ')} · ${e.pair_style} · ${e.year}`,
      elements: e.elements,
      formula: e.elements.join(''),
      tags: [e.pair_style, ...e.elements],
      // Prefer a pre-generated demo trajectory; otherwise procedurally build a
      // small crystal of the first element via the multi-input resolver.
      load: e.demo_path
        ? { kind: 'url', url: e.demo_path }
        : {
            kind: 'generate',
            inputType: 'procedural',
            input: `${e.elements[0] ?? 'Cu'} fcc crystal`,
            elements: e.elements,
            lattice: 'fcc',
            atomCount: 500,
          },
    }));
  },
};
