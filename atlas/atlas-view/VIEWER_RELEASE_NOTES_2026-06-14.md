# Release Notes - Lupi Viewer Controls and Gallery
## 2026-06-14 rollout

**Status:** Ship-ready locally

**Primary audience:** Lupi users tuning molecular views, sharing exact looks, and exploring small organic molecules from the gallery.

---

## What Users Get

- A simpler Controls menu with fewer duplicate settings:
  - **Look** owns atom color.
  - **Surface** owns material, shape, and bonds.
  - **World** owns backdrop, shell, lighting, and motion.
- A compact controls mode switcher that leaves more room for the actual settings.
- A **Copy look link** action so users can share the current visual treatment.
- A new organic chemistry layer in the gallery:
  - Functional-group filters for arenes, heteroaromatics, alkenes, alcohols and phenols, amines, amides, carboxylic acids, esters, ethers, and phosphate esters.
  - Molecule rows now surface relevant group chips.
  - The selected molecule spotlight explains first-course organic chemistry concepts through real gallery molecules such as aspirin, caffeine, dopamine, serotonin, THC, psilocybin, LSD, cholesterol, and alanine dipeptide.

## Why It Matters

- The viewer controls now feel organized around user intent instead of implementation history.
- Shared links preserve visual state, making collaboration and support easier.
- The gallery starts becoming a teaching and exploration system, not just a list of files.
- The organic chemistry grouping model is data-backed and test-guarded, so future curated molecule sets can grow without silently pointing to unavailable assets.

## Verification

Run from `atlas/atlas-view`:

```bash
pnpm --filter @atlas/ui test -- gallery-data.test.ts store.test.ts
pnpm --filter @atlas/ui build
pnpm --filter @atlas/web build
pnpm verify:gallery -- --no-screenshot
pnpm verify:controls -- --no-screenshot
pnpm verify:controls:mobile -- --no-screenshot
```

Local result on 2026-06-14:

- UI focused tests: 38 passing.
- UI TypeScript build: clean.
- Web production build: clean.
- Gallery verifier: 16/16 checks passing, including functional-group filtering and spotlight education.
- Controls verifier: desktop and mobile profiles passing.
- Manual visual screenshots checked for desktop functional-group filtering and mobile rail/result/spotlight layout.

## Live Verification After Deploy

```bash
VERIFY_URL=https://lupi.live pnpm verify:gallery -- --no-screenshot
VERIFY_URL=https://lupi.live pnpm verify:controls -- --no-screenshot
VERIFY_URL=https://lupi.live pnpm verify:controls:mobile -- --no-screenshot
```

## Rollback

Use the normal viewer Cloud Run revision rollback for `lupi.live`, or revert this rollout and push through the standard main-branch deploy.
