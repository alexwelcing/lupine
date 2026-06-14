// @vitest-environment node
/**
 * Curation invariants for the shipped gallery.
 *
 * Guards the gallery contract: every entry must be well-formed and
 * actually loadable. Snapshots are preferred, but entries with colors
 * can use the runtime procedural thumbnail fallback. Also a
 * regression guard that the dropped GLB hover machinery stays dropped.
 *
 * Pure fs/JSON — deliberately does NOT import the Gallery component
 * (which pulls store -> @atlas/scene) so it runs fast in node env and
 * is isolated from unrelated infra issues.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import galleryData from './gallery-data.json';
import { FEATURED_IDS } from './landing/shared';
import { FUNCTIONAL_GROUPS, functionalGroupsForMolecule } from './organicFunctionalGroups';

const PUBLIC = fileURLToPath(new URL('../../../apps/web/public/', import.meta.url));
const GALLERY_TSX = fileURLToPath(new URL('./Gallery.tsx', import.meta.url));

// Must match DOMAIN_COLORS keys in Gallery.tsx.
const DOMAINS = [
  'Metals & Alloys',
  'Ceramics & Oxides',
  'Polymers & Soft Matter',
  'Nanomaterials',
  'Biomolecules',
  'Energy Materials',
  'Defects & Mechanics',
  'Methods',
  'Fluids & Solvents',
  'Atomized Media',
  'Advanced Theory & Validation',
];

interface Entry {
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  atoms: string;
  frames: string;
  file: string;
  colorBy?: string;
  available: boolean;
  colors: string[];
  metadata?: Record<string, unknown>;
  featured?: boolean;
}

const data = galleryData as Entry[];
const HEX = /^#[0-9a-fA-F]{6}$/;

function parseFrameLabel(label: string): number {
  const n = parseInt(label.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function countXyzFrames(text: string): number {
  const lines = text.split(/\r?\n/);
  let count = 0;
  let cursor = 0;
  while (cursor < lines.length) {
    if (!lines[cursor].trim()) {
      cursor += 1;
      continue;
    }
    const natoms = parseInt(lines[cursor].trim(), 10);
    if (!Number.isFinite(natoms) || natoms <= 0) break;
    cursor += natoms + 2;
    count += 1;
  }
  return count;
}

describe('gallery-data.json — curated launch set', () => {
  it('is a non-empty restored curated set', () => {
    expect(data.length).toBeGreaterThan(0);
    expect(data.length).toBeLessThanOrEqual(60);
  });

  it('has unique ids', () => {
    const ids = data.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry is well-formed', () => {
    for (const e of data) {
      expect(e.id, `id of ${JSON.stringify(e.title)}`).toMatch(/^[a-z0-9_]+$/);
      expect(e.title.length, e.id).toBeGreaterThan(0);
      expect(e.subtitle.length, e.id).toBeGreaterThan(0);
      expect(DOMAINS, `domain of ${e.id}`).toContain(e.domain);
      expect(typeof e.atoms, e.id).toBe('string');
      expect(typeof e.frames, e.id).toBe('string');
      expect(typeof e.available, e.id).toBe('boolean');
      expect(Array.isArray(e.colors), e.id).toBe(true);
      expect(e.colors.length, e.id).toBe(3);
      for (const c of e.colors) expect(c, `color of ${e.id}`).toMatch(HEX);
    }
  });

  it('every entry is actually loadable (GCS, procedural, or existing local file)', () => {
    for (const e of data) {
      if (e.file.startsWith('http')) {
        expect(e.file, e.id).toMatch(/^https:\/\//);
      } else if (e.file === 'procedural') {
        // generated at runtime — nothing to verify on disk
      } else {
        const onDisk = PUBLIC + e.file;
        expect(existsSync(onDisk), `missing local data file for ${e.id}: ${e.file}`).toBe(true);
      }
    }
  });

  it('available gallery entries do not stream from a CORS-blocked GCS bucket', () => {
    // The glim-datasets bucket serves no access-control-allow-origin header, so
    // a browser fetch from the viewer's origin is blocked (curl works — CORS is
    // not server-enforced — which is what made this a silent "dead link"). The
    // shed-489901-nist-demos bucket sets `access-control-allow-origin: *`, so
    // streaming large .glimbin from there is fine and stays out of git.
    for (const e of data) {
      if (!e.available) continue;
      expect(e.file, `${e.id} streams from the CORS-blocked glim-datasets bucket`)
        .not.toMatch(/storage\.googleapis\.com\/glim-datasets\//);
    }
  });

  it('entries advertising multiple frames point at playable trajectory assets', () => {
    for (const e of data) {
      const advertisedFrames = parseFrameLabel(e.frames);
      if (!e.available || advertisedFrames <= 1) continue;
      if (e.file === 'procedural') {
        throw new Error(`multi-frame gallery entry must be bundled: ${e.id}`);
      }
      if (e.file.startsWith('http')) {
        // Remote multi-frame assets are allowed ONLY as a streamable .glimbin from
        // the trusted CORS-enabled bucket: StreamingLoader pulls frames via HTTP
        // Range requests, so the trajectory plays without bundling a huge file in
        // git. The frame count lives in the binary payload (not line-countable), so
        // we assert format + trusted host instead of an on-disk frame recount.
        // Remote TEXT trajectories (.lammpstrj/.xyz) stay rejected — they'd force a
        // full multi-MB download and can't be verified here.
        const trusted = /^https:\/\/storage\.googleapis\.com\/shed-489901-nist-demos\//.test(e.file);
        expect(e.file.endsWith('.glimbin'), `remote multi-frame ${e.id} must be a streamable .glimbin`).toBe(true);
        expect(trusted, `remote multi-frame ${e.id} must stream from the trusted CORS bucket`).toBe(true);
        continue;
      }

      const onDisk = PUBLIC + e.file;
      if (e.file.endsWith('.xyz')) {
        expect(countXyzFrames(readFileSync(onDisk, 'utf8')), e.id).toBe(advertisedFrames);
      } else if (e.file.endsWith('.lammpstrj') || e.file.endsWith('.dump')) {
        const timesteps = readFileSync(onDisk, 'utf8').match(/^ITEM:\s+TIMESTEP$/gm)?.length ?? 0;
        expect(timesteps, e.id).toBe(advertisedFrames);
      } else if (e.file.endsWith('.json') || e.file.endsWith('.glimbin')) {
        // Binary (.glimbin) and densified MLIP (.json) assets carry their
        // frame count in the payload, not in a line-countable text format —
        // so we can't recompute it here. We can still guarantee the bundled
        // file the entry promises actually ships, which is the failure mode
        // that turns a curated card into a dead link at runtime.
        expect(existsSync(onDisk), `missing bundled asset for ${e.id}: ${e.file}`).toBe(true);
      } else {
        throw new Error(`unsupported multi-frame gallery asset for ${e.id}: ${e.file}`);
      }
    }
  });

  it('every entry has a snapshot image or procedural fallback colors', () => {
    for (const e of data) {
      const snap = `${PUBLIC}gallery/snapshots/${e.id}.jpg`;
      expect(
        existsSync(snap) || (Array.isArray(e.colors) && e.colors.length === 3),
        `missing thumbnail path and fallback colors for ${e.id}`,
      ).toBe(true);
    }
  });

  it('landing featured entries ship concrete thumbnails and loadable assets', () => {
    for (const id of FEATURED_IDS) {
      const e = data.find((entry) => entry.id === id);
      expect(e, `featured entry missing from gallery-data.json: ${id}`).toBeTruthy();
      if (!e) continue;

      expect(
        existsSync(`${PUBLIC}gallery/snapshots/${id}.jpg`),
        `missing landing featured snapshot for ${id}`,
      ).toBe(true);

      if (!e.file.startsWith('http') && e.file !== 'procedural') {
        expect(existsSync(PUBLIC + e.file), `missing landing featured file for ${id}: ${e.file}`).toBe(true);
      }
    }
  });

  it('MLIP .json entries advertise their measured frame count, not an interpolated one', () => {
    // The viewer smooths sparse MD frames at render time; it must not pad the
    // trajectory (and the advertised count) with fabricated in-between frames.
    // Advertised frames === measured frames in the payload.
    const jsonEntries = data.filter((e) => e.available && e.file.endsWith('.json'));
    for (const e of jsonEntries) {
      const payload = JSON.parse(readFileSync(PUBLIC + e.file, 'utf8'));
      if (payload.schema !== 'lupine.mlip.md_trajectory.v1') continue;
      const measured = Array.isArray(payload.frames) ? payload.frames.length : 0;
      expect(parseFrameLabel(e.frames), `${e.id}: advertised frames must equal measured frames`).toBe(measured);
    }
  });

  it('colorBy scenes ship a property-carrying dump with that column present', () => {
    // The NIST benchmarks exist to be read through their per-atom `error`
    // field ("color by error to see where potentials fail"). Plain .xyz drops
    // named columns, so a colorBy scene MUST be a LAMMPS dump whose ATOMS
    // header actually declares the column. Guards against silently swapping
    // these back to a column-less format and gutting the science.
    const colorByEntries = data.filter((e) => e.colorBy);
    expect(colorByEntries.length, 'expected at least one curated color-by scene').toBeGreaterThan(0);
    for (const e of colorByEntries) {
      expect(
        /\.(lammpstrj|dump)$/.test(e.file),
        `colorBy scene ${e.id} must use a dump format that carries named columns`,
      ).toBe(true);
      const head = readFileSync(PUBLIC + e.file, 'utf8').slice(0, 4096);
      const atomsHeader = head.match(/^ITEM:\s*ATOMS\s+(.*)$/m)?.[1] ?? '';
      expect(
        atomsHeader.split(/\s+/),
        `colorBy column "${e.colorBy}" missing from ${e.id} ATOMS header`,
      ).toContain(e.colorBy);
    }
  });

  it('domains span a meaningful breadth (curation, not one bucket)', () => {
    const used = new Set(data.map((e) => e.domain));
    expect(used.size).toBeGreaterThanOrEqual(5);
  });

  it('organic functional-group curriculum maps only to shipped gallery molecules', () => {
    const galleryIds = new Set(data.map((e) => e.id));
    expect(FUNCTIONAL_GROUPS.length).toBeGreaterThanOrEqual(18);

    for (const group of FUNCTIONAL_GROUPS) {
      expect(group.exampleIds.length, `${group.id} needs examples`).toBeGreaterThan(0);
      expect(group.recognize.length, `${group.id} needs a recognition cue`).toBeGreaterThan(18);
      expect(group.reactivity.length, `${group.id} needs a reactivity cue`).toBeGreaterThan(18);
      expect(group.commonConfusion.length, `${group.id} needs a confusion guard`).toBeGreaterThan(18);
      expect(group.studyPrompt.length, `${group.id} needs a self-check prompt`).toBeGreaterThan(18);
      for (const id of group.exampleIds) {
        expect(galleryIds.has(id), `${group.id} references missing gallery molecule: ${id}`).toBe(true);
      }
    }

    const organicIds = new Set(FUNCTIONAL_GROUPS.flatMap((group) => group.exampleIds));
    expect(organicIds.size).toBeGreaterThanOrEqual(20);
    expect(functionalGroupsForMolecule('aspirin').map((group) => group.id)).toEqual(
      expect.arrayContaining(['arene', 'carboxylic-acid', 'ester']),
    );
    expect(functionalGroupsForMolecule('benzaldehyde').map((group) => group.id)).toEqual(
      expect.arrayContaining(['arene', 'aldehyde']),
    );
    expect(functionalGroupsForMolecule('acetone').map((group) => group.id)).toEqual(
      expect.arrayContaining(['ketone']),
    );
    expect(functionalGroupsForMolecule('ethylene_oxide').map((group) => group.id)).toEqual(
      expect.arrayContaining(['ether', 'epoxide']),
    );
    expect(functionalGroupsForMolecule('tert_butyl_chloride').map((group) => group.id)).toEqual(
      expect.arrayContaining(['alkyl-halide']),
    );
  });
});

describe('GLB hover machinery stays removed (regression guard)', () => {
  const src = readFileSync(GALLERY_TSX, 'utf8');

  it('no gallery entry references a /gallery/models/ GLB', () => {
    expect(JSON.stringify(data)).not.toContain('/gallery/models/');
  });

  it('Gallery.tsx does not re-import react-three / GLB preview', () => {
    expect(src).not.toMatch(/@react-three/);
    expect(src).not.toMatch(/useGLTF/);
    expect(src).not.toMatch(/gallery\/models\//);
  });
});

describe('pre-redesign card grid stays removed (regression guard)', () => {
  const src = readFileSync(GALLERY_TSX, 'utf8');

  // The scene-browser redesign (rail + index + spotlight) supplanted the
  // card-grid layout. Its components and inline style objects were deleted;
  // keep them gone so the file does not regrow two parallel layouts.
  it('does not redefine the dropped grid components', () => {
    expect(src).not.toMatch(/function PatchCard\b/);
    expect(src).not.toMatch(/function DomainCard\b/);
  });

  it('does not reintroduce the dropped inline style objects', () => {
    expect(src).not.toMatch(/\bsQuilt\b/);
    expect(src).not.toMatch(/\bsPatch\w*\b/);
    expect(src).not.toMatch(/\bsRibbon\w*\b/);
  });
});
