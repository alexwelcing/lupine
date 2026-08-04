# Root Ownership Ledger

This repo is organized around `glim-think` as the durable research control
plane. A root directory should exist only when it has a clear owner, is actively
used, or is waiting on a named migration out of the root.

The planned public-surface extraction is documented in
[`docs/repo-split-map.md`](docs/repo-split-map.md). Until those repos are live,
the roots below remain the current source/deploy truth.

## Current Roots

| Root | Purpose | Status | Next action |
| --- | --- | --- | --- |
| `.github/` | CI, deployment, and benchmark workflows. | Keep | Keep workflows tied to active surfaces only. |
| `atlas/` | LUPI viewer, atomistic evidence surfaces, web apps, parsers, and visual artifacts. | Keep | The canonical browser app is `atlas/atlas-view/apps/web/`; avoid recreating parallel studio apps. |
| `atlas-distill/` | Rust Distill scoring, policy, benchmark, and fault-line runtime. | Keep | Treat as the deterministic engine beside `glim-think`. |
| `cloudflare/` | Edge helpers and Cloudflare infrastructure around the control plane. | Keep | Elevate reusable Workers into `glim-think` when they become first-class control-plane routes. |
| `data/` | Shared benchmark fixtures and evidence payloads. | Keep | Keep data small and cited; large artifacts should live in GCS/R2 with manifests. |
| `docs/` | Research corpus, plans, runbooks, templates, hypotheses, and decisions. | Keep | Prefer moving archival prose here instead of creating new root folders. |
| `exports/` | Generated, versioned public-surface bundles published by the science/control-plane repo. | Keep | Keep export manifests reproducible and regenerate from source docs/scripts before public-surface extraction. |
| `gcp/` | Cloud Run jobs/services used for burst compute and task consumption. | Keep | Keep GCP cold unless the resource ledger justifies burst work. |
| `glim-think/` | Durable intelligence control plane: agenda, ledger, feed, evals, traces, agents. | Primary | New research workflows should connect here first. |
| `archive/KIMI_MLIP_UNIVERSAL/` | Legacy theorem/proof bundle and synthetic universality artifacts referenced by Lean comments in `lean-spec/`. | Keep, port incrementally | Archived root; port proof text into `lean-spec/` or `docs/` before removing. |
| `lean-spec/` | Lean 4 formal specifications and proof obligations. | Keep | This is where formal work belongs. |
| `library-site/` | Public Lupine Library build and research surface. | Keep | This is the public science site; do not recreate a second marketing start site. |
| `python/` | Active Python Distill packages: `lupine_distill` (benchmark/uplift/regime/ODF contracts) and `lupine_distill_runtime` (instrumented runtime). | Keep | The single source of truth for Python Distill code; everything that imports it should target this root. |

| `lupine-ops/` | Operational tools and monitors. | Keep | Active dependency of `atlas-distill/` (ledger, elastic, statics, mlip_ops). Do not archive or move without updating `atlas-distill/Cargo.toml` and agent imports. |
| `mlip_immi/` | Local real-data MLIP/IMMI analysis scripts and evidence payloads. | Keep | Treat as the executable real-data lane for local discovery. |
| `paper/` | IMMI paper source, figures, and publication build. | Keep | Keep publication artifacts here; avoid duplicating papers in site roots. |
| `scripts/` | Repo-level utility scripts. | Keep, prune | Scripts must target active roots only. |
| `archive/swarm_preprint_review/` | Early critique seed corpus referenced by migrations and tools. | Keep, archive | Archived root; cited material can be elevated to `docs/evidence/` incrementally. |
| `tools/` | Local CLIs, promotion loops, telemetry checks, and research helpers. | Keep | Keep small, runnable, and connected to `glim-think` or evidence ledgers. |
| `cocoindex/` | CocoIndex v1 evidence pipeline: incremental D1-ledger → embedded SQLite index over coordination traces, hypotheses, and claims. | Keep | The evidence tier closing the loop with `glim-think`'s Omnigents coordination layer. See `docs/rfc-omnigents-cocoindex.md`. |

## Removed In This Cleanup

| Removed root/surface | Why |
| --- | --- |
| `lupine-start/` | Retired marketing/start site; moved to `archive/lupine-start/`. |
| `distiller/` | Python distillation KB and retired ODF orchestration; active ODF contracts moved to `python/lupine_distill/odf/`, remaining prose moved to `archive/distiller-kb/`. |
| `lupine-distill/` | Stale Rust crate and runtime root; Rust engine consolidated into `atlas-distill/`, Python runtime moved to `python/`, retired material archived to `archive/lupine-distill-rust/`. |
| `lupine-dspy/` | Small DSPy experiment package; only referenced by the archived `lupine-distill` Rust crate. Moved to `archive/lupine-dspy/`. |
| `atlas/atlas-view/apps/lupine-site/` | Older nested marketing app superseded by `library-site/` and active LUPI apps. |
| `atlas/atlas-view/apps/lupi-studio/` | Fake/duplicate studio app that misdirected agents away from the real `apps/web/` viewer. |
| `latest/` | Unreferenced old library snapshot and presentation staging area. |
| `minimax-mcp` | Empty submodule pointer with no active root purpose. |

## Cleanup Log

| Date | Action | Rationale |
| --- | --- | --- |
| 2026-06-12 | Moved loose root reference documents (`MLIP_GPU_Execution_Code_Path_Recommendations.docx`, `Research Prep Universality.pdf`, `A Conditional Universality Theorem for Error Geometry in Machine-Learning Interatomic Potentials.pdf`) into `docs/`. | Root should not hold standalone reference files; `docs/` already contains comparable standalone reports and PDFs. Files were unreferenced by tracked code. |
| 2026-06-12 | Re-tagged `KIMI_MLIP_UNIVERSAL/` and `lupine-dspy/` from bare "Remove-candidate" to "Keep, port/reconcile". | Both were still tracked and actively referenced (`lean-spec` comments and `lupine-distill` imports); deleting then would have broken the build. |
| 2026-06-12 | Moved retired `lupine-start/` into `archive/lupine-start/` and updated ignore files + docs. | README already declared it retired; keeping it at root added noise. |
| 2026-06-12 | Archived `KIMI_MLIP_UNIVERSAL/` and `swarm_preprint_review/` under `archive/`; updated Lean comments, workflow, tools, and docs. | Both were legacy roots with active references; archiving keeps provenance while reducing root clutter. |
| 2026-06-12 | Consolidated Distill roots: `distiller/` KB → `archive/distiller-kb/`, ODF contracts → `python/lupine_distill/odf/`; `lupine-distill/` Rust crate → `archive/lupine-distill-rust/`, Python runtime → `python/`; `atlas-distill/` remains the active Rust engine. | Three overlapping Distill roots violated the one-root-one-owner rule. Consolidation gives `python/` sole ownership of active Python Distill code and `atlas-distill/` sole ownership of the Rust engine. |
| 2026-06-12 | Archived `lupine-dspy/` under `archive/`; no active code references it after the Distill consolidation. | The crate was only imported by the archived `lupine-distill` Rust bridge; keeping it at root added noise. |
