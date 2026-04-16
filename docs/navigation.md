# glim Repo Navigation Guide

Quick-search codemap for finding things fast. All paths are relative to the repo root
(`C:\Users\alexw\Downloads\shed\glim`).

> **Note:** TypeScript LSP (go-to-definition, find-references, hover types) is not available
> in this environment. Use `grep` for symbol search and `glob` for file discovery — those
> are the reliable tools here.

---

## Top-Level Layout

```
glim/
├── atlas/                         # All glim content
│   ├── atlas-view/                # Production monorepo (TypeScript + Rust WASM)
│   ├── glim-architecture.jsx      # Presentation artifact
│   ├── glim-presentation.jsx      # Presentation artifact
│   ├── glimPSE-*.jsx              # Prototype/demo artifacts (NOT production app)
│   ├── glim-project-plan.md       # Full-stack glim platform plan
│   ├── openDFT-project-plan.md    # OpenDFT (VASP-compatible DFT) plan
│   ├── glimPSE-product-plan.md    # Python library product strategy (superseded)
│   ├── glimPSE-web-product-plan.md # Web app product strategy (current)
│   └── glimPSE-example-gallery.md  # Curated LAMMPS example datasets
├── docs/                          # This directory
├── deep-research-report.md        # LAMMPS ecosystem research (see research-index.md)
├── ancillary-research-opps.md     # 2025–2026 people/labs/methods landscape
├── foundational-research.md       # Original brief + advisory council prospectus
└── example-research-papers.md     # Curated downloadable LAMMPS simulation files
```

---

## atlas/atlas-view — Monorepo Structure

Package manager: **pnpm 9** · Build orchestration: **turbo 2**

```
atlas/atlas-view/
├── apps/
│   └── web/                       # @glim/web — Vite app (browser entry point)
│       ├── src/main.tsx           # React root; dynamic imports @glim/ui/App
│       ├── src/styles/global.css
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   ├── core/                      # @glim/core — shared types only
│   │   └── src/
│   │       ├── types.ts           # Frame, Trajectory, ThermoData, VisualizationState, ColormapName, UnitStyle
│   │       └── index.ts
│   ├── parsers/                   # @glim/parsers — file parsing (JS + WASM)
│   │   └── src/
│   │       ├── index.ts           # Public API: parseDumpFile, parseLogFile, parseFile, detectFileType
│   │       └── workers/
│   │           └── parse.worker.ts  # Web worker: receives text, calls WASM, posts typed arrays
│   │   └── wasm/src/              # Rust WASM (wasm-bindgen)
│   │       ├── lib.rs             # Entry: init, re-exports dump/log/data/types
│   │       ├── dump.rs            # LAMMPS dump parser (parse_dump, count_dump_frames)
│   │       ├── log.rs             # LAMMPS log/thermo parser (parse_log)
│   │       ├── data.rs            # LAMMPS data file parser
│   │       └── types.rs           # Rust Frame struct, serde
│   ├── renderer/                  # @glim/renderer — WebGPU pipeline (low-level, optional)
│   │   └── src/
│   │       ├── pipeline/
│   │       │   └── AtomPipeline.ts  # GPU buffers, compute culling, indirect draw
│   │       └── shaders/
│   │           ├── atom.wgsl      # Vertex/fragment: impostor sphere rendering
│   │           └── culling.wgsl   # Compute: frustum culling + color mapping
│   ├── scene/                     # @glim/scene — React Three Fiber components
│   │   └── src/
│   │       ├── Atoms.tsx          # <Atoms /> InstancedMesh renderer; colormaps; CPK colors
│   │       ├── SimulationCell.tsx # <SimulationCell /> box wireframe
│   │       └── index.ts
│   └── ui/                        # @glim/ui — app shell + state
│       └── src/
│           ├── App.tsx            # Root component: Canvas, panels, timeline, keyboard shortcuts
│           ├── store.ts           # Zustand store (useStore): all app state + actions
│           ├── FileDropZone.tsx   # Drag-and-drop overlay
│           └── panels/
│               ├── StylePanel.tsx   # Color mode, colormap, atom scale, background
│               ├── EffectsPanel.tsx # SSAO, bloom, DOF, tone mapping, antialiasing
│               └── ExportPanel.tsx  # PNG/video export
├── package.json                   # Root workspace scripts (pnpm + turbo)
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

---

## Important Files by Concern

### File Parsing
| File | What it does |
|------|-------------|
| `packages/parsers/src/index.ts` | JS orchestration: reads File → sends to worker → hydrates typed arrays. Exports `parseDumpFile`, `parseLogFile`, `parseFile`, `detectFileType`. Handles `.gz` decompression. |
| `packages/parsers/src/workers/parse.worker.ts` | Web worker; loads WASM, dispatches `parse-dump` / `parse-log` messages, emits progress events via `glim:parse-progress` CustomEvent |
| `packages/parsers/wasm/src/dump.rs` | Rust: parses LAMMPS dump (atom/custom format), supports Cartesian and scaled coords, triclinic boxes |
| `packages/parsers/wasm/src/log.rs` | Rust: parses LAMMPS log thermo data (multi-run) |
| `packages/parsers/wasm/src/lib.rs` | WASM entry; sets panic hook; re-exports `dump`, `log`, `data`, `types` |

### App State
| File | What it does |
|------|-------------|
| `packages/ui/src/store.ts` | Single Zustand store (`useStore`). Holds: file, frame, colorMode, colormap, propRange, display flags (showCell, showAxes, showBonds), effects (ssao, bloom, dof, toneMapping, antialiasing), playback (playing, playbackSpeed, loopMode), camera, activePanel. Actions: `setFrame`, `nextFrame`, `prevFrame`, `togglePlay`, `encodeToURL`, `decodeFromURL`, `reset`, plus per-field setters/toggles. URL state serialized as base64 JSON into `?s=` query param. |
| `packages/core/src/types.ts` | `VisualizationState` and `DEFAULT_STATE` (the canonical type; `store.ts` has its own flat `AppState` but mirrors these fields) |

### Shared Types
| File | Key exports |
|------|------------|
| `packages/core/src/types.ts` | `Frame` (timestep, natoms, boxBounds, positions Float32Array, types Int32Array, properties Map), `Trajectory` (frames[], totalFrames, atomTypes[], globalBounds), `ThermoData`, `ThermoRun`, `VisualizationState`, `ColorMode`, `ColormapName`, `UnitStyle`, `UNIT_LABELS`, `THERMO_QUANTITIES`, `encodeState`, `decodeState` |

### 3D Scene (React Three Fiber)
| File | What it does |
|------|-------------|
| `packages/scene/src/Atoms.tsx` | `<Atoms frame colorMode colorProperty colormap propRange scale />` — THREE.InstancedMesh, CPK-inspired type colors (8 types), per-type radii, colormaps: viridis/inferno/coolwarm/plasma/magma/cividis |
| `packages/scene/src/SimulationCell.tsx` | `<SimulationCell bounds color opacity />` — draws simulation box wireframe |

### WebGPU Renderer (low-level pipeline)
| File | What it does |
|------|-------------|
| `packages/renderer/src/pipeline/AtomPipeline.ts` | `AtomPipeline` class: allocates GPU storage buffers (positions, types, properties, visible-*, indirect draw), creates compute pipelines (reset + culling), creates render pipeline (impostor spheres, triangle-strip). Methods: `uploadFrame`, `updateCamera`, `updateCullUniforms`, `encode`. Also exports `initWebGPU`. |
| `packages/renderer/src/shaders/culling.wgsl` | Compute shader: frustum cull atoms, map colors, write to visiblePosition/Radii/Color buffers, atomic-increment indirect draw count |
| `packages/renderer/src/shaders/atom.wgsl` | Vertex/fragment: renders each visible atom as an impostor sphere quad (triangle-strip, 4 vertices per instance) |

### UI Shell & Panels
| File | What it does |
|------|-------------|
| `packages/ui/src/App.tsx` | Full app: top bar (logo, file info, panel buttons, GitHub link), Canvas with OrbitControls + EffectComposer (SSAO, Bloom, ToneMapping, Vignette), stats overlay, timeline with transport controls + scrubber + speed selector. Keyboard: Space=play, ←/→=frames, S/E/X=panels |
| `packages/ui/src/FileDropZone.tsx` | Drag-and-drop overlay; calls `parseFile` from `@glim/parsers`, dispatches to store |
| `packages/ui/src/panels/StylePanel.tsx` | Color mode (type/property/uniform), colormap selector, property selector, atom scale, background preset |
| `packages/ui/src/panels/EffectsPanel.tsx" | SSAO intensity, bloom intensity, DOF focus, tone mapping, antialiasing |
| `packages/ui/src/panels/ExportPanel.tsx` | Image/video export controls |

### App Entry
| File | What it does |
|------|-------------|
| `apps/web/src/main.tsx` | `createRoot` → dynamic `import('@glim/ui/App')` → `<Suspense><App/></Suspense>`. Has graceful error rendering if import fails. |
| `apps/web/vite.config.ts` | Vite config; includes `vite-plugin-wasm` and `vite-plugin-top-level-await` for WASM support |

### Plans & Presentations (atlas/ root)
| File | What it is |
|------|-----------|
| `atlas/glim-project-plan.md` | Full-stack platform charter: DFT + MD + ML unified pipeline |
| `atlas/openDFT-project-plan.md` | VASP-compatible DFT engine plan with Delta Codes benchmark strategy |
| `atlas/glimPSE-product-plan.md` | Earlier Python library strategy (superseded by web app approach) |
| `atlas/glimPSE-web-product-plan.md` | Current web app product strategy; competitive analysis vs OVITO |
| `atlas/glimPSE-example-gallery.md` | 12 curated LAMMPS example datasets (crack, indent, LJ melt, granular, etc.) |
| `atlas/glim-*.jsx` + `atlas/glimPSE-*.jsx` | Presentation and prototype artifacts — see below |

### JSX Presentation Files (atlas/ root)
These are **standalone presentation/prototype artifacts**, not part of the production app.
They are self-contained React components (no build step needed for viewing in tools like
Claude artifacts or CodeSandbox) used for design exploration and stakeholder communication.

| File | Purpose |
|------|---------|
| `atlas/glim-architecture.jsx` | System architecture diagram / slide |
| `atlas/glim-presentation.jsx` | Full slide deck presentation |
| `atlas/glimPSE-app.jsx` | App UI prototype mockup |
| `atlas/glimPSE-demo.jsx` | Interactive demo concept |
| `atlas/glimPSE-preview.jsx` | Preview/landing concept |
| `atlas/glimPSE-gallery.jsx` | Gallery UI prototype |
| `atlas/glimPSE-mobile.jsx` | Mobile layout prototype (v1) |
| `atlas/glimPSE-mobile-v2.jsx` | Mobile layout prototype (v2) |
| `atlas/glimPSE-publication.jsx` | Publication-quality output prototype |
| `atlas/glimPSE-real-data.jsx" | Real data visualization concept |
| `atlas/glimPSE-timeseries.jsx` | Timeseries/thermo plot concept |
| `atlas/glimPSE-3d-melt.jsx` | 3D melt simulation visualization concept |
| `atlas/glimPSE-3d-smooth.jsx` | 3D smooth rendering concept |

---

## Common Commands

Run from `atlas/atlas-view/` (the monorepo root):

```bash
pnpm dev              # turbo run dev — start Vite dev server (hot reload)
pnpm build            # turbo run build — tsc + vite build all packages
pnpm build:wasm       # wasm-pack build Rust parser → packages/parsers/pkg/
pnpm test             # turbo run test
pnpm test:rust        # cargo test (in packages/parsers/wasm/)
pnpm lint             # turbo run lint
pnpm clean            # turbo run clean
```

Run from `atlas/atlas-view/apps/web/` (app only):

```bash
pnpm dev              # vite (dev server only)
pnpm build            # tsc && vite build
pnpm preview          # vite preview (serve built dist/)
```

The built output lands in `apps/web/dist/`. The compiled WASM asset is
`apps/web/dist/assets/glim_parsers_bg-*.wasm`.

---

## Quick Grep / Glob Recipes

### "Where is file parsing?"
```bash
# JS orchestration layer
grep -r "parseDumpFile\|parseLogFile\|detectFileType" atlas/atlas-view/packages/parsers/src/index.ts

# Web worker (WASM bridge)
grep -r "parse-dump\|parse-log\|parseDump\|parseLog" atlas/atlas-view/packages/parsers/src/workers/

# Rust WASM implementations
grep -rn "pub fn\|#\[wasm_bindgen\]" atlas/atlas-view/packages/parsers/wasm/src/
```

### "Where is app state?"
```bash
# All state fields and actions in one file
grep -n "^\s\+\(set\|toggle\|next\|prev\|encode\|decode\|reset\|file\|frame\|playing\|colorMode\|ssao\|bloom\)" \
  atlas/atlas-view/packages/ui/src/store.ts

# Find every useStore call in the app
grep -rn "useStore" atlas/atlas-view/packages/
```

### "Where is rendering?"
```bash
# WebGPU pipeline class
grep -n "class AtomPipeline\|uploadFrame\|encode\|createBuffers\|createPipelines" \
  atlas/atlas-view/packages/renderer/src/pipeline/AtomPipeline.ts

# WGSL shaders
glob "**/*.wgsl" atlas/atlas-view

# R3F scene components (Three.js)
grep -rn "InstancedMesh\|<Atoms\|<SimulationCell\|useRef.*Mesh" atlas/atlas-view/packages/scene/
```

### "Where is the 3D canvas set up?"
```bash
grep -n "<Canvas\|OrbitControls\|EffectComposer\|<SSAO\|<Bloom" \
  atlas/atlas-view/packages/ui/src/App.tsx
```

### "What fields does Frame have?"
```bash
grep -A 15 "interface Frame" atlas/atlas-view/packages/core/src/types.ts
```

### "What are all exported types from core?"
```bash
grep "^export" atlas/atlas-view/packages/core/src/types.ts
```

### "Where does URL state serialize?"
```bash
grep -n "encodeToURL\|decodeFromURL\|btoa\|atob" atlas/atlas-view/packages/ui/src/store.ts
```

### "What colormaps are available?"
```bash
grep -n "ColormapName\|COLORMAPS\|viridis\|inferno\|coolwarm\|plasma\|magma\|cividis" \
  atlas/atlas-view/packages/core/src/types.ts \
  atlas/atlas-view/packages/scene/src/Atoms.tsx
```

### "Where does drag-and-drop file loading happen?"
```bash
grep -rn "FileDropZone\|drop\|glim:parse-progress\|parseFile" atlas/atlas-view/packages/ui/src/
```

### "What WASM functions are exported to JS?"
```bash
grep -n "wasm_bindgen\|js_name" atlas/atlas-view/packages/parsers/wasm/src/dump.rs
grep -n "wasm_bindgen\|js_name" atlas/atlas-view/packages/parsers/wasm/src/log.rs
```

### "What research doc covers X?"
```bash
# Full-text search across all root research docs
grep -rn "keyword" deep-research-report.md ancillary-research-opps.md \
  foundational-research.md example-research-papers.md

# Search planning docs
grep -rn "keyword" atlas/glim-project-plan.md atlas/openDFT-project-plan.md \
  atlas/glimPSE-product-plan.md atlas/glimPSE-web-product-plan.md
```

### Find all source files by type
```bash
# All TypeScript/TSX in atlas-view
glob "**/*.ts" atlas/atlas-view/packages
glob "**/*.tsx" atlas/atlas-view/packages

# All Rust source
glob "**/*.rs" atlas/atlas-view/packages/parsers/wasm/src

# All WGSL shaders
glob "**/*.wgsl" atlas/atlas-view

# All JSX presentation artifacts
glob "*.jsx" atlas
```

---

## Package Dependency Graph

```
@glim/web (apps/web)
  └── @glim/ui        → App.tsx, store.ts, panels
       ├── @glim/scene → Atoms.tsx, SimulationCell.tsx
       │    └── @glim/core  → types.ts
       ├── @glim/parsers → index.ts + parse.worker.ts + WASM
       │    └── @glim/core
       └── @glim/renderer → AtomPipeline.ts + WGSL
            └── (no internal deps)
```

`@glim/core` is the only package with no internal dependencies.
`@glim/renderer` is the WebGPU low-level path; the current production app uses
`@glim/scene" (React Three Fiber / Three.js) for actual rendering.

---

## Key Runtime Data Flow

```
User drops .lammpstrj
       ↓
FileDropZone (packages/ui/src/FileDropZone.tsx)
       ↓
parseDumpFile (packages/parsers/src/index.ts)
  → readFileAsText (handles .gz decompression)
  → Worker.postMessage('parse-dump', text)
       ↓
parse.worker.ts (web worker)
  → ensureWasm() → init() [loads glim_parsers_bg.wasm]
  → parseDump(text) [Rust: dump.rs]
  → postProgress events → window 'glim:parse-progress'
  → postMessage('frames', result)
       ↓
parseDumpFile resolves → Trajectory (typed arrays)
       ↓
useStore.getState().setFile({ name, size, trajectory, thermo })
       ↓
App.tsx re-renders → currentFrame → <Atoms frame=... />
       ↓
Atoms.tsx → InstancedMesh matrices + colors updated
```
