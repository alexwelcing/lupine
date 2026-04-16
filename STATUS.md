# glim Research Status

Current state of the glim research and development effort. Updated continuously.

---

## Project Status Overview

| Component | Status | Notes |
|-----------|--------|-------|
| **glimPSE (web app)** | ✅ Active | Production monorepo in `atlas/glimPSE/` |
| **Research documentation** | ✅ Active | Multiple research docs in root + `atlas/` |
| **Navigation scaffolding** | ✅ Active | `docs/navigation.md`, `docs/research-index.md` |
| **Self-improvement framework** | ✅ Active | `RESEARCH-CHAIN.md` |

---

## What's Implemented (Built)

### Production Code

| Package | Location | What it does |
|--------|----------|-------------|
| `@glim/core` | `packages/core/src/` | Shared types, colormaps, unit labels |
| `@glim/parsers` | `packages/parsers/` | File parsing (dump, log) via WASM |
| `@glim/scene` | `packages/scene/src/` | React Three Fiber components |
| `@glim/renderer` | `packages/renderer/src/` | WebGPU pipeline (low-level) |
| `@glim/ui` | `packages/ui/src/` | App shell, panels, state |
| `@glim/web` | `apps/web/` | Vite entry point |

### Key Implementations

- **LAMMPS dump parser** — parses `dump atom` and `dump custom` formats, handles scaled/unscaled coords, triclinic boxes
- **LAMMPS log parser** — extracts thermo data from multiple runs
- **WebGPU rendering** — impostor sphere technique with GPU culling
- **React Three Fiber scene** — declarative 3D components
- **Zustand state** — URL-serializable for shareable links
- **File drag-and-drop** — supports `.lammpstrj`, `.dump`, `.log`, `.gz`

### What's NOT Yet Implemented

- **LAMMPS data file parser** — `packages/parsers/wasm/src/data.rs` is a stub (TODO)
- **Bond rendering** — topology parsing exists in data.rs stub
- **Full DFT engine** — plan exists in `atlas/openDFT-project-plan.md`
- **Full MD engine** — planned in `glim-project-plan.md`
- **ML Potential pipeline** — planned in `glim-project-plan.md`

---

## Research Status

### Completed Research

| Document | Status | Summary |
|---------|--------|---------|
| `deep-research-report.md` | ✅ Complete | LAMMPS ecosystem analysis, 5 opportunity themes |
| `ancillary-research-opps.md` | ✅ Complete | 2025–2026 landscape, 60-paper corpus |
| `foundational-research.md` | ✅ Complete | Original brief, advisory council prospectus |
| `example-research-papers.md` | ✅ Complete | Downloadable LAMMPS simulation datasets |
| `atlas/glim-project-plan.md` | ✅ Complete | Full platform charter |
| `atlas/glimPSE-web-product-plan.md` | ✅ Complete | Web app product strategy |
| `atlas/openDFT-project-plan.md` | ✅ Complete | DFT engine plan |

### Current Focus

**glimPSE** — The web application is the current beachhead product. The research has validated:

1. **Problem:** OVITO Pro is paid; VMD is outdated; no web-native solution exists
2. **Solution:** WebGPU-powered visualization with zero install
3. **Differentiation:** 10M+ atoms at 60fps, SSAO/DOF for publication quality

---

## Codebase Health

| Aspect | Status | Notes |
|--------|--------|-------|
| TypeScript | ⚠️ Partial | LSP not available; use grep/glob |
| Build | ✅ Working | `pnpm build` in glimPSE/ |
| WASM | ✅ Working | `pnpm build:wasm` |
| Tests | ⚠️ Partial | Rust tests exist; TS tests minimal |
| Linting | ✅ Configured | turbo.json + tsconfig.json |

---

## Open Questions

### Technical

- [ ] Should we add WebGL2 fallback for non-WebGPU browsers?
- [ ] Bond detection algorithm — distance-based in compute shader?
- [ ] Binary dump format support priority?

### Product

- [ ] Gallery examples — which 12 to ship first?
- [ ] Hosting — Vercel or Cloudflare Pages?
- [ ] URL sharing — encoder/decoder working reliably?

### Research

- [ ] Advisory council outreach — who to contact first?
- [ ] Alpha user recruitment — where to find?
- [ ] Community building — Discord, Discourse, GitHub discussions?

---

## Next Steps (Short-term)

1. **Complete data file parser** — `packages/parsers/wasm/src/data.rs`
2. **Add bond rendering** — parse topology, render cylinders
3. **Ship gallery examples** — generate 12 dump files from LAMMPS examples
4. **Alpha release** — deploy to staging, recruit alpha users

---

## How to Use This Doc

- **New to project?** Start with `README.md`
- **Returning after break?** Use `RESEARCH-CHAIN.md` to evaluate context
- **Looking for something technical?** Check `docs/navigation.md`
- **Looking for research?** Check `docs/research-index.md`
- **Want to know current state?** You're here

---

*Last updated: 2025. This file tracks current state — see RESEARCH-CHAIN.md for session improvement.*
