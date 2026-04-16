# glim Research Workspace

Welcome to the glim research workspace. This directory contains research, planning, and prototype artifacts for glim — a unified computational materials science platform.

---

## What is glim?

**glim** (Atomic-scale Theory, Learning, and Simulation) is an ambitious project to build a unified, open-source platform spanning:

1. **Quantum DFT Engine** — VASP-compatible plane-wave PAW density functional theory
2. **Molecular Dynamics Engine** — LAMMPS-compatible large-scale classical and reactive MD
3. **ML Potential Pipeline** — Integrated training, validation, and deployment of machine learning interatomic potentials

**Current focus:** glimPSE — a WebGPU-powered web application for LAMMPS molecular dynamics visualization. Drag a dump file into the browser, get publication-quality 3D in 2 seconds.

---

## What is This Workspace?

This workspace (`glim/`) contains:

| Directory | Contents |
|----------|----------|
| `atlas/` | Research, planning, and presentation artifacts for glim |
| `atlas/glimPSE/` | Production monorepo — TypeScript + Rust WASM web app |
| `docs/` | Navigation guides and research indexes |
| Root `.md` files | Research documents and ecosystem analysis |

---

## Quick Start

### First time here?

1. Read **this file** for orientation
2. Check **docs/research-index.md** to find relevant research
3. Use **docs/navigation.md** for codebase questions
4. Use **RESEARCH-CHAIN.md** to evaluate your session

### Ready to dive in?

| What you want... | Go to |
|-----------------|-------|
| Understand the product vision | `atlas/glimPSE-web-product-plan.md` |
| Find competitive analysis | `atlas/glimPSE-web-product-plan.md` (OVITO comparison) |
| Understand tech stack | `docs/navigation.md` |
| Find LAMMPS ecosystem research | `deep-research-report.md` |
| Find 2025–2026 papers | `ancillary-research-opps.md` |
| Find downloadable simulation data | `example-research-papers.md` |

---

## Reading Paths

### Path A: Product Strategy
```
glimPSE-web-product-plan.md → glim-project-plan.md → glimPSE-example-gallery.md
```

### Path B: Technical Deep Dive
```
docs/navigation.md → atlas/glimPSE/README.md → packages/*/src/
```

### Path C: Ecosystem Research
```
deep-research-report.md → ancillary-research-opps.md → foundational-research.md
```

### Path D: Research Continuity (return here each session)
```
RESEARCH-CHAIN.md → docs/research-index.md → [choose path above]
```

---

## What's Built vs. What's Planned

| Component | Status | Location |
|-----------|--------|----------|
| **glimPSE (web app)** | ✅ Built | `atlas/glimPSE/` |
| LAMMPS dump parser | ✅ Built | `packages/parsers/wasm/src/dump.rs` |
| LAMMPS log/thermo parser | ✅ Built | `packages/parsers/wasm/src/log.rs` |
| LAMMPS data file parser | 🔶 TODO | `packages/parsers/wasm/src/data.rs` |
| WebGPU AtomPipeline | ✅ Built | `packages/renderer/src/pipeline/AtomPipeline.ts` |
| React Three Fiber scene | ✅ Built | `packages/scene/src/Atoms.tsx` |
| Zustand state management | ✅ Built | `packages/ui/src/store.ts` |
| **Full DFT engine** | 📋 Planned | `atlas/openDFT-project-plan.md` |
| **Full MD engine** | 📋 Planned | `glim-project-plan.md` |
| **ML Potential pipeline** | 📋 Planned | `glim-project-plan.md` |

---

## Key Commands

From `atlas/glimPSE/`:

```bash
pnpm dev              # Start dev server
pnpm build            # Build all packages
pnpm build:wasm       # Rebuild Rust WASM parsers
pnpm test:rust       # Run Rust parser tests
```

### glim TUI (Research Navigator)

A Rust-based terminal UI for navigating glim research:

```bash
# Run the TUI
cd atlas-tui && cargo run --release

# Or use the prebuilt binary
./atlas-tui/target/release/atlas-tui.exe
```

**TUI Features:**
- 📄 **Docs** — Browse all markdown documentation with category color-coding
- 🔍 **Search** — Full-text search across all documents
- ✅ **Session** — 14-point context recovery checklist (from RESEARCH-CHAIN)
- 📖 **Glossary** — Quick lookup of key terms (LAMMPS, DFT, WebGPU, etc.)

**TUI Navigation:**
| Key | Action |
|-----|--------|
| `Tab` / `1-4` | Switch views |
| `↑` / `↓` | Navigate list |
| `/` | Focus search |
| `r` | Reset session |
| `?` | Help |
| `q` | Quit |

---

## Important Notes

- **JSX files** in `atlas/*.jsx` are presentation/prototype artifacts, not production code
- **TypeScript LSP** is not available in this environment; use `grep` and `glob` for navigation
- The web app uses **WebGPU** (with fallback considerations) for rendering millions of atoms

---

## Questions?

- **Product questions:** Start with `atlas/glimPSE-web-product-plan.md`
- **Technical questions:** Start with `docs/navigation.md`
- **Research questions:** Start with `docs/research-index.md`
- **Session continuity:** Start with `RESEARCH-CHAIN.md`

---

*Last updated: 2025. Use RESEARCH-CHAIN.md at the start of each session to evaluate your context and identify gaps.*
