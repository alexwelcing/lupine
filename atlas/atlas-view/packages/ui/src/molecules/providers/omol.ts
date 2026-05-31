import type { MoleculeHit, MoleculeProvider, MoleculeQuery } from '../types';

/**
 * Meta / FAIR Open Molecules 2025 (OMol25) — request #2.
 *
 * Backed by a compact index extracted one-time from the public OMol25 index
 * (ameya98/OMol25-Index, neutral validation split: 27,697 molecules) and hosted
 * on GCS (gs://shed-489901-omol25). Each record carries formula / elements /
 * natoms / charge / spin / HOMO-LUMO gap / source — enough to search and triage.
 *
 * Scaling note: this is the neutral-validation slice (~4 MB, fetched + filtered
 * client-side like the NIST catalog). The larger splits (val 620 MB, train 7.5 GB)
 * should move behind a server-side searchOmol endpoint rather than ship to the
 * browser. Exact 3D geometry isn't in the index — loading a hit currently routes
 * through the resolver by formula; pulling real OMol25 coordinates (from the
 * colabfit parquet mirror) is a documented follow-up.
 */
const OMOL_INDEX_URL =
  (import.meta.env.VITE_LUPI_OMOL_INDEX as string | undefined)?.trim() ||
  'https://storage.googleapis.com/shed-489901-omol25/omol25_neutral_val.json';

interface OmolRecord {
  id: string;
  formula: string;
  elements: string[];
  natoms: number;
  charge: number;
  spin: number;
  gap: number;
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
      subtitle: `${r.natoms} atoms · gap ${r.gap} eV · ${r.src}`,
      formula: r.formula,
      elements: r.elements,
      tags: ['omol25', r.src],
      // Best-effort load via the resolver; exact OMol25 geometry is a follow-up.
      load: { kind: 'generate', inputType: 'name', input: r.formula },
      score: q && r.formula.toLowerCase() === q ? 0.9 : undefined,
    }));
  },
};
