# lupine-distill-rust (archived)

The old `lupine-distill/` Rust crate and its runtime experiments.

## What it was

`lupine-distill/` was the original Rust Distill engine. It included:

* Core Distill scoring, hypothesis, and manifold modules (`src/hypothesis/`, `src/cross_style.rs`, `src/orthogonalize.rs`, `src/rank_correlation.rs`).
* Literature search and investigation helpers (`src/literature/`).
* A small SQLite-backed ledger and ingest pipeline (`src/db/`).
* A bridge to the `lupine-dspy` Python package (`src/bridge/`).
* Runtime worker sync and CLI entry points (`src/main.rs`, `src/worker_sync.rs`).
* Experiments such as `experiments/rlsf_node5/`.

## What moved to active code

The Distill root consolidation split this crate into the active owners:

| Old location | Active location |
|---|---|
| Rust scoring / policy / geometry engine | `atlas-distill/` |
| Python runtime (sessions, leakage guards, policy engine adapter, events) | `python/lupine_distill_runtime/` |
| Benchmark backends, uplift, regime gate, ODF contracts | `python/lupine_distill/` |

`atlas-distill/` is now the single active Rust engine; `python/` is the single active Python Distill surface.

## What remains here

* The stale crate source, tests, and `Cargo.toml`/`Cargo.lock`.
* `tests/vectorize_schema.rs` — the original schema-round-trip contract.
* `experiments/rlsf_node5/` and the `lupine-dspy` bridge for provenance.

## Active references

A few active files still cite this archive as a read-only schema-contract reference:

* `glim-think/src/types.ts` references `archive/lupine-distill-rust/src/db/schema.rs` for row round-tripping.
* `glim-think/src/literature/__tests__/schema_contract.test.ts` references `archive/lupine-distill-rust/tests/vectorize_schema.rs`.

These are historical anchors; do not reintroduce the crate into the build path.
