# Universal candidate-pool specification

Status: mathematical specification. See `formal/README.md` for precisely which
statements have compiled Lean proofs. Python conformance tests are not a formal
refinement proof of the executable runtime.

## Objects and scope

Let X be a finite set of candidates, c an application scenario, s(x,c) a real
objective to minimize, and g_j(x,c) real constraint residuals. A constraint is
satisfied when g_j <= 0. Molecules, structures, alloys, processing histories and
other representations are all admissible candidate types. The abstract theorem
does not prescribe a descriptor or a scientific model.

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

## Multiple objectives and nonlinear properties

Version 0.1 certifies a declared scalar objective with multiple constraints.
Signed linear interval combinations and coordinatewise min/max are supplied.
They are conservative without independence assumptions. A universal Pareto pool,
nonlinear monotone maps, infinite-domain coverage, probabilistic joint coverage,
and optimal information acquisition need their own statements and proof modules.
They are not implied by scalar ordering or a low-dimensional error manifold.

## Probability is a separate layer

If all interval premises hold jointly with probability >=1-alpha, deterministic
retention implies pool retention with at least that probability. Marginal per-row
coverage is not joint coverage of adaptively selected candidates. This version
does not manufacture simultaneous coverage from split-conformal quantiles or a
held-out coverage fraction. Distribution shift remains an empirical concern.

## Proof obligations, end to end

1. Domain representation and observable meanings are adequate.
2. Source measurements/calculations and reference compatibility are established.
3. Anchor and regularity premises justify intervals (or intervals stay assumed).
4. Serialization preserves interval bounds, with outward rounding where needed.
5. Selection arithmetic implements the specification.
6. The conditional theorems establish feasibility, retention and regret.
7. Archival evaluation measures usefulness without leaking evaluation outcomes.

The first three include scientific obligations. Lean proves implications from
their formal premises; it does not validate arbitrary physical assumptions.
