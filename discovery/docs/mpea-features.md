# Exact declared-coefficient features

`scripts/mpea_features.py` is a synthetic-only adapter over the reusable
[exact normalization API](normalization.md). It has no source-file reader,
production switch, command-line entry or writer. A separately reviewed and
frozen custody reader is required before processing actual archived formulas.
No scientific feature artifact, target interpretation or fitted model is
established by this implementation.

For explicit positive decimal terms `(element, count)`, the adapter adds counts
for repeated elements and divides each element's total by the sum of all counts.
The 118 coordinates follow atomic-number order. Arithmetic uses integers and
`Fraction` throughout, with reduced exact rational outputs. The resulting unit
sum is a property of the declared coefficients, not proof of atomic percentages,
specimen composition or a useful chemical distance.

The separately documented [source-format evidence](mpea-formula-format-evidence.md)
describes rounded ratios divided by their maximum, with unresolved actual v9
producer lineage. Normalization cannot recover information lost by rounding.
For example, `Fe0.333 Ni1` yields Fe `333/1333`, which differs from `1/4` by
`1/5332`. An exact calculation does not make the archived coefficients physically
exact.

## Lexical and resource contract

The grammar matches the frozen G15C profile: valid element symbol, required
strictly positive plain-decimal count, exactly one ASCII space between terms.
It adds no exponent notation, implicit counts, concatenation, trimming, case
folding or spelling repair. Reserved missing tokens take precedence. Reordering,
decimal spelling, repeated-symbol addition and proportional scaling may create
equal descriptors while preserving different observation and lexical-group IDs.

| Boundary | Fixed profile |
|---|---|
| Terms per formula | 256 |
| Digits per count, including leading zeros | 128 |
| Fractional decimal places | 64 |
| Integer/rational arithmetic size | 1,024 bits |
| Framed formula field | 16,384 bytes |
| Fixture rows | 4,096 |

Every token, digit and scale check precedes the first numeric conversion. Counts
are lifted to a shared decimal scale, added by symbol and normalized exactly.
The limits bound this arithmetic profile; they do not establish wall-time bounds
for arbitrary Python callers. Known formula terms declare omitted coordinates
zero. An unknown formula is a null whole vector, never a zero or partial vector.

Lexical uncertainty gives `UNRESOLVED`; accepted lexical terms that exceed a
numeric profile give `UNRESOLVED_LIMIT`. Both preserve their original rows and
denominators. A numeric-limit row retains its original recognized lexical group.
Malformed row/source/group linkage blocks the entire fixture invocation. A
field beyond the framing cap cannot be a valid framed fixture row; the standalone
parser instead returns its explicit `FIELD_LIMIT` without a vector.

Processing metadata has six ordered indicators: `CAST`, `POWDER`, `WROUGHT`,
`ANNEAL`, `OTHER`, `UNRESOLVED`. The final indicator describes missing metadata,
not a sixth physical process. It is distinct from a known `OTHER` category.

## API and evidence boundaries

`parse_formula_coefficients(bytes)` returns a validated `FeatureResult`.
`build_fixture_features(rows, fixture_sha256=...)` consumes immutable
`FixtureRow` declarations and returns a validated `FeatureTable`. Every original
`<source-SHA>:<ordinal>` ID, row order and first-seen group identity is checked.
The fixture identity is a caller declaration for constructed data; the known
experimental archive SHA is rejected. It does not recompute an absent raw
artifact or offer a production bypass.

The table's seal is derived at construction and binds exact vectors, original
IDs/groups, processing states, axis order, profile and fixture identity. Callers
cannot supply a replacement digest. Manual result/table construction validates
the same invariants; rows in one lexical group cannot carry contradictory
feature states.

`aggregate_readiness(table)` emits only aggregate counts and the whole-table
identity. It emits no formula strings, per-row vectors, record/group IDs or
per-cell hashes. A future production feature table will remain local and ignored;
public reporting must separately justify its aggregate disclosure. Target opacity
alone does not authorize publishing composition vectors.

The adapter makes no predictions, exclusions, eligibility decisions, splits or
calibration claims. Equal vectors are descriptor collisions, not interchangeable
specimens or independent measurements. Source/descriptor overlap must be reported
without outcome-driven deduplication or split repair.

Seventeen author tests and 27 independently expressed tests exercise constructed
known answers, 624 generic coefficient maps, 125 independent decimal-oracle cases,
unknown states, manual constructors, late conversion failures and the 4,096-row
boundary. The main-path rerun passes all 44. These tests provide arithmetic and
software evidence; the five separately compiled statements in the generic guide
do not formally refine this Python adapter or validate physical interpretation.
