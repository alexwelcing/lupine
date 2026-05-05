---
name: glim-repo
description: "Comprehensive repository navigation and subsystem patterns for the glim / Lupine Materials Science monorepo."
user-invocable: true
emoji: "🐺"
homepage: https://github.com/alexwelcing/lupine
tags:
  - glim
  - lupine
  - materials-science
  - monorepo
  - molecular-dynamics
  - interatomic-potentials
---

# glim-repo — Repository Navigation Skill

## Architecture Overview

This is a multi-language scientific computing monorepo centered on **molecular dynamics (MD) simulation**, **interatomic potential validation**, and **WebGPU visualization**.

### Core Mission
Open-source scientific engine for the geometric and statistical analysis of interatomic potential prediction errors.

### Language Mix
- **Rust** — High-performance engines, visualization, CLI tools
- **TypeScript/React** — Web platforms, viewer, serverless workers
- **Python** — Data science, MLIP benchmarking, research agents, paper figures
- **Lean 4** — Formal theorem proving for validation specs
- **LaTeX** — Peer-reviewed paper (IMMI journal)

---

## Subsystem Deep Dives

### atlas-distill — The Scientific Engine
**Path:** `atlas-distill/`  
**Lang:** Rust  
**Key Crates:** clap, nalgebra, serde, tokio, reqwest, pulldown-cmark

16 CLI subcommands:
- `validate` — Full FCC/BCC elastic constant validation
- `manifold` — PCA/SVD hyper-ribbon detection
- `meta-analyze` — Random-effects meta-analysis
- `detect-paradox` — Simpson's paradox detection
- `nist` — NIST IPR benchmark runner
- `auto-research` — Literature-driven hypothesis generation
- `bootstrap` — Bootstrap uncertainty quantification
- `literature` — CrossRef/arXiv fetching
- `lean-export` — Formalization export to Lean 4

**Entry:** `cargo run --bin atlas-distill -- <subcommand>`

### atlas-view — WebGPU Molecular Visualization
**Path:** `atlas/atlas-view/`  
**Lang:** TypeScript, Rust→WASM  
**Build:** pnpm + turbo + Vite + wasm-pack

**Packages:**
- `packages/parsers/wasm/` — Rust WASM parsers (dump, data, log)
- `packages/renderer/` — WebGPU pipelines (Atom, Bond, Surface, Point)
- `packages/scene/` — R3F components (Atoms, Bonds, SimulationCell, Camera)
- `packages/ui/` — React UI (panels, timeline, export, store)
- `packages/core/` — Shared types, units, colormaps
- `packages/export/` — Screenshot, video, sequence, share
- `apps/web/` — Main web application
- `apps/remotion-trailer/` — Trailer video generation

**Key Performance Targets:**
- 1M atoms @ 60fps
- 10M atoms @ 30fps
- Video export via WebCodecs API

**Entry:** `pnpm dev` (from `atlas/atlas-view/`)

### glim-think — Serverless Research Orchestration
**Path:** `glim-think/`  
**Lang:** TypeScript  
**Runtime:** Cloudflare Workers + Durable Objects (SQLite + R2)

**Agents mapped from Rust:**
- `ManifoldFacet` — Geometric analysis
- `CausalFacet` — Causal inference
- `TheoristFacet` — Hypothesis generation
- `ExperimentFacet` — Benchmark execution
- `OrchestratorThink` — Workflow coordination

**Entry:** `wrangler dev` or `wrangler deploy`

### lean-spec — Formal Methods
**Path:** `lean-spec/`  
**Lang:** Lean 4  
**Build:** lake

47 theorems across 10 modules formalizing interatomic potential validation.

**Entry:** `lake build`

### distiller — Python Knowledge Layer
**Path:** `distiller/`  
**Lang:** Python

**CLI:** `python -m distiller {init,query,stats,export,validate,pipeline,dashboard}`

**Key Schemas:**
- `operator-pack.json` — Agent operator bundles
- `risk-register.json` — Experiment risk tracking
- `run-manifest.json` — Reproducibility manifests

---

## Common Patterns

### Adding a New Rust Subcommand
1. Add CLI parser in `atlas-distill/src/cli.rs`
2. Implement logic in `atlas-distill/src/commands/<name>.rs`
3. Wire into `main.rs`
4. Add test in `atlas-distill/tests/`
5. Update `AGENTS.md` command table

### Adding a New Atlas-View Package
1. Create `atlas/atlas-view/packages/<name>/`
2. Add to `pnpm-workspace.yaml`
3. Add dependency references in `package.json` files
4. Export from `packages/<name>/src/index.ts`
5. Update turbo pipeline in `turbo.json` if build order matters

### Adding a New Research Agent (glim-think)
1. Create facet in `glim-think/src/agents/`
2. Register in `glim-think/src/index.ts`
3. Add route in `glim-think/src/routes.ts`
4. Update wrangler.toml bindings if new DO class needed

### Adding a Paper Figure
1. Add Python script in `paper/figures/`
2. Output to `paper/figures/pdf/` or `paper/figures/png/`
3. Reference in `immi-paper.tex`
4. Run `make figures`

---

## Research Data Flow

```
Literature (CrossRef / arXiv / Semantic Scholar)
    ↓
glim-think / lupine-distill (fetch + rank)
    ↓
distiller (extract principles + build knowledge base)
    ↓
atlas-distill (validate against FCC/BCC/NIST benchmarks)
    ↓
lean-spec (formalize theorems)
    ↓
paper (generate figures + compile LaTeX)
    ↓
atlas-view (visualize results)
```

---

## File Conventions

- **Dump files:** `*.lammpstrj`, `*.dump`
- **Data files:** `*.data`
- **Log files:** `*.log`
- **Benchmark JSON:** `*.benchmark.json`
- **Manifest JSON:** `*.manifest.json`
- **Colormaps:** Viridis, Inferno, Coolwarm (defined in `packages/core/src/colors.ts`)

## LAMMPS Integration

Full LAMMPS C++ source is vendored at `atlas/lammps_src/`. This is a real LAMMPS tree with Kokkos, examples, and unit tests. Do not modify LAMMPS internals unless explicitly patching for the viewer.

---

## Quick Reference: Atom Types → Radii

Common radii (Angstrom) used across the codebase:
- H: 0.31
- C: 0.76
- N: 0.71
- O: 0.66
- Al: 1.21
- Cu: 1.32
- Ni: 1.24
- Au: 1.36
- Ag: 1.36
- Fe: 1.26

Defined in `packages/core/src/colors.ts` or equivalent.
