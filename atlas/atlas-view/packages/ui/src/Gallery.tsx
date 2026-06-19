/**
 * Gallery — curated simulation showcase.
 *
 * Fast scene browser for curated structures and trajectories. The list stays
 * light; only the focused scene renders a large preview.
 */

import { useCallback, useRef, useEffect, useState, useMemo, useDeferredValue } from 'react';
import { useStore } from './store';
import { artifactToLoadedFile } from './MlipArtifactLoader';
import galleryData from './gallery-data.json';
import {
  getDeviceProfile,
  parseAtomCountLabel,
  formatAtomCount,
} from './deviceCapabilities';
import {
  FUNCTIONAL_GROUP_BY_ID,
  FUNCTIONAL_GROUPS,
  type FunctionalGroupId,
  type FunctionalGroupConcept,
  functionalGroupsForMolecule,
  functionalGroupSearchText,
  moleculeMatchesFunctionalGroup,
} from './organicFunctionalGroups';
import { galleryNomenclatureTags } from './galleryNomenclature';

// ─── Types ──────────────────────────────────────────────────────────────

type Domain =
  | 'Metals & Alloys'
  | 'Ceramics & Oxides'
  | 'Polymers & Soft Matter'
  | 'Nanomaterials'
  | 'Biomolecules'
  | 'Energy Materials'
  | 'Defects & Mechanics'
  | 'Methods'
  | 'Fluids & Solvents'
  | 'Atomized Media'
  | 'Advanced Theory & Validation';

interface GalleryExample {
  id: string;
  title: string;
  subtitle: string;
  domain: Domain;
  atoms: string;
  frames: string;
  isTrajectory?: boolean;
  autoPlay?: boolean;
  /**
   * Per-atom property this scene is curated to be read through (e.g. 'error'
   * for the NIST potential benchmarks). Element identity is the global
   * first-read default; this opts a curated scene into its intended view so
   * the subtitle's "color by error" promise is what you actually see.
   */
  colorBy?: string;
  file: string;
  sourceUrl?: string;
  available: boolean;
  colors: [string, string, string];
  metadata?: {
    method?: string;
    potential?: string;
    temperature?: string;
    ensemble?: string;
    reference?: string;
    doi?: string;
    density?: string;
  };
  featured?: boolean;
}

const EXAMPLES: GalleryExample[] = galleryData as GalleryExample[];

const DOMAIN_COLORS: Record<Domain, string> = {
  'Metals & Alloys': '#e8b4b8',
  'Ceramics & Oxides': '#a8d5ba',
  'Polymers & Soft Matter': '#f5e6a3',
  'Nanomaterials': '#b8d4e3',
  'Biomolecules': '#e8c4d9',
  'Energy Materials': '#c4e0c4',
  'Defects & Mechanics': '#f0d9a8',
  'Methods': '#d4d4e8',
  'Fluids & Solvents': '#a8c8e8',
  'Atomized Media': '#e7edf3',
  'Advanced Theory & Validation': '#d9c4e8',
};

const DOMAIN_THREAD: Record<Domain, string> = {
  'Metals & Alloys': '#c9a0a4',
  'Ceramics & Oxides': '#8ab89a',
  'Polymers & Soft Matter': '#d4c984',
  'Nanomaterials': '#98b8c8',
  'Biomolecules': '#c8a4b8',
  'Energy Materials': '#a4c4a4',
  'Defects & Mechanics': '#d0b888',
  'Methods': '#b8b8d0',
  'Fluids & Solvents': '#88a8c8',
  'Atomized Media': '#c7d0da',
  'Advanced Theory & Validation': '#b8a4c8',
};

const ALL_DOMAINS = Object.keys(DOMAIN_COLORS) as Domain[];

type SourceFilter = 'All Sources' | 'Featured' | 'Trajectories' | 'Snapshots' | 'Open Data';

const SOURCE_FILTERS: SourceFilter[] = ['All Sources', 'Featured', 'Trajectories', 'Snapshots', 'Open Data'];

const GENERATED_SNAPSHOT_URLS: Record<string, string> = {
  lupi_live_qr_atomized: 'generated/atomized/lupi-live-qr-atomized.png',
  pulse_grid_atomized: 'generated/atomized/pulse-grid-atomized.png',
};

function publicAssetUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
}

function gallerySnapshotUrl(id: string): string {
  if (GENERATED_SNAPSHOT_URLS[id]) return publicAssetUrl(GENERATED_SNAPSHOT_URLS[id]);
  return publicAssetUrl(`gallery/snapshots/${id}.jpg`);
}

function parseFrameCountLabel(label: string | undefined): number {
  if (!label) return 0;
  const digits = label.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

function resolveExampleUrl(example: GalleryExample): string {
  if (example.file.startsWith('http://') || example.file.startsWith('https://')) {
    return maybeDevStorageProxy(example.file);
  }
  const localUrl = publicAssetUrl(example.file);
  const isDev = (import.meta as any).env?.DEV;
  return (isDev || !example.sourceUrl) ? localUrl : example.sourceUrl;
}

function maybeDevStorageProxy(url: string): string {
  const isDev = (import.meta as any).env?.DEV;
  if (!isDev) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'storage.googleapis.com') return url;
    return `/__lupi_gcs${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isOpenDataExample(example: GalleryExample): boolean {
  return Boolean(
    example.sourceUrl
    || example.file.startsWith('http://')
    || example.metadata?.doi
    || /NIST|Nature|OpenKIM|Materials Project|Zenodo|GCS|benchmark/i.test(
      [
        example.metadata?.method,
        example.metadata?.potential,
        example.metadata?.reference,
        example.subtitle,
      ].filter(Boolean).join(' '),
    ),
  );
}

function matchesSourceFilter(example: GalleryExample, sourceFilter: SourceFilter): boolean {
  if (sourceFilter === 'All Sources') return true;
  if (sourceFilter === 'Featured') return Boolean(example.featured);
  if (sourceFilter === 'Trajectories') return parseFrameCountLabel(example.frames) > 1;
  if (sourceFilter === 'Snapshots') return parseFrameCountLabel(example.frames) <= 1;
  return isOpenDataExample(example);
}

type PreviewAtom = {
  element: string;
  x: number;
  y: number;
  z: number;
};

type ProjectedAtom = PreviewAtom & {
  color: string;
  radius: number;
  screenX: number;
  screenY: number;
  depth: number;
};

const LIVE_PREVIEW_ATOM_LIMIT = 1200;
const LIVE_PREVIEW_BOND_LIMIT = 260;

const CPK_COLORS: Record<string, string> = {
  H: '#f8fafc',
  C: '#9ca3af',
  N: '#3050f8',
  O: '#ff3355',
  F: '#90e050',
  P: '#ff8a00',
  S: '#ffd92e',
  Cl: '#1ff01f',
  Li: '#cc80ff',
  Na: '#ab5cf2',
  Mg: '#8aff00',
  Al: '#b8b8b8',
  Si: '#f0c8a0',
  K: '#8f40d4',
  Ca: '#3dff00',
  Ti: '#bfc2c7',
  Fe: '#e06633',
  Cu: '#c78033',
  Zn: '#7d80b0',
  Zr: '#94e0e0',
};

const PREVIEW_RADII: Record<string, number> = {
  H: 0.42,
  C: 0.72,
  N: 0.68,
  O: 0.66,
  F: 0.64,
  P: 0.86,
  S: 0.82,
  Cl: 0.80,
  Si: 0.88,
  Al: 0.92,
  Fe: 0.88,
  Cu: 0.86,
  Zn: 0.86,
  Zr: 0.98,
};

function canUseLivePreview(example: GalleryExample): boolean {
  return (
    example.available
    && /\.xyz$/i.test(example.file)
    && parseAtomCountLabel(example.atoms) <= LIVE_PREVIEW_ATOM_LIMIT
  );
}

function parsePreviewXyz(text: string, atomLimit = LIVE_PREVIEW_ATOM_LIMIT): PreviewAtom[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3) return [];

  const declaredCount = Number.parseInt(lines[0], 10);
  const atomLines = Number.isFinite(declaredCount) && declaredCount > 0
    ? lines.slice(2, 2 + Math.min(declaredCount, atomLimit))
    : lines.slice(0, atomLimit);

  const atoms: PreviewAtom[] = [];
  for (const line of atomLines) {
    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;
    const x = Number.parseFloat(parts[1]);
    const y = Number.parseFloat(parts[2]);
    const z = Number.parseFloat(parts[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    atoms.push({ element: normalizeElement(parts[0]), x, y, z });
  }
  return atoms;
}

function normalizeElement(element: string): string {
  if (!element) return 'C';
  const clean = element.replace(/[^a-z]/gi, '');
  if (!clean) return 'C';
  return clean.length === 1
    ? clean.toUpperCase()
    : `${clean[0].toUpperCase()}${clean.slice(1, 2).toLowerCase()}`;
}

function normalizePreviewAtoms(atoms: PreviewAtom[]): PreviewAtom[] {
  if (!atoms.length) return atoms;
  const bounds = atoms.reduce(
    (acc, atom) => ({
      minX: Math.min(acc.minX, atom.x),
      maxX: Math.max(acc.maxX, atom.x),
      minY: Math.min(acc.minY, atom.y),
      maxY: Math.max(acc.maxY, atom.y),
      minZ: Math.min(acc.minZ, atom.z),
      maxZ: Math.max(acc.maxZ, atom.z),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    },
  );
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const span = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ,
    1,
  );
  return atoms.map((atom) => ({
    ...atom,
    x: (atom.x - cx) / span,
    y: (atom.y - cy) / span,
    z: (atom.z - cz) / span,
  }));
}

function detectPreviewBonds(atoms: PreviewAtom[]): [number, number][] {
  if (atoms.length > 220) return [];
  const bonds: [number, number][] = [];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const dx = atoms[i].x - atoms[j].x;
      const dy = atoms[i].y - atoms[j].y;
      const dz = atoms[i].z - atoms[j].z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const ri = PREVIEW_RADII[atoms[i].element] ?? 0.76;
      const rj = PREVIEW_RADII[atoms[j].element] ?? 0.76;
      const threshold = Math.max(1.15, Math.min(2.15, (ri + rj) * 1.24));
      if (distance <= threshold) {
        bonds.push([i, j]);
        if (bonds.length >= LIVE_PREVIEW_BOND_LIMIT) return bonds;
      }
    }
  }
  return bonds;
}

function seededOffset(id: string): number {
  return id.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0) % 997;
}

const GALLERY_STUDIO_CSS = `
  .lupi-gallery {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 24px 48px;
    color: #f8fafc;
  }
  .lupi-gallery-hero {
    display: grid;
    justify-items: center;
    gap: 20px;
    text-align: center;
    padding: 26px 0 34px;
  }
  .lupi-gallery-eyebrow {
    color: rgba(125, 211, 252, 0.82);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-title {
    margin: 0;
    font-size: 52px;
    font-weight: 300;
    line-height: 0.96;
    letter-spacing: 0;
    text-wrap: balance;
  }
  .lupi-gallery-copy {
    max-width: 680px;
    margin: 0;
    color: rgba(226, 232, 240, 0.62);
    font-size: 15px;
    line-height: 1.65;
  }
  .lupi-gallery-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
  }
  .lupi-gallery-stat {
    min-width: 118px;
    padding: 0 14px;
    border-right: 1px solid rgba(255,255,255,0.1);
  }
  .lupi-gallery-stat:last-child {
    border-right: 0;
  }
  .lupi-gallery-stat-value {
    display: block;
    color: #fff;
    font-size: 24px;
    font-weight: 560;
    line-height: 1.1;
  }
  .lupi-gallery-stat-label {
    display: block;
    margin-top: 4px;
    color: rgba(203, 213, 225, 0.52);
    font-size: 12px;
  }
  .lupi-gallery-controls {
    position: sticky;
    top: 0;
    z-index: 20;
    margin: 0 -24px 30px;
    padding: 14px 24px;
    background: rgba(8, 11, 18, 0.93);
    border-block: 1px solid rgba(255,255,255,0.07);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }
  .lupi-gallery-controls-inner {
    max-width: 1120px;
    margin: 0 auto;
    display: grid;
    gap: 12px;
    min-width: 0;
  }
  .lupi-gallery-search {
    position: relative;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .lupi-gallery-search svg {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(226,232,240,0.34);
    pointer-events: none;
  }
  .lupi-gallery-search input {
    width: 100%;
    box-sizing: border-box;
    padding: 13px 44px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    background: rgba(255,255,255,0.045);
    color: #f8fafc;
    font: inherit;
    font-size: 15px;
    outline: none;
  }
  .lupi-gallery-search input:focus {
    border-color: rgba(30, 220, 224, 0.62);
    box-shadow: 0 0 0 1px rgba(30, 220, 224, 0.22);
  }
  .lupi-gallery-clear {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    color: rgba(226,232,240,0.74);
    cursor: pointer;
  }
  .lupi-gallery-filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }
  .lupi-gallery-chips {
    display: flex;
    gap: 8px;
    min-width: 0;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }
  .lupi-gallery-chips::-webkit-scrollbar {
    display: none;
  }
  .lupi-gallery-chip {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.035);
    color: rgba(226,232,240,0.66);
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }
  .lupi-gallery-chip[data-active="true"] {
    color: #fff;
    border-color: var(--chip-color, rgba(30,220,224,0.55));
    background: color-mix(in srgb, var(--chip-color, #1edce0) 16%, transparent);
  }
  .lupi-gallery-chip-count {
    color: rgba(226,232,240,0.42);
    font-size: 10px;
  }
  .lupi-gallery-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
  }
  .lupi-gallery-select {
    min-width: 142px;
    padding: 8px 11px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.045);
    color: rgba(226,232,240,0.78);
    font: inherit;
    font-size: 12px;
    outline: none;
  }
  .lupi-gallery-view-toggle {
    display: inline-flex;
    overflow: hidden;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.035);
  }
  .lupi-gallery-view-toggle button {
    display: grid;
    place-items: center;
    width: 35px;
    height: 34px;
    border: 0;
    background: transparent;
    color: rgba(226,232,240,0.44);
    cursor: pointer;
  }
  .lupi-gallery-view-toggle button[data-active="true"] {
    background: #1edce0;
    color: #061316;
  }
  .lupi-gallery-section-title {
    margin: 0 0 18px;
    color: #fff;
    font-size: 24px;
    font-weight: 380;
    letter-spacing: 0;
  }
  .lupi-gallery-domain-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 44px;
  }
  .lupi-gallery-domain-card {
    min-height: 148px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    background: rgba(255,255,255,0.032);
    color: #f8fafc;
    text-align: left;
    cursor: pointer;
    transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  }
  .lupi-gallery-domain-card:hover,
  .lupi-gallery-domain-card[data-active="true"] {
    border-color: color-mix(in srgb, var(--domain-color, #1edce0) 58%, transparent);
    background: color-mix(in srgb, var(--domain-color, #1edce0) 10%, rgba(255,255,255,0.035));
    box-shadow: 0 14px 34px rgba(0,0,0,0.22);
  }
  .lupi-gallery-domain-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .lupi-gallery-domain-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    color: var(--domain-color, #1edce0);
    background: color-mix(in srgb, var(--domain-color, #1edce0) 13%, transparent);
    font-size: 16px;
    font-weight: 800;
  }
  .lupi-gallery-domain-count {
    color: rgba(226,232,240,0.42);
    font-size: 12px;
  }
  .lupi-gallery-domain-card h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 620;
  }
  .lupi-gallery-domain-card p {
    margin: 0;
    color: rgba(203,213,225,0.58);
    font-size: 13px;
    line-height: 1.45;
  }
  .lupi-gallery-results-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    margin: 0 0 18px;
  }
  .lupi-gallery-results-head p {
    margin: 4px 0 0;
    color: rgba(203,213,225,0.52);
    font-size: 13px;
  }
  .lupi-gallery-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 18px;
  }
  .lupi-gallery-results-list {
    display: grid;
    gap: 12px;
  }
  .lupi-gallery-card {
    --thread-color: #1edce0;
    position: relative;
    width: 100%;
    padding: 0;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(255,255,255,0.035);
    color: #f8fafc;
    text-align: left;
    cursor: pointer;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
  }
  .lupi-gallery-card:hover,
  .lupi-gallery-card[data-hovered="true"] {
    border-color: color-mix(in srgb, var(--thread-color) 58%, transparent);
    background: rgba(255,255,255,0.052);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--thread-color) 22%, transparent), 0 14px 32px rgba(0,0,0,0.28);
  }
  .lupi-gallery-card:disabled {
    opacity: 0.46;
    cursor: not-allowed;
  }
  .lupi-gallery-card-list {
    display: grid;
    grid-template-columns: 148px minmax(0, 1fr) auto;
    align-items: stretch;
    min-height: 134px;
  }
  .lupi-gallery-thumb {
    position: relative;
    height: 168px;
    overflow: hidden;
    background: #050508;
  }
  .lupi-gallery-card-list .lupi-gallery-thumb {
    height: auto;
    min-height: 134px;
  }
  .lupi-gallery-thumb img,
  .lupi-gallery-thumb canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .lupi-gallery-thumb img {
    z-index: 1;
    filter: saturate(0.92) contrast(1.04);
    transition: opacity 180ms ease, transform 220ms ease, filter 220ms ease;
  }
  .lupi-gallery-card:hover .lupi-gallery-thumb img,
  .lupi-gallery-card[data-hovered="true"] .lupi-gallery-thumb img {
    transform: scale(1.018);
    filter: saturate(1.05) contrast(1.08);
  }
  .lupi-gallery-live-preview {
    z-index: 3;
    background: #050508;
  }
  .lupi-gallery-fallback-preview {
    z-index: 2;
  }
  .lupi-gallery-thumb::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 36%, transparent 0 45%, rgba(0,0,0,0.18) 78%),
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.20));
  }
  .lupi-gallery-card-body {
    padding: 16px;
    display: grid;
    gap: 8px;
  }
  .lupi-gallery-card-list .lupi-gallery-card-body {
    align-content: center;
  }
  .lupi-gallery-card-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: rgba(226,232,240,0.52);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-card-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--domain-color, #1edce0);
  }
  .lupi-gallery-card h4 {
    margin: 0;
    color: #fff;
    font-size: 16px;
    font-weight: 610;
    line-height: 1.25;
  }
  .lupi-gallery-card p {
    margin: 0;
    color: rgba(203,213,225,0.56);
    font-size: 13px;
    line-height: 1.45;
  }
  .lupi-gallery-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  .lupi-gallery-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 22px;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.055);
    color: rgba(226,232,240,0.62);
    font-size: 11px;
    font-weight: 620;
  }
  .lupi-gallery-tag-live {
    color: #34d399;
    background: rgba(52, 211, 153, 0.09);
  }
  .lupi-gallery-meta {
    display: grid;
    gap: 2px;
    color: rgba(203,213,225,0.42);
    font-size: 11px;
    line-height: 1.45;
  }
  .lupi-gallery-card-action {
    display: none;
    align-items: center;
    justify-content: center;
    width: 64px;
    color: rgba(226,232,240,0.32);
    border-left: 1px solid rgba(255,255,255,0.06);
  }
  .lupi-gallery-card-list .lupi-gallery-card-action {
    display: flex;
  }
  .lupi-gallery-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(3,5,10,0.86);
    backdrop-filter: blur(5px);
    z-index: 10;
    color: rgba(226,232,240,0.78);
    font-size: 12px;
    font-weight: 650;
  }
  .lupi-gallery-progress {
    width: min(220px, 72%);
    height: 4px;
    overflow: hidden;
    border-radius: 99px;
    background: rgba(255,255,255,0.12);
  }
  .lupi-gallery-progress > span {
    display: block;
    height: 100%;
    background: var(--thread-color, #1edce0);
    transition: width 180ms ease;
  }
  .lupi-gallery-empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 72px 24px;
    text-align: center;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    background: rgba(255,255,255,0.028);
  }
  .lupi-gallery-empty-title {
    color: #fff;
    font-size: 18px;
    font-weight: 620;
  }
  .lupi-gallery-empty p {
    margin: 0;
    max-width: 420px;
    color: rgba(203,213,225,0.58);
    font-size: 13px;
  }
  .lupi-gallery-empty button {
    margin-top: 8px;
    padding: 9px 16px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    color: #f8fafc;
    font-weight: 650;
    cursor: pointer;
  }
  @media (max-width: 980px) {
    .lupi-gallery-domain-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 720px) {
    .lupi-gallery {
      padding: 0 16px 34px;
    }
    .lupi-gallery-title {
      font-size: 34px;
    }
    .lupi-gallery-hero {
      padding-top: 18px;
      text-align: left;
      justify-items: stretch;
    }
    .lupi-gallery-stats {
      justify-content: flex-start;
      gap: 8px;
    }
    .lupi-gallery-stat {
      min-width: calc(50% - 4px);
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      background: rgba(255,255,255,0.028);
    }
    .lupi-gallery-controls {
      margin-inline: -16px;
      padding-inline: 16px;
    }
    .lupi-gallery-filter-row {
      align-items: stretch;
      flex-direction: column;
    }
    .lupi-gallery-actions {
      justify-content: space-between;
    }
    .lupi-gallery-select {
      flex: 1;
      min-width: 0;
    }
    .lupi-gallery-domain-grid {
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 34px;
    }
    .lupi-gallery-domain-card {
      min-height: 116px;
    }
    .lupi-gallery-results-head {
      align-items: start;
      flex-direction: column;
    }
    .lupi-gallery-results-grid {
      grid-template-columns: 1fr;
    }
    .lupi-gallery-card-list {
      grid-template-columns: 112px minmax(0, 1fr);
    }
    .lupi-gallery-card-list .lupi-gallery-card-action {
      display: none;
    }
    .lupi-gallery-card-list .lupi-gallery-thumb {
      min-height: 126px;
    }
    .lupi-gallery-card h4 {
      font-size: 15px;
    }
  }

  .lupi-gallery-fast {
    max-width: 1760px;
    padding: 16px clamp(12px, 2.2vw, 28px) 42px;
  }
  .lupi-gallery-workbench {
    display: grid;
    grid-template-columns: minmax(230px, 280px) minmax(380px, 1fr) minmax(300px, 390px);
    gap: 14px;
    align-items: start;
  }
  .lupi-gallery-rail,
  .lupi-gallery-index,
  .lupi-gallery-spotlight {
    min-width: 0;
    border: 1px solid rgba(255,255,255,0.085);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(15,23,42,0.58), rgba(3,7,18,0.42)),
      rgba(7, 9, 14, 0.76);
    box-shadow:
      0 18px 50px rgba(0,0,0,0.24),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .lupi-gallery-rail {
    position: sticky;
    top: 12px;
    display: grid;
    gap: 14px;
    padding: 16px;
  }
  .lupi-gallery-rail-head h2 {
    margin: 5px 0 5px;
    font-size: 24px;
    font-weight: 620;
    line-height: 1.05;
    text-wrap: balance;
  }
  .lupi-gallery-rail-head p {
    margin: 0;
    color: rgba(203,213,225,0.58);
    font-size: 12px;
    line-height: 1.45;
  }
  .lupi-gallery-fast-search input {
    padding-block: 10px;
    border-radius: 8px;
    font-size: 13px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.062), rgba(255,255,255,0.028)),
      rgba(2,6,23,0.58);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .lupi-gallery-source-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .lupi-gallery-source-tabs button {
    min-height: 34px;
    padding: 6px 8px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
      rgba(2,6,23,0.42);
    color: rgba(226,232,240,0.62);
    font-size: 11px;
    font-weight: 740;
    line-height: 1.15;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .lupi-gallery-source-tabs button:hover,
  .lupi-gallery-source-tabs button:focus-visible {
    border-color: rgba(30,220,224,0.34);
    color: #f8fafc;
    outline: none;
  }
  .lupi-gallery-source-tabs button[data-active="true"] {
    border-color: rgba(30,220,224,0.56);
    background:
      linear-gradient(180deg, rgba(30,220,224,0.18), rgba(30,220,224,0.07)),
      rgba(4,14,20,0.72);
    color: #eaffff;
    box-shadow: 0 0 0 1px rgba(30,220,224,0.08), 0 10px 22px rgba(30,220,224,0.10);
  }
  .lupi-gallery-organic-map {
    display: grid;
    gap: 7px;
    padding: 10px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(15,23,42,0.52), rgba(2,6,23,0.24)),
      rgba(255,255,255,0.02);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.045);
  }
  .lupi-gallery-organic-map h3 {
    margin: 0;
    color: rgba(248,250,252,0.9);
    font-size: 12px;
    font-weight: 760;
    letter-spacing: 0;
  }
  .lupi-gallery-organic-map p {
    margin: 0;
    color: rgba(203,213,225,0.55);
    font-size: 11px;
    line-height: 1.35;
  }
  .lupi-gallery-functional-groups {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .lupi-gallery-functional-groups button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 28px;
    padding: 5px 7px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    background: rgba(255,255,255,0.032);
    color: rgba(226,232,240,0.64);
    font-size: 10px;
    font-weight: 720;
    line-height: 1.1;
    cursor: pointer;
  }
  .lupi-gallery-functional-groups button[data-active="true"],
  .lupi-gallery-functional-groups button:hover {
    border-color: var(--group-color);
    background: color-mix(in srgb, var(--group-color) 16%, transparent);
    color: #fff;
  }
  .lupi-gallery-functional-groups i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--group-color);
    box-shadow: 0 0 10px color-mix(in srgb, var(--group-color) 42%, transparent);
  }
  .lupi-gallery-functional-groups em {
    color: rgba(203,213,225,0.48);
    font-style: normal;
  }
  .lupi-gallery-study-guide {
    --group-color: rgba(125,211,252,0.78);
    display: grid;
    gap: 9px;
    padding: 10px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    background: rgba(2,6,23,0.26);
  }
  .lupi-gallery-study-guide-head {
    display: grid;
    gap: 2px;
  }
  .lupi-gallery-study-guide-head span {
    color: color-mix(in srgb, var(--group-color) 72%, rgba(226,232,240,0.54));
    font-size: 9px;
    font-weight: 820;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-study-guide-head strong {
    color: rgba(248,250,252,0.94);
    font-size: 13px;
    font-weight: 780;
    letter-spacing: 0;
    line-height: 1.25;
    text-wrap: balance;
  }
  .lupi-gallery-study-guide > p {
    max-width: 42rem;
    color: rgba(203,213,225,0.68);
    font-size: 12px;
    line-height: 1.55;
    text-wrap: pretty;
  }
  .lupi-gallery-study-guide dl {
    display: grid;
    gap: 7px;
    margin: 0;
  }
  .lupi-gallery-study-guide dl div {
    display: grid;
    gap: 2px;
  }
  .lupi-gallery-study-guide dt {
    color: color-mix(in srgb, var(--group-color) 64%, rgba(226,232,240,0.64));
    font-size: 9px;
    font-weight: 820;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-study-guide dd {
    margin: 0;
    color: rgba(226,232,240,0.72);
    font-size: 12px;
    line-height: 1.52;
    text-wrap: pretty;
  }
  .lupi-gallery-study-prompt,
  .lupi-gallery-study-examples {
    display: grid;
    gap: 3px;
    padding-left: 9px;
    border-left: 2px solid color-mix(in srgb, var(--group-color) 56%, transparent);
  }
  .lupi-gallery-study-prompt span,
  .lupi-gallery-study-examples span {
    color: rgba(226,232,240,0.52);
    font-size: 9px;
    font-weight: 820;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-study-prompt p,
  .lupi-gallery-study-examples p {
    color: rgba(226,232,240,0.72);
    font-size: 12px;
    line-height: 1.52;
    text-wrap: pretty;
  }
  .lupi-gallery-domain-menu {
    display: grid;
    gap: 5px;
  }
  .lupi-gallery-domain-row {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 7px 8px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: rgba(226,232,240,0.66);
    text-align: left;
    cursor: pointer;
  }
  .lupi-gallery-domain-row[data-active="true"],
  .lupi-gallery-domain-row:hover {
    border-color: color-mix(in srgb, var(--domain-color, #1edce0) 38%, rgba(255,255,255,0.08));
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--domain-color, #1edce0) 10%, transparent), transparent 78%),
      rgba(255,255,255,0.045);
    color: #fff;
  }
  .lupi-gallery-domain-mark {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .lupi-gallery-domain-row span:nth-child(2) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 620;
  }
  .lupi-gallery-domain-row em,
  .lupi-gallery-domain-row strong {
    color: rgba(203,213,225,0.42);
    font-size: 11px;
    font-style: normal;
  }
  .lupi-gallery-index {
    padding: 16px;
  }
  .lupi-gallery-index-head {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }
  .lupi-gallery-index-head h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 620;
    line-height: 1.08;
    text-wrap: balance;
  }
  .lupi-gallery-index-head p {
    margin: 4px 0 0;
    color: rgba(203,213,225,0.54);
    font-size: 12px;
  }
  .lupi-gallery-fast-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
  .lupi-gallery-fast-stats span {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 5px 8px;
    border-radius: 7px;
    background: rgba(255,255,255,0.045);
    color: rgba(226,232,240,0.55);
    font-size: 11px;
    font-weight: 620;
    font-variant-numeric: tabular-nums;
  }
  .lupi-gallery-fast-stats strong {
    color: #fff;
    font-size: 13px;
  }
  .lupi-gallery-playlist {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    margin-bottom: 12px;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .lupi-gallery-playlist::-webkit-scrollbar {
    display: none;
  }
  .lupi-gallery-playlist button {
    flex: 0 0 168px;
    display: grid;
    gap: 4px;
    min-height: 58px;
    padding: 9px 10px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018)),
      rgba(2,6,23,0.34);
    color: rgba(226,232,240,0.7);
    text-align: left;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
  }
  .lupi-gallery-playlist button[data-active="true"],
  .lupi-gallery-playlist button:hover {
    border-color: rgba(52,211,153,0.55);
    background: rgba(52,211,153,0.095);
    color: #f8fffb;
  }
  .lupi-gallery-playlist span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 650;
  }
  .lupi-gallery-playlist strong {
    color: #34d399;
    font-size: 11px;
  }
  .lupi-gallery-result-table {
    display: grid;
    gap: 6px;
  }
  .lupi-gallery-scene-row {
    --thread-color: #1edce0;
    position: relative;
    display: grid;
    grid-template-columns: 36px minmax(180px, 1.2fr) minmax(130px, 0.5fr) minmax(190px, 0.8fr) 70px;
    align-items: center;
    gap: 12px;
    min-height: 68px;
    padding: 10px 11px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.065);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018)),
      rgba(2,6,23,0.34);
    color: #f8fafc;
    text-align: left;
    cursor: pointer;
    content-visibility: auto;
    contain-intrinsic-size: 68px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
  }
  .lupi-gallery-scene-row:hover,
  .lupi-gallery-scene-row:focus-visible,
  .lupi-gallery-scene-row[data-selected="true"] {
    border-color: color-mix(in srgb, var(--thread-color) 48%, rgba(255,255,255,0.08));
    background: color-mix(in srgb, var(--thread-color) 8%, rgba(255,255,255,0.035));
    outline: none;
  }
  .lupi-gallery-scene-row:disabled {
    opacity: 0.46;
    cursor: not-allowed;
  }
  .lupi-gallery-row-swatch {
    display: grid;
    gap: 3px;
  }
  .lupi-gallery-row-swatch i {
    display: block;
    height: 7px;
    border-radius: 99px;
  }
  .lupi-gallery-row-main {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .lupi-gallery-row-main strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 700;
  }
  .lupi-gallery-row-main span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(203,213,225,0.50);
    font-size: 12px;
  }
  .lupi-gallery-row-domain {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(226,232,240,0.58);
    font-size: 12px;
    font-weight: 620;
  }
  .lupi-gallery-row-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .lupi-gallery-row-facts em {
    padding: 3px 7px;
    border-radius: 999px;
    background: rgba(255,255,255,0.055);
    color: rgba(226,232,240,0.62);
    font-size: 11px;
    font-style: normal;
    font-weight: 650;
  }
  .lupi-gallery-row-facts em.is-playable {
    color: #34d399;
    background: rgba(52,211,153,0.09);
  }
  .lupi-gallery-row-facts em.is-functional {
    border: 1px solid color-mix(in srgb, var(--group-color, #1edce0) 38%, transparent);
    background: color-mix(in srgb, var(--group-color, #1edce0) 12%, transparent);
    color: color-mix(in srgb, var(--group-color, #1edce0) 76%, white);
  }
  .lupi-gallery-row-open {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 58px;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.028)),
      rgba(2,6,23,0.42);
    color: rgba(226,232,240,0.72);
    font-size: 11px;
    font-weight: 760;
  }
  .lupi-gallery-scene-row:hover .lupi-gallery-row-open,
  .lupi-gallery-scene-row:focus-visible .lupi-gallery-row-open {
    background: var(--thread-color);
    color: #041112;
  }
  .lupi-gallery-row-progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    background: var(--thread-color);
  }
  .lupi-gallery-spotlight {
    position: sticky;
    top: 12px;
    overflow: hidden;
  }
  .lupi-gallery-spotlight-preview {
    position: relative;
    aspect-ratio: 1.16;
    overflow: hidden;
    background: #05070b;
  }
  .lupi-gallery-spotlight-preview img,
  .lupi-gallery-spotlight-fallback {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .lupi-gallery-spotlight-preview canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .lupi-gallery-spotlight-preview::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, transparent 54%, rgba(0,0,0,0.66));
  }
  .lupi-gallery-spotlight-badge {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 2;
    padding: 5px 9px;
    border-radius: 999px;
    background: rgba(4,7,11,0.72);
    color: #f8fafc;
    font-size: 11px;
    font-weight: 760;
  }
  .lupi-gallery-spotlight-loading {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    place-content: center;
    gap: 10px;
    background: rgba(3,5,10,0.78);
    color: #fff;
    font-size: 12px;
    font-weight: 720;
  }
  .lupi-gallery-spotlight-loading i {
    display: block;
    width: 180px;
    height: 4px;
    overflow: hidden;
    border-radius: 99px;
    background: rgba(255,255,255,0.14);
  }
  .lupi-gallery-spotlight-loading b {
    display: block;
    height: 100%;
    background: var(--thread-color, #1edce0);
  }
  .lupi-gallery-spotlight-body {
    display: grid;
    gap: 10px;
    padding: 15px;
  }
  .lupi-gallery-spotlight-kicker {
    color: color-mix(in srgb, var(--thread-color, #1edce0) 76%, white);
    font-size: 11px;
    font-weight: 780;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-spotlight h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 640;
    line-height: 1.12;
    text-wrap: balance;
  }
  .lupi-gallery-spotlight p {
    margin: 0;
    color: rgba(203,213,225,0.62);
    font-size: 13px;
    line-height: 1.5;
  }
  .lupi-gallery-spotlight-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .lupi-gallery-spotlight-facts span {
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.055);
    color: rgba(226,232,240,0.65);
    font-size: 11px;
    font-weight: 650;
  }
  .lupi-gallery-functional-note {
    display: grid;
    gap: 7px;
    padding-top: 2px;
  }
  .lupi-gallery-functional-note > span {
    color: rgba(226,232,240,0.54);
    font-size: 10px;
    font-weight: 780;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-functional-note article {
    display: grid;
    gap: 3px;
    padding: 9px 10px;
    border: 1px solid color-mix(in srgb, var(--group-color, #1edce0) 36%, transparent);
    border-radius: 8px;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--group-color, #1edce0) 13%, transparent), transparent 72%),
      rgba(255,255,255,0.035);
  }
  .lupi-gallery-functional-note strong {
    color: color-mix(in srgb, var(--group-color, #1edce0) 78%, white);
    font-size: 12px;
    font-weight: 760;
    letter-spacing: 0;
  }
  .lupi-gallery-functional-note p {
    font-size: 12px;
    line-height: 1.5;
    text-wrap: pretty;
  }
  .lupi-gallery-functional-note dl {
    display: grid;
    gap: 5px;
    margin: 2px 0 0;
  }
  .lupi-gallery-functional-note dl div {
    display: grid;
    gap: 1px;
  }
  .lupi-gallery-functional-note dt {
    color: color-mix(in srgb, var(--group-color, #1edce0) 62%, rgba(226,232,240,0.62));
    font-size: 9px;
    font-weight: 820;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-functional-note dd {
    margin: 0;
    color: rgba(226,232,240,0.68);
    font-size: 12px;
    line-height: 1.5;
    text-wrap: pretty;
  }
  .lupi-gallery-functional-check {
    display: grid;
    gap: 3px;
    margin-top: 2px;
    padding-left: 8px;
    border-left: 2px solid color-mix(in srgb, var(--group-color, #1edce0) 48%, transparent);
  }
  .lupi-gallery-functional-check span {
    color: rgba(226,232,240,0.52);
    font-size: 9px;
    font-weight: 820;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .lupi-gallery-functional-check p {
    color: rgba(226,232,240,0.7);
    font-size: 12px;
    line-height: 1.5;
  }
  .lupi-gallery-functional-note em {
    color: rgba(203,213,225,0.54);
    font-size: 11px;
    font-style: normal;
    line-height: 1.35;
  }
  .lupi-gallery-spotlight-open {
    min-height: 38px;
    border: 0;
    border-radius: 8px;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--thread-color, #1edce0) 92%, white), var(--thread-color, #1edce0));
    color: #031012;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 12px 28px color-mix(in srgb, var(--thread-color, #1edce0) 18%, transparent), inset 0 1px 0 rgba(255,255,255,0.28);
  }
  .lupi-gallery-spotlight-open:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .lupi-gallery-spotlight-empty {
    min-height: 360px;
    display: grid;
    place-items: center;
    color: rgba(226,232,240,0.46);
    font-size: 13px;
  }
  @media (max-width: 1180px) {
    .lupi-gallery-workbench {
      grid-template-columns: 230px minmax(0, 1fr);
    }
    .lupi-gallery-spotlight {
      grid-column: 1 / -1;
      position: static;
      display: grid;
      grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1fr);
    }
  }
  @media (max-width: 820px) {
    .lupi-gallery-fast {
      padding: 10px 10px 28px;
    }
    .lupi-gallery-workbench {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .lupi-gallery-rail {
      position: static;
    }
    .lupi-gallery-domain-menu {
      max-height: 190px;
      overflow: auto;
    }
    .lupi-gallery-index-head {
      display: grid;
    }
    .lupi-gallery-fast-stats {
      justify-content: flex-start;
    }
    .lupi-gallery-scene-row {
      grid-template-columns: 28px minmax(0, 1fr) auto;
      min-height: 74px;
    }
    .lupi-gallery-row-domain,
    .lupi-gallery-row-facts {
      display: none;
    }
    .lupi-gallery-row-open {
      min-width: 48px;
    }
    .lupi-gallery-spotlight {
      grid-template-columns: 1fr;
    }
  }
`;

// Off-screen but readable by assistive tech (aria-live status region).
const sVisuallyHidden: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// ─── Gallery ────────────────────────────────────────────────────────────

export function Gallery() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Domain | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All Sources');
  const [functionalGroupFilter, setFunctionalGroupFilter] = useState<FunctionalGroupId | 'All'>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(() => {
    const firstPlayable = EXAMPLES.find((ex) => ex.available && parseFrameCountLabel(ex.frames) > 1);
    return firstPlayable?.id ?? EXAMPLES[0]?.id ?? '';
  });
  // Keep the input responsive while the (potentially large) filtered grid
  // re-renders off the deferred value — avoids per-keystroke jank.
  const deferredSearch = useDeferredValue(search);

  // The ceiling is computed once at mount. It is a global browser-buffer
  // ceiling now; mobile keeps adaptive quality, not reduced access.
  const atomCeiling = useMemo(() => getDeviceProfile().maxAtoms, []);

  const filteredExamples = useMemo(() => {
    return EXAMPLES.filter(ex => {
      if (filter !== 'All' && ex.domain !== filter) return false;
      if (!matchesSourceFilter(ex, sourceFilter)) return false;
      if (!moleculeMatchesFunctionalGroup(ex.id, functionalGroupFilter)) return false;
      if (deferredSearch) {
        const s = deferredSearch.toLowerCase();
        const nomenclatureText = galleryNomenclatureTags(ex.id).join(' ').toLowerCase();
        return (
          ex.title.toLowerCase().includes(s) ||
          ex.subtitle.toLowerCase().includes(s) ||
          ex.domain.toLowerCase().includes(s) ||
          Object.values(ex.metadata ?? {}).join(' ').toLowerCase().includes(s) ||
          functionalGroupSearchText(ex.id).toLowerCase().includes(s) ||
          nomenclatureText.includes(s)
        );
      }
      return true;
    });
  }, [filter, sourceFilter, functionalGroupFilter, deferredSearch]);

  const galleryStats = useMemo(() => {
    const available = EXAMPLES.filter(ex => ex.available).length;
    const trajectories = EXAMPLES.filter(ex => parseFrameCountLabel(ex.frames) > 1).length;
    return {
      domains: ALL_DOMAINS.filter(domain => EXAMPLES.some(ex => ex.domain === domain)).length,
      available,
      trajectories,
      featured: EXAMPLES.filter(ex => ex.featured).length,
      organicMolecules: EXAMPLES.filter(ex => functionalGroupsForMolecule(ex.id).length > 0).length,
    };
  }, []);

  const functionalGroupSummaries = useMemo(() => {
    return FUNCTIONAL_GROUPS.map(group => ({
      group,
      count: EXAMPLES.filter(ex => group.exampleIds.includes(ex.id)).length,
    })).filter(summary => summary.count > 0);
  }, []);

  const activeFunctionalGroup = functionalGroupFilter === 'All'
    ? null
    : FUNCTIONAL_GROUP_BY_ID[functionalGroupFilter] ?? null;

  const domainSummaries = useMemo(() => {
    return ALL_DOMAINS
      .map(domain => {
        const examples = EXAMPLES.filter(ex => ex.domain === domain);
        return {
          domain,
          count: examples.length,
          trajectories: examples.filter(ex => parseFrameCountLabel(ex.frames) > 1).length,
          atoms: examples.reduce((total, ex) => total + parseAtomCountLabel(ex.atoms), 0),
        };
      })
      .filter(summary => summary.count > 0);
  }, []);

  const selectedExample = useMemo(() => {
    return filteredExamples.find((ex) => ex.id === selectedId)
      ?? filteredExamples[0]
      ?? null;
  }, [filteredExamples, selectedId]);

  const playableExamples = useMemo(() => {
    return EXAMPLES
      .filter((ex) => ex.available && parseFrameCountLabel(ex.frames) > 1)
      .slice(0, 8);
  }, []);

  useEffect(() => {
    if (selectedExample && selectedExample.id !== selectedId) {
      setSelectedId(selectedExample.id);
    }
  }, [selectedExample, selectedId]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilter('All');
    setSourceFilter('All Sources');
    setFunctionalGroupFilter('All');
  }, []);

  const handleLoad = useCallback(async (example: GalleryExample, isPopState = false) => {
    if (!example.available) return;

    // Global memory-ceiling gate. Device tier now only chooses quality;
    // it does not block access to larger molecules on small screens.
    const profile = getDeviceProfile();
    const estimatedAtoms = parseAtomCountLabel(example.atoms);
    if (estimatedAtoms > profile.maxAtoms) {
      useStore.getState().setError(
        `"${example.title}" has ~${formatAtomCount(estimatedAtoms)} atoms, ` +
        `over Lupi's current ${formatAtomCount(profile.maxAtoms)}-atom ` +
        `single-scene ceiling (${profile.reason}). ` +
        `Try a smaller frame or a chunked trajectory.`,
      );
      // Keep the URL in sync — if we were navigated here via ?sim=, drop
      // it so reloads don't re-trigger the same OOM-prone load.
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.get('sim') === example.id) {
          url.searchParams.delete('sim');
          window.history.replaceState({}, '', url);
        }
      }
      return;
    }

    if (!isPopState) {
      const url = new URL(window.location.href);
      url.searchParams.set('sim', example.id);
      window.history.pushState({}, '', url);
    }

    setLoadingId(example.id);
    useStore.getState().setLoading(true, 0);
    useStore.getState().setActiveCardId(example.id);

    // Clean up any existing streaming loader from a previous load
    if ((window as any).__atlasStreamingCleanup) {
      (window as any).__atlasStreamingCleanup();
      delete (window as any).__atlasStreamingCleanup;
    }

    try {
      // URL resolution: handles three cases
      // 1. Absolute URLs in file field (GCS, CDN) — use directly
      // 2. sourceUrl override (open-data repos) — prefer in production
      // 3. Relative local paths — prepend base URL
      const url = resolveExampleUrl(example);

      if (/\.json(?:$|\?)/i.test(url) || /\.json$/i.test(example.file)) {
        const resp = await fetch(url, { cache: 'reload' });
        if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
        const payload = await resp.json();
        const loaded = artifactToLoadedFile(payload, url);
        const store = useStore.getState();
        store.setFile({
          ...loaded,
          name: example.title,
        });
        store.setFrame(0);
        store.setColorScheme('element');
        store.setColorProperty(null);
        store.setCameraPreset('iso');
        store.setPlaybackSpeed(1);
        useStore.setState({
          atomScale: 1.35,
          showBonds: false,
          playing: Boolean(example.autoPlay),
        });
        setLoadingId(null);
        return;
      }

      // ── Streaming path for .glimbin files (GCS CDN) ──
      const { isGlimbinUrl } = await import('@atlas/parsers/StreamingLoader');
      if (isGlimbinUrl(url)) {
        const { StreamingLoader } = await import('@atlas/parsers/StreamingLoader');
        const loader = new StreamingLoader(url, {
          onProgress: (_phase, progress) => {
            useStore.getState().setLoading(true, progress * 0.6);
          },
          onTelemetry: (stats) => {
            useStore.getState().setStreamingTelemetry(stats);
          },
        });

        const header = await loader.fetchHeader();
        await loader.fetchIndex();
        const frame0 = await loader.fetchFrame(0);
        const meta = loader.getMetadata()!;

        // Build trajectory with frame 0 loaded; rest fetched on-demand
        const placeholderFrames = new Array(meta.totalFrames);
        placeholderFrames[0] = frame0;

        useStore.getState().setFile({
          name: example.title,
          size: meta.fileSize,
          trajectory: {
            frames: placeholderFrames,
            totalFrames: meta.totalFrames,
            atomTypes: meta.atomTypes,
            globalBounds: meta.globalBounds,
          },
          thermo: null,
          sourceUrl: url,
        });

        // On-demand frame fetching: subscribe to timeline scrubs
        const unsubFrameWatch = useStore.subscribe(
          (s) => s.frame,
          async (frameIndex) => {
            const currentFile = useStore.getState().file;
            if (!currentFile) return;
            if (currentFile.trajectory.frames[frameIndex]) return;
            try {
              const frame = await loader.fetchFrame(frameIndex);
              const file = useStore.getState().file;
              if (file) {
                file.trajectory.frames[frameIndex] = frame;
                useStore.setState({ file: { ...file } });
              }
              const isPlaying = useStore.getState().playing;
              loader.prefetch(frameIndex, isPlaying ? 1 : 0, isPlaying ? 8 : 3);
            } catch (err: any) {
              console.warn(`[streaming] Frame ${frameIndex} fetch failed:`, err.message);
            }
          }
        );

        // Stash cleanup for navigation
        (window as any).__atlasStreamingCleanup = () => {
          unsubFrameWatch();
          loader.dispose();
        };

        setLoadingId(null);
        return;
      }

      // ── Streaming dump parser for large .lammpstrj/.dump files ──
      const STREAMING_BYTES_THRESHOLD = 5 * 1024 * 1024;  // 5 MB
      const STREAMING_ATOM_THRESHOLD = 100_000;
      const looksDumpExt = /\.(lammpstrj|dump)$/i.test(example.file);
      let usedStreaming = false;

      if (looksDumpExt) {
        // Probe head with a Range request — much cheaper than pulling
        // the full file. Servers that ignore Range return the whole
        // file; we still only read the first 4 KB from the response.
        const probe = await fetch(url, { headers: { Range: 'bytes=0-4095' } });
        if (!probe.ok && probe.status !== 206) {
          throw new Error(`Failed to fetch: ${probe.status}`);
        }
        const probeBlob = await probe.blob();
        const head = await probeBlob.slice(0, 4096).text();
        // Total size: prefer Content-Range from the partial response,
        // fall back to Content-Length on the original probe (servers
        // that returned the full body), or to the blob size itself.
        const contentRange = probe.headers.get('content-range') ?? '';
        const totalMatch = contentRange.match(/\/(\d+)$/);
        const totalSize = totalMatch
          ? parseInt(totalMatch[1], 10)
          : (parseInt(probe.headers.get('content-length') ?? '0', 10) || probeBlob.size);

        const { canStreamDump } = await import('@atlas/parsers');
        const natomsMatch = head.match(/ITEM:\s*NUMBER OF ATOMS\s*\n\s*(\d+)/);
        const headerAtoms = natomsMatch ? parseInt(natomsMatch[1], 10) : 0;

        if (
          canStreamDump(head)
          && totalSize > STREAMING_BYTES_THRESHOLD
          && headerAtoms >= STREAMING_ATOM_THRESHOLD
        ) {
          if (headerAtoms > profile.maxAtoms) {
            useStore.getState().setError(
              `"${example.title}" has ${formatAtomCount(headerAtoms)} atoms, ` +
              `over Lupi's current ${formatAtomCount(profile.maxAtoms)}-atom ` +
              `single-scene ceiling. Try a smaller frame or a chunked trajectory.`,
            );
            return;
          }
          // Real streaming: full fetch, response.body consumed as a
          // ReadableStream. Atoms render while bytes are still arriving.
          const streamResp = await fetch(url);
          if (!streamResp.ok) throw new Error(`Failed to fetch: ${streamResp.status}`);
          const { parseDumpResponseStreaming } = await import('@atlas/parsers');
          const store = useStore.getState();
          for await (const event of parseDumpResponseStreaming(streamResp)) {
            if (event.type === 'header') {
              store.setFile({
                name: example.title,
                size: totalSize,
                trajectory: event.trajectory,
                thermo: null,
                sourceUrl: url,
              });
              // setFile defaulted loadedAtomCount to natoms (the
              // pre-allocated TypedArray length); reset to 0 so the
              // renderer doesn't flash uninitialized memory before
              // the first chunk lands. Both updates batch into one
              // render.
              store.setLoadedAtomCount(0);
            } else if (event.type === 'progress') {
              store.setLoadedAtomCount(event.loadedAtoms);
              // Yield to the renderer between chunks so atoms paint
              // and the page stays interactive.
              await new Promise<void>((r) => requestAnimationFrame(() => r()));
            } else if (event.type === 'complete') {
              store.setLoadedAtomCount(event.loadedAtoms);
            }
          }
          usedStreaming = true;
          return;
        }
      }

      if (!usedStreaming) {
        // WASM path. Same flow as before — used for small files,
        // non-dump formats, multi-frame, triclinic, or any dialect the
        // streaming parser declined.
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
        const blob = await resp.blob();
        const fileObj = new File([blob], example.file.split('/').pop() ?? 'file.dump');
        const { parseFile } = await import('@atlas/parsers');
        const result = await parseFile(fileObj);

        if (result.trajectory) {
          const actualAtoms = result.trajectory.frames[0]?.natoms ?? 0;
          if (actualAtoms > profile.maxAtoms) {
            useStore.getState().setError(
              `"${example.title}" parsed to ${formatAtomCount(actualAtoms)} atoms, ` +
              `over Lupi's current ${formatAtomCount(profile.maxAtoms)}-atom ` +
              `single-scene ceiling. Try a smaller frame or a chunked trajectory.`,
            );
            return;
          }
          const store = useStore.getState();
          store.setFile({
            name: example.title,
            size: blob.size,
            trajectory: result.trajectory,
            thermo: result.thermo ?? null,
            sourceUrl: url,
          });
          // setFile defaults curated scenes to element identity. Scenes whose
          // whole point is a per-atom field (the NIST benchmarks' error column)
          // declare `colorBy` and open in that read instead.
          if (example.colorBy && result.trajectory.frames[0]?.properties?.has(example.colorBy)) {
            store.setColorScheme('property');
            store.setColorProperty(example.colorBy);
          }
        }
      }
    } catch (err: any) {
      console.warn(`Gallery load failed for ${example.id}:`, err.message);
      useStore.getState().setError(
        `Could not load "${example.title}" — try dragging the file directly.`
      );
    } finally {
      setLoadingId(null);
    }
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const sim = params.get('sim');
      if (sim) {
        const ex = EXAMPLES.find(e => e.id === sim);
        if (ex && ex.available) handleLoad(ex, true);
      } else {
        useStore.getState().clearFile();
      }
    };
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [handleLoad]);

  return (
    <div className="lupi-gallery lupi-gallery-fast" data-testid="gallery">
      <style>{GALLERY_STUDIO_CSS}</style>
      <div aria-live="polite" role="status" style={sVisuallyHidden}>
        {loadingId
          ? `Loading ${EXAMPLES.find((e) => e.id === loadingId)?.title ?? 'simulation'}`
          : `${filteredExamples.length} simulation${filteredExamples.length === 1 ? '' : 's'} shown`}
      </div>

      <section className="lupi-gallery-workbench" aria-labelledby="lupi-gallery-title">
        <aside className="lupi-gallery-rail" aria-label="Gallery controls">
          <div className="lupi-gallery-rail-head">
            <div className="lupi-gallery-eyebrow">Lupi structure library</div>
            <h2 id="lupi-gallery-title">Scene Browser</h2>
            <p>Fast index, one preview, direct load into the viewer.</p>
          </div>

          <div className="lupi-gallery-search lupi-gallery-fast-search" role="search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search molecules or groups..."
              aria-label="Search simulations by title, description, method, potential, domain, or functional group"
              data-testid="gallery-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="lupi-gallery-clear"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="lupi-gallery-source-tabs" role="group" aria-label="Filter by source type">
            {SOURCE_FILTERS.map(option => (
              <button
                key={option}
                type="button"
                data-active={sourceFilter === option}
                aria-pressed={sourceFilter === option}
                onClick={() => setSourceFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="lupi-gallery-organic-map" aria-label="Organic chemistry functional groups">
            <h3>Organic groups</h3>
            <p>First-course functional groups mapped to real molecules.</p>
            <div className="lupi-gallery-functional-groups" role="group" aria-label="Filter by organic functional group">
              <button
                type="button"
                data-testid="gallery-group-all"
                data-active={functionalGroupFilter === 'All'}
                aria-pressed={functionalGroupFilter === 'All'}
                onClick={() => setFunctionalGroupFilter('All')}
                style={{ '--group-color': 'rgba(255,255,255,0.7)' } as React.CSSProperties}
              >
                <i aria-hidden="true" />
                All
                <em>{galleryStats.organicMolecules}</em>
              </button>
              {functionalGroupSummaries.map(({ group, count }) => (
                <button
                  key={group.id}
                  type="button"
                  data-testid={`gallery-group-${group.id}`}
                  data-active={functionalGroupFilter === group.id}
                  aria-pressed={functionalGroupFilter === group.id}
                  onClick={() => {
                    setFilter('All');
                    setFunctionalGroupFilter(group.id);
                  }}
                  style={{ '--group-color': group.color } as React.CSSProperties}
                >
                  <i aria-hidden="true" />
                  {group.label}
                  <em>{count}</em>
                </button>
              ))}
            </div>
            <FunctionalGroupStudyGuide
              group={activeFunctionalGroup}
              exampleTitles={
                activeFunctionalGroup
                  ? EXAMPLES
                    .filter(ex => activeFunctionalGroup.exampleIds.includes(ex.id))
                    .map(ex => ex.title)
                    .slice(0, 4)
                  : []
              }
            />
          </div>

          <div className="lupi-gallery-domain-menu" role="group" aria-label="Filter simulations by domain">
            <button
              type="button"
              className="lupi-gallery-domain-row"
              data-active={filter === 'All'}
              onClick={() => setFilter('All')}
              aria-pressed={filter === 'All'}
              data-testid="gallery-filter-all"
              style={{ '--domain-color': 'rgba(255,255,255,0.58)' } as React.CSSProperties}
            >
              <span className="lupi-gallery-domain-mark" style={{ background: 'rgba(255,255,255,0.58)' }} />
              <span>All domains</span>
              <strong>{EXAMPLES.length}</strong>
            </button>
            {domainSummaries.map(({ domain, count, trajectories }) => (
              <button
                key={domain}
                type="button"
                className="lupi-gallery-domain-row"
                data-active={filter === domain}
                onClick={() => setFilter(domain)}
                aria-pressed={filter === domain}
                style={{ '--domain-color': DOMAIN_COLORS[domain] } as React.CSSProperties}
              >
                <span className="lupi-gallery-domain-mark" style={{ background: DOMAIN_COLORS[domain] }} />
                <span>{domain}</span>
                <em>{trajectories}</em>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </aside>

        <main className="lupi-gallery-index" aria-labelledby="lupi-gallery-results-title">
          <div className="lupi-gallery-index-head">
            <div>
              <h3 id="lupi-gallery-results-title">Gallery Index</h3>
              <p>
                {filteredExamples.length} result{filteredExamples.length === 1 ? '' : 's'}
                {filter !== 'All' ? ` in ${filter}` : ''}
                {sourceFilter !== 'All Sources' ? ` / ${sourceFilter}` : ''}
                {activeFunctionalGroup ? ` / ${activeFunctionalGroup.label}` : ''}
              </p>
            </div>
            <div className="lupi-gallery-fast-stats" aria-label="Gallery summary">
              <span><strong>{galleryStats.available}</strong> loadable</span>
              <span><strong>{galleryStats.trajectories}</strong> playable</span>
              <span><strong>{galleryStats.organicMolecules}</strong> organic</span>
              <span><strong>{galleryStats.domains}</strong> domains</span>
            </div>
          </div>

          <div className="lupi-gallery-playlist" aria-label="Playable trajectory shortcuts">
            {playableExamples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                data-active={selectedExample?.id === ex.id}
                onClick={() => setSelectedId(ex.id)}
                onDoubleClick={() => handleLoad(ex, false)}
              >
                <span>{ex.title}</span>
                <strong>{ex.frames}</strong>
              </button>
            ))}
          </div>

          {filteredExamples.length === 0 ? (
            <div className="lupi-gallery-empty" data-testid="gallery-empty">
              <div className="lupi-gallery-empty-title">No molecules found</div>
              <p>
                {deferredSearch
                  ? <>Nothing matches "{deferredSearch}"{filter !== 'All' ? <> in {filter}</> : null}.</>
                  : <>No simulations match the active filters.</>}
              </p>
              <button
                type="button"
                data-testid="gallery-empty-reset"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="lupi-gallery-result-table" role="list">
            {filteredExamples.map((ex) => (
              <GallerySceneRow
                key={ex.id}
                example={ex}
                selected={selectedExample?.id === ex.id}
                loading={loadingId === ex.id}
                atomCeiling={atomCeiling}
                onPreview={() => setSelectedId(ex.id)}
                onOpen={() => handleLoad(ex, false)}
              />
            ))}
            </div>
          )}
        </main>

        <GallerySpotlight
          example={selectedExample}
          loading={selectedExample ? loadingId === selectedExample.id : false}
          onOpen={() => selectedExample && handleLoad(selectedExample, false)}
        />
      </section>
    </div>
  );
}

function FunctionalGroupStudyGuide({
  group,
  exampleTitles,
}: {
  group: FunctionalGroupConcept | null;
  exampleTitles: string[];
}) {
  if (!group) {
    return (
      <section className="lupi-gallery-study-guide" data-testid="gallery-group-study-guide">
        <div className="lupi-gallery-study-guide-head">
          <span>Study lens</span>
          <strong>Pattern first, name second</strong>
        </div>
        <p>
          A functional group is useful when it helps you predict shape, polarity, acid-base behavior,
          and the next likely reaction. Use the filters as a comparison set, then ask what changed.
        </p>
        <dl>
          <div>
            <dt>Recognize</dt>
            <dd>Find the atom pattern before memorizing the label.</dd>
          </div>
          <div>
            <dt>Compare</dt>
            <dd>Look at the nearest carbonyl, ring, heteroatom, or leaving group.</dd>
          </div>
          <div>
            <dt>Predict</dt>
            <dd>Decide whether the group acts as acid, base, nucleophile, electrophile, or leaving group.</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section
      className="lupi-gallery-study-guide"
      data-testid="gallery-group-study-guide"
      style={{ '--group-color': group.color } as React.CSSProperties}
    >
      <div className="lupi-gallery-study-guide-head">
        <span>{group.family}</span>
        <strong>{group.label}</strong>
      </div>
      <p>{group.short}</p>
      <dl>
        <div>
          <dt>Recognize</dt>
          <dd>{group.recognize}</dd>
        </div>
        <div>
          <dt>Reactivity</dt>
          <dd>{group.reactivity}</dd>
        </div>
        <div>
          <dt>Watch for</dt>
          <dd>{group.commonConfusion}</dd>
        </div>
      </dl>
      <div className="lupi-gallery-study-prompt">
        <span>Self-check</span>
        <p>{group.studyPrompt}</p>
      </div>
      {exampleTitles.length > 0 && (
        <div className="lupi-gallery-study-examples">
          <span>Compare here</span>
          <p>{exampleTitles.join(' / ')}</p>
        </div>
      )}
    </section>
  );
}

function GallerySceneRow({
  example,
  selected,
  loading,
  atomCeiling,
  onPreview,
  onOpen,
}: {
  example: GalleryExample;
  selected: boolean;
  loading: boolean;
  atomCeiling: number;
  onPreview: () => void;
  onOpen: () => void;
}) {
  const loadProgress = useStore((s) => (loading ? s.loadProgress : 0));
  const frameCount = parseFrameCountLabel(example.frames);
  const exceedsCap = parseAtomCountLabel(example.atoms) > atomCeiling;
  const disabled = loading || !example.available || exceedsCap;
  const pct = Math.round(Math.min(1, Math.max(0, loadProgress)) * 100);
  const threadColor = DOMAIN_THREAD[example.domain];
  const functionalGroups = functionalGroupsForMolecule(example.id);

  return (
    <button
      type="button"
      className="lupi-gallery-scene-row"
      data-selected={selected}
      data-playable={frameCount > 1}
      data-testid={`gallery-card-${example.id}`}
      disabled={disabled}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      onClick={onOpen}
      style={{ '--thread-color': threadColor, '--domain-color': DOMAIN_COLORS[example.domain] } as React.CSSProperties}
      aria-label={`${example.title} - ${example.domain}, ${example.atoms} atoms, ${frameCount > 1 ? `${example.frames} frames` : 'snapshot'}`}
    >
      <span className="lupi-gallery-row-swatch" aria-hidden="true">
        {example.colors.map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}
      </span>
      <span className="lupi-gallery-row-main">
        <strong>{example.title}</strong>
        <span>{example.subtitle}</span>
      </span>
      <span className="lupi-gallery-row-domain">{example.domain}</span>
      <span className="lupi-gallery-row-facts">
        <em>{example.atoms}</em>
        <em className={frameCount > 1 ? 'is-playable' : ''}>{frameCount > 1 ? `${example.frames} frames` : 'snapshot'}</em>
        {example.featured && <em>featured</em>}
        {functionalGroups.slice(0, 2).map(group => (
          <em
            key={group.id}
            className="is-functional"
            style={{ '--group-color': group.color } as React.CSSProperties}
          >
            {group.label}
          </em>
        ))}
      </span>
      <span className="lupi-gallery-row-open">
        {loading ? `${pct}%` : exceedsCap ? 'Over cap' : 'Open'}
      </span>
      {loading && <span className="lupi-gallery-row-progress" style={{ width: `${pct}%` }} />}
    </button>
  );
}

function GallerySpotlight({
  example,
  loading,
  onOpen,
}: {
  example: GalleryExample | null;
  loading: boolean;
  onOpen: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const loadProgress = useStore((s) => (loading ? s.loadProgress : 0));

  useEffect(() => {
    setImgError(false);
  }, [example?.id]);

  if (!example) {
    return (
      <aside className="lupi-gallery-spotlight" aria-label="Selected scene">
        <div className="lupi-gallery-spotlight-empty">Select a scene</div>
      </aside>
    );
  }

  const frameCount = parseFrameCountLabel(example.frames);
  const pct = Math.round(Math.min(1, Math.max(0, loadProgress)) * 100);
  const method = example.metadata?.method ?? example.metadata?.potential ?? example.domain;
  const functionalGroups = functionalGroupsForMolecule(example.id);

  return (
    <aside
      className="lupi-gallery-spotlight"
      aria-label={`Selected scene: ${example.title}`}
      style={{ '--thread-color': DOMAIN_THREAD[example.domain] } as React.CSSProperties}
    >
      <div className="lupi-gallery-spotlight-preview">
        {!imgError ? (
          <img
            src={gallerySnapshotUrl(example.id)}
            alt={example.title}
            loading="eager"
            onError={() => setImgError(true)}
          />
        ) : (
          // No snapshot: paint the domain gradient as a base, then overlay a
          // live atom render for scenes that qualify. This is the "focused
          // scene renders a large preview" promise — only the one selected
          // scene mounts a canvas, so it stays cheap.
          <>
            <div
              className="lupi-gallery-spotlight-fallback"
              style={{
                background:
                  `radial-gradient(circle at 24% 18%, ${example.colors[0]}55, transparent 32%), ` +
                  `radial-gradient(circle at 76% 28%, ${example.colors[1]}45, transparent 34%), ` +
                  `linear-gradient(135deg, #070a10, ${example.colors[2]}28)`,
              }}
            />
            {canUseLivePreview(example) && (
              <GalleryLivePreview example={example} active />
            )}
          </>
        )}
        <div className="lupi-gallery-spotlight-badge">
          {frameCount > 1 ? `${example.frames} frames` : 'snapshot'}
        </div>
        {loading && (
          <div className="lupi-gallery-spotlight-loading" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span>Loading {pct}%</span>
            <i><b style={{ width: `${pct}%` }} /></i>
          </div>
        )}
      </div>
      <div className="lupi-gallery-spotlight-body">
        <div className="lupi-gallery-spotlight-kicker">{example.domain}</div>
        <h3>{example.title}</h3>
        <p>{example.subtitle}</p>
        <div className="lupi-gallery-spotlight-facts">
          <span>{example.atoms} atoms</span>
          <span>{method}</span>
          {isOpenDataExample(example) && <span>open data</span>}
        </div>
        {functionalGroups.length > 0 && (
          <div className="lupi-gallery-functional-note">
            <span>Functional groups</span>
            {functionalGroups.slice(0, 4).map(group => (
              <article
                key={group.id}
                style={{ '--group-color': group.color } as React.CSSProperties}
              >
                <strong>{group.label}</strong>
                <p>{group.short}</p>
                <dl>
                  <div>
                    <dt>Recognize</dt>
                    <dd>{group.recognize}</dd>
                  </div>
                  <div>
                    <dt>Reactivity</dt>
                    <dd>{group.reactivity}</dd>
                  </div>
                </dl>
                <div className="lupi-gallery-functional-check">
                  <span>Check</span>
                  <p>{group.studyPrompt}</p>
                </div>
                <em>{group.firstCourse}</em>
              </article>
            ))}
          </div>
        )}
        <button
          type="button"
          className="lupi-gallery-spotlight-open"
          onClick={onOpen}
          disabled={loading || !example.available}
        >
          {loading ? 'Loading' : 'Open in viewer'}
        </button>
      </div>
    </aside>
  );
}

// ─── Live preview (spotlight fallback) ──────────────────────────────────

function GalleryLivePreview({
  example,
  active,
}: {
  example: GalleryExample;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [atoms, setAtoms] = useState<PreviewAtom[] | null>(null);
  const [failed, setFailed] = useState(false);
  const seed = useMemo(() => seededOffset(example.id), [example.id]);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setAtoms(null);

    if (!canUseLivePreview(example)) return () => { cancelled = true; };

    fetch(resolveExampleUrl(example))
      .then((response) => {
        if (!response.ok) throw new Error(`Preview fetch failed: ${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parsePreviewXyz(text);
        if (parsed.length < 2) {
          setFailed(true);
          return;
        }
        setAtoms(parsed);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [example]);

  const normalizedAtoms = useMemo(
    () => (atoms ? normalizePreviewAtoms(atoms) : []),
    [atoms],
  );
  const bonds = useMemo(
    () => (atoms ? detectPreviewBonds(atoms) : []),
    [atoms],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || failed || normalizedAtoms.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let lastDraw = 0;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const colors = example.colors.length ? example.colors : ['#1edce0', '#7dd3fc', '#f8fafc'];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width: rect.width, height: rect.height };
    };

    const draw = (now: number) => {
      const { width, height } = resize();
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createRadialGradient(
        width * 0.48,
        height * 0.40,
        0,
        width * 0.52,
        height * 0.52,
        Math.max(width, height) * 0.72,
      );
      bg.addColorStop(0, `${colors[0]}26`);
      bg.addColorStop(0.42, '#080a10');
      bg.addColorStop(1, '#020307');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const angleY = seed * 0.01 + now * (active ? 0.00048 : 0.00022);
      const angleX = 0.36 + Math.sin(seed + now * 0.00018) * 0.12;
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const scale = Math.min(width, height) * 0.72;

      const projected: ProjectedAtom[] = normalizedAtoms.map((atom, index) => {
        const yRotX = atom.x * cosY + atom.z * sinY;
        const yRotZ = -atom.x * sinY + atom.z * cosY;
        const xRotY = atom.y * cosX - yRotZ * sinX;
        const xRotZ = atom.y * sinX + yRotZ * cosX;
        const depthBoost = 0.78 + (xRotZ + 0.5) * 0.36;
        const color = CPK_COLORS[atom.element] || colors[index % colors.length] || '#cbd5e1';
        return {
          ...atom,
          color,
          radius: PREVIEW_RADII[atom.element] ?? 0.72,
          screenX: width / 2 + yRotX * scale,
          screenY: height / 2 + xRotY * scale,
          depth: xRotZ * depthBoost,
        };
      });

      ctx.lineCap = 'round';
      for (const [i, j] of bonds) {
        const a = projected[i];
        const b = projected[j];
        if (!a || !b) continue;
        const depth = Math.max(0.25, Math.min(1.1, (a.depth + b.depth + 1.2) / 2));
        ctx.beginPath();
        ctx.moveTo(a.screenX, a.screenY);
        ctx.lineTo(b.screenX, b.screenY);
        ctx.strokeStyle = `rgba(226,232,240,${0.10 + depth * 0.18})`;
        ctx.lineWidth = Math.max(0.65, 1.25 * depth);
        ctx.stroke();
      }

      projected
        .sort((a, b) => a.depth - b.depth)
        .forEach((atom) => {
          const depth = Math.max(0.35, Math.min(1.35, atom.depth + 0.88));
          const radius = Math.max(2.3, atom.radius * 5.8 * depth);
          const glow = ctx.createRadialGradient(
            atom.screenX,
            atom.screenY,
            0,
            atom.screenX,
            atom.screenY,
            radius * 3.1,
          );
          glow.addColorStop(0, `${atom.color}40`);
          glow.addColorStop(1, `${atom.color}00`);
          ctx.fillStyle = glow;
          ctx.fillRect(atom.screenX - radius * 3.1, atom.screenY - radius * 3.1, radius * 6.2, radius * 6.2);

          const atomFill = ctx.createRadialGradient(
            atom.screenX - radius * 0.32,
            atom.screenY - radius * 0.42,
            radius * 0.2,
            atom.screenX,
            atom.screenY,
            radius,
          );
          atomFill.addColorStop(0, '#ffffff');
          atomFill.addColorStop(0.24, atom.color);
          atomFill.addColorStop(1, '#10131a');
          ctx.beginPath();
          ctx.arc(atom.screenX, atom.screenY, radius, 0, Math.PI * 2);
          ctx.fillStyle = atomFill;
          ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${0.10 + depth * 0.08})`;
          ctx.lineWidth = 0.65;
          ctx.stroke();
        });
    };

    const loop = (now: number) => {
      const targetInterval = active ? 16 : 44;
      if (!lastDraw || now - lastDraw >= targetInterval) {
        draw(now);
        lastDraw = now;
      }
      if (!reducedMotion) frame = window.requestAnimationFrame(loop);
    };

    if (reducedMotion) {
      draw(seed);
      return undefined;
    }

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [active, bonds, example.colors, failed, normalizedAtoms, seed]);

  if (failed || normalizedAtoms.length < 2) return null;

  return (
    <canvas
      ref={canvasRef}
      className="lupi-gallery-live-preview"
      aria-hidden="true"
    />
  );
}
