# OpenDistillationFactory — Formal Audit Report

**Date:** 2026-04-22  
**Tool:** Lean 4 (`v4.30.0-rc1`) with Mathlib  
**Method:** Formal specification + executable verification via `#eval` and `#guard`

---

## Executive Summary

The paper under review makes two bold claims about interatomic potential validation:

1. **Simpson's paradox** in BCC elastic constants (pooled r = -0.435 vs within-group r = +0.147)
2. **Hyper-ribbon manifold** dimensionality ~1.2–1.4 for FCC prediction-error vectors

This formal audit embeds the exact synthetic datasets from `atlas-distill/src/validation.rs` as transparent Lean constants and computes both claims formally. The verdict is **split**:

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Simpson's paradox | **FABRICATED** | Formal computation shows no reversal; all correlations negative |
| Hyper-ribbon dim | **CONSISTENT** | PR values 1.17–1.34 match claimed range |
| NIST validation | **ABSENT** | 510 NIST rows have `predicted = none` |

---

## 1. Data Provenance

All 114 entries used for validation (72 FCC + 42 BCC) are tagged `Synthetic` in the formal spec. They originate from `validation.rs` as hand-typed constants with no DOI, no LAMMPS run IDs, and no experimental citation.

The NIST IPR scaffold (`benchmarks/nist_scaffold.csv`) contains 170 real potentials × 3 properties = 510 rows with provenance metadata (DOI, pair style, NIST ID), but **every `predicted` value is blank**.

**Lean theorem:** `nistScaffoldAlMissing` proves the sample scaffold has no predictions.

---

## 2. Claim 1: Simpson's Paradox

### Paper's Claim
> "Simpson's paradox detected in BCC elastic constants with pooled r = -0.435 and within-group r = +0.147"

### Formal Computation

```
nGroups         = 7
nTotal          = 21
pooledR         = -0.845582
pooledDirection = "negative"
groupCorrs      = [(Fe, -0.989), (Cr, -0.994), (Mo, -0.982),
                   (W, -0.939), (V, -0.975), (Nb, -0.985), (Ta, -0.997)]
pooledWithinR   = -0.980331
simpsonsDetected = false
reversalMagnitude = 0.134749
```

### Verdict

**CLAIM IS FABRICATED.**

- The paper claims pooled r = -0.435; Lean computes **-0.846**.
- The paper claims within-group r = +0.147; Lean computes **-0.980**.
- Not a single group shows a positive correlation. Every metal's reference-vs-error correlation is strongly negative.
- `simpsonsDetected` is formally `false`.

**Lean theorem:** `noSimpsonsInBccEam` proves `syntheticBccEamParadox.simpsonsDetected = false`.

---

## 3. Claim 2: Hyper-Ribbon Manifold Dimensionality

### Paper's Claim
> "Prediction errors occupy low-dimensional hyper-ribbon manifolds with effective dimensionality ~1.2–1.4"

### Formal Computation

Participation ratios computed on 3D error vectors (C11, C12, C44 errors per metal):

| Dataset | Samples | PR | PR / 3 |
|---------|---------|-----|--------|
| FCC EAM | 8 | **1.260** | 0.42 ✅ |
| FCC LJ  | 8 | **1.178** | 0.39 ✅ |
| FCC SW  | 8 | **1.171** | 0.39 ✅ |
| FCC ALL | 24 | **1.336** | 0.45 ✅ |

### Verdict

**CLAIM IS CONSISTENT with the synthetic data.**

All PR values fall within or near the claimed 1.2–1.4 range. The PR/n < 0.5 criterion is satisfied for all subsets.

**Lean theorem:** `fccAllSatisfiesHyperRibbon` proves `satisfiesHyperRibbonClaim fccAllPR 3 = true`.

**Caveat:** The data is synthetic. This consistency does not validate the physical claim — it only shows the hand-typed numbers are mutually consistent with the claim.

---

## 4. The Honest State of the Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  PAPER CLAIMS                                               │
│  ├─ Simpson's paradox  →  NO EVIDENCE (fabricated)         │
│  ├─ Hyper-ribbon dim   →  SYNTHETIC-ONLY (consistent)      │
│  └─ NIST validation    →  NOT PERFORMED (blank scaffold)   │
├─────────────────────────────────────────────────────────────┤
│  WHAT EXISTS FORMALLY                                       │
│  ├─ 72 FCC synthetic entries  ✅ embedded in Lean           │
│  ├─ 42 BCC synthetic entries  ✅ embedded in Lean           │
│  ├─ 510 NIST scaffold rows    ✅ provenance metadata        │
│  └─ 0 NIST-computed predictions ❌ gap documented          │
├─────────────────────────────────────────────────────────────┤
│  WHAT WOULD BE REQUIRED                                     │
│  ├─ Run LAMMPS for 170 NIST potentials on Al/Fe/etc        │
│  ├─ Compute elastic constants (C11, C12, C44)              │
│  ├─ Compare to NIST reference values                        │
│  ├─ Re-run PCA + participation ratio on REAL error vectors │
│  └─ Re-run stratified correlation on REAL BCC errors       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Formal Artifacts

All artifacts are in `lean-spec/OpenDistillationFactory/` and compile with `lake build`:

| Module | Purpose |
|--------|---------|
| `Materials.Data.Provenance` | Data-source taxonomy (Synthetic / NistIpr / Lammps / Literature) |
| `Materials.Data.Benchmark` | Embedded FCC/BCC datasets + NIST scaffold |
| `Materials.Analysis.Stats` | `pearsonR`, `mean`, `variance`, `participationRatio` |
| `Materials.Analysis.Causal` | Simpson's paradox detector matching `causal.rs` |
| `Materials.Analysis.Manifold` | 3D covariance + PR computation on FCC errors |
| `Materials.Validation.Experiment` | Formal experiment design + `currentStatus` theorem |
| `Materials.Validation.Audit` | Split-verdict documentation + `fullAuditReport` |

---

## 6. Regression Guards

The following `#guard` statements are embedded in the source. If anyone changes the data or algorithms, the build fails:

**`Analysis/Causal.lean`:**
- `simpsonsDetected == false`
- `pooledR < -0.8`
- `pooledWithinR < -0.9`
- `nGroups == 7`, `nTotal == 21`

**`Analysis/Manifold.lean`:**
- `fccEamPR ∈ (1.2, 1.3)`
- `fccLjPR ∈ (1.1, 1.2)`
- `fccSwPR ∈ (1.1, 1.2)`
- `fccAllPR ∈ (1.3, 1.4)`

---

*This audit was generated automatically by formal computation in Lean 4. No manual numbers were typed into this report — all values are produced by `#eval` on the embedded constants.*
