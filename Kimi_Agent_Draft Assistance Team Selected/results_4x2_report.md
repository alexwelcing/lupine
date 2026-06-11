# Results: Functional × Architecture 4×2 Experiment

**Pre-registration:** `prereg_functional_vs_architecture_2x2.md` @ commit dffbe595 (registered before execution)
**Executed:** 2026-06-11, local strain-energy harness (`mlip_immi/elastic_constants.py`), Gate 0 passed
(bit-exact regression; stress-method cross-check ≤2.4%; Au C44 softening window-stable across 8× strain range)
**Cells:** 8/8 completed — {M3GNet, TensorNet, CHGNet, QET} × {MatPES-PBE, MatPES-r2SCAN}, 15 elements each
**Verdict: 2/4 confirmatory predictions PASS. The registered refutation condition did NOT occur.**

## Confirmatory outcomes (thresholds as registered, no post-hoc changes)

| Prediction | Result | Threshold | Outcome |
|---|---|---|---|
| P-A within-functional alignment | median FCC cos = +0.654 | ≥ 0.70 | **FAIL** (narrow) |
| P-B separation | sep = +0.085; perm p = 0.0286; S_func = +0.317 vs S_arch = −0.093 | sep ≥ 0.30 AND p < 0.05 | **FAIL** (sep), p-component passed |
| P-C r2SCAN rotation of C44 error | Au +0.258 HIT, Pt +0.154 HIT, Ag −0.020 miss | ≥ +0.15 on ≥2/3 | **PASS** |
| P-D dataset control | MatPES-PBE vs MPtrj/OMat-PBE anchors, median cos = +0.660 | ≥ 0.60 | **PASS** |

**Refutation check:** the law would have been refuted if errors clustered by architecture
instead of functional. The opposite holds: clustering by functional gives S = +0.317
(permutation p = 0.029 over all 70 labelings) while clustering by architecture gives
S = −0.093. Functional is the organizing variable; architecture is not.

## Born-stability census (this round)

4 new failures, again concentrated in magnetic/soft elements under r2SCAN models:
V (TensorNet-r2SCAN, C44<0), V + Fe + Pb (CHGNet-MatPES-r2SCAN). V is now the most
Born-fragile element across every experiment to date (also failed under MACE-MP-0).

## Post-hoc observations (NOT confirmatory; hypotheses for the next registration round)

1. **Functional separation is element-class dependent.** Cu, Ni, Al separate dramatically
   by functional (between-functional cosine −0.49, −0.27, +0.11 vs within +0.54, +0.83,
   +0.59) — for these, r2SCAN errors point opposite or orthogonal to PBE errors, the
   predicted crossover. But the 5d/4d noble metals (Au, Pt, Pd, Ag, Pb) keep HIGH
   between-functional alignment (0.52–0.90): both functionals still err along the same
   direction. Reading: PBE→r2SCAN removes the constraint that binds Cu/Ni/Al elastic
   errors, but the noble-metal residual is bound by a constraint DEEPER than the
   PBE/r2SCAN distinction (plausibly the shared treatment of correlation/vdW in 5d
   metals). P-A/P-B failed because their thresholds assumed one constraint layer;
   the data says constraints nest.

2. **The conserved object is the AXIS, not the vector.** With n = 8–11 models per
   element, the error subspace stays one-dimensional for all 15 elements (rank-1 share
   0.56–0.94; PR 1.13–2.09 out of 3) even where mean signed cosine collapses to ~0
   (Al 0.06, Cu 0.08, Mo 0.06): models disagree in SIGN along a SHARED LINE, they do
   not scatter isotropically. The e = b + ξ model (which predicts PR, mean cosine, and
   rank-1 share all estimate the same systematic fraction) is too crude; the sharper
   law candidate is: the (target, observable) pair fixes the error axis; the binding
   constraint stack (functional, training data, architecture) sets sign and magnitude
   along it. This retroactively explains the earlier BCC anchor finding (V: cosine
   −0.88 = same axis, opposite signs).

## Implications

- The core in-domain claim survives its registered refutation test: foundation-MLIP
  error geometry organizes by training functional, not architecture (p = 0.029), the
  r2SCAN rotation went the predicted direction on Au/Pt, and functional inheritance
  is corpus-robust (P-D).
- The strict thresholds P-A/P-B were miscalibrated for nested constraints — reported
  as FAIL per registration; not reinterpreted.
- Round 2 should register axis-based statistics (sign-agnostic |cos| or principal-axis
  concentration) and the nested-constraint prediction: between-functional alignment
  should correlate with how much of an element's error r2SCAN actually repairs
  (testable against published PBE/r2SCAN-vs-experiment elastic data), plus the
  PBE → PBEsol → r2SCAN dose-response ladder via PET-MAD v1.0/v1.5.

## Files

- Cells: `cell_{m3gnet,tensornet,chgnet_matpes,qet}_{pbe,r2scan}.json`
- Analysis: `analyze_4x2.py` → `analysis_4x2_results.json`
- Gate 0: `gate0_harness_validation.py` (output in session log)
- matgl 4.0.2 patched locally for torch 2.11 (`matgl/ops/*.py`: builtin generic
  annotations → typing.List/Tuple); patch affects op registration only, not numerics.
