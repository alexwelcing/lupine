# Finite exchangeability and the direct-pool risk bound

This extension makes a previously explicit probability premise derivable from a
finite joint score law. It does not establish that any scientific archive or
future deployment has that law. The [direct-pool design](decision-pool-calibration-design.md)
and its counterexamples remain unchanged.

## A precise finite law

Let `I` be a finite index set of size `N`, with a designated future index. Let
`S` be a finite support of real score vectors `s : I → ℝ`. Assign each supported
vector a nonnegative weight `w(s)` whose sum is one. Require:

1. For every permutation `σ` of the indices, `s ∈ S` implies `s ∘ σ ∈ S`.
2. Every supported vector has invariant weight: `w(s ∘ σ) = w(s)`.

The weights need not be uniform. Declared zero-weight support points must still
satisfy support closure and the quantile premises. Values outside `S` never enter
the finite sums. These are mathematical assumptions about a joint law, not
properties inferred from a dataset identifier, shuffled rows or a successful fit.

For each supported vector and index `i`, let `T_i(s)` be an exact kth ascending
order statistic of the other `N−1` scores. The strict failure event is
`E_i = {s : T_i(s) < s_i}`. Strict failure corresponds to the candidate pool's
weak inclusion at its threshold; ties require no randomized tie breaking.

## Why symmetry supplies the probability step

Exact quantiles imply that failure is equivalent to at least `k` coordinates
being strictly below `s_i`. Removing `i` changes no strict predecessor. Permuting
coordinates therefore carries the failure event at `i` to the corresponding
permuted index, even without assuming that the threshold implementation itself
is permutation-equivariant.

Composition with `σ` is a bijection of the declared support, with inverse
composition by `σ⁻¹`. Reindexing the weighted sum through that bijection preserves
event mass. Swapping two indices consequently proves that every indexed failure
event has the same mass `p`. Equality is derived here; it is not an assumption
of the final bound.

The existing pointwise count theorem gives at most `N−k` failures for each
supported vector. Summing with the nonnegative normalized weights yields
`N p ≤ N−k`. Hence:

```text
P(E_future) ≤ (N−k)/N.
k = ceil(N(1−α))  ⇒  P(E_future) ≤ α.
```

The exact alpha theorem takes rational `α` and explicitly covers the finite
branch `k < N`. With nonempty normalized support and exact leave-one-out
quantiles, the premises also require `1 ≤ k ≤ N−1`. For example, 19 calibration
panels and alpha `1/20` give `N=20`, `k=19`. Eighteen calibration panels at that
alpha require rank19 from only18 observations and fall outside this finite
branch. The operational whole-universe fallback remains a separate runtime
case.

## Connection to a candidate pool

The score for a completely labeled panel is the maximum normalized rank of
**all** its true feasible tied minimizers, with zero when no feasible optimum
exists. The earlier deterministic bridge identifies all-minimizer retention
with that score being at most a nonnegative threshold. Applying the finite-law
bound to those actual panel scores supplies the corresponding marginal
retention statement under the declared law.

Neither theorem makes incomplete labels complete, proves a ranking was frozen
outside calibration, or infers a valid score law from heterogeneous panel sizes.
A finite random-permutation construction over fixed archival panels can define
a narrowly scoped law, if the construction and information boundary are actually
specified. It does not imply exchangeability of future studies or physical
operating conditions.

## Formal scope and exclusions

[LupineExchangeability.lean](../formal/LupineExchangeability.lean) derives the
finite-law bridge from the published counting/order-statistic results. The
[source-bound inventory](../formal/theorem-inventory.json) and
[verification record](../formal/VERIFICATION.md) identify the statements that
actually compiled and were axiom-audited.

The result covers finite-support probability laws. Arbitrary measurable or
infinite-support laws, scientific exchangeability, conditional coverage given
feasibility or realized calibration, fitting independence, Python refinement,
smaller retained pools and empirical usefulness remain separate questions.
The exact construction with marginal retention19/20 and feasible-panel-conditional
retention zero remains a valid counterexample; this proof does not strengthen
its claim. No scientific targets, fitted models, interval bounds or benchmark
results are changed by this extension.
