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
import { savedViewsProvider, libraryProvider } from './providers/scaffolds';

/** Registry order; disabled providers are skipped by searchMolecules(). */
export const MOLECULE_PROVIDERS: MoleculeProvider[] = [
  galleryProvider, // curated examples
  nistProvider, // NIST potentials catalog
  pubchemProvider, // external named compounds
  omolProvider, // Meta OMol25 (neutral-validation index on GCS) — request #2 ✅
  savedViewsProvider, // scaffold — request #1 (saved-views search)
  libraryProvider, // scaffold — request #3 (curated library)
];

export * from './types';
export * from './search';
