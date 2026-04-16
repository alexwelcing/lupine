# glimPSE — Web-Native LAMMPS Visualization Platform
## V1 Product Plan: The glim Beachhead

---

## 1. Strategic Position

**Grand vision:** glim — the unified DFT + MD + ML computational materials science platform.

**First product:** glimPSE — a WebGPU-powered web application for LAMMPS molecular dynamics visualization that produces publication-quality images, cinematic video, and interactive explorations directly in the browser with zero installation.

**Why a web app, not a Python library:**

| Factor | Python Library | Web Platform (our choice) |
|--------|---------------|--------------------------|
| Installation | pip install, Rust toolchain builds, version conflicts | Zero. Open a URL. |
| 3D rendering | pythreejs/ipywidgets (fragile, Jupyter-dependent) | WebGPU native — 10M+ atoms at 60fps |
| Collaboration | Export PNGs, email files | Share a URL. Full scene state encoded. |
| Video export | ffmpeg dependency, manual scripting | WebCodecs API — hardware-accelerated in browser |
| Publication quality | matplotlib (2D), POV-Ray (requires install) | Real-time SSAO, DOF, bloom — what you see is what you export |
| Platform lock-in | Works only in Python environments | Works on any device with a browser — phone, tablet, HPC portal |
| Community reach | Python-literate researchers only | Any researcher, any student, any PI reviewing results |
| Technology moat | Competing with seaborn, plotly — crowded | WebGPU + R3F for molecular viz — virtually no competition |

**The wedge:** Every LAMMPS user currently does one of three things to visualize results:
1. Opens OVITO (desktop install, paid Pro for quality features)
2. Writes 50+ lines of matplotlib (2D only, no 3D atoms)
3. Struggles with VMD (1990s UI, memory explosions)

glimPSE: **drag a dump file into the browser, get publication-quality 3D visualization in 2 seconds.**

---

## 2. Competitive Gap — The Opportunity

### The Paid Wall Problem

OVITO is the gold standard, but:
- OVITO Pro (required for ray-tracing, time-averaging, spatial binning) is **paid per seat, per year**
- OVITO Basic is free but lacks the features researchers actually need for papers
- The company explicitly states they "cannot give away OVITO Pro free of charge for academic projects"
- Apple Silicon issues plague Mac users
- Desktop-only — no sharing, no collaboration

### The Scale Problem

- OVITO's OpenGL renderer caps at ~134M spherical particles
- VMD consumes 220GB RAM for a 4GB trajectory
- Neither tool leverages GPU compute — they're CPU-bound for analysis
- Video export takes hours (4+ hours reported for large systems)

### The Web Gap

- Molstar: excellent for biomolecules, but WebGL (not WebGPU), no LAMMPS support
- 3Dmol.js: caps at ~10K atoms usefully
- NGL Viewer: biomolecular focus, aging codebase
- **Nobody has built a WebGPU molecular visualization platform for materials science**

### Our Position

| Capability | OVITO Pro | OVITO Basic | VMD | Molstar | **glimPSE** |
|------------|----------|-------------|-----|---------|---------------|
| Platform | Desktop | Desktop | Desktop | Web (WebGL) | **Web (WebGPU)** |
| Install | Yes | Yes | Yes | No | **No** |
| Cost | $$$/yr | Free | Free | Free | **Free forever** |
| Max atoms (interactive) | ~134M | ~134M | ~100M | ~1M | **10M+ target** |
| LAMMPS native | ✅ | ✅ | Partial | ❌ | **✅** |
| Ray-traced quality | Pro only | ❌ | Tachyon (slow) | ❌ | **Real-time SSAO/DOF** |
| Video export | Slow (hours) | Slow | Multi-step | Basic | **Fast (WebCodecs)** |
| Collaboration | File-based | File-based | File-based | URL sharing | **URL + real-time** |
| License | Proprietary | MIT (limited) | Free (not OSS) | MIT | **Apache 2.0** |

---

## 3. Product Definition

### 3.1 Core Experience

```
User drags dump.lammpstrj into browser window
  → File parsed by WebAssembly/JS streaming parser
  → First frame renders in < 2 seconds via WebGPU impostor pipeline  
  → Timeline shows all frames with thermo sparklines
  → User rotates, zooms, colors by property, toggles effects
  → Exports 4K PNG or 1080p MP4 directly from browser
  → Copies shareable URL encoding full scene state
```

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Rendering | WebGPU + Three.js + React Three Fiber | Compute shaders for 10M+ atoms, declarative scene graph |
| Sphere rendering | Impostor (raycast in fragment shader) | Orders of magnitude faster than mesh spheres |
| Post-processing | @react-three/postprocessing | SSAO, DOF, bloom, tone mapping — publication quality |
| UI framework | React 19 + TypeScript | Modern component architecture, strong ecosystem |
| State management | Zustand | Lightweight, React-native, URL-serializable |
| File parsing | Rust → WebAssembly (wasm-pack) | 10× faster than JS for large binary/text parsing |
| Video export | WebCodecs API | Hardware-accelerated encoding, no server needed |
| Animation | react-spring | Smooth trajectory playback, camera transitions |
| Build | Vite + turborepo | Fast dev server, monorepo for multiple packages |
| Deployment | Static site (Vercel/Cloudflare Pages) | Zero backend, CDN-distributed, instant global access |

### 3.3 Architecture

```
glimPSE/
├── packages/
│   ├── core/                        # Shared types, constants, utilities
│   │   ├── src/
│   │   │   ├── types.ts             # AtomData, Frame, Trajectory, ThermoDB
│   │   │   ├── units.ts             # LAMMPS unit style handling
│   │   │   └── colors.ts            # Color maps (viridis, inferno, coolwarm, etc.)
│   │   └── package.json
│   │
│   ├── parsers/                     # File format parsers
│   │   ├── wasm/                    # Rust → WebAssembly parsers
│   │   │   ├── src/
│   │   │   │   ├── dump.rs          # LAMMPS dump (text, gzip, binary)
│   │   │   │   ├── data.rs          # LAMMPS data file
│   │   │   │   ├── log.rs           # LAMMPS log file (line, multi, yaml)
│   │   │   │   └── lib.rs           # wasm-bindgen exports
│   │   │   └── Cargo.toml
│   │   ├── src/
│   │   │   ├── index.ts             # Parser orchestration + web worker pool
│   │   │   ├── streaming.ts         # Progressive file loading
│   │   │   └── workers/             # Web Worker scripts for off-thread parsing
│   │   └── package.json
│   │
│   ├── renderer/                    # WebGPU rendering pipeline
│   │   ├── src/
│   │   │   ├── pipeline/
│   │   │   │   ├── AtomPipeline.ts  # Impostor sphere pipeline
│   │   │   │   ├── BondPipeline.ts  # Cylinder impostor pipeline
│   │   │   │   ├── SurfacePipeline.ts # Isosurface rendering
│   │   │   │   └── PointPipeline.ts # Point sprite fallback
│   │   │   ├── shaders/
│   │   │   │   ├── atom.wgsl        # WebGPU sphere impostor shader
│   │   │   │   ├── bond.wgsl        # Cylinder impostor shader
│   │   │   │   ├── culling.wgsl     # GPU frustum/occlusion culling
│   │   │   │   └── colormap.wgsl    # Per-atom color mapping compute
│   │   │   ├── lod/
│   │   │   │   ├── LODManager.ts    # Distance-based LOD transitions
│   │   │   │   └── BVH.ts           # Bounding volume hierarchy
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── scene/                       # R3F scene components
│   │   ├── src/
│   │   │   ├── Atoms.tsx            # <Atoms data={} colorBy={} />
│   │   │   ├── Bonds.tsx            # <Bonds topology={} />
│   │   │   ├── SimulationCell.tsx    # <SimulationCell box={} />
│   │   │   ├── SelectionBox.tsx     # Rectangle selection tool
│   │   │   ├── Measurement.tsx      # Distance/angle measurement
│   │   │   ├── Camera.tsx           # Orbital camera with smooth controls
│   │   │   └── Effects.tsx          # SSAO, DOF, bloom, AA composition
│   │   └── package.json
│   │
│   ├── ui/                          # React UI components
│   │   ├── src/
│   │   │   ├── App.tsx              # Root app component
│   │   │   ├── Viewport.tsx         # 3D viewport wrapper
│   │   │   ├── Timeline.tsx         # Frame scrubber + thermo sparklines
│   │   │   ├── panels/
│   │   │   │   ├── StylePanel.tsx   # Color, representation, display
│   │   │   │   ├── EffectsPanel.tsx # Post-processing toggles
│   │   │   │   ├── ExportPanel.tsx  # Image/video/share export
│   │   │   │   └── AnalysisPanel.tsx # RDF, MSD, density profile
│   │   │   ├── overlays/
│   │   │   │   ├── StatsOverlay.tsx # FPS, atom count, VRAM
│   │   │   │   ├── ThermoOverlay.tsx # Live thermo sparklines
│   │   │   │   └── LegendOverlay.tsx # Color map legend
│   │   │   ├── FileDropZone.tsx     # Drag-and-drop file loading
│   │   │   └── store.ts            # Zustand state (URL-serializable)
│   │   └── package.json
│   │
│   └── export/                      # Image and video export
│       ├── src/
│       │   ├── screenshot.ts        # High-res PNG/JPEG capture
│       │   ├── video.ts             # WebCodecs MP4/WebM encoder
│       │   ├── sequence.ts          # Image sequence export
│       │   └── share.ts             # URL state encoding/decoding
│       └── package.json
│
├── apps/
│   └── web/                         # Main web application
│       ├── src/
│       │   ├── main.tsx
│       │   └── index.html
│       ├── public/
│       │   └── examples/            # Pre-loaded example datasets
│       └── vite.config.ts
│
├── turbo.json
├── package.json
└── README.md
```

### 3.4 Rendering Pipeline Detail

```
Frame Data (Float32Array positions, Uint8Array types)
    │
    ▼
┌──────────────────────────────────────┐
│  Compute Pass: Culling + Color Map   │  WebGPU compute shader
│  - Frustum cull (BVH traversal)      │  Input: atom positions, camera frustum
│  - Occlusion cull (HiZ buffer)       │  Output: visible atom indices + colors
│  - Per-atom color from property      │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│  Indirect Draw: Impostor Quads       │  WebGPU render pass
│  - 1 quad per visible atom           │  Vertex: expand to screen-aligned quad
│  - Fragment: raycast sphere           │  Fragment: sphere intersection → normal,
│  - Write depth buffer correctly      │  depth, material → G-buffer
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│  Post-Processing (R3F)               │  Three.js effect pipeline
│  - SSAO from depth + normals         │
│  - Depth of field (bokeh)            │
│  - Bloom (HDR glow)                  │
│  - Tone mapping + AA                 │
└──────────────────────────────────────┘
    │
    ▼
  Screen / Export Buffer
```

**Performance targets:**
- 1M atoms @ 60fps (baseline)
- 10M atoms @ 30fps (target)
- 50M atoms @ 15fps (stretch)
- Video export: 10× faster than OVITO for equivalent quality

### 3.5 File Format Support

**V1.0 (launch):**
| Format | Read | Description |
|--------|------|-------------|
| LAMMPS dump (text) | ✅ | `dump atom`, `dump custom` with arbitrary columns |
| LAMMPS dump (gzip) | ✅ | `.gz` compressed dump files |
| LAMMPS data file | ✅ | Atom coordinates + topology (bonds, angles) |
| LAMMPS log file | ✅ | Thermo data (line, multi, yaml styles) |
| XYZ | ✅ | Extended XYZ with properties |

**V1.1:**
| Format | Read | Description |
|--------|------|-------------|
| LAMMPS binary dump | ✅ | Faster parsing for large files |
| LAMMPS restart | ✅ | Binary restart files |
| VASP POSCAR/CONTCAR | ✅ | Bridge to DFT community |
| CIF | ✅ | Crystallographic data |
| PDB | ✅ | Protein Data Bank format |

---

## 4. Development Roadmap

### Phase 1: Foundation (Weeks 1–6) — "It renders atoms"

**Parsers (Rust → WASM):**
- [ ] LAMMPS dump text parser (streaming, web worker)
- [ ] LAMMPS log file parser (thermo extraction)
- [ ] LAMMPS data file parser
- [ ] Progressive loading with first-frame-fast

**Rendering:**
- [ ] WebGPU device initialization + fallback detection
- [ ] Impostor sphere pipeline (WGSL vertex + fragment shaders)
- [ ] Per-atom color mapping (type, property)
- [ ] Simulation cell wireframe
- [ ] Orbital camera (drag rotate, scroll zoom, right-click pan)

**UI:**
- [ ] File drop zone (drag & drop or click to upload)
- [ ] Basic side panel (color by, display toggles)
- [ ] Timeline scrubber with frame counter
- [ ] Stats overlay (FPS, atom count, VRAM)

**Milestone:** Drag a LAMMPS dump file into the browser → see 3D atoms in < 2 seconds

### Phase 2: Quality (Weeks 7–10) — "It looks amazing"

**Post-processing:**
- [ ] Screen-space ambient occlusion (SSAO)
- [ ] Depth of field (bokeh)
- [ ] Bloom + HDR tone mapping
- [ ] FXAA / MSAA anti-aliasing

**Export:**
- [ ] High-resolution PNG/JPEG (up to 8K)
- [ ] WebCodecs MP4 video export with progress indicator
- [ ] Image sequence export (for external video tools)

**Thermo visualization:**
- [ ] Sparkline overlays for T, PE, KE, P
- [ ] Synchronized thermo view under timeline
- [ ] Multi-run log support

**Milestone:** Export a 4K image with SSAO that matches OVITO Pro quality

### Phase 3: Scale (Weeks 11–16) — "It handles real data"

**Performance:**
- [ ] GPU-driven indirect rendering (compute → draw indirect)
- [ ] Hierarchical frustum culling via BVH
- [ ] Level-of-detail system (points → impostors → mesh)
- [ ] Streaming frame loader (IndexedDB cache for trajectories)
- [ ] Binary dump format support

**Analysis:**
- [ ] Atom selection (click, box select)
- [ ] Distance and angle measurement
- [ ] Property histograms
- [ ] Coordination number overlay

**Milestone:** 10M atoms at 30fps with smooth trajectory playback

### Phase 4: Collaboration (Weeks 17–22) — "It's shareable"

**Sharing:**
- [ ] URL-encoded scene state (camera, colors, effects, frame)
- [ ] MolViewSpec-compatible scene specification
- [ ] Embed mode for papers (iframe-friendly, minimal chrome)

**Community:**
- [ ] Example gallery with pre-loaded simulations
- [ ] LAMMPS tutorial integration (link from LAMMPS docs)
- [ ] Custom color gradient builder
- [ ] Preset scenes for common systems (FCC metal, water, polymer)

**Milestone:** Share a URL → colleague opens identical visualization in their browser

---

## 5. Launch & Adoption Strategy

### 5.1 The "Wow Moment" Launch

The launch is designed around a single tweet-sized demo:

> "Drag a LAMMPS dump file into your browser. 
> Get publication-quality 3D visualization in 2 seconds.
> No install. No license. No Python.
> https://view.glim-sim.org"

Accompanied by a 15-second screen recording showing:
1. Drag file → instant render
2. Rotate, zoom, color by stress
3. Toggle SSAO → cinematic quality
4. Export 4K PNG → done

### 5.2 Distribution Channels

| Channel | Action | Timeline |
|---------|--------|----------|
| LAMMPS Discourse (matsci.org) | Post demo with example files | Launch week |
| LAMMPS documentation | Submit PR to add to visualization tools page | Week 2 |
| r/comp_chem, r/physics | Demo post with GIF | Launch week |
| Twitter/X #compchem | Thread with video demos | Launch week |
| APS March Meeting | Poster / demo session | Next conference |
| CECAM workshops | Tutorial integration | Month 3 |
| JOSS submission | Short paper for citability | Month 2 |
| Awesome LAMMPS | Submit to curated list | Week 1 |
| Google Scholar | Ensure indexability for researchers | Month 2 |

### 5.3 Bridge to glim

| Timeline | Product Evolution |
|----------|-----------------|
| Month 1–4 | glimPSE — LAMMPS visualization |
| Month 5 | Add VASP POSCAR/CONTCAR/CHGCAR support |
| Month 6 | Add isosurface rendering for charge density |
| Month 8 | Rebrand section: "glimPSE + glim IO" |
| Month 10 | Announce glim platform with glimPSE as the visualization layer |
| Month 12 | glim DFT alpha uses glimPSE for output visualization |

The Rust/WASM parsers become `glim-io`.
The scene graph becomes the visualization layer for the full platform.
The URL-sharing system becomes the collaboration backbone.

---

## 6. Why This Wins

### 6.1 Against OVITO

- **Zero install vs. desktop app** — researchers can visualize from any machine, any browser
- **Free SSAO/DOF vs. paid Pro** — publication quality without license fees  
- **URL sharing vs. file export** — send a link, not a screenshot
- **WebGPU compute vs. OpenGL** — future-proof architecture that scales beyond 134M particle limit
- **Hardware video export vs. hours-long renders** — WebCodecs does in minutes what takes OVITO hours

### 6.2 Against "write matplotlib scripts"

- **3D atoms vs. 2D plots** — researchers need to see their structures
- **One drag vs. 50 lines of code** — no coding required
- **Interactive vs. static** — rotate, zoom, scrub trajectory

### 6.3 Against VMD

- **2025 web tech vs. 1995 architecture** — no 220GB memory spikes
- **Instant access vs. complex install** — no Tcl scripting
- **Materials science focus vs. biomolecular focus** — optimized for LAMMPS, not PDB files

---

## 7. Success Metrics

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Monthly active users | 100 | 1,000 | 5,000 | 20,000 |
| Files visualized | 500 | 10,000 | 100,000 | 500,000 |
| Images/videos exported | 100 | 5,000 | 50,000 | 200,000 |
| GitHub stars | 100 | 500 | 2,000 | 5,000 |
| URLs shared | 50 | 1,000 | 10,000 | 50,000 |
| Listed on lammps.org | ❌ | ✅ | ✅ | ✅ |
| JOSS paper | ❌ | Submitted | Published | Cited 20× |
| "Used glimPSE" in papers | 0 | 5 | 50 | 200 |

**North star:** Files dragged into glimPSE per month. Every file is a researcher choosing us over OVITO.

---

## 8. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebGPU browser adoption gaps | High | WebGL2 fallback renderer (reduced quality but functional) |
| Large file handling in browser | High | Streaming parser + IndexedDB cache + Web Worker pool |
| GPU memory limits for 10M+ atoms | Medium | LOD system + hierarchical culling + frame streaming |
| LAMMPS format edge cases | Medium | Community testing + comprehensive test suite + gradual format support |
| Performance gap vs native OVITO | Medium | Accept for V1; WebGPU compute closes gap over time |
| Three.js WebGPU renderer maturity | Medium | Custom pipeline for atoms; Three.js for post-processing only |

---

*"Drag a file. See your atoms. Export your paper figure. Share a link."*

---

*Product: glimPSE v1.0*
*Ship target: 6 months (foundation + quality + scale)*
*Parent project: glim — Atomic-scale Theory, Learning, and Simulation*
