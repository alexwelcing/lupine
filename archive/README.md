# Archive

Retired surfaces, old exports, and historical reference bundles that are no longer part of the active development path. They are preserved for provenance and occasional reference lookup.

Each subroot below has its own README with details on what it was, where its active pieces moved, and what still references it.

| Entry | What it was | Why it is here |
|---|---|---|
| `lupine-start/` | The original marketing/start site for Lupine Science. | Superseded by `library-site/` and the LUPI viewer (`atlas/atlas-view/apps/web/`). It duplicated the Library and kept stale launch pages in the main tree. |
| `kimi-workspace-export/` | A full export of the earlier Kimi workspace (nested git repo). | Imported into `data/mlip_benchmarks/kimi_2026_06_07/`; the rest was quarantined for provenance. |
| `KIMI_MLIP_UNIVERSAL/` | Legacy theorem/proof bundle for the Conditional Universality Theorem. | Referenced by `lean-spec` comments as the source of the `MLIP` namespace; kept for provenance while it is ported incrementally. |
| `swarm_preprint_review/` | Early critique seed corpus and MLIP benchmark harness. | Referenced by `tools/glim.py`, migrations, and docs; kept for provenance while cited material is elevated to `docs/evidence/` incrementally. |
| `distiller-kb/` | Python distillation orchestration, ODF reports, and agent profiles. | Active ODF contracts moved to `python/lupine_distill/odf/`; the remaining KB is retired but kept for provenance. |
| `lupine-distill-rust/` | Stale Rust Distill crate and its runtime experiments. | Functionality consolidated into `atlas-distill/`; the Python runtime moved to `python/`. |
| `lupine-dspy/` | Small DSPy experiment package. | Only referenced by the archived `lupine-distill-rust` bridge and historical docs; retired to the archive. |
| `atlas-2026-roadmap-prototypes/` | Early viewer/engine roadmap prototypes and the design manifesto from `atlas/`. | Superseded 2026 roadmap prototypes; not current plans. Nothing builds or serves them. |
| `lupine-site-router/` | The old nginx Cloud Run start page for `lupine.science`, with its `llms.txt`. | Superseded: lupine.science deploys from `alexwelcing/lupine-science` (Cloudflare Pages). Its copy uses retired wording; the deploy workflow is a manual-only guard. |
| `tools-retired/` | Dead or superseded scripts from `tools/`. | No active callers; kept for provenance. |

If something in this archive is still referenced by active code, update the active code rather than moving it back to the root.
