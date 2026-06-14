import { describe, expect, it } from 'vitest';
import type { LoadedFile } from './store';
import { createMockFrame } from '@atlas/core/test-utils';
import { buildMoleculeStudyFacts, findGalleryExample, renderStudySheetHtml } from './studyFacts';

function makeFile(
  sourceUrl = 'https://lupi.live/gallery/curated/popular/aspirin.xyz',
  name = 'aspirin.xyz',
): LoadedFile {
  const frame = createMockFrame({
    natoms: 5,
    types: [6, 6, 1, 1, 8],
    positions: new Float32Array([
      0, 0, 0,
      1.4, 0, 0,
      -0.8, 0.7, 0,
      -0.8, -0.7, 0,
      2.4, 0, 0,
    ]),
    bonds: new Int32Array([0, 1, 1, 4]),
  });
  frame.properties.set('partial_charge', new Float32Array([-0.1, 0.2, 0.05, 0.04, -0.4]));

  return {
    name,
    size: 1234,
    sourceUrl,
    trajectory: {
      frames: [frame],
      totalFrames: 1,
      atomTypes: [1, 6, 8],
      globalBounds: { min: [0, 0, 0], max: [3, 3, 3] },
    },
    thermo: null,
  };
}

describe('study facts', () => {
  it('matches a loaded gallery file back to its curated example', () => {
    const example = findGalleryExample(makeFile());

    expect(example?.id).toBe('aspirin');
    expect(example?.title).toBe('Aspirin');
  });

  it('builds printable molecule facts with functional-group education', () => {
    const facts = buildMoleculeStudyFacts({
      file: makeFile(),
      frameIndex: 0,
      selectedAtoms: [1],
      lastBondCount: 2,
      showBonds: true,
      shareUrl: 'https://lupi.live/?s=demo',
    });

    expect(facts?.formula).toBe('C2H2O');
    expect(facts?.functionalGroups.map(group => group.id)).toEqual(
      expect.arrayContaining(['arene', 'carboxylic-acid', 'ester']),
    );
    expect(facts?.propertyStats[0]?.name).toBe('partial_charge');
    expect(facts?.selectedAtoms[0]?.symbol).toBe('C');

    const html = renderStudySheetHtml(facts!);
    expect(html).toContain('Lupi study sheet');
    expect(html).toContain('Carboxylic Acids');
    expect(html).toContain('Self-check');
    expect(html).toContain('partial_charge');
  });

  it('falls back gracefully for non-gallery structures', () => {
    const facts = buildMoleculeStudyFacts({
      file: makeFile('local://unknown.xyz', 'unknown.xyz'),
      frameIndex: 0,
    });

    expect(facts?.galleryExample).toBeNull();
    expect(facts?.functionalGroups).toEqual([]);
    expect(facts?.sourceLabel).toBe('Local import');
    expect(renderStudySheetHtml(facts!)).toContain('No curated organic functional-group mapping');
  });
});
