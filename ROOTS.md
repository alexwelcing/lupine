# Root Ownership Ledger

This repo is organized around `glim-think` as the durable research control
plane. A root directory should exist only when it has a clear owner, is actively
used, or is waiting on a named migration out of the root.

## Current Roots

| Root | Purpose | Status | Next action |
| --- | --- | --- | --- |
| `.github/` | CI, deployment, and benchmark workflows. | Keep | Keep workflows tied to active surfaces only. |
| `atlas/` | LUPI viewer, atomistic evidence surfaces, web apps, parsers, and visual artifacts. | Keep | Continue pruning nested retired apps; active public viewer work stays here. |
| `atlas-distill/` | Rust Distill scoring, policy, benchmark, and fault-line runtime. | Keep | Treat as the deterministic engine beside `glim-think`. |
| `cloudflare/` | Edge helpers and Cloudflare infrastructure around the control plane. | Keep | Elevate reusable Workers into `glim-think` when they become first-class control-plane routes. |
| `data/` | Shared benchmark fixtures and evidence payloads. | Keep | Keep data small and cited; large artifacts should live in GCS/R2 with manifests. |
| `distiller/` | Python distillation and ODF orchestration layer. | Keep, consolidate | Keep while active gates and reports use it; fold stable contracts into `glim-think`, `atlas-distill`, or `tools`. |
| `docs/` | Research corpus, plans, runbooks, templates, hypotheses, and decisions. | Keep | Prefer moving archival prose here instead of creating new root folders. |
| `gcp/` | Cloud Run jobs/services used for burst compute and task consumption. | Keep | Keep GCP cold unless the resource ledger justifies burst work. |
| `glim-think/` | Durable intelligence control plane: agenda, ledger, feed, evals, traces, agents. | Primary | New research workflows should connect here first. |
| `KIMI_MLIP_UNIVERSAL/` | Legacy theorem/proof bundle and synthetic universality artifacts referenced by Lean comments. | Remove-candidate | Port any still-needed proof text into `lean-spec/` or `docs/`, then delete this root. |
| `lean-spec/` | Lean 4 formal specifications and proof obligations. | Keep | This is where formal work belongs. |
| `library-site/` | Public Lupine Library build and research surface. | Keep | This is the public science site; do not recreate a second marketing start site. |
| `lupine-distill/` | Rust/Python runtime pieces consumed by MLIP runners and Vectorize contracts. | Keep, reconcile | Reconcile ownership with `atlas-distill` after active runners stop importing it directly. |
| `lupine-dspy/` | Small DSPy experiment package. | Remove-candidate | Promote useful prompts/evals into `glim-think`; delete the root if no current cycle imports it. |
| `lupine-ops/` | Operational tools and monitors. | Keep, maybe elevate | Move mature utilities into `tools/` if the Rust crate remains thin. |
| `mlip_immi/` | Local real-data MLIP/IMMI analysis scripts and evidence payloads. | Keep | Treat as the executable real-data lane for local discovery. |
| `paper/` | IMMI paper source, figures, and publication build. | Keep | Keep publication artifacts here; avoid duplicating papers in site roots. |
| `scripts/` | Repo-level utility scripts. | Keep, prune | Scripts must target active roots only. |
| `swarm_preprint_review/` | Early critique seed corpus referenced by migrations and tools. | Elevate-candidate | Move cited critique material under `docs/evidence/` after updating `tools/glim.py` and migrations. |
| `tools/` | Local CLIs, promotion loops, telemetry checks, and research helpers. | Keep | Keep small, runnable, and connected to `glim-think` or evidence ledgers. |

## Removed In This Cleanup

| Removed root/surface | Why |
| --- | --- |
| `lupine-start/` | Retired marketing/start site; duplicated the Library and kept stale launch pages in the main tree. |
| `atlas/atlas-view/apps/lupine-site/` | Older nested marketing app superseded by `library-site/` and active LUPI apps. |
| `latest/` | Unreferenced old library snapshot and presentation staging area. |
| `minimax-mcp` | Empty submodule pointer with no active root purpose. |
