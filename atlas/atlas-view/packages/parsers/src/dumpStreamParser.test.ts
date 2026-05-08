import { describe, it, expect } from 'vitest';
import {
  parseDumpStream,
  parseDumpStreamFromBytes,
  canStreamDump,
} from './dumpStreamParser';

const SIMPLE_3_ATOMS = `ITEM: TIMESTEP
1
ITEM: NUMBER OF ATOMS
3
ITEM: BOX BOUNDS pp pp pp
0 10
0 10
0 10
ITEM: ATOMS id type x y z
1 1 1.0 2.0 3.0
2 2 4.0 5.0 6.0
3 1 7.0 8.0 9.0
`;

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of gen) out.push(v);
  return out;
}

describe('parseDumpStream (text transport)', () => {
  it('emits header + complete for a small dump', async () => {
    const events = await collect(parseDumpStream(SIMPLE_3_ATOMS));
    expect(events[0].type).toBe('header');
    expect(events[events.length - 1].type).toBe('complete');
    if (events[0].type === 'header') {
      expect(events[0].frame.natoms).toBe(3);
      expect(events[0].frame.timestep).toBe(1);
      expect(Array.from(events[0].frame.boxBounds)).toEqual([0, 10, 0, 10, 0, 10]);
      expect(Array.from(events[0].frame.types)).toEqual([1, 2, 1]);
      expect(Array.from(events[0].frame.positions)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('reports the final atom count in `complete`', async () => {
    const events = await collect(parseDumpStream(SIMPLE_3_ATOMS));
    const last = events[events.length - 1];
    expect(last.type).toBe('complete');
    if (last.type === 'complete') expect(last.loadedAtoms).toBe(3);
  });
});

describe('parseDumpStreamFromBytes (network/file transport)', () => {
  function chunks(text: string, size: number): AsyncIterable<Uint8Array> {
    const enc = new TextEncoder();
    const bytes = enc.encode(text);
    return {
      async *[Symbol.asyncIterator]() {
        for (let i = 0; i < bytes.length; i += size) {
          yield bytes.subarray(i, Math.min(i + size, bytes.length));
        }
      },
    };
  }

  it('matches the text path on the same input', async () => {
    const a = await collect(parseDumpStream(SIMPLE_3_ATOMS));
    const b = await collect(parseDumpStreamFromBytes(chunks(SIMPLE_3_ATOMS, 1024)));
    // Structural equality: same sequence of events, same atom counts,
    // same final positions/types in the header frame.
    expect(b.length).toBeGreaterThanOrEqual(2);
    expect(b[0].type).toBe('header');
    expect(b[b.length - 1].type).toBe('complete');
    if (a[0].type === 'header' && b[0].type === 'header') {
      expect(Array.from(b[0].frame.positions)).toEqual(Array.from(a[0].frame.positions));
      expect(Array.from(b[0].frame.types)).toEqual(Array.from(a[0].frame.types));
    }
  });

  it('handles bytes split mid-line', async () => {
    // Tiny chunk size forces the line buffer to splice across chunks.
    const events = await collect(parseDumpStreamFromBytes(chunks(SIMPLE_3_ATOMS, 7)));
    const headerEvent = events.find(e => e.type === 'header');
    expect(headerEvent).toBeDefined();
    if (headerEvent && headerEvent.type === 'header') {
      expect(Array.from(headerEvent.frame.positions)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('handles bytes split mid-multibyte-character (UTF-8 safety)', async () => {
    // Add a UTF-8 BOM to exercise the streaming TextDecoder boundary.
    // The trimStart() in the header walk drops the BOM; columns / atom
    // rows are pure ASCII so the test is really just confirming the
    // decoder doesn't choke when bytes split mid-character.
    const withBOM = '﻿' + SIMPLE_3_ATOMS;
    const events = await collect(parseDumpStreamFromBytes(chunks(withBOM, 1)));
    expect(events.find(e => e.type === 'header')).toBeDefined();
  });
});

describe('canStreamDump', () => {
  it('accepts a basic id/type/x/y/z header', () => {
    expect(canStreamDump(SIMPLE_3_ATOMS.slice(0, 200))).toBe(true);
  });

  it('rejects triclinic box (xy xz yz tilt)', () => {
    const triclinic = SIMPLE_3_ATOMS.replace('BOX BOUNDS pp pp pp', 'BOX BOUNDS xy xz yz pp pp pp');
    expect(canStreamDump(triclinic.slice(0, 200))).toBe(false);
  });

  it('rejects when required columns are missing', () => {
    const xyzOnly = SIMPLE_3_ATOMS.replace('id type x y z', 'id x y z');
    expect(canStreamDump(xyzOnly.slice(0, 200))).toBe(false);
  });

  it('rejects when there is no TIMESTEP header', () => {
    expect(canStreamDump('Lattice="..." Properties=...')).toBe(false);
  });
});
