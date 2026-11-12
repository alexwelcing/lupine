# ROOTS.md cleanup log, June 2026 (archived)

> **Archived 2026-11-12.** Moved out of [`ROOTS.md`](../ROOTS.md), which now
> lists only current roots and where retired roots went. Kept for provenance;
> the statuses below are as of June 2026.

## Removed in the June 2026 cleanup

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

## Cleanup log

| Date | Action | Rationale |
| --- | --- | --- |
| 2026-06-12 | Moved loose root reference documents (`MLIP_GPU_Execution_Code_Path_Recommendations.docx`, `Research Prep Universality.pdf`, `A Conditional Universality Theorem for Error Geometry in Machine-Learning Interatomic Potentials.pdf`) into `docs/`. | Root should not hold standalone reference files; `docs/` already contains comparable standalone reports and PDFs. Files were unreferenced by tracked code. |
| 2026-06-12 | Re-tagged `KIMI_MLIP_UNIVERSAL/` and `lupine-dspy/` from bare "Remove-candidate" to "Keep, port/reconcile". | Both were still tracked and actively referenced (`lean-spec` comments and `lupine-distill` imports); deleting then would have broken the build. |
| 2026-06-12 | Moved retired `lupine-start/` into `archive/lupine-start/` and updated ignore files + docs. | README already declared it retired; keeping it at root added noise. |
| 2026-06-12 | Archived `KIMI_MLIP_UNIVERSAL/` and `swarm_preprint_review/` under `archive/`; updated Lean comments, workflow, tools, and docs. | Both were legacy roots with active references; archiving keeps provenance while reducing root clutter. |
| 2026-06-12 | Consolidated Distill roots: `distiller/` KB → `archive/distiller-kb/`, ODF contracts → `python/lupine_distill/odf/`; `lupine-distill/` Rust crate → `archive/lupine-distill-rust/`, Python runtime → `python/`; `atlas-distill/` remains the active Rust engine. | Three overlapping Distill roots violated the one-root-one-owner rule. Consolidation gives `python/` sole ownership of active Python Distill code and `atlas-distill/` sole ownership of the Rust engine. |
| 2026-06-12 | Archived `lupine-dspy/` under `archive/`; no active code references it after the Distill consolidation. | The crate was only imported by the archived `lupine-distill` Rust bridge; keeping it at root added noise. |
| 2026-11-12 | Removed `MLIP_GPU_Execution_Code_Path_Recommendations.docx` and `Research Prep Universality.pdf` from `archive/reports/` (they remain in git history), as lupine-rhizo did. | An internal engineering plan and image-only manuscript-preparation notes ending in a journal submission plan; not background reading. |
