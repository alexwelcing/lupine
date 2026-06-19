import rawCatalog from './gallery-nomenclature.json';

export type GalleryNomenclatureConfidence =
  | 'source-backed'
  | 'computed'
  | 'procedural'
  | 'illustrative';

export interface GalleryNomenclatureEntry {
  preferredName: string;
  systematicName?: string;
  molecularFormula?: string;
  pubchemCid?: number;
  sourceUrl?: string;
  geometrySource: string;
  confidence: GalleryNomenclatureConfidence;
  aliases?: string[];
}

interface GalleryNomenclatureCatalog {
  schema: string;
  sources: Record<string, { name: string; url: string; note?: string }>;
  entries: Record<string, GalleryNomenclatureEntry>;
}

export const GALLERY_NOMENCLATURE = (rawCatalog as unknown as GalleryNomenclatureCatalog).entries;

export function nomenclatureForGalleryId(id: string): GalleryNomenclatureEntry | undefined {
  return GALLERY_NOMENCLATURE[id];
}

export function galleryNomenclatureTags(id: string): string[] {
  const entry = nomenclatureForGalleryId(id);
  if (!entry) return [];
  return [
    entry.preferredName,
    entry.systematicName,
    entry.molecularFormula,
    entry.pubchemCid ? `PubChem CID ${entry.pubchemCid}` : undefined,
    entry.sourceUrl,
    entry.geometrySource,
    entry.confidence,
    ...(entry.aliases ?? []),
  ].filter((value): value is string => Boolean(value));
}
