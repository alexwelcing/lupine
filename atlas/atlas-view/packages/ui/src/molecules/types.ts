/**
 * Federated molecule search — shared types.
 *
 * One search interface over many sources (Gallery, NIST, Saved Views, PubChem,
 * a Meta/FAIR dataset, a curated library). Each source is a {@link MoleculeProvider};
 * `searchMolecules()` fans out across the enabled providers and merges results.
 * Both the UI picker and the MCP `lupi.search_molecules` tool consume this.
 */

import type { FunctionalGroupId } from '../organicFunctionalGroups';

export type MoleculeSourceId =
  | 'gallery' // curated featured examples (gallery-data.json)
  | 'nist' // NIST interatomic-potential catalog
  | 'saved' // user-owned saved views (Firestore lupiViews)
  | 'pubchem' // external PubChem name/SMILES lookup
  | 'omol' // Meta / FAIR Open Molecules dataset (scaffolded)
  | 'library' // curated Lupi molecule library (scaffolded)
  | 'social'; // limited social-link QR archive authored as atoms + bonds

/** How to load a hit into the viewer. The UI and agent map this to a loader. */
export type MoleculeLoadSpec =
  | { kind: 'url'; url: string } // direct trajectory / structure file (e.g. .glimbin, .xyz)
  | { kind: 'savedView'; slug: string } // loadSavedMolecularView(slug)
  | {
      // resolve via lupi.generate_molecule (the multi-input resolver)
      kind: 'generate';
      inputType: 'name' | 'smiles' | 'xyz' | 'description' | 'procedural' | 'template';
      input: string;
      elements?: string[];
      lattice?: string;
      atomCount?: number;
    };

/** A single unified search result, source-agnostic. */
export interface MoleculeHit {
  /** stable id within its source */
  id: string;
  source: MoleculeSourceId;
  title: string;
  subtitle?: string;
  /** chemical formula if known (e.g. "H2O") */
  formula?: string;
  /** element symbols if known (e.g. ["Ni","Al"]) */
  elements?: string[];
  /** free-text tags for matching/display (domain, pair_style, method…) */
  tags?: string[];
  /** Organic chemistry functional groups, when a source can derive them. */
  functionalGroups?: FunctionalGroupId[];
  /** accent colors for the card, if the source has them */
  colors?: string[];
  /** how to load it into the viewer */
  load: MoleculeLoadSpec;
  /** provider-assigned 0..1 relevance (combined with text match in ranking) */
  score?: number;
}

export interface MoleculeQuery {
  /** free-text query; empty string = browse */
  text: string;
  /** require these element symbols (AND) */
  elements?: string[];
  /** require these functional groups (AND) */
  functionalGroups?: FunctionalGroupId[];
  /** restrict to specific sources; omit = all enabled */
  sources?: MoleculeSourceId[];
  /** max hits PER source (default 25) */
  limit?: number;
}

export interface MoleculeProvider {
  id: MoleculeSourceId;
  label: string;
  /** True when the provider can serve results right now (data loaded/configured). */
  isAvailable(): boolean;
  /** Return hits for the query. MUST resolve (never reject) — return [] on failure. */
  search(query: MoleculeQuery): Promise<MoleculeHit[]>;
}
