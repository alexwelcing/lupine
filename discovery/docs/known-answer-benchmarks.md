# Known-answer engine benchmarks

The bundled suite has **13 finite cases: 11 sound synthetic problems and 2
deliberately unsound negative controls**. Their answers are fixed by explicit
enumeration or elementary formulas. This checks the recommendation engine's
behavior against known answers. It does not establish materials prediction
accuracy, usefulness for undiscovered compounds, or physical interval soundness.

Run from `discovery/`, after installation:

```bash
python scripts/known_answer_benchmark.py --output reports/known-answers-v1.json
python -m unittest discover -s tests -p test_known_answers.py -v
```

The first command exits nonzero when an expectation fails. No network, DFT,
NumPy, or paid compute is required. The report is deterministic and contains
exact rational strings. The installed application loads the same resources
through `importlib.resources`, so it does not depend on a source checkout.

## What is solved independently

| Case | Known answer / required behavior | Observed retained pool |
| --- | --- | --- |
| Tied optima | Keep both A and B at true score 1 | 2 of 4 |
| Uncertified optimum | Retain the best candidate despite uncertain feasibility; incumbent regret is 4 | 2 of 3 |
| No incumbent | Preserve all possibly feasible candidates; no regret bound is available | 3 of 4 |
| Finite infeasible | Every candidate violates a constraint; no optimum exists in this finite universe | 0 of 3 |
| Tight nonzero regret | Incumbent regret 2 equals the conditional bound 2 | 2 of 3 |
| Integer design grid | Minimize `(x−3)²+2(y−5)²` over `x,y∈{0,…,8}`, with `x+y≤9`, `x≥2`; unique optimum `(3,5)` | 1 of 81 |
| Signed composition | Minimize `2a−3b+1/2`, with `a,b∈{0,2,4}` and `max(a+b−6,1−a)≤0`; unique optimum `(2,4)` | 2 of 9 |
| Normalized maximization | Negate benefit; reject the highest benefit when it exceeds the budget | 1 of 5 |
| Exact rational order | Distinguish `1/3` from `1/3+1/(3·10³⁰)`, which have the same binary float | 1 of 3 |
| Loose intervals | Uninformative bounds retain the full universe | 6 of 6 |
| Refined intervals | Narrow the same scoped intervals while retaining the optimum | 1 of 6 |
| Unsound score control | A falsely high score interval discards the true optimum; replay must expose it | 1 of 2; optimum lost |
| Unsound constraint control | A false infeasibility interval discards the true optimum; replay must expose it | 1 of 2; optimum lost |

An independent oracle enumerates feasibility and minimum scores using only the
sealed truth rows. It never reads interval bounds or selector outputs. Literal
predeclared answers check that oracle as well as the engine. For both formula
cases, the runner separately recomputes every truth row from its formula before
accepting the case. These small problems intentionally cover several mathematical
representations; they are not simulations of particular materials.

The score intervals in the quadratic grid are the constructed truth plus/minus
`1/4`. In the signed composition case, objective bounds correspond to propagation
of input uncertainty `±1/10` through signed coefficients `2` and `−3`; the combined
constraint slack independently has bounds `±1/10`. These constructions supply
known sound premises for testing. They are **not learned predictors**, and the
pool reductions must not be presented as evidence of scientific predictive skill.

## Prediction / outcome separation

Each problem and its outcome file are separate package resources. `get_case()`
and `case_catalog()` never return outcomes or expected answers. The runner selects
from the interval-only problem before reading the outcome resource.
`get_case_outcomes(case_id, problem)` accepts only the exact packaged problem
digest; editing an interval, unit, reference, or candidate invalidates this
known-answer association. User-edited problems need separately supplied outcomes.

The digest binds file identity. It does not prove that a model was trained without
leakage. These fixtures and outcomes are public, and this is an executable
software benchmark, not a prospective blind experiment. A local browser user can
explicitly reveal the built-in outcomes after selecting.

## Reading a pass

`summary.passed` counts cases whose **predeclared expectations** are met. A passing
negative control means the deliberate failure was detected, not that its pool
was safe. `sound_case_metrics` and `negative_control_metrics` therefore remain
separate. The finite-infeasible case reports retention as `null`: there is no
feasible optimum to retain, so it is not counted among successful optimum cases.

All 10 sound cases with a feasible optimum retain all true optima. The remaining
sound case correctly identifies finite-universe infeasibility. The two negative
controls both lose their optimum and refute their input interval premises. Tests
also inject a top-one truncation regression and corrupt a stored formula outcome;
neither can receive a passing report.

## Published-data evidence remains separate

The two original Matbench aggregate results are bundled **byte-for-byte
unchanged** in `resources/archived-v1.json`. `archived_reports()` preserves both
tasks, their source hashes, matched-budget baselines, and failures. Both tasks
refute simultaneous interval soundness; the band-gap task loses five tied
optima. The steels task retains its optimum but does not beat its nominal top-one
baseline on this replay. These results must not be relabeled as passed simply
because the synthetic engine checks pass.

The [archived protocol](archived-benchmark.md), report source hashes, and separate
predictor comparisons are the relevant evidence for scientific utility. New
scientific tasks should freeze representations, splits, interval construction,
candidate universe, and matched-budget baselines before evaluating outcomes.
