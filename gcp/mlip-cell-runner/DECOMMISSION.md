# MLIP Cell Runner — Decommission Map

This document records the consolidation of the MLIP cell runner from a fan-out
of per-backend "lone wolf" build files into a single managed infrastructure
definition.

The new unified files were added **alongside** the legacy files. Nothing has
been deleted yet — decommissioning the legacy files is a **separate, manual
step** to be taken only after the unified path has been proven in GCP. This
file is the checklist for that step: it lists exactly which legacy files each
new file replaces.

## Replacement map

| New (managed) file | Replaces (legacy files) | Notes |
|---|---|---|
| `pyproject.toml` | `requirements-common.txt`, `requirements-mace.txt`, `requirements-chgnet.txt`, `requirements-m3gnet.txt`, `requirements-orb.txt`, `requirements-sevennet.txt`, `requirements-uma.txt` | Single source of truth for deps. Core deps in `[project.dependencies]`; each backend is an extra in `[project.optional-dependencies]` (`mace`, `chgnet`, `matgl` for M3GNet, `orb`, `sevennet`, `uma`). |
| `Dockerfile.unified` | `Dockerfile` | One CUDA-devel image; backend chosen by the `BACKEND` ARG, which selects the matching pyproject extra. Keeps the proven atlas-distill Rust builder stage and the fail-closed `--help` self-check. |
| `cloudbuild.unified.yaml` | `cloudbuild.yaml`, `cloudbuild.single.yaml`, `cloudbuild-m3gnet.yaml`, `cloudbuild-orb-m3gnet.yaml` | One matrix-driven config keyed on the `_BACKEND` substitution (default `mace`) with `dynamic_substitutions: true`. Builds + pushes `gcr.io/$PROJECT_ID/mlip-runner:$_BACKEND`. Invoke once per backend instead of maintaining bespoke step lists. |
| `iac/deploy-mlip-runner.yml` | (new capability — no legacy equivalent) | GitHub Actions workflow that submits `cloudbuild.unified.yaml` across a backend matrix via Workload Identity Federation. |
| `policies/nightly-baseline.yml`, `policies/weekly-sweep.yml`, `policies/on-proof-complete.yml`, `policies/distill-validation.yml`, `policies/atlas-import-check.yml` | (new capability — no legacy equivalent) | Scheduled-run policies (when/what to run). **Distinct** from the existing `policies/*.json` PolicyLimits files, which tune the distill ribbon and are NOT decommissioned. |
| `src/openinference_patcher.py` | (new capability) | Opt-in OpenInference TOOL-span emission for benchmark cells. |
| `src/loop_connector.py` | (new capability) | Opt-in async push of results to the glim-think `ExperimentFacet` RPC. |

## Legacy files retained (NOT decommissioned)

These stay; they are referenced by the runner or are a different concept:

- `mlip_cell_runner.py` — the runner entrypoint (the unified image runs it).
- `fixture_contract.py` — manifest/row contract used by the runner.
- `backend_catalog.json` — backend metadata catalog.
- `fixtures/**` — canonical manifests and distill-support fixtures.
- `policies/*.json` + `policies/README.md` — distill **PolicyLimits** (ribbon
  tuning), a different concept from the new scheduled-run `*.yml` policies.
- `test_*.py`, `build_*.py` — runner tests and dataset builders.

## Manual decommission steps (do later, after GCP proof-out)

1. Confirm `cloudbuild.unified.yaml` builds and deploys all six backends
   (`mace`, `chgnet`, `sevennet`, `orb`, `matgl`, `uma`) in GCP.
2. Confirm the unified image's `BACKEND`-selected deps match the previously
   pinned per-backend stacks (esp. the M3GNet DGL find-links and the ORB cu118
   torch — see note below).
3. Repoint any external callers from `cloud-run-source-deploy/mlip-cell-*`
   image paths to `gcr.io/$PROJECT_ID/mlip-runner:<backend>`.
4. Delete the legacy files listed in the replacement map above.
5. Update `README.md` to describe only the unified path.

### Known stack-pinning caveat to resolve before deleting legacy reqs

The legacy per-backend requirements encoded torch stacks that are **not all
mutually compatible** in one image:

- `requirements-orb.txt` pinned `torch==2.6.0+cu118` (a separate CUDA 11.8
  stack), whereas the common pin is `torch==2.4.1+cu121`.
- `requirements-uma.txt` pinned `numpy==2.2.6` and `fairchem-core==2.14.0` (a
  torch 2.8-era stack), vs the common `numpy==1.26.4`.

`pyproject.toml` pins the common cu121 torch and lists each backend as an extra,
so a single image installs core + one backend. The ORB and UMA stacks may still
require their own torch/numpy at build time; if so, keep those backends' image
builds parameterised (the `BACKEND` ARG already isolates the pip step) and adjust
the extra/`--extra-index-url` per backend rather than reintroducing separate
requirements files. Validate ORB and UMA image builds explicitly before deleting
`requirements-orb.txt` / `requirements-uma.txt`.
