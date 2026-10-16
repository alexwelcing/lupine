# Scalar pool sharpness from interval information alone

The scalar retained pool is the **smallest pool that preserves every feasible
global minimizer in every compatible interval-box world**. A retained candidate
cannot be safely discarded using only the same independent interval bounds:
there is an explicit compatible assignment of scores and constraints in which
that candidate is optimal. This includes ties.

This is a limit on what the supplied information establishes. It does not say
every constructed world is physically attainable, or that current scientific
intervals are sound. Additional equations, coupled uncertainties, experimental
information, or narrower justified bounds can rule out some of these worlds.

## Exact statement

Let candidates range over an arbitrary type `C` and constraints over an arbitrary
type `J`. Each candidate has ordered finite real intervals:

```
Ls(x) <= Us(x)
Lj(x) <= Uj(x) for every constraint j
```

A compatible world consists of functions `s` and `g` satisfying every supplied
bound. No other relation between their values is imposed. Thus the admissible
worlds form a Cartesian box; “independent intervals” here describes the absence
of coupling restrictions, not statistical independence.

Use the existing feasibility sets:

```
Fminus = {y : every Uj(y) <= 0}
Fplus  = {x : every Lj(x) <= 0}
```

Define the threshold-free retained set:

```
Pbox = {x in Fplus : Ls(x) <= Us(y) for every y in Fminus}
```

The quantified condition is vacuous when `Fminus` is empty, so `Pbox=Fplus`.
When a best-upper incumbent `y*` exists and `B=Us(y*)`, the condition is exactly
`Ls(x)<=B`. This is the existing finite scalar selector, including its
no-incumbent branch. The formal statement does not assume that an arbitrary
infinite candidate type has a best-upper incumbent; the equivalence explicitly
takes that incumbent as a hypothesis.

For every candidate `x`:

```
x in Pbox
    iff
there exists a compatible world in which x is a feasible global minimizer.
```

The right-hand side is an existential possibility, not a prediction about the
real material. Each retained candidate may require a different witness world.

## Constructing the witness world

Fix any retained `x`. Set its values to lower endpoints and every other
candidate's values to upper endpoints:

| Quantity | Candidate `x` | Other candidate `z != x` |
| --- | --- | --- |
| Score | `s(x)=Ls(x)` | `s(z)=Us(z)` |
| Each constraint | `g_j(x)=Lj(x)` | `g_j(z)=Uj(z)` |

Every assigned value lies in its interval because the intervals are ordered.
Candidate `x` is feasible because it belongs to `Fplus`. For any different
candidate `z`, feasibility in this constructed world is equivalent to membership
in `Fminus`, because its constraints are exactly their upper endpoints.

Consequently every feasible alternative `z` satisfies

```
s(x) = Ls(x) <= Us(z) = s(z).
```

The retained-set definition supplies the middle inequality. Candidate `x` is
therefore a feasible global minimizer. The case `z=x` is immediate. When there
is no certified feasible candidate, every other candidate is infeasible in the
constructed world, and `x` is still a global minimizer, regardless of its nominal
score relative to the others.

For the reverse direction, suppose some compatible world makes `x` a feasible
minimizer. Feasibility implies `x` belongs to `Fplus`. Every `y` in `Fminus` is
feasible in that world, so sound bounds and minimality give

```
Ls(x) <= s(x) <= s(y) <= Us(y).
```

Thus `x` belongs to `Pbox`. Together, the two directions establish the exact
characterization, not merely a conservative sufficient condition.

## What minimality does and does not require

Call a proposed pool `Q` universally safe for these intervals when it contains
**all** feasible global minimizers in **every** compatible world. Applying that
requirement to each constructed witness world gives `Pbox` contained in `Q`.
The usual retention theorem already establishes that `Pbox` itself is safe.
Therefore it is the unique smallest such pool by set inclusion.

If a rule discards a retained candidate, the endpoint construction supplies an
actual mathematical counterexample to that rule's all-minimizer safety. It is
not merely a failure to prove the smaller pool safe.

The all-minimizer requirement matters. With three always-feasible candidates
whose scores are all exactly zero, all three are minimizers. Keeping one of them
preserves *an* optimum but violates the project's contract to preserve every
tied optimum. This theorem does not assert minimality for the different task of
keeping at least one optimum.

The Cartesian-box scope also matters. Suppose both scores lie in `[0,10]`, and
both candidates are feasible. Both candidates are retained from those intervals
alone. Additional information `s(b)=s(a)-1` rules out `a` as a minimizer, even
though the interval-only witness `s(a)=0, s(b)=10` made it optimal. The witness
violates the new coupling equation. The theorem neither ignores nor disproves
such additional information; that information simply defines a smaller set of
admissible worlds.

For empty candidate sets, the statements quantify over no candidate and require
no invented optimum. For a candidate whose constraint lower bound is positive,
no compatible world can make it feasible. The construction and characterization
therefore apply precisely to retained candidates, not arbitrary inputs.

## Consequence for a large retained pool

If broad intervals retain an entire finite input universe, the existing selector
cannot guarantee a smaller pool using only those same bounds while maintaining
all-minimizer retention. A more aggressive ranking can still be offered as a
heuristic, but it does not inherit the interval guarantee.

Useful ways forward are scientific or informational: establish narrower valid
enclosures, obtain informative measurements, or supply justified relations
between quantities or candidates. Sharpness does not show which route will
work, prove the calibration premises, or establish physical validity. A
retrospective observation that the true optimum was retained also does not make
an uninformative whole-universe pool useful.

## Formal and executable evidence

[LupineSharpness.lean](../formal/LupineSharpness.lean) reuses the existing scalar
`Bounds`, `Sound`, `Possible`, `Certified`, `BestUpper`, and `Retained`
definitions. Its `OrderedIntervals`, `BoxRetained`, and `GlobalMinimizer`
definitions make the extra assumptions and existential claim explicit.
`UniversallySafe` quantifies over all compatible score and constraint functions.

The module's 12 statements were locally compiled with the pinned Lean/Mathlib
environment using:

```sh
cd formal
lake env lean LupineSharpness.lean
```

Every printed axiom report contained only the standard `propext`,
`Classical.choice`, and `Quot.sound` axioms. The central results are
`box_retained_iff_realizable`, `box_retained_iff_best_upper_retained`,
`no_certified_box_retained_iff_possible`, `box_retained_minimal`, and
`pruning_retained_has_counterexample`. The repository's integrated formal
inventory and build record are maintained separately.

[test_sharpness.py](../tests/test_sharpness.py) constructs endpoint worlds
independently of selector membership. It checks every retained candidate across
1,296 small interval problems and 400 deterministic rational problems with zero
through three constraints. Additional checks exhibit a lost minimizer for every
strict subset of a retained pool, explain ties and the no-incumbent case, and
show how a genuine coupling restriction invalidates an interval-box witness.

```sh
python -m unittest discover -s tests -p test_sharpness.py -v
```

These executable conformance checks do not constitute a Python-to-Lean
refinement proof. No selector, prediction, calibration, or frozen benchmark
implementation changes are needed for this result.
