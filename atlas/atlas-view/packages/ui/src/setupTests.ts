import { vi } from 'vitest';

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
