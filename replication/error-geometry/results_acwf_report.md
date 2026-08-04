# Results: ACWF Δ-Gauge Cross-Layer Test

**Pre-registration:** `prereg_acwf_delta_gauge.md` @ ebf39e33 (registered before analysis)
**Data:** ACWF verification study (Bosoni et al., Nat. Rev. Phys. 2024), 384 unary
systems, (V₀, B₀, B₁) per method vs all-electron average reference; AE noise floor
from the FLEUR-vs-WIEN2k split. 3,709 method-system error vectors.
**Verdict: 1/3 strict passes; the central prediction (P-Δ2, carrying the
refutation condition) PASSED; refutation NOT triggered.**

## Confirmatory outcomes (thresholds as registered)

| Prediction | Result | Threshold | Outcome |
|---|---|---|---|
| P-Δ1 within-table consensus (PD0.4 group) | median per-system mean cos = +0.459 | ≥ 0.50 | **FAIL** (narrow; see siesta note) |
| P-Δ2 cluster by table, not code | S_table = +0.526 vs S_code = +0.265; sep = +0.261; perm p = 0.0172 | sep ≥ 0.20 AND p < 0.05 | **PASS** |
| P-Δ3 regime structure | Spearman ρ = −0.280 (p = 1.2e-6) | ρ > +0.30 | **FAIL** (sign reversed) |

**Refutation check (S_code > S_table): not triggered.** Errors of DFT
implementations organize by pseudopotential table, not by simulation code.

Key pair-level evidence (mean error-vector cosine over qualifying systems):
four independent plane-wave codes sharing the PseudoDojo-0.4 table align at
0.70–0.87 (abinit×qe +0.76, abinit×castep +0.77, abinit×abacus +0.83,
qe×abacus +0.87, qe×castep +0.73, castep×abacus +0.70; abinit×dftk on PD0.5:
+0.75), while the SAME code under a different pseudopotential family drops to
0.19–0.35 (abinit-JTH×abinit-PD0.4 +0.21, abinit-JTH×abinit-PD0.5 +0.19,
qe-PD0.4×qe-SSSP +0.31, castep-PD0.4×castep-C19 +0.35).

## Post-hoc observations (NOT confirmatory; hypotheses for the next round)

1. **The siesta anomaly is the law, again.** P-Δ1's miss is driven by siesta
   (cosines +0.02…+0.15 against every plane-wave PD0.4 code). siesta is the
   only localized-orbital-basis code in the group; its psml-converted
   pseudopotentials sit behind a basis-set constraint that evidently binds
   first. Among the four plane-wave PD0.4 codes alone, pairwise alignment is
   0.70–0.87 — the registered threshold would have passed comfortably. Same
   nested-constraint structure as the 4×2 noble metals.
2. **P-Δ3's reversal is informative.** Alignment falls as |error|/floor grows:
   the largest-error systems (difficult elements) are where pseudopotential
   *constructions* genuinely diverge from one another — between-family
   disagreement grows with difficulty, and P-Δ3 as registered pooled all
   methods across families. The within-family version of the prediction is
   the right one to register next time.
3. **The constraint is the table, not the formalism.** PAW codes with
   different PAW tables (VASP, GPAW, ABINIT-JTH) align at only +0.20 —
   barely above cross-family. The shared artifact that fixes the error
   direction is the specific frozen-core construction, not the PAW label.

## The cross-layer picture (three layers, three constraints, one law)

| Layer | Ensemble | Binding constraint | Evidence | Kill condition |
|---|---|---|---|---|
| Classical potentials | 559 potentials, elastic constants | functional form | within-family r = 0.95; 40-year PR invariance | — (observational) |
| Foundation MLIPs | 8 MatPES models + 3 anchors | training functional | S_func = +0.317 vs S_arch = −0.093, p = 0.029 | not triggered |
| DFT implementations | 12 ACWF methods, EOS space | pseudopotential table | S_table = +0.526 vs S_code = +0.265, p = 0.017 | not triggered |

Each layer pre-registered (layers 2–3), each with an explicit refutation
condition, neither triggered; in both registered experiments the auxiliary
calibration thresholds missed in ways the law itself explains (nested
constraints), and the misses were reported as failures.

## Files

- `analyze_acwf_delta_gauge.py` → `analysis_acwf_results.json`
- Data pinned at `data/acwf/` (commit ebf39e33)
