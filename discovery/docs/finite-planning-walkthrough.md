# Reading a finite-archive plan

This is a hypothetical worked example. It uses no material measurements and
sets no acceptance criterion for a scientific study.

Suppose a study has a complete, frozen frame of 100 evaluation panels remaining
after training and calibration. Each panel is one predefined candidate-comparison
problem with one fixed binary failure endpoint. The decision rule, frame,
endpoint, labels and sampling design stay fixed. What counts as failure must be
specified independently of the evaluation results; the planner cannot decide it.

For this example, consider the null hypothesis that at least one tenth of these
100 panels fail. That means at least 10 fixed failures. Set significance to 1/20 and
assume a uniform sample without replacement. Every subset of the chosen size
must be equally likely. The count must be fixed before outcomes, and all selected
panels must count. Unknown endpoints, omitted cases and duplicated measurement
costs need their own explicit treatment; this numerical input does not attest
them or make incomplete observations complete.

```sh
python -m lupine_discovery plan-finite-zero-loss \
  --population-panels 100 \
  --loss-ceiling 1/10 \
  --significance 1/20 \
  --maximum-evaluation-panels 100
```

The Study planning view's **What could a fixed archive resolve?** form returns
and exports the same exact object. The minimum qualifying positive count is 25.
At that count, the largest possible probability of observing zero failures
under the null is exactly

`655281507/13684039096`.

This is at most 1/20. The corresponding 24-panel probability is larger than 1/20.
The formula counts all-success subsets among all possible subsets:
`C(90,e)/C(100,e)`. The output also reports the bound at the caller's cap. With
a cap of 100, that bound is zero: a census cannot contain zero failures if the
fixed population has at least 10. It does not say that actual failure risk is zero.

If an independently conducted, predeclared 25-panel evaluation actually observed
zero failures and met the stated premises, this zero-failure rule would reject
the null at the declared significance. The false-rejection probability is bounded
over the random sampling design under each fixed null world. It is not a
posterior probability that the null is true, a prediction that zero failures will
occur, or a guarantee about future materials. A nonzero failure result does not
satisfy this rule; it must remain in the record without a favorable redraw or
changed endpoint.

The separate IID planner gives 29 for the same two numeric probability inputs.
It assumes independent and identically distributed future panel failures under
a fixed policy. Its null zero-failure probability is `(9/10)**e`, whereas the
finite planner conditions on a complete fixed residual frame and draws distinct
IDs. The two numbers answer different sampling questions; their difference is
not evidence of a better recommendation method or lower experimental cost.

A successful finite-frame test also does not establish useful candidate-pool
reduction, an advantage against equal-budget baselines, physical measurement
validity, or a failure bound conditional on a chosen subgroup. Those questions
need their own frozen endpoints, comparisons and valid inference. The current
software output therefore keeps adequacy unestablished, power uncomputed,
observed evidence absent, sampling premises hypothetical and future risk unknown.

For the complete mathematical and engineering contract, see
[finite-population planning](finite-population-planning.md). Existing archival
negative results remain unchanged; this example is planning arithmetic only.
