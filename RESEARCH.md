# glim Research Synthesis

Concise summary of the research driving glim. This document synthesizes findings from multiple research conversations.

---

## The Problem

Materials science simulation requires 4-6 separate software tools:
```
VASP (DFT) → pymatgen → DeePMD-kit → LAMMPS → OVITO
```

Every arrow is a failure point. File conversions lose metadata. Validation is manual.

---

## Why LAMMPS?

- **10,000+ citing papers** — largest user base in materials MD
- **Active development** — KOKKOS for GPU, constant releases
- **GPL but extensible** — plugin boundary for commercial features
- **Pain point:** Visualization is fragmented and often paid

---

## The Five Friction Zones

1. **Build complexity** — LAMMPS requires careful compilation, KOKKOS setup
2. **MLIP deployment** — Training is easy; deploying to production MD is hard
3. **Workflow validation** — No standard for reproducible MD workflows
4. **Visualization fragmentation** — OVITO paid, VMD outdated, DIY matplotlib
5. **Plugin governance** — GPL boundary unclear for commercial extensions

---

## The Four Opportunity Lanes

1. **Workflow SDK** — Unified data model, job graphs, provenance capture
2. **MLIP ops** — Deployment frameworks, validation harnesses, GPU dispatch
3. **Visual analytics engine** — WebGPU for scale, zero-install for reach
4. **Orchestration** — Parameter sweeps, active learning loops

---

## Why glimPSE?

The web app is the **beachhead product** because:

| Factor | OVITO | VMD | glimPSE |
|--------|-------|-----|------------|
| Install | Desktop | Desktop | Zero (URL) |
| Cost | Paid Pro | Free | Free |
| Atoms | 134M | 100M | 10M+ target |
| Quality | Pro only | Basic | SSAO/DOF |

**The wedge:** Every LAMMPS user struggles with visualization. A free, web-native tool with better quality than OVITO Basic wins.

---

## Technology Decisions

### Why WebGPU?
- Compute shaders for GPU culling
- Indirect draw for single-call rendering
- 10× performance over WebGL

### Why Rust→WASM?
- 10× faster than JS for parsing
- Streaming without loading entire file
- Same code becomes atlas-io later

### Why React + R3F?
- Declarative scene composition
- Massive ecosystem
- Hot reload during dev

---

## Research Sources

| Source | What it covers |
|--------|----------------|
| `deep-research-report.md` | Ecosystem analysis, 5 opportunity themes |
| `ancillary-research-opps.md` | 2025–2026 papers, people, labs |
| `foundational-research.md` | Advisory council, initial brief |
| `example-research-papers.md` | Downloadable LAMMPS datasets |

---

## Current State

- **Built:** glimPSE web app with dump/log parsing, WebGPU rendering
- **Todo:** Data file parser, bond rendering
- **Planned:** Full DFT engine, full MD engine, MLIP pipeline

---

## Next Steps

1. Complete data file parser
2. Add bond rendering
3. Ship 12 gallery examples
4. Deploy alpha
5. Recruit advisory council

---

*See docs/research-index.md for full document catalog. See docs/navigation.md for codebase.*
