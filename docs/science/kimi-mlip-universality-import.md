# Kimi MLIP Universality Import

Date reviewed: 2026-06-08

Source quarantine: `archive/kimi-workspace-export/`

Curated evidence: `data/mlip_benchmarks/kimi_2026_06_07/`

## Integration Decision

Kimi's export contains strong science, runnable prototypes, cloud notes, caches,
and off-mission strategy documents. I kept the pieces that strengthen the
science/control-plane spine and left the rest quarantined.

Kept:

- Cross-MLIP Cloud Run v7 evidence: 45 elastic calculations, 45 pairwise
  correlations, and 105 ensemble participation-ratio values across MACE,
  CHGNet, and SevenNet.
- The revised weak/strong theorem synthesis: parameter-basis Vandermonde is
  falsified, while the weak acceleration/refusal form remains the operative
  theorem lane.
- MACE irrep-basis Vandermonde result: real geometric decay appears in the
  physical basis, but the pre-registered rho >= 1.5 threshold still fails.
- Real early-exit timing: useful negative result showing that MACE-MP-0 medium
  does not achieve the idealized acceleration bound in a production-like path.
- MLIP/MD interface data: layerwise distance correlates with force error and
  acts as a conservative mixed-reference refusal signal; a Cu-only reference
  does not improve the classifier.
- Two advanced manuscript drafts moved to `paper/review-ready/` as
  review-track material, not submission-ready or claim-promoted material.

Rejected from mainline:

- Exported `.git`, `.pytest_cache`, `__pycache__`, and local runtime folders.
- Business, relocation, investor, lifestyle-financing, and launch-site notes.
- `glim_accel/` as a package. It is promising, but it needs repo-style
  extraction, exception-safe dtype handling, and native integration with the
  existing MLIP resource fabric before it should become canonical code.
- The Cloud Run experiment script as production code. The result and runbook are
  kept, but the script repeats model-specific strain logic and depends on a
  fragile SevenNet/e3nn patch.

## Scientific Findings

Cross-MLIP cloud v7:

- Mean correlations by pair: CHGNet-SevenNet 0.9854, MACE-SevenNet 0.9805,
  MACE-CHGNet 0.9741.
- Sub-0.95 sentinels: Fe MACE-CHGNet 0.7538, Fe MACE-SevenNet 0.7592,
  Al CHGNet-SevenNet 0.8899, Al MACE-CHGNet 0.9198, W CHGNet-SevenNet 0.9494.
- Highest 3-MLIP ensemble PR values: Ta 1.324, V 1.301, Pt 1.193, Cr 1.184.
- The repo-native validator now adds deterministic bootstrap PR intervals and
  rank-stability frequencies before these values are promoted into paper copy.
- Physical-instability flags remain visible: Fe/CHGNet has C11 <= C12;
  Cr/CHGNet, V/MACE, V/SevenNet, and Nb/SevenNet have C44 <= 0.

Vandermonde and acceleration:

- Parameter-basis Vandermonde rho >= 1.5 is refuted across the tested models.
- MACE irrep-basis rho is 0.3865 with R2 0.9807 and MK tau -1.0. This supports
  genuine physical-basis decay but rejects the pre-registered threshold.
- The idealized simulated speedup benchmark matched the theorem-shaped bound,
  but the real early-exit wrapper did not: stop layer 1 averaged 1.41x with
  0.603 eV MAE; stop layer 2 averaged 1.13x with 0.792 eV MAE. The adaptive
  policy averaged 1.71x but had median speedup 1.00x and only exited early on
  5 of 50 structures.

MD/refusal interface:

- Layer-0 distance versus force MAE: Pearson r 0.544, p 4.37e-05.
- Total distance versus force MAE: Pearson r 0.482, p 3.98e-04.
- A force-calibrated threshold sweep over the imported force-MAE rows gives
  layer-0 Youden's J 0.694, but the force-MAE scale is near machine precision;
  treat it as a shape check, not a production threshold.
- Active-learning max pool distance fell from 8.745 to 3.867.
- Mixed-reference total-distance thresholding outperformed the Cu-only
  reference by Youden's J: 0.342 versus 0.067.

## Mainline Hooks

- Evidence contract: `python tools/mlip_kimi_evidence.py --check`
- Guided follow-up queue:
  `data/mlip_benchmarks/kimi_2026_06_07/followup_agenda.json`
- Weak-form scalar Lean gate:
  `lean-spec/OpenDistillationFactory/Materials/Theory/WeakAcceleration.lean`
- Focused test: `python -m pytest tools/test_mlip_kimi_evidence.py`
- Claim lifecycle: `docs/conjectures/ledger.md`
- Provenance: `docs/data-provenance.md`
- Cloud rerun path: `docs/runbooks/cross-mlip-cloud-experiment.md`
- Advanced paper review shelf: `paper/review-ready/`

## Follow-Up Work

1. Extend the scalar weak acceleration/refusal Lean gate into topological
   Lipschitz/reach definitions without relying on the failed rho >= 1.5
   spectral threshold.
2. Port only the reusable pieces of `glim_accel/` into existing `tools/` or
   `gcp/mlip-cell-runner/` surfaces, starting with exception-safe dtype
   management and model-wrapper boundaries.
3. Re-run early-exit on deeper MACE or SevenNet variants before making any
   production acceleration claim.
4. Add timestamped GCS output paths before another Cloud Run cycle so v7 is not
   overwritten by future runs.
5. Treat Fe as a model-disagreement sentinel in this import, not as a high-PR
   outlier: v7 gives Fe all-MLIP PR 1.021 while its MACE pair correlations are
   the weakest in the table.
6. Review the advanced Paper 3 and Paper 4 drafts from
   `paper/review-ready/` before moving either into a public/submission paper
   track.
