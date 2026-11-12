# Formal Audit: What the Current Statements Establish

> Mirrored on 2026-11-12 from [`lupine-rhizo/docs/formal-audit.md`](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/formal-audit.md), which is the maintained copy. The report it replaces here is identical to the previous report linked below.

**Scope correction, 4 November 2026.** The earlier page called a physical
hyper-ribbon claim “proven” and treated a defined causal graph as a conclusion
about nature. Those interpretations exceeded the formal statements. This
correction concerns evidence and proof boundaries; it is not a new simulation,
raw-data reproduction or compilation receipt.

The [previous report](https://github.com/alexwelcing/lupine-rhizo/blob/8965bc990803a0c87485e6682378a62dbd320c4d/docs/formal-audit.md)
remains in version history. Its reported counts and outcomes are historical
claims, not newly verified facts.

## Hyper-ribbon dimensionality

The inspected
[`HyperRibbonEmpirical.lean`](../lean-spec/OpenDistillationFactory/Materials/Theory/HyperRibbonEmpirical.lean)
contains:

```lean
def maxEmpiricalFractionalDimensionality : Float := 0.3981388474988096

theorem empirical_hyper_ribbon_holds : maxEmpiricalFractionalDimensionality < 0.5 := by
  native_decide
```

This checks a comparison of a fixed Float constant. It does not include a dataset,
source hash, covariance implementation, extraction proof or physical universality
quantifier. A proof of the comparison does not establish that the constant is the
maximum of the intended empirical population.

The old report also cited 386 observations, 38 potentials and a five-observable
validation, with names such as `empiricalFccBccSatisfiesHyperRibbon` and
`empiricalIsGroundTruth`. Those reported execution and provenance claims were not
re-established by this review. A provenance label, by itself, would not certify a
simulation trace or physical accuracy.

The maintained raw-error PCA path, its grouping and null limitations are described
in [the error-geometry contract](science/objects.md). Low sample PR is a
descriptive statistic; model-manifold identification, physical transferability
and useful correction require additional evidence.

## Causal-graph and Simpson's-paradox claims

[`MetaScience.lean`](../lean-spec/OpenDistillationFactory/Materials/Theory/MetaScience.lean)
proves with `rfl` that the explicitly defined `trueCausalGraph` lacks one edge and
that the explicitly defined `syntheticCausalGraph` contains it. Those are facts
about the definitions. The name “true” is not empirical identification of nature's
causal graph.

A detector result on a specified synthetic dataset concerns that dataset. Neither
it nor the defined graph establishes that elemental stratification can never
produce a reversal in physical observations. This review did not rerun the
historical detector or establish a real-world causal model.

## Current disposition

| Item | Supported scope | Not established here |
|---|---|---|
| Fixed Float comparison | The numerical proposition written in Lean | Empirical provenance, PCA correctness or physical universality |
| Defined-graph edge checks | Properties of the encoded graph values | Identification of a physical causal graph |
| Reported empirical spectra | Historical descriptive evidence with retained qualifications | Independent reproduction, general transferability or correction value |

Preserve the completed MEAM sample-size control and the Born-screening correction.
Next recover the joint-property input and normalization contract before extending
the dimensionality claim. A scientifically useful result may be a narrowed
description or a retired hypothesis; it need not be a new universality theorem.

## Related

- [Hyper-ribbon claim status](conjectures/hyper-ribbon-universality.md)
- [Born-screening correction](born-screening-re-audit.md)
- [The three error-geometry objects](science/objects.md)
