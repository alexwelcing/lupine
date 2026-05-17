// ═══════════════════════════════════════════════════════════════════
// @atlas/nist — NIST Interatomic Potentials Repository types
// Mirrors the Rust NistCatalog schema from atlas-distill/src/nist.rs
// ═══════════════════════════════════════════════════════════════════

/** A single artifact (parameter file) associated with a potential. */
export interface NistArtifact {
  url: string;
  filename: string;
  label?: string;
}

/** A LAMMPS potential implementation from the NIST IPR. */
export interface NistPotential {
  /** Full implementation ID, e.g. "1999--Mishin-Y--Al--LAMMPS--ipr1" */
  id: string;
  /** Parent potential ID, e.g. "1999--Mishin-Y--Al" */
  potid: string;
  /** LAMMPS pair_style, e.g. "eam/alloy", "meam", "tersoff" */
  pair_style: string;
  /** LAMMPS unit system (almost always "metal") */
  units?: string;
  /** LAMMPS atom_style (almost always "atomic") */
  atom_style?: string;
  /** Implementation status (usually empty) */
  status?: string;
  /** Elements this potential covers, e.g. ["Al"] or ["Ni", "Al"] */
  elements: string[];
  /** Atom symbols (usually same as elements) */
  symbols?: string[];
  /** Resolved DOIs from the parent scientific record */
  dois?: string[];
  /** REST API URL for this implementation */
  url?: string;
  /** REST API URL for the parent potential record */
  poturl?: string;
  /** Downloadable parameter files */
  artifacts?: NistArtifact[];
  /** Number of parameter files */
  file_count?: number;
  /** Optional: path to pre-generated demo trajectory */
  demo_path?: string | null;
}

/** Compact catalog entry used at runtime (stripped of heavy fields). */
export interface NistCatalogEntry {
  id: string;
  potid: string;
  pair_style: string;
  elements: string[];
  year: number;
  short_label: string;
  doi?: string;
  demo_path?: string | null;
}

/** Summary statistics for the catalog. */
export interface NistSummary {
  total_potentials: number;
  single_element: number;
  multi_element: number;
  unique_elements: number;
  unique_pair_styles: number;
  with_doi: number;
  pair_style_counts: Array<{ pair_style: string; count: number }>;
  element_counts: Array<{ element: string; count: number }>;
}

/** Filter state for the potential browser. */
export interface NistFilterState {
  query: string;
  elements: string[];
  pair_styles: string[];
  year_min: number | null;
  year_max: number | null;
  single_element_only: boolean;
}
