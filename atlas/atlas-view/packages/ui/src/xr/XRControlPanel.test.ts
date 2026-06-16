import { describe, expect, it } from 'vitest';
import { createMockFrame } from '@atlas/core/test-utils';
import type { LoadedFile } from '../store';
import { buildMoleculeStudyFacts } from '../studyFacts';
import { buildXRStudySummary } from './XRControlPanel';

function makeAspirinFile(): LoadedFile {
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

  return {
    name: 'aspirin.xyz',
    size: 1234,
    sourceUrl: 'https://lupi.live/gallery/curated/popular/aspirin.xyz',
    trajectory: {
      frames: [frame],
      totalFrames: 1,
      atomTypes: [1, 6, 8],
      globalBounds: { min: [0, 0, 0], max: [3, 3, 3] },
    },
    thermo: null,
  };
}

describe('XR study summary', () => {
  it('condenses Study Lens facts into an AR-ready ochem dashboard', () => {
    const facts = buildMoleculeStudyFacts({
      file: makeAspirinFile(),
      frameIndex: 0,
      selectedAtoms: [1],
      lastBondCount: 2,
      showBonds: true,
    });

    const summary = buildXRStudySummary(facts!, 2);

    expect(summary.metrics).toContain('C2H2O');
    expect(summary.metrics).toContain('5 atoms');
    expect(summary.metrics).toContain('2 source bonds');
    expect(summary.handles).toContain('Carboxylic Acids');
    expect(summary.handles).toContain('Esters');
    expect(summary.courseUnit).toBe('Carboxylic acids and acyl derivatives');
    expect(summary.activeStepLabel).toBe('Choose the first move');
    expect(summary.activeStepPrompt).toContain('Acid-base first');
    expect(summary.priorities).toEqual(expect.arrayContaining(['Acid-base first', 'Nucleophilic acyl substitution']));
    expect(summary.practiceLine).toContain('carboxylic acid');
    expect(summary.materialsLine).toContain('Molecular materials');
    expect(summary.evidenceLine).toContain('source bonds');
    expect(summary.spectroscopyCue).toContain('aromatic');
    expect(summary.selectedAtomLine).toContain('#1 C');
  });
});
