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

// Meta OMol25 (request #2) is now a real provider — see ./omol.ts.

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
