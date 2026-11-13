# Root Ownership Ledger

Updated 2026-11-12. This monorepo is the program record and historical
evidence. Active research happens in
[`lupine-rhizo`](https://github.com/alexwelcing/lupine-rhizo). lupine.science
deploys from [`lupine-science`](https://github.com/alexwelcing/lupine-science),
the Library reader from
[`lupine-ledger`](https://github.com/alexwelcing/lupine-ledger), and the LUPI
viewer from [`Lupi`](https://github.com/alexwelcing/Lupi). The
[README](README.md#what-is-here) has the short map; this file lists every
tracked root directory, what it is for, and where retired roots went.

## Current roots

| Root | Purpose | Status |
| --- | --- | --- |
| `.github/` | CI checks, guards and deploy workflows. Workflows for surfaces that moved out are manual-only: retired guards that point to the new repo, or a rollback. | Keep |
| `archive/` | Retired surfaces and historical bundles, kept for provenance. See [`archive/README.md`](archive/README.md). | Archive |
| `atlas/` | Historical copy of the LUPI viewer source (`atlas/atlas-view/`) plus sample and gallery data. The viewer deploys from `alexwelcing/Lupi`. Firebase functions and Firestore rules still deploy from `atlas/atlas-view/` (`deploy-functions.yml`), and `atlas/compute/` from `deploy-glim-compute.yml`. | Historical copy |
| `atlas-distill/` | Rust engine: scoring, policy, benchmarks, and fixed- and random-effects meta-analysis. Built and tested by `build-atlas-distill.yml`. | Keep |
| `cloudflare/` | Cloudflare Workers (`cdn-proxy/`, `library-proxy/`, `shop-proxy/`). | Keep |
| `cocoindex/` | CocoIndex evidence pipeline over the claims ledger. See `docs/rfc-omnigents-cocoindex.md`. | Keep |
| `data/` | Benchmark fixtures, result payloads and evidence data cited by papers and docs. | Historical evidence |
| `docs/` | Program record: methodology, preregistrations, runbooks, reviews and plans. | Keep |
| `gcp/` | Cloud Run jobs and services for burst compute (`mlip-cell-runner/`, `tasks-consumer/`, `evidence-index/`). | Keep |
| `glim-think/` | Historical copy of the control plane; active development is in `lupine-rhizo`. `deploy-glim-think.yml` here still deploys on pushes to main that touch `glim-think/`. | Historical copy |
| `lean-spec/` | Lean 4 statements behind published arithmetic. Lean checks the arithmetic and stated inequalities; it does not check the physics, the reference data or the pipeline. | Keep |
| `library-site/` | Historical copy of the Library reader. Releases deploy from `lupine-ledger`; `deploy-library-site.yml` here is a manual rollback only. | Historical copy |
| `lupine/` | Correction-operator benchmark scripts and data (0 K DFT targets, error matrix, conformal intervals, head-to-head). Its README predates the Round-2 results in `paper2/ProjectionLaw_Round2.md`. | Historical evidence |
| `lupine-ops/` | Operational tools; a dependency of `atlas-distill/` (see `atlas-distill/Cargo.toml`). | Keep |
| `mlip_immi/` | Real-data MLIP/IMMI analysis scripts and evidence payloads. | Historical evidence |
| `paper/`, `paper2/` | Working-draft manuscripts, figures and their build. | Historical evidence |
| `python/` | Python Distill packages: `lupine_distill` and `lupine_distill_runtime`. | Keep |
| `replication/` | Error-geometry replication kit and the bundles deposited on Zenodo. | Keep |
| `scripts/` | Repo-level utility scripts. | Keep |
| `tools/` | Local CLIs, checks (including the pitch-claim guard) and research helpers. | Keep |

Root-level files (README, licences, `CHANGELOG.md`, `CONTRIBUTING.md`,
`AGENTS.md`, build configuration and a few cited data files) are described in
the README.

## Retired roots

These roots no longer exist at the top level. CI
(`.github/scripts/archive_boundary_check.py`) fails if a tracked file reappears
under one of them or if active Python imports a retired package.

| Retired root | Where it went |
| --- | --- |
| `lupine-start/` | `archive/lupine-start/` (old start site). |
| `distiller/` | Active ODF contracts to `python/lupine_distill/odf/`; the rest to `archive/distiller-kb/`. |
| `lupine-distill/` | Rust engine consolidated into `atlas-distill/`; Python runtime to `python/`; the rest to `archive/lupine-distill-rust/`. |
| `lupine-dspy/` | `archive/lupine-dspy/`. |
| `swarm_preprint_review/` | `archive/swarm_preprint_review/`. |
| `KIMI_MLIP_UNIVERSAL/` | `archive/KIMI_MLIP_UNIVERSAL/` (legacy proof bundle cited by `lean-spec` comments). |

The June 2026 cleanup tables that used to be here are archived in
[`archive/ROOTS-cleanup-log-2026-06.md`](archive/ROOTS-cleanup-log-2026-06.md).
Files removed later stay in git history.
