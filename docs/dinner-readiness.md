# Dinner Readiness

Private local status for the five-item push.

## 1. Causal audit matrix

`atlas-distill benchmark <file> --causal-audit` now emits `benchmark_causal_audit.json`.

The NIST benchmark run produced 9 audit rows across material, potential, and
property groupings crossed with predicted value, signed error, and absolute
relative error outcomes. Five rows require stratified interpretation:

- material / absolute relative error
- potential / signed error
- potential / absolute relative error
- property / signed error
- property / absolute relative error

## 2. Rank-aware manifold reporting

`ManifoldAnalysis` now carries:

- `matrix_rank`
- `rank_limited`
- `sample_to_property_ratio`
- `claim_layer`
- `claim_status`

The NIST 5-observable candidates remain compelling as compressed error
subspaces, but the strict hyper-ribbon claim is withheld by rank gate in the
current data.

## 3. Local GPU queue runner

`scripts/local_gpu_worker.ps1 -ExecuteQueue -Once` can now run offline against
`.glim-runtime/gpu-queue`, produce execution plans under
`.glim-runtime/gpu-results`, and optionally run ready local commands with
`-RunReadyCommands`.

Remote execution status sync is opt-in with `-SyncExecutionUpdates`.

## 4. Lean gates

`Validation.RankGate` separates:

- low participation ratio compression
- rank adequacy
- strict geometric ribbon evidence

`Vision.lean` imports the gate and checks four new theorems. The formal
inventory is now 52.

## 5. Verification

Current local gates:

- `cargo test --release --manifest-path atlas-distill/Cargo.toml`: 106 passed
- `lake build OpenDistillationFactory.Materials.Vision`: passed
- `just verify`: passed

No commits or deployments were made during this private push.
