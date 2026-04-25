# Lean Spec

This directory contains a formal specification of interatomic potential validation in Lean 4.

## What It Is

Rather than running every LAMMPS simulation and hoping the statistics converge, this specification **formalizes what it means to validate** — and locks that formalization into the build.

## Current State

- **1,499 build targets** passed ( Mathlib + project )
- **47 theorems** proven across 10 modules
- **6 meta-scientific hypotheses** formally stated
- **5 documented epistemic gaps** (no `sorry` proofs — all theorems are proven)

## Module Map

| Module | Theorems | What It Proves |
|--------|----------|----------------|
| `Data.Benchmark` | 9 | Dataset counts, provenance, non-emptiness |
| `Data.Provenance` | 0 | Value provenance tracking structures |
| `Analysis.Causal` | 9 | Simpson's paradox detection on synthetic BCC |
| `Analysis.Manifold` | 10 | Participation ratio bounds, hyper-ribbon claim |
| `Analysis.Stats` | 0 | Statistical utility functions |
| `Computation.LammpsTrace` | 3 | Trace requirements for benchmark entries |
| `Theory.ParameterBound` | 1 | PR ≤ min(params, observables) for differentiable potentials |
| `Theory.MetaScience` | 5 | Hypothesis board, causal graph structure, irrep sums |
| `Validation.Experiment` | 5 | Experiment design, integrity checks, documented gaps |
| `Validation.Audit` | 5 | Verdict strings, report generation |
| **Vision** | — | Build-locking `#guard` contract; imports all modules |

## Build-Locking Contract

The `Vision.lean` file contains `#guard` statements that are evaluated at compile time. If any fail, the build fails:

```lean
#guard (hypothesisCount >= 6)
#guard (computationallyProvenCount >= 10)
#guard (epistemicGapCount >= 1)
```

These encode the minimum epistemic standard. A future commit cannot silently drop below the threshold.

## How to Build

```bash
# Requires elan (Lean 4 toolchain manager)
$env:Path = "C:\Users\alexw\.elan\bin;" + $env:Path
lake build
```

## Key Design Decisions

- **Synthetic data is embedded** as compile-time constants. Change a value → theorems re-check → build may fail.
- **`native_decide`** is used for theorems about computed `Float` values. Lean compiles the expression, runs it, and locks the result.
- **No `sorry` proofs.** Every theorem is fully proven. Epistemic gaps are documented as `ExperimentGap` structures, not axioms.
- **No LAMMPS execution.** The specification formalizes validation structure before producing traces.

## Related

- [`../docs/formal-vision.md`](../docs/formal-vision.md) — Marketing page with full theorem inventory
- [`../docs/formal-audit.md`](../docs/formal-audit.md) — Split verdict: Simpson's fabricated, hyper-ribbon consistent but ungrounded
