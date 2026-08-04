# `mlip_immi/` — Local real-data MLIP/IMMI analysis lane

This directory holds standalone scripts that run MLIPs on the 15-element
IMMI elastic-constant corpus and produce evidence payloads for the worker.
It is the executable real-data lane next to the classical-potential
benchmarks in `atlas-distill/benchmarks/`.

## What lives here

| Script | Purpose |
| --- | --- |
| `elastic_constants.py` | Compute C11/C12/C44 for cubic metals with MACE-MP-0 (or another ASE-compatible MLIP) via strain-energy fitting. |
| `audit_immi_elastics.py` | Self-test the strain-energy convention on a harmonic crystal, then audit real MLIP outputs. |
| `phonon_sentinel.py` | Finite-displacement phonon checks for dynamic stability (Al, Cu, Ni, Ag). |
| `cross_mlip_alignment.py` | Cosine-alignment analysis across MLIP error vectors; tests `hyp_mlip_alignment_test`. |
| `build_ingest_payload.py` | Build the `/claims/ingest` payload from `cross_mlip_alignment.py` results. |
| `run_universality_real_mlip.py` | End-to-end runner for the Universality Theorem real-data replacement sweep. |
| `run_p2_generational_stability.py` | P2 generational-stability test on the IMMI residual matrix. |
| `run_p2_strain_energy_stability.py` | P2 test built from strain-energy residual curves instead of fitted constants. |
| `meam_bootstrap.py` | Bootstrap MEAM participation-ratio sample-size controls. |
| `build_meam_ingest.py` | Build the `/claims/ingest` payload for the MEAM bootstrap closure. |
| `ingest_to_worker.py` | POST MACE-MP-0 predictions to the worker and trigger Manifold analysis. |

## Quick start

```bash
cd mlip_immi

# Compute elastic constants for one element
python elastic_constants.py --element Cu --validate

# Audit existing JSON outputs
python audit_immi_elastics.py --results mace_immi_results.json

# Run the full real-data universality sweep (heavy — needs MACE/CHGNet/Orb)
python run_universality_real_mlip.py --models mace-mp-0,chgnet,orb-v3

# Cross-MLIP alignment and ingest payload
python cross_mlip_alignment.py
python build_ingest_payload.py
```

Use `python run.py --list` to see the same workflows from a single entry point.

## Outputs

- `mace_immi_results.json`, `chgnet_immi_results.json`, `orb_v3_immi_results.json`
- `cross_mlip_alignment_results.json` + `cross_mlip_alignment_ingest.json`
- `meam_bootstrap_results.json` + `meam_bootstrap_ingest.json`
- `runs/` — sweep artifacts from the universality and P2 runners.

## Relationship to other roots

- `elastic_constants.py` and `audit_immi_elastics.py` are self-contained; they
  do not import `python/lupine_distill`.
- `ingest_to_worker.py` posts to the `glim-think` worker (`/ingest/batch`,
  `/fleet/run`).
- For production benchmarking and uplift metrics, prefer
  `python/lupine_distill/` and `python/scripts/run_ni_gpu_loop.py`.
