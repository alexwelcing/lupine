# glim Glossary

Terminology index for glim research and development. Organized by domain.

---

## Materials Science Terms

### Potentials & Force Fields

| Term | Definition |
|------|-------------|
| **EAM** (Embedded Atom Method) | Many-body potential commonly used for metals. Embedding function + pair terms. |
| **MEAM** (Modified EAM) | Extension of EAM with angular dependencies. |
| **ReaxFF** (Reactive Force Field) | Bond-order potential for reactive MD, handles bond formation/breaking. |
| **Tersoff** | Bond-order potential for covalent materials (Si, C, Ge). |
| **LAMMPS** | Large-scale Atomic/Molecular Massively Parallel Simulator — MD code. |
| **MLIP** (Machine Learning Interatomic Potential) | Neural network potentials (DeePMD, MACE, NequIP) trained on DFT data. |
| **DeePMD** | Deep learning potential with embedding networks. |
| **MACE** | Equivariant message-passing neural network potential. |
| **NequIP** | Neural Equivariant Interatomic Potentials. |
| **FitSNAP** | Fitting SNAP potentials — spectral neighbor analysis potential. |
| **SNAP** | Spectral Neighbor Analysis Potential. |
| **ACE** (Atomic Cluster Expansion) | Framework for efficient atomic descriptors. |

### Simulation Methods

| Term | Definition |
|------|-------------|
| **DFT** (Density Functional Theory) | Quantum mechanical method for electronic structure. |
| **MD** (Molecular Dynamics) | Classical particle simulation using force fields. |
| **PIMD** (Path Integral MD) | Quantum dynamics using ring polymers. |
| **MC** (Monte Carlo) | Stochastic sampling method. |
| **PBC** (Periodic Boundary Conditions) | Replicates simulation box infinitely. |
| **NVE** | Microcanonical ensemble (constant N, V, E). |
| **NVT** | Canonical ensemble (constant N, V, T). |
| **NPT** | Isobaric-isothermal ensemble (constant N, P, T). |

### Analysis

| Term | Definition |
|------|-------------|
| **RDF** (Radial Distribution Function) | g(r) — probability density of finding atoms at distance r. |
| **MSD** (Mean Squared Displacement) | <Δr²(t)> — measures diffusion. |
| **Coordination Number** | Number of nearest neighbors within cutoff. |
| **Stress Tensor** | 3×3 matrix describing forces per unit area. |
| **OVITO** | Visualization and analysis tool for MD (paid Pro version). |
| **VMD** | Visual Molecular Dynamics — older visualization tool. |

### Benchmarks

| Term | Definition |
|------|-------------|
| **Delta Codes** | DFT benchmark comparing total energies across elemental crystals. |
| **Δ-factor** | RMS energy difference per atom vs. reference (target: <1 meV/atom). |

---

## LAMMPS Ecosystem

| Term | Definition |
|------|-------------|
| **dump file** | LAMMPS output containing atomic positions per timestep. |
| **lammpstrj** | Common dump file extension. |
| **log file** | LAMMPS output containing thermodynamic data (temp, energy, etc.). |
| **data file** | LAMMPS input file with initial configuration + topology. |
| **thermo** | Thermodynamic output (Temperature, Energy, Pressure, etc.). |
| **KOKKOS** | Performance portability library for GPUs/HPs in LAMMPS. |
| **pair_style** | LAMMPS command specifying interaction potential. |
| **fix** | LAMMPS command for perturbations, thermostats, etc. |
| **compute** | LAMMPS command for calculating properties. |
| **OpenKIM** | Open Knowledgebase of Interatomic Models. |
| **Pizza.py** | Python toolkit for LAMMPS analysis (older). |

---

## glim Tech Stack

### Web & Graphics

| Term | Definition |
|------|-------------|
| **WebGPU** | Next-gen web graphics API with compute shaders. |
| **WebGL** | Current web graphics API (no compute shaders). |
| **WASM** (WebAssembly) | Binary format runnable in browsers at near-native speed. |
| **wgsl** | WebGPU Shading Language. |
| **R3F** (React Three Fiber) | React renderer for Three.js. |
| **Three.js** | JavaScript 3D library. |
| **Zustand** | Lightweight React state management. |
| **Vite** | Fast JavaScript build tool. |
| **Turbo** (Turborepo) | Monorepo build orchestration. |

### Rendering Techniques

| Term | Definition |
|------|-------------|
| **Impostor spheres** | Render each atom as a quad; fragment shader raycasts sphere. |
| **InstancedMesh** | Single draw call for many identical geometries. |
| **Indirect draw** | GPU builds draw buffer; single draw call regardless of atom count. |
| **Frustum culling** | Skip rendering atoms outside camera view. |
| **SSAO** (Screen Space Ambient Occlusion) | Post-process darkening for depth perception. |
| **DOF** (Depth of Field) | Blur based on distance from focus plane. |
| **Bloom** | Glow effect for bright areas. |
| **Tone mapping** | Map HDR colors to display range (ACES filmic). |

### Parsing

| Term | Definition |
|------|-------------|
| **wasm-pack** | Build Rust → WASM with JS bindings. |
| **wasm-bindgen** | Generate JS bindings from Rust. |
| **Web Worker** | Background thread for parsing without blocking UI. |
| **Streaming parser** | Process data incrementally without loading all into memory. |

---

## glim Project Structure

| Term | Definition |
|------|-------------|
| **glimPSE** | WebGPU-powered LAMMPS visualization web app (current focus). |
| **glimPSE** | The monorepo in `atlas/glimPSE/`. |
| **@glim/core** | Shared types package. |
| **@glim/parsers** | File parsing package (dump, log, data). |
| **@glim/scene** | R3F scene components package. |
| **@glim/renderer** | Low-level WebGPU pipeline package. |
| **@glim/ui** | App shell and panels package. |
| **@glim/web** | Vite app entry point. |

---

## File Extensions

| Extension | File Type |
|-----------|-----------|
| `.lammpstrj` | LAMMPS dump file (text trajectory) |
| `.dump` | Alternative dump file extension |
| `.log` | LAMMPS log/thermo file |
| `.data` | LAMMPS data file (initial config) |
| `.lmp` | Alternative LAMMPS data extension |
| `.wgsl` | WebGPU Shading Language |
| `.tsx` | TypeScript React component |
| `.rs` | Rust source file |

---

*See docs/navigation.md for codebase navigation. See docs/research-index.md for research document index.*
