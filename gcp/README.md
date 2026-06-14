# `gcp/` — Cloud Run jobs and services

This root is the governed cloud-compute instrument: Cloud Run jobs and services
that `glim-think` dispatches via Cloud Tasks when local or burst compute is
needed.

## What lives inside

| Directory | Purpose |
| --- | --- |
| `mlip-cell-runner/` | Cloud Run Jobs that execute one `(row_id, mlip_id)` MLIP cell each. |
| `tasks-consumer/` | Rust Cloud Run service that receives Cloud Tasks and starts allowlisted jobs. |
| `lupine-site-router/` | Small nginx Cloud Run service that owns `lupine.science` and routes to canonical surfaces. |

### `mlip-cell-runner/`

The execution instrument for `mlip-baseline-grid` and real `mlip-5x5x3`
campaigns. Each backend (MACE, CHGNet, M3GNet, ORB, SevenNet, UMA) has its own
Cloud Run Job image. See [`mlip-cell-runner/README.md`](./mlip-cell-runner/README.md).

Key files:

- `mlip_cell_runner.py` — generic runner contract.
- `backend_catalog.json` — backend ids, target jobs, requirements, canary rows.
- `fixtures/` — smoke and contract fixtures.
- `policies/` — Distill policy payloads.
- `cloudbuild*.yaml` — GCP build configs.
- `test_*.py` — runner unit tests.

### `tasks-consumer/`

Rust/Axum service that receives signed Cloud Tasks from `glim-think` and starts
one of the allowlisted jobs. It is the only entry point for cloud compute; the
Worker never reaches the runner directly.

Key files:

- `src/main.rs` — task handler and job dispatcher.
- `Cargo.toml` — Rust package manifest.
- `cloudbuild.yaml` — GCP build config.
- `Dockerfile` — container image.

### `lupine-site-router/`

Static nginx service that owns the `lupine.science` apex domain after the
retired `lupine-start/` site was archived. It routes readers to the Library,
LUPI viewer, and GitHub source. See
[`lupine-site-router/README.md`](./lupine-site-router/README.md).

## Install

Cloud deployments require `gcloud` configured for project `shed-489901`. Local
development prerequisites vary by service:

- `mlip-cell-runner`: Python 3.10+, Docker, selected MLIP packages.
- `tasks-consumer`: Rust 1.80+.
- `lupine-site-router`: Docker only.

Full setup is in [`docs/ONBOARDING.md`](../docs/ONBOARDING.md).

## Build / test

```bash
# mlip-cell-runner (local smoke)
cd gcp/mlip-cell-runner
python mlip_cell_runner.py run-cell --help
python -m pytest test_fixture_contract.py -q

# tasks-consumer (Rust compile check)
cd ../tasks-consumer
cargo check

# lupine-site-router (nginx config check)
cd ../lupine-site-router
docker build .
```

## How it connects to the rest of the repo

- `glim-think/` owns the run ledger and dispatches Cloud Tasks to
  `tasks-consumer/`.
- `tasks-consumer/` starts jobs defined in `mlip-cell-runner/`.
- `mlip-cell-runner/` imports `python/lupine_distill_runtime` for instrumented
  cells and may invoke `atlas-distill/` for Distill policy decisions.
- Results are posted back to `glim-think` as authenticated beats and stored in
  `data/mlip_benchmarks/` manifests.
- The system map is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Windows notes

- Do not use PowerShell for `cargo`, `gcloud builds submit`, or Docker
  multi-step tasks; use Git Bash or the root `justfile` wrappers.
- `mlip-cell-runner` local smoke should be run from Git Bash so path and
  environment handling matches CI.
