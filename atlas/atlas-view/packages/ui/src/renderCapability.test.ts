import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectRenderCapability, fallbackCopyFor } from './renderCapability';

/**
 * Capability detection guards the cold-mobile blank-screen path. These tests
 * pin the two outcomes that matter: a device that CAN make a WebGL context is
 * renderable, and one that CANNOT falls back with capability-accurate copy.
 */

const realGetContext = HTMLCanvasElement.prototype.getContext;

function stubGetContext(impl: (id: string) => unknown) {
  // jsdom returns null for webgl by default; override per-test.
  HTMLCanvasElement.prototype.getContext = vi.fn(impl as any) as any;
}

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = realGetContext;
  vi.restoreAllMocks();
});

describe('detectRenderCapability', () => {
  it('reports renderable when a WebGL2 context is available', () => {
    const fakeGl = {
      getExtension: () => ({ loseContext: () => {} }),
    };
    stubGetContext((id) => (id === 'webgl2' ? fakeGl : null));

    const cap = detectRenderCapability();
    expect(cap.canRenderWebGL).toBe(true);
    expect(cap.reason).toBe('none');
  });

  it('falls back to webgl1 when webgl2 is unavailable', () => {
    const fakeGl = { getExtension: () => null };
    stubGetContext((id) => (id === 'webgl' ? fakeGl : null));

    const cap = detectRenderCapability();
    expect(cap.canRenderWebGL).toBe(true);
  });

  it('blocks rendering with reason "no-webgl" when no GL context can be made', () => {
    stubGetContext(() => null);

    const cap = detectRenderCapability();
    expect(cap.canRenderWebGL).toBe(false);
    expect(cap.reason).toBe('no-webgl');
  });

  it('treats a getContext throw as non-renderable (locked-down browsers)', () => {
    stubGetContext(() => {
      throw new Error('blocked');
    });

    const cap = detectRenderCapability();
    expect(cap.canRenderWebGL).toBe(false);
  });
});

describe('fallbackCopyFor', () => {
  it('always returns a title and body and a recovery action', () => {
    const copy = fallbackCopyFor({
      canRenderWebGL: false,
      hasWebGPU: false,
      reason: 'no-webgl',
      browser: 'other',
    });
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.body.length).toBeGreaterThan(0);
    expect(copy.actionHref).toBeTruthy();
  });

  it('tailors the hint for iOS Safari', () => {
    const copy = fallbackCopyFor({
      canRenderWebGL: false,
      hasWebGPU: false,
      reason: 'no-webgl',
      browser: 'ios-safari',
    });
    expect(copy.body.toLowerCase()).toContain('ios');
  });

  it('tailors the hint for Android Firefox', () => {
    const copy = fallbackCopyFor({
      canRenderWebGL: false,
      hasWebGPU: false,
      reason: 'no-webgl',
      browser: 'android-firefox',
    });
    expect(copy.body.toLowerCase()).toContain('firefox');
  });
});
