# A concrete extension: shared affine uncertainty with exact certificates

**Recommendation:** implement a small exact certificate checker for shared
rational affine quantities, followed by conservative candidate exclusions. Start
with algebraic cancellation, linear upper-bound certificates, and infeasibility
certificates. Keep certificate generation separate and untrusted. Do not begin
with a general mixed-integer optimizer or claim that fitted correlations justify
hard pruning.

This extension can reduce a pool that is sharp for independent intervals because
it supplies additional information about which combinations of interval values
are admissible. The [sharpness theorem](sharpness.md) remains valid: it applies to
the full Cartesian box, whereas the new model restricts that box through declared
relations. The proposed relation premises must themselves be justified or clearly
marked as assumptions. This document changes no engine or benchmark code and
reports no improvement on JARVIS or another scientific archive.

## Mathematical input and exact scope

Use one finite vector of shared latent variables `z ∈ R^d` with finite rational
coordinate bounds. All affine coefficients and constants below are rational.
Certificate points and multipliers use exact rational values; the asserted
bounds and exclusions quantify over every admissible real latent vector.

```
P = {z : A z <= b}
score_x(z) = a_x^T z + c_x
constraint_xj(z) = h_xj^T z + k_xj
candidate x is feasible iff every constraint_xj(z) <= 0
```

The coordinate bounds are explicit rows of `A z <= b`, making `P` bounded and
closed. Additional rows encode equalities as two inequalities or other justified
linear restrictions. “Finite constraints” means a finite, identified set of
rows, not an infinite family silently sampled at selected points. Zero latent
variables is a useful special case of constant quantities.

The scientific premise is: **one common latent vector in `P` represents all
actual candidate scores and constraints in the declared scenario**. Individual
candidate fits with unrelated latent values do not establish this premise.
Neither a high correlation coefficient nor good training accuracy establishes
an exact affine equality. The framework is universal over the finite dimensions,
rational affine functions, candidate representations, and constraint rows; it
does not represent every physical law exactly.

Each latent, quantity, and relation needs a scenario, unit convention, reference,
and provenance record. Convert units explicitly using exact rational transforms
where available. An approximate conversion or approximate affine relation needs
an explicit bounded error term; rounding its coefficient does not make it exact.
The arithmetic checker verifies normalized numbers, not dimensional physics or
the source's scientific authority.

For a new problem, safe marginal intervals follow directly from each affine
expression over the coordinate box using existing signed interval arithmetic.
When extending an existing interval problem, preserve its candidate IDs and
quantity scopes and append exact rows requiring each affine expression to lie
within its existing interval. This prevents an accidental change of the original
problem. It does not prove that the added coupling represents physical truth.

Before using coupling to exclude anything, require an exact feasible point
`z0 ∈ P`. An empty `P` means inconsistent premises, not that the physical
candidate universe is infeasible. If consistency is unresolved or refuted,
report that state and add no coupled exclusions. The original interval-only pool
can remain visible under its original evidence status.

## A small example that actually reduces the pool

Let `0 <= t <= 2`, with two always-feasible candidates:

```
score_A(t) = t + 1
score_B(t) = t
```

Their separate score intervals are `[1,3]` and `[0,2]`, which overlap on `[1,2]`.
The existing scalar selector has incumbent upper bound `B=2`, so it retains both
candidates: both lower bounds are at most `2`. This pool is sharp if the scores
may vary independently within their intervals.

The shared expression proves

```
score_B(t) - score_A(t) = -1
```

for every admissible `t`. Candidate `A` is therefore strictly worse in every
coupled world and may be excluded. Candidate `B` is a robust feasible minimizer.
This is genuine additional information: the interval-box witness
`score_A=1, score_B=2` cannot satisfy the shared affine equations.

Add explicitly bounded errors to see why estimated correlations are insufficient:

```
score_A = t + 1 + e_A
score_B = t + e_B
-epsilon <= e_A,e_B <= epsilon
score_B - score_A <= -1 + 2*epsilon
```

With `epsilon=1/4`, the strict upper bound is `-1/2`, so exclusion remains valid.
With `epsilon=1/2`, equality is possible: `e_A=-1/2, e_B=1/2` makes the candidates
tie, and `A` must remain if every tied minimizer must be retained. With
`epsilon=3/4`, those endpoint errors make `A` strictly better than `B`. A fitted
shared trend without a justified error enclosure cannot choose the first case
over the latter two.

## Minimal certificate kernel

For any identified domain `Q={z : Mz <= r}`, an upper-bound certificate for
`q^T z + c <= beta` consists of rational multipliers `lambda` satisfying:

```
lambda >= 0
lambda^T M = q^T
lambda^T r + c <= beta
```

The checker verifies those three relations exactly. Multiplying and summing the
domain inequalities proves the bound. Zero multipliers are valid: they certify
the constant difference `-1` in the first example, after the shared `t` cancels.

An infeasibility certificate consists of rational `lambda` satisfying:

```
lambda >= 0
lambda^T M = 0
lambda^T r < 0
```

A feasible point would imply `0 <= lambda^T r < 0`, a contradiction. No trusted
solver is needed to check either certificate. Equality constraints remain pairs
of inequality rows, avoiding a separate unrestricted-multiplier convention in
the first version.

The checker must bind every certificate to the complete instance digest, domain
row IDs, affine-expression identity, scenario, and exact arithmetic version.
Reject duplicate or unknown row IDs, wrong coefficient dimensions, negative
multipliers, numeric floats, stale scopes, and unlisted extra assumptions.
Sparse omission may mean a zero multiplier only under an explicit schema rule.
Never accept a solver's textual status, numerical tolerance, rounded objective,
or reported dual residual as a certificate.

The first kernel needs only these operations:

1. Parse and evaluate finite rational affine expressions and row systems.
2. Verify a rational point against every domain inequality.
3. Verify the nonnegative linear-combination upper-bound rule.
4. Verify the corresponding strict contradiction rule.
5. Build candidate-specific domains deterministically from the original input.

These are small pure functions using `Fraction`. Certificate generation can use
an external solver or rational reconstruction, but failed reconstruction means
“unresolved.” An exact verifier makes an approximate solver an optional search
aid rather than part of the soundness boundary.

## Conservative exclusion with one witness

For each candidate `x`, define the domain where it is feasible:

```
Qx = P intersect {z : every constraint_xj(z) <= 0}
```

There are two immediately useful exclusion rules:

- A verified infeasibility certificate for `Qx` proves `x` can never be feasible.
- A candidate `y` may exclude `x` if certificates over **the same `Qx`** prove
  every `constraint_yj(z) <= 0` and
  `score_y(z)-score_x(z) <= -eta` for an exact rational `eta>0`.

The second rule says that whenever `x` is feasible, `y` is feasible and strictly
better. Candidate `y` need not be feasible throughout all of `P`. For example,
if `-1<=t<=1`, both candidates have constraint `t<=0`, and their scores are
constant `1` and `0`, the better candidate is not globally certified feasible;
it is nevertheless a valid exclusion witness wherever the worse one is feasible.
The receipt must label this conditional feasibility explicitly rather than
misreporting `y` as globally feasible.

Using only globally feasible witnesses is a simpler conservative subcase. It
reuses one feasibility certificate per witness over `P` and pairwise score bounds
over `P` or `Qx`. The initial producer can support this subcase first while the
checker already accepts the precisely identified `Qx` domains.

Strictness is essential. A verified upper bound of exactly zero only establishes
“no worse”; it does not justify dropping `x` when tied optima must be retained.
Derive `eta` from a verified negative rational bound rather than selecting a
floating-point tolerance. A tiny positive margin is mathematically meaningful
only under the stated exact relation and error premises.

## Feasibility and optimality certificates

Different claims require different certificates; a single “optimal” flag is
insufficient.

| Claim | Exact evidence required | Interpretation |
| --- | --- | --- |
| `x` can be feasible | A point in `Qx` | Possibility within the declared model |
| `x` is infeasible in every admissible world | A contradiction certificate for `Qx` | A valid exclusion |
| `x` is feasible throughout `P` | An upper-bound certificate for each constraint of `x` over `P` | Conditional robust feasibility |
| `x` can be a feasible minimizer | A point `z∈Qx`, with every other candidate either infeasible there or having score at least `score_x(z)` | Exact possibility, including ties |
| `x` is a feasible minimizer throughout `P` | Global feasibility certificates for `x`; for each `y`, either `Qy` is empty or `score_x-score_y<=0` is certified over `Qy` | Conditional robust optimality, not uniqueness |
| `x` cannot be a feasible minimizer | An infeasibility or strict-witness certificate, or the complete branch proof below | A valid exclusion |

A possible-minimizer point is particularly simple to verify: evaluate every
candidate at that point with exact rationals. A candidate with any positive
constraint is infeasible; otherwise compare its score using `<=`. This is an
existential model certificate, not a measured material outcome.

## The full possible-minimizer problem is disjunctive

The conservative witness rule is not complete. Exact possible optimality is:

```
exists z in P:
    every constraint_xj(z) <= 0
    and for every y != x:
        score_x(z) <= score_y(z)
        or some constraint_yj(z) > 0
```

The score comparison is weak so that ties remain possible. Infeasibility uses a
strict positive constraint; a candidate at constraint zero is feasible.

There need not be one alternative that wins in every world. For example, with
`-1<=t<=1` and all candidates feasible, let

```
score_X = 1/2
score_Y = t
score_Z = -t
```

All three individual intervals intersect, and the interval selector retains all
three. Neither `Y` nor `Z` is always better than `X`. Nevertheless,
`min(t,-t)<=0<1/2`, so `X` is never a minimizer. The linear feasibility conditions
for `X` to be optimal include `-t<=-1/2` and `t<=-1/2`. Adding those two rows gives
the exact contradiction `0<=-1`. This example separates a fixed-witness screen
from full possible-optimum reasoning without any scientific data.

With state-dependent feasibility, expand one alternative from each competitor's
disjunction. There are up to

```
product over y != x of (number_of_constraints_y + 1)
```

branches. An exclusion certificate must cover **every** branch generated from
the original input. A solver cannot choose which branches the verifier sees.
Verified domain implications may simplify branches, but those simplifications
also need certificates.

Strict rows require care. In a branch with normalized strict inequalities
`a_i^T z < b_i`, introduce one auxiliary variable `tau`:

```
0 <= tau <= 1
a_i^T z <= b_i - tau for every strict row
```

The original branch is feasible exactly when this closed system has a feasible
point with `tau>0`. A finite number of strict inequalities permits a common
positive margin whenever they all hold. A certificate that the closed system
is infeasible, or that `tau<=0` throughout it, proves the strict branch empty.
A point with positive `tau` proves it nonempty. Rows may first be rescaled by
explicit positive rational factors; `tau` is an algorithmic slack in that
normalization, not a shared physical safety margin.

Merely replacing strict `>` by `>=` gives a relaxation. Proving that relaxation
infeasible is a safe sufficient exclusion, but a feasible boundary point may not
be a witness for the original branch. For instance, with `t=0`, the claim `t>0`
is impossible even though its weak relaxation holds. In the margin system,
adding `t<=0` to `-t+tau<=0` proves `tau<=0` exactly.

The full branch method characterizes the coupled analogue of the sharp box pool
when all branches are decided. A bounded implementation must still return
“unresolved” when enumeration or certificate search is unfinished. It must never
convert an exhausted budget into exclusion.

## Implementation recommendation and failure behavior

Implement the conservative checker and producer first. This is useful without
solving the full disjunctive problem:

- Construct exact affine differences so shared variables cancel automatically.
- Generate simple upper bounds from signed coordinate-bound rows. In the error
  example, use multiplier `1` on `-e_A<=epsilon` and `e_B<=epsilon`, obtaining
  `score_B-score_A<=-1+2*epsilon`.
- Accept additional solver-produced rational certificates through the same
  checker, including proofs using the declared coupling rows and `Qx`.
- Return all candidate exclusions with their domain, witness, exact margin, row
  multipliers, and provenance status. Preserve all remaining candidates.

For `n` candidates, `d` latents, and `m` domain rows, a supplied sparse certificate
costs approximately its nonzero count times `d` exact arithmetic operations to
check. Candidate-pair search can be quadratic in `n`; impose explicit search
budgets and cache verified global feasibility certificates. Rational numerator
and denominator sizes also matter, so cap certificate length and arithmetic
work while treating cap exhaustion as unresolved. A cap must not round values
or change a strict comparison.

Do not implement complete branch search in the first release of this extension.
Its worst-case branch count is exponential, whereas the constant-cancellation
example is already solved by a zero-multiplier certificate. A later bounded
branch engine can reuse the same point and linear-combination checker, plus a
small proof layer verifying exhaustive branch coverage and strict-margin
transformations. Any advertised completeness then needs a precise domain and
resource contract; checker soundness alone does not imply search completeness.

Operational states should be explicit:

| State | Pool behavior |
| --- | --- |
| Valid strict exclusion certificate | Remove the identified candidate, conditionally on admitted coupling premises |
| Valid possible-minimizer point | Retain the candidate and expose its witness world |
| Solver timeout, infeasible-status text without proof, bad reconstruction, or resource cap | Retain the candidate as unresolved |
| Missing, rejected, or scientifically unsupported hard-coupling premise | Add no coupled exclusions |
| Empty or unresolved `P` | Report inconsistent/unresolved relation premises; do not infer an empty material universe |

A declared mathematical assumption can support an explicitly conditional
research certificate when that route is deliberately selected. It must remain
`assumed_unverified`. A learned correlation without justified residual bounds
belongs in a heuristic queue or a separately justified probabilistic model; it
must not silently become a hard affine row. Digests bind the declaration and
proof to an input but establish neither physical validity nor independence.

## Proof obligations before a runtime release

The following new statements should be formalized using real semantics and exact
rational executable checks:

1. Soundness of the nonnegative linear-combination upper-bound checker.
2. Soundness of the strict contradiction checker and feasible-point checker.
3. Sound generation of `Qx` and any original-interval link rows.
4. Infeasibility exclusion and conditional feasible strict-witness exclusion.
5. Preservation of every tied feasible minimizer after any collection of verified
   exclusions, under the common-world premise and verified consistency.
6. Correctness of possible-minimizer and robust-minimizer certificates.

The later complete branch method additionally needs exact equivalence of its
branch expansion, complete branch accounting, and the common positive-margin
transformation. These obligations are proposed, not compiled proofs. The
existing box-sharpness proof provides the motivation, not an automatic proof of
this extension or a Python refinement theorem.

## Algebraic checks performed for this design

The examples above were executed with `fractions.Fraction`, the existing scalar
selector, and an independent nonnegative-multiplier checker. The executed checks
confirmed:

- `[1,3]` and `[0,2]` retain both candidates in the current selector; the coupled
  difference certificate is exactly `-1`.
- Error radii `1/4`, `1/2`, and `3/4` give exact upper differences `-1/2`, `0`,
  and `1/2`, respectively; the latter two admit the stated tie and reversal.
- The three-candidate changing-witness example retains all three under the box
  selector, while the two optimality rows sum to the contradiction `0<=-1`.
- The strict-boundary example has a valid multiplier proof of `tau<=0`.

These are algebra checks of fully specified synthetic examples, not sampled
evidence for physical couplings. No scientific target table was opened, no
benchmark was changed, and no new coupled runtime was implemented for this
design note.
