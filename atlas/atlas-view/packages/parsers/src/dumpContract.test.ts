import { describe, it, expect } from 'vitest';
import { analyzeDumpHead, RECOMMENDED_DUMP_COMMAND } from './dumpContract';
import { canStreamDump } from './dumpStreamParser';

const GOOD = `ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
1000
ITEM: BOX BOUNDS pp pp ff
0 10
0 10
0 10
ITEM: ATOMS id type x y z
1 1 1.0 2.0 3.0
`;

const codes = (head: string) => analyzeDumpHead(head).findings.map((f) => f.code);

describe('analyzeDumpHead', () => {
  it('classifies the recommended dialect as streamable with no blockers', () => {
    const r = analyzeDumpHead(GOOD);
    expect(r.tier).toBe('streamable');
    expect(r.findings.filter((f) => f.severity === 'blocker')).toEqual([]);
    expect(r.columns).toEqual(['id', 'type', 'x', 'y', 'z']);
    expect(r.natoms).toBe(1000);
  });

  it('streams triclinic boxes, noting the tilt handling', () => {
    const head = GOOD.replace('BOX BOUNDS pp pp ff', 'BOX BOUNDS xy xz yz pp pp ff');
    const r = analyzeDumpHead(head);
    expect(r.tier).toBe('streamable');
    expect(r.findings.find((f) => f.code === 'triclinic-box')?.severity).toBe('info');
  });

  it('streams scaled and unwrapped coordinates, noting the conversion', () => {
    const scaled = analyzeDumpHead(GOOD.replace('id type x y z', 'id type xs ys zs'));
    expect(scaled.tier).toBe('streamable');
    expect(scaled.findings.find((f) => f.code === 'scaled-coords')?.severity).toBe('info');

    const unwrapped = analyzeDumpHead(GOOD.replace('id type x y z', 'id type xu yu zu'));
    expect(unwrapped.tier).toBe('streamable');
    expect(codes(GOOD.replace('id type x y z', 'id type xu yu zu'))).toContain('unwrapped-coords');
  });

  it('still blocks files with no usable coordinates, pointing at the fix', () => {
    const r = analyzeDumpHead(GOOD.replace('id type x y z', 'id type q mol'));
    expect(r.tier).toBe('standard');
    expect(r.findings.find((f) => f.code === 'missing-coords')?.fix).toContain(RECOMMENDED_DUMP_COMMAND);
  });

  it('treats a missing id as informational, not a blocker', () => {
    const r = analyzeDumpHead(GOOD.replace('id type x y z', 'type x y z'));
    expect(r.tier).toBe('streamable');
    expect(r.findings.find((f) => f.code === 'missing-id')?.severity).toBe('info');
  });

  it('reports extra per-atom columns as streamed properties', () => {
    const r = analyzeDumpHead(GOOD.replace('id type x y z', 'id type x y z vx vy vz c_pe'));
    expect(r.tier).toBe('streamable');
    const f = r.findings.find((x) => x.code === 'extra-columns');
    expect(f?.severity).toBe('info');
    expect(f?.message).toContain('vx vy vz c_pe');
  });

  it('treats gzip as streamable (worker decompresses) and rejects non-dump text', () => {
    const gz = analyzeDumpHead('\x1f\x8b\x08\x00rest');
    expect(gz.tier).toBe('streamable');
    expect(gz.findings.find((f) => f.code === 'gzip-compressed')?.severity).toBe('info');

    const xyz = analyzeDumpHead('3\ncomment\nCu 0 0 0\n');
    expect(xyz.tier).toBe('not-a-dump');
  });

  it('flags a head truncated before BOX BOUNDS or ATOMS as malformed', () => {
    const r = analyzeDumpHead('ITEM: TIMESTEP\n0\nITEM: NUMBER OF ATOMS\n10\n');
    expect(r.tier).toBe('standard');
  });
});

describe('canStreamDump delegation', () => {
  it('agrees with the contract tier on every dialect variant', () => {
    const variants = [
      GOOD,
      GOOD.replace('BOX BOUNDS pp pp ff', 'BOX BOUNDS xy xz yz pp pp ff'),
      GOOD.replace('id type x y z', 'id type xs ys zs'),
      GOOD.replace('id type x y z', 'id x y z'),
      GOOD.replace('id type x y z', 'id type x y z vx vy'),
      'Lattice="..." not a dump',
    ];
    for (const v of variants) {
      expect(canStreamDump(v)).toBe(analyzeDumpHead(v).tier === 'streamable');
    }
  });
});
