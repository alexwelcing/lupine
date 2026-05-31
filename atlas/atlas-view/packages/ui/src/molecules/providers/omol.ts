import type { MoleculeHit, MoleculeProvider, MoleculeQuery } from '../types';

/**
 * Meta / FAIR Open Molecules 2025 (OMol25) — request #2.
 *
 * Backed by a compact index built one-time from the public OMol25 neutral-
 * validation *structures* (colabfit/OMol25_neutral_validation: 27,697 molecules,
 * real DFT geometry) and hosted on GCS (gs://shed-489901-omol25). Each record
 * carries formula / elements / natoms / HOMO-LUMO gap / total energy / source —
 * enough to search and triage — and a per-structure `.xyz` ships alongside the
 * index at `structures/xyz/{id}.xyz`, so a hit opens with its TRUE coordinates
 * through the viewer's normal url -> parseXyzFile path (no resolver guess).
 *
 * Scaling note: this is the neutral-validation slice (~4 MB index, fetched +
 * filtered client-side like the NIST catalog; geometry fetched on demand, one
 * small file per click). The larger splits (val 620 MB, train 7.5 GB) should move
 * behind a server-side searchOmol endpoint rather than ship to the browser.
 */
// Versioned filename: the index and the per-structure .xyz files are published as
// one immutable set, so bumping the version (…_val.v2.json) avoids any stale-edge-
// cache window where an old index's nval-{i} would mismatch the new geometry.
const OMOL_INDEX_URL =
  (import.meta.env.VITE_LUPI_OMOL_INDEX as string | undefined)?.trim() ||
  'https://storage.googleapis.com/shed-489901-omol25/omol25_neutral_val.v2.json';

/** Base for per-structure geometry: the index dir + `structures/xyz/{id}.xyz`. */
const OMOL_STRUCTURES_BASE = OMOL_INDEX_URL.replace(/\/[^/]*$/, '/structures/xyz');

interface OmolRecord {
  id: string;
  formula: string;
  elements: string[];
  natoms: number;
  gap: number | null;
  energy?: number | null;
  src: string;
}

let cache: Promise<OmolRecord[]> | null = null;
function index(): Promise<OmolRecord[]> {
  if (!cache) {
    cache = fetch(OMOL_INDEX_URL)
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .then((j) => (Array.isArray(j?.records) ? (j.records as OmolRecord[]) : []))
      .catch(() => [] as OmolRecord[]);
  }
  return cache;
}

export const omolProvider: MoleculeProvider = {
  id: 'omol',
  label: 'Meta OMol25',
  isAvailable: () => typeof fetch === 'function',
  async search(query: MoleculeQuery): Promise<MoleculeHit[]> {
    const records = await index();
    if (records.length === 0) return [];

    const q = query.text.toLowerCase().trim();
    const wantElements = query.elements ?? [];

    let hits = records;
    if (wantElements.length) {
      hits = hits.filter((r) => wantElements.every((e) => r.elements.includes(e)));
    }
    if (q) {
      hits = hits.filter(
        (r) =>
          r.formula.toLowerCase().includes(q) ||
          r.elements.some((e) => e.toLowerCase() === q) ||
          r.src.toLowerCase().includes(q),
      );
    }

    return hits.slice(0, query.limit ?? 25).map((r) => ({
      id: r.id,
      source: 'omol',
      title: r.formula,
      subtitle: `${r.natoms} atoms${r.gap != null ? ` · gap ${r.gap} eV` : ''} · ${r.src}`,
      formula: r.formula,
      elements: r.elements,
      tags: ['omol25', r.src],
      // Real OMol25 DFT geometry, served as a per-structure .xyz alongside the index.
      load: { kind: 'url', url: `${OMOL_STRUCTURES_BASE}/${r.id}.xyz` },
      score: q && r.formula.toLowerCase() === q ? 0.9 : undefined,
    }));
  },
};
