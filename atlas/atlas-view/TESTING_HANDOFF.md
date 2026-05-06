# Testing Framework Handoff

**Date:** 2026-05-05  
**Scope:** Monorepo-wide junior-dev-friendly testing setup  
**Status:** ✅ Complete — 57 tests passing

---

## What You Can Do Now

```bash
# Run everything
pnpm test

# Run one package
cd packages/core && npx vitest run
cd packages/ui && npx vitest run
cd packages/scene && npx vitest run

# Watch mode while coding
cd packages/ui && npx vitest
```

---

## What Was Fixed

| Problem | Fix |
|---------|-----|
| `vitest` missing from package deps | Added to `devDependencies` in `@atlas/core`, `@atlas/ui`, `@atlas/scene` |
| `@testing-library/react` missing | Added to `@atlas/ui` |
| `@react-three/test-renderer` missing | Added to `@atlas/ui` and `@atlas/scene` |
| `jsdom` missing | Added to `@atlas/ui` |
| `@atlas/core` had no `test` script | Added `"test": "vitest run"` |
| `@atlas/core/test-utils` not importable | Added `"./test-utils"` to `exports` in `package.json` |
| Pre-existing build errors from missing deps | Resolved after `pnpm install` |

---

## New Files (Copy-Paste Templates for Junior Devs)

### 1. Mock Data Helpers
**File:** `packages/core/src/test-utils.ts`

```ts
import { createMockFrame, createMockTrajectory, createMockBondStats } from '@atlas/core/test-utils';

const frame = createMockFrame({ natoms: 10 });
const traj = createMockTrajectory(5, 10);
const stats = createMockBondStats({ count: 250, meanLength: 2.8 });
```

### 2. Store Test Utilities
**File:** `packages/ui/src/test-utils.tsx`

```ts
import { resetStore, getStoreState, setStoreState } from './test-utils';

// In beforeEach:
resetStore();

// Assert state:
expect(getStoreState().showBonds).toBe(true);

// Pre-seed state for a test:
setStoreState({ bondStats: stats });
```

### 3. Example: Pure Function Test
**File:** `packages/core/src/elements.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { getElementSpec, hexToRgb } from './elements';

describe('getElementSpec', () => {
  it('returns known elements by atomic number', () => {
    const carbon = getElementSpec(6);
    expect(carbon.symbol).toBe('C');
  });
});
```

### 4. Example: Store Action Test
**File:** `packages/ui/src/store.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, getStoreState } from './test-utils';

describe('Store — Bond Settings', () => {
  beforeEach(() => resetStore());

  it('toggles bonds on/off', () => {
    expect(getStoreState().showBonds).toBe(false);
    getStoreState().toggleBonds();
    expect(getStoreState().showBonds).toBe(true);
  });
});
```

### 5. Example: React Component Test
**File:** `packages/ui/src/panels/analysis_modules/BondAnalysisModule.test.tsx`

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetStore, getStoreState, setStoreState } from '../../test-utils';
import { createMockBondStats } from '@atlas/core/test-utils';
import { BondAnalysisModule } from './BondAnalysisModule';

vi.mock('@lupine/ui', () => ({
  OrbitalToggle: ({ label, active, onClick }: any) => (
    <button data-testid="orbital-toggle" data-active={active} onClick={onClick}>{label}</button>
  ),
  // ... mock other @lupine/ui components as needed
}));

describe('BondAnalysisModule', () => {
  beforeEach(() => resetStore());

  it('toggles filament mode on click', () => {
    render(<BondAnalysisModule />);
    fireEvent.click(screen.getByText('Electron Sea Filaments'));
    expect(getStoreState().filamentMode).toBe(true);
  });
});
```

### 6. Example: Scene Utility Test
**File:** `packages/scene/src/constants.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { lerpColor } from './constants';

describe('lerpColor', () => {
  it('interpolates between two colors', () => {
    expect(lerpColor([0,0,0], [1,1,1], 0.5)).toEqual([0.5, 0.5, 0.5]);
  });
});
```

---

## Test Inventory

| File | Tests | What It Covers |
|------|-------|----------------|
| `packages/core/src/elements.test.ts` | 8 | Element lookup, hex→RGB conversion, fallback generation |
| `packages/core/src/types.test.ts` | 7 | URL state encode/decode, unit labels |
| `packages/scene/src/constants.test.ts` | 8 | Color interpolation, colormap backgrounds, type colors |
| `packages/ui/src/store.test.ts` | 22 | Toggles, bond settings, playback, colors, URL serialization, atom selection, file loading |
| `packages/ui/src/panels/analysis_modules/BondAnalysisModule.test.tsx` | 9 | Render states, filament toggle, MEAM toggle, color mode, g(r) cutoff, percentile sliders |
| `packages/ui/src/SpatialAnchor.test.tsx` | 3 | (pre-existing) XR inline/AR/VR rendering modes |

**Total: 57 tests, 6 test files, 0 failures**

---

## Rules of Thumb for New Tests

1. **File naming:** `MyThing.test.ts` or `MyThing.test.tsx` right next to `MyThing.ts`
2. **Store tests:** Always call `resetStore()` in `beforeEach`
3. **Component tests:** Mock `@lupine/ui` components with simple `<button>` or `<div>` equivalents
4. **Data:** Use `createMockBondStats()` / `createMockFrame()` instead of hand-writing fake data
5. **Keep it simple:** One `describe` per feature, one `it` per behavior

---

## Next Steps (Optional)

- [ ] Add coverage reporting: `npx vitest run --coverage`
- [ ] Add a GitHub Action that runs `pnpm test` on PRs
- [ ] Expand scene tests with `@react-three/test-renderer` for `Bonds.tsx`
- [ ] Add an E2E smoke test with Playwright for file upload → render pipeline
