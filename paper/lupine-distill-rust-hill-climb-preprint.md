# Lupine Distill as an In-Run Rust Policy Layer for MLIP Accuracy and Speed Hill Climbing

**Status:** repository preprint, engineering method draft
**System:** `atlas-distill` Rust engine, generic Python MLIP runners, `glim-think` evidence plane
**Target experiment:** MLIP 5x5x3 baseline, Distill Accuracy, and Distill Accuracy + Accelerate

## Abstract

Lupine Distill is designed as an in-run policy layer for machine-learned
interatomic potential (MLIP) calculations. The central engineering claim is
that accuracy and speed gains should be earned inside the calculation loop, not
afterward in an evaluator. The MLIP runner may remain Python because current
scientific stacks are usually Python-first, but the Distill mechanism should be
implemented as a separate Rust system with versioned, deterministic behavior.
That separation lets researchers attach Distill to a local workstation, a GCP
job, or an HPC workflow without changing their MLIP backend or silently drifting
between releases.

This preprint specifies the first version of that method: a canonical
hyperribbon policy engine and a local hill-climb harness in `atlas-distill`.
Given sealed replay cases containing raw MLIP predictions, support evidence,
and reference values, the Rust harness searches candidate hyperribbon limits,
replays intervention decisions, and ranks candidates by normalized accuracy
improvement, runtime-intervention cost, refusals, and unsafe correction blocks.
The output is a versioned JSON artifact that can later be projected into
Cloudflare, Phoenix, or a public report, but those systems are evidence
surfaces. The optimization loop itself is local, deterministic, and owned by
Rust.

## 1. Motivation

The baseline MLIP grid measures how five MLIP stacks perform across five
property rows. That is necessary, but it is not the product. The product is the
ability to improve the outcome of a real run while preserving the researcher's
existing calculation flow. A post-hoc evaluator can tell us whether a run was
good. It cannot prevent a bad force call from destabilizing a relaxation, tune
an intervention threshold before a cell fails, or enforce a canonical runtime
policy across local, cloud, and HPC environments.

Lupine Distill therefore belongs in the calculation path:

- The Python runner owns MLIP integration, ASE calculators, package imports,
  model loading, and device placement.
- The Rust Distill engine owns the versioned intervention policy, support
  gates, correction limits, refusal behavior, and hill-climb search over those
  settings.
- `glim-think`, Cloudflare, and Phoenix own durable state, comparison,
  observability, and public evidence.

This is the boundary that keeps Distill from becoming a sidecar. It is a
working component that can change the result of an MLIP calculation while still
remaining auditable.

## 2. Canonical Runtime Boundary

The deployed MLIP runner calls `atlas-distill distill-policy` with a policy
request:

```json
{
  "schema": "lupine.distill.policy_request.v1",
  "ribbon_version": "hyperribbon-v1",
  "row_id": "forces",
  "mlip_id": "mace",
  "prediction": {
    "forces_ev_per_angstrom": [[0.5, 0.0, 0.0]]
  },
  "support": {
    "correction": {
      "force_bias_ev_per_angstrom": [[-0.1, 0.0, 0.0]]
    },
    "diagnostics": {
      "support_eval_distance": 0.12,
      "leakage_guard": "pass"
    }
  }
}
```

The Rust policy engine returns a decision packet with:

- `corrected_prediction`
- `actions`, such as `accept`, `delta_correct`, `delta_correct_blocked`,
  `tighten`, or `refuse`
- `applied_corrections`
- `theorem_hooks`
- a deterministic `decision_id`

The default runtime contract remains `hyperribbon-v1`. The new work makes the
policy limits explicit as a Rust `PolicyLimits` object:

- maximum energy bias in eV/atom
- maximum stress bias in GPa
- maximum force bias in eV/Angstrom
- maximum allowed force norm
- maximum allowed absolute stress

This is the first operational definition of a versioned Distill ribbon. A
future `hyperribbon-v2` can change these limits or add new gates, but a
published result remains reproducible because it names the exact ribbon version
and candidate id.

## 3. Hill-Climb Harness

The new command is:

```bash
cargo run --bin atlas-distill -- distill-hill-climb \
  --cases tests/fixtures/distill_hill_climb_cases.jsonl \
  --selected-limits-output selected-policy-limits.json \
  --rounds 3 \
  --beam-width 4 \
  --report-top-k 8 \
  --ribbon-version hyperribbon-v1
```

Each sealed case is a local replay unit:

```json
{
  "schema": "lupine.distill.hill_climb_case.v1",
  "case_id": "mace-energy-support-opens-gate",
  "row_id": "energy_volume",
  "mlip_id": "mace",
  "prediction": {"energy_ev_per_atom": 1.0},
  "support": {
    "correction": {"energy_bias_ev_per_atom": -0.65},
    "diagnostics": {"support_eval_distance": 0.08, "leakage_guard": "pass"}
  },
  "reference": {"energy_ev_per_atom": 0.35},
  "weight": 1.0
}
```

The harness starts from the default `PolicyLimits`, generates coordinate
neighbors by scaling each limit, evaluates candidates against every sealed case,
keeps the best beam, and repeats. This is intentionally simple. It gives the
team a deterministic method that can be expanded to Bayesian search, bandits,
or theorem-guided moves later without replacing the artifact contract.

## 4. Objective

For each case, Rust computes a baseline error from the raw prediction and a
corrected error from the Distill decision. The row-specific error functions are:

- energy: absolute error in `energy_ev_per_atom`
- stress: RMSE over `stress_gpa`
- elastic constants: RMSE over `elastic_constants_gpa`, falling back to stress
- forces: RMSE over `forces_ev_per_angstrom`
- relaxation: convergence mismatch plus optional energy and force components

Errors are converted to a normalized accuracy score:

```text
accuracy = 1 / (1 + error / row_tolerance)
```

The candidate objective is:

```text
objective =
  mean(accuracy_corrected - accuracy_baseline)
  + speed_weight * mean(runtime_proxy - 1)
  - refusal_penalty
  - blocked_correction_penalty
  - tighten_penalty
```

`accuracy` uses a small speed weight. `accuracy_accelerate` uses a larger speed
weight. This preserves the intended experimental distinction:

- Distill Accuracy should improve accuracy first.
- Distill Accuracy + Accelerate should preserve the Distill Accuracy gain while
  lowering intervention cost and improving warm runtime behavior.

The current `runtime_proxy` is explicitly labeled `outer_loop_policy_replay`.
It rewards accept-only paths and penalizes corrections, backtracking, blocked
corrections, tighten actions, and refusals. It is not a claim of backend
layerwise early exit. True layerwise acceleration requires a backend adapter
that exposes descriptors or internal layers.

## 5. Why Rust

The policy layer should be harder to accidentally mutate than the MLIP runner.
Python is the correct host for MLIP interoperability, but it is too easy for
runtime decisions to drift when they live inside per-backend scripts. Rust gives
Distill:

- deterministic CLI behavior
- schema-owned inputs and outputs
- explicit numeric limits
- fast local replay over large JSONL traces
- a natural path to static linking in GCP and HPC jobs
- a clean separation between "run the model" and "decide whether to trust,
  correct, tighten, or refuse the result"

This matters for research customers. A lab can keep its own MACE, CHGNet,
M3GNet, ORB, SevenNet, LAMMPS, ASE, or scheduler stack. Distill can graft onto
that stack as a canonical binary and a JSONL contract.

## 6. Artifact Contract

The hill-climb output is:

```json
{
  "schema": "lupine.distill.hill_climb_report.v1",
  "ribbon_family": "hyperribbon-v1",
  "objective": "accuracy",
  "best_candidate": {
    "candidate_id": "ribbon-...",
    "policy_limits": {},
    "objective_score": 0.0,
    "accuracy_delta_mean": 0.0,
    "baseline_error_mean": 0.0,
    "corrected_error_mean": 0.0,
    "runtime_proxy_mean": 0.0,
    "refusal_rate": 0.0,
    "blocked_correction_rate": 0.0,
    "intervention_rate": 0.0
  },
  "candidates": []
}
```

This artifact can be attached to:

- a local 75-cell run directory
- a GCS artifact prefix from GCP
- a Cloudflare D1 campaign row
- a Phoenix experiment packet
- a public baseline report

None of those surfaces owns the optimization result. They preserve evidence.

The winning `policy_limits` object is directly runnable:

```bash
cargo run --bin atlas-distill -- distill-policy \
  --request cell-policy-request.json \
  --policy-limits selected-policy-limits.json \
  --ribbon-version hyperribbon-v1
```

That is the critical closure. The hill climb does not merely explain a better
policy. It produces a runtime object that the next MLIP calculation can use.

## 7. Reproducibility Procedure

The 5x5x3 release loop should use the following path:

1. Run or import the 25-cell baseline and convert each row result into sealed
   hill-climb cases.
2. Hold out `canonical-structures-v2` as evaluation data.
3. Use only non-overlapping support data for corrections and diagnostics.
4. Run `distill-hill-climb --objective accuracy` to select a Distill Accuracy
   ribbon candidate.
5. Run `distill-hill-climb --objective accuracy_accelerate` to select the
   accelerate candidate.
6. Re-run the MLIP cells with the selected candidates active in the policy
   engine.
7. Compare baseline, Distill Accuracy, and Distill Accuracy + Accelerate using
   the same sealed scoring contract.

The publishable claim should not be made from replay alone. Replay selects the
policy. The actual claim comes from re-running the MLIP cells with that policy
active in the loop.

## 8. Current Implementation

This preprint corresponds to the first Rust implementation:

- `atlas-distill distill-policy`
  - canonical MLIP intervention decision
  - default `hyperribbon-v1` behavior
  - configurable `PolicyLimits`
- `atlas-distill distill-hill-climb`
  - sealed JSON/JSONL case loader
  - deterministic coordinate search with beam retention
  - row-aware accuracy scoring
  - refusal, blocked correction, tighten, and intervention penalties
  - versioned `lupine.distill.hill_climb_report.v1` output
- rank-aware residual ribbons
  - Python MLIP runners fit support residual evidence from non-overlapping
    support rows
  - Rust applies the versioned residual correction model, support-lift gate,
    transfer-distance gate, correction scale, and maximum correction bound
  - theorem hooks report residual rank, participation ratio, support lift, and
    whether the claim is rank-limited

On the included replay fixture, the harness identifies a candidate that opens a
previously blocked energy correction gate while preserving force and stress
corrections. The result is not yet a scientific claim. It is proof that the
inner-loop mechanism can tune a canonical Rust ribbon before real 5x5x3 runs.

The first local same-distribution support run used non-overlapping MPtrj train
rows as support and held-out canonical MPtrj rows as evaluation. On
`mace-mp-0` energy prediction, the selected `hyperribbon-mptrj-support-v1`
policy reduced held-out energy MAE from `0.4116` to `0.2038` eV/atom in an
actual in-run replay, while blocking oversized corrections. This is the first
positive local Distill Accuracy result from the Rust policy loop.

The next local probes add two forms of diversity. On SevenNet energy, a
backend-specific policy reduced held-out energy MAE from `0.3997` to `0.2773`
eV/atom. On MACE-MP-0 stress, a row-specific policy reduced held-out stress MAE
from `0.5669` to `0.3481` GPa. These are still local, small-fixture results,
but they show that the residual ribbon is not only a single MACE energy trick.
They also expose an important acceleration boundary: the same MACE stress
policy improves Distill Accuracy but the current accelerate profile worsens the
stress row, so speed-oriented policy search must remain a separate promotion
gate.

## 9. Limitations

This version does not fine-tune MLIP weights. It wraps the same MLIP model and
changes runtime behavior. The acceleration objective currently uses an
outer-loop replay proxy, not measured GPU wall time or layerwise model exits.
Leakage prevention depends on the sealed case builder providing non-overlap
hashes and support diagnostics. The next implementation step is to convert real
baseline cell artifacts into hill-climb cases, select candidate ribbons, and
then re-run Distill variants with those ribbons active.

## 10. Equilibrium-Solve Baseline

The static 5x5 grid is necessary, but it does not fully test whether an MLIP can
recover physics from displacement. The next baseline is therefore an
offset-lattice relaxation task:

1. Start from a known equilibrium reference from DFT, literature, or experiment.
2. Apply a controlled lattice strain and atomic displacement.
3. Ask the MLIP to relax back toward equilibrium.
4. Score the trajectory over step, time, and force-call budget.
5. Emit a viewer artifact showing the perturbed structure drifting toward the
   reference structure.

The Rust command is:

```bash
cargo run --bin atlas-distill -- equilibrium-solve \
  --trajectory tests/fixtures/equilibrium_solve_al_fcc_offset.json \
  --continuation-window-steps 200
```

This produces `lupine.distill.equilibrium_solve_score.v1` with:

- start, final, and best distance to reference
- final and best closeness scores
- elapsed seconds, steps, and force-call budget
- force, stress, lattice, position, and energy residual components
- failure class, such as `solved`, `wrong_equilibrium`, `non_converged`,
  `force_explosion`, `stress_explosion`, `energy_drift`, or `oscillation`
- a continuation-value estimate: how much the last N steps improved the
  distance to reference
- `lupine.mlip.equilibrium_viewer.v1` frames for visualization

This is the first baseline that makes extra compute a first-class scientific
question. If another 200 steps buys five percent closeness, Distill Accuracy
should probably spend it. If another 200 steps buys 0.2 percent, Distill
Accuracy + Accelerate should learn to stop early. Those curves become
hyperribbon evidence rather than merely post-run charts.

## 11. Conclusion

The core shift is architectural: Phoenix records and compares the fight, but
Rust fights it. Lupine Distill should improve MLIP outcomes by making better
intervention decisions during the run. The local hill-climb harness is the first
durable mechanism for that path. It gives us a canonical, versioned way to move
from baseline evidence to a stronger Distill ribbon, then to publishable
accuracy and speed gains in the 5x5x3 experiment.
