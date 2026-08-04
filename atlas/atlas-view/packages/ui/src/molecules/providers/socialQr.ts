import { publicAssetUrl } from '../../landing/shared';
import type { MoleculeHit, MoleculeProvider, MoleculeQuery } from '../types';

interface SocialQrEntry {
  id: string;
  title: string;
  url: string;
  file: string;
  atoms: number;
  qrModules: number;
  tags: string[];
}

let cache: Promise<SocialQrEntry[]> | null = null;

function loadArchive(): Promise<SocialQrEntry[]> {
  if (!cache) {
    cache = fetch(publicAssetUrl('social-qr/manifest.json'))
      .then((resp) => (resp.ok ? resp.json() : { links: [] }))
      .then((data) => Array.isArray(data.links) ? data.links as SocialQrEntry[] : [])
      .catch(() => []);
  }
  return cache;
}

function matches(entry: SocialQrEntry, text: string): boolean {
  if (!text) return true;
  const haystack = `${entry.title} ${entry.url} ${entry.tags.join(' ')} atom bond qr social archive`;
  return haystack.toLowerCase().includes(text);
}

/** Limited social-link archive: QR codes authored as atom point art with optional visual adjacency guides. */
export const socialQrProvider: MoleculeProvider = {
  id: 'social',
  label: 'Social QRs',
  isAvailable: () => true,
  async search(query: MoleculeQuery): Promise<MoleculeHit[]> {
    const entries = await loadArchive();
    const text = query.text.toLowerCase().trim();
    return entries
      .filter((entry) => matches(entry, text))
      .slice(0, query.limit ?? 25)
      .map((entry) => ({
        id: entry.id,
        source: 'social',
        title: entry.title,
        subtitle: `Atom QR point art -> ${entry.url}`,
        formula: `C${entry.atoms}`,
        elements: ['C'],
        tags: ['limited archive', 'atom QR', 'visual adjacency', `${entry.qrModules}×${entry.qrModules}`, ...entry.tags],
        colors: ['#111827', '#1edce0', '#ffffff'],
        load: { kind: 'url', url: publicAssetUrl(`social-qr/${entry.file}`) },
        score: text ? 0.82 : 0.42,
      }));
  },
};
