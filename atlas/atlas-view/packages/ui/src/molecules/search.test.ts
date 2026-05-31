import { describe, expect, it } from 'vitest';
import { rankHits, scoreHit, searchMolecules, textScore } from './search';
import type { MoleculeHit, MoleculeProvider } from './types';

function hit(over: Partial<MoleculeHit> & { id: string; title: string }): MoleculeHit {
  return { source: 'gallery', load: { kind: 'url', url: 'u' }, ...over };
}

function provider(id: MoleculeProvider['id'], hits: MoleculeHit[], available = true): MoleculeProvider {
  return { id, label: id, isAvailable: () => available, async search() { return hits; } };
}

describe('textScore', () => {
  it('ranks exact > prefix > substring > meta > weak', () => {
    expect(textScore(hit({ id: '1', title: 'Water' }), 'water')).toBe(1);
    expect(textScore(hit({ id: '1', title: 'Water cluster' }), 'water')).toBe(0.85);
    expect(textScore(hit({ id: '1', title: 'Heavy water' }), 'water')).toBe(0.7);
    expect(textScore(hit({ id: '1', title: 'X', subtitle: 'contains water' }), 'water')).toBe(0.45);
    expect(textScore(hit({ id: '1', title: 'X' }), 'water')).toBe(0.2);
  });

  it('matches formula and element', () => {
    expect(textScore(hit({ id: '1', title: 'X', formula: 'H2O' }), 'h2o')).toBe(0.65);
    expect(textScore(hit({ id: '1', title: 'X', elements: ['Ni', 'Al'] }), 'ni')).toBe(0.6);
  });

  it('treats an empty query as neutral browsing relevance', () => {
    expect(textScore(hit({ id: '1', title: 'Anything' }), '')).toBe(0.3);
  });
});

describe('scoreHit', () => {
  it('takes the max of provider score and text score', () => {
    expect(scoreHit(hit({ id: '1', title: 'X', score: 0.9 }), { text: 'nomatch' })).toBe(0.9);
    expect(scoreHit(hit({ id: '1', title: 'Water', score: 0.1 }), { text: 'water' })).toBe(1);
  });
});

describe('rankHits', () => {
  it('orders by score desc and de-duplicates by source+id', () => {
    const ranked = rankHits(
      [
        hit({ id: 'a', title: 'Zzz' }),
        hit({ id: 'b', title: 'Water' }),
        hit({ id: 'a', title: 'Zzz dup' }), // same source+id → dropped
      ],
      { text: 'water' },
    );
    expect(ranked.map((h) => h.id)).toEqual(['b', 'a']);
    expect(ranked).toHaveLength(2);
  });

  it('keeps same-id hits from different sources', () => {
    const ranked = rankHits(
      [hit({ id: 'x', title: 'A', source: 'gallery' }), hit({ id: 'x', title: 'A', source: 'nist' })],
      { text: '' },
    );
    expect(ranked).toHaveLength(2);
  });
});

describe('searchMolecules', () => {
  it('merges across providers and ranks', async () => {
    const res = await searchMolecules({ text: 'water' }, [
      provider('gallery', [hit({ id: 'g1', title: 'Heavy water', source: 'gallery' })]),
      provider('nist', [hit({ id: 'n1', title: 'Water', source: 'nist' })]),
    ]);
    expect(res.map((h) => h.id)).toEqual(['n1', 'g1']); // exact 'Water' first
  });

  it('skips unavailable providers and survives a throwing one', async () => {
    const throwing: MoleculeProvider = {
      id: 'pubchem', label: 'x', isAvailable: () => true,
      async search() { throw new Error('network down'); },
    };
    const res = await searchMolecules({ text: 'q' }, [
      provider('gallery', [hit({ id: 'g1', title: 'q match', source: 'gallery' })]),
      provider('nist', [hit({ id: 'n1', title: 'n', source: 'nist' })], false), // unavailable
      throwing, // rejects → ignored
    ]);
    expect(res.map((h) => h.id)).toEqual(['g1']);
  });

  it('honors a sources filter', async () => {
    const res = await searchMolecules({ text: '', sources: ['nist'] }, [
      provider('gallery', [hit({ id: 'g1', title: 'g', source: 'gallery' })]),
      provider('nist', [hit({ id: 'n1', title: 'n', source: 'nist' })]),
    ]);
    expect(res.map((h) => h.id)).toEqual(['n1']);
  });

  it('caps results per source by limit', async () => {
    const many = Array.from({ length: 50 }, (_, i) => hit({ id: `g${i}`, title: `g${i}`, source: 'gallery' }));
    const res = await searchMolecules({ text: '', limit: 5 }, [provider('gallery', many)]);
    expect(res).toHaveLength(5);
  });
});
