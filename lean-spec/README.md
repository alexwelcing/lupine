# Lean Spec

`lean-spec/` holds the machine-checked theorems behind the materials-science
claims in the Lupine Science repo. It is the formal evidence plane: every
serious claim about error geometry, regime gates, or promotion eventually
touches a theorem proven here.

## Current state

- **77 build-locked theorems** in the executable vision, **~225 theorem declarations**, **0 `sorry` proofs**, **2891-job build green**.
- The build is locked by `#guard` contracts in `Materials/Vision.lean`.
- Epistemic gaps are documented as structures/comments, not as axioms.

See [`AGENTS.md`](../AGENTS.md) §"Formal verification" for the operating rules
governing this root.

## What lives inside

| Path | Purpose |
| --- | --- |
| `OpenDistillationFactory/Materials/` | All formalization modules (data, analysis, theory, validation). |
| `OpenDistillationFactory/Materials/Vision.lean` | Build-locking executable vision; imports every module. |
| `OpenDistillationFactory/Materials/Theory/` | Error geometry, hyper-ribbon, projection law, universality bridge. |
| `OpenDistillationFactory/Materials/Analysis/` | Causal/ecological-fallacy detection, manifold participation-ratio bounds. |
| `OpenDistillationFactory/Materials/Validation/` | Audit verdicts, experiment design, rank gate. |
| `OpenDistillationFactory/Materials/Data/` | Benchmark datasets, provenance tracking, synthetic embeddings. |
| `OpenDistillationFactory/Materials/DistillAtlas/` | Formalized MPtrj-DFT and Ni-EAM evidence maps. |
| `OpenDistillationFactory/Materials/NeuralSymbolic/` | Neural-symbolic shear-bound theorems for CHGNet and MACE-MP-0. |
| `lakefile.toml` | Lake package manifest; pins Mathlib and ATLAS-Lean revisions. |
| `lean-toolchain` | Pinned Lean `v4.29.0` (matches ATLAS-Lean). |

## Install

Install the Lean toolchain via [elan](https://github.com/leanprover/elan), then
hydrate the Mathlib cache. Full setup is in [`docs/ONBOARDING.md`](../docs/ONBOARDING.md).

## Build

```bash
# Run from INSIDE lean-spec/ so elan selects the pinned v4.29.0 toolchain.
cd lean-spec
lake exe cache get
lake build
```

A green build is the gate. A broken build or any new `sorry` proof is a
regression.

## Check

```bash
# Re-run the full proof build
cd lean-spec
lake build

# Count theorems (sanity check; authoritative count is in AGENTS.md)
git grep -c "^\s*theorem " OpenDistillationFactory/Materials/
```

## How it connects to the rest of the repo

- `python/lupine_distill/odf/promotion_gate.py` references theorems from this
  package when evaluating promotion recommendations.
- `tools/mlip_regime_filter.py` and `tools/regime_gate_flywheel.py` consume
  the regime-gate formalization.
- `gcp/mlip-cell-runner/` may embed theorem hooks in Distill runtime cells.
- The system map is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Windows notes

- Always run `lake` from inside `lean-spec/`; running from the repo root selects
  the global toolchain and silently refuses the ATLAS-Lean cache.
- Do **not** import whole ATLAS-Lean subjects (e.g. `Atlas.RealAnalysis`). Import
  only the proved leaf modules you need; whole-subject imports are ~80 min and
  can OOM a dev box.

## Related

- [`docs/ONBOARDING.md`](../docs/ONBOARDING.md) — new-contributor tracks
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — system map
- [`AGENTS.md`](../AGENTS.md) — operating rules (zero-`sorry` gate, ATLAS-Lean hygiene)
