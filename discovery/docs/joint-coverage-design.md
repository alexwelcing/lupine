# Optional design: joint coverage for a finite candidate pool

This document derives a possible probabilistic premise for the exact interval selector. Its exact allocation and order-statistic arithmetic is now implemented in the optional [calibration planner](calibration-planner.md), with explicit unverified assumptions and unbounded diagnostics. The calibrated schema now integrates this planner through CLI, replay and the browser. A supported finite plan supplies exact intervals to the original selector; insufficient calibration or unsupported sampling scope withholds screening and retains the entire universe. No physical or probabilistic guarantee has been established for the archived pilots, and no adaptive conformal inference is implemented.

## Deterministic implication on a soundness event

Let a finite pool have m candidates. Candidate i has true score s_i to minimize and constraints g_ij <= 0. Its supplied intervals are [l_i,u_i] and [a_ij,b_ij]. Define the joint event

`E = {for every i: l_i <= s_i <= u_i, and for every relevant (i,j): a_ij <= g_ij <= b_ij}`.

On E, the certified-feasible set `F- = {i: every b_ij <= 0}` lies within the true feasible set F, which lies within the possibly-feasible set `F+ = {i: every a_ij <= 0}`. If F- is nonempty, let B be its minimum score upper bound and retain `R = {i in F+: l_i <= B}`. Otherwise retain all F+.

If F is nonempty, every true constrained minimizer is in R on E. To see this, any true minimizer i is in F+. When an incumbent h exists, `l_i <= s_i <= s_h <= u_h = B`; otherwise retention is automatic. The argument includes **every tied minimizer**, because the screening condition uses <=. It also includes possibly feasible minimizers whose constraint intervals do not certify feasibility. When F is empty there is no true minimizer to retain. If F+ is empty on E, the finite supplied pool has no feasible candidate; this does not establish infeasibility outside that pool.

When F- is nonempty, the incumbent is feasible on E and its true regret is at most `B - min_{i in F+} l_i`. Thus any construction with `Pr(E) >= 1-delta` yields a probability at least 1-delta that these deterministic conclusions hold jointly. This is a statement over the calibration/test randomness admitted by the construction, not an assertion that a particular realized archive is sound.

## A union bound needs no independence

Let E_i be the event that candidate i's required intervals jointly contain its score and constraint truths. If `Pr(not E_i) <= epsilon_i` for every i, then

`Pr(not E) = Pr(union_i not E_i) <= sum_i epsilon_i`.

No independence among candidate errors is required. With fixed m, assigning `epsilon_i = delta/m` is a sufficient Bonferroni allocation. Heterogeneous allocations also work if they are specified with valid marginal guarantees and sum to at most delta.

If only separate score and constraint guarantees are available, allocate the error budget over all scalar targets' interval events, not merely over m scores. For p scalar targets per candidate, an equal allocation is `delta/(m*p)`. Independence is still unnecessary. A candidate-level joint score/constraint interval construction can instead supply E_i directly. An empirical average containment rate, a fit on the calibration set, or an observed test coverage rate does not establish any of these probability bounds.

## Split-conformal marginal construction and finite calibration

For a regression score, first fix a predictor using training data independent of the calibration/test exchangeability argument. Given n calibration examples, compute nonconformity scores `r_t = abs(y_t - prediction(x_t))`. For a marginal error allocation epsilon in (0,1), use rank

`k = ceil((n+1)*(1-epsilon))`.

If k <= n, let q be the kth smallest calibration score and give a new example the interval `[prediction(x)-q, prediction(x)+q]`. If k = n+1, set q to positive infinity, making the interval unbounded. Under exchangeability of the n calibration nonconformity scores and the new example's score, the new interval has marginal containment probability at least 1-epsilon. Conditional on independently fitted training information, the same statement applies when that conditioning preserves exchangeability. Ties in residual scores do not undermine the conservative <= threshold guarantee. Randomized tie handling or other conformal variants require their own specification; they are not assumed here.

The rank fact follows directly from exchangeability: among n+1 scores, the new score's rank is symmetric, with ties treated conservatively. For a finite threshold at position k, its exceedance probability is at most `(n+1-k)/(n+1) <= epsilon`. Adding an infinite (n+1)st calibration value handles k=n+1 exactly. This provides a marginal guarantee for one new exchangeable example; it does not make all pool intervals simultaneously sound by itself.

Finite q is possible only if `epsilon >= 1/(n+1)`. Below that resolution, the distribution-free construction above must return infinity. For score-only Bonferroni allocation epsilon=delta/m, this requires `n+1 >= m/delta`. Availability of a finite conformal threshold does not ensure that the threshold is useful: the maximum calibration residual may still be so large that almost every candidate is retained.

## Numerical implications for the archived pool sizes

These calculations assume exchangeability for illustration. The archived composition-group split does **not** establish that premise, so these are not retroactive probability guarantees.

| Quantity | Gap pilot dimensions | Steel pilot dimensions |
|---|---:|---:|
| Test candidate count m | 888 | 68 |
| Calibration count n | 913 | 54 |
| Desired joint failure budget delta | 0.05 | 0.05 |
| Per-candidate budget delta/m | 1/17,760 | 1/1,360 |
| Required rank `ceil((n+1)*(1-delta/m))` | 914 | 55 |
| Available finite ranks | 1–913 | 1–54 |
| Consequence under this design | q = infinity | q = infinity |
| Minimum n permitting finite q | 17,759 | 1,359 |

For gap, `914*(1-1/17760)` is strictly between 913 and 914, so the rank is 914, greater than the 913 calibration examples. For steel, `55*(1-1/1360)` is strictly between 54 and 55, so rank is 55. Both cases therefore give unbounded score intervals under this conservative design.

With no constraints, unbounded score intervals imply retaining the entire finite pool and provide no finite regret bound. With uncertain constraints, unbounded constraint intervals also prevent feasibility certification. This is mathematically valid but operationally uninformative. The current `Fraction` interval implementation intentionally requires finite rational endpoints and cannot represent these intervals; an implementation would need an explicit unbounded/unknown state that safely retains all possibly feasible candidates and declines a finite regret claim. Replacing infinity with the largest observed calibration residual would lose the claimed failure budget.

More informative joint designs could use explicitly justified simultaneous prediction methods, stronger model assumptions, or additional independent calibration data. Shrinking the pool to a fixed predeclared universe reduces the error budget cost, but cannot establish retention of optimizers outside that universe. No such improvement is implemented or validated here.

## Candidate generation and calibration caveats

Marginal conformal exchangeability concerns the distribution of a future example and its nonconformity score. It does not automatically apply to any arbitrary material selected by an optimization algorithm. A fixed deterministic composition outside the calibration population need not have marginal coverage, and composition-conditional coverage does not follow from ordinary marginal coverage.

A pool drawn according to the same valid exchangeable mechanism can share calibration data: the union bound remains valid if each pool member retains its individual marginal guarantee. The pool members need not be independent. But selecting pool members after inspecting calibration errors or repeatedly choosing candidates because their current intervals look favorable can invalidate those individual guarantees. Selection based on covariates or model predictions also needs examination: conditioning or concentrating on a subgroup can change the new-example distribution, even without reading its true outcome.

A fixed maximum pool size can support a preallocated budget only when the actual candidates still meet the requisite marginal validity conditions. A data-dependent number of candidates needs an argument covering its selection rule, such as an established conditional construction or valid preallocated error budgets for a specified sequence. Repeatedly refitting the surrogate using calibration labels changes its nonconformity scores and invalidates the simple independent-training construction unless a method explicitly accommodates that reuse.

Grouping identical compositions across splits prevents direct train/test identity leakage, but induces dependence and changes the sampling units. Row-level exchangeability does not follow from that protection. A group-level conformal design would have to specify its exchangeable groups, group nonconformity score, and coverage target; simply calling a group split conformal is insufficient. Likewise, benchmark publication, receipt hashes, and deterministic reruns prove neither exchangeability nor physical validity.

## What the negative pilots imply

The published-data replay has 89 uncovered gap test outcomes and 6 uncovered steel outcomes. It actually discards 5 of the 471 gap minimizers, despite retaining some zero-gap optima and selecting an incumbent with zero true regret. Steel retains its unique archive optimum, but its intervals also fail simultaneous coverage.

These realized violations refute simultaneous interval soundness on each complete observed test archive. They do not logically disprove an appropriately specified probabilistic marginal theorem: a probability guarantee permits occasional failures. They also supply no positive evidence that the theorem's exchangeability premises hold. The deterministic screening theorem remains conditional and correct; the pilot inputs fail its simultaneous premises. This optional Bonferroni route explains how those premises could be obtained under explicitly justified sampling assumptions and sufficient calibration resolution, while showing why the pilot sizes do not support a useful finite guarantee at delta=0.05.

No external theorem citation is needed for the derivations here: the deterministic implication is shown above, the union bound is proved by the event inclusion inequality, and the calibration rank argument is stated with its required exchangeability premise. This document does not attribute unverified claims to papers or imply that source inspection or software tests establish those premises.
