# MPEA metadata custody preparation

Date: **2026-10-10**. Status: **header-only custodian implemented and
synthetic-tested; source checkpoint and first GET pending**. No CSV acquisition
has occurred. This document and
[the source inventory](../reports/mpea-source-inventory.json) specify a bounded,
independently reviewed custodian. They do not register an evaluation protocol or
select targets, thresholds, a ranker, features, candidate eligibility or splits.

The implemented deliverable is a synthetic-tested **header-only custodian**.
The complete CSV schema is not established by the documentation read so far.
Its first real run, after review and a committed source checkpoint, must stop
with **`BLOCKED_SCHEMA`**, preserving a header-only receipt.
A separately committed schema amendment is required before row metadata can be
extracted. No scientific criteria may be chosen from that acquisition.

## 1. Fixed source and actual evidence

The only proposed data object is Figshare article **12642953**, version **9**,
DOI [10.6084/m9.figshare.12642953.v9](https://doi.org/10.6084/m9.figshare.12642953.v9),
file **25797305**, named `MPEA_dataset.csv`. The [version-specific API
response](https://api.figshare.com/v2/articles/12642953/versions/9) declares:

- Size: **332,126 bytes**.
- Supplied MD5 and repository-computed MD5:
  **`6d29eb6018157b863ca0033ccec936d5`**.
- Dataset license: **CC BY 4.0**.
- Publication: **2020-12-16T20:05:06Z**.
- Download route: `https://ndownloader.figshare.com/files/25797305`.

The retrieved API response is 4,714 bytes with SHA-256
`ffe30394f616e654b0f09f237270f633687120d727812458cf9579f2bbadbf42`.
The source inventory records these declarations and the documentation hashes.
The CSV's actual SHA-256, header, row count and contents remain **unknown**.
The MD5 is a legacy metadata-integrity check, not proof of cryptographic
publisher authentication. A custodian must capture a whole-file SHA-256 of the
same bytes it verifies and caches, together with the HTTPS route and source
version. Neither hash establishes scientific accuracy.

A metadata-only **HEAD** request to the declared download route returned 302,
with a redirect to HTTPS host `s3-eu-west-1.amazonaws.com`, exact path
`/pfigshare-u-files/25797305/MPEA_dataset.csv`. Its query was present but was not
recorded or displayed; no response body was read, and the terminal location was
not requested. A future downloader may allow at most one redirect to that exact
scheme/host/path, carrying its opaque query without logging it. Any other route
must block. This observed HEAD behavior does not prove a future GET succeeds.

Scientific provenance comes from [Borg et al., Scientific Data 7, 430
(2020)](https://doi.org/10.1038/s41597-020-00768-9). It is a compilation of
experimental studies, not a single controlled campaign. The paper reports
1,545 records, 630 compositions and 265 source articles, with records defined by
composition/property/temperature/reference combinations. Those are documented
counts, not independently verified counts of v9 or jointly usable tests. The
high-temperature paired subset size is unknown. Earlier reviews and 2019
literature extraction were combined; extreme values were investigated and
inaccurate or unverifiable values corrected or removed upstream.

Pinned GitHub evidence is commit
`d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e` of
`CitrineInformatics/MPEA_dataset`. The README, LICENSE, tree metadata and
metadata-relevant Python source were inspected, not executed. Neither notebooks
nor any CSV, spreadsheet, figure or output array was downloaded. Source-code
AST inspection found only three corroborating `PROPERTY:` label strings, below.
The GitHub master CSV's equality to Figshare v9 is not established; it cannot
serve as a silent replacement. The article is CC BY 4.0, its associated article
metadata CC0, and repository LICENSE text Apache-2.0. Dataset reuse should cite
the specific Figshare version and the compilation/primary provenance, preserving
attribution and any third-party exceptions rather than substituting a code
license. No data are redistributed here.

## 2. Schema evidence and explicit unknowns

The paper documents the following **semantic labels**. Except for the quoted
code strings, these are not assertions about exact CSV header spelling.

| Documented field | Meaning/unit | Initial public custody treatment |
|---|---|---|
| Alloy composition | Normalized/alphabetized nominal composition, atomic percent | Opaque declared-formula equality group only; no composition numbers/features |
| Microstructure | Experimentally observed phases | Withhold values; it is a measured descriptor, not automatically a permitted input |
| Processing method | Coarse CAST/POWDER/WROUGHT/ANNEAL/OTHER classes | Exact class token only if an approved source field already contains it |
| Grain size | Average measured grain size, μm | Withhold |
| Exp. Density | Measured density, g/cm³ | Withhold; distinguish from calculated field |
| Calculated Density | Rule-of-mixtures estimate, g/cm³ | Withhold; never relabel as measured |
| Type of test | T = tension, C = compression | Exact closed token, else missing/unknown |
| Test temperature | Declared test temperature, °C | Bounded exact decimal condition; no temperature eligibility threshold |
| YS | Measured yield strength, MPa | Withhold |
| UTS | Ultimate tensile strength, or maximum compression strength, MPa | Withhold; meanings depend on test mode |
| HV | Vickers hardness | Withhold |
| Elongation | Tensile elongation at failure, or maximum reported compression strain, % | Withhold; maximum compression strain need not be failure |
| Elongation plastic | Plastic elongation or plastic compression strain, % | Withhold as a separate quantity |
| Exp. Young's modulus | Measured modulus, GPa | Withhold |
| Calculated Young's modulus | Rule-of-mixtures estimate for single-phase solid solutions, GPa | Withhold; never relabel as measured |
| O, N, C content | Measured interstitial contents, wppm | Withhold; not automatically permitted features |
| Source DOI | Original experimental publication | Opaque private-normalized DOI equality group; no raw DOI/citation text |

The pinned `utils.py` and `tests/test_process.py` contain the literal strings
`PROPERTY: Type of phases`, `PROPERTY: Type of test`, and
`PROPERTY: Elongation (%)`. The paper's example table headers are `DOI`,
`FORMULA`, `YS (MPa)`, `UTS (MPa)`, and `Elongation (%)`. These are the complete
initial **recognized header-token allowlist**, totaling eight exact strings.
Recognition reports only a token's identity and position; it does not validate
the full schema, column mapping or units. In particular, a paper table header is
not proof that the v9 CSV uses that spelling.

Still unknown: complete header, header order, extra/index columns, file encoding,
dialect, missing-value spellings, row width/count, raw processing vocabulary,
reference representation and formula representation. No position-based mapping,
case-insensitive header matching, guessed `PROPERTY:` prefix, unit inference,
automatic dialect sniffing or mapping borrowed from a different version is
permitted. Even if every observed header is recognized, this preparatory version
cannot promote itself to a complete schema. The published upstream helper that
negates compression elongation explicitly says it is for visualization; the
custodian must not execute it or introduce such a target transformation.

## 3. Header-only implementation contract before acquisition

The tool must first be implemented and independently tested against synthetic
CSV fixtures; its source, tests, this plan and inventory must be committed
before any real GET. A command must explicitly select acquisition; imports,
tests and report viewing must not fetch data. No GET occurred during this
preparation. Existing project authorization covers ordinary execution after the
reviewed source checkpoint; this is an implementation/provenance prerequisite,
not a requirement to ask Alex for permission again. The immutable inventory's
"not authorized by this document" field describes this document's limited scope,
not an additional user-approval gate.

The public production path accepts exactly the fixed inventory object and route.
Synthetic tests use a separate injected local fixture path, with no way to
substitute arbitrary metadata/files through the production CLI. A changed
version, file ID, filename, declared size/MD5 or license is a source conflict,
not a reason to find a mirror or use a newer version. API transport metadata may
evolve, so preserve its exact bytes/hash and compare the reviewed identity fields
explicitly; do not silently rewrite the source inventory.

Capture at most **332,127 bytes** (expected size plus one), with a **30-second**
network timeout and the single redirect rule above. Require exactly 332,126
bytes and the declared MD5 before caching. Compute SHA-256 over that same
captured buffer. Raw bytes belong only under ignored `.cache/mpea-custody/`,
with non-overwriting writes and symlink/path-escape rejection. Existing
conflicting bytes remain an explicit failure. Reverify captured cache bytes
before use; hash and parse the same buffer. Do not log response bodies, query
strings, exception excerpts or arbitrary OS/parser text.

The first release parses **one logical CSV header record only**, using a bounded
byte scan to locate its end before UTF-8 decoding; it must not decode the whole
file or iterate data rows. Track quoted fields and doubled quotes so embedded
newlines cannot be mistaken for record boundaries. Proposed mechanical profile:
UTF-8, optional leading UTF-8 BOM recorded explicitly, comma delimiter,
double-quote quoting/doubling, LF or CRLF record endings; no dialect sniffing.
This is a proposed parser profile, not a claim about unseen source bytes.
Malformed or unterminated headers stop under a constant failure code.

Limits: 128 columns, 256 characters per header token, 65,536 header-record
characters, and a byte-scan cap of 262,147 bytes after the optional leading BOM;
limits must be enforced during scanning/conversion, without silent
truncation. Duplicate/empty header tokens fail. An unknown token is represented
only by its zero-based position and the constant `UNKNOWN_COLUMN`; its spelling,
length, content hash and fragment must not leave custody. Known tokens may be
reported with their exact allowlisted spelling and position. Whole-file hashes
are permitted; per-token/row hashes are not substitutes for redaction.

The receipt must bind source inventory/plan and implementation/test hashes,
requested route, source version/file ID, observed whole-byte identities, parser
profile and limits, header-only actions, recognized/unknown positions, and
**`BLOCKED_SCHEMA`**. On header-format or source failure, record the corresponding
constant blocked status. It must state `dataset_bytes_acquired` accurately,
`header_decode_attempted` accurately (the bounded header-inspection operation was
attempted; framing can reject the header before UTF-8 decoding is reached),
`data_rows_decoded=false`,
`row_metadata_extracted=false`, `scientific_eligibility_decisions=false`,
`fits=0`, `splits=0`; row count and numeric completeness remain null/unexamined.
Acquiring/hash-checking target-bearing bytes is exposure, even when data rows
are not decoded. Do not claim that the entire dataset remained unread.

Preserve the blocked receipt. A later schema amendment must cite actual evidence
for the complete mapping/dialect and be frozen before any row metadata is
extracted. Unknown header strings cannot be printed under a debug option. If
the approved redacted artifact cannot establish the missing mapping, that is an
explicit unresolved dependency, not authority to inspect row values or guess.

## 4. Future row-metadata stage, conditional on a frozen schema amendment

The following is the intended contract for a later implementation stage; the
header-only release cannot execute it. All schema/profile changes must preserve
the initial blocked attempt rather than make it disappear.

Use strict CSV framing and exact approved header/width checks. Proposed bounds
are 16,384 logical records, 128 columns, 16,384 characters per field and 65,536
characters per logical record. These engineering ceilings are deliberately
separate from the paper's unverified counts. No limit can trigger a truncated
"complete" report. NULs, invalid encoding, malformed quoting or exhausted
resources produce explicit incomplete/blocked receipts without source excerpts.
If framing fails, the unparsed remainder and full logical-record count are
unknown; do not fabricate rows. Parseable blank logical records and width errors
retain their original ordinals and constant error status; do not skip them or
shift subsequent IDs. A trailing record terminator alone is not an extra record.

Each parseable data record gets `record_ordinal` from its original logical order
(zero-based after the header). This is an archival identity, not a physical
specimen identifier. Preserve every record; no label-value, numeric-validity,
target-completeness, temperature, material-family or model-error filtering.

First construct metadata equality groups over **all** records, before a separate
structural cell-presence pass. Publish only deterministic first-occurrence
ordinals such as `source-000000` and `formula-000000`:

- A private DOI normalizer may strip a reviewed `https://doi.org/` prefix,
  strip surrounding ASCII whitespace and lowercase the ASCII DOI token, with
  a bounded DOI syntax check. Missing/unrecognized references have null group
  IDs and explicit statuses, not a single invented common-source group. No
  external DOI lookup, citation text, URL suffix or per-field hash is emitted.
- A formula group means equality of the exact declared, nonempty formula string
  in the approved field. It is not chemical equivalence across spelling,
  processing states or phases. No upstream Pymatgen call, stoichiometric feature
  construction or inferred density/modulus is allowed. Missing strings have
  null group IDs. Raw formulas and coefficients stay private in this stage.
- Equality groups are neither splits nor independent experimental units.
  Shared composition and shared source may overlap; no connected-component
  partition, material eligibility or statistical independence is asserted.

Allowed public row conditions are the exact `T`/`C` test token, an exact
documented processing-class token **already present** in its approved field,
and the declared test temperature in °C. Never infer processing class by
running upstream substring classifiers or use a phase measurement as a feature.
Unknown tokens stay unknown and are not echoed. For temperature only, use a
finite exact decimal grammar, at most 64 lexical characters and 256-bit
numerator/denominator; no binary float, exponent notation, range midpoint or
unit inference. Preserve unparseable/missing conditions as explicit unknown;
these do not remove records. No scientific temperature cutoff is selected.

All performance fields, measured descriptors and ROM fields remain inert text
inside custody. Do not parse their numeric values or expose range/uncertainty,
finite-value status, extrema, moments, outlier labels, error messages, cell
lengths or hashes. Optional structural statuses may distinguish exactly empty,
ASCII-whitespace-only and nonempty cells. Nonempty `NaN`, a range, a malformed
number and a finite number all have the same nonempty status: none is promoted
to a valid measurement. Missing-value token semantics remain unassigned until
the schema amendment documents them. No record is removed because of these
statuses, and no paired-complete candidate count is a scientific pass.

The redacted receipt must retain explicit limits: no verified specimen pairing,
no inferred atmosphere/strain rate/heat treatment, no numeric target validity
check, no feature authorization, no fit/split/threshold/eligibility decision,
no physical field or discrepancy bound, and no scientific performance verdict.

## 5. Joint-measurement and future evaluation risks

Composition/reference/temperature equality is not proof of a common specimen.
The publication's record definition does not establish that yield strength,
elongation, modulus and density all came from one test or processing state.
References may be repeated across compilations, or one paper may report several
series. Unknown test atmosphere, strain rate, specimen geometry, thermal history
and actual experimental date cannot be filled from a generic alloy name.
Publication date is not necessarily measurement date.

Tensile elongation at failure differs from maximum compression strain; UTS also
changes meaning across loading modes. Experimental and rule-of-mixtures fields
must stay separate. A calculated density/modulus and a measured strength are not
two independent experimental confirmations. Grain size, interstitial content
and observed phases may be measured after processing or testing; none is granted
prediction-time availability by its presence in the archive.

A future protocol would have to define these scopes, source/duplicate grouping,
feature permissions, unresolved records, paired quantities and evaluation
denominators before outcome access. No such protocol is selected here, and the
header-only receipt cannot justify a positive result or a common-field premise.

## 6. Independent synthetic checks required before real acquisition

The custodian must pass focused tests without any real data request:

1. Exact source version/file/size/MD5 enforcement; overlong/short response,
   changed metadata, wrong blob and changed HTTPS route reject before parsing.
2. One permitted redirect, rejected second/foreign redirects, timeout and
   sanitized network/parser failures; query/body canaries never appear publicly.
3. Cache capture/hash/parse use the same bytes; conflicting existing files,
   symlink escapes and output overwrite attempts fail visibly.
4. Header-only execution proves no data-row decode/iteration occurs. Put hostile
   non-UTF-8 and canary text after a valid header to detect a whole-file decoder.
   Quoted commas/newlines/doubled quotes, BOM, duplicate/empty headers and all
   resource limits exercise the actual scanner.
5. Unknown headers reveal only position and constant status; even an all-known
   header remains `BLOCKED_SCHEMA` without an approved complete schema. Resealing
   a receipt cannot change that fixed stage or its action flags.
6. Future-stage tests preserve row ordinals/errors and all records, keep unknown
   source groups null, and assign group ordinals independently of target cells.
   Changing nonempty target values, signs, NaN/range text or ROM outputs must
   leave allowed row metadata unchanged except the whole-artifact seal.
7. Future-stage tests separate tensile/compression quantities, measured/ROM
   fields, and structural presence/numeric validity; no outlier or completeness
   filtering, raw-field hashes, arbitrary labels or source-text exceptions leak.

Synthetic fixtures may have their own declared identities, clearly outside the
production CLI's pinned source. The implemented header-only stage passed 35
synthetic tests (13 producer tests and 22 independent review tests) before tracked
promotion. Repository integration checks and their source-bound receipts remain
separate release evidence. Items 6 and 7 describe future row-metadata work; that
stage is neither implemented nor validated by these 35 tests. No real-source
schema or scientific applicability follows from synthetic test success.

## Exposure record for this preparation

The preceding [source audit](operating-condition-source-audit.md) records the
published numerical results incidentally seen in articles. This preparation
reread versioned metadata and paper **header labels**, inspected Git tree paths
and source-code metadata labels/helpers, and issued one body-free HEAD request.
Python source was parsed as AST and never imported or executed. No notebook
outputs, CSV rows, target arrays or original experimental data files were opened.
