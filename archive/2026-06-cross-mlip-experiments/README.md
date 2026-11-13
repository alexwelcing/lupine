# June 2026 cross-MLIP experiments (archived)

> **Archived 2026-11-12. Historical record, not current results.** These files
> were restored from a working folder removed on 2026-11-11 (commit `d9459ae`).
> They are kept because they are the only committed copy of reported numbers or
> are cited by current files. For current status use the maintained
> [hypothesis ledger](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/ledger.md)
> (row "Projection Law June experiments") and the
> [replication kit](../../replication/error-geometry/README.md).

## What is here

| File | Original name | What it is |
| --- | --- | --- |
| `2026-06-11-functional-vs-architecture-4x2-results-report.md` | `results_4x2_report.md` | Results report for the preregistered MatPES 4×2 (architecture × functional) experiment, run 2026-06-11. Verdict as registered: 2 of 4 predictions passed; P-A and P-B failed. Cited by `lean-spec/OpenDistillationFactory/Materials/Theory/ErrorGeometry.lean`. |
| `2026-06-11-functional-vs-architecture-4x2-analysis.py` | `analyze_4x2.py` | Analysis script for predictions P-A to P-D. |
| `2026-06-11-functional-vs-architecture-4x2-results.json` | `analysis_4x2_results.json` | Its output. The only committed copy of the P-A value (0.654, failed against 0.70), the P-B separation (0.085, failed against 0.30) and the P-D value (0.660, quoted as 0.66) in `paper2/immi/ProjectionLaw_IMMI.tex`. |
| `2026-06-11-gate0-harness-validation.py` | `gate0_harness_validation.py` | Gate 0 harness check named in the report (regression, stress-strain cross-check, Au C44 strain-window sweep). Its output was not saved. |
| `2026-06-born-filtered-cross-mlip-alignment.py` | `recompute_born_filtered.py` | Recomputes the MACE/CHGNet/Orb-v3 alignment table with the Born stability filter. Cited by `replication/error-geometry/prereg_functional_vs_architecture_2x2.md`. |
| `2026-06-born-filtered-cross-mlip-alignment.json` | `cross_mlip_alignment_born_filtered.json` | Its output: seven excluded model–element tensors and per-element cosines (e.g. V, cosine −0.88 between its Born-stable pair, as quoted in `paper2/immi/ProjectionLaw_IMMI.tex`). |

## What superseded it

- The 4×2 headline statistics (S_func = +0.317, S_arch = −0.093, permutation
  p = 0.029) are recomputed from committed data by
  [`replication/error-geometry/tier1_analyze.py`](../../replication/error-geometry/tier1_analyze.py).
- That functional-clustering result was not reproduced by the later
  preregistered Round-2 test against DFT targets (3d/4d effect −0.14,
  permutation p = 0.13): see
  [`paper2/ProjectionLaw_Round2.md`](../../paper2/ProjectionLaw_Round2.md) and the
  ledger row "Projection Law Round 2".
- The report's own interpretation (for example "the core in-domain claim
  survives") is historical and is not a current claim.

## Re-running

The scripts originally read their inputs from their own folder and imported
the harness from a local checkout path. In these copies only those paths were
changed, to the committed inputs: the eight cell files and three anchor files
in `replication/error-geometry/data/` (byte-identical to the originals) and
`mlip_immi/cross_mlip_alignment_results.json` (same content as the original
`cross_mlip_alignment.json`). Line endings were normalised to LF.

```
python archive/2026-06-cross-mlip-experiments/2026-06-11-functional-vs-architecture-4x2-analysis.py
python archive/2026-06-cross-mlip-experiments/2026-06-born-filtered-cross-mlip-alignment.py
```

Both need numpy and scipy, and the first also needs ase. Re-run on
2026-11-12, both reproduced the committed JSON (the born-filtered file
exactly; the 4×2 file to the last floating-point digit). They overwrite the
JSON files in this folder. The Gate 0 script also needs MACE and downloads a
model checkpoint; it was not re-run.
