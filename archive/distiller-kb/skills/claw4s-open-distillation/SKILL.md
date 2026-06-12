---
name: claw4s-open-distillation
description: "End-to-end reproducible skill to run the Open Distillation Factory MVP — Rust kernel tests, Lean certification, Hermes profile memory checks, and internal loop-closure run manifest."
user-invocable: true
emoji: "\U0001F9EC"
homepage: https://github.com/alexwelcing/open-distillation-factory
allowed-tools: Bash(cargo *), Bash(lake *), Bash(test *), Bash(sha256sum *), Bash(bash scripts/competition/run_mvp.sh)
tags:
  - molecular-dynamics
  - distillation
  - rust-kernel
  - lean-proofs
  - scientific-computing
  - provenance
  - reproducibility
  - open-distillation-factory
---

# claw4s-open-distillation

## Purpose
Execute a transparent, reproducible MVP distillation run and package artifacts for internal skill-first loop closure.

## Inputs
- Repository checkout
- Optional `lake` binary (for Lean build)

## Steps
1. Validate required project files, profile configs, and memory files.
2. Run Rust kernel tests in `rust-core`.
3. Attempt Lean builds in `lean-spec` (skip with explicit status if `lake` is unavailable).
4. Hash key artifacts and emit a run manifest JSON to `runs/manifests/latest.json`.
5. Print a concise execution summary with pass/warn/fail markers.

## Execute
```bash
bash scripts/competition/run_mvp.sh
```

## Outputs
- `runs/manifests/latest.json`
- Terminal summary indicating which gates passed.

## Review criteria mapping
- **Executability:** single command run with deterministic checks.
- **Reproducibility:** artifact hashes + persisted run manifest.
- **Rigor:** Rust numeric tests + Lean theorem build gate (when available).
- **Generalizability:** profile/memory scaffolding explicit.
- **Clarity:** emitted status report and machine-readable manifest.
