# Independent finite-population risk inversion derivation

Prospective mathematical review only. No empirical source, runtime module, endpoint,
protocol, model, threshold or allocation was used or chosen. These arguments
condition on a fixed frame and a fixed binary label for every member.

Let integer M >= 1, integer 0 <= e <= M, and integer 0 <= k <= e. For a frame
containing K failures, a uniform e-subset has failure count X with

    P_K(X=j) = C(K,j) C(M-K,e-j) / C(M,e),
    F_K(k) = sum_{j=0}^k P_K(X=j).

A binomial coefficient is zero for an out-of-range lower argument. The positive
probability support is max(0,e-M+K) through min(e,K). No IID label model is needed.
For fixed 0 < eta < 1 define

    U(k) = max {K in {0,...,M} : F_K(k) > eta}.

The set is nonempty because F_0(k)=1. It is an initial integer interval: couple
all K by drawing the same uniform e-subset S of {1,...,M} and defining
X_K=|S intersect {1,...,K}|. Then X_K is nondecreasing in K pathwise, hence
F_K(k) is nonincreasing in K. This is a mathematical coupling of count laws,
not an empirical assertion that physical scenarios form nested label sets.

## Discrete validity and coverage

For any fixed true K and any a in [0,1], the event F_K(X) <= a is a lower set
in the observed count. If j* is its largest attainable count, its probability
is F_K(j*) <= a; if it is empty, its probability is zero. Thus the discrete
lower-tail p-value F_K(X) is super-uniform, without continuity or randomization.

By the initial-interval property,

    {U(X) < K} = {F_K(X) <= eta}.

Consequently P_K(K <= U(X)) >= 1-eta for every fixed binary frame with K failures.
U(X)/M is a one-sided upper confidence bound for that frame's failure fraction.
The probability is over the declared uniform subset draw. It is not a posterior
probability, a future-material risk statement or a simultaneous bound on a
selected subgroup. Discreteness can make coverage strictly greater than 1-eta;
"exact" does not mean equality of coverage to the nominal level.

## Boundary and monotonicity checks

- No sample: e=0 implies k=0, F_K(0)=1 for all K, so U(0)=M.
- Census: e=M implies X=K deterministically, so U(k)=k.
- All sampled labels fail: k=e implies F_K(e)=1 for every K, so U(e)=M.
- For every admitted input, k <= U(k) <= M-e+k. The lower inequality follows
  from F_k(k)=1; larger K than M-e+k make an observation <=k impossible.
- U(k) is nondecreasing in k. It is nonincreasing in eta.
- At fixed k, increasing e cannot increase U: couple uniform subset samples as
  successive prefixes of one uniform permutation, whose failure count cannot
  decrease. This does not say U is monotone along a realized sample path, where
  k can also increase.
- If F_K(k)=eta exactly, K is excluded. The rejection comparison is <= eta,
  while the retained confidence set uses > eta. Replacing one comparison by a
  different convention changes the reported integer bound. A future exact
  implementation must preserve this boundary, not insert a numerical tolerance.

## Composite loss threshold and the existing zero-failure calculation

For any fixed K0 in {0,...,M}, monotonicity gives

    U(k) < K0  iff  F_K0(k) <= eta.

For every true K >= K0, the event on the right has probability at most eta:
its lower-tail cutoff has probability F_K(c) <= F_K0(c) <= eta. Hence it tests
the composite null K >= K0. With 0 < rho <= 1 and K0=ceil(rho*M), rejection is
equivalently U(k)/M < rho. It establishes a strict upper-threshold conclusion
under the sampling premises; it is not the different statement K/M <= rho.
At K0=0 the null cannot be rejected because F_0(k)=1.

When k=0,

    F_K0(0) = C(M-K0,e) / C(M,e),

with numerator zero when e > M-K0. This is the existing zero-failure planner's
finite null calculation. The inversion does not make an observed nonzero k
satisfy a zero-failure rule; it is a separate proposed observed-count inference.
No new product implementation or conformance test is implied by this derivation.

## Sampling, selection and repeated queries

M, the frame, binary meaning of failure, policy/label-generating procedure, e,
and eta must support the stated fixed-design experiment. Adaptive inclusion,
missing selected labels, outcome-dependent frame filtering, favorable redraws,
changing endpoints and duplicate cost/count handling require their own design.
Calibration/training reuse is not cured by a finite-population formula.

Fixed-e validity alone does not permit optional stopping. For example, let
M=4, K=2, eta=1/2 and draw a uniform random permutation. At e=1, observing a
nonfailure rejects because F_2(0)=1/2. If the first draw fails, continue to e=3;
observing only one failure then rejects because F_2(1)=1/2. The first event has
probability 3/6; the additional sequence with failures first and last has
probability 1/6. Total false rejection is 4/6 > 1/2. This is an algebraic
counterexample, not a program experiment or an actual study choice.

Repeating the exact calculation on the same M,e,k,eta does not create a new
statistical claim. Nor does inspecting multiple rho thresholds logically derived
from this single upper bound: their union of false nested-null rejections is
contained in {U(X)<K}, already controlled by eta. This exception must not be
confused with different sample looks, endpoints, frames, policies or a selected
eta, which expand or alter the inference problem. Predeclared error allocations
can provide a union-bound route for a finite collection; any sequential or
simultaneous extension requires its own proof and contract.
