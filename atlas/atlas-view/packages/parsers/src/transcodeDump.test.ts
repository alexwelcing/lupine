import { describe, it, expect, vi, beforeEach } from 'vitest';

// The façade constructs `new Worker(new URL(...), ...)`. We don't want a
// real worker in unit tests — stub the module-eval-time `Worker` global
// with a controllable fake whose `postMessage`/handlers we drive by hand.

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
});

async function importFacade() {
  return import('./transcodeDump');
}

const file = new File(['dummy'], 'sim.lammpstrj');

describe('transcodeDumpFile façade', () => {
  it('forwards frame-0 callbacks and resolves single-structure imports', async () => {
    const { transcodeDumpFile } = await importFacade();
    const onFrame0Header = vi.fn();
    const onFrame0Chunk = vi.fn();
    const onFrame0Complete = vi.fn();

    const promise = transcodeDumpFile(file, null, {
      onFrame0Header,
      onFrame0Chunk,
      onFrame0Complete,
    });
    const w = FakeWorker.instances[0];
    expect(w.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'transcode-dump', file, opfs: null }),
    );

    w.emit({ type: 'frame0-header', natoms: 3, timestep: 0, boxBounds: new Float64Array(6), columns: ['id'] });
    w.emit({ type: 'frame0-chunk', start: 0, count: 3, positions: new Float32Array(9), types: new Int32Array(3), ids: new Int32Array(3) });
    w.emit({ type: 'frame0-complete', loadedAtoms: 3 });
    w.emit({ type: 'done', kind: 'single' });

    const result = await promise;
    expect(result).toEqual({ kind: 'single' });
    expect(onFrame0Header).toHaveBeenCalledOnce();
    expect(onFrame0Chunk).toHaveBeenCalledOnce();
    expect(onFrame0Complete).toHaveBeenCalledWith(3);
    expect(w.terminate).toHaveBeenCalled();
  });

  it('resolves a multi-frame OPFS import with metadata', async () => {
    const { transcodeDumpFile } = await importFacade();
    const meta = { totalFrames: 12, atomsPerFrame: 100, atomTypes: [1, 2] };
    const promise = transcodeDumpFile(file, { dir: 'lib', name: 'x.glimbin' }, {});
    const w = FakeWorker.instances[0];
    w.emit({ type: 'done', kind: 'multi', storage: 'opfs', meta });
    await expect(promise).resolves.toEqual({ kind: 'multi', storage: 'opfs', meta });
    expect(w.terminate).toHaveBeenCalled();
  });

  it('resolves a multi-frame blob import (OPFS-unavailable fallback)', async () => {
    const { transcodeDumpFile } = await importFacade();
    const blob = new Blob([new Uint8Array(8)]);
    const meta = { totalFrames: 20, atomsPerFrame: 50, atomTypes: [1] };
    const promise = transcodeDumpFile(file, null, {});
    const w = FakeWorker.instances[0];
    w.emit({ type: 'done', kind: 'multi', storage: 'blob', blob, meta });
    await expect(promise).resolves.toEqual({ kind: 'multi', storage: 'blob', blob, meta });
  });

  it('rejects when the worker reports an error', async () => {
    const { transcodeDumpFile } = await importFacade();
    const promise = transcodeDumpFile(file, null, {});
    const w = FakeWorker.instances[0];
    w.emit({ type: 'error', message: 'unsupported dialect' });
    await expect(promise).rejects.toThrow('unsupported dialect');
    expect(w.terminate).toHaveBeenCalled();
  });
});
