import { vi } from 'vitest';

// Polyfill HTMLCanvasElement.getContext('2d') for JSDOM. JSDOM auto-
// loads the optional `canvas` npm package via require('canvas'), but
// pnpm's hoisting puts the package outside JSDOM's resolution path so
// the auto-load silently fails and getContext returns null. We install
// the stub unconditionally (rather than probing first) because the
// probe call itself triggers a "Not implemented" log from JSDOM's
// virtual console — noisy and pointless. The stub only intercepts
// '2d'; webgl / webgl2 fall through to JSDOM's real handler.
//
// Stub is minimal — the export pipeline only uses
// createImageData / putImageData on a 1×N palette canvas, so a
// Uint8ClampedArray-backed buffer is enough.
if (typeof HTMLCanvasElement !== 'undefined') {
  const original = HTMLCanvasElement.prototype.getContext as unknown as (id: string) => unknown;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
    if (id !== '2d') return original.call(this, id, ...(rest as []));
    const w = this.width || 1;
    const h = this.height || 1;
    const buffer = new Uint8ClampedArray(w * h * 4);
    const stub = {
      canvas: this,
      createImageData(width: number, height: number) {
        return { data: new Uint8ClampedArray(width * height * 4), width, height };
      },
      getImageData(_x: number, _y: number, width: number, height: number) {
        const out = new Uint8ClampedArray(width * height * 4);
        out.set(buffer.subarray(0, Math.min(buffer.length, out.length)));
        return { data: out, width, height };
      },
      putImageData(imageData: { data: Uint8ClampedArray; width: number; height: number }) {
        buffer.set(imageData.data.subarray(0, Math.min(imageData.data.length, buffer.length)));
      },
      // No-ops for drawing methods the export pipeline doesn't call;
      // present so future callers don't crash on missing methods.
      drawImage() {},
      clearRect() {},
      fillRect() {},
      save() {},
      restore() {},
      translate() {},
      scale() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fill() {},
    };
    return stub as unknown as CanvasRenderingContext2D;
  } as typeof HTMLCanvasElement.prototype.getContext;
}

// Mock WebXR useXR from @react-three/xr
vi.mock('@react-three/xr', () => ({
  useXR: vi.fn((selector) => {
    const mockState = { mode: 'inline' };
    return selector ? selector(mockState) : mockState;
  })
}));

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock performance.now
if (!globalThis.performance) {
  (globalThis as any).performance = { now: () => Date.now() };
}
