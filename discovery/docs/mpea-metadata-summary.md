# Summarize the public MPEA metadata receipt

Status: durable specification for the reviewed metadata-count implementation.
The synthetic suite has passed, and the implementation has also summarized the
already published G15B receipt. This is receipt-level metadata evidence only;
the scientific schema remains unresolved. No target presence, target validity,
eligibility, threshold, split, fitting, specimen pairing, independent-study, or
physical-readiness decision is made.

The implementation is [`scripts/mpea_metadata_summary.py`](../scripts/mpea_metadata_summary.py).
The 18 synthetic checks are
[`tests/test_mpea_metadata_summary.py`](../tests/test_mpea_metadata_summary.py).
From `discovery/`, run:

```sh
python -m unittest discover -s tests -p 'test_mpea_metadata_summary.py' -v
python scripts/mpea_metadata_summary.py \
  --input reports/mpea-row-metadata-v1.json \
  --output .cache/mpea-metadata-summary/local-001.json
```

The input must be an existing public JSON receipt. This command does not acquire
or extract an experimental CSV. A completed count audit exits 0. A valid blocked
input produces an unavailable summary and exits 2. An invalid receipt produces
a sanitized error and no summary. A differing existing output is never
overwritten; an exact repeat is idempotent. Use a fresh output name for a changed
input or implementation. The tool needs standard-library Python and the local
pinned G15B validator source; it makes no network requests.

## Input, limits and identity

The input is captured once as bounded bytes from a regular `.json` file. Symlinks,
paths under `.cache/mpea-custody`, files exceeding 8 MiB, nesting beyond 32,
duplicate JSON keys, noninteger numeric JSON tokens, nonfinite constants,
integers outside the exact safe-integer range, and invalid UTF-8 are rejected.
The entire original receipt must pass the existing closed G15B validator before
any counts are produced. That validator enforces at most 4,096 rows, explicit
states and fixed enums, sequential original row identities, contiguous first-seen
lexical group IDs, and exact decimal temperature declarations with the original
64-character and 256-bit bounds. Output is also limited to 8 MiB. There is no
separate process time or memory sandbox claim.

The validator is executed from the same captured source bytes whose SHA256 must
match `d50ce1cf06761cd080ca0fcc6516c07ef71e0a4106bba73660642c846915e33b`.
Only its public report validator is called; its cache extractor is never called.
The summary records the input's exact file SHA256 and canonical content seal,
original source identity, mapping/header references, producer implementation and
scope, the summarizer's observed on-disk source SHA256, and the pinned validator
SHA256. The summary's own seal covers canonical sorted compact ASCII JSON with a
trailing newline, excluding only the `summary_sha256` field itself.

These seals identify declarations and code. They do not establish physical
truth, independence, or honest prior execution. The summarizer source hash is
explicitly scoped to bytes observed on disk at summary time; it does not attest
the interpreter's loaded code under concurrent source replacement. Engineering
receipts separately check source stability before and after test execution.
The output writer verifies its generated summary seal before atomic no-overwrite
publication; it is not a separate semantic validator for arbitrary
caller-constructed summary objects.

## Count semantics

- The denominator is every exported row, including repeated metadata and every
  unresolved field. A valid empty successful receipt has denominator 0. A
  blocked source or row scan has a **null** denominator and null counts.
- Each role has explicit zero-inclusive status counts. `UNRESOLVED` and
  `UNRESOLVED_LIMIT` remain distinct; neither means measured absence.
- Source and formula groups are the receipt's **opaque integer lexical-token
  group IDs**. Raw DOI/formula strings and individual-token hashes are not
  available and are not reconstructed. A group is not a canonical composition,
  an independent study, a deduplicated specimen, or an eligibility class. Group
  frequencies and group-size histograms preserve the original group identities.
- Processing and test-mode frequencies use exactly the validated enums. Unknown
  rows stay separate; there is no new interpretation or recoding.
- Temperature buckets use exact rational equality in declared `degC`, with
  separate frequencies for every public decimal spelling. `.5` and `0.50` share
  the numeric bucket `1/2`, while their spellings remain distinct. Equal test
  temperatures do not establish equal experimental conditions.
- Five-role combinations preserve every original status/value declaration,
  including the lexical temperature spelling. They do not establish paired
  target measurements or define a proposed train/test partition.

Role totals, group-size histograms, categories, numeric temperature counts and
five-role combinations are reconciled against the complete row denominator.
Failure stops publication rather than dropping rows. The producer's scope flags
and unresolved scientific status remain in the output.

## Executed evidence and the preserved negative result

The 18 synthetic tests use constructed 23-column inputs solely to obtain valid
public receipt fixtures through the existing fixture API. They check independent
hand-counted totals, duplicate metadata, unknown fields, distinct lexical
identities, exact temperatures and spellings, empty versus blocked inputs,
late scanner failure, forged/resealed claims, duplicate record IDs, strict JSON
and numeric limits, code pinning, captured-input replacement, symlink/path
rejection, alias isolation, determinism, and atomic publication failures.
The harness blocks network calls and the fixture producer's cache API. It never
opens the experimental source cache.

After those checks completed, the summarizer was run on the public receipt with
file SHA256 `36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55`.
All 1,545 rows remained in every denominator. The result preserves:

| Role | Counts |
| --- | --- |
| Formula | 1,545 unresolved; zero declared token groups |
| Source | 1,544 assigned rows in 264 lexical-token groups; one unresolved |
| Test mode | T: 358; C: 792; unresolved: 395 |
| Processing | CAST: 647; POWDER: 95; WROUGHT: 300; ANNEAL: 273; OTHER: 111; unresolved: 119 |
| Test temperature | 1,364 known; 181 unresolved; zero limit-unresolved; 64 exact rational values |
| Five-role combinations | 521 distinct declared metadata combinations across all 1,545 rows |

The formula result is an unresolved-metadata finding under the frozen G15B
grammar. This summarizer does not inspect source formulas, extend that grammar,
or turn other available metadata into scientific eligibility. Any later semantic
work requires its own explicit scope and access history.
