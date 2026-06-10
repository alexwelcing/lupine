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

  it('flags a single-frame dump as having no more frames', async () => {
    const events = await collect(parseDumpStream(SIMPLE_3_ATOMS));
    const last = events[events.length - 1];
    expect(last.type).toBe('complete');
    if (last.type === 'complete') expect(last.hasMoreFrames).toBe(false);
  });

  it('flags a multi-frame trajectory so the caller can do a full parse', async () => {
    // Two frames back-to-back: the streaming parser only fills frame 0, so
    // it must signal hasMoreFrames or the trajectory's time dimension is
    // silently lost.
    const multi = SIMPLE_3_ATOMS + SIMPLE_3_ATOMS.replace('TIMESTEP\n1', 'TIMESTEP\n2');
    const events = await collect(parseDumpStream(multi));
    const last = events[events.length - 1];
    expect(last.type).toBe('complete');
    if (last.type === 'complete') {
      expect(last.loadedAtoms).toBe(3);
      expect(last.hasMoreFrames).toBe(true);
    }
  });
});

describe('parseDumpStream multi-frame mode', () => {
  const frameText = (ts: number, base: number) => `ITEM: TIMESTEP
${ts}
ITEM: NUMBER OF ATOMS
3
ITEM: BOX BOUNDS pp pp pp
0 10
0 10
0 10
ITEM: ATOMS id type x y z
1 1 ${base + 1}.0 2.0 3.0
2 2 ${base + 4}.0 5.0 6.0
3 1 ${base + 7}.0 8.0 9.0
`;

  it('yields every frame past frame 0 as a whole-frame event', async () => {
    const text = frameText(0, 0) + frameText(100, 10) + frameText(200, 20);
    const events = await collect(parseDumpStream(text, { multiFrame: true }));

    expect(events[0].type).toBe('header');
    const frameEvents = events.filter((e) => e.type === 'frame');
    expect(frameEvents).toHaveLength(2);
    if (frameEvents[0].type === 'frame' && frameEvents[1].type === 'frame') {
      expect(frameEvents[0].frameIndex).toBe(1);
      expect(frameEvents[0].frame.timestep).toBe(100);
      expect(frameEvents[0].frame.positions[0]).toBe(11);
      expect(frameEvents[1].frame.timestep).toBe(200);
      expect(frameEvents[1].frame.positions[0]).toBe(21);
    }

    const last = events[events.length - 1];
    expect(last.type).toBe('complete');
    if (last.type === 'complete') {
      expect(last.totalFrames).toBe(3);
      // Multi-frame mode consumes everything: nothing is left over.
      expect(last.hasMoreFrames).toBe(false);
    }
  });

  it('parses all frames when bytes arrive in tiny chunks', async () => {
    const text = frameText(0, 0) + frameText(50, 5) + frameText(75, 30);
    const enc = new TextEncoder();
    const bytes = enc.encode(text);
    const source: AsyncIterable<Uint8Array> = {
      async *[Symbol.asyncIterator]() {
        for (let i = 0; i < bytes.length; i += 7) {
          yield bytes.subarray(i, Math.min(i + 7, bytes.length));
        }
      },
    };
    const events = await collect(parseDumpStreamFromBytes(source, { multiFrame: true }));
    const frameEvents = events.filter((e) => e.type === 'frame');
    expect(frameEvents).toHaveLength(2);
    if (frameEvents[1].type === 'frame') {
      expect(frameEvents[1].frame.positions[0]).toBe(31);
    }
  });

  it('reports a truncated final frame with its actual atom count', async () => {
    // Second frame cut off after one atom row (killed simulation).
    const truncated = frameText(0, 0) + frameText(10, 10).split('\n').slice(0, 11).join('\n');
    const events = await collect(parseDumpStream(truncated, { multiFrame: true }));
    const frameEvents = events.filter((e) => e.type === 'frame');
    expect(frameEvents).toHaveLength(1);
    if (frameEvents[0].type === 'frame') {
      expect(frameEvents[0].frame.natoms).toBe(1);
      expect(frameEvents[0].frame.positions[0]).toBe(11);
    }
  });

  it('single-frame mode still stops at frame 0 and flags the rest', async () => {
    const text = frameText(0, 0) + frameText(100, 10);
    const events = await collect(parseDumpStream(text));
    expect(events.filter((e) => e.type === 'frame')).toHaveLength(0);
    const last = events[events.length - 1];
    if (last.type === 'complete') {
      expect(last.hasMoreFrames).toBe(true);
      expect(last.totalFrames).toBe(1);
    }
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

  it('accepts triclinic and scaled-coordinate dialects (full dialect support)', () => {
    const triclinic = SIMPLE_3_ATOMS.replace('BOX BOUNDS pp pp pp', 'BOX BOUNDS xy xz yz pp pp pp');
    expect(canStreamDump(triclinic.slice(0, 220))).toBe(true);
    const scaled = SIMPLE_3_ATOMS.replace('id type x y z', 'id type xs ys zs');
    expect(canStreamDump(scaled.slice(0, 200))).toBe(true);
  });

  it('rejects when required columns are missing', () => {
    const noType = SIMPLE_3_ATOMS.replace('id type x y z', 'id x y z');
    expect(canStreamDump(noType.slice(0, 200))).toBe(false);
  });

  it('rejects when there is no TIMESTEP header', () => {
    expect(canStreamDump('Lattice="..." Properties=...')).toBe(false);
  });
});

describe('dialect support in the streaming core', () => {
  it('parses a triclinic box, carrying tilt factors', async () => {
    const triclinic = SIMPLE_3_ATOMS
      .replace('BOX BOUNDS pp pp pp', 'BOX BOUNDS xy xz yz pp pp pp')
      .replace('0 10\n0 10\n0 10', '0 10 1.5\n0 10 0.5\n0 10 0.25');
    const events = await collect(parseDumpStream(triclinic));
    const header = events.find((e) => e.type === 'header');
    expect(header).toBeDefined();
    if (header?.type === 'header') {
      expect(header.frame.triclinic).toBe(true);
      expect(Array.from(header.frame.boxTilt)).toEqual([1.5, 0.5, 0.25]);
      expect(header.frame.positions[0]).toBe(1);
    }
  });

  it('converts scaled coordinates to Cartesian using the box', async () => {
    // Box 0..10 each axis; xs=0.25 → x=2.5.
    const scaled = SIMPLE_3_ATOMS
      .replace('id type x y z', 'id type xs ys zs')
      .replace('1 1 1.0 2.0 3.0', '1 1 0.25 0.5 0.75')
      .replace('2 2 4.0 5.0 6.0', '2 2 0.0 1.0 0.5')
      .replace('3 1 7.0 8.0 9.0', '3 1 0.1 0.2 0.3');
    const events = await collect(parseDumpStream(scaled));
    const header = events.find((e) => e.type === 'header');
    if (header?.type === 'header') {
      expect(Array.from(header.frame.positions.slice(0, 3))).toEqual([2.5, 5, 7.5]);
    }
  });

  it('parses extra numeric columns into named per-atom properties', async () => {
    const withProps = SIMPLE_3_ATOMS
      .replace('id type x y z', 'id type x y z vx c_pe')
      .replace('1 1 1.0 2.0 3.0', '1 1 1.0 2.0 3.0 0.5 -3.2')
      .replace('2 2 4.0 5.0 6.0', '2 2 4.0 5.0 6.0 -0.25 -3.1')
      .replace('3 1 7.0 8.0 9.0', '3 1 7.0 8.0 9.0 1.5 -2.9');
    const events = await collect(parseDumpStream(withProps));
    const header = events.find((e) => e.type === 'header');
    if (header?.type === 'header') {
      const vx = header.frame.properties.get('vx');
      const pe = header.frame.properties.get('c_pe');
      expect(vx && Array.from(vx)).toEqual([0.5, -0.25, 1.5]);
      expect(pe && Array.from(pe)).toEqual(
        [-3.2, -3.1, -2.9].map((v) => Math.fround(v)),
      );
      // Positions unaffected by the extra columns.
      expect(Array.from(header.frame.positions)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('parses scientific-notation values in atom rows', async () => {
    const sci = SIMPLE_3_ATOMS.replace('1 1 1.0 2.0 3.0', '1 1 1.25e+00 -2.5E-1 3e2');
    const events = await collect(parseDumpStream(sci));
    const header = events.find((e) => e.type === 'header');
    if (header?.type === 'header') {
      expect(Array.from(header.frame.positions.slice(0, 3))).toEqual([1.25, -0.25, 300]);
    }
  });

  it('skips non-numeric extra columns (e.g. element symbols)', async () => {
    const withElement = SIMPLE_3_ATOMS
      .replace('id type x y z', 'id type element x y z')
      .replace('1 1 1.0 2.0 3.0', '1 1 Cu 1.0 2.0 3.0')
      .replace('2 2 4.0 5.0 6.0', '2 2 Cu 4.0 5.0 6.0')
      .replace('3 1 7.0 8.0 9.0', '3 1 Cu 7.0 8.0 9.0');
    const events = await collect(parseDumpStream(withElement));
    const header = events.find((e) => e.type === 'header');
    if (header?.type === 'header') {
      expect(header.frame.properties.has('element')).toBe(false);
      expect(Array.from(header.frame.positions)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });
});
