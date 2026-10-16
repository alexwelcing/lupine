# Exact upper confidence inversion for a fixed finite frame

2026-10-16 · **DESIGN ONLY; source-free mathematics.** This note extends the already published zero-failure counting argument to an arbitrary binary failure count. All input examples are constructed finite worlds. No empirical source, outcomes, model, endpoint, scientific threshold, allocation or protocol is selected; no runtime, formal source or tracked file is changed. A future observed-data use remains blocked until a separately frozen study justifies its frame, endpoint and sampling law.

## 1. Target and assumptions

Fix a finite population of `M >= 1` distinct IDs, a fixed binary label for every ID under one fixed policy, and its unknown total failure count `K in {0,...,M}`. Fix `e in {0,...,M}` before evaluation outcomes. Draw one subset of exactly `e` IDs uniformly without replacement; every such subset has probability `1 / C(M,e)`. Let `X` be its observed number of failures. Fix `0 < eta < 1`.

These premises may hold conditionally on a frozen development/calibration record `C`, policy and residual frame. The probability then averages over the remaining evaluation draw conditional on `C`; it does not additionally condition on the realized evaluation subset or its complete allocation transcript. Correlated fixed labels do not invalidate finite counting, but duplicate measurements under different IDs change the estimand and do not create independent scientific evidence. Incomplete endpoints, favorable redraws, outcome-dependent stopping, changing labels, policy selection using the sample and intervention/interference require a different argument.

Define `choose(n,a)=0` outside `0 <= a <= n`. For integer `k in {0,...,e}`,

\[
 F_K(k)=\Pr_K(X\le k)
 =\frac{\sum_{x=0}^{k}\binom Kx\binom{M-K}{e-x}}{\binom Me}.
\]

This follows by counting subsets with `x` failed and `e-x` nonfailed IDs. The target is the **fixed residual-frame failure fraction** `K/M`. It is not future-population risk, a marginal calibration guarantee, a posterior probability about `K`, measurement truth, or a statement for one named material.

## 2. Inversion and written proof

Set

\[
 A(k)=\{K\in\{0,\ldots,M\}:F_K(k)>\eta\},\qquad
 U(k)=\max A(k),\qquad R_U(k)=U(k)/M.
\]

The accepted inequality is **strict**. Equality `F_K(k)=eta` is rejected, matching the existing planner's `<= eta` convention. The set is nonempty: `F_0(k)=1>eta`. All probabilities and returned fractions can be evaluated by exact integer arithmetic.

**Monotonicity in K.** Label the same canonical frame so the hypothetical failed sets are nested, `B_K={1,...,K}`, and use the same uniform subset `S` in every world. Then `|S intersect B_K|` increases with `K`. Thus `{X_(K+1)<=k}` is contained in `{X_K<=k}` and `F_(K+1)(k)<=F_K(k)`. Every fixed label vector with `K` failures has the same counting law, so this coupling proves a distributional comparison; it does not assume actual different scientific worlds have nested failures. Consequently `A(k)={0,...,U(k)}`. Also `U(k)` is nondecreasing in observed `k`, because each CDF is nondecreasing in `k`.

**Discrete lower-tail p-value validity.** For any fixed true `K`, let `c` be the largest integer `x in {0,...,e}` for which `F_K(x)<=eta`. If none exists, the event is empty. Otherwise monotonicity in `x` gives

\[
 \Pr_K\{F_K(X)\le\eta\}=\Pr_K(X\le c)=F_K(c)\le\eta.
\]

This proof allows atoms, gaps in support and equality. The p-value is super-uniform, not generally uniform. No asymptotic approximation, continuity assumption, random tie breaking or prior is used.

**Coverage.** The initial-segment property gives

\[
 \{K>U(X)\}=\{F_K(X)\le\eta\}.
\]

Therefore, for every fixed label vector satisfying the sampling premises,

\[
 \Pr_K\{K/M\le R_U(X)\}\ge1-\eta.
\]

The confidence is over repeated valid evaluation draws. After one draw, `U(k)/M` is an upper endpoint of that confidence procedure; the display must not say that the fixed `K/M` now has posterior probability `1-eta` of lying below it. Coverage may be strictly greater than nominal because the distribution is discrete. “Exact” means exact finite counting and finite-sample coverage, not guaranteed equality to nominal coverage, optimal length, useful resolution or scientific validity.

## 3. Boundaries and internal consistency

| Case | Exact implication |
| --- | --- |
| No sample: `e=0`, necessarily `k=0` | Every CDF is one; `U(0)=M`, so the upper risk endpoint is one. No evaluation evidence is acquired. |
| Census: `e=M` | `X=K` deterministically. `F_K(k)=1` for `K<=k`, otherwise zero; `U(k)=k` and the finite-frame fraction is known exactly. Coverage is one. |
| All sampled IDs fail: `k=e` | Every CDF is one, so `U(e)=M`, including the no-sample case. This upper bound alone cannot certify a small failure fraction. |
| Zero failures with a nonempty sample | `F_K(0)=C(M-K,e)/C(M,e)`; the existing zero-failure tail is recovered exactly. It does not force `U(0)=0` before a sufficiently informative draw. |
| Feasibility of the unobserved remainder | For every valid `k`, `k<=U(k)<=M-e+k`. The left bound follows because `F_K(k)=1` for `K<=k`; above the right bound the minimum possible sample failures exceeds `k`, so the CDF is zero. |
| CDF exactly equals `eta` | Reject that count; do not round and do not replace `>` by `>=` in the acceptance set. A conservative alternative convention would produce a different endpoint. |
| Empty frame / impossible inputs | Exclude `M=0`; the fraction is undefined. Reject noninteger counts, `e<0`, `e>M`, `k<0` or `k>e`; booleans/floats are not exact integer counts. |
| Significance endpoints | The proposed interface restricts `0<eta<1`. Separately, at `eta=0` the same strict definition gives the deterministic support bound `M-e+k`; at `eta=1` the acceptance set is empty and this maximum is undefined. Do not silently assign a value at one. |

Illustrative equality case only: `M=4`, `e=2`, `k=0`, `eta=1/6`. The CDF for `K=2` is `1/6`, so that count is rejected; `K=1` has CDF `1/2` and is accepted. Hence `U(0)=1`, upper fraction `1/4`. For the same synthetic `M,e,eta`, `U(1)=3` and `U(2)=4`. Under the synthetic true world `K=2`, failure of coverage occurs exactly on its zero-failure draw, with probability `1/6`. This establishes a hand-derived sharpness example, not a test run or observed scientific outcome.

## 4. Exact link to the zero-failure planner

For a proposed finite-frame null `K/M >= rho`, with `0<rho<=1`, let `K0=ceil(rho M)`. Monotonicity makes `F_K0(k)` a valid composite-null lower-tail p-value for every `K>=K0`: it is at least `F_K(k)`, whose lower tail is super-uniform. Equivalently, the largest probability of any fixed lower-tail rejection region over this null occurs at `K0`.

For every possible observation,

\[
 U(k)<K0
 \iff F_{K0}(k)\le\eta
 \iff U(k)/M<\rho.
\]

Thus the inversion rejects the null exactly when its confidence endpoint lies strictly below the requested ceiling. At `k=0`, this is precisely

\[
 \binom{M-K0}{e}/\binom Me\le\eta,
\]

which is the published planner's qualifying condition. The mathematical equivalence also covers `rho=1`; the current planner API admits only `0<rho<1`, and this note does not extend its input domain. That planner finds the smallest positive `e` satisfying this best-case criterion; the proposed inversion would instead take an already fixed `e` and a synthetic or separately admitted observed `k`. Neither supplies the probability that a favorable count will occur under an unspecified alternative. The inversion does not convert best-case resolution into power.

Integer-grid distinctions remain explicit. If the intended conclusion is `K/M <= rho`, its logical opposite is `K/M > rho`, whose smallest count is `floor(rho M)+1`. That differs from `ceil(rho M)` when `rho M` is an integer. Do not change the current planner's `>= rho` null or describe rejection of it as merely a non-strict result.

For one frozen policy/frame/sample and one fixed `eta`, a single confidence bound logically supports comparisons to all ceilings on the same coverage event; displaying several consequences of that identical bound does not create separate draws. This observation does not authorize choosing a favorable scientific endpoint, policy, frame, sample size, significance level or study success criterion after seeing outcomes. Selecting among several separately computed bounds needs a valid joint/multiplicity analysis, even if they use the same sample. Repeating an analysis also does not add independent evidence.

A hand-derived optional-stopping counterexample shows why fixed `e` matters. In a synthetic frame with `M=4`, true `K=2` and `eta=1/2`, inspect the first draw and reject if it is nonfailure. Otherwise inspect the first three draws and apply the same fixed-count rule there. The first rejection event has probability `1/2`. On the other branch, first failure followed by two nonfailures has probability `(2/4)(2/3)(1/2)=1/6`; the three-draw CDF at one failure is again `1/2`, so it also rejects. Overall false rejection is `2/3 > eta`. Each fixed-count test is valid; this outcome-dependent choice is not covered. No simulation was run.

## 5. Minimal possible implementation — prospective only

If G21 adopts this fixed-frame inference contract, the smallest useful addition would be one separate pure exact function and immutable result with inputs `M,e,k,eta`. Preserve the existing prospective planner and its `no_observations` status. Do not bolt an outcome field onto that planner or make this routine fetch sources, sample IDs, infer endpoint meanings, fit models or verify its own sampling premises.

Reuse its existing engineering bound `M<=256` and exact bounded-fraction parser if later implemented. Evaluate the integer numerator of `F_K(k)` and compare `denominator * eta_numerator` with `numerator * eta_denominator`; never make a float comparison. The acceptance predicate is monotone in `K`, so binary search can find the last accepted count. A simple bounded scan is also sufficient and may be easier to audit. This note chooses no performance optimization or runtime API name. In either implementation, preserve `k<=U<=M-e+k`, the exact endpoint fraction, fixed finite-frame scope, and an explicit unverified-premise/synthetic-input status. A numeric `k` supplied by a caller is not self-authenticating empirical evidence.

A bounded executable validation, if later authorized as an implementation increment, should compare with independently enumerated binary frames and all size-`e` subsets for small `M`, calculating the actual coverage by counting allocations rather than reusing the production CDF. Test every `e,k`, `eta` exactly at attainable CDF atoms and on both sides, census/no-sample/all-failure bounds, monotonicity, permutation invariance, and consistency with the existing zero-failure planner. Include the equality case above and an optional-stopping counterexample. Synthetic known-answer passes verify the arithmetic and guard behavior; they are neither a new scientific study nor a compiled Lean proof. No such runtime checks were executed for this note.

## 6. Priority decision for G20/G21

This is a useful bounded extension **when a fixed-frame evaluation is actually justified**: it reports honest uncertainty after failures rather than providing only a best-case zero-failure calculation, and it prevents omission or reinterpretation of unfavorable counts. Its proof and interface can be frozen before any new outcomes.

It does not resolve G20's open source identity, paired-endpoint semantics, complete frame, missingness, lineage, overlap or scientific unit questions. It cannot make a single campaign into many independent studies, rescue an exposed benchmark, or produce transport to future power-plant materials. Present recommendation: retain this reviewed design now; prioritize source admission; implement the small function only as an explicit G21 reporting component once that inference target is chosen. No new UI, policy-family search, confidence-sequence framework, hierarchical model or physical-risk claim is needed for this increment. If no defensible source/frame is admitted, keep the result at mathematics/design tier and preserve the scientific no-go.

## Read and evidence scope

Only existing public project mathematical documentation and the G20/G21 goal definitions were read. The source bindings record those exact bytes. No empirical source cache, measurement file, new network resource, allocation, outcome interpretation, product test, CI job, Lean build or tracked edit was performed. Independent review concerns the written argument and scope; it creates no new statistical units.
