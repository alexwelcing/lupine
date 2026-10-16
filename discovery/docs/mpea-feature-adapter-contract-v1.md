# Exact declared-coefficient features: frozen stage specification

Status: specification frozen for the first source-bound feature stage. The generic
helper and synthetic adapter were reviewed, tested and published in `2e4162b`.
A separately reviewed source reader implements the custody/output boundary in
[mpea-feature-reader-v1.md](mpea-feature-reader-v1.md). No actual archived feature
extraction has run at this source-freeze checkpoint. The reviewed source, tests
and both specifications must be committed, pushed and pass all four CI jobs
before the first feature invocation. Existing project authorization covers that
execution; it does not authorize bypassing its prescribed evidence gates.
Per-row vectors remain in ignored local artifacts; only aggregates and whole-file
identities may be published. The complete scientific protocol must separately
freeze before source-role allocation or performance interpretation.

The intended representation is a deterministic normalized vector of **declared
lexical coefficients**, together with an explicit encoding of declared processing
metadata. It preserves original source-bound record IDs and unresolved rows. It
does not establish true composition, percent accuracy, specimen identity, source
independence, physical compatibility, or a useful predictor.

## Source and scope contract

An eventual source-specific adapter must bind the original source identity,
frozen 23-column mapping, G15B metadata receipt, G15C supplemental formula receipt,
both producers and their committed tests, the producer-format evidence, and this
new feature specification. It must check that each input row's source SHA and
ordinal agree across these records. G15B's original zero-of-1545 recognition
result remains a historical result; a new descriptor must not rewrite it.

The documented producer obtains atomic fractions, divides by the largest, rounds
to three decimals, and prints explicit element/count terms. These coefficients
are rounded ratios, not necessarily percentages summing to 100. Actual v9
execution lineage is still unestablished. Normalizing the available coefficients
will create a dimensionless unit-sum **representation of those coefficients**;
it cannot undo rounding or establish the unknown underlying atomic composition.

Opaque G15C group numbers are insufficient to reconstruct a coefficient vector.
A future feature stage would need a newly authorized, hash-bound pass over the
formula cell, or equivalent private captured formula tokens. It must not recover
features from group numbers, raw-token hashes, record order, target cells,
references, target presence, or outcome-derived exclusions. Formula recognition
must still match the frozen G15C grammar. The processing category is taken from
the linked frozen G15B metadata receipt, not reinterpreted from free text.

For this feature stage, raw formula tokens remain private and are never logged.
Nevertheless, a released 118-vector exposes normalized composition information.
It is a materially broader disclosure than opaque equality groups. The final
execution/publication policy must explicitly declare whether per-row vectors
remain in an ignored local artifact and only aggregate overlap diagnostics are
published. Recommended first implementation: local source-bound feature table;
public code, synthetic controls and aggregate readiness/overlap report only.
Do not describe a normalized vector as target-opaque *and therefore* automatically
authorized for publication; target opacity and formula-feature disclosure are
separate boundaries.

## Fixed representation and exact arithmetic

The vector has these 118 axes, in atomic-number order, bound by a descriptor
version rather than obtained from dictionary iteration or a runtime dependency:

```
H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn
Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce
Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn
Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
```

Each G15C-recognized term has a valid element symbol and a required positive
plain-decimal count. Exactly one ASCII space separates terms. Reserved missing
tokens take precedence. No trimming, exponent parsing, implicit unit count,
case folding, spelling repair or legacy concatenated grammar is added here.
Unsupported lexical tokens stay unresolved, even if another chemistry parser
could repair them. Single-element and repeated-element tokens remain permitted
lexically; they do not prove an MPEA or a valid specimen.

For terms `(e_j, c_j)`, convert each declared decimal exactly, then define

\[
  a_e = \sum_{j:e_j=e} c_j,\qquad A=\sum_e a_e,\qquad p_e=a_e/A.
\]

Every present term has `c_j > 0`, so a nonempty accepted list has `A > 0`.
Repeated symbols are explicitly **added**, never overwritten or rejected after
looking at the data. Thus `Fe1 Fe1 Ni2` and `Fe2 Ni2` have the same descriptor.
Term ordering does not matter. A recognized, completely processed formula gives
an exact zero for every axis absent from that formula. These zeros describe the
declared representation only; they are not a claim that the physical specimen
contains none of those elements.

The output quantities are reduced exact rational strings, with unit convention
`1`. No binary float participates in parsing, accumulation, normalization,
identity, equality or distance. Multiplying by 100 can create display percentages
of the declared coefficient vector, but is unnecessary for the initial adapter;
it must not be labeled measured atomic percent or silently fed back as truth.

## Prospective numerical resource profile

Keep the frozen byte-framing caps and add a distinct, predeclared feature profile:

- At most 256 terms per formula after exact ASCII-space splitting.
- At most 128 decimal digits per count, excluding the decimal point, and at most
  64 digits after the point. Leading zeros count toward these caps.
- At most 1024 bits for each integer used by the decimal accumulation compiler
  and for each returned rational numerator and denominator.
- Exactly 118 output coordinates; at most the original 4096 framed rows, with
  all source rows retained. The prospective actual artifact's 1545-row binding
  remains an additional source-specific consistency check.

All token/term/digit/scale checks occur before `int` or `Fraction` construction.
An implementation can avoid needless denominator growth by taking
`K = max(decimal_places)`, forming each nonnegative integer mantissa times
`10**(K-decimal_places)`, summing those integers by element, and returning
`Fraction(element_sum, total_sum)`. With these caps, even a 128-digit integer
combined with a 64-place fraction and 256 terms stays below 1024 bits. The code
should still enforce the bit guard rather than rely only on this hand bound.
There is no rounding, clipping or finite placeholder when a limit is exceeded.

These are new limits for feature arithmetic, not a change to G15C recognition.
A token can be G15C-recognized yet exceed this feature profile. That row must be
`UNRESOLVED_LIMIT`, remain in its source panel, and retain its lexical group and
record identity. Report the count of such rows and the original denominator.
Do not drop it and claim complete feature coverage on the smaller denominator.

## Processing and unknown states

The declared processing encoding has ordered indicators
`CAST, POWDER, WROUGHT, ANNEAL, OTHER, UNRESOLVED`.
The first five encode the exact G15B category. The last encodes the **metadata
observation state**, not an actual sixth processing method. An unresolved token
must not be silently changed to `OTHER`, a modal category, or an all-zero vector.
No finer thermal history, manufacturing route or physical equivalence is inferred.

Every output row retains at least:

```
record_id, ordinal, original_formula_group, original_source_group,
composition_status, composition_reason, composition_vector_or_null,
processing_status, processing_category, processing_indicator,
descriptor_version, source_and_receipt_identities
```

For missing/unrecognized formula, resource failure or incompatible source scope,
the **entire composition vector is null**. It is not a 118-zero vector and is
not a partially decoded prefix. A scope identity conflict should block the whole
adapter invocation; a valid row's lexical or numeric feature uncertainty remains
a per-row unresolved state. Preserve all reasons when more than one input state
is unresolved. Invalid processing receipt structure is a linkage/input error,
not a new free-text category.

The adapter makes no prediction, feasibility decision, candidate exclusion,
calibration guarantee or eligibility decision. A separate frozen study may
specify a processing-only fallback for unknown composition; that is a declared
predictor branch, not an imputed composition. It must use training targets only
when fitting that fallback, and keep unknown rows/panels in calibration and
evaluation. This draft neither selects a fallback's fitted values nor grants
label access.

## Descriptor equality, collisions and overlap

Three identities must remain distinct:

1. The immutable source-bound observation record ID.
2. G15C's exact original-token equality group.
3. Equality of the derived normalized composition vector, and separately equality
   of that vector **plus** the declared processing encoding.

Examples of intended descriptor collisions are reordered terms, repeated-symbol
aggregation, decimal spellings with equal value, and proportional coefficients:
`Fe1 Ni1`, `Ni1 Fe1`, `Fe1.0 Ni1`, `Fe2 Ni2`, and `Fe1 Fe1 Ni2` all give the same
composition vector but retain distinct records and potentially distinct lexical
groups. Differences in processing may split the combined descriptor identity.
Neither collisions nor differences identify real compositions, specimens or
independent experimental observations. Do not deduplicate rows because their
descriptors collide; that changes panel membership and outcome denominators.

Before outcome access, a proposed study should report, for each already frozen
development/calibration/evaluation role and each role pair:

- Original row and source-token-group counts, plus unresolved formula/source/
  processing counts and feature-limit failures, with total denominators.
- Exact formula-token overlap, normalized-composition overlap, and combined
  descriptor overlap, including participating row/group counts.
- Source-token group overlap and which normalized descriptor groups span multiple
  source tokens or multiple roles. Unknown source tokens do not form one shared
  source identity, and unknown composition vectors do not form a descriptor group.
- Multiplicity of different lexical groups within each known descriptor group,
  summarized without exposing original formula tokens or per-token hashes.

These checks use only authorized metadata/features and fixed role membership.
They do not prove absence of duplicated specimens or hidden source dependence.
If an overlap gate is desired, freeze its criterion before seeing the report;
do not silently regroup components, reseed a split, remove awkward rows or change
the feature map after observation. A study may deliberately remain a lexical
source-holdout study with cross-role descriptor overlap, provided it reports
that scope and does not call it chemical novelty or future-study independence.

## Reusable conditional mathematical helper

The reusable helper is normalization of a finite, nonnegative exact coefficient
map with positive total, independent of chemical symbols. A material adapter
supplies the fixed symbol vocabulary and validates positive lexical terms;
another domain may supply other labels and explicitly meaningful coefficients.
No universal physical interpretation is attached to the helper.

For exact inputs `a_e >= 0` and `A = sum(a_e) > 0`, the prospective helper can
establish algebraically:

- `p_e >= 0`, `p_e <= 1`, and `sum(p_e) = 1` exactly.
- Permuting the terms, or splitting/coalescing positive terms with the same
  label, leaves the result unchanged.
- For any strictly positive scalar `t`, `normalize(t*a) = normalize(a)`.
- For two positive-total maps on the same finite axes, their normalized maps
  are equal exactly when the aggregated maps are positively proportional.
- Exact L1 distance between normalized maps lies in `[0,2]`, is zero precisely
  when the maps agree, and obeys the usual symmetry and triangle inequality.

This is ordinary finite rational arithmetic. The prototype has exact executable
checks, not a claimed Python-to-formal refinement. Separate proposed formal
lemmas must be reported only after compilation and audit. Normalization neither identifies the coefficients
as atoms nor proves that simplex distance is physically predictive. A generic
helper must reject/return unresolved for negative coefficients, empty/all-zero
total, unknown values, mismatched axes or exhausted arithmetic limits rather
than invent a uniform/zero vector. The material grammar is stricter: every
listed coefficient must be positive, while absent axes legitimately receive zero.

The proposed archival-study draft uses composition L1 with a declared neighbor
rule; processing may be a baseline or a separate categorical input. This adapter
does not choose a processing/composition distance weight, number of neighbors,
group-sampling procedure, target conversion or risk allocation. Those belong to
the separately frozen study protocol, whose current design is
an independently reviewed prospective protocol in ignored scratch. This feature
specification does not register it.

## Known-answer controls required before implementation release

All controls below are constructed examples, not discovered archive cells.

| Input/control | Required result |
| --- | --- |
| `Fe1 Ni1` | Fe = 1/2, Ni = 1/2, every other declared axis zero |
| `Ni1 Fe1`, `Fe2 Ni2`, `Fe1.0 Ni1`, `Fe1 Fe1 Ni2` | Same composition descriptor; records/lexical groups are not merged |
| `Fe0.333 Ni1` | Fe = 333/1333 and Ni = 1000/1333 exactly |
| Constructed true ratio Fe = 1/3, Ni = 1, rounded token above | Normalized Fe differs from 1/4 by 1/5332; no recovery of true composition claimed |
| `Fe1`, `Ni1` | Distinct simplex vertices; L1 distance exactly 2 |
| `NaN`, empty, `FeNi`, `Fe1Ni1`, `Fe0 Ni1`, exponent/extra-space forms | Null whole composition vector, preserved row and explicit reason |
| Valid lexical token exceeding any feature cap | `UNRESOLVED_LIMIT`; no partial vector or row deletion |
| Generic zero-total/negative/unknown-coefficient input | Unresolved/input rejection; no normalized output |
| `OTHER` versus unresolved processing | Distinct indicators; neither silently changes the other |
| Same vector in different source tokens/roles | Overlap is reported; no automatic split repair or independence claim |
| Changed raw target/withheld cell bytes with valid framing | Identical feature content, with only source identity bindings changed as appropriate |
| Malformed framing, stale G15C row ID or mismatched source receipt | Closed failure before feature publication, no successful prefix |

Additional tests must enumerate small positive rational coefficient maps against
an independently written exact oracle, verify permutation/proportionality/repeated
term properties and L1 boundaries, distinguish unknown from known-zero components,
check immutable original records and no denominator reduction, and exercise
resource boundaries before expensive conversion. Output identities must bind
axis order, processing order, grammar/version, caps, source, rows and linked
receipts. No test needs experimental formulas or target values.

## Implemented synthetic API boundary

The scratch implementation separates two files:

- `src/lupine_discovery/representation.py`: immutable `NormalizedVector`,
  `normalize_coefficients(axes, coefficients, max_bits=1024)` and
  `l1_distance(left, right, max_bits=1024)`. Generic coefficient inputs are exact
  `int` or `Fraction`, with explicit `None` rejected as `UNKNOWN_COEFFICIENT`.
  Floats, booleans and string quantities are input errors. A complete sparse
  declaration is required: absence is known zero only under that caller contract.
  Axes must be explicit, unique and identical for distance comparisons.
- `scripts/mpea_features.py`: `parse_formula_coefficients`, `encode_processing`,
  immutable `FixtureRow`/`FeatureRow`/`FeatureTable`, `build_fixture_features` and
  `aggregate_readiness`. There is no CLI, source-file reader, production toggle
  or writer. The fixture builder requires a caller-declared synthetic SHA,
  rejects the known experimental source SHA, checks every `<SHA>:<ordinal>` ID,
  and verifies first-seen opaque formula-group agreement with the tokens.

The generic helper checks existing integer/Fraction sizes before conversion and
preflights bounded arithmetic intermediates. A caller may lower its bit cap from
1024; resource exhaustion returns no vector/distance by raising `RESOURCE_LIMIT`.
This limits arithmetic precision, not total wall time, caller allocation or
unbounded vocabulary size. Ordered axes control deterministic operation order;
coefficient-map insertion order has no effect. A resource failure does not imply
that the mathematical normalization is undefined.

The fixture adapter distinguishes unknown grammar from numeric limits. Every
valid fixture row survives either, with its complete composition vector null.
Malformed row/source/group linkage raises a closed input error. A field exceeding
the frozen framing cap cannot be a valid framed fixture row and blocks the fixture
builder; the standalone parser reports its `FIELD_LIMIT` without a vector.
Known processing categories and unresolved metadata have explicit indicators.

The local table digest is derived during validated construction and cannot be
supplied as a constructor argument. It binds derived exact vectors, row/group
identities, metadata states, axis order, profile and declared fixture identity.
It does not independently hash a nonexistent fixture artifact or attest physical
truth. Raw tokens are not retained in the derived table or its public aggregate;
the immutable input records remain caller-owned. The public aggregate includes
only overall status/reason/category counts, original row denominator, unknown
source count, descriptor version and a whole-table identity. It has no row IDs,
group lists, per-cell hashes, raw tokens, vectors, fits or eligibility claims.

Independent synthetic review is complete. The separately specified source reader
and all dependencies require publication and successful CI before any real feature
execution. Synthetic passes establish neither actual feature readiness nor a
registered scientific benchmark.
