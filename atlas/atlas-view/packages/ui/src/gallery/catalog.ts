import galleryData from '../gallery-data.json';

export type Domain =
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

export interface GalleryExample {
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
  /** Optional initial atom scale for this gallery entry. Overrides setFile defaults. */
  initialAtomScale?: number;
  /** Optional initial background preset for this gallery entry. */
  initialBackgroundPreset?: string;
}

export const EXAMPLES: GalleryExample[] = galleryData as GalleryExample[];

export const DOMAIN_COLORS: Record<Domain, string> = {
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

export const DOMAIN_THREAD: Record<Domain, string> = {
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

export const ALL_DOMAINS = Object.keys(DOMAIN_COLORS) as Domain[];

export type SourceFilter = 'All Sources' | 'Featured' | 'Trajectories' | 'Snapshots' | 'Open Data';

export const SOURCE_FILTERS: SourceFilter[] = ['All Sources', 'Featured', 'Trajectories', 'Snapshots', 'Open Data'];

const GENERATED_SNAPSHOT_URLS: Record<string, string> = {
  lupi_live_qr_atomized: 'generated/atomized/lupi-live-qr-atomized.png',
  pulse_grid_atomized: 'generated/atomized/pulse-grid-atomized.png',
};

export function publicAssetUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
}

export function gallerySnapshotUrl(id: string): string {
  if (GENERATED_SNAPSHOT_URLS[id]) return publicAssetUrl(GENERATED_SNAPSHOT_URLS[id]);
  return publicAssetUrl(`gallery/snapshots/${id}.jpg`);
}

export function parseFrameCountLabel(label: string | undefined): number {
  if (!label) return 0;
  const digits = label.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function resolveExampleUrl(example: GalleryExample): string {
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

export function isOpenDataExample(example: GalleryExample): boolean {
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

export function matchesSourceFilter(example: GalleryExample, sourceFilter: SourceFilter): boolean {
  if (sourceFilter === 'All Sources') return true;
  if (sourceFilter === 'Featured') return Boolean(example.featured);
  if (sourceFilter === 'Trajectories') return parseFrameCountLabel(example.frames) > 1;
  if (sourceFilter === 'Snapshots') return parseFrameCountLabel(example.frames) <= 1;
  return isOpenDataExample(example);
}
