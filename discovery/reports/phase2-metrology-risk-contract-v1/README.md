# Measurement uncertainty is not a candidate-pool guarantee

2026-10-16. **DESIGN_ONLY: conditional mathematics and source interpretation.**
No adapter, model, benchmark, threshold, allocation, product feature or source
operation is introduced. The purpose is to prevent a documentary uncertainty
statement from silently becoming a different mathematical certificate.

## What the BAM documents support

Retained publisher metadata for BAM version 1.0, DOI
[10.5281/zenodo.17846617](https://doi.org/10.5281/zenodo.17846617), says expanded
measurement uncertainty for `Rm`, `Rp0.2` and `Z` was assessed for each test.
Its Table 1 gives campaign maxima with a stated “95 % level of confidence,
k = 2.” This is a publisher-reported metrology statement. We neither independently
recomputed it nor read the cited standards or calibration certificates. The
percentage convention for `Z` remains unconverted.

The evidence author's source-bound documentary workbook report now establishes
within-document pairing of selected current-test endpoints for three test IDs.
It identifies shared equipment/procedures and material history, but finds no
explicit per-test uncertainty budget, covariance matrix or coverage-factor
fields in its admitted projection. That scoped finding is not proof of absence
from unparsed or linked sources. The workbook is permanently exposed and barred
from a new blind predictive benchmark. This note reads only that own-paraphrase
report and findings, not the workbook or complete cell projection.

The historical eleven-versus-ten header discrepancy has a narrow documentary
resolution: the separately published ASCII header projection observes `UNIT`
as column 7. It does not establish a complete unit/uncertainty dictionary or a
probability law; the CSV body's intended encoding remains unresolved.

| Statement | Supported scope | Additional claim not established |
| --- | --- | --- |
| Reported expanded measurement uncertainty, nominal 95%, k=2 | The publisher's stated measurement assessment and campaign maximum summary | Exact repeated-sampling failure probabilities for every endpoint, a deterministic enclosure, or simultaneous coverage |
| Same-test endpoint association | Documentary pairing within the exposed workbook | Independent errors, independent specimens/heats/campaigns, or a future-material sampling frame |
| Shared equipment and material history | Possible common error and lineage sources requiring investigation | A covariance model, a sign of dependence, or validity of multiplying marginal probabilities |
| Units and endpoint labels | A basis for a separately checked semantic map | Prediction error bounds for a model, candidate diversity, or a complete feasibility/objective panel |

Source identities and exact locations are in `source-bindings.json`. Earlier
readiness documents describe earlier access states; they are not used to deny
the later documentary findings. G20 uncertainty/lineage questions and G21
evaluation design remain unresolved.

## A common probability contract must come first

Let `J` be any fixed finite index set of required quantities. An index may
identify a candidate, endpoint and operating condition together. On one
specified probability space `(Ω, P)`, let `θ_j` be the target quantity and
`C_j(D)` its reported random interval. Write

```
E_j = {θ_j ∈ C_j(D)},       F_j = E_jᶜ.
```

The event must name its target and source of randomness. For example, a
repeated-measurement confidence statement concerns a procedure under a stated
measurement law; a posterior/epistemic probability statement concerns its
stated conditional uncertainty law. Either can be reasoned about under its
declared law, but they are not interchangeable without a justification. Neither
automatically concerns a fresh specimen, a new operating condition or a
surrogate model's error. If parameter-uniform coverage is intended, the bounds
below must hold for every allowed parameter/law, not just an unstated choice.
All events in the probability arguments are assumed measurable.

Even under the stronger hypothetical premise that `u` is exactly a standard
deviation and `U = 2u`, the scale factor alone does not imply 95% coverage.
Take 25 equally likely worlds with centered measurement error `X`: 21 worlds
have `X=0`, two have `X=5/2`, and two have `X=−5/2`. Then

```
E[X] = 0,
Var(X) = (4/25)·(25/4) = 1,
P(|X| ≤ 2) = 21/25.
```

Thus `u=1` and `k=2` are compatible with coverage `21/25`, not `19/20`.
This is a deliberately hypothetical event model, not a model of BAM and not a
refutation of its stated measurement assessment. It isolates the missing
distribution/coverage assumptions. We do not assume a Gaussian law or replace
the publisher's nominal 95% statement by a Gaussian two-standard-deviation
probability.

## Exact marginal-versus-joint counterexamples

The following worlds are constructed mathematical examples, with no materials
observations. Fix `θ_1=θ_2=0`. Give each endpoint interval `[-1,1]` on its
success worlds and `[2,4]` on its failure worlds. These are explicit random
interval procedures, not merely unattached probability labels.

| Hypothetical law | Failure events | Each marginal coverage | Simultaneous coverage |
| --- | --- | --- | --- |
| Uniform on 20 worlds | `F_1={1}`, `F_2={2}` | `19/20` | `18/20` |
| Uniform on 20 worlds | `F_1=F_2={1}` | `19/20` | `19/20` |
| Uniform on 20×20 worlds | `F_1={first coordinate=1}`, `F_2={second coordinate=1}` | `19/20` | `361/400` |

In the first row the union contains two worlds. In the second it contains one.
In the third there are exactly `19·19` worlds where neither coordinate is 1.
Consequently, even exact marginal 95% certificates do not imply joint 95%.
Independence would give `361/400`, which is also below `19/20`.

Shared systematic error is illustrated by the second row: set both measured
centers to a common `B`, with `B=3` on world 1 and `B=0` otherwise, and use
intervals `[B−1,B+1]`. Arbitrarily many repetitions with the same `B` remain
identical; averaging them does not create independent bias realizations or
reduce this error. Conditional on the bad-bias world, every interval fails,
although each unconditional coverage is 95%. This does not claim that BAM has
this bias law. Dependence does not uniformly worsen joint coverage: the common
failure example has higher joint coverage than the independent example. An
omitted systematic component can also invalidate an asserted marginal bound
itself; that is a separate problem from composing valid marginal bounds.

## What a valid union bound does, and does not, supply

Suppose actual certificates establish, under the same law,

```
P(F_j) ≤ α_j for every j ∈ J,    α_j ≥ 0,    Σ_j α_j ≤ δ.
```

For every world, `1{∪F_j} ≤ Σ_j 1{F_j}`. Taking expectations gives
`P(∪F_j) ≤ Σ_j α_j ≤ δ`, hence

```
P(∀j ∈ J: θ_j ∈ C_j(D)) ≥ max(0, 1−Σ_j α_j) ≥ 1−δ.
```

No independence or covariance estimate is required for this finite union bound.
For two endpoints a total budget `δ=1/20` could, hypothetically, allocate
`α_1=α_2=1/40`; it would need valid 97.5% marginal certificates. Two supplied
95% statements do not acquire that stronger coverage merely because an adapter
writes `1/40`. Nor can a new interval width be inferred by multiplying its
reported `U` without a justified uncertainty model. More endpoints/candidates
must be included in the index family; the resulting bound can be uninformative.

A conditional version is also valid: if every
`P(F_j | H) ≤ α_j(H)` almost surely and `Σ_j α_j(H) ≤ δ` almost surely for the
same information `H`, then the conditional union bound is at most `δ`.
Unconditional bounds do not imply this assertion within an observed subgroup,
at a selected material or conditional on the realized calibration set. Random
allocations chosen after observing errors cannot simply be plugged into the
unconditional statement.

Selection has an important asymmetry. Any adaptively selected **subset of an
already simultaneously certified fixed family** inherits its event containment.
By contrast, choosing among separate marginal certificates can invalidate a
marginal level: on 20 worlds give endpoint `j` the singleton failure set `{j}`
for each `j=1,…,20`, then select `j=ω`. Every fixed endpoint has 95% coverage,
yet the selected endpoint fails with probability one. This is an adversarial
logical selection rule with access to failure-revealing information, not an
allowed study protocol. It shows why the information boundary must be stated.

Risk conditional on acceptance is another distinct claim. In the common-bias
example, let a hypothetical rule accept only in world 1. Then
`P(accept and failure)=1/20` but `P(failure | accept)=1`. An unconditional bound
on a bad decision event therefore does not certify the same bound among accepted
cases. A specified selection/conditioning argument would be needed; no such
rule is proposed for BAM.

## The missing bridge to recommendation risk

Let `Good(D,θ)` mean the required decision claim: for example, retaining every
true feasible tied minimizer in the specified finite candidate universe. A
sound interval-based engine can transfer the preceding bound only if

```
(∀j ∈ J: θ_j ∈ C_j(D))  ⇒  Good(D,θ)
```

holds pointwise for the actual target quantities. Then
`{not Good} ⊆ ∪_j F_j`, so `P(not Good) ≤ δ`. Shared latent variables and
nonlinear transformations must be covered by that sound implication; a sampled
smoothness check, guessed unit map or omitted feasibility coordinate is not a
replacement premise. This is a universal conditional argument for arbitrary
finite families, not evidence that any real adapter has supplied its premises.

Perfect coverage of a different target cannot repair the bridge: with a
measured target `θ=0`, interval `[0,0]`, and future target `Y=1`, measurement
coverage is one while coverage of `Y` is zero. This deterministic toy example
does not model a real material; it proves that an explicit transfer assumption
is logically necessary. Specimen variation, condition changes and prediction
error require their own supported model or bound.

Direct decision-pool calibration is a separate route. The existing design
uses the maximum normalized rank over all feasible tied optima and assumes
exchangeability of complete panel scores under a frozen ranking rule. It can
avoid simultaneous coordinate intervals, but a metrology label, file count,
three test IDs or shared apparatus does not establish that sampling premise.
Its marginal guarantee also does not become a high-confidence bound on the
fixed deployed policy's conditional risk; the published risk-contract note
already distinguishes those quantifiers. No route is selected or retuned here.

## Evidence needed before promotion

A later adapter would need the exact measurand, piece/condition pairing,
absolute/relative convention and uncertainty interpretation; a justified law
and coverage scope (including systematic components, rounding and parameter
range); a declared finite family/information boundary and valid risk allocation;
and a sound bridge to the requested objective, constraints and future target.
Alternatively, a direct pool study needs complete panel truth and a defensible
panel sampling/ranking protocol. Missing evidence remains unknown or causes
abstention; it is not filled by the label `k=2`, metrological traceability,
parser success or a cryptographic hash. Accurate document pairing does not
create independent samples or fresh blind outcomes.

Existing `formal/LupineRisk.lean` source contains `finite_union_bound`,
`allocated_joint_failure_bound`, `finite_weighted_joint_failure_bound` and
`conditional_conclusion_failure_bound` with explicit event-law and correctness
premises. Its `RiskLaw` is a normalized monotone finitely subadditive capacity;
the elementary probability arguments here are a compatible special case.
The word “conditional” in that theorem name describes a deterministic
implication, not a new proof of conditional-probability calibration. This note
adds no Lean code, compilation, runtime feature or Python refinement claim.

Only public metadata, published math/docs and the evidence author's permitted
own-paraphrase findings were read. The metadata re-read includes already exposed
campaign uncertainty maxima and temperature information; this is not a blind
source audit. No raw workbook/schema body, complete cell projection, private
cache, new network request, fit or scientific experiment was used. All numerical
probability worlds above are explicitly hypothetical exact constructions.
