# Finite-archive randomization as an admissible design option

2026-10-16 · owner `phase2_math` · **DESIGN NOTE ONLY**.

Uniform randomization of a genuinely frozen finite panel population can justify the existing marginal decision-pool bound without assuming that scientific source groups are IID. Its probability is over the declared allocation of those archive panels. It supplies no guarantee for a future power-plant material, another archive, a fixed chosen panel or a particular realized calibration set. This note selects no source, model, scientific threshold, allocation or experiment; it changes no existing protocol or negative result.

## 1. Objects and information that must be fixed

Let `U` be a finite set of `L` distinct panel IDs. An ID is a sampling unit, not an assertion of a distinct specimen, independent publication or material. Each panel has a finite candidate universe, declared recorded objective/constraint endpoints, a unique ordinal candidate ranking and a well-defined score

```
r(u) = 0                                      if no feasible minimizer exists,
r(u) = max(rank(x)/panel_size : x is a feasible tied minimizer) otherwise.
```

The existing deterministic bridge is `all feasible tied minimizers retained iff r(u) <= tau`, for the weak ranked prefix and `tau >= 0`. Empty/infeasible panels are vacuous successes; incomplete truth is neither state. This describes optima of the declared finite recorded universe, not unobserved physical truth.

Condition on the fixed archive, development information, frozen model and all other external choices, collectively `F`. The remaining randomness must still be a uniform permutation of `U` conditional on `F`. In particular:

- Freeze the frame, grouping, panel membership, target meanings, ranking/tie rules, preprocessing, risk budget `alpha` and calibration count `n` before the reserved outcomes can influence those choices.
- A model or feasibility threshold learned from a separate development frame may be conditioned on. The reserved panel score map must be identical whichever reserved IDs later occupy calibration/evaluation roles. If training is selected randomly, the claimed conditional law must be re-established given that training selection and its results; conditioning does not create independence by itself.
- Allocating reserved roles before fitting is permissible mathematically only when subsequent development choices do not depend on those roles or their labels. Applying a fixed model separately to each reserved panel is a sufficient construction. Any proposed cross-panel transformation needs its own role-invariance argument.
- The random allocation must be independent of the frozen information, with the stated conditional law actually justified. A deterministic hash ordering is not a uniform allocation law merely because it looks irregular. Uniform entropy and correct sampling remain operational premises, not consequences of a receipt hash.

The simple sufficient construction is a development frame fixed separately, followed by a single uniform permutation of the remaining complete panel population. This is an option, not a new chosen allocation procedure. A capped rejection sampler can preserve uniformity conditional on success when its underlying draws are independent uniform draws and its acceptance/cap rules depend only on the prescribed sampler values; outcome-dependent retries do not have that justification.

## 2. Original finite-law construction and proof

Assume integers `n>=0`, `L>=n+1` and `0<alpha<1`. Let `pi` be a uniform permutation of the `L` panel IDs. Use positions `1,...,n` for calibration and designate any fixed position `j > n` as the future position. A designated position is random in panel identity; a deliberately chosen fixed panel is different.

For any permutation of the selected `n+1` positions, extend it by the identity on the other positions. Composition with this position permutation is a bijection of all `L!` equally likely allocations. Therefore

```
(r(pi(1)), ..., r(pi(n)), r(pi(j)))
```

has a coordinate-permutation-invariant joint law conditional on `F`. Equivalently, every ordered tuple of `n+1` distinct panel IDs has probability `(L-n-1)!/L!`. Heterogeneous scores, unequal panel sizes, overlapping candidates and scientific dependence do not invalidate this allocation argument: the scores are fixed numbers for this finite target.

There are only finitely many score vectors. If distinct allocations yield the same vector, its weight is their number divided by `L!`; do not incorrectly assign equal weights to distinct score vectors. Position reindexing is a bijection between their allocation fibers, so these multiplicity weights are nonnegative, normalized and invariant. This explicitly supplies the finite-support closure and weight-invariance premises of the existing theorem.

Set `N=n+1` and `k=ceil(N(1-alpha))`. When `k<=n`, let `tau` be the kth calibration score. On any fixed `N`-score vector, the leave-one-out failure at coordinate `i` occurs exactly when at least `k` other scores are strictly smaller. At most `N-k` coordinates can fail: the first `k` in a nondecreasing ordering cannot. Equal failure probabilities by coordinate symmetry and finite averaging give

```
Pr(r(pi(j)) > tau | F) <= (N-k)/N = floor(N*alpha)/N <= alpha.
```

The deterministic panel bridge turns this into marginal all-minimizer retention. Ties make the bound conservative; when all scores in the population are distinct, every selected vector has exactly `N-k` failures and the first inequality is equality. If `k>n`, set `tau=1` and retain the whole future universe; failure is deterministically zero, including `n=0`. No new guarantee of reduction follows. The score law `r(u)=1` for every panel forces whole-universe retention at every count.

This written argument is an instantiation of `LupineExchangeability.finite_exchangeable_loo_failure_bound` and, for rational alpha in the finite branch, `finite_exchangeable_loo_ceiling_bound`. The all-minimizer bridge is `LupineDecisionPool.all_minimizers_retained_iff`. It does not add a Lean theorem proving this sampler-to-law construction or establish Python refinement, physical endpoints or actual sampling correctness.

## 3. Grouping, missingness and a selected secondary population

Uniform panel-ID sampling targets the panel-weighted finite archive. It is not row-weighted, specimen-weighted or weighted by future operating frequency. Repeated records, shared specimens and overlapping papers may coexist in the algebra, but they change the target and may invalidate a scientific claim of independent held-out studies. Group names alone establish none of those claims. Duplicate observations also do not supply independent measurement evidence. Shared observations must not be counted as separate physical measurements or concealed in equal-budget cost comparisons; retain distinct archival lookup costs and unique underlying evidence where known.

Panel construction must be role-blind. Variable candidate counts are allowed because the score is defined within each panel; changing candidate membership changes the score and target. Drawing rows and then assembling panels by role is not the same allocation law. Stratum-specific or unequal-probability sampling likewise requires a separately established symmetry or a different theorem; the present argument is not an automatic weighted-conformal result.

There are at least two distinct mathematical routes, neither selected here:

1. A complete primary population: all original panel scores are defined. An archive-wide, role-blind completeness check can establish this narrow prerequisite. Checking only the realized calibration subset does not establish a complete population law.
2. A predeclared secondary population: apply the same deterministic complete-record restriction to every panel, preserve every panel ID including empty panels, and restrict the already frozen candidate order. This produces a new fixed score map on the same sampling frame. Even outcome-dependent missingness need not break this finite allocation symmetry, because the transform is fixed and role-blind. Its conclusion concerns only that selected recorded population; it establishes nothing about excluded records or physical missingness mechanisms.

A whole-frame restriction to complete panels could also define a different finite target if frozen with a valid subsequent sampling law. It is not equivalent to dropping incomplete calibration panels, refilling an observed allocation or conditioning on favorable realized eligibility. No such change is authorized here. Current `decision_pool.py` preserves incomplete calibration and unsupported-premise states; it does not silently replace missing scores with zero. A future pointwise upper-bound substitution by one has a separate monotonicity argument only if the underlying target scores are well-defined and the original draws remain intact; that extension is not implemented by this note. Unknown evaluation truth remains unknown, not success.

## 4. Counterexamples to stronger interpretations

These are constructed finite worlds, not new observations.

- **Realized calibration:** two feasible panel scores `1/2,1`, uniformly permuted, `n=1, alpha=1/2`. Marginal failure is `1/2`; conditional on calibration score `1/2`, failure is one. Conditioning on the fixed archive before allocation is valid; conditioning on the observed calibration is a different statement.
- **Fixed future identity:** choose the score-one panel as the future and sample calibration only from score-zero panels. Shuffling calibration cannot make that future exchangeable with calibration; every finite threshold is zero and failure is one.
- **Feasibility filtering:** among 20 uniformly permuted panels, 19 are infeasible with score zero and one is feasible with score one. At `n=19, alpha=1/20`, marginal retention is `19/20`, but retention conditional on a feasible future is zero. Reporting only feasible-panel results does not upgrade the theorem to feasible-conditional coverage.
- **Incomplete calibration acceptance:** in the two-score example, suppose only the score-`1/2` panel is complete. Conditioning on a complete realized calibration forces the score-one panel into the future, hence failure one. A blocked/full-universe fallback and this accepted-subset conditional claim are distinct.
- **Role-dependent fitting:** two feasible panels each have two candidates. An invalid procedure uses calibration truth to rank that panel's optimum first but ranks the held-out optimum last. Scores are always `(1/2,1)` in calibration/future order, so the same finite calibration fails with probability one despite uniform role allocation. A role-independent frozen score map is missing.
- **Shared calibration:** three feasible panels with fixed scores `1/3,2/3,1`, uniformly permuted, use `n=1, alpha=1/2` and both remaining positions for evaluation. The number of failures is `0,1,2` with probability `1/3` each, not `Binomial(2,1/2)`. Each evaluation position has marginal failure `1/2`, but their common random threshold couples the failures.

For `e>=1` designated evaluation positions, linearity bounds the expected average loss by the single-position bound. A union bound gives at most `min(1,e*(N-k)/N)` for any failure in the finite branch. Neither is a claim that an observed loss fraction is at most alpha, nor joint safety at alpha, nor independent Bernoulli trials. Replaying an allocation or inspecting many deterministic controls does not increase independent sample size.

## 5. Separate finite-residual evaluation and exact zero-failure resolution

There is a useful **different** conditional inference once the calibration and resulting policy are frozen. Fix their realized information `C`, and let the remaining population have `M=L-n >= 1` panels with a fixed binary loss for each under that policy. Let `K_C` be its unknown number of failures. Suppose exactly `e` evaluation panels, `0<=e<=M`, are sampled uniformly without replacement from that remainder conditional on `C`. Here `C` includes calibration IDs, their observed values and the frozen policy, but does not additionally condition on the designated evaluation subset/order or full allocation transcript. A preallocated uniform permutation has the required remaining-position law under this conditioning; conditioning on its full transcript instead makes the draw deterministic. A transcript may be sealed operationally without turning the theorem into a guarantee conditional on that full transcript. Do not additionally select or stop evaluation using its outcomes. The label for an ID must stay fixed when sampled: interventions, repeated measurements that change endpoints, or interference that changes another ID's loss require a different design. Fixed overlapping archived records are allowed by this mathematical sampling model, without becoming independent physical observations.

Then its observed failure count `X` satisfies

```
Pr(X=x | C,F) = binom(K_C,x) binom(M-K_C,e-x) / binom(M,e).
Pr(X=0 | C,F) = binom(M-K_C,e) / binom(M,e).
```

This follows by counting `e`-subsets: choose failed and nonfailed IDs separately. Scientific independence of the fixed panels is unnecessary. The population fraction `K_C/M` is conditional on this policy and residual frame, not the original marginal calibration risk or a future physical-population risk. Unconditionally, `C`, the threshold and `K_C` vary; the evaluation law is generally a mixture, not an IID binomial law.

For a fixed finite-frame null `K_C/M >= rho`, with `0<rho<=1`, the least admissible integer count is `K_min=ceil(rho*M)`. Among that null the exact supremum of zero-failure probability is

```
G(e; M,rho) = binom(M-K_min,e) / binom(M,e),
```

where `binom(a,e)=0` for `e>a`. Proof: increasing the failed set can only remove all-good subsets; the expression decreases in integer `K_C`, and the null boundary `K_min` is attainable. This is a supremum over fixed finite label vectors, not a prior on unknown failure rates.

For fixed `0<eta<1`, the smallest evaluation count with best-case zero-failure resolution is

```
e_* = min {e in {1,...,M} : G(e;M,rho) <= eta}.
```

Equality qualifies. Before its zero tail, `G(e+1)/G(e)=(M-K_min-e)/(M-e)`; after the tail it remains zero. Thus `e_*` exists and is at most `M-K_min+1`. A resource cap `E` with `0<=E<=M` can resolve this criterion iff `E>=e_*`. This is an exact finite count calculation, not a plan selected for any actual archive.

Boundary checks by derivation:

- `e=0` has probability one and supplies no inference at `eta<1`.
- `M=0` is excluded: `K_C/M` is undefined and there is no finite-frame risk target.
- A census `e=M` observes the residual loss fraction exactly. Under this null at least one failure exists, so zero observed failures has probability zero.
- At `rho=1`, `K_min=M`: one observation already makes the zero-failure event impossible under the null. This says nothing about whether the alternative yields zero failures.
- Discreteness matters: all positive rho with the same `ceil(rho*M)` have the same null. For the illustrative `M=3,rho=1/3,eta=1/3`, `G(1)=2/3`, `G(2)=1/3`, `G(3)=0`, so the minimum is exactly two.

For `1<=e<=M-K_min`, product expansion gives

```
G(e) = product_{j=0}^{e-1} (M-K_min-j)/(M-j)
     <= (1-K_min/M)^e <= (1-rho)^e;
```

the bound also holds on the zero tail, and `e=0` is one by the empty-product convention. This proves a conservative connection to the familiar zero-failure expression under this particular finite sampling design. It does not silently extend the current IID planner's documented model, make the full evaluation count binomial, or justify generic binomial uncertainty calculations.

If a predeclared test rejects this finite null only when `X=0`, the condition `G(e)<=eta` gives its conditional type-I bound. Nothing promises that zero failures will occur; no alternative law or empirical power has been supplied. The hypothesis, policy, remainder, evaluation count and reporting rule must be frozen before evaluation outcomes. Other endpoint multiplicities, adaptive selection, paired policy comparisons and a future-population claim need their own arguments.

## 6. Prospective threshold planning also changes under a finite law

If a hypothetical fixed archive of `L` scores has exactly `B` scores at or below a prespecified `c<1`, a size-`n` calibration sample without replacement gives

```
Pr(tau <= c | F) = sum_{a=k}^{n} binom(B,a) binom(L-B,n-a) / binom(L,n)
```

in the finite-rank branch, using zero for impossible binomial coefficients. This is the same deterministic order-statistic event counted under a hypergeometric law. In the infeasible-rank branch the event has probability zero. Substituting `p=B/L` into an IID binomial formula generally gives a different answer. Here `B` is a hypothetical or independently justified planning parameter: reading held-out scores to choose it would not be outcome-free planning. Unknown `B` and the all-one law still prevent a distribution-free reduction guarantee.

This and the exact zero-failure expression identify small possible general planner extensions. Neither is a request to use the already exposed archive to find favorable parameters, and neither is implemented, compiled or empirically validated here.

## 7. Relation to the published MPEA protocol and G21

The published MPEA protocol already makes this narrow distinction: fixed development choices; a uniform permutation of 40 reserved source-token panels; 20 assigned calibration panels; role-blind completeness and a predeclared complete-record secondary population retaining empty panels. It states the single-position bound `2/21 <= 1/10` conditionally on its explicit premises, preserves `assumed_unverified`, rejects a future-study interpretation, and specifies no IID binomial confidence claim. Those are protocol definitions, not new data read for this note. Existing execution and negative outcomes are unchanged; no redraw or retrospective redesign is proposed.

For a future G21 protocol, finite randomization is admissible only after an exact finite target and a sound information boundary are defensible. The release statement must identify the source version, grouping/unit, role-independent score construction, missingness handling, actual allocation law and the population over which its probabilities range. It must separately identify finite-archive usefulness evidence, uncertainty design, and any still-unjustified transport to future physical materials. The present source-admissibility gate remains open; this mathematics does not resolve pairing, endpoints, observation rights, overlap or study independence.

**Review scope:** existing public definitions, formal source and published protocol only. No private outcomes, raw archive, new network request, allocation, model/threshold selection, test rerun, runtime edit or Lean compilation. Source identities and independent proof review accompany this note.
