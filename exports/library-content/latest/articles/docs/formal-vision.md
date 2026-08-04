# The Open Distillation Factory — Executable Vision

> *A formal specification is not a presentation. It is a contract that compiles.*

This project is the first attempt to treat interatomic potential validation as a **theorem-driven engineering discipline**. Rather than running every simulation and hoping the statistics converge, we formalize what it means to validate — and we lock that formalization into the build.

---

## Build Status

<div class="stat-row">
  <div class="stat-card">
    <div class="stat-number">1,499</div>
    <div class="stat-label">Build targets passed</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">47</div>
    <div class="stat-label">Theorems proven</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">6</div>
    <div class="stat-label">Meta-scientific hypotheses</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">5</div>
    <div class="stat-label">Documented epistemic gaps</div>
  </div>
</div>

---

## What Is a Build-Locking Contract?

In conventional materials informatics, a "claim" lives in a PDF. In this project, a claim lives in a Lean 4 module — and if the claim breaks, **the build breaks**.

Our vision file (`Vision.lean`) contains `#guard` statements that are evaluated at compile time:

```lean
#guard (hypothesisCount >= 6)
#guard (computationallyProvenCount >= 10)
#guard (epistemicGapCount >= 1)
```

These are not tests. They are **epistemic minimums**. A future commit cannot silently drop below 6 formally stated hypotheses, remove all computationally proven theorems, or close every epistemic gap without justification.

---

## Theorem Inventory

### Data Layer (9 theorems)
- `syntheticFccCount` — 72 FCC entries embedded
- `syntheticBccCount` — 42 BCC entries embedded
- `nistScaffoldCount` — 9 NIST scaffold rows
- `nistScaffoldAlMissing` — NIST predictions are absent
- `syntheticFccIsSynthetic` — all FCC entries carry synthetic provenance
- `syntheticBccIsSynthetic` — all BCC entries carry synthetic provenance
- `syntheticFccNonEmpty` / `syntheticBccNonEmpty` — datasets are non-empty
- `nistScaffoldPredictionsMissing_bool` — structural check on missing data

### Analysis: Causal Inference (9 theorems)
- `noSimpsonsDetected` — Simpson's paradox is **fabricated** in synthetic BCC
- `pooledRBelowMinus08` — pooled correlation < −0.8
- `pooledWithinRBelowMinus09` — within-group correlation < −0.9
- `nGroupsEqualsSeven` — exactly 7 metal groups
- `nTotalEqualsTwentyOne` — exactly 21 data points
- `reversalMagnitudeAbove01` — reversal exceeds significance threshold
- `syntheticBccEamPointsNonEmpty` / `syntheticBccAllPointsNonEmpty`

### Analysis: Manifold Geometry (10 theorems)
- `fccEamPRBounded` — EAM PR ∈ (1.2, 1.3)
- `fccLjPRBounded` — LJ PR ∈ (1.1, 1.2)
- `fccSwPRBounded` — SW PR ∈ (1.1, 1.2)
- `fccAllPRBounded` — All FCC PR ∈ (1.3, 1.4)
- `paperClaimHolds` — hyper-ribbon claim satisfied
- `fccEamPRGreaterThanLj` — EAM PR > LJ PR
- `fccAllSatisfiesHyperRibbon` — PR/n < 0.5 for full FCC set
- `fccEamVectorCount` / `fccAllVectorCount` — structural counts
- `fccAllMoreThanEam` — full dataset larger than EAM subset

### Theory: Parameter Bound (1 theorem)
- `syntheticEamSatisfiesBound` — EAM participation ratio ≤ min(params, observables)

### Theory: Meta-Science (5 theorems)
- `hypothesisBoardLength` — exactly 6 hypotheses registered
- `cubicIrrepSum` — cubic irrep dimensions sum to 4
- `trueCausalGraphNoConfounder` — nature: element → structure → error (no bypass)
- `syntheticCausalGraphHasConfounder` — synthetic data: element → error (confounder)
- `printStatusBoardNonEmpty` — status board renders

### Computation: LAMMPS Trace (3 theorems)
- `allPredictionsHaveTraces_empty` — empty benchmark needs no traces
- `allPredictionsHaveTraces_nil_traces` — nil trace list behavior
- `syntheticEntryNeedsNoTrace` — synthetic provenance needs no LAMMPS run

### Validation: Experiment (5 theorems)
- `actualExperimentIsNotNistBacked` — our experiment lacks NIST provenance
- `actualExperimentUsesSyntheticData` — all predictions are synthetic
- `actualExperimentNotPreRegistered` — no pre-registration record exists
- `syntheticFccFailsNistIntegrity` — synthetic FCC fails NIST integrity check
- `syntheticBccFailsNistIntegrity` — synthetic BCC fails NIST integrity check

### Validation: Audit (5 theorems)
- `simpsonVerdictContainsFabricated` — audit string contains "FABRICATED"
- `hyperRibbonVerdictContainsConsistent` — audit string contains "CONSISTENT"
- `auditReportNonEmpty` — report renders
- `simpsonPooledRNegative` — pooled correlation is negative
- `nistScaffoldIncomplete` — NIST scaffold has no predictions

---

## The Epistemic Gap (5 Documented Gaps)

Every theorem in the specification is **fully proven** — there are no `sorry` proofs. But not every claim is grounded in NIST-backed data. Five documented gaps in `Validation.Experiment` mark the boundary between what we can compute on synthetic data and what requires ground-truth LAMMPS traces:

1. **All predicted values are hand-typed**, not computed from NIST IPR potentials via LAMMPS
2. **Reference values lack DOI citations**
3. **Experiment was not pre-registered**
4. **No formal data provenance tracking** in the original Rust code
5. **Bootstrap CIs rely on non-deterministic random sampling**

These gaps are not bugs. They are **features of honesty**. They prevent the build from pretending to know what it does not know.

---

## Why This Matters

Most interatomic potential papers publish:
- A table of RMSE values
- A convergence plot
- A claim that the potential is "transferable"

This project publishes:
- A **formal specification** of what "transferable" means
- **Build-locking guards** that fail if the statistics shift
- **Meta-scientific hypotheses** about why validation is hard
- An **explicit boundary** between proven theorems and documented gaps

> *Proof or reproducible trace. Everything else is marketing.*

---

## Related

- [In the In Between](/#/article/formal-methodology) — the methodology behind theorem-driven validation
- [Formal Audit Report](/#/article/formal-audit) — split verdict with computational evidence
- [Six Meta-Scientific Hypotheses](/#/article/formal-hypotheses) — the new research agenda
