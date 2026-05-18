// @vitest-environment node
/**
 * Curation invariants for the shipped gallery.
 *
 * Guards the contract established by the ship/gallery-cleanup rebuild:
 * every gallery entry must be well-formed AND actually loadable (its
 * data file + snapshot must exist, or be GCS/procedural). Also a
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
  available: boolean;
  colors: string[];
  metadata?: Record<string, unknown>;
  featured?: boolean;
}

const data = galleryData as Entry[];
const HEX = /^#[0-9a-fA-F]{6}$/;

describe('gallery-data.json — curated launch set', () => {
  it('is a non-empty curated set (not the legacy 185)', () => {
    expect(data.length).toBeGreaterThan(0);
    expect(data.length).toBeLessThanOrEqual(40);
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

  it('every entry has a snapshot image on disk', () => {
    for (const e of data) {
      const snap = `${PUBLIC}gallery/snapshots/${e.id}.jpg`;
      expect(existsSync(snap), `missing snapshot for ${e.id}`).toBe(true);
    }
  });

  it('domains span a meaningful breadth (curation, not one bucket)', () => {
    const used = new Set(data.map((e) => e.domain));
    expect(used.size).toBeGreaterThanOrEqual(5);
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
