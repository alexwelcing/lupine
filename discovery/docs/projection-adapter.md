# Exact correction-field projection adapter

`lupine_discovery.projection` translates an explicitly declared correction-field
model into the existing [coupled certificate kernel](coupled-kernel.md). It is a
Python API. It adds no fitting, LP solver, scientific dataset, JSON input mode,
CLI command, or workbench mode. The [upstream design note](projection-field-adapter.md)
describes the research connection and the limits of the source claims.

The adapter checks algebra and declared identities. It does not establish that
a field parameterization, coordinate bound, anchor, or discrepancy bound is
physically valid. Its finite output always remains conditional.

## Two field premises, then a quantity relation

A `FieldBlock` declares

```
theta = offset + matrix @ z = b + S z
```

The normalized coordinates `z` are dimensionless. The field's parameter units
are explicit; each row of `S` and its offset have that parameter's units.
`parameterization_reference` records the premise that the actual field is in
this declared common image. General rectangular or singular matrices are
permitted. The adapter does not infer image coverage, invertibility, or a
representation theorem from marginal field intervals.

`field_bound_reference` separately records the enclosure of the normalized
coordinates. `field_bound_basis` is `declared_bound`, `empirical_residual`, or
`missing`. Finite numerical endpoints accompanied by an empirical or missing
basis are insufficient for this route. The same is true of a `None` coordinate
bound. Both image and enclosure declarations remain visible in the relation
record. An unsupported field premise also prevents model construction.

Each `Observation` declares a fixed nominal quantity and fixed projection
weights, using the error convention `model error = model - truth`:

```
source_truth_q = nominal_q - weights_q @ theta + rho_q * e_q
-1 <= e_q <= 1
```

The nominal value, discrepancy radius, and resulting source expression use the
observation's declared source unit. Each weight has the implied source-unit to
field-parameter-unit ratio; the adapter does not infer or validate dimensional
physics from unit strings. An explicit finite nonnegative `discrepancy_radius`
and `bound_reference` are required for the finite route. `bound_basis` uses the
same three values as field bounds. A fitted residual, observed maximum, or mean
error cannot enter as a hard enclosure merely because its number is finite.

`rho_q=0` is an explicitly declared exact relation, not a default approximation.
Every observation receives its own error coordinate, including zero-radius
ones. All combinations of error bounds are allowed; no stochastic independence
assumption is asserted. Distinct observation IDs never share their discrepancies
because their coefficients or names happen to agree. Reusing the same
observation through several target uses intentionally reuses that one scalar.

Substitution gives the exact source affine expression

```
constant = nominal - weights @ b
field coefficients = -(weights @ S)
own error coefficient = rho
```

Other blocks' and observations' coordinates have coefficient zero. A
`QuantityUse` then applies the complete target map:

```
target = scale * source_truth + offset
```

Negative scales affect every field and error coefficient. A source discrepancy
radius `rho` therefore becomes a target radius `abs(scale)*rho`; negating only
the nominal prediction would be wrong. Offsets support threshold margins as
well as explicit affine conversions. `QuantityUse` is a general affine target
map, not an automatic physical unit converter. A zero scale is permitted and
explicitly produces a constant target. It does not remove the declared source
premises from the input model.

## Scope and provenance are part of the input

The frozen input records are:

| Record | Role |
| --- | --- |
| `PhysicalContext` | Scenario, material, composition, structure, and operating-condition jurisdiction |
| `FieldScope` | Physical context plus model/version, observation family, reference method, and descriptor definition |
| `FieldBlock` | Scoped parameter IDs/units, exact `b` and `S`, local latent IDs/bounds, separate image and enclosure references, bound basis, source links, and premise status |
| `Observation` | Block ID and exact field scope, source quantity `Scope`, nominal, weights, discrepancy radius/basis/reference, source links, and premise status |
| `QuantityUse` | Observation ID, signed scale, offset, output `Scope`, conversion reference, and source links |
| `ProjectionCandidate` | Candidate ID, complete physical context, score use, and constraint uses |
| `ProjectionAnchor` | Observation ID, exact matching source `Scope`, uncertain interval, reference, source links, and premise status |
| `SourceIdentity` | Source ID, reference text, URI, and optional SHA-256 |
| `ProjectionProblem` | Declared scenario/output scopes, all records, joint-relation reference, and premise status |

An observation's `FieldScope` must exactly match its named block. Every quantity
used by a candidate must match that candidate's complete `PhysicalContext`.
Thus a score from one structure or operating condition cannot be combined with
a constraint from another under a shared material label. Observation families,
models, reference methods, and descriptors may differ between a candidate's
quantities when each is explicitly declared in a separate appropriate field
scope. This API implements no cross-context transfer relation.

All output scopes must exactly match the problem's score/constraint scopes.
All targets are minimized and constraints mean `g<=0`; the caller must express
maximization or threshold requirements with the full signed target map.
Anchors must exactly match their observation's **source** scope before any
arithmetic. Source identity links must resolve to declared source records.

IDs are unique within each record type. Input sequences and maps are copied to
immutable snapshots. Record collections and map keys have deterministic sorted
order; coordinate and parameter arrays preserve their explicit order.
Generated field coordinates contain length-prefixed block and local IDs, while
errors use separately namespaced observation IDs. Matching local names across
two blocks cannot create accidental sharing.

SHA-256 values are validated and preserved as identity declarations. The adapter
does not retrieve a URI or verify its bytes. A missing checksum remains missing;
an unpinned reference or an assumed bound is never promoted into scientific
attestation.

## Exact anchors

For a source affine expression `a @ z + c`, an independently supplied uncertain
anchor `[L,U]` adds exactly two rows:

```
 a @ z <= U - c
-a @ z <= c - L
```

The anchor's own discrepancy coordinate is part of `a`; uncertainty is not
discarded by replacing the interval with its midpoint. The same original domain
and source expression are used for all anchors and candidates.

The adapter does not solve consistency. Contradictory anchors can produce a
finite row model, but no point can pass the kernel's consistency gate. A rejected
point alone reports unestablished consistency. A supplied exact common-domain
contradiction certificate can instead establish mathematical inconsistency;
both cases retain every candidate operationally. They do not establish that no
physical material could satisfy the engineering problem.

## Build and screen results

```python
build = build_projection(problem)
result = screen_projection(problem, consistency_point=None, proofs=(), limits=Limits())
```

`build_projection` includes every declared block and observation in the joint
model, even if a candidate or anchor does not use it. Missing bounds in such a
declaration therefore still prevent the finite route. A caller should omit
irrelevant declarations intentionally; the adapter never silently drops them.

| Build status | Result |
| --- | --- |
| `finite_conditional` | `model` is a `CoupledProblem`; `retained` is `None` because building is not selection |
| `unsupported_all_retained` | `model` is `None`; `retained` contains all original candidate IDs; explicit reasons identify unavailable or unsupported premises |

Unsupported builds expose no generated coordinate map, finite observation
affines, anchor rows, kernel digest, or diagnostic interval pool. Original
declarations, including any finite numbers the caller supplied, remain in the
relation record for inspection. No missing bound is replaced by an arbitrary
large finite number.

A finite build exposes:

- `coordinate_map`: generated latent ID to index, kind, originating block/local
  ID or observation ID, and dimensionless unit `1`;
- `observation_affines`: source observation ID to exact `Affine`;
- `anchor_rows`: anchor ID to its upper and lower generated row IDs;
- `candidate_ids`: all original candidate IDs;
- `input_digest`, immutable `relation_record`, and `relation_digest`.

The complete relation record binds source identities, physical contexts, field
scopes, normalization, both bound declarations, anchors, signed transformations,
and all explicit assumptions. It also records the generated model digest when
finite. That kernel digest only identifies the kernel's numerical model and
quantity scopes. Changing source or conversion provenance can change the
adapter identities while leaving the numerical kernel model unchanged. Preserve
the wrapper when inspecting or exporting this result; the bare kernel model
does not contain the original scientific declarations.

`screen_projection` returns a `ProjectionScreen` containing the build, actual
retained IDs, status, and either a `CoupledSelection` or `None`. Finite builds
delegate to `screen_coupled`. Missing/bad/limited consistency retains all IDs;
verified contradictions report inconsistent premises and retain all IDs;
verified strict witnesses may remove candidates conditionally. Ties remain.
For unsupported builds, no kernel point or supplied proof is checked and
`selection` is `None`. This wrapper is not a new externally sealed proof format.

Kernel `Limits` apply to kernel proof work. They do not bound the preceding
adapter construction, exact transformations, normalization, or identity hashing.
This pure Python API has no untrusted input or HTTP execution boundary. A later
wire route must separately bound declared and derived dimensions, including one
extra latent per observation and two rows per anchor, before construction.

## Synthetic verification and remaining boundary

The worked bridge uses an uncertain zero-discrepancy anchor with nominal 3 and
known value in `[1,3]`, admitting `theta∈[0,2]`. Candidate source scores are
`A=5-theta+e_A` and `B=4-theta+e_B`. With each physical discrepancy bounded by
`1/4`, the shared field cancels and `B-A<=-1/2`; the interval pool contains both,
while coupled screening retains B. At radius `1/2`, both can attain score `9/2`
and must remain. The adapter represents each physical discrepancy as its radius
times a normalized coordinate in `[-1,1]`; this is algebraically equivalent to
the [hand-written coupled examples](projection-field-adapter.md#worked-synthetic-bridge),
not a claim that their coordinate layouts or digests are identical.

Run the focused tests with:

```sh
python -m unittest discover -s tests -p test_projection.py -v
```

They compare transformed expressions against independent direct evaluations of
`theta=b+Sz` and `nominal-weights@theta+rho*e`, including a nonidentity matrix,
signed target maps, uncertain anchors, exact ties, contradictory anchors, missing
and empirical-only bounds, incompatible contexts, independent blocks,
provenance identity, immutable records, and empty/rectangular cases.

[LupineProjection.lean](../formal/LupineProjection.lean) proves the corresponding
finite-sum substitution, difference/cancellation, signed affine transformation,
discrepancy enclosure, and anchor-row equivalences. The
[formal inventory](../formal/theorem-inventory.json) records the compiled
statements. These algebraic results do not prove Python refinement, model
identification, actual common-image coverage, discrepancy validity, anchor
provenance, or improvement on the frozen scientific benchmark. A scientific
evaluation needs independently justified or clearly conditional bounds,
archived joint observations, fixed scope, and a predeclared comparison.
