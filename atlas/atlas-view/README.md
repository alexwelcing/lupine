# ATLAS View — Developer Getting Started

> WebGPU-powered LAMMPS molecular dynamics visualization.
> Drag a dump file into your browser. Publication quality in 2 seconds.

---

## Quick Start

### Prerequisites

```bash
# Rust toolchain (for WASM parsers)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# wasm-pack (builds Rust → WASM with JS bindings)
cargo install wasm-pack

# Node.js 20+ and pnpm
corepack enable
```

### Clone & Build

```bash
git clone https://github.com/atlas-sim/atlas-view.git
cd atlas-view

# Install JS dependencies
pnpm install

# Build WASM parsers (Rust → WebAssembly)
pnpm build:wasm

# Start dev server
pnpm dev

# Open http://localhost:5173
```

### Run Tests

```bash
# Rust parser unit tests
pnpm test:rust

# Full test suite
pnpm test
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Tab                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              React UI (apps/web)                   │   │
│  │  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │   │
│  │  │  Viewport     │  │  Timeline  │  │  Panels   │ │   │
│  │  │  (R3F Canvas) │  │  (scrub)   │  │  (style/  │ │   │
│  │  │               │  │            │  │   export) │ │   │
│  │  └──────┬────────┘  └─────┬──────┘  └─────┬─────┘ │   │
│  └─────────┼─────────────────┼────────────────┼───────┘   │
│            │                 │                │            │
│  ┌─────────▼─────────────────▼────────────────▼───────┐   │
│  │            Zustand Store (packages/ui)              │   │
│  │  frame, colorMode, effects, camera, playback state  │   │
│  └─────────┬──────────────────────────────────────────┘   │
│            │                                              │
│  ┌─────────▼──────────────────────┐  ┌────────────────┐  │
│  │  Scene Components (scene/)      │  │  WASM Parsers  │  │
│  │  <Atoms>  <Bonds>  <Cell>       │  │  (Rust→WASM)   │  │
│  │  <Effects> <Camera>             │  │                │  │
│  └─────────┬───────────────────────┘  │  dump parser   │  │
│            │                          │  log parser    │  │
│  ┌─────────▼───────────────────────┐  │  data parser   │  │
│  │  WebGPU Renderer (renderer/)    │  └───────┬────────┘  │
│  │                                 │          │           │
│  │  ┌──────────┐  ┌────────────┐  │  ┌───────▼────────┐  │
│  │  │ Compute  │  │  Render    │  │  │  Web Workers   │  │
│  │  │ Pass     │  │  Pass      │  │  │  (off-thread   │  │
│  │  │ (cull +  │→ │ (impostor  │  │  │   parsing)     │  │
│  │  │  color)  │  │  spheres)  │  │  └────────────────┘  │
│  │  └──────────┘  └────────────┘  │                      │
│  └────────────────────────────────┘                      │
│                                                          │
│  GPU Memory:                                             │
│  ├── Position buffer (Float32, natoms × 3)               │
│  ├── Type buffer (Int32, natoms)                         │
│  ├── Property buffer (Float32, natoms)                   │
│  ├── Color buffer (Float32, natoms × 4) ← compute pass  │
│  ├── Visible index buffer ← compute pass                 │
│  └── Indirect draw buffer ← compute pass                 │
└─────────────────────────────────────────────────────────┘
```

---

## Package Structure

### `packages/parsers/wasm/` — Rust WASM Parsers

The performance-critical file parsing layer. Compiled to WebAssembly via `wasm-pack`.

**Key files:**
| File | Purpose |
|------|---------|
| `src/dump.rs` | LAMMPS dump file parser (text, gzip). Handles `dump atom` and `dump custom` with arbitrary columns, scaled/unscaled coordinates. |
| `src/log.rs` | LAMMPS log file parser. Extracts thermo data from `line`, `multi`, and `yaml` output styles across multiple `run` commands. |
| `src/data.rs` | LAMMPS data file parser (TODO). Reads atom coordinates, topology, masses. |
| `src/types.rs` | Shared Rust types with `#[wasm_bindgen]` exports. `Frame` and `ThermoData` are the main outputs. |

**Why Rust → WASM?**
- 10× faster than JavaScript for parsing large text files
- Streaming parser doesn't load entire file into memory
- Pre-built `.wasm` binary means users don't need Rust installed
- Same Rust code will become `atlas-io` in the full ATLAS platform

**Key API (from JavaScript):**
```typescript
import init, { parseDump, parseDumpFrame, countDumpFrames, parseLog } from 'atlas-parsers';

await init(); // Load WASM module

// Parse entire dump file
const frames = parseDump(fileContent);

// Parse single frame by index (memory-efficient)
const frame = parseDumpFrame(fileContent, 42);

// Count frames without full parse (instant)
const n = countDumpFrames(fileContent);

// Parse log file
const thermo = parseLog(logContent);
const temps = thermo.getColumn(0, 'Temp'); // Float64Array
```

### `packages/renderer/` — WebGPU Rendering Pipeline

Custom WebGPU pipeline for rendering millions of atoms at interactive rates.

**Key files:**
| File | Purpose |
|------|---------|
| `shaders/atom.wgsl` | Impostor sphere vertex + fragment shader. Screen-aligned quads with per-fragment ray-sphere intersection for correct depth and normals. |
| `shaders/culling.wgsl` | Compute shader for GPU-driven frustum culling and per-atom color mapping. Builds indirect draw buffer entirely on GPU. |
| `pipeline/AtomPipeline.ts` | TypeScript orchestration of the WebGPU render pipeline — buffer creation, bind groups, draw calls. |

**Rendering approach:**
1. **Compute pass** — `culling.wgsl` runs on ALL atoms in parallel
   - Tests each atom against 6 frustum planes
   - Writes visible atoms to output buffers
   - Computes per-atom color from type or property value
   - Atomically increments indirect draw count
2. **Render pass** — `atom.wgsl` draws only visible atoms
   - Instanced rendering: 4 vertices × N_visible instances
   - Vertex shader expands each atom to a screen-aligned quad
   - Fragment shader raycasts into the quad to find sphere surface
   - Writes correct depth for proper atom-atom occlusion
   - Phong lighting with ambient, diffuse, specular, and rim

**Performance characteristics:**
- 0 CPU per-atom work (all on GPU)
- 4 vertices per atom (vs. 100s for mesh spheres)
- Indirect draw → single draw call for all atoms
- Memory: ~28 bytes/atom (pos:12 + radius:4 + color:16 – shared with culling output)

### `packages/core/` — Shared Types & Utilities

TypeScript types, color maps, unit style definitions, and URL state serialization.

### `packages/scene/` — React Three Fiber Components

Declarative R3F components that compose the 3D scene:
```tsx
<Canvas>
  <Camera state={cameraState} />
  <Atoms frame={currentFrame} colorMode="type" />
  <Bonds topology={topology} />
  <SimulationCell bounds={boxBounds} />
  <Effects ssao bloom dof />
</Canvas>
```

### `packages/ui/` — React Application Shell

The UI chrome: file drop zone, side panels, timeline, overlays. State managed via Zustand with URL serialization for shareable links.

### `packages/export/` — Image & Video Export

- **PNG/JPEG**: Capture canvas at arbitrary resolution (up to 8K) using WebGPU render-to-texture
- **Video**: WebCodecs API for hardware-accelerated MP4/WebM encoding
- **Share**: Full scene state encoded in URL parameters

---

## The Rendering Pipeline in Detail

### 1. Impostor Sphere Technique

Traditional approach: Tessellate each atom as a mesh sphere (128+ triangles).
Our approach: Each atom is a screen-aligned quad (2 triangles). The fragment shader
raycasts a ray from the camera through each pixel and intersects with the atom's sphere.

```
Traditional mesh sphere:       Impostor (our approach):
  ~128 triangles/atom           2 triangles/atom
  1M atoms = 128M tris         1M atoms = 2M tris
  Slow at scale                 64× less geometry
```

The fragment shader:
1. Receives the quad's UV coordinate (where on the quad is this pixel?)
2. Constructs a ray from the camera through this pixel
3. Solves the ray-sphere intersection equation (quadratic formula)
4. If the ray misses the sphere → `discard` (transparent pixel)
5. If hit: computes surface normal, depth, and applies Phong lighting
6. Writes correct depth to the depth buffer (atoms properly occlude each other)

### 2. GPU-Driven Culling

Without culling, we'd render atoms behind the camera, inside other atoms, etc.
Our compute shader runs BEFORE the render pass:

```
Compute: for each atom (parallel on GPU):
  if atom is inside camera frustum:
    append to visible buffer (atomic increment)
    compute color from property
  else:
    skip (don't render)

Render: draw visible_count instances (from indirect buffer)
```

This means:
- The CPU never touches per-atom data
- Draw call count = 1 (regardless of atom count)
- Culling is O(N) parallel on GPU

### 3. Post-Processing Stack

After the main render pass, Three.js post-processing applies:
- **SSAO** (Screen-Space Ambient Occlusion): Darkens crevices between closely packed atoms, giving a sense of depth. This is the #1 feature that makes output look "publication quality."
- **Depth of Field**: Blurs atoms far from a focus plane, mimicking camera optics. Great for highlighting a specific region.
- **Bloom**: Subtle glow effect for bright atoms (useful when coloring by kinetic energy).
- **Tone Mapping**: ACES filmic mapping for realistic color response.
- **Anti-Aliasing**: FXAA or MSAA for smooth edges.

---

## Key Design Decisions

### Why WebGPU over WebGL?

| Feature | WebGL | WebGPU |
|---------|-------|--------|
| Compute shaders | ❌ | ✅ (essential for culling) |
| Indirect drawing | ❌ | ✅ (GPU-driven rendering) |
| Storage buffers | ❌ | ✅ (flexible data layout) |
| Performance | ~5M atoms | ~50M atoms (10×) |
| Fallback | N/A | WebGL2 fallback available |

### Why React Three Fiber?

- Declarative scene composition (React patterns)
- Massive ecosystem: post-processing, controls, helpers
- TypeScript-first with excellent type inference
- Hot module reload during development
- Easy integration with React UI components

### Why Rust → WASM for parsing?

- LAMMPS dump files can be 100+ GB
- JavaScript string parsing is slow for scientific data
- Rust's zero-cost abstractions give C-level performance
- `wasm-pack` generates clean JS bindings automatically
- Same Rust code becomes `atlas-io` in the full ATLAS platform

### Why Zustand for state?

- Minimal boilerplate (vs. Redux)
- URL-serializable (essential for shareable links)
- Works outside React components (for imperative GPU operations)
- Subscriptions with selectors (only re-render what changed)

---

## Contributing

### First Good Issues

1. **Add LAMMPS binary dump support** — extend `dump.rs` to handle binary format
2. **Add XYZ file parser** — simple format, good first Rust contribution
3. **Implement bond detection** — distance-based bond calculation in compute shader
4. **Add colormap presets** — more scientific colormaps in `culling.wgsl`
5. **WebGL2 fallback** — mesh sphere renderer for browsers without WebGPU

### Development Workflow

```bash
# Start dev server with hot reload
pnpm dev

# After modifying Rust parsers, rebuild WASM
pnpm build:wasm

# Run Rust tests
pnpm test:rust

# Type-check TypeScript
pnpm typecheck

# Build for production
pnpm build
```

---

## License

Apache 2.0 — Free forever. No Pro tiers. No seat limits.

Part of **ATLAS** — Atomic-scale Theory, Learning, and Simulation.
