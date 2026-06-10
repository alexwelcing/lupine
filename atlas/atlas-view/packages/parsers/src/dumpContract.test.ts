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

  it('flags triclinic boxes as standard-path with an actionable reason', () => {
    const r = analyzeDumpHead(GOOD.replace('BOX BOUNDS pp pp ff', 'BOX BOUNDS xy xz yz pp pp ff'));
    expect(r.tier).toBe('standard');
    expect(codes(GOOD.replace('BOX BOUNDS pp pp ff', 'BOX BOUNDS xy xz yz pp pp ff'))).toContain('triclinic-box');
  });

  it('flags scaled and unwrapped coordinates distinctly', () => {
    const scaled = analyzeDumpHead(GOOD.replace('id type x y z', 'id type xs ys zs'));
    expect(scaled.tier).toBe('standard');
    expect(scaled.findings.find((f) => f.code === 'scaled-coords')?.fix).toContain(RECOMMENDED_DUMP_COMMAND);

    const unwrapped = analyzeDumpHead(GOOD.replace('id type x y z', 'id type xu yu zu'));
    expect(unwrapped.tier).toBe('standard');
    expect(codes(GOOD.replace('id type x y z', 'id type xu yu zu'))).toContain('unwrapped-coords');
  });

  it('treats a missing id as informational, not a blocker', () => {
    const r = analyzeDumpHead(GOOD.replace('id type x y z', 'type x y z'));
    expect(r.tier).toBe('streamable');
    expect(r.findings.find((f) => f.code === 'missing-id')?.severity).toBe('info');
  });

  it('warns that extra per-atom columns are ignored on the fast path', () => {
    const r = analyzeDumpHead(GOOD.replace('id type x y z', 'id type x y z vx vy vz c_pe'));
    expect(r.tier).toBe('streamable');
    expect(r.findings.find((f) => f.code === 'extra-columns')?.message).toContain('vx vy vz c_pe');
  });

  it('recognizes gzip bytes and non-dump text', () => {
    expect(analyzeDumpHead('\x1f\x8b\x08\x00rest').tier).toBe('standard');
    expect(codes('\x1f\x8b\x08\x00rest')).toContain('gzip-compressed');

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
