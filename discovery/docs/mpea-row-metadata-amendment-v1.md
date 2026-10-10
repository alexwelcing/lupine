# MPEA v9 amendment B: target-opaque observation metadata

Status: durable pre-execution specification for the reviewed implementation,
with synthetic checks only. Production execution requires the exact reviewed
files to be committed and successful CI before the first row scan. Root owns
that checkpoint and execution. Existing task authorization covers this work; no
new user permission is required. No experimental observation rows were read by
this implementation during development.

This amendment changes the prior header-only boundary explicitly. On a verified
source, it permits byte framing of every observation record and processing only
five metadata cells. It does not authorize target decoding, target presence or
missingness statistics, target validity checks, eligibility, features, splits,
models, fits, performance thresholds, or scientific promotion. The complete
scientific schema remains unresolved after successful metadata extraction.

## Frozen evidence and source

The previously disclosed 23-column header and semantic role mapping are committed
at `d169b1070eaec916ebf9af221aa4596dd4b2cb1d`. The mapping JSON is
`docs/mpea-column-mapping-v1.json`, SHA256
`812255e53cceec8c66bd2a4b11d5d1e556941a053c888a7970cf2e3ec6728f97`.
The header receipt is `reports/mpea-header-labels-v1.json`, SHA256
`70f50fa99db6b39b769be392ec1c64c655f8f32d7587f04f522e6a794c4accee`.
The accompanying Markdown mapping supplies the documented meanings and physical
cautions. They remain unchanged.

The exact source is Figshare article 12642953 version 9, file 25797305,
`MPEA_dataset.csv`, DOI `10.6084/m9.figshare.12642953.v9`, CC BY 4.0. It has exactly
332126 bytes, legacy declared MD5 `6d29eb6018157b863ca0033ccec936d5`, and captured
whole-artifact SHA256
`c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d`.
Hashes identify captured bytes, not physical validity, independence, publisher
cryptographic authentication, or target completeness.

The wrapper's literal `PRIOR_PINS` binds the original five G15 source/test/plan/
inventory files, four G15A source/test/amendment files, original acquisition and
redacted-header receipts, both completed stage reproduction receipts, disclosed
header receipt, and mapping JSON and Markdown. These exact paths must still match
both the mapping commit and the new committed tree. The mapping commit must be an
ancestor of the execution commit. New frozen paths are:

- `scripts/mpea_row_metadata.py`
- `scripts/mpea_row_scanner.py`
- `tests/test_mpea_row_metadata.py`
- `tests/test_mpea_row_metadata_review.py`
- `docs/mpea-row-metadata-amendment-v1.md`

Missing, dirty, symlinked or mismatched frozen files fail before the fixed cache
is opened. The scanner is the byte-identical reviewed prototype source, SHA256
`8aec58a1a48c173a0750137daf320d22abe04398108a74567c28ed7f2a093775`.
Its original 18 author tests and 14 independent tests, including 63 opaque-cell
substitutions, are preserved in ignored scratch engineering receipts. Those are
synthetic engineering evidence, not a production execution or physical proof.
The wrapper checks captured scanner bytes before executing those same bytes and
checks its explicit limits. The unused synthetic API in that module remains
synthetic; the wrapper calls its byte-framing and exact temperature helpers.

## Cache and invocation boundary

Only the production `extract_cache()` entry point may use the fixed experimental
cache path
`.cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv`.
It accepts no arbitrary cache argument. Order: committed-source gate; verified
public mapping/header; verified scanner source; one cache read; size/MD5/SHA
verification; one complete byte-framing pass; metadata processing; closed report
validation; immutable public write. It reads at most 332127 bytes to detect an
oversized file. Only exactly 332126 bytes with both expected digests reach the
framer. Hashing and framing use the same captured immutable `bytes` object.
Non-regular files and symlinked paths or ancestors are rejected.

The wrapper and scanner provide no network acquisition entry point. No URL is
fetched. No upstream notebook, CSV text reader or floating-point parser is used.
The public fixture API has a separate synthetic identity, rejects the known real
source SHA in either expected or observed identity before importing the scanner,
and exposes no boolean or other switch to enable production. This protects the
known frozen artifact; it is not a classifier for arbitrary real-world datasets.
CI success remains an external execution prerequisite recorded by root, not an
assertion the local committed-source check can derive by itself.

CLI after that checkpoint:

```
python scripts/mpea_row_metadata.py --output <new-receipt-path>
```

A metadata-success invocation still exits 2 to preserve the unresolved scientific
schema status. The CLI prints only status, fixed reason and receipt hash. Other
exceptions produce sanitized constant error codes, without source paths, raw
cells, error excerpts or partial row arrays.

## Explicit framing profile and all-or-nothing behavior

The scanner handles bytes, not decoded CSV text. There are exactly 23 columns in
the verified header and every observation row. It permits an optional initial
UTF-8 BOM, LF or CRLF record endings, a final closed record without a terminator,
quoted commas/newlines and doubled quote escapes. Bare outside CR, quotes inside
unquoted fields, characters after a closing quote, and unterminated quotes fail.
A final record terminator adds no observation; a second terminator creates an
empty one-field row and therefore fails the 23-column width requirement. A final
comma creates an empty final field. The header must match all 23 exact disclosed
UTF-8 tokens in order. Accepting a declared dialect variation is an engineering
rule; whole-artifact source identity remains fixed.

The maximum is 4096 observation rows. A raw field is at most 16384 bytes; a raw
logical record is at most 65536 bytes. Field caps count lexical quotes and doubled
quote escapes. Record caps count separators, quotes and embedded line endings,
but exclude the outer record terminator and optional initial BOM. The whole
source cap bounds total scanned cells. These are byte caps, not character caps:
opaque targets cannot be character-counted without decoding them. They are
explicitly tighter/new rules than the earlier prospective 16384-row/character
caps. No previously published implemented limit is silently reinterpreted.

Malformed framing, any width error (including a parseable blank row), late cap
failure, or header mismatch blocks the entire metadata extraction. This explicitly
replaces the original prospective idea of preserving width-error rows with a
status. There is no partial-success prefix, row count, filtered subset, or
per-row failure position in a blocked report. All syntactically valid observation
rows survive metadata unknowns, including rows whose five allowed cells are all
unresolved. No target value or metadata completeness determines row retention.

The framer retains header bytes and only the five allowlisted cell byte strings.
Withheld cell contents are scanned for delimiters, escapes, and engineering caps
but never accumulated into cell values, decoded to Unicode, passed to a CSV text
decoder, or numerically interpreted. NUL and invalid UTF-8 bytes are permitted in
opaque cells when the framing/caps are valid. Target substitution invariance is
conditional on valid framing and fixed engineering caps; malformed target bytes
can block the whole file through framing. No target missingness, structural
presence, numeric validity, ranges or per-target counts are produced.

## The five permitted metadata roles

Positions are zero-based and fixed from the committed mapping:

| Position | Role | Public representation |
| --- | --- | --- |
| 1 | nominal formula token | opaque ordinal exact-token group or unresolved |
| 3 | processing token | exact CAST/POWDER/WROUGHT/ANNEAL/OTHER or unresolved |
| 9 | test mode | exact T/C or unresolved; tension and compression stay distinct |
| 10 | mechanical-test temperature | exact lexical decimal and rational in degC or unresolved |
| 20 | declared DOI token | opaque ordinal exact-token group or unresolved |

All other positions are withheld, including reference ID, reference year/title,
phases, measured endpoints, measured impurity content and calculated ROM values.
No raw formula or DOI, normalized formula/DOI, free text, token lengths, per-cell
hashes, composition descriptors or extracted element/count lists are public.

For every allowed role, these literal tokens and ASCII-whitespace-only tokens
have precedence and return `UNRESOLVED` with null value: empty, `NaN`, `nan`,
`NAN`, `NA`, `N/A`, `NR`, `None`, `null`, `-`. ASCII whitespace is space, tab,
CR, LF, vertical tab and form feed. This is a prospective reserved-token policy;
it does not assert that any token actually occurs or semantically denotes a
missing value. No trimming, Unicode normalization or case folding is performed.
Other unrecognized tokens also produce unresolved values and never drop a row.
In particular `NaN` is reserved even though a permissive symbol parser could read
it as Na+N. Unknown tokens are never merged into a shared identity group.

Formula recognition is solely a deterministic byte grammar: one or more valid
IUPAC element symbols, each optionally followed by `[0-9]+(?:\.[0-9]+)?` containing
at least one nonzero digit. There is no numeric count conversion, normalization,
composition feature calculation, parentheses, spaces, signs or exponents.
Single-element and repeated-symbol forms are permitted lexical tokens; syntax
does not establish an MPEA, a valid specimen, stoichiometry or chemical equivalence.
Thus `FeNi` and `NiFe`, or `Fe1Ni` and `FeNi`, remain distinct exact-token groups.
All 118 modern element symbols are explicitly listed in the source.

DOI recognition permits `10.` followed by 4–9 ASCII digits, `/`, and one or more
printable non-whitespace ASCII suffix bytes (0x21–0x7e). An optional exact prefix
is `http://doi.org/`, `https://doi.org/`, `http://dx.doi.org/`, or
`https://dx.doi.org/`. No resolver is called, percent escapes are not decoded,
and lexical acceptance does not establish a registered DOI. Different prefixes,
case or spellings remain different groups. No study/specimen matching or
statistical independence is inferred from equal or unequal source tokens.

Each identity role uses a separate private dictionary keyed by the complete exact
observed token bytes after CSV unescaping. Accepted groups receive consecutive
integers starting at zero in first-observation order. These equality groups are
assigned across all framed records before processing/test-mode/temperature
completeness checks. There is no group for unresolved tokens.

Temperature accepts at most 64 ASCII characters with the exact grammar
`[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)`. Exponents, units in cells, ranges,
uncertainty text, whitespace or invalid UTF-8 remain unresolved. Finite accepted
values are converted exactly to a reduced `Fraction` and bounded to 256 bits for
numerator magnitude and denominator. The report preserves the original lexical
decimal plus exact numerator/denominator strings and `degC`, without rounding.
Length/bit failures are `UNRESOLVED_LIMIT`; no temperature cutoffs are applied.
This is declared test temperature, not plant service conditions or thermal history.

## Closed public output and interpretation

Success is `METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED`, with all observation rows
in original order. Each row includes a zero-based ordinal and
`<whole-source-SHA256>:<ordinal>` identifier, plus exactly the five metadata roles.
These source-bound ordinal IDs are not hashes of cell contents. The report
contains source identity, literal mapping/header identity, committed source/test/
plan hashes, fixed profile and fixed scientific limitations. Whole-artifact hashes
and these source-bound prefixes can change when opaque cells change; the metadata
must otherwise remain invariant under valid target substitutions.

The scope distinguishes attempted observation byte framing, completed framing of
all rows, and actual processing of allowed metadata. A failed framing attempt may
have scanned some bytes; the report does not reveal the failed position or prefix.
`captured_source_bytes_read` reports captured artifact access, not target decoding.
No target cell is text or numerically decoded, and no target missingness or presence
flag is exposed. Successful metadata processing does not change those limits.

A closed, type-sensitive validator rejects additional fields, raw text channels,
boolean/integer substitutions, invalid categories, nonconsecutive group IDs,
altered scope flags, wrong record identities, inconsistent exact temperature
representations and resealed contradictory success/failure states. The content
seal is an identity/integrity check, not a signature or independent verification
of raw-row truth. Public JSON is ASCII escaped. Publication validates first and
uses a complete temporary file plus atomic no-overwrite link; existing identical
reports are idempotent and conflicting files or symlinks are rejected. No partial
public report is left on a failed publication.

The previously frozen science, source audits, protocols, benchmark failures and
results are unchanged. Any later target interpretation, endpoint pairing,
eligibility, group split, model or evaluation criterion needs its own explicit
scope and precommitted specification. This amendment establishes neither valid
paired experimental truth nor predictive superiority.
