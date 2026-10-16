# Finite-population zero-failure counting: isolated Lean candidate

The existing ten-module, 130-statement formal inventory has no counterpart to
the finite-population planner's zero-failure count ratio, failure-count
monotonicity, or census claims. `LupineExchangeability` instead concerns
permutation-invariant finite score laws and marginal leave-one-out failure.
Those existing sources and their inventory remain unchanged.

This candidate fills a narrow mathematical gap in
`docs/finite-population-planning.md`. It quantifies over an arbitrary type of
distinct labeled IDs, a finite population `P`, a fixed failure subset `F ⊆ P`,
and a fixed evaluation size `e`. The event of no failures consists exactly of
the `e`-element subsets of `P \ F`. Thus its cardinality is
`choose(|P| - |F|, e)`, and its uniform-subset count ratio is
`choose(M-K,e) / choose(M,e)`. When `e ≤ M`, the denominator is strictly positive.
The probability interpretation is uniform sampling of those fixed-size subsets;
the compiled statement explicitly proves the count ratio, rather than supplying
a general probability-space adapter or attesting that an experiment used it.

The candidate defines the ratio over exact rationals and proves:

- Increasing fixed `K` cannot increase the ratio. For a declared null
  `Kmin ≤ K ≤ M`, the maximum is attained at `Kmin`.
- For `M > 0`, `ceil(ρM) ≤ K` is equivalent to `ρ ≤ K/M`.
  With `0 < ρ ≤ 1`, that ceiling lies in `1..M`; the attained maximum therefore
  matches the planner's fraction null, with an explicit positive denominator.
- For admissible `e`, the ratio is zero exactly when `M-K < e`.
  At the equality boundary `e=M-K`, the numerator is one. With `1 ≤ K ≤ M`,
  zero begins at `M-K+1`, so a census has zero zero-failure probability under
  that fixed-frame null. A positive qualifying sample size within the census
  exists for every nonnegative tolerance.
- An evaluation size of zero gives ratio one.

These are arbitrary finite-count statements, not results restricted to the
Python implementation's `M ≤ 256`. The totalized rational definition can also
be evaluated outside the sampling domain; no probability interpretation is
asserted there. In particular, the main fraction-null theorem requires
`M > 0` and `e ≤ M`, and the census theorem requires `1 ≤ K ≤ M`.

Two actual offline compilations used the installed pinned Lean 4.29.0 and
Mathlib `8a178386ffc0f5fef0b77738bb5449d50efeea95`, with warnings treated as
errors. The initial ten-statement candidate passed in 35.05 seconds; adding
the three ceiling/null statements passed in 16.06 seconds. There were no
compilation failures. Both source snapshots, commands, times, output, and
object hashes are retained under `attempts/`. Each source was held during its
run. No dependency build, download, upgrade, or network operation occurred.
The final source hash is
`391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd`.

The repository's existing axiom-audit functions checked exact declaration and
print-output coverage for all **13 statements**. Only `propext`,
`Classical.choice`, and `Quot.sound` appear. There is no admitted proof or new
project axiom. This is authored formalization plus actual compiler/audit
evidence; no independent peer-review or second compilation by another agent
is claimed. An attempted delegation was unavailable because the agent-thread
limit had been reached.

No theorem here proves the Python parser, `math.comb`, rational representation,
minimum-count search loop, resource cap, or a Python/Lean refinement relation.
Monotonicity in the evaluation size is not an additional proved statement in
this candidate. Uniform sampling, a complete fixed frame, a frozen policy,
fixed endpoint labels, fixed-size selection, and no outcome-dependent removal
remain scientific/protocol premises. Physical independence is not needed for
this finite counting model, but neither physical truth nor future-population
transfer follows from it. The finite-population planner's existing tests and
all negative scientific evidence retain their original scope. G21 remains
deferred; this candidate does not admit a benchmark or promote a release claim.

The candidate remains isolated under `.cache/`; no tracked source, formal
build target, dependency pin, existing theorem inventory, or runtime changed.
Root may review it as a prospective formal increment before deciding whether
to integrate it. The public-copy inventory omits compiled binary objects but
retains their hashes in the execution receipts.
