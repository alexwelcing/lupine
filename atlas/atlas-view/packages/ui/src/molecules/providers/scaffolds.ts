/**
 * Scaffolded providers — the extension points for the rest of "do 1+2+3".
 * Each is a real, registered provider that is currently `isAvailable() === false`
 * (so `searchMolecules` skips it). Implement the body + flip availability to light
 * the source up; nothing else in the search core changes.
 */
import type { MoleculeProvider } from '../types';

/**
 * Saved Views — search the user's own saved molecular views (Firestore lupiViews).
 * TODO: needs the signed-in uid + a query. `listUserSavedViews(uid)` already exists
 * in ../../savedViews.ts; map each SavedMolecularView → MoleculeHit
 * (title, molecule source → load: { kind:'savedView', slug }). Because search()
 * has no auth context, wire this as a factory: `makeSavedViewsProvider(uid)`.
 */
export const savedViewsProvider: MoleculeProvider = {
  id: 'saved',
  label: 'Saved views',
  isAvailable: () => false,
  async search() {
    return [];
  },
};

/**
 * Meta / FAIR Open Molecules (OMol25) — request #2.
 * TODO: OMol25 is multi-TB (HuggingFace `facebook/OMol25`); it cannot be bundled
 * or queried directly from the browser. Stand up a search index instead:
 *   - precompute a compact index (formula / SMILES / name → structure pointer),
 *   - host it on GCS + expose a Cloud Function `searchOmol(query)` endpoint,
 *   - call that endpoint here and map results → MoleculeHit
 *     (load: { kind:'url', url: <structure file> } or a generate spec).
 */
export const omolProvider: MoleculeProvider = {
  id: 'omol',
  label: 'Meta OMol25',
  isAvailable: () => false,
  async search() {
    return [];
  },
};

/**
 * Curated Lupi molecule library (Firestore) — request #3.
 * TODO: a `moleculeLibrary` collection { name, formula, source, tags, structure }
 * that users/agents contribute to. Add firestore.rules + a query (and, past ~a few
 * hundred docs, a real search index). Map docs → MoleculeHit.
 */
export const libraryProvider: MoleculeProvider = {
  id: 'library',
  label: 'Library',
  isAvailable: () => false,
  async search() {
    return [];
  },
};
