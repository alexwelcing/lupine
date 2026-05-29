/**
 * Gallery — curated simulation showcase.
 *
 * Each card shows a real rendered snapshot, with a procedural canvas
 * fallback if the snapshot is missing. Clicking loads the trajectory
 * into the viewer.
 */

import { useCallback, useRef, useEffect, useState, useMemo, useDeferredValue } from 'react';
import { useStore } from './store';
import galleryData from './gallery-data.json';
import {
  getDeviceProfile,
  parseAtomCountLabel,
  formatAtomCount,
} from './deviceCapabilities';

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
  | 'Advanced Theory & Validation';

interface GalleryExample {
  id: string;
  title: string;
  subtitle: string;
  domain: Domain;
  atoms: string;
  frames: string;
  isTrajectory?: boolean;
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
  'Advanced Theory & Validation': '#b8a4c8',
};

const ALL_DOMAINS = Object.keys(DOMAIN_COLORS) as Domain[];

type ViewMode = 'grid' | 'list';
type SourceFilter = 'All Sources' | 'Featured' | 'Trajectories' | 'Snapshots' | 'Open Data';

const SOURCE_FILTERS: SourceFilter[] = ['All Sources', 'Featured', 'Trajectories', 'Snapshots', 'Open Data'];

const DOMAIN_DETAILS: Record<Domain, { description: string; icon: string }> = {
  'Metals & Alloys': {
    description: 'Crystals, high-entropy alloys, dislocations, and deformation scenes.',
    icon: 'M',
  },
  'Ceramics & Oxides': {
    description: 'Ionic lattices, perovskites, oxide defects, and phase stability examples.',
    icon: 'O',
  },
  'Polymers & Soft Matter': {
    description: 'Chains, networks, amorphous matter, and mesoscale morphology.',
    icon: 'P',
  },
  Nanomaterials: {
    description: 'Low-dimensional systems, molecular assemblies, and nanoscale surfaces.',
    icon: 'N',
  },
  Biomolecules: {
    description: 'Organic and biological structures with atomistic inspection hooks.',
    icon: 'B',
  },
  'Energy Materials': {
    description: 'Battery, catalyst, transport, and conversion material examples.',
    icon: 'E',
  },
  'Defects & Mechanics': {
    description: 'Stress, slip, fracture, voids, and local neighborhood changes.',
    icon: 'D',
  },
  Methods: {
    description: 'Benchmarks, synthetic tests, and renderer/parser validation scenes.',
    icon: 'T',
  },
  'Fluids & Solvents': {
    description: 'Liquids, interfaces, and finite-temperature molecular motion.',
    icon: 'F',
  },
  'Advanced Theory & Validation': {
    description: 'Potential comparisons, error fields, and research-grade proof scenes.',
    icon: 'A',
  },
};

function publicAssetUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
}

function gallerySnapshotUrl(id: string): string {
  return publicAssetUrl(`gallery/snapshots/${id}.jpg`);
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
  if (sourceFilter === 'Trajectories') return parseInt(example.frames, 10) > 1;
  if (sourceFilter === 'Snapshots') return parseInt(example.frames, 10) <= 1;
  return isOpenDataExample(example);
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
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .lupi-gallery-title {
    margin: 0;
    font-size: clamp(34px, 5vw, 58px);
    font-weight: 300;
    line-height: 0.96;
    letter-spacing: 0;
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
    transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
  }
  .lupi-gallery-domain-card:hover,
  .lupi-gallery-domain-card[data-active="true"] {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--domain-color, #1edce0) 58%, transparent);
    background: color-mix(in srgb, var(--domain-color, #1edce0) 10%, rgba(255,255,255,0.035));
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
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
  }
  .lupi-gallery-card:hover,
  .lupi-gallery-card[data-hovered="true"] {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--thread-color) 58%, transparent);
    box-shadow: 0 18px 44px rgba(0,0,0,0.36), 0 0 24px color-mix(in srgb, var(--thread-color) 16%, transparent);
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
    letter-spacing: 0.08em;
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
      border-radius: 12px;
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
`;

// ─── Shared styles ──────────────────────────────────────────────────────

const sQuilt: React.CSSProperties = {
  width: '100%',
  maxWidth: 1400,
  margin: '0 auto',
  padding: '0 24px 40px',
};

const sHeader: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 24,
  padding: '20px 0',
  borderBottom: '2px dashed rgba(255,255,255,0.08)',
};

const sHeaderTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

const sHeaderIcon: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1.5px dashed rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.7)',
  flexShrink: 0,
};

const sHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  color: '#f8fafc',
  letterSpacing: '-0.02em',
};

const sSub: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 13,
  color: 'rgba(255,255,255,0.4)',
};

const sSearch: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.03)',
  border: '1.5px dashed rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  minWidth: 240,
  transition: 'border-color 0.2s, background 0.2s',
};

const sSearchInput: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#f8fafc',
  fontSize: 14,
  flex: 1,
  fontFamily: 'inherit',
};

const sRibbon: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 6,
  marginBottom: 28,
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.015)',
  borderRadius: 10,
  border: '1.5px dashed rgba(255,255,255,0.06)',
};

const sRibbonTab = (active: boolean, threadColor: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: active ? 600 : 500,
  color: active ? '#f8fafc' : 'rgba(255,255,255,0.45)',
  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
  border: active ? `1.5px dashed ${threadColor}` : '1.5px dashed transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  userSelect: 'none',
});

const sRibbonDot: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  flexShrink: 0,
};

const sRibbonCount: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 5px',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 500,
};

const sSection: React.CSSProperties = {
  marginBottom: 32,
};

const sSectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 16,
  paddingBottom: 10,
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const sSectionThread = (color: string): React.CSSProperties => ({
  width: 3,
  height: 20,
  borderRadius: 2,
  background: color,
  flexShrink: 0,
});

const sSectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#f8fafc',
};

const sSectionCount: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: 12,
  color: 'rgba(255,255,255,0.35)',
};

const sSectionMore: React.CSSProperties = {
  marginLeft: 8,
  fontSize: 12,
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: '2px 8px',
  borderRadius: 4,
  transition: 'color 0.2s, background 0.2s',
};

const sGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 16,
};

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

const sEmpty: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '64px 24px',
  textAlign: 'center',
  border: '1px dashed rgba(255,255,255,0.12)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.015)',
};

const sEmptyTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#f1f5f9',
};

const sEmptySub: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.5)',
  margin: 0,
  maxWidth: 420,
};

const sEmptyReset: React.CSSProperties = {
  marginTop: 6,
  padding: '7px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: '#e2e8f0',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  cursor: 'pointer',
};

const sProgressTrack: React.CSSProperties = {
  width: '70%',
  height: 4,
  marginTop: 12,
  borderRadius: 2,
  background: 'rgba(255,255,255,0.12)',
  overflow: 'hidden',
};

const sPatch = (hovered: boolean, unavailable: boolean, threadColor: string): React.CSSProperties => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column' as const,
  textAlign: 'left' as const,
  background: 'rgba(255,255,255,0.02)',
  borderRadius: 12,
  overflow: 'hidden',
  cursor: unavailable ? 'not-allowed' : 'pointer',
  opacity: unavailable ? 0.4 : 1,
  transition: 'transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s ease',
  transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
  boxShadow: hovered
    ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${threadColor}30, inset 0 1px 0 ${threadColor}15`
    : '0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)',
  border: 'none',
  padding: 0,
  width: '100%',
});

const sPatchBorder = (threadColor: string): React.CSSProperties => ({
  position: 'absolute' as const,
  inset: 3,
  borderRadius: 9,
  border: `1.5px dashed ${threadColor}25`,
  pointerEvents: 'none',
  zIndex: 2,
});

const sPatchThumb: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 160,
  overflow: 'hidden',
  background: '#0c0c10',
};

const sPatchImg: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  transition: 'opacity 0.3s ease',
};

const sPatchCanvas: React.CSSProperties = {
  position: 'absolute' as const,
  inset: 0,
  width: '100%',
  height: '100%',
};

const sPatchBody: React.CSSProperties = {
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 6,
  flex: 1,
};

const sPatchBadge: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  fontWeight: 500,
};

const sPatchDot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
};

const sPatchSoon: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: 9,
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};

const sPatchTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#f8fafc',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

const sPatchSubtitle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: 'rgba(255,255,255,0.35)',
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical' as const,
};

const sPatchTags: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 5,
  marginTop: 4,
};

const sPatchTag: React.CSSProperties = {
  fontSize: 10,
  padding: '3px 8px',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.04)',
  border: '1px dashed rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 500,
};

const sPatchMeta: React.CSSProperties = {
  marginTop: 6,
  paddingTop: 8,
  borderTop: '1px dashed rgba(255,255,255,0.06)',
  fontSize: 10,
  color: 'rgba(255,255,255,0.3)',
  lineHeight: 1.6,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 2,
};

const sPatchLoading: React.CSSProperties = {
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  background: 'rgba(12,12,16,0.85)',
  backdropFilter: 'blur(4px)',
  zIndex: 10,
  color: 'rgba(255,255,255,0.7)',
  fontSize: 12,
  fontWeight: 500,
};

// ─── Gallery ────────────────────────────────────────────────────────────

export function Gallery() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Domain | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All Sources');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
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
      if (deferredSearch) {
        const s = deferredSearch.toLowerCase();
        return (
          ex.title.toLowerCase().includes(s) ||
          ex.subtitle.toLowerCase().includes(s) ||
          ex.domain.toLowerCase().includes(s) ||
          (ex.metadata?.method ?? '').toLowerCase().includes(s) ||
          (ex.metadata?.potential ?? '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [filter, sourceFilter, deferredSearch]);

  const galleryStats = useMemo(() => {
    const available = EXAMPLES.filter(ex => ex.available).length;
    const trajectories = EXAMPLES.filter(ex => parseInt(ex.frames, 10) > 1).length;
    return {
      domains: ALL_DOMAINS.filter(domain => EXAMPLES.some(ex => ex.domain === domain)).length,
      available,
      trajectories,
      featured: EXAMPLES.filter(ex => ex.featured).length,
    };
  }, []);

  const domainSummaries = useMemo(() => {
    return ALL_DOMAINS
      .map(domain => {
        const examples = EXAMPLES.filter(ex => ex.domain === domain);
        return {
          domain,
          count: examples.length,
          trajectories: examples.filter(ex => parseInt(ex.frames, 10) > 1).length,
          atoms: examples.reduce((total, ex) => total + parseAtomCountLabel(ex.atoms), 0),
        };
      })
      .filter(summary => summary.count > 0);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilter('All');
    setSourceFilter('All Sources');
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

      if (example.id === 'lupine_brand_asset') {
        const scientificUrl = publicAssetUrl('gallery/curated/lupine_bluebonnet.xyz');
        const resp = await fetch(scientificUrl);
        const blob = await resp.blob();
        const fileObj = new File([blob], 'lupine_bluebonnet.xyz');
        const { parseFile } = await import('@atlas/parsers');
        const parseResult = await parseFile(fileObj);
        if (!parseResult.trajectory) throw new Error('No trajectory found in scientific prefab');
        const scientificFrame = parseResult.trajectory.frames[0];
        const { generateLupineFrame } = await import('@atlas/core');
        const frame = generateLupineFrame(scientificFrame);

        useStore.getState().setFile({
          name: example.title,
          size: 1024,
          trajectory: {
            frames: [frame],
            totalFrames: 1,
            atomTypes: parseResult.trajectory.atomTypes,
            globalBounds: {
              min: [frame.boxBounds[0], frame.boxBounds[2], frame.boxBounds[4]] as any,
              max: [frame.boxBounds[1], frame.boxBounds[3], frame.boxBounds[5]] as any,
            },
          },
          thermo: null,
          sourceUrl: 'procedural',
        });
        useStore.getState().setRenderStyle('botanical');
        useStore.getState().setAtomScale(1.4);
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
          useStore.getState().setFile({
            name: example.title,
            size: blob.size,
            trajectory: result.trajectory,
            thermo: result.thermo ?? null,
            sourceUrl: url,
          });
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
    <div className="lupi-gallery" data-testid="gallery">
      <style>{GALLERY_STUDIO_CSS}</style>
      <div aria-live="polite" role="status" style={sVisuallyHidden}>
        {loadingId
          ? `Loading ${EXAMPLES.find((e) => e.id === loadingId)?.title ?? 'simulation'}`
          : `${filteredExamples.length} simulation${filteredExamples.length === 1 ? '' : 's'} shown`}
      </div>

      <section className="lupi-gallery-hero" aria-labelledby="lupi-gallery-title">
        <div>
          <div className="lupi-gallery-eyebrow">Lupi structure library</div>
          <h2 id="lupi-gallery-title" className="lupi-gallery-title">Molecule Gallery</h2>
        </div>
        <p className="lupi-gallery-copy">
          Explore curated molecular structures and simulation domains, from simple reference
          systems to research-grade trajectories, all loading into the real viewer.
        </p>
        <div className="lupi-gallery-stats" aria-label="Gallery summary">
          <div className="lupi-gallery-stat">
            <span className="lupi-gallery-stat-value">{galleryStats.domains}</span>
            <span className="lupi-gallery-stat-label">Domains</span>
          </div>
          <div className="lupi-gallery-stat">
            <span className="lupi-gallery-stat-value">{galleryStats.available}</span>
            <span className="lupi-gallery-stat-label">Loadable scenes</span>
          </div>
          <div className="lupi-gallery-stat">
            <span className="lupi-gallery-stat-value">{galleryStats.trajectories}</span>
            <span className="lupi-gallery-stat-label">Trajectories</span>
          </div>
          <div className="lupi-gallery-stat">
            <span className="lupi-gallery-stat-value">{galleryStats.featured}</span>
            <span className="lupi-gallery-stat-label">Featured</span>
          </div>
        </div>
      </section>

      <section className="lupi-gallery-controls" aria-label="Search and filter gallery">
        <div className="lupi-gallery-controls-inner">
          <div className="lupi-gallery-search" role="search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search by structure, domain, method, or potential..."
              aria-label="Search simulations by title, description, method, potential, or domain"
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

          <div className="lupi-gallery-filter-row">
            <div className="lupi-gallery-chips" role="group" aria-label="Filter simulations by domain">
              <button
                type="button"
                className="lupi-gallery-chip"
                data-active={filter === 'All'}
                style={{ '--chip-color': 'rgba(255,255,255,0.55)' } as React.CSSProperties}
                onClick={() => setFilter('All')}
                aria-pressed={filter === 'All'}
                data-testid="gallery-filter-all"
              >
                All <span className="lupi-gallery-chip-count">{EXAMPLES.length}</span>
              </button>
              {domainSummaries.map(({ domain, count }) => (
                <button
                  key={domain}
                  type="button"
                  className="lupi-gallery-chip"
                  data-active={filter === domain}
                  style={{ '--chip-color': DOMAIN_THREAD[domain] } as React.CSSProperties}
                  onClick={() => setFilter(domain)}
                  aria-pressed={filter === domain}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOMAIN_COLORS[domain], flexShrink: 0 }} />
                  {domain}
                  <span className="lupi-gallery-chip-count">{count}</span>
                </button>
              ))}
            </div>

            <div className="lupi-gallery-actions">
              <select
                className="lupi-gallery-select"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
                aria-label="Filter by source type"
              >
                {SOURCE_FILTERS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <div className="lupi-gallery-view-toggle" role="group" aria-label="Switch gallery view">
                <button
                  type="button"
                  data-active={viewMode === 'grid'}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                  onClick={() => setViewMode('grid')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="4" y="4" width="6" height="6" rx="1" />
                    <rect x="14" y="4" width="6" height="6" rx="1" />
                    <rect x="4" y="14" width="6" height="6" rx="1" />
                    <rect x="14" y="14" width="6" height="6" rx="1" />
                  </svg>
                </button>
                <button
                  type="button"
                  data-active={viewMode === 'list'}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                  onClick={() => setViewMode('list')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M8 6h12M8 12h12M8 18h12" />
                    <path d="M4 6h.01M4 12h.01M4 18h.01" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="simulation-domains">
        <h3 id="simulation-domains" className="lupi-gallery-section-title">Simulation Domains</h3>
        <div className="lupi-gallery-domain-grid">
          {domainSummaries.map(summary => (
            <DomainCard
              key={summary.domain}
              summary={summary}
              active={filter === summary.domain}
              onClick={() => setFilter(summary.domain)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="popular-structures">
        <div className="lupi-gallery-results-head">
          <div>
            <h3 id="popular-structures" className="lupi-gallery-section-title" style={{ marginBottom: 0 }}>Popular Structures</h3>
            <p>
              {filteredExamples.length} result{filteredExamples.length === 1 ? '' : 's'}
              {filter !== 'All' ? ` in ${filter}` : ''}
              {sourceFilter !== 'All Sources' ? ` / ${sourceFilter}` : ''}
            </p>
          </div>
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
          <div className={viewMode === 'grid' ? 'lupi-gallery-results-grid' : 'lupi-gallery-results-list'}>
            {filteredExamples.map((ex) => (
              <PatchCard
                key={ex.id}
                example={ex}
                hovered={hoveredId === ex.id}
                loading={loadingId === ex.id}
                atomCeiling={atomCeiling}
                viewMode={viewMode}
                onHover={() => setHoveredId(ex.id)}
                onLeave={() => setHoveredId(null)}
                onClick={() => handleLoad(ex, false)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DomainCard({
  summary,
  active,
  onClick,
}: {
  summary: { domain: Domain; count: number; trajectories: number; atoms: number };
  active: boolean;
  onClick: () => void;
}) {
  const details = DOMAIN_DETAILS[summary.domain];
  return (
    <button
      type="button"
      className="lupi-gallery-domain-card"
      data-active={active}
      style={{ '--domain-color': DOMAIN_THREAD[summary.domain] } as React.CSSProperties}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className="lupi-gallery-domain-top">
        <div className="lupi-gallery-domain-icon">{details.icon}</div>
        <span className="lupi-gallery-domain-count">{summary.count} structures</span>
      </div>
      <h3>{summary.domain}</h3>
      <p>{details.description}</p>
      <div className="lupi-gallery-tags" style={{ marginTop: 12 }}>
        <span className="lupi-gallery-tag">{summary.trajectories} trajectories</span>
        <span className="lupi-gallery-tag">{formatAtomCount(summary.atoms)} atoms</span>
      </div>
    </button>
  );
}

// ─── Patch Card ─────────────────────────────────────────────────────────

function PatchCard({
  example,
  hovered,
  loading,
  atomCeiling,
  viewMode,
  onHover,
  onLeave,
  onClick,
}: {
  example: GalleryExample;
  hovered: boolean;
  loading: boolean;
  /** Global single-scene atom ceiling. Device tier no longer reduces access. */
  atomCeiling: number;
  viewMode: ViewMode;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const exceedsCap = parseAtomCountLabel(example.atoms) > atomCeiling;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgError, setImgError] = useState(false);
  // Only the loading card subscribes to progress — others ignore it.
  const loadProgress = useStore((s) => (loading ? s.loadProgress : 0));
  const pct = Math.round(Math.min(1, Math.max(0, loadProgress)) * 100);
  const domainColor = DOMAIN_COLORS[example.domain];
  const threadColor = DOMAIN_THREAD[example.domain];

  const snapshotUrl = gallerySnapshotUrl(example.id);

  // Procedural fallback thumbnail
  useEffect(() => {
    if (!imgError) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const c1 = example.colors[0] || '#444';
    const c2 = example.colors[1] || c1;
    const c3 = example.colors[2] || c1;

    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const seed = example.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = (i: number) => {
      const x = Math.sin(seed * 9301 + i * 49297) * 49297;
      return x - Math.floor(x);
    };

    const nParticles = 40 + Math.floor(rng(0) * 30);
    for (let i = 0; i < nParticles; i++) {
      const px = rng(i * 3 + 1) * w;
      const py = rng(i * 3 + 2) * h;
      const r = 2 + rng(i * 3 + 3) * 4;
      const colors = [c1, c2, c3];
      const col = colors[Math.floor(rng(i * 7) * 3)];

      const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
      glow.addColorStop(0, col + '35');
      glow.addColorStop(1, col + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }

    ctx.strokeStyle = c1 + '18';
    ctx.lineWidth = 1;
    const pts: [number, number][] = [];
    for (let i = 0; i < Math.min(nParticles, 24); i++) {
      pts.push([rng(i * 3 + 1) * w, rng(i * 3 + 2) * h]);
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0];
        const dy = pts[i][1] - pts[j][1];
        if (dx * dx + dy * dy < 2500) {
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
    }
  }, [example, imgError]);

  const disabledReason = !example.available
    ? 'coming soon'
    : exceedsCap
      ? `${example.atoms} atoms exceeds Lupi's current single-scene ceiling`
      : null;

  return (
    <button
      type="button"
      className={`lupi-gallery-card ${viewMode === 'list' ? 'lupi-gallery-card-list' : ''}`}
      data-hovered={hovered}
      style={{ '--thread-color': threadColor, '--domain-color': domainColor } as React.CSSProperties}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={(e) => { onHover(); e.currentTarget.style.outline = `2px solid ${threadColor}`; e.currentTarget.style.outlineOffset = '2px'; }}
      onBlur={(e) => { onLeave(); e.currentTarget.style.outline = 'none'; }}
      disabled={loading || !example.available || exceedsCap}
      data-testid={`gallery-card-${example.id}`}
      aria-label={
        `${example.title} — ${example.domain}, ${example.atoms} atoms` +
        (disabledReason ? ` (${disabledReason})` : '')
      }
      aria-disabled={loading || !example.available || exceedsCap}
      title={exceedsCap
        ? `~${example.atoms} atoms exceeds Lupi's current single-scene ceiling`
        : undefined}
    >
      <div className="lupi-gallery-thumb">
        {!imgError && (
          <img
            src={snapshotUrl}
            alt={example.title}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {(imgError || !example.available) && (
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
          />
        )}
      </div>

      <div className="lupi-gallery-card-body">
        <div className="lupi-gallery-card-kicker">
          <span className="lupi-gallery-card-dot" />
          {example.domain}
          {!example.available && <span className="lupi-gallery-tag">Soon</span>}
          {example.available && exceedsCap && (
            <span className="lupi-gallery-tag">Over cap</span>
          )}
        </div>

        <h4>{example.title}</h4>
        <p>{example.subtitle}</p>

        <div className="lupi-gallery-tags">
          <span className="lupi-gallery-tag">{example.atoms} atoms</span>
          <span className={`lupi-gallery-tag ${parseInt(example.frames, 10) > 1 ? 'lupi-gallery-tag-live' : ''}`}>
            {parseInt(example.frames) > 1 ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 4px #34d399' }} />
                {example.frames} frames
              </>
            ) : (
              'Snapshot'
            )}
          </span>
          {example.featured && <span className="lupi-gallery-tag">Featured</span>}
          {isOpenDataExample(example) && <span className="lupi-gallery-tag">Open data</span>}
        </div>

        {(viewMode === 'list' || hovered) && example.metadata && (
          <div className="lupi-gallery-meta">
            {example.metadata.potential && (
              <div>Potential: {example.metadata.potential}</div>
            )}
            {example.metadata.temperature && (
              <div>Temp: {example.metadata.temperature}</div>
            )}
            {example.metadata.method && (
              <div>Method: {example.metadata.method}</div>
            )}
          </div>
        )}
      </div>

      <span className="lupi-gallery-card-action" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7" />
          <path d="M9 7h8v8" />
        </svg>
      </span>

      {loading && (
        <div
          className="lupi-gallery-loading"
          data-testid={`gallery-card-loading-${example.id}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`Loading ${example.title}`}
        >
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="12"
              fill="none"
              stroke={threadColor}
              strokeWidth="2"
              strokeDasharray="60 20"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 16 16"
                to="360 16 16"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          <span>{pct > 0 ? `Loading ${pct}%` : 'Loading...'}</span>
          <div className="lupi-gallery-progress">
            <span style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}
