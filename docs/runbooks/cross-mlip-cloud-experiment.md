# Cross-MLIP Cloud Experiment Runbook

Source: Kimi handoff, 2026-06-07

Primary imported evidence:
`data/mlip_benchmarks/kimi_2026_06_07/cross_mlip_cloud_v7_results.json`

## Purpose

Compute cubic elastic constants for 15 IMMI metals across MACE-MP-0, CHGNet,
and SevenNet, then derive per-element cross-MLIP error correlations and ensemble
participation ratios.

The v7 run completed 45 elastic calculations, 45 cross-correlations, and 105
ensemble PR values on Cloud Run GPU. Treat the imported result as evidence, not
as a standing production pipeline.

## Current Result

Important sentinels:

- Fe MACE-CHGNet r = 0.7538 and Fe MACE-SevenNet r = 0.7592.
- Al CHGNet-SevenNet r = 0.8899.
- W CHGNet-SevenNet r = 0.9494.
- Highest 3-MLIP PR: Ta 1.324, V 1.301, Pt 1.193.
- Physical flags: Cr/CHGNet C44 <= 0, V/MACE C44 <= 0, V/SevenNet C44 <= 0,
  Nb/SevenNet C44 <= 0, and Fe/CHGNet C11 <= C12.

Check the imported contract before using these claims:

```powershell
python tools/mlip_kimi_evidence.py --check
```

The guided follow-up queue is materialized at:

```text
data/mlip_benchmarks/kimi_2026_06_07/followup_agenda.json
```

## Cloud Shape

Kimi's v7 container used:

- CUDA 12.1 runtime base image.
- Python 3.11.
- PyTorch 2.5.1.
- `mace-torch==0.3.15` with `e3nn==0.4.4`.
- `chgnet==0.4.2`.
- `sevenn==0.12.1`, installed without dependencies and patched around its e3nn
  version gate.

The handoff identified the active Cloud Run job as `cross-mlip-experiment` and
the v7 image as:

```text
us-central1-docker.pkg.dev/shed-489901/shed-registry/cross-mlip-experiment:v7
```

The output path was:

```text
gs://shed-489901-atlas-outputs/cross-mlip-experiment/results.json
```

Do not reuse that object path for future evidence without adding a timestamp or
versioned prefix.

## Dependency Hazards

The container worked because of non-obvious workarounds:

- MACE wants `e3nn==0.4.4`; SevenNet declares `e3nn>=0.5.0`.
- SevenNet was installed with `--no-deps`, then its version check was patched.
- Manual SevenNet dependencies included `opt_einsum`, `opt_einsum_fx`,
  `torch_geometric`, `torch_scatter`, `pyyaml`, `tqdm`, `typing_extensions`,
  `braceexpand`, and `scikit-learn`.
- MACE's float64 calculator can change Torch's global default dtype. CHGNet and
  SevenNet calls must restore float32 in an exception-safe context.

## Promotion Guidance

Before this becomes canonical repo code:

1. Move repeated strain-energy logic into one shared helper.
2. Put model calculators behind a common wrapper interface.
3. Replace inline dtype save/restore with a context manager that restores dtype
   in `finally`.
4. Add a config file for elements, models, strain sizes, and output locations.
5. Write versioned GCS artifacts instead of overwriting `results.json`.
6. Validate physical sanity before correlations: positive C11/C44 and C11 > C12
   should be warnings, not hidden filters.
