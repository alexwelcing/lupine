# A6 bridge test at scale — status and blocker

## Status

The A6 bridge protocol and pilot are in place, but the **scaled MatPES/MPtrj/OMat24 manifest cannot be built from the current repo** because the required prediction files do not exist locally.

## What exists

- Protocol: `docs/science/a6_bridge_protocol.md`
- Pilot script: `tools/a6_bridge_pilot.py`
- Pilot results: `docs/glim-m3-upgrade/runs/a6-bridge-pilot-results.md` (5 configurations, 3 models)

## What was searched

A full inventory of `data/`, `replication/`, `gcp/mlip-cell-runner/`, `library-site/`, and `Kimi_Agent_Draft Assistance Team Selected/` found only the 5-configuration pilot-scale cell-result files. No MatPES, MPtrj, or OMat24 prediction files with per-configuration forces/energies and reference labels are present.

## What is missing

To build a meaningful A6 manifest we need cell-result JSONs for at least two models on:

- **Fit set:** ≥100 materials, ≥10,000 configurations (MatPES or MPtrj train)
- **Scale set:** ≥100,000 configurations (OMat24 or MPtrj test)

Each configuration must contain `energy_ev_per_atom`, `forces_ev_per_angstrom`, and matching `reference.*` fields, with consistent `material_id` / `config_id` keys across models.

## Smallest next step

Generate the predictions:

1. Extend `gcp/mlip-cell-runner/build_mptrj_distill_support.py` or `build_canonical_v2_mptrj.py` to sample a larger MPtrj fixture (e.g., 100+ materials, 10,000+ configs) from the public `nimashoghi/mptrj` Hugging Face mirror.
2. Run `mlip-cell-runner` (or a local inference harness) for at least two models to produce cell-result JSONs with predictions and DFT references.
3. For OMat24, sample a stratified slice and repeat the inference.
4. Create the `lupine.a6_bridge.manifest.v1` JSON that maps each model to its cell-result file(s).

Until the prediction files exist, the A6 bridge remains a protocol and pilot only.
