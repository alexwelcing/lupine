import { vi } from 'vitest';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!globalThis.performance) {
  (globalThis as any).performance = { now: () => Date.now() };
}
