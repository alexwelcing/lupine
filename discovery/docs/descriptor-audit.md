# Posthoc composition descriptor audit

A posthoc diagnostic of the same pinned Matbench archives groups rows by the exact normalized elemental-fraction descriptor used in the benchmark. It does not change the fixed split, k, calibration radius, predictions, or benchmark results. It uses all recorded labels solely to audit information lost by this representation, not to fit a new model.

| Measure | Experimental band gap | Steel yield strength |
|---|---:|---:|
| Archive rows | 4,604 | 312 |
| Distinct exact descriptors | 4,601 | 312 |
| Descriptors shared by multiple rows | 3 | 0 |
| Rows in shared-descriptor groups | 6 | 0 |
| Shared descriptors with differing labels | 3 | 0 |
| Largest recorded-label range at one descriptor | 2.3 eV | 0 MPa |
| Unavoidable archive maximum absolute error lower bound | 1.15 eV | 0 MPa |

No formulas were excluded. The gap archive therefore contains three exact normalized-composition collisions, all with differing recorded targets. The largest discrepancy forces a nonzero worst-case error for every deterministic predictor using only this descriptor. The steel archive has no exact collisions, so this diagnostic supplies no positive lower bound there. Absence of observed collisions does not prove that composition uniquely determines steel properties.

To derive the bound, consider two rows with identical descriptor x and recorded labels a and b. A deterministic composition-only predictor returns the same value f(x) for both. By the triangle inequality,

`|a-b| <= |a-f(x)| + |f(x)-b| <= 2 max(|a-f(x)|, |b-f(x)|)`.

Thus at least one absolute error is at least `|a-b|/2`. Taking the extreme labels within each group and then the maximum over groups gives half the maximum within-descriptor range. This is also attainable on this finite archive by an unrestricted descriptor lookup predictor assigning each group the midpoint of its extreme labels. It is a representation-specific finite-archive error floor, not a generalization guarantee or a claim about the tested kNN predictor's attainable accuracy. For a common symmetric interval at that descriptor to contain all group labels, its radius must likewise be at least the half-range.

Normalization deliberately collapses possibly different raw formula strings into the same elemental fractions; crystal structure and physical state are absent. Equal descriptors do not assert that labels measure the same physical state. Recorded-label disagreement may arise from polymorphs, measurement conditions, formula equivalence in normalization, source errors, or other omitted information. This audit does not identify the cause or establish physical irreducibility. Source deduplication described in Matbench metadata does not prevent collisions under a separately normalized descriptor, and the observed collisions do not justify accusations about source validity. A broader representation could distinguish these rows; a sound selector can also retain uncertainty rather than demanding a unique point estimate.

There is also a direct residual-Lipschitz consequence at the recorded-label level. For a deterministic composition-only model m(x), define residual r = m(x) - y. Two different labels a and b at the same descriptor give residual difference `|r_a-r_b| = |a-b| > 0`, while their descriptor distance is zero. The inequality `|r_a-r_b| <= L*d(x,x)` therefore fails for every finite L. This is a concrete archive witness of the descriptor-collision obstruction discussed by the Rhizo descriptor theorem; it does not assert that a single-valued physical residual at a fully specified state is nonsmooth. Residual anchor intervals that include uncertainty may avoid inconsistent point premises, and a richer descriptor may separate the states. Sampling more distances cannot turn this collided point assignment into a finite global Lipschitz function.

This audit examines the entire archive after the pilots. It diagnoses the existing representation and does not evaluate a tuned replacement.

The actual command was:

```sh
PYTHONPATH=src python scripts/descriptor_audit.py
```

It writes [the aggregate report](../reports/descriptor-audit.json). The script uses the existing exact formula parser and hash-checked cache fetcher. Byte-pinned sources and licensing caveats are documented in [the archived benchmark](archived-benchmark.md). No formulas paired with raw property labels are redistributed by this report. Both archive hashes are included in the aggregate JSON for reproducibility.
