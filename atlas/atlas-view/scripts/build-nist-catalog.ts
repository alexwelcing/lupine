/**
 * Build script: generate compact NIST catalog JSON for the viewer.
 *
 * Reads atlas/nist_ipr/index/master_index.json and optionally joins
 * with demo manifest to produce apps/web/public/nist/nist_catalog.json.
 *
 * Run from atlas-view root:
 *   npx tsx scripts/build-nist-catalog.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface NistArtifact {
  url: string;
  filename: string;
  label?: string;
}

interface NistPotential {
  id: string;
  potid: string;
  pair_style: string;
  units?: string;
  atom_style?: string;
  status?: string;
  elements: string[];
  symbols?: string[];
  dois?: string[];
  url?: string;
  poturl?: string;
  artifacts?: NistArtifact[];
  file_count?: number;
}

interface DemoManifest {
  [id: string]: { path: string; success: boolean } | null;
}

function shortLabel(potid: string): string {
  const parts = potid.split('--');
  if (parts.length >= 2) {
    const year = parts[0];
    const author = parts[1].split('-')[0];
    return `${author}-${year}`;
  }
  return potid;
}

function extractYear(potid: string): number {
  const first = potid.split('--')[0];
  const y = parseInt(first, 10);
  return isNaN(y) ? 0 : y;
}

// All 118 element symbols — used to recover elements for potentials whose
// master_index `elements` array is empty by parsing the potid system suffix
// (e.g. "...--Si" -> [Si], "...--meta-Ta-Hf-Zr-Ti" -> [Ta,Hf,Zr,Ti]).
// Non-element systems ("--water", "--TWIP") yield [] and stay empty.
const ELEMENT_SYMBOLS = new Set(
  ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn ' +
   'Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce ' +
   'Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn ' +
   'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og')
    .split(' ')
);

function deriveElementsFromPotid(potid: string): string[] {
  const segments = potid.split('--');
  const system = segments[segments.length - 1] ?? '';
  return system.split('-').filter((tok) => ELEMENT_SYMBOLS.has(tok));
}

const CWD = process.cwd();
const MASTER_INDEX = resolve(CWD, '../nist_ipr/index/master_index.json');
// Canonical, committed demo manifest — makes the catalog reproducible from
// in-repo inputs (the generated ../nist_ipr/demos/manifest.json is gitignored
// because the .glimbin blobs are GCS-hosted). Regenerating demos? Refresh
// scripts/nist-demo-manifest.json from the new manifest and commit it.
const COMMITTED_MANIFEST = resolve(CWD, 'scripts/nist-demo-manifest.json');
const GENERATED_MANIFEST = resolve(CWD, '../nist_ipr/demos/manifest.json');
const OUT_CATALOG = resolve(CWD, 'apps/web/public/nist/nist_catalog.json');
const OUT_SUMMARY = resolve(CWD, 'apps/web/public/nist/nist_summary.json');

function main() {
  console.log('Building NIST catalog...');

  const potentials: NistPotential[] = JSON.parse(readFileSync(MASTER_INDEX, 'utf-8'));
  // Prefer the committed manifest (reproducible in CI); fall back to a
  // freshly generated one only if the committed copy is absent.
  let demos: DemoManifest = {};
  const manifestPath = existsSync(COMMITTED_MANIFEST)
    ? COMMITTED_MANIFEST
    : existsSync(GENERATED_MANIFEST)
      ? GENERATED_MANIFEST
      : null;
  if (manifestPath) {
    demos = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    console.log(`  Joined ${Object.keys(demos).length} demo entries from ${manifestPath === COMMITTED_MANIFEST ? 'committed manifest' : 'generated manifest'}`);
  } else {
    console.log('  No demo manifest found (demo_path will be null)');
  }

  const catalog = potentials.map((p) => {
    const demo = demos[p.id];
    const elements = p.elements && p.elements.length > 0
      ? p.elements
      : deriveElementsFromPotid(p.potid);
    return {
      id: p.id,
      potid: p.potid,
      pair_style: p.pair_style,
      elements,
      year: extractYear(p.potid),
      short_label: shortLabel(p.potid),
      doi: p.dois?.[0] || null,
      demo_path: demo?.success ? demo.path : null,
    };
  });

  // Summary
  const single = catalog.filter((c) => c.elements.length === 1).length;
  const withDoi = catalog.filter((c) => !!c.doi).length;
  const psCounts = new Map<string, number>();
  const elCounts = new Map<string, number>();
  for (const c of catalog) {
    psCounts.set(c.pair_style, (psCounts.get(c.pair_style) || 0) + 1);
    for (const el of c.elements) {
      elCounts.set(el, (elCounts.get(el) || 0) + 1);
    }
  }

  const summary = {
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

  writeFileSync(OUT_CATALOG, JSON.stringify(catalog, null, 0));
  writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));

  console.log(`  Wrote ${catalog.length} entries to ${OUT_CATALOG}`);
  console.log(`  Wrote summary to ${OUT_SUMMARY}`);
  console.log(`  Elements: ${summary.unique_elements}, Pair styles: ${summary.unique_pair_styles}`);
}

main();
