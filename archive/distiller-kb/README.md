# distiller-kb (archived)

The old `distiller/` root: a Python distillation knowledge base and early Open Distillation Factory (ODF) orchestration harness.

## What it was

`distiller/` combined two things:

* **Knowledge base** — extraction, categorization, and cross-referencing of molecular-dynamics simulation principles from academic papers (`schema.py`, `extract.py`, `ingest.py`, `graph.py`, `export.py`, `seeds.py`, `knowledge_base.json`).
* **Early ODF harness** — promotion gates, model cards, agent profiles, and orchestration commands (`cli.py`, `agents/`, `docs/`).

## What moved to active code

The active ODF contracts were extracted and hardened under `python/lupine_distill/odf/`:

| Old location | Active location |
|---|---|
| `distiller/odf/promotion_gate.py` | `python/lupine_distill/odf/promotion_gate.py` |
| `distiller/odf/model_card.py` | `python/lupine_distill/odf/model_card.py` |
| Shared benchmark/schema contract | `python/lupine_distill/schemas.py` and `python/lupine_distill/odf/schema_bridge.py` |

Use `python/lupine_distill/odf/` for any new ODF or promotion-gate work.

## What remains here

* KB schema, seed principles, and extract/ingest/export/graph pipelines.
* Historical agent profiles and docs (`docs/ODF_ORIGIN.md`, `docs/ARCHITECTURE.md`, etc.).
* Old tests and ODF artifacts kept for provenance.

## Active references

No active imports. Historical references remain in `docs/`, `ROOTS.md`, `CHANGELOG.md`, and `ATLAS_Lean_Integration_Review.md`. `scripts/point.ps1` still contains a stale `distiller` branch; do not use it.

If you need ODF promotion logic, import from `python/lupine_distill.odf`, not from here.
