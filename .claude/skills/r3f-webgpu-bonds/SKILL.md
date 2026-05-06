---
name: r3f-webgpu-bonds
description: Pinned focus skill for atlas-view's bond + atom rendering pipeline. Loads first; overrides generic advice. Updated post bond/render polish release (2026-05-06).
---

# r3f-webgpu-bonds

The single working context for atlas-view's bond + atom rendering. **This skill steers all work in `glim/atlas/atlas-view/` until the user says otherwise.** Ignore generic frontend / backend / studio-zero / python / go / docker patterns — they don't apply here.

## Mission

60 fps live MD visualization for ≥100k atoms / ≥200k bonds, browser WebGPU + WebGL hybrid (R3F 9.6 + Three 0.184). Bond detection on either CPU spatial-hash worker or WebGPU compute pipeline. Per-element material identity for the entire periodic table. Five color schemes × five postprocess presets, smart-defaulted on file load.

**State as of 2026-05-06**: bond detection + rendering is shipped and validated. Phase-2 full WebGPU rendering has its foundation laid (helpers + shaders + pipeline class) but isn't wired (needs WebGPU rendering context).

## Authoritative files — go directly, don't search

### Bond detection
| File | Role |
|------|------|
| `packages/scene/src/bondDetectCpu.ts` | Pure CPU spatial-hash detection (extracted from worker, importable for tests) |
| `packages/scene/src/bondReference.ts` | O(N²) brute-force oracle + diff helpers (the trusted reference) |
| `packages/scene/src/bondWorker.ts` | Thin Web Worker shell that imports bondDetectCpu |
| `packages/renderer/src/pipeline/BondPipeline.ts` | WebGPU 3-pass compute orchestrator |
| `packages/renderer/src/shaders/bond_compute.wgsl` | clear → build → detect compute kernels |
| `packages/scene/src/__tests__/bondFixtures.ts` | 12 synthetic fixtures with rationale |

### Rendering
| File | Role |
|------|------|
| `packages/scene/src/Bonds.tsx` | Bond rendering (MeshPhysicalMaterial + onBeforeCompile patches; matrix in useFrame, attributes in useEffect) |
| `packages/scene/src/AtomsOptimized.tsx` | Atom impostor sphere shader (Cook-Torrance + IBL + emission) |
| `packages/scene/src/useBondGpuPipeline.ts` | React hook owning WebGPU device + BondPipeline lifecycle |
| `packages/scene/src/materials/` | Per-element material profiles (118 elements, 12 categories, 13 hero overrides + 3 radioactives) |

### Phase-2 (foundation only)
| File | Role |
|------|------|
| `packages/renderer/src/pipeline/BondRenderPipeline.ts` | WebGPU bond render pipeline (compiles standalone, not yet wired) |
| `packages/renderer/src/pipeline/BondRenderHelpers.ts` | `createUnitCylinderBuffers`, `createElementPaletteBuffer`, `patchIndirectFor2xInstances` |
| `packages/renderer/src/shaders/bond_render.wgsl` | Vertex + fragment shaders for direct GPU bond rendering |

### UI / system
| File | Role |
|------|------|
| `packages/ui/src/store.ts` | Zustand store. Notable fields: `colorScheme`, `atomColorSource`, `postprocessPreset`, `postprocessIntensity`, `propertyEmissionStrength`, `useGpuBonds`, `gpuBondsStatus`, `bondSource`, `lastBondCount` |
| `packages/ui/src/coloring/colorSchemes.ts` | Five Color Schemes (Element/Property/Family/Botanical/Uniform) |
| `packages/ui/src/postprocess/presets.ts` | Five Director's Presets + IBL env config + drei `<Environment>` mapping |
| `packages/ui/src/postprocess/ScenePostprocessing.tsx` | Composer with stable keying (only remounts on enabled-effects change) |
| `packages/ui/src/DevProbe.tsx` | dev-only: window.__atlas (store, three, perf, loadFromURL) |
| `packages/ui/src/StateInspector.tsx` | dev-only: top-right HUD with live state |
| `packages/ui/src/panels/VisualsPanel.tsx` | Color scheme picker, property emission slider, bond compute backend |
| `packages/ui/src/panels/EffectsPanel.tsx` | Postprocess preset gallery + intensity slider |
| `tools/verify-viewer.mjs` | Playwright harness: --headless / --measure / --stress / --radioactive / --file=<url> / --preset=<name> |

## Performance invariants (do not regress)

- ≥ 60 fps for 100k atoms / 200k bonds on RTX-class GPU, ≥ 30 fps on integrated.
- **Zero allocation in `useFrame`.** No `new Float32Array(...)`, no `new THREE.Object3D()`, no `.map()`.
- Single bulk `Float32Array.set()` per upload — never per-instance setMatrixAt.
- `frustumCulled: false` on instanced meshes (we manage culling).
- Material created once per mode; `onBeforeCompile` runs once; uniforms reach in via shared ref or store-driven props.
- WebGPU buffers persist across frames; staging buffers are pooled (3 slots round-robin).

## Pitfalls — what bit me, what's solved, what's still risky

### Solved (don't reintroduce)

1. **vColor vec3/vec4 dimension mismatch** in shader patches — always write `vColor.rgb = mix(...)`, never `vColor = mix(vec3, ...)` because Three sometimes makes vColor a vec4 (USE_COLOR_ALPHA).
2. **Negative-coord atoms silently dropped** in WGSL `bond_compute.wgsl` — `Config.origin` translation was added; `get_cell_coords()` subtracts origin. Don't remove this.
3. **R3F `<instancedMesh>` doesn't resize instanceMatrix on count change** — use `key={capacity}` to force remount.
4. **Geometry-attached attributes (colorT, radiusBT) don't grow with capacity in a setAttribute useEffect** — construct them INSIDE the `tubeGeo` useMemo, key tubeGeo on capacity. Mesh remount via key={capacity} picks up the fresh geometry.
5. **Metals went black under Cook-Torrance** (no diffuse + no env) — F0 ambient term fakes environment, plus drei `<Environment>` provides real HDRI to MeshPhysicalMaterial bonds.
6. **Worker double-init in StrictMode** — `useEffect` runs twice in dev, cleanup must `worker.terminate()` (it does).
7. **InstanceMatrix.needsUpdate timing on WebXR remount** — `setTimeout(() => upload(), 0)` in `onMeshRef` (rAF is paused during XR session entry).
8. **WebGPU staging buffer overlapping mapAsync** — pooled 3-deep staging; round-robin allocation.

### Still risky

- **Zustand selector identity** — passing inline objects/arrays to selectors triggers re-render storms. Use `shallow` or split selectors.
- **uploadBonds during interpolation** — uploadBondMatrices runs every rAF (in useFrame); skip via `lastMatrixKeyRef` dirty check on stable scenes.
- **Atom shader stays on synthetic IBL** — bonds (MeshPhysicalMaterial) get HDRI from `scene.environment` automatically; atoms don't (custom ShaderMaterial). PMREM equirect sampling in atom shader is queued.
- **Phase-2 not wired** — BondRenderPipeline + helpers + shader exist, but no WebGPU rendering context. R3F is WebGL by default.

## Color and postprocess: the two directorial axes

Both follow the same pattern: **directorial choice as first-class state, smart-defaulted on file load, contextual controls only when the choice needs them**.

### Color schemes (5)
- **Element**: natural element colors (Cu warm, Au gold, O red). For multi-element files.
- **Property**: colormap of selected per-atom scalar. Auto-selected when file has property data.
- **Family**: colormap by type rank (legacy default). For single-type files.
- **Botanical**: plant palette + soft material. Storytelling shots.
- **Uniform**: single color. Material speaks.

### Postprocess presets (5)
- **Paper**: print-faithful neutral. drei env: apartment.
- **Studio**: balanced default. drei env: studio.
- **Editorial**: moody dark. drei env: night.
- **Cinematic**: shallow focus + bloom + warm sunset HDRI. drei env: sunset.
- **Diagram**: no postprocess. No HDRI.

Single intensity slider scales the active preset 0..2. Bonds (MeshPhysicalMaterial) automatically reflect the drei HDRI.

## Material identity (per-element)

256×2 RGBA palette texture, indexed by `instanceTypeId`:
- Row 0 (v=0.25): metalness, roughness, anisotropy, subsurface
- Row 1 (v=0.75): emission RGB + intensity

12 categories cover all 118 elements via atomic-number → category mapping in `elementProfiles.ts`. 13 hero overrides for famous elements (Cu, Au, Fe, etc.). 3 radioactive emission profiles (Ra green, U blue, Pu orange).

Adding a new hero override: append to `ELEMENT_OVERRIDES` in `elementProfiles.ts`. One line + obvious template.

## Verification harness — mandatory for any visual change

```pwsh
cd atlas/atlas-view
node tools/verify-viewer.mjs --headless                          # standard 64-atom Cu/Au/O/H
node tools/verify-viewer.mjs --headless --radioactive            # U/Ra/Pu/Au — emission test
node tools/verify-viewer.mjs --headless --stress                 # 4096-atom dense
node tools/verify-viewer.mjs --headless --measure                # 5×3 preset×scheme matrix
node tools/verify-viewer.mjs --headless --file=graphene_ribbon_8k.xyz  # real LAMMPS file
node tools/verify-viewer.mjs --headless --preset=cinematic       # specific preset
```

Outputs: state snapshots to stdout, screenshots to `.verify-artifacts/`. Headless software-rasterized — absolute FPS values are noise; deltas are the signal.

**Pattern**: typecheck verifies values; harness verifies pixels. Run both for any visual change.

## What's deferred / queued

- **Phase-2 full WebGPU rendering**: needs WebGPU rendering context (Three.WebGPURenderer migration or hybrid second canvas). Foundation is ready; wire-up ~30 lines once context lands.
- **Atom-shader HDRI**: PMREM equirect sampling in custom shader. Pays off when Phase-2 lands.
- **Bond LOD via geometry swap**: current distance fade saves fragment cost; geometry swap saves vertex cost. For very-large systems where bond submission dominates.
- **MobileHUD legacy toggles**: still expose individual ssao/bloom/dof; should map to scheme/preset.
- **URL-encoded color scheme**: `colorScheme` not in `encodeToURL`.

## Companion memory

Save findings under `r3f_*` prefix. Recent series in chronological order:
- `r3f_bondpipeline_negative_coord_fix_2026_05_06` — original WGSL bug fix
- `r3f_gpu_bond_integration_2026_05_06` — wired BondPipeline into Bonds.tsx
- `r3f_bond_differential_testing_2026_05_06` — Path B oracle + 24 fixtures
- `r3f_bond_gradient_color_2026_05_06` — A→mid→B gradient
- `r3f_postprocess_director_rebuild_2026_05_06` — 5 directorial presets
- `r3f_verification_loop_2026_05_06` — Playwright harness
- `r3f_element_material_identity_2026_05_06` — periodic table material profiles
- `r3f_color_scheme_system_2026_05_06` — 5 color schemes
- `r3f_perf_harness_panel_trim_2026_05_06` — DevProbe FPS, panel cleanup
- `r3f_capacity_ratchet_remount_fix_2026_05_06` — `key={capacity}` fix
- `r3f_bond_capacity_shrink_upload_split_2026_05_06` — shrink + upload split
- `r3f_bond_matrix_useframe_2026_05_06` — uploadBondMatrices in useFrame
- `r3f_bond_stability_phase2_foundation_2026_05_06` — content-equality skip + Phase-2 helpers
- `r3f_atom_shader_cook_torrance_2026_05_06` — Cook-Torrance + Burley + subsurface
- `r3f_atom_ibl_emission_2026_05_06` — synthetic IBL + per-element emission
- `r3f_tier1_polish_complete_2026_05_06` — IBL coupling + property emission + bond LOD + MeshPhysical
- `r3f_real_files_three_more_2026_05_06` — real-file validation + 3 queued items
- `r3f_release_prep_2026_05_06` — pre-flight check, what's in/out for release
