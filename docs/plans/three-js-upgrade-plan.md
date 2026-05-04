# three.js 0.170 → 0.184 Upgrade Plan

Status: **Proposal — ready to schedule.**
Owner: AR viewer team.
Companion to: `docs/plans/meta-quest-browser-compat.md`.
Pinned today: `three@0.170.0`, `@types/three@0.170.0`.
Target: `three@^0.184.0`, `@types/three@^0.184.0` (and `@react-three/fiber@^9.6.0` along for the ride).

> **TL;DR.** Fifteen three.js minors are now between us and `latest`. None of
> them break what we use, several deliver real wins for a molecule viewer that
> lives in WebXR (better PBR energy conservation, better PMREM, modernized
> shadows, faster Quest hand-tracking session start, an `InstancedMesh.getColorAt`
> bug-fix we currently work around). Risk is concentrated in two visual checks:
> (a) PBR materials get slightly brighter at high roughness in r181, and
> (b) environment-map rotation aligns with object rotation in r184.

---

## What this upgrade gets us

### 1. Better-looking molecules, free.

Three's PBR pipeline got measurably more accurate between r170 and r184. For
us — where `MeshStandardMaterial` and `MeshPhysicalMaterial` are doing all
the work for atoms and bonds — that compounds:

| Version | Change | Why we care |
|---|---|---|
| **r181** | `"PBR materials now better conserve energy, primarily rough materials (roughness > 0.5). Rough materials tend to be a bit brighter than in previous versions."` | Most of our atom presets sit in the rough-to-mid range. We get more lifelike shading without changing any code. |
| **r181** | `"PMREM reflections have been improved."` | `<Environment>` from drei feeds PMREM. Metallic atoms (Au, Cu, Pt clusters in our demos) will reflect more cleanly. |
| **r181** | `"The way indirect specular light for PBR materials is computed has been improved."` | Indirect light is what makes a molecule feel grounded in a real room in AR. |
| **r182** | `"Improve Sheen energy conservation and analytic approximation."` | Future-proofing for "soft / fuzzy" material presets. |
| **r182** | `"Improve GGX VNDF accuracy and match Blender roughness."` | Means a roughness slider value in our viewer matches what a chemist would see in Blender screenshots. Less retraining. |
| **r184** | `"MeshPhysicalMaterial: Fix Anisotropic regression."` | Anisotropic highlights on planar / sheet structures (graphene, MoS₂) render correctly. |

### 2. Real WebXR + hand-tracking improvements (the original ask).

The Meta Quest Browser pull is layered: `@react-three/xr` is already at
`6.6.29`, but its session work flows through three's `WebXRManager`. Three
has been steadily improving that path:

| Version | Change | Why we care |
|---|---|---|
| **r172** | `"Improve WebXR layers feature testing."` | Quest browser uses XR layers heavily; better support negotiation = fewer first-frame glitches at session start. |
| **r178** | `"XRManager: Silence opaque framebuffer warning."` & `"XRRenderTarget: Clean up."` | Quieter logs and cleaner render-target lifecycle in immersive mode. |
| **r181** | `"Reset XRWebGLBinding on session end."` & `"Fix XR camera layers inheritance."` | Re-entering AR (a normal user flow when toggling between desktop and AR) no longer carries stale state. |
| **r183** | `"Fix WebXR sampling array-texture."` & `"Simplification of the frame buffer cache for WebXR layers."` | Performance and correctness for stereo render. Matters on Quest 3 at 90 Hz. |
| **r184** | `"WebXRController: Add grip update event if enabled. #33118"` | We can react to controller-grip changes in the same place we react to pose. Useful when we eventually add a controller-based fallback for the hand-grab in `XRMoleculeInteraction`. |
| **r184** | `"Added model caching to XRHandModelFactory. #33252"` | First-frame cost of showing a hand model drops. Quicker hand visibility on session entry. |

### 3. A real bug fix for our atom coloring.

| Version | Change | Why we care |
|---|---|---|
| **r184** | `"InstancedMesh, BatchedMesh: Fix getColorAt throwing an error when colors have not been set. #33079"` | We use `InstancedMesh` for atoms (`Atoms.tsx`, `AtomsOptimized.tsx`). When `colorMode === 'type'` and we briefly initialize before color buffers are populated, the upstream three throws. We work around it; r184 makes the workaround unnecessary. |
| **r184** | `"InstancedMesh: add consistent return values to functions. #33059"` | Smaller code surface for our optimized atom path; safer chaining. |
| **r184** | `"BatchedMesh: Remove deprecated instancing render paths."` | Future-proof if we ever migrate the trajectory frames to `BatchedMesh` (which we should — it's significantly faster than `InstancedMesh` for static atom subsets). |

### 4. Cleaner shadows under postprocessing.

| Version | Change | Why we care |
|---|---|---|
| **r182** | `"PCFSoftShadowMap with WebGLRenderer is now deprecated. Use PCFShadowMap which is now soft as well."` | We pass shadow type through r3f defaults; switching to `PCFShadowMap` is one line and eliminates a deprecation warning. Soft shadow quality stays the same. |
| **r183** | `"Modernized shadow mapping."` | Lighter shadow pipeline; helpful for the floating molecule + ContactShadows + EffectComposer combination we run in AR. |

### 5. Modern exporter capabilities.

We already use `USDZExporter` for Apple AR Quick Look. We're about to add a
GLB exporter for the planned Snapchat path (see
`docs/plans/snapchat-open-in-snap.md`). Three's exporters got better in
this range:

| Version | Change | Why we care |
|---|---|---|
| **r170** | `"GLTFExporter: When exporting non-PBR materials, metallicFactor is now 0 and roughnessFactor changed to 1."` | Sane defaults for non-PBR fallbacks. |
| **r177** | `"GLTFExporter pushes parent node indices first to the glTF JSON."` | Better consumer compatibility (Lens Studio, Snap, RealityKit). |
| **r184** | `"GLTFExporter: Add EXT_texture_webp support. #33117"` | Smaller GLB payload — directly impacts our < 8 MB Snap Lens budget for textured molecules. |
| **r184** | `"GLTFLoader: Fix morph target parsing. #33020"` & `"Handle zero ior edge case."` | Round-trip safety: a GLB exported and re-imported (e.g., for QA) won't drift. |

`USDZExporter` itself: **no breaking changes** documented across this
range. The deprecation in r179 is for `USDZLoader` (which we don't import).

### 6. Smaller wins worth listing.

- **r184 — `HTMLTexture`.** Lets us put rendered HTML (atom labels with
  proper subscript, formulas with MathJax-rendered glyphs) directly into
  3D textures. Currently we lay out element labels with drei's `<Text>`,
  which can't do `H₂O`. Quietly excellent for educational scenes.
- **r184 — `LightProbeGrid` (position-dependent diffuse GI).** Overkill for
  molecules but useful if we ever stage a molecule "in a lab" with mixed
  lighting (window + lamp). Optional.
- **r172** — `"Fix support for non-indexed BatchedMesh."` Future-proofs our
  switch to BatchedMesh.
- **r178** — `"NodeMaterial: Honor material.premultipliedAlpha in the
  shader."` Fixes subtle blending issues in transparent atom materials
  (glass preset).
- **r183** — `"scene.environment IBL"` is now honored by `MeshLambertMaterial`
  and `MeshPhongMaterial` too. We use Standard/Physical, so this is
  a free improvement if we ever simplify shaders.
- **r179** — `"Timer module moved into core."` Just less ceremony if we
  ever use it.

---

## What this upgrade puts at risk

### Files in our codebase that use three.js

```
atlas/atlas-view/packages/ui/src/App.tsx                 (canvas, lights, postprocessing)
atlas/atlas-view/packages/ui/src/SpatialAnchor.tsx       (group transforms, animation)
atlas/atlas-view/packages/ui/src/ExportManager.tsx       (export pipeline orchestration)
atlas/atlas-view/packages/ui/src/export/USDZExportPipeline.ts   (USDZExporter import)
atlas/atlas-view/packages/ui/src/xr/XRControlPanel.tsx   (Vector3, Object3D)
atlas/atlas-view/packages/ui/src/xr/XRMoleculeInteraction.tsx   (Plane, Ray, Vector3, Group)
atlas/atlas-view/packages/ui/src/xr/useXRHands.ts        (Vector3 only)
atlas/atlas-view/packages/scene/src/Atoms.tsx            (InstancedMesh, MeshStandardMaterial)
atlas/atlas-view/packages/scene/src/AtomsOptimized.tsx   (InstancedMesh, MeshPhysicalMaterial)
atlas/atlas-view/packages/scene/src/Bonds.tsx            (InstancedMesh, materials)
atlas/atlas-view/packages/scene/src/InterpolatedAtoms.tsx (InstancedBufferAttribute)
atlas/atlas-view/packages/scene/src/AnomalyTracker.tsx
atlas/atlas-view/packages/scene/src/SimulationCell.tsx
```

### Concrete risks to verify

#### R1 — PBR appearance shift (r181). High impact, low difficulty.

Energy-conservation correction in r181 makes high-roughness materials
slightly brighter and changes indirect-specular. Atoms rendered with
`materialPreset: 'matte'` (roughness ≈ 0.85) will look a touch brighter;
`'metallic'` (roughness ≈ 0.2) will look essentially the same. Bonds and
ContactShadows are unaffected.

**Mitigation:**
- Capture before/after screenshots of the four canonical scenes
  (`au_nanocluster`, `water_cluster`, plus one bond-heavy and one
  property-colored example).
- If the brightness shift breaks publication-figure parity, dial the
  per-preset roughness down by ~0.05 to compensate.

#### R2 — Environment-map rotation alignment (r184). Medium impact.

`"The background and environment map rotation has been aligned to how 3D
objects are rotated."` We pass an `Environment` preset in `App.tsx`. A
180° flip in environment yaw is a visible change.

**Mitigation:**
- Open every `BG_PRESETS` entry in the viewer; verify the "studio" /
  "blueprint" presets still look right. If an env now reads "backwards",
  set `<Environment ... environmentRotation={[0, Math.PI, 0]} />`.

#### R3 — `@react-three/postprocessing` peer compatibility. Low.

Pinned at `^3.0.4`. Its peer is `three: '>=0.156.0'`. Should work cleanly
at 0.184. Our `EffectComposer + SSAO + Bloom + DOF + Vignette + ToneMapping`
chain is the standard set; if anything trips, it'll be SSAO (most version-
sensitive of the postprocessing nodes).

**Mitigation:**
- Smoke test: load the demo, toggle each effect on/off, confirm no console
  errors, then run on a Quest 3.

#### R4 — Shadow-map deprecation warning (r182). Cosmetic.

`PCFSoftShadowMap` warns; switch to `PCFShadowMap`. We don't currently set
`gl.shadowMap.type` — r3f defaults handle it — so this may be silent.

**Mitigation:**
- If a deprecation warning shows in DevTools, add
  `gl={{ shadowMap: { type: THREE.PCFShadowMap } }}` to the `<Canvas>` in
  `App.tsx`.

#### R5 — `USDZExportPipeline.ts` round-trip. Low.

The USDZExporter API hasn't changed across this range (only `USDZLoader`
was deprecated). Our pipeline imports
`'three/examples/jsm/exporters/USDZExporter.js'` which is preserved.

**Mitigation:**
- After upgrade: export one molecule, AirDrop it to an iPhone, open in AR
  Quick Look, verify materials and scale.

#### R6 — Color-space API rename (r177). Cosmetic / silent.

`ColorManagement.fromWorkingColorSpace` → `workingToColorSpace`. We don't
call these directly. The rename is internal to libraries we depend on.

#### R7 — Postprocessing rename (r183). Inapplicable.

Three's TSL `PostProcessing` was renamed to `RenderPipeline`. We use
`@react-three/postprocessing`, which is a different package, so this
rename is **not** something we have to follow.

#### R8 — Library co-bumps required.

`@react-three/fiber@9.5.0` was tested against three 0.170; bumping three
also requires bumping fiber. Lockfile transitions:

| Pkg | From | To |
|---|---|---|
| `three` | 0.170.0 | 0.184.0 |
| `@types/three` | 0.170.0 | 0.184.0 |
| `@react-three/fiber` | 9.5.0 | 9.6.1 |

`@react-three/drei`, `@react-three/postprocessing`, and `@react-three/xr`
peers all accept the new ranges; no version change needed for them.

---

## Files that will probably need touching

After the version bump, expect to edit:

1. `atlas/atlas-view/packages/ui/package.json` — bump `three`, `@types/three`,
   `@react-three/fiber` specifiers.
2. `atlas/atlas-view/packages/scene/package.json` — same bumps.
3. `atlas/atlas-view/pnpm-lock.yaml` — auto-updated by `pnpm install`.
4. *(maybe)* `atlas/atlas-view/packages/ui/src/App.tsx` — environment rotation
   tweak, shadow-map type pin.
5. *(maybe)* `atlas/atlas-view/packages/ui/src/store.ts` — `materialPresets`
   roughness tuning if R1 produces too-bright matte atoms.
6. *(remove)* — any `// @ts-ignore` comments or workarounds in
   `Atoms.tsx` / `AtomsOptimized.tsx` for the `getColorAt` throw fixed in
   r184.

---

## Rollout plan

Sequence each step; do not parallelize across the bump and the visual QA.

### Phase 1 — Infrastructure (≈ 30 min, low risk)

1. On a fresh branch off the AR-viewer-polish work:
   ```
   git checkout -b chore/three-0.184-bump
   ```
2. Edit the two `package.json` files:
   ```
   "three": "^0.184.0"
   "@types/three": "^0.184.0"
   "@react-three/fiber": "^9.6.0"
   ```
3. `pnpm install` (in `atlas/atlas-view/`). Verify lockfile updates cleanly.
4. `pnpm --filter @atlas/ui test` — should still report 3/3 passing.
5. `pnpm --filter @atlas/ui run build` — `tsc --noEmit` must be clean. If
   `@types/three` introduces new strict types, fix them at this point.

### Phase 2 — Desktop visual QA (≈ 30 min)

6. `pnpm --filter @atlas/web run dev`. Open the four canonical scenes.
7. Compare screenshots to the reference set. Look specifically for:
   - **R1** — atoms feel "too bright"? (matte preset is the canary).
   - **R2** — environment HDRI rotated? Studio / blueprint backgrounds
     are the canaries.
   - **R3** — postprocessing toggle: SSAO, Bloom, DOF each on/off,
     watch for warnings or missing buffers.
   - **R4** — DevTools console: no `PCFSoftShadowMap` deprecation.
8. Toggle every `materialPreset` and `colormap`. Confirm no `getColorAt`
   exceptions.

### Phase 3 — AR / Meta Quest QA (≈ 30 min, requires headset)

9. Push the branch to a CDN-served preview build that the Quest browser
   can reach.
10. On Quest 3:
    - Tap "View AR". Confirm the entry animation eases in correctly
      (should be **better** than before due to r184 hand-model caching).
    - Pinch-grab with each hand. Throw the molecule. Verify floor bounce.
    - Tap a `XRControlPanel` button via hand pinch. Confirm event fires.
11. On Quest 2 (if available):
    - Verify session still starts (handTracking is requested as
      *optional*; no `'required'` features set).

### Phase 4 — Export QA (≈ 15 min)

12. Trigger USDZ export. AirDrop to an iPhone. Open in AR Quick Look.
    - Materials match.
    - Scale matches.
    - No "format not supported" error.

### Phase 5 — Land

13. Open PR with the diff scoped to:
    - `package.json` × 2
    - `pnpm-lock.yaml`
    - Any visual-QA-driven tweaks (rotation, shadow, roughness).
14. PR description: link this plan, link Phase 2/3 screenshots, list any
    workarounds removed.
15. Merge after review. Close the deferral note in
    `docs/plans/meta-quest-browser-compat.md` ("don't bump three yet"
    section).

---

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-05-04 | Hold three at 0.170 | No Quest device in CI; risk surface across 14 minors needs a manual smoke test. |
| 2026-05-04 | Author this plan | Quantify "later" so it doesn't slip indefinitely. |
| _(to be filled)_ | Execute Phase 1–5 | … |

## Don't bump if

- You have a hard deadline this week and no Quest device handy.
- The current `0.170` build is stable and the only AR work in flight
  doesn't touch materials or postprocessing.
- A user-reported bug points at a known-stable corner of three (don't
  rebase a hotfix on a 14-minor library bump).

## Do bump if

- You're about to add the GLB exporter for the Snap path — `EXT_texture_webp`
  in r184 is a meaningful payload reduction for that work.
- You want the `InstancedMesh.getColorAt` fix and want to delete the
  workaround.
- You have a Quest 3 in front of you and 90 minutes.
