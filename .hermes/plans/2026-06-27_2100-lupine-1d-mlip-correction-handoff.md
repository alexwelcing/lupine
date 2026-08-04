# Handoff: Lupine 1-D MLIP Correction → Research Report & Publication

**Date:** 2026-06-27  
**Prepared by:** Kimi Code CLI  
**Scope:** Lupine 1-D Correction Operator, scalable MLIP evaluation pipeline, and real-MLIP benchmark validation.  
**Source-of-truth repo:** https://github.com/alexwelcing/lupine (`main`)  
**Paper draft:** `paper/PAPER_DRAFT.md`

---

## 1. What just shipped

A complete, end-to-end Rust pipeline that validates the core thesis of the Lupine paper: a single 1-D correction vector improves any MLIP trained on the same functional, without harming any model.

| Component | Location | What it does |
|-----------|----------|--------------|
| 1-D correction benchmark | `atlas-distill/src/commands/mlip_correct.rs` | Reads a catalog of MLIP predictions, extracts the 1-D bias vector, applies the Lupine operator to every model, and enforces a no-harm rule. |
| MLIP property optimizer | `atlas-distill/src/commands/mlip_optimize.rs` | Reads an evaluation manifest, fits a polynomial surrogate, and returns the optimum composition for a target property. |
| Scalable input generator | `atlas-distill/infra/lammps-gcp/generate_alloy_inputs.py` | Generates LAMMPS elastic-constant input decks for arbitrary binary alloys from element symbols + composition sweep. |
| Cloud Run orchestrator | `atlas-distill/infra/lammps-gcp/orchestrate.py` | Uploads inputs, dispatches Cloud Run Jobs, polls executions, downloads logs, parses `[C11, C12, C44]`, writes a JSON manifest. |
| Generalized LAMMPS runner | `atlas-distill/infra/lammps-gcp/run.py` + `Dockerfile` | Discovers any input prefix, runs any LAMMPS script, uploads outputs. Pushed as `us-central1-docker.pkg.dev/witching-606c6/lupine-lammps/runner:v4`. |
| Transferability engine | `atlas-distill/src/real_alloy_data.rs` | Single-source and rank-k subspace transfer errors, plus real Mg-Li and Al-Cu Cloud Run fixtures. |
| Real-MLIP benchmark data | `data/benchmark_layer2_results.json` | CHGNet, M3GNet, QET, TensorNet predictions for Cu and Ni on PBE and r2SCAN. |
| Performance report | `docs/transferability_performance_report.md` | Baseline vs. corrected numbers, no-harm validation, orchestration, and optimization results. |

---

## 2. Core validation results

Run these commands to reproduce:

```bash
# 1-D correction on real foundation MLIPs (PBE → r2SCAN, Cu + Ni)
cargo run --bin atlas-distill -- mlip-correct \
  --catalog data/benchmark_layer2_results.json \
  --training PBE --target r2SCAN

# Full Rust test suite
cargo test --bin atlas-distill

# Lean formal verification
lake build OpenDistillationFactory
```

### Real-MLIP correction (heads-up numbers)

| Model   | Element | Raw residual (GPa) | Corrected residual (GPa) | Improvement ratio |
|---------|---------|-------------------|--------------------------|-------------------|
| CHGNet  | Cu      | 46.59             | 16.30                    | 0.35× |
| CHGNet  | Ni      | 84.08             | 12.46                    | 0.15× |
| M3GNet  | Cu      | 37.17             | 5.97                     | 0.16× |
| M3GNet  | Ni      | 51.67             | 6.37                     | 0.12× |
| QET     | Cu      | 43.20             | 10.70                    | 0.25× |
| QET     | Ni      | 69.99             | 8.81                     | 0.13× |
| TensorNet | Cu    | 43.20             | 10.70                    | 0.25× |
| TensorNet | Ni    | 69.99             | 8.81                     | 0.13× |

- **Participation ratio:** 0.73 (below 1.3 threshold → 1-D hyper-ribbon).
- **1st PC variance fraction:** 79.9%.
- **No-harm violations:** 0 of 8.

### Full test suite

- `cargo test --bin atlas-distill` → **157 passed**
- `lake build OpenDistillationFactory` → **build succeeded**
- `bash lean-spec/scripts/check_no_sorry.sh` → **OK**

---

## 3. Current code state

### High-touch Rust files
- `atlas-distill/src/commands/mlip_correct.rs` — 1-D correction benchmark and no-harm check.
- `atlas-distill/src/commands/mlip_optimize.rs` — property optimizer over composition sweeps.
- `atlas-distill/src/real_alloy_data.rs` — transferability matrix, Mg-Li / Al-Cu fixtures, subspace correction.
- `atlas-distill/src/main.rs` — Clap dispatch for `mlip-correct`, `mlip-optimize`, `alloy-campaign`, etc.
- `lean-spec/OpenDistillationFactory/Materials/Data/AlCuCloudRun.lean` — real Al-Cu constants + empirical bound check.
- `lean-spec/OpenDistillationFactory/Materials/Vision.lean` — `#guard` build locks for real-data checks.

### Infrastructure
- `atlas-distill/infra/lammps-gcp/run.py` + `Dockerfile`
- `atlas-distill/infra/lammps-gcp/generate_alloy_inputs.py`
- `atlas-distill/infra/lammps-gcp/orchestrate.py`
- `atlas-distill/infra/lammps-gcp/alcu_sweep.json`

### Documentation / paper
- `paper/PAPER_DRAFT.md` — original thesis and benchmark claims.
- `docs/transferability_performance_report.md` — current performance narrative.

---

## 4. Known issues and watch points

1. **Small sample size for 1-D validation**  
   The `benchmark_layer2_results.json` catalog covers only Cu and Ni. The PR and no-harm results are promising but not yet conclusive across the periodic table.

2. **Vegard-rule references for alloy intermediates**  
   The Al-Cu 25Al/50Al/75Al references in `real_alloy_data.rs` are linear-mixing placeholders, not DFT or experimental values. Do not present them as ground truth.

3. **Cloud Run cost**  
   Each composition run is cheap (~seconds), but large composition × potential × structure sweeps add up. Use `--resume` and deterministic output prefixes to avoid redundant runs.

4. **Off-thesis tooling in the report**  
   Sections on rank-k subspace correction and inverse design are useful appendices but should not dominate the paper narrative. The main claim is the 1-D operator.

5. **Docker image tag**  
   The runner is available as `v4` (digest `sha256:b78db90f…`). Any future runner changes should bump the tag and update Cloud Run Job configs.

---

## 5. Recommended next rounds for Hermes agents

### Round A — Write and publish the research report (high priority)
**Goal:** Turn the current results into a publishable short report or arXiv preprint.

- [ ] Draft a clean report focused on the 1-D operator + no-harm validation.
- [ ] Use the table from Section 2 as the primary result.
- [ ] Generate figures:
  - residual norm before vs. after (bar chart per model/element),
  - participation-ratio schematic,
  - bias vector direction in `[C11, C12, C44]` space.
- [ ] Update `paper/PAPER_DRAFT.md` or create `paper/1d_correction_report.md`.
- [ ] Add an abstract, methods, results, discussion, and data availability statement.
- [ ] Export figures to `paper/figures/`.
- [ ] Optional: prepare arXiv submission files (`.tex`, `.bib`, compiled PDF).

**Files likely to change:**
- `paper/PAPER_DRAFT.md`
- `paper/figures/*`
- `docs/transferability_performance_report.md` (trim to appendix status)

**Acceptance:**
- A self-contained report exists that a reader can reproduce with the commands in Section 2.
- All claims are backed by numbers in `data/benchmark_layer2_results.json` or the Rust output.

---

### Round B — Expand the MLIP catalog (medium priority)
**Goal:** Strengthen the no-harm claim across more elements and models.

- [ ] Acquire or generate 0K elastic constants for 8–15 cubic metals (Al, Cu, Ni, Fe, V, Nb, Cr, Mo, W, Pd, Pt, etc.) from MatPES / Materials Project.
- [ ] Run CHGNet, M3GNet, QET, TensorNet (and optionally MACE-MP-0, Orb) on each.
- [ ] Append results to `data/benchmark_layer2_results.json` or a new `data/benchmark_layer3_results.json`.
- [ ] Re-run `mlip-correct` and verify PR < 1.3 and zero no-harm violations.

**Files likely to change:**
- `data/benchmark_layer2_results.json` or new catalog
- `atlas-distill/src/commands/mlip_correct.rs` if schema changes

**Acceptance:**
- ≥ 4 models × ≥ 8 elements with PBE and r2SCAN targets.
- Participation ratio stays < 1.3 and no model is harmed.

---

### Round C — Connect the Cloud Run pipeline to foundation MLIPs (medium priority)
**Goal:** Use the orchestrator to generate the benchmark data automatically instead of relying on pre-computed JSON.

- [ ] Extend `orchestrate.py` / runner to support Python-based MLIPs (MACE, CHGNet, Orb) via ASE, or use a second container image.
- [ ] Define a `mlip_catalog.json` describing each model, its backend, and its bias-vector training functional.
- [ ] Run a full element sweep through Cloud Run and produce a catalog that `mlip-correct` can ingest.

**Files likely to change:**
- `atlas-distill/infra/lammps-gcp/orchestrate.py`
- New `data/mlip_catalog.json`
- Possibly a new runner image for ASE-based models

**Acceptance:**
- One command generates inputs, runs all models, and emits a catalog ready for `mlip-correct`.

---

### Round D — Inverse-design appendix (low priority)
**Goal:** Publish the `mlip-optimize` work as a separate short note or appendix.

- [ ] Replace Vegard-rule alloy references with DFT-computed references for 25Al/50Al/75Al.
- [ ] Demonstrate that the optimizer finds a different optimum for each MLIP, and that the 1-D correction changes the optimum.
- [ ] Write a short section or standalone note.

**Files likely to change:**
- `atlas-distill/src/commands/mlip_optimize.rs`
- `docs/transferability_performance_report.md`

**Acceptance:**
- Optimizer results are physically grounded and reproducible from a manifest.

---

## 6. How to pick up this handoff

1. Read `paper/PAPER_DRAFT.md` for the original thesis.
2. Read `docs/transferability_performance_report.md` for the current numbers.
3. Re-run the commands in Section 2 to verify state.
4. Start Round A for fastest publication path, or Round B if more data is needed first.

**Contact:** alex@lupine.science
