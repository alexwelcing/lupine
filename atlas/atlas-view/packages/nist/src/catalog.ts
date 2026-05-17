// ═══════════════════════════════════════════════════════════════════
// @atlas/nist — Runtime catalog loader & query engine
// ═══════════════════════════════════════════════════════════════════

import type { NistPotential, NistCatalogEntry, NistSummary, NistFilterState } from './types';

export { type NistPotential, type NistCatalogEntry, type NistSummary, type NistFilterState };

/** Derive a short human-readable label from potid: "1999--Mishin-Y--Al" → "Mishin-1999" */
export function shortLabel(potid: string): string {
  const parts = potid.split('--');
  if (parts.length >= 2) {
    const year = parts[0];
    const author = parts[1].split('-')[0];
    return `${author}-${year}`;
  }
  return potid;
}

/** Extract year from potid (first segment). */
export function extractYear(potid: string): number {
  const first = potid.split('--')[0];
  const y = parseInt(first, 10);
  return isNaN(y) ? 0 : y;
}

/** Whether the potential covers exactly one element. */
export function isSingleElement(p: NistPotential | NistCatalogEntry): boolean {
  return p.elements.length === 1;
}

/** Whether this is an EAM-family potential. */
export function isEamFamily(p: NistPotential | NistCatalogEntry): boolean {
  return p.pair_style.startsWith('eam');
}

/** Whether this is a MEAM-family potential. */
export function isMeamFamily(p: NistPotential | NistCatalogEntry): boolean {
  return p.pair_style.startsWith('meam');
}

/** Load the compact catalog from a JSON URL (typically /nist/nist_catalog.json). */
export async function loadNistCatalog(url: string): Promise<NistCatalogEntry[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load NIST catalog: ${res.status}`);
  return (await res.json()) as NistCatalogEntry[];
}

/** Build summary statistics from a catalog. */
export function summarize(catalog: NistCatalogEntry[]): NistSummary {
  const single = catalog.filter(isSingleElement).length;
  const withDoi = catalog.filter((c) => !!c.doi).length;

  const psCounts = new Map<string, number>();
  const elCounts = new Map<string, number>();

  for (const c of catalog) {
    psCounts.set(c.pair_style, (psCounts.get(c.pair_style) || 0) + 1);
    for (const el of c.elements) {
      elCounts.set(el, (elCounts.get(el) || 0) + 1);
    }
  }

  return {
    total_potentials: catalog.length,
    single_element: single,
    multi_element: catalog.length - single,
    unique_elements: elCounts.size,
    unique_pair_styles: psCounts.size,
    with_doi: withDoi,
    pair_style_counts: Array.from(psCounts.entries())
      .map(([pair_style, count]) => ({ pair_style, count }))
      .sort((a, b) => b.count - a.count),
    element_counts: Array.from(elCounts.entries())
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Apply filters to a catalog. */
export function filterCatalog(
  catalog: NistCatalogEntry[],
  filters: NistFilterState
): NistCatalogEntry[] {
  const q = filters.query.trim().toLowerCase();
  return catalog.filter((c) => {
    // Text query against id, potid, short_label, elements
    if (q) {
      const haystack = `${c.id} ${c.potid} ${c.short_label} ${c.elements.join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Element filter (AND logic: must cover ALL selected elements)
    if (filters.elements.length > 0) {
      if (!filters.elements.every((el) => c.elements.includes(el))) return false;
    }

    // Pair style filter (OR logic: any selected pair style)
    if (filters.pair_styles.length > 0) {
      if (!filters.pair_styles.includes(c.pair_style)) return false;
    }

    // Year range
    if (filters.year_min !== null && c.year < filters.year_min) return false;
    if (filters.year_max !== null && c.year > filters.year_max) return false;

    // Single-element only
    if (filters.single_element_only && !isSingleElement(c)) return false;

    return true;
  });
}

/** Get all unique elements across the catalog. */
export function allElements(catalog: NistCatalogEntry[]): string[] {
  const set = new Set<string>();
  for (const c of catalog) c.elements.forEach((el) => set.add(el));
  return Array.from(set).sort();
}

/** Get all unique pair styles across the catalog. */
export function allPairStyles(catalog: NistCatalogEntry[]): string[] {
  const set = new Set<string>();
  for (const c of catalog) set.add(c.pair_style);
  return Array.from(set).sort();
}
