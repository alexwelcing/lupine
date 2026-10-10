# MPEA v9 amendment C: supplemental formula-token grammar

Status: prospective formula-only supplemental implementation. Development and
tests use constructed byte fixtures. Production requires reviewed source/tests/
this amendment and the cited public evidence to be committed and successful CI
before the first invocation on the fixed experimental cache. Root records that
checkpoint and execution; local source checks cannot establish remote CI success.
No real formula cells or targets were read during implementation.

This amendment is informed by an already exposed **metadata** outcome: frozen
G15B preserved 1,545 rows and recognized zero formula tokens. It is therefore a
post-metadata grammar amendment, not a specification chosen before all data
exposure. The original zero-recognition result remains published and unchanged.
No target, feature, eligibility, model, split or performance criterion is selected
here. The full scientific schema remains unresolved after any lexical success.

## Evidence and immutable baseline

The original G15B producer is frozen at commit
`ec32247f404d7d2b0a916ff7012bded2accb48c8`:

- `scripts/mpea_row_metadata.py`: SHA256
  `d50ce1cf06761cd080ca0fcc6516c07ef71e0a4106bba73660642c846915e33b`.
- `scripts/mpea_row_scanner.py`: SHA256
  `8aec58a1a48c173a0750137daf320d22abe04398108a74567c28ed7f2a093775`.
- `reports/mpea-row-metadata-v1.json`: SHA256
  `36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55`.
- `reports/mpea-row-metadata-reproduction-v1.json`: SHA256
  `f01271d82a27fe114c443009d919ffa232e5fc32d8176dcd4c1b8c01870cd793`.

The [format evidence](mpea-formula-format-evidence.md), SHA256
`04e5645cc3dbbd1b1d1b3b5d0fdef72ae050cd097646746e1d185f27659eb056`,
and its [retrieval receipt](../reports/mpea-formula-format-evidence-v1.json),
SHA256 `e67256aa7cef2f5b8ecb101defefb448cde0c8d30787bac41bb45c1564c4757f`,
document one producer's ASCII-space joining of explicit element/count terms.
That producer computes rounded ratios to the largest atomic fraction. Those
coefficients are not inherently percentages summing to 100. This amendment does
not convert them or establish that the actual Figshare v9 file used that producer.
The original paper-based column mapping remains unchanged.

Every production invocation binds those public references, all 21 frozen G15B
implementation/reference files, and these new paths to the current committed
tree; the old implementation file hashes must equal the pinned original receipt:

- `scripts/mpea_formula_tokens.py`
- `tests/test_mpea_formula_tokens.py`
- `tests/test_mpea_formula_tokens_review.py`
- `docs/mpea-formula-amendment-v1.md`

The old producer commit must be an ancestor. Missing, dirty, symlinked or changed
bound paths block execution before cache access. No old producer, scanner, test,
mapping, receipt or policy is modified or monkeypatched by this implementation.
Hashes attest byte identity, not physical validity, signatures or independence.

## Formula-only processing boundary

The only production cache is the unchanged fixed Figshare v9 file
`.cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv`.
Source identity remains 332126 bytes, MD5
`6d29eb6018157b863ca0033ccec936d5`, SHA256
`c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d`.
There is no network acquisition or arbitrary source-path option. One bounded
read captures immutable bytes used for both whole-source checks and framing.

The original helper source is captured, hash checked and executed only to reuse
its source/reference checks and hash-checked scanner loader. Neither its old
metadata extraction entry point nor its metadata processing functions are called.
The scanner's `_frame` receives exactly one rule: formula at zero-based column 1.
All 22 other observation cells, including previously permitted metadata columns,
are scanned only for CSV framing and byte limits and remain `None` in framed
records. The public header is retained to verify its exact 23 tokens. No formula
token is text decoded, no count is numerically parsed, and no target cell is
accumulated, text decoded, numerically checked, or tested for presence/missingness.
Previously public G15B receipts are read only for their pinned provenance and
unchanged baseline; that is separate from processing original observation cells.

The original framing dialect and caps remain: 23 columns, at most 4,096 observation
rows, 16,384 raw bytes per field, 65,536 raw bytes per logical record, and the
332126-byte source cap. Optional BOM, LF/CRLF, quoting, doubled quotes and final
closed records follow the frozen scanner. Invalid framing, width, header or late
limit failure blocks the whole result without a prefix, row count or failure
position. Production additionally requires the unchanged original 1,545 rows.
Metadata unknowns never remove a row.

The synthetic entry point accepts only bytes and an explicit expected identity,
rejects the known experimental SHA in expected or observed identity before loading
helpers/scanner, and has no production toggle. This is protection for the known
artifact, not a classifier that recognizes every possible real dataset.

## Frozen supplemental lexical profile

Profile `mpea.formula_explicit_count_ascii_space.v1` recognizes one or more terms
separated by **exactly one ASCII space**. Each term is a modern valid IUPAC element
symbol from the explicit 118-symbol set immediately followed by a **required**
count matching `[0-9]+(?:\.[0-9]+)?`, with at least one digit from `1` through `9`.
Positive-count recognition is a digit test, without arithmetic or a composition
representation. Leading zero digits are permitted; zero-only counts are not.

Reserved whole tokens have precedence: empty, `NaN`, `nan`, `NAN`, `NA`, `N/A`,
`NR`, `None`, `null`, `-`, and ASCII-whitespace-only tokens remain unresolved.
There is no trimming, whitespace collapse, Unicode normalization, case folding,
repair, signs, exponent notation, parentheses, implicit unit counts, or fractional
syntax such as `.5` or `1.`. Non-ASCII bytes and unsupported tokens remain
unresolved. The legacy concatenated optional-count grammar is **not unioned**
with this one; G15B remains the independent historical record.

Single terms and repeated symbols are lexically permitted. Term order is not
validated as alphabetical. These are declared lexical acceptance choices, not
proof of producer execution, an MPEA, chemically valid stoichiometry, material
identity or specimen identity. For constructed examples, `Fe1 Ni1`, `Ni1 Fe1`,
and `Fe1.0 Ni1` form three different exact-token groups; none is canonicalized.
`FeNi` and `Fe1Ni1` remain unresolved under this supplemental profile.

Private equality keys are the complete exact formula bytes after CSV unescaping.
Accepted tokens receive consecutive ordinal group IDs from zero in first-row
order. Repeated exact tokens reuse a group. Unresolved tokens get no group and
are never combined into an identity. Equal/unequal tokens do not establish
equal/different physical compositions, specimens, papers or independent samples.

## Separate closed receipt and execution

The report schema is `lupine.discovery.mpea.formula_tokens.v1`. Success remains
`FORMULA_TOKENS_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED`; its reason is
`SCIENTIFIC_SCHEMA_UNRESOLVED`. Each preserved row has exactly:

```
{ordinal, record_id: "<whole-source-SHA256>:<ordinal>",
 formula: {status: "TOKEN_GROUP" | "UNRESOLVED", value: integer | null}}
```

These are the same source-bound ordinal IDs as G15B. The receipt binds original
source/mapping/header/producer/reference identities, new implementation and
profile, original zero-of-1545 baseline, and explicit scope flags. It exposes no
raw formulas, element lists, counts, normalized compositions, formula lengths,
per-token hashes, other metadata, raw source cells or target-presence indicators.
All scientific/physical/lineage/independence/feature flags remain false, and fits
and splits remain zero. Recognition counts may be derived from public statuses;
they measure only this grammar's metadata recognition, not scientific readiness.

Closed, type-sensitive validation rejects extra channels, altered fixed profiles,
scope promotion, boolean/integer substitutions, wrong row IDs, nonconsecutive
first-seen group IDs, and inconsistent resealed success/failure states. The digest
is canonical ASCII JSON plus a trailing newline. The seal verifies identity and
internal shape, not a fresh reconstruction of raw rows or scientific truth.
Writes are complete before atomic no-overwrite publication; temporary creation,
linking and cleanup use a captured directory descriptor to avoid following a
replaced output ancestor. Identical existing output is idempotent; conflicts and
symlinks fail without overwriting user files.

After the source/CI checkpoint, root may execute:

```
python scripts/mpea_formula_tokens.py --output <new-receipt-path>
```

The exit code stays 2, including on lexical success. Console output contains only
status, fixed reason and receipt hash; exceptions are sanitized without raw cells,
paths or partial row arrays. New production runs and their reproduction receipt
must be recorded separately. This amendment supplies no target schema, feature
permission, fitted model, benchmark registration or predictive advantage claim.
