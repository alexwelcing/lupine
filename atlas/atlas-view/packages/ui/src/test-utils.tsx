// ═══════════════════════════════════════════════════════════════════
// UI Test Utilities
// Helper functions for rendering React components with our store.
// ═══════════════════════════════════════════════════════════════════

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { useStore } from './store';

/** Reset the global Zustand store to default values before each test */
export function resetStore() {
  useStore.getState().reset();
}

/** Get current store state (useful for assertions) */
export function getStoreState() {
  return useStore.getState();
}

/** Render a React component with the store already reset to defaults */
export function renderWithStore(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  resetStore();
  return render(ui, { ...options });
}

/** Set store state for a specific test scenario */
export function setStoreState(patch: Partial<ReturnType<typeof getStoreState>>) {
  useStore.setState(patch as any);
}
