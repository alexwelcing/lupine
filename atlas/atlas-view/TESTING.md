# Testing Guide — Atlas View

A junior-dev-friendly testing framework for the monorepo. If you can write React, you can write these tests.

## Quick Start

```bash
# Run ALL tests across the monorepo
pnpm test

# Run tests for a single package
pnpm --filter @atlas/core test
pnpm --filter @atlas/ui test
pnpm --filter @atlas/scene test

# Run tests in watch mode (great while developing)
cd packages/ui && npx vitest
```

## Test File Location

Put test files **right next to** the code they test:

```
src/
  store.ts
  store.test.ts          ← test for store.ts
  MyComponent.tsx
  MyComponent.test.tsx   ← test for MyComponent.tsx
```

This makes tests impossible to miss and easy to find.

## Three Test Patterns

### 1. Pure Functions (Fastest — no React needed)

For utility functions, math, data transforms. Uses only `vitest`.

```ts
// src/helpers.test.ts
import { describe, it, expect } from 'vitest';
import { myHelper } from './helpers';

describe('myHelper', () => {
  it('doubles a number', () => {
    expect(myHelper(5)).toBe(10);
  });

  it('returns 0 for negative input', () => {
    expect(myHelper(-3)).toBe(0);
  });
});
```

**When to use**: colors, math, formatters, stateless helpers.

### 2. Zustand Store (No React needed)

For store actions and state transitions. Uses `vitest` + our `test-utils`.

```ts
// src/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getStoreState } from './test-utils';

describe('Store — Playback', () => {
  beforeEach(() => {
    resetStore(); // critical! resets store to defaults before each test
  });

  it('toggles play', () => {
    expect(getStoreState().playing).toBe(false);
    getStoreState().togglePlay();
    expect(getStoreState().playing).toBe(true);
  });
});
```

**When to use**: any store action (`toggleX`, `setY`, `applyProfile`, URL encode/decode).

### 3. React Components (Uses jsdom)

For UI panels, buttons, toggles. Uses `@testing-library/react`.

```tsx
// src/MyPanel.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetStore, getStoreState } from './test-utils';
import { MyPanel } from './MyPanel';

// Mock external UI library if needed
vi.mock('@lupine/ui', () => ({
  OrbitalToggle: ({ label, onClick }: any) => (
    <button onClick={onClick}>{label}</button>
  ),
}));

describe('MyPanel', () => {
  beforeEach(() => {
    resetStore();
  });

  it('clicking toggle updates store', () => {
    render(<MyPanel />);
    fireEvent.click(screen.getByText('My Toggle'));
    expect(getStoreState().someFlag).toBe(true);
  });
});
```

**When to use**: panels, buttons, sliders, anything with user interaction.

## Mock Data Helpers

Use `@atlas/core/test-utils` to create fake data:

```ts
import { createMockFrame, createMockTrajectory, createMockBondStats } from '@atlas/core/test-utils';

const frame = createMockFrame({ natoms: 10 });
const traj = createMockTrajectory(5, 10); // 5 frames, 10 atoms each
const stats = createMockBondStats({ count: 250, meanLength: 2.8 });
```

## Common Assertions

```ts
// Basic equality
expect(value).toBe(42);
expect(value).toEqual([1, 2, 3]);

// Booleans
expect(flag).toBe(true);
expect(maybeNull).toBeNull();

// Numbers (with tolerance)
expect(cutoff).toBeCloseTo(3.85);

// Strings / regex
expect(text).toContain('bonds');
expect(text).toMatch(/detected/);

// Arrays
expect(arr).toHaveLength(5);
expect(arr).toContain('viridis');

// DOM (in component tests)
expect(screen.getByText('Label')).toBeDefined();
expect(screen.queryByText('Missing')).toBeNull();
```

## Testing Checklist for New Features

When you add a new feature, add at least one test that covers:

- [ ] **Happy path**: the feature works when used correctly
- [ ] **Toggle/Action**: if it has a button/slider/action, test that interaction
- [ ] **Edge case**: what happens with empty/missing data?

Example for a new "Show Forces" toggle:

```ts
it('toggles force vectors on and off', () => {
  const s = getStoreState();
  expect(s.showForces).toBe(false);
  s.toggleForces();
  expect(getStoreState().showForces).toBe(true);
});

it('renders force panel when forces are enabled', () => {
  setStoreState({ showForces: true });
  render(<ForcesPanel />);
  expect(screen.getByText(/force magnitude/i)).toBeDefined();
});
```

## Debugging Failed Tests

```bash
# Run a single test file
cd packages/ui && npx vitest run src/store.test.ts

# Run tests matching a pattern
cd packages/ui && npx vitest run -t "toggles filament"

# Run with verbose output
cd packages/ui && npx vitest run --reporter=verbose
```

## What NOT to Test

- **Three.js rendering**: We test geometry logic, not GPU output.
- **Web Workers**: Test the math in isolation; worker glue is framework code.
- **External libraries**: Don't test `zustand`, `three`, or `@lupine/ui`.

## Test Infrastructure

| Package | Test Tool | Environment | Notes |
|---------|-----------|-------------|-------|
| `@atlas/core` | vitest | node | Pure functions, types, data generators |
| `@atlas/scene` | vitest | jsdom | R3F components via `@react-three/test-renderer` |
| `@atlas/ui` | vitest + `@testing-library/react` | jsdom | React components, store integration |

All configs are in `vitest.config.ts` in each package.
