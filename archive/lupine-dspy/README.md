# lupine-dspy (archived)

A small DSPy experiment package for theorem-aware prompt signatures, research-persistence, and claim tracking.

## What it was

`lupine-dspy` explored using DSPy to manage prompt signatures, optimization history, and theorem-aware research claims. The main surfaces were:

* `lupine_dspy/signatures/atlas_theorem_signature.py` — theorem-aware prompt signatures referencing `lean-spec`.
* `lupine_dspy/persistence/` — research-persistence/migration helpers.
* `lupine_dspy/bridge.py` and `lupine_dspy/cli.py` — runtime bridge and CLI.
* Tests and fixtures under `tests/`.

## Why it was archived

The DSPy track never became part of the active Distill pipeline. Its only consumer was the `lupine-dspy` bridge inside the now-archived `lupine-distill` Rust crate. After the Distill root consolidation, no active code imports this package.

## Active references

None in tracked active code. The only remaining references are historical:

* The `lupine-dspy` bridge in `archive/lupine-distill-rust/src/bridge/`.
* `docs/ATLAS_Lean_Integration_Review.md` and `CHANGELOG.md`.

Keep this directory for provenance only; do not move it back into the active tree.
