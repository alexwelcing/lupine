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
  - Adds a university-style ochem frame: course unit, professor-order reasoning steps, mechanism priorities, and first-pass spectroscopy checks.
  - Adds an active learning loop: observe, predict, explain, and transfer.
  - Adds revealable practice checks so students make a prediction before seeing the professor-style answer and rationale.
  - Adds common-trap coaching for mistakes like treating every carbonyl as equally reactive or using aromaticity as a decorative label instead of a stability model.
  - Adds a materials-science curriculum lens built around structure, processing, properties, and performance.
  - Adds Data truth / provenance guardrails so bonds, scalar columns, coordinates, and curriculum prompts are labeled by evidence source.
- Study features now carry into immersive AR / VR:
  - The in-world instructor dashboard opens in Study mode by default.
  - Shows formula, atoms, bond provenance, functional-group handles, course unit, mechanism priorities, spectroscopy cue, and selected atom context.
  - Lets learners step through the same professor-order reasoning prompts while the molecule is placed in space.
  - Includes the first practice prompt and answer so AR mode still feels like a study companion, not just a visualizer.
  - Includes materials and evidence cues so immersive mode does not overclaim source topology or properties.
- A new **Study sheet** export:
  - Available from Controls -> Export.
  - Captures the current rendered molecule view and embeds it in the printable / save-to-PDF sheet.
  - Does not invent bond counts when source topology is absent; viewer-drawn links are labeled as visual guides rather than source bonds.
  - Includes molecule summary, university ochem frame, mechanism priorities, functional groups, spectroscopy checks, composition, selected atoms, and frame properties.
  - Now prints the same learning loop, practice checks, and common traps as the live Study Lens so the exported sheet matches the configured learning view.
  - Now prints Data Provenance, Materials Science Frame, characterization checks, and source-column interpretation notes.
- OMol25 is ready for the same functional-group language with provenance intact: the offline indexer derives method-screen tags from real coordinates, the OMol provider can facet and filter by those tags, and the OMol collection page labels them as a geometry screen rather than OMol25 source bond topology.
- UI polish pass:
  - The homepage hero now opens around the 953,312-atom FCC copper scale scene, with direct controls for orbit, slicing, color, and density states before users reach the gallery.
  - The homepage now has a crawlable first-impression proof section that explains scale, organic chemistry study value, materials datasets, and data-truth boundaries before the gallery.
  - A new public `/scenes/1m-copper-lattice` page gives the 953,312-atom copper scale test its own shareable route, social metadata, JSON-LD, and sitemap entry.
  - Route-level SEO now updates titles, descriptions, canonical URLs, social preview images, and structured data for the homepage and 1M copper lattice scene.
  - SEO now has a shared route manifest and build-time static HTML generation for crawler-ready route metadata before React loads.
  - New public study/materials routes explain `/study/organic-functional-groups` and `/materials/omol25` with dedicated titles, descriptions, canonical URLs, social images, JSON-LD, sitemap entries, footer links, and agent-readable guidance.
  - A broader search-intent cluster now covers `/study/functional-group-examples`, `/study/organic-chemistry-3d-molecule-viewer`, `/materials/omol25-molecule-geometry`, and `/materials/million-atom-viewer` with visible education copy, route-specific metadata, JSON-LD, sitemap entries, footer links, and agent-readable guidance.
  - OMol25 SEO copy explicitly preserves the data boundary: real DFT XYZ geometry and method-derived functional-group screens, without claiming source bond topology when the source does not provide it.
  - Cloud Run now serves generated SEO route `index.html` files generically for extensionless canonical URLs, avoiding nginx directory redirects to internal `:8080` URLs as the cluster grows.
  - `.glimbin` loading now survives static hosts that ignore HTTP Range requests by slicing the returned full file instead of attempting to decompress the wrong byte span.
  - Study Lens now has a clearer first-viewport hierarchy, stronger practice-check affordances, and safer wrapping for long course labels.
  - OMol25 now reads more like a serious data browser, with steadier typography, fixed-size periodic-table labels, dashboard-like stats, and refined filter/result chips.
  - The main viewer shell now has more intentional glass tool islands for camera, Study Lens, Controls, loaded-file status, and trajectory frame status.
  - The Controls drawer, Studio deck, segmented buttons, sliders, knobs, selects, and swatches now share one higher-fidelity tactile language.
  - The gallery workbench, source tabs, functional-group rail, domain rows, result table, and selected-molecule spotlight now match the same polished scientific UI standard.

## Why It Matters

- The viewer controls now feel organized around user intent instead of implementation history.
- Shared links preserve visual state, making collaboration and support easier.
- The gallery starts becoming a teaching and exploration system, not just a list of files.
- The viewer itself now helps students ask better questions while inspecting a molecule, and the printed sheet gives instructors and learners a durable artifact for class notes, labs, and review sessions.
- The Study Lens is now organized around how first-course organic chemistry is actually taught: identify handles, assign electronics, choose the first mechanism move, make a prediction, debug common mistakes, and transfer the idea to a related molecule.
- The viewer now distinguishes source bonds from viewer bond guides, and source scalar columns from unsupported property claims.
- The first homepage moment now proves scale and control immediately: a real nearly million-atom lattice is the primary action, while gallery discovery remains a supporting path.
- Public search and share surfaces now describe what Lupi can prove on first load: a controllable million-atom-class lattice, educational organic examples, OMol25-linked structures, and an explicit refusal to invent bonds or unsupported properties.
- The organic chemistry grouping model is data-backed and test-guarded, so future curated molecule sets can grow without silently pointing to unavailable assets.
- OMol25 can graduate from element/formula browsing into ochem study workflows without fetching every structure in the browser, while keeping source coordinates separate from method-derived screens and display bond guides.

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
# Browser-check / and /scenes/1m-copper-lattice for route metadata, layout,
# social image wiring, and no desktop/mobile horizontal overflow.
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

SEO / scene-route addendum verified on 2026-06-16 PT:

- `git diff --check`: clean.
- UI TypeScript build: clean.
- Web production build: clean.
- Gallery verifier: 20/20 checks passing.
- Controls verifier: desktop and mobile profiles passing.
- Browser pass checked `/`, `/scenes/1m-copper-lattice`, and `/?sim=massive_1m` on the production build:
  - Homepage and scene route update title, description, canonical URL, OG/Twitter metadata, and route JSON-LD.
  - Clean scene route loads with root-relative bundle assets.
  - Desktop and mobile layouts have no horizontal overflow.
  - The 1M scene CTA lands in the real viewer with the loaded-file chrome, canvas, Controls, and scale bar visible.

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
