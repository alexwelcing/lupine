# Release Notes - Lupi Viewer Controls and Gallery
## 2026-06-14 rollout

**Status:** Live on `lupi.live` after main-branch deploy

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
- Expanded ochem study examples for aldehydes, ketones, nitriles, alkyl halides, nitro groups, epoxides, thiols, sulfides, anhydrides, and acyl halides, including acetaldehyde, acetone, benzaldehyde, cyclohexanone, acetonitrile, benzonitrile, nitrobenzene, phenol, tert-butyl chloride, 1-bromobutane, ethylene oxide, ethanethiol, dimethyl sulfide, acetic anhydride, acetyl chloride, and ethyl acetate.
- A new functional-group study guide in the gallery:
  - Before a filter is selected, students get a simple pattern-first framework: recognize, compare, predict.
  - After selecting a group, the guide teaches recognition cues, likely reactivity, common mistakes to avoid, a self-check prompt, and molecules to compare.
  - The selected molecule spotlight now repeats those teaching cues so users can connect the abstract group to the visible structure.
- A new **Study Lens** in the molecule viewer:
  - Opens directly over the active 3D view after a molecule is loaded.
  - Summarizes formula, atom count, frame, bonds, element composition, selected atoms, and per-frame property means.
  - Pulls the same organic chemistry teaching language into the actual molecule view, including recognition cues, reactivity, and self-check prompts.
- A new **Study sheet** export:
  - Available from Controls -> Export.
  - Opens a printable / save-to-PDF sheet with molecule summary, functional groups, composition, selected atoms, and frame properties.
- OMol25 is ready for the same functional-group language: the offline indexer now derives group tags from real coordinates, the OMol provider can facet and filter by those tags, and the OMol collection page will show a functional-group rail as soon as the refreshed v3 index is published.

## Why It Matters

- The viewer controls now feel organized around user intent instead of implementation history.
- Shared links preserve visual state, making collaboration and support easier.
- The gallery starts becoming a teaching and exploration system, not just a list of files.
- The viewer itself now helps students ask better questions while inspecting a molecule, and the printed sheet gives instructors and learners a durable artifact for class notes, labs, and review sessions.
- The organic chemistry grouping model is data-backed and test-guarded, so future curated molecule sets can grow without silently pointing to unavailable assets.
- OMol25 can graduate from element/formula browsing into ochem study workflows without fetching every structure in the browser.

## Verification

Run from `atlas/atlas-view`:

```bash
pnpm --filter @atlas/ui test -- gallery-data.test.ts omolCollection.test.ts store.test.ts
pnpm --filter @atlas/ui build
pnpm --filter @atlas/web build
pnpm verify:gallery -- --no-screenshot
pnpm verify:controls -- --no-screenshot
pnpm verify:controls:mobile -- --no-screenshot
pnpm verify:study-lens -- --no-screenshot
pnpm verify:study-lens:mobile -- --no-screenshot
```

Local result on 2026-06-14:

- UI focused tests: 48 passing.
- UI TypeScript build: clean.
- Web production build: clean.
- Gallery verifier: 18/18 checks passing, including expanded functional-group examples, spotlight education, and the functional-group study guide.
- Controls verifier: desktop and mobile profiles passing.
- Study Lens verifier: desktop and mobile profiles passing, including the in-view panel and printable study sheet export.
- Manual visual screenshots checked for desktop/mobile gallery grouping and OMol25 functional-group filtering with mocked and live v3 tagged indexes.
- Live visual browser pass checked desktop/mobile functional-group education copy with no page-level horizontal overflow.
- OMol25 v3 index published to `gs://shed-489901-omol25/omol25_neutral_val.v3.json` and verified over public HTTPS with 27,697 tagged records.

## Live Verification After Deploy

```bash
VERIFY_URL=https://lupi.live pnpm verify:gallery -- --no-screenshot
VERIFY_URL=https://lupi.live pnpm verify:controls -- --no-screenshot
VERIFY_URL=https://lupi.live pnpm verify:controls:mobile -- --no-screenshot
VERIFY_URL=https://lupi.live pnpm verify:study-lens -- --no-screenshot
VERIFY_URL=https://lupi.live pnpm verify:study-lens:mobile -- --no-screenshot
```

## Rollback

Use the normal viewer Cloud Run revision rollback for `lupi.live`, or revert this rollout and push through the standard main-branch deploy.
