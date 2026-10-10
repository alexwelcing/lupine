# Universal candidate-pool specification

Status: mathematical specification. The [formal theorem inventory](../formal/theorem-inventory.json)
records 117 compiled statements: 18 scalar-selector, 15 Pareto, 9 nonlinear
interval/domain, 15 conditional finite-risk/rank, 12 interval-box sharpness,
19 conservative coupled-affine statements, 12 projection-algebra statements, and 17 direct-pool counting/finite-law statements. See the [theorem map](../formal/README.md) and
[actual verification record](../formal/VERIFICATION.md) for their precise scope.
Python conformance tests are not a formal refinement proof of the executable
runtime. Conditional finite-risk composition and a direct-pool finite weighted probability
bound are included. Arbitrary measurable exchangeable laws and their scientific
applicability are not proved.

## Objects and scope

Let X be a finite set of candidates, c an application scenario, s(x,c) a real
objective to minimize, and g_j(x,c) real constraint residuals. A constraint is
satisfied when g_j <= 0. Molecules, structures, alloys, processing histories and
other representations are all admissible candidate types. The abstract theorem
does not prescribe a descriptor or a scientific model.

The executable selectors use a finite X. The abstract scalar and Pareto Lean
statements quantify over arbitrary candidate types, with any required optimum
or incumbent existence stated as a hypothesis. That extra abstraction does not
make the runtime an infinite-domain search or establish physical completeness.

For a fixed c, each candidate has sound, finite intervals

    Ls(x) <= s(x) <= Us(x)
    Lj(x) <= gj(x) <= Uj(x), for every j.

Soundness is a premise, not an inference from a JSON field, a citation, a digest,
a narrow interval, model agreement or a finite benchmark. Intervals must have
consistent semantic scope, reference, units and sign conventions. A maximize
objective f becomes s=-f; a requirement f>=a becomes g=a-f. Such transformations
must be explicit. Objective weighting is a scenario choice, not a scientific law.

## Feasibility sandwich

    Fminus = {x : all Uj(x) <= 0}
    Ftrue  = {x : all gj(x) <= 0}
    Fplus  = {x : all Lj(x) <= 0}

Then Fminus ⊆ Ftrue ⊆ Fplus. Proof: gj<=Uj gives the first inclusion;
Lj<=gj gives the second. Thus Fplus empty certifies infeasibility only within X.
Empty constraint lists mean every candidate is feasible.

## Candidate pool and minimizer retention

If Fminus is nonempty, choose y minimizing Us over Fminus, breaking ties by ID.
Set B=Us(y), and retain P={x in Fplus : Ls(x)<=B}. If Fminus is empty, retain
P=Fplus and return no feasible incumbent or regret bound.

For every feasible minimizer x*, soundness gives

    Ls(x*) <= s(x*) <= s(y) <= Us(y) = B.

Also x* is in Fplus; therefore x* is retained. All tied optimizers survive.
This is a statement about the supplied candidate universe, not every physically
possible material. Discovery of candidates outside X is a separate generation
problem. The pool can equal X; no theorem promises a small shortlist.

Strict pruning has a witness: if Ls(x)>Us(y) for a certified-feasible y, then
s(x)>s(y). A constraint lower bound Lj(x)>0 proves that candidate infeasible.
An arbitrary top-k truncation loses minimizer retention.

## Regret

For nonempty Fminus, Ftrue and Fplus are nonempty. Define

    R = B - min_{x in Fplus} Ls(x).

The incumbent obeys 0 <= s(y)-min_{x in Ftrue}s(x) <= R. The right inequality
follows because s(y)<=B and min_Ftrue s >= min_Fplus Ls. A zero R certifies an
optimal feasible incumbent under the same soundness premises.

## Compatible refinement

Keep X, c, the objective, constraints and truth fixed. Tighten every interval:
L<=L'<=U'<=U. Then Fminus grows, Fplus shrinks, and (once an incumbent exists)
B'<=B. Since Ls'>=Ls, P'⊆P. The incumbent regret *bound* cannot grow; actual
incumbent performance need not improve at each update. Without soundness after
refinement, monotone arithmetic still holds but physical retention does not.

Adding candidates is exploration, not this refinement operation. Changing a
reference calculation, descriptor, model checkpoint or scenario is a new scope,
not silently tightened evidence. Wider uncertainty after discovering a failure
is a legitimate reanalysis that may expand P, not a monotonicity violation.

## Residual envelopes inherited from Rhizo

Let r=m-f be a residual, interval anchors r(xi) in [ai,bi], and assume
|r(x)-r(y)|<=L d(x,y), L>=0, in an adequate scoped representation. Then

    lower(x) = max_i (ai - L d(x,xi))
    upper(x) = min_i (bi + L d(x,xi))
    f(x) in [m(x)-upper(x), m(x)-lower(x)].

Each cone bounds r(x); taking their intersection preserves containment. Adding
compatible anchors tightens bounds. An inverted intersection signals incompatible
premises. A finite sampled check does not prove the global Lipschitz premise.
Without absolute anchors, even constant residuals can have arbitrary levels.
Descriptor collisions hiding unequal residuals defeat a finite Lipschitz claim.

Rhizo owns the existing envelope/collision/cold-start formalization. This repo
implements the exact finite cone arithmetic and extends the selection layer;
see `upstream-provenance.json` for pinned sources.

## Pareto candidate pools

Let I be a nonempty finite set of objective keys in the runtime. Each objective
f_i is minimized and has a sound finite enclosure [L_i(x), U_i(x)]. Constraints
and Fminus/Fplus retain the definitions above. True Pareto dominance means

    y dominates x iff every f_i(y) <= f_i(x), and some f_i(y) < f_i(x).

A true feasible Pareto optimum has no feasible dominator. The interval rule
requires a certified feasible witness:

    W(y,x) iff y in Fminus,
               every U_i(y) <= L_i(x), and some U_i(y) < L_i(x).
    P_pareto = {x in Fplus : no y satisfies W(y,x)}.

Soundness implies that W(y,x) supplies a truly feasible y that dominates x:
f_i(y)<=U_i(y)<=L_i(x)<=f_i(x), with the required strict component.
Consequently every true feasible Pareto optimum is retained, even when its
feasibility is only possible from the intervals. Equal objective vectors cannot
exclude each other; all truly optimal ties survive. A third candidate can still
exclude two equal nonoptimal vectors. Incomparable tradeoffs are not resolved
by an implicit weighted sum, lexicographic objective order, or top-k cutoff.

Without a certified feasible witness, all of Fplus remains. The retained pool
may contain dominated or infeasible candidates whose exclusion is not justified
by these intervals; it is a superset of the true feasible front, not a claim to
have identified it exactly. No scalar incumbent, threshold, or regret bound is
defined for this mode. Empty Fplus certifies infeasibility only of the supplied X.

With fixed candidate identities, objective/constraint keys and semantic scope,
componentwise interval tightening expands Fminus, shrinks Fplus, and preserves
each old witness, including its strict coordinate. Thus the Pareto retained pool
can only shrink. This arithmetic relation does not establish soundness of the
new intervals. [LupinePareto.lean](../formal/LupinePareto.lean) proves these
implications; the [runtime contract](pareto.md) and
[scoped JSON protocol](pareto-problem.md) describe their finite implementation.

## Domain-checked nonlinear enclosures

Signed linear combinations and coordinatewise min/max remain available.
For finite intervals A=[a,b] and B=[c,d], the additional exact operations are:

| Operation | Enclosure | Required domain |
| --- | --- | --- |
| Product | [min(ac,ad,bc,bd), max(ac,ad,bc,bd)] | Any finite A and B |
| Reciprocal of A | [1/b,1/a] | a>0 or b<0 |
| Quotient A/B | Product enclosure of A and [1/d,1/c] | c>0 or d<0 |
| Square of A | [a²,b²] if a>=0; [b²,a²] if b<=0; [0,max(a²,b²)] otherwise | Any finite A |

Reciprocal and division reject a denominator interval touching or crossing zero,
including when the numerator is zero. They do not insert a large finite bound.
Containment requires the true operands to lie in their supplied intervals, but
requires no statistical independence. Repeated dependencies can widen composed
enclosures. For example, interval multiplication of [-2,3] by itself gives
[-6,9], while direct squaring preserves the shared operand and gives [0,9].

[LupineIntervals.lean](../formal/LupineIntervals.lean) proves the finite-real
containment and domain statements. [The runtime operations](nonlinear.md) use
exact rational endpoints. Neither these rules nor their tests establish a
general nonlinear solver, physical model validity, or a Python-to-Lean
refinement. Infinite-domain coverage and optimal information acquisition remain
separate problems.

## Probability is a separate layer

If all interval premises hold jointly with probability >=1-alpha, deterministic
retention implies pool retention with at least that probability. Marginal per-row
coverage is not joint coverage of adaptively selected candidates. This version
does not manufacture simultaneous coverage from split-conformal quantiles or a
held-out coverage fraction. Distribution shift remains an empirical concern.

The integrated [calibrated-problem route](calibrated-problem.md) currently covers
one scalar objective plus all its constraints. It does not add a calibration
wrapper for Pareto objective vectors. For m>=1 candidates, p scalar targets
(one score plus the constraints), n calibration residuals per target, and
0<delta<1, the exact planner computes

    event_count = m*p
    epsilon = delta/(m*p)
    k = ceil((n+1)*(1-epsilon)).

For each target, k<=n selects the kth nonnegative absolute-error residual q.
Its prepared interval is [nominal-q, nominal+q]. If k=n+1, the radius is
unbounded, represented explicitly rather than clamped to the largest residual.
Finite rank is possible exactly when n>=ceil(1/epsilon)-1. Candidate and target
counts come from the submitted problem; a caller cannot reduce the allocation
denominator by supplying different counts.

The usual marginal split-conformal argument requires suitable exchangeability,
independent predictor/rule freezing, and candidate generation that preserves
each marginal premise. The union bound then needs no independence between
candidate events. These are explicit unverified assumptions, not facts inferred
from IDs, timestamps, residual arrays, or a receipt digest. Exact rank/allocation
arithmetic and finite output establish no probability guarantee by themselves.
`LupineRisk` proves finite risk composition and transfer to a supplied
deterministic conclusion under explicit valid event-risk premises, with a
concrete finite weighted probability instance. It also proves the exact rank
and minimum-count arithmetic above. It does not derive marginal coverage from
residual arrays or establish probabilistic Python refinement.

With finite radii and `assumed_unverified` premises, the prepared scalar problem
enters the existing exact selector, retaining its conditional sound-interval
interpretation. If any radius is unbounded or the sampling premise is
`unsupported`, the route abstains from pruning and retains all of X. It reports
no certified feasible/infeasible candidates, no dominance exclusions, no
incumbent, threshold or regret bound, and no prepared interval problem.
`possible_feasible` includes every candidate as an unresolved state. Nominal
predictions remain point estimates; they are not finite bounds, feasibility
certificates, or a ranking guarantee during abstention. A finite diagnostic
radius under unsupported sampling is likewise never used for pruning.

Retaining everyone preserves every feasible optimum trivially, but provides no
evidence of useful pool reduction. Physical evidence remains missing or
unverified, and the three existing archived pilot failures are not repaired by
adding this conservative route.

## Sharpness of interval-only scalar screening

For ordered finite intervals, retain x exactly when x is possibly feasible and
its score lower bound is no greater than every certified feasible candidate's
score upper bound. `LupineSharpness` proves this holds if and only if some world
inside the full Cartesian interval box makes x a feasible global minimizer.
Construct such a world by assigning x every lower endpoint and every other
candidate every upper endpoint. Every other feasible candidate is then already
certified feasible, so x's score is no larger. With no certified incumbent, the
comparison is vacuous and every possibly feasible candidate has such a world.

Consequently any rule that preserves every tied feasible minimizer in every
compatible interval world must retain the entire scalar pool. This is a limit
of the supplied information, not a claim that every constructed world occurs
in physics. Sound cross-candidate relations, mechanistic restrictions or tighter
bounds can restrict the admissible worlds and permit further pruning. See
[the sharpness contract and constructed-world tests](sharpness.md).

## Shared affine evidence and conservative exclusions

The [coupled kernel](coupled-kernel.md) supplies additional relations between
quantities. A separate [strict adapter](coupled-problem.md) exposes these through
JSON/CLI, actual-pool replay and guarded HTTP. In its declared scenario, use one common latent vector z and write

    P = {z : M_r dot z <= u_r for every original row r}
    score_x(z) = a_x dot z + c_x
    constraint_xj(z) = h_xj dot z + k_xj.

The runtime has finite rational coefficients, normalized dimensionless latent
coordinates with finite rational bounds, and finite candidate and row scopes.
The Lean statements use real semantics, an arbitrary candidate type, and finite
coordinate, row, and constraint types, including empty types. The certificate
soundness proof does not require boundedness or a complete solver.

The scientific premise is that **one actual z in P simultaneously represents
all actual candidate quantities**. Different latent explanations for individual
candidates are insufficient. A point checked against every row proves P is
nonempty; it does not establish that the model represents the physical world.
Learned correlation alone does not justify a hard affine relation.

For q(z)=a dot z+c, a nonnegative multiplier certificate verifies exactly

    lambda_r >= 0
    sum_r lambda_r * M_r = a
    sum_r lambda_r * u_r + c <= beta.

Multiplying and summing the domain inequalities then proves q(z)<=beta for
every z in that domain. A contradiction certificate instead requires zero
combined coefficients and `sum_r lambda_r*u_r < 0`; no point can satisfy those
rows. Equality at zero is not a contradiction. Certificates bind the complete
original problem, domain rows, candidate scope, and actual affine expression.
Sparse omitted multipliers mean zero. Exact checking accepts no numerical
tolerance or solver-status substitute.

For each candidate x, form its feasible domain

    Qx = P intersect {z : every h_xj dot z <= -k_xj}.

Two conservative exclusions are supported. A contradiction certificate for Qx
proves x is never feasible in the admitted model. Alternatively, a candidate y
can exclude x when certificates over that same Qx prove every constraint of y
nonpositive and `score_y-score_x <= beta` for a strictly negative beta. Thus
whenever x is feasible, y is feasible and strictly better. The witness need not
be feasible throughout P; conditional feasibility is not global certification.
Weak equality cannot exclude a tied optimum.

Every feasible global minimizer at the common actual z survives these rules.
Any collection of verified exclusions remains safe because every certificate
uses the original fixed universe and domains; later excluding a witness does
not change its mathematical comparison. The compiled `minimizer_retained`
statement takes baseline retention explicitly, then proves that any supplied
subset of certified coupled exclusions preserves it. It does not silently prove
the Python baseline or certificate parser correct.

Operational screening requires both an admitted `assumed_unverified` premise
and a checked consistency point. Unsupported premises, a learned-correlation
basis, missing/rejected/unchecked consistency, or a proved-inconsistent P retain
**all candidate IDs**, with no operational feasibility or exclusion claims.
An interval-box selection derived from that same affine model may remain visible
as a diagnostic, but is not used for pruning while this gate is closed. Empty P
means inconsistent model premises, not an empty physical material universe.
After the gate opens, already verified exclusions remain valid if later search
or checking exhausts its budget; every candidate without another valid exclusion
remains retained.
Proof-work limits are not end-to-end runtime or memory guarantees.

This method is incomplete: for always-feasible scores `X=1/2`, `Y=t`, `Z=-t`
on `[-1,1]`, X is never best but neither fixed witness is always better. The
kernel may retain X. It does not establish that every retained candidate has a
compatible optimality world, and it does not implement the design document's
full disjunctive branch procedure.

[LupineCoupled.lean](../formal/LupineCoupled.lean) proves the conservative real
rules. The [18 focused tests](../tests/test_coupled.py) and
[independent audit](../reports/coupled-independent-audit.json), reporting
10,003 checks across 11,027 synthetic worlds, are software evidence rather than
a Python refinement proof. No physical coupling or scientific benchmark
improvement follows. The implemented [projection-field adapter](projection-adapter.md) uses scoped
observation weights, anchors and bounded discrepancies to connect declared
correction fields to this interface; its physical premises remain unvalidated.

## Separate outcomes and partial truth

Outcome replay binds to the original problem digest and scenario. It fixes the
selected pool before parsing separately supplied outcomes; observing failures
does not change that original decision. Hashes establish identity, not outcome
independence or scientific truth.

Missing candidate outcomes or target values remain unknown. Pareto outcomes
explicitly allow absent or null individual objectives and constraints. Any
observed positive constraint proves that candidate infeasible, even if other
constraints are missing. Feasibility is true only when every declared
constraint is known and nonpositive; with no constraints it is vacuously true.
Otherwise feasibility remains unknown.

The global true minimizer set or Pareto front is reported only with complete
truth for the entire finite universe. Partial Pareto replay can report an
`observed_pareto_front` among fully measured objective vectors of known feasible
observed candidates; it is explicitly not the global front. A measured value
outside its supplied interval refutes the joint soundness premise immediately,
even with partial truth. Coverage fractions use observed scalar counts; no
observations yield null coverage rather than perfect coverage.

Abstention has no interval coverage to audit: replay reports null coverage and
regret, with `not_evaluated_abstention` status. Nominal prediction accuracy is not
substituted for interval coverage. Complete truth with no feasible candidate
reports an empty optimum/front and null retention, avoiding a claimed discovery
success. An empty Pareto universe is valid but gives null pool fraction and
`not_evaluated_empty_universe` soundness.

## Proof obligations, end to end

1. Domain representation and observable meanings are adequate.
2. Source measurements/calculations and reference compatibility are established.
3. Anchor and regularity premises justify intervals (or intervals stay assumed).
4. Serialization preserves interval bounds, with outward rounding where needed.
5. Selection arithmetic implements the specification.
6. The conditional theorems establish feasibility, scalar/Pareto retention,
   scalar regret, nonlinear enclosures, and conservative coupled exclusion
   under a shared-world premise; probability and physical coupling premises
   remain separate obligations.
7. Archival evaluation measures usefulness without leaking evaluation outcomes.

The first three include scientific obligations. Lean proves implications from
their formal premises; it does not validate arbitrary physical assumptions.

## Scoped correction-field translation

The [projection adapter](projection-adapter.md) substitutes the explicitly
supplied finite parameterization `theta=b+S z` into
`truth_q=nominal_q-w_q·theta+rho_q e_q`. It generates constant
`nominal_q-w_q·b`, field coefficients `-w_q S`, and a separate normalized
discrepancy coordinate with coefficient `rho_q`. Signed target maps act on
the entire expression. An anchor `L<=a·z+c<=U` is exactly equivalent to
the two rows `a·z<=U-c` and `-a·z<=c-L`.

The twelve statements in `LupineProjection.lean` prove these algebraic
identities, cancellation and discrepancy enclosures. Together with a supplied
actual common world satisfying every bound and anchor, they connect the
declared quantities to the existing coupled theorem premises. General matrices
do not imply image coverage, and metadata equality does not prove scientific
compatibility. Missing or empirical-only field/discrepancy bounds cause the
runtime adapter to construct no numerical model and retain all original IDs.

## Direct statistical candidate pools

This separate statistical mode calibrates a nested family of ranked pools,
not an interval enclosure. For each complete finite panel, let M contain all
true feasible tied minimizers. A frozen supplied permutation gives unique
ranks r=1,...,m. Define R=0 if M is empty, otherwise
`R=max(r(x)/m : x in M)`. For `0<=tau<=1`, keep every candidate satisfying
`r(x)<=m*tau`. Then all of M survives exactly when `R<=tau`.

For n complete calibration panels and exact `0<alpha<1`, use
`k=ceil((n+1)*(1-alpha))` and the kth ordered score when k<=n. Otherwise use
tau=1 and retain the whole future universe: the score has a proved mathematical
upper bound, unlike an arbitrary residual. Any missing calibration label keeps
its panel in n, withholds the threshold and retains all future candidates;
unsupported sampling premises also abstain. A zero statistical pool is not a
certificate of physical infeasibility.

Whole-panel score exchangeability under a frozen ranking procedure yields the
usual marginal split-conformal retention statement. The compiled probability
result has narrower explicit scope: finite outcome weights sum to one and all
indexed leave-one-out failure events have equal mass. It proves the count and
weighted-sum bridge and then the alpha bound, without assuming the bound itself.
It does not formalize arbitrary measurable exchangeability or validate a source
population. The runtime's permutation upper bound, insufficient-rank branch
and Python refinement are not formalized in this module.

The guarantee is marginal over calibration and one future panel; it is neither
conditional on realized calibration nor on feasibility, family or an individual
candidate. It supplies no feasible witness, regret bound, physical enclosure or
pool-size improvement. [The design](decision-pool-calibration-design.md) and
[verification](../reports/decision-pool-verification.md) preserve exact
counterexamples to stronger interpretations and all scientific limitations.
