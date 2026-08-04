/**
 * Federated molecule search — public surface.
 *
 * `searchMolecules(query, MOLECULE_PROVIDERS)` runs the query across every enabled
 * source and returns ranked, merged hits. Both the UI picker and the MCP
 * `lupi.search_molecules` tool use this.
 */
import type { MoleculeProvider } from './types';
import { galleryProvider } from './providers/gallery';
import { nistProvider } from './providers/nist';
import { pubchemProvider } from './providers/pubchem';
import { omolProvider } from './providers/omol';
import { savedViewsProvider } from './providers/savedViews';
import { libraryProvider } from './providers/library';
import { socialQrProvider } from './providers/socialQr';

/** Registry order; providers that aren't available are skipped by searchMolecules(). */
export const MOLECULE_PROVIDERS: MoleculeProvider[] = [
  savedViewsProvider, // your own saved views (signed-in) — request #1 ✅
  libraryProvider, // curated Lupi library (Firestore) — request #3 ✅
  socialQrProvider, // limited social-link atom/bond QR archive
  galleryProvider, // curated examples
  nistProvider, // NIST potentials catalog
  omolProvider, // Meta OMol25 (neutral-validation index on GCS) — request #2 ✅
  pubchemProvider, // external named compounds
];

export { addToLibrary } from './providers/library';

export * from './types';
export * from './search';
