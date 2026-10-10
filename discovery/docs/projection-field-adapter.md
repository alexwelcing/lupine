# Connecting Lupine correction fields to candidate screening

Status: the [exact Python adapter](projection-adapter.md) now implements this
algebraic bridge. It is not a validated physical model. The shared-affine certificate kernel supplies the
mathematical destination; this note identifies what a Lupine correction model
would have to provide before that kernel can screen candidates.

## The upstream connection

Two Library documents at commit
`9acdbaf9de337fccdfad419c23867378fce1aafd` were read and their retrieved bytes
checked against the local research copies on 2026-10-10:

| Source | Retrieved SHA-256 | Relevant scope |
|---|---|---|
| [Projection Law in Plain Language](https://github.com/alexwelcing/lupine-ledger/blob/9acdbaf9de337fccdfad419c23867378fce1aafd/content/latest/articles/docs/projection-law-in-plain-language.md) | `963b76fb0384decfbc4b1bef44716f62e72efda81aece84fde11f518d3e61cdb` | A correction direction is model-specific; component corrections do not automatically license derived quantities |
| [Environment-resolved error-field draft](https://github.com/alexwelcing/lupine-ledger/blob/9acdbaf9de337fccdfad419c23867378fce1aafd/content/latest/articles/paper/environment-error-field-2026-07-02.md) | `f9335f6d0cb0a1e5d27c6835e64b131b5c23e37880f905f21f04490207412dea` | Its proposed field projects through local-environment counts into observables; first-shell limitations and negative force results restrict the claimed scope |

These are upstream research reports. This project has not rerun their molecular
simulations or independently validated their reported statistics. Their role
here is to specify a model interface and its limits. Neither document licenses
exact hard constraints for arbitrary materials or operating conditions.

## A finite, explicit interface

Let `theta` be a finite vector of shared correction-field coordinates. For each
candidate quantity `q`, require a declared affine relation

```
true_q = nominal_q - weights_q @ theta + discrepancy_q
discrepancy_q in [-rho_q, rho_q]
```

The sign uses the existing convention `model error = model - truth`. The
weights specify how this quantity projects the shared field; they may represent
fixed environment counts or a separately justified linear observation map.
They are not learned implicitly by the certificate checker. Objective and
constraint transformations, including negating a maximization target, must be
applied to the entire affine expression.

The upstream field is indexed by model, material and observation family. A
single vector spanning different materials must therefore use explicitly
separate coordinate blocks unless an additional relation justifies sharing
coordinates. A shared array alone must not imply transfer between materials.

Give every discrepancy its own latent coordinate, unless additional coupling
between discrepancies is explicitly justified. Allowing all combinations of
their bounds is conservative and requires no stochastic independence. Set
`rho_q=0` only when the exact relation itself is a supplied premise. An empirical
fit residual, mean error or observed maximum is not a global discrepancy bound.
If a required finite bound is unavailable, the proposed adapter must abstain;
it cannot insert a large arbitrary number.

All field-coordinate bounds must be finite and justified under the same scope.
Represent normalized coordinates and coefficients exactly as rational numbers,
with explicit unit/reference conversions and their approximation errors. The
scenario, model version, reference method, descriptor definition, composition,
structure and operating-condition jurisdiction belong to the adapter record.
The checker establishes arithmetic implications; it cannot establish those
scientific identities merely from names or hashes.

Record the normalization explicitly as `theta = b + S z`, with dimensionless
latent coordinates `z`. The resulting expression is
`nominal_q - weights_q @ b - (weights_q @ S) @ z + discrepancy_q`.
Normalize discrepancy coordinates too; their scale coefficients carry the
quantity's units. Record any quantity conversion before constructing the
affine map. A nonlinear composite quantity is rejected unless a separately
justified affine enclosure and discrepancy bound are supplied; a unit label
does not make that transformation valid.

An independently known anchor quantity in `[L_a,U_a]` adds two rows:

```
 nominal_a - weights_a @ theta + discrepancy_a <= U_a
-nominal_a + weights_a @ theta - discrepancy_a <= -L_a
```

This keeps reference uncertainty visible. The same coordinates must explain
all admitted anchors and all candidate quantities. One exact feasible latent
point establishes consistency of the declared finite row system, not that the
physical world occupies it. Contradictory anchors or underestimated discrepancy
bounds invalidate the relation model; they do not prove that no material can
satisfy the engineering problem.

The existing independent-interval route can retain its own separately justified
premises. A new route whose intervals are derived entirely from this shared
model must retain all candidates when the shared model is unsupported or its
consistency is unresolved. A diagnostic marginal interval is not an operational
license in that state.

## Worked synthetic bridge

Suppose one reference anchor has nominal value 3, known value in `[1,3]`, and
zero discrepancy under a declared exact model. With weight 1, its rows give
`0 <= theta <= 2`. Two always-feasible hypothetical candidates then have

```
score_A = 5 - theta + e_A
score_B = 4 - theta + e_B
-1/4 <= e_A,e_B <= 1/4
```

Their separate score bounds are `A:[11/4,21/4]` and `B:[7/4,17/4]`. The scalar
interval selector retains both. But in every admitted shared-field world,

```
score_B - score_A = -1 + e_B - e_A <= -1/2 < 0.
```

The exact multiplier certificate uses the upper row for `e_B` and the lower
row for `e_A`, each with weight 1. The field cancels. Candidate A can therefore
be removed under the declared common-field and discrepancy premises. Increasing
both discrepancy bounds to `1/2` permits a tie; the strict exclusion must stop.
This example is synthetic algebra, not a prediction for an actual material.

Two hand-constructed wire examples make this bridge executable without claiming
an automatic scientific adapter: [bounded discrepancies](../examples/coupled-field.json)
and the [attained tie](../examples/coupled-field-tie.json). Each numeric latent
coordinate is divided by one synthetic score unit, so it is dimensionless;
the affine coefficients carry the declared score units. The anchor rows are
explicit even though they duplicate the coordinate bounds in these fixtures.
Their outcome files use constructed values from one separately declared model
point, not measurements.

From `discovery/`, run:

```sh
lupine-discovery select examples/coupled-field.json
lupine-discovery verify examples/coupled-field.json examples/coupled-field.certificate.json
lupine-discovery replay examples/coupled-field.json examples/coupled-field.outcomes.json
lupine-discovery verify examples/coupled-field-tie.json examples/coupled-field-tie.certificate.json
lupine-discovery replay examples/coupled-field-tie.json examples/coupled-field-tie.outcomes.json
```

The first example retains B and records the exact `-1/2` improvement bound.
The second retains A and B; its constructed outcomes attain the common score
`9/2`. Both marginal interval selectors retain both candidates.

The general pairwise difference is

```
score_y - score_x = nominal_y - nominal_x
    - (weights_y - weights_x) @ theta
    + discrepancy_y - discrepancy_x.
```

Shared uncertainty cancels only in the directions where the weights agree.
Otherwise the certificate must bound the remaining field contribution using
the original domain or the domain where candidate x is feasible. A fitted
ranking correlation does not supply such a bound.

## Implemented algebra and remaining validation boundary

The [Python API](projection-adapter.md) now generates latent coordinates,
anchor rows, exact candidate affine functions and the complete relation record.
Its signs and normalization were checked independently against the original
equations. Run `python examples/projected.py` for four constructed cases;
its report is not a workbench input. A [strict wrapper](projection-workbench-contract.md)
is proposed to preserve these declarations through versioned inputs and replay. In particular, preserve the whole derived map for
elastic moduli, differences or other composite quantities; independently good
component corrections do not license their composition automatically.

The adapter tests include the synthetic anchor example, its attained tie,
missing bounds and inconsistent-anchor controls. A scientific test then needs archived
joint observations, a fixed observation map, independently justified or clearly
conditional discrepancy bounds, disjoint anchor/evaluation allocations and a
predeclared comparison. The current composition-only JARVIS benchmark does not
contain the required environment-resolved field information, and cannot be
silently relabeled as a test of this adapter.

The [pinned Rhizo data audit](projection-data-readiness.md) identifies an
archived route and unresolved scope, bound and provenance prerequisites.
No new scientific result follows from the implemented algebra. It states a concrete route
from Lupine's correction-field research into the universal decision engine,
while preserving the extra premises that make the route meaningful.
