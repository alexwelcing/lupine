# Conditional finite normalization algebra

For a finite coordinate type, real coefficients `a_i >= 0`, and positive total
`A = sum_i a_i`, the compiled `LupineNormalization` module proves that
`p_i = a_i/A` belongs to [0,1] and sums to one. A positive common coefficient
scale preserves the normalized function. Two such functions have exact finite
L1 distance in [0,2]. Generic finite real L1 is zero exactly for equal coordinate
functions, including an empty coordinate type; positive-total normalization
cannot instantiate that empty type.

Unit sum and scale invariance hold with positive total alone. Nonnegative
coefficients are separately required for coordinate and normalized L1 bounds.
The totalized Lean division definition outside positive total supplies no
certification for invalid inputs.

These universal algebra results do not validate a formula source, physical
composition, chemical-distance interpretation, statistical prediction, or any
Python implementation. Exact input conversion, matching ordered axes, unknown
states, and bounded resource behavior remain separate implementation contracts.
No scientific data are used by these proofs.

See the [theorem map](../formal/README.md),
[actual verification record](../formal/VERIFICATION.md), and
[historical independent review](../reports/formal-normalization-review-v1/README.md).

## Exact generic API

```python
from fractions import Fraction
from lupine_discovery.representation import normalize_coefficients, l1_distance

axes = ("x", "y")
p = normalize_coefficients(axes, {"x": 1, "y": 3})
q = normalize_coefficients(axes, {"x": 2, "y": 2})
assert p.values == (Fraction(1, 4), Fraction(3, 4))
assert l1_distance(p, q) == Fraction(1, 2)
```

Axes are explicit, ordered, unique labels. Omitted mapping entries declare zero;
explicit `None` is unknown and raises `RepresentationError`. Only exact `int`
and `Fraction` coefficients are accepted; floats, booleans, negative values,
unknown axes, and nonpositive totals raise fixed errors. Distances require the
same ordered axes. The configurable 1..1024-bit arithmetic profile can return
`RESOURCE_LIMIT` by raising; it produces no approximate vector or distance and
is not a wall-time or memory guarantee.

The five compiled statements are precisely those listed above. Python exactness,
map-order behavior, axis/error contracts, resource guards, L1 symmetry and
triangle behavior have executable test evidence only; no Lean-to-Python
refinement or additional compiled theorem is claimed. Chemistry-specific parsing
and fixture boundaries are described separately in [MPEA features](mpea-features.md).
