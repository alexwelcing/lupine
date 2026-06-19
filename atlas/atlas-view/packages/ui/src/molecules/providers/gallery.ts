import { ALL_EXAMPLES, publicAssetUrl } from '../../landing/shared';
import { galleryNomenclatureTags, nomenclatureForGalleryId } from '../../galleryNomenclature';
import type { MoleculeHit, MoleculeProvider, MoleculeQuery } from '../types';

function fileUrl(file: string): string {
  return /^https?:\/\//.test(file) ? file : publicAssetUrl(file);
}

/** Curated featured examples from gallery-data.json. */
export const galleryProvider: MoleculeProvider = {
  id: 'gallery',
  label: 'Gallery',
  isAvailable: () => ALL_EXAMPLES.length > 0,
  async search(query: MoleculeQuery): Promise<MoleculeHit[]> {
    const q = query.text.toLowerCase().trim();
    return ALL_EXAMPLES.filter((ex) => ex.available !== false && Boolean(ex.file))
      .filter((ex) => {
        if (!q) return true;
        const nomenclatureTags = galleryNomenclatureTags(ex.id).join(' ');
        const hay =
          `${ex.title} ${ex.subtitle ?? ''} ${ex.domain ?? ''} ` +
          `${Object.values(ex.metadata ?? {}).join(' ')} ${nomenclatureTags}`;
        return hay.toLowerCase().includes(q);
      })
      .map((ex) => ({
        id: ex.id,
        source: 'gallery',
        title: ex.title,
        subtitle: ex.subtitle,
        formula: nomenclatureForGalleryId(ex.id)?.molecularFormula,
        tags: [
          ex.domain,
          ...Object.values(ex.metadata ?? {}),
          ...galleryNomenclatureTags(ex.id),
        ].filter((t): t is string => Boolean(t)),
        colors: ex.colors,
        load: { kind: 'url', url: fileUrl(ex.file) },
        // Featured examples get a small boost so they surface when browsing.
        score: ex.featured ? 0.6 : undefined,
      }));
  },
};
