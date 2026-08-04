# H3 all-electron DFT anchor — status and blocker

## Status

H3 is **blocked on ab-initio compute**, not on data or analysis code.

## What exists

- Layer-2 data: `data/benchmark_layer2_3x3x3_summary.json` (16 cubic metals × 4 MatPES models × 2 functionals).
- ACWF Layer-3 data: `replication/error-geometry/data/acwf/` has PBE equation-of-state references from FLEUR/WIEN2k all-electron codes, but no elastic constants and no r2SCAN.
- Pre-registration/spec: `replication/error-geometry/prereg_r2b_dft_anchor_spec.md` defines the required all-electron elastic-constant anchor.
- Analysis consumers: `replication/error-geometry/analyze_r2b_anchor.py` and `analyze_r2b_xc_bias_vector.py` are written and waiting for input.

## What is missing

- No all-electron DFT code is installed on the dev machine (`fhi-aims`, `wien2k`, `elk`, `exciting`, `dftk`, etc. all absent).
- `replication/error-geometry/data/anchors/dft_ae/` does not exist.
- No GCP auth/project is active in this session, so a cloud burst job cannot be launched automatically.

## Minimal work needed

Run 16 elements × 2 functionals (PBE, r2SCAN) all-electron elastic-constant calculations (relaxation + finite strain) and write:

- `results-elastic-AE-pbe-v1.json`
- `results-elastic-AE-r2scan-v1.json`

Once these land, `analyze_r2b_anchor.py` executes the H3 test.

## Recommended next step

Launch the staged GCP FHI-aims burst job described in `prereg_r2b_dft_anchor_spec.md`. The spec already contains the instance type, GCS paths, and output schema.
