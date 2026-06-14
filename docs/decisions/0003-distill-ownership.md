# ADR 0003: Consolidate Distill ownership into `atlas-distill/` + `python/`

**Status:** Accepted · **Date:** 2026-06-12

## Context

The repo had three top-level Distill roots that overlapped in purpose:

- `distiller/` — Python distillation orchestration, ODF promotion gate, and a
  knowledge base of reports and model cards.
- `lupine-distill/` — A Rust crate with a small Python runtime
  (`runtime/python/lupine_distill`, `runtime/python/lupine_distill_runtime`).
- `atlas-distill/` — The mature Rust scoring/policy/benchmark engine used by
  GCP runners and `glim-think`.

This violated the repo rule that a root should represent one deployable/working
unit with one clear owner. It also forced callers to guess which root supplied a
given contract, and it left stale Rust code (`lupine-distill/`) beside the
active engine (`atlas-distill/`).

## Decision

Consolidate by runtime/language:

| Runtime / language | Canonical root | What lives there |
| --- | --- | --- |
| Rust engine | `atlas-distill/` | The single active Rust Distill runtime, policy engine, and CLI. |
| Python packages | `python/` | `lupine_distill` (benchmark, uplift, regime, ODF contracts) and `lupine_distill_runtime` (instrumented session/runtime). |
| Retired material | `archive/` | `distiller-kb/`, `lupine-distill-rust/`, and other retired Distill artifacts. |

Specifically:

1. `distiller/odf/` → `python/lupine_distill/odf/` (active ODF contracts).
2. Remaining `distiller/` KB/reports → `archive/distiller-kb/`.
3. `lupine-distill/runtime/python/` → `python/`.
4. `lupine-distill/` Rust crate → `archive/lupine-distill-rust/`.
5. `lupine-dspy/` → `archive/lupine-dspy/` (only referenced by the archived Rust crate).
6. `atlas-distill/` stays the active Rust engine and gains Distill ownership.

## Consequences

### Positive

- One import path for Python Distill code: `python/` on `sys.path`, or an
  editable install of `python/pyproject.toml`.
- One Rust engine: `atlas-distill/`.
- Archived roots preserve provenance without cluttering the active surface.
- `schema_bridge.py` can import directly from `lupine_distill.schemas` instead
  of mirroring the contract.

### Negative / mitigations

- All callers that hard-coded `lupine-distill/runtime/python` or
  `distiller/odf/` had to be updated. The path sweep updated:
  `tools/`, `gcp/mlip-cell-runner/`, `python/tests/`, `python/scripts/`,
  `glim-think/src/research/mlipWorkflowOps.ts`, `.gcloudignore`, and related
  docs.
- `lupine-dspy/` was unreferenced by active code and has been archived under
  `archive/lupine-dspy/`.

## References

- [`ROOTS.md`](../../ROOTS.md) — authoritative root ledger.
- [`python/pyproject.toml`](../../python/pyproject.toml) — packaging metadata
  for the active Python packages.
- [`archive/lupine-distill-rust/`](../../archive/lupine-distill-rust/) —
  archived Rust crate provenance.
