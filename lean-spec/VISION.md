# Open Distillation Factory — Vision 2.0

> *"Every claim about interatomic potential behavior must be traceable to either a formal proof in Lean 4, or a reproducible LAMMPS computation with a NIST DOI-backed provenance trail."*

---

## 1. The Problem

Interatomic potential validation is broken:

- **Papers make bold claims on synthetic data.** Our formal audit proved one claim (Simpson's paradox) was fabricated and another (hyper-ribbon dimensionality) was consistent but unvalidated.
- **NIST maintains 675+ verified potentials** with DOIs and LAMMPS implementations, yet **nobody systematically computes their predictions** against reference data.
- **The gap between "published" and "verified"** is a chasm. Hand-typed numbers in `validation.rs` have no provenance. The NIST scaffold has 510 rows with `predicted = none`.

---

## 2. The Thesis

**Open Distillation Factory is a verifiable computation pipeline for materials informatics.**

Every claim lives in one of two categories:

| Category | Requirement | Example |
|----------|------------|---------|
| **Formal** | Theorem + proof in Lean 4 | `noSimpsonsInBccEam` |
| **Computational** | LAMMPS trace with NIST DOI, reproducible run ID | `nistScaffoldAlSample` with filled predictions |

No synthetic data. No hand-typed constants. No unverifiable assertions.

---

## 3. The Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 0: NIST IPR Catalog                                          │
│  675 LAMMPS-ready potentials, DOI-backed, parameter files available │
│  ↓                                                                  │
│  LAYER 1: LAMMPS Runner (Rust)                                      │
│  For each potential + structure: run simulation, extract C11/C12/C44│
│  Output: ComputationTrace {run_id, lammps_version, input_hash,      │
│                           potential_doi, elastic_constants}         │
│  ↓                                                                  │
│  LAYER 2: Benchmark Ingestion (Rust)                                │
│  Load traces → BenchmarkEntry {material, potential, property,       │
│                                 reference, predicted, provenance}    │
│  Provenance = LammpsRun {nist_id, doi, run_id, trace_hash}          │
│  ↓                                                                  │
│  LAYER 3: Formal Analysis (Lean 4)                                  │
│  Theorems about the real data:                                       │
│    - Does Simpson's paradox appear? (theorem + computed value)       │
│    - Is PR < 0.5? (theorem + computed value)                         │
│    - Is the parameter-count bound satisfied? (pure theorem)          │
│  ↓                                                                  │
│  LAYER 4: Audit Report                                              │
│  Human-readable, machine-checkable, auto-generated from Layer 3      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. First-Principles Discovery Program

### The Conjecture

> **Parameter-Bound Conjecture:** For an interatomic potential with P free parameters, the prediction-error participation ratio on any set of N observables is bounded by min(P, N).

### Why This Matters

The synthetic data shows PR ~ 1.3 for 3-property elastic constants. EAM potentials have ~10–20 parameters, but we're only measuring 3 properties, so PR ≤ 3. The observed PR ~ 1.3 suggests the **effective parameter count influencing these observables is ~1–2** (embedding function + pair term). This is a physical insight, not a statistical artifact.

### Research Path

1. **Formalize** the conjecture in Lean 4 (define "free parameters", "observables", "participation ratio")
2. **Compute** real NIST-backed elastic constants for 170 Al potentials
3. **Measure** PR on the real error vectors
4. **Test** the bound empirically: does PR ≤ min(P, N) hold?
5. **Prove** the bound via Jacobian rank arguments (differential geometry of prediction maps)

If the bound holds, it becomes a **theorem**. If it fails, the counterexample reveals something deep about how potential parameters couple to observables.

---

## 5. Immediate Implementation Plan

### Phase 1: LAMMPS Runner (Rust)
- Create `atlas-distill/src/runner.rs` — invoke LAMMPS for single-element potentials
- Template input generation from `atlas/nist_ipr/files/` examples
- Elastic constant extraction via LAMMPS `elastic` command or stress/strain
- Trace generation with SHA-256 hashes of inputs + outputs

### Phase 2: Populate NIST Scaffold
- Run 170 Al potentials × 3 properties = 510 computations
- Populate `predicted` column in the scaffold
- Tag each entry with `LammpsRun` provenance

### Phase 3: Formal Re-Analysis (Lean 4)
- Re-run `Analysis.Causal` and `Analysis.Manifold` on real data
- Prove or disprove the claims with ground truth
- Add the parameter-bound conjecture as a formal statement

### Phase 4: Publish the Audit
- `AUDIT_REPORT.md` auto-generated from Lean computation
- Every number traceable to a LAMMPS run ID or a theorem proof

---

## 6. Scientific Integrity Policy

1. **No synthetic data in published claims.** Synthetic data is allowed only for unit tests and algorithm validation.
2. **Every `BenchmarkEntry.predicted` must have provenance.** Either `LammpsRun` or `LiteratureCitation`.
3. **Every theorem about computed values must use `native_decide` or `by decide`.** No `rfl` on floats.
4. **Every build failure in a `#guard` is a scientific discrepancy.** Investigate before overriding.

---

*This vision replaces the previous ad-hoc validation approach with a systematic, open, and formally verifiable pipeline. The Lean specification is the contract. The LAMMPS runner is the executor. The audit report is the truth.*
