# Working Papers

The research program's manuscripts, distributed as working papers. Status for
both: **working paper, in preparation** — not yet submitted to any venue.
Every number in both papers traces to a pre-registration, a committed dataset,
or a machine-checked theorem; the replication kit below verifies the headline
statistics from raw data in seconds.

## The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint

*Working paper, June 2026.*
A model family acts as a projection operator: every well-fitted member shares
one residual — a single direction in observable space — and that direction
fingerprints whatever constraint binds the family. Machine-checked theory
core (27 Lean 4 theorems, zero unproven obligations) plus pre-registered
factorial experiments at three layers of the matter-simulation stack:
classical potentials (constraint = functional form), foundation models
(constraint = training functional, p = 0.029), and DFT implementations
(constraint = pseudopotential table, p = 0.017). Four of seven registered
predictions failed and are reported as failures; neither registered
refutation condition was triggered.

**[Download PDF](https://storage.googleapis.com/shed-489901-replication/papers/projection-law-working-paper-v2026-06-11.pdf)**

## The Causal Geometry of Prediction Errors in Interatomic Potentials

*Working paper, June 2026.*
The empirical discovery substrate: elastic-constant prediction errors of 559
classical interatomic potentials across 15 cubic metals occupy low-dimensional
hyper-ribbon manifolds (participation ratio 1.0–2.3 out of 3, median 1.09),
with a BCC/FCC accuracy dichotomy, extreme between-element heterogeneity
(I² = 98.6%), and an ecological-fallacy demonstration for pooled
benchmarking. Includes the Born-screened foundation-MLIP extension.

**[Download PDF](https://storage.googleapis.com/shed-489901-replication/papers/causal-geometry-working-paper-v2026-06-11.pdf)**

## Replication kit and data

Everything behind both papers — pinned datasets, three pre-registrations with
commit hashes, robustness analyses, and the two-tier replication kit — is
publicly served, versioned by commit:

**[Replication kit landing page](https://storage.googleapis.com/shed-489901-replication/error-geometry/v1-10c18ace/index.html)**

Tier 1 (`python tier1_analyze.py`, NumPy only) verifies the factorial
statistics from committed raw data in seconds; Tier 2 re-derives the raw
elastic constants from public model checkpoints through a frozen harness.
The Lean 4 formal artifact builds with `lake build` in `lean-spec/`.
