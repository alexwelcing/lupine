# Prospective BAM tensile-schema inspection contract

**Design only; no schema body acquired or reader implemented.** The smallest
justified first inspection is a closed header-role and CSV-structure inventory.
It may establish where already documented roles occur. It cannot yet establish
a complete field dictionary, actual paired measurements, independent evaluation
units or a discovery benchmark. This is a possible small metrology/semantic
reference route; the scientific release decision remains unchanged.

## Evidence and fixed prospective source

This design reads only the published
[readiness report](../../reports/phase2-bam-readiness-v1/README.md), its retained
record metadata and independent review. [source-bindings.json](source-bindings.json)
records the exact public bytes used. It follows no content links.

The prospective source is version DOI `10.5281/zenodo.17846436`, version `1.0`,
published 2025-12-08, distinct from concept DOI `10.5281/zenodo.17846435`.
The retained schema record advertises:

- file `2025-12_Data-Schema-Tensile-HT_v1.0.csv`;
- file ID `5fc320ce-9ba9-4eb6-8ce0-665d0f8ffed5`;
- exactly 41,000 bytes and MD5 `330a8405f6cb9c4fcfe221baea7ced27`;
- content URL
  `https://zenodo.org/api/records/17846436/files/2025-12_Data-Schema-Tensile-HT_v1.0.csv/content`;
- record-declared CC BY 4.0, with linked-body notices still uninspected.

These are publisher metadata bindings, not a previously observed content hash.
A later bounded acquisition would record a new SHA-256 and match the advertised
size/checksum before inspection. MD5 is a consistency check, not an authentication
or scientific-validity proof. The related data record is
`10.5281/zenodo.17846617`; its workbook, LIS files, images and other bodies are
outside this contract. The XLSX alternative is also outside this contract.

## Honest exposure boundary

The schema prose explicitly combines result-field descriptions, exemplary
answers/options and comments. Their empirical origin is unknown. The filename
and role label do not make these cells target-free. A fully parsed CSV entails
machine acquisition of the whole body, decoding the whole text and constructing
all cell strings, including examples, defaults if present, and comments.
Withholding those strings from the public projection is a disclosure boundary,
not absence of machine exposure. This operation cannot certify that the source
or all its derivatives remain an untouched blind evaluation source.

The proposed parser would neither evaluate expressions/formulas nor open links,
load secondary files, render HTML, run spreadsheet software or infer data types
from values. Unknown text, arbitrary literals, example values, option lists,
defaults, free comments and parser exception text would not appear in stdout,
stderr, public receipts, hashes of individual cells or diagnostics. A whole-file
identity hash is allowed; low-entropy per-cell hashes are not a safe substitute
for withholding the cells. Do not print raw header text simply because it occurs
in a candidate header record: that position is not established in advance.

Exposure flags would separately record acquisition started/completed, whole-text
decode started/completed, full CSV parse started/completed for each attempted
fixed dialect, header comparison started/completed, and public projection
written. Failed/partial acquisition cannot be reported as zero acquisition.
Examples/comments may have been decoded even when role matching later fails.
No actual source operation or exposure of schema cells occurred in this design.

## Small first profile: known roles, not a complete dictionary

The publisher prose advertises eleven columns but explicitly names ten roles:
four category levels, entry, symbol, data type, examples/options, requirement and
comments. The following are **prospective recognition labels taken from that
prose**, not observed CSV headers or assumed column coordinates:

| Closed output role | Prose label to recognize |
| --- | --- |
| `category_1` through `category_4` | `Category I` through `Category IV` |
| `entry` | `Entry` |
| `symbol` | `Symbol` |
| `data_type` | `Data Type` |
| `examples_or_options` | `Exemplary Answer or Options Separated by Slash in Case of Data Type Drop-Down List` |
| `requirement` | `Requirement` |
| `comments` | `Comments` |

Before implementation, freeze these exact spellings and the narrowly specified
normalization, in this order: replace U+00A0 with ASCII space, then strip
leading/trailing ASCII space or tab, without case folding, fuzzy matching,
substring search or semantic guessing. Any further alias would need its own documentary basis and versioned
profile; an observed failure must not silently enlarge the set. In particular,
do not invent an eleventh `Units` role from the prose's separate mention of units.

The smallest complete output consists of fixed source identity, acquisition
SHA-256, closed status/reason, parsing/exposure flags, bounded CSV record/column
counts, and the ten fixed role labels mapped to a unique observed column ordinal
or null. Counts describe CSV structure, not fields' scientific meaning or numbers
of tests. A successful candidate layout requires each known label exactly once
in the first logical record, all records of one width, and width eleven. The
first-record rule is an acceptance rule, not an assertion about the unseen file;
no later-record search, preamble skipping or automatic header relocation occurs.

Even that successful layout publishes only `KNOWN_ROLES_PARTIAL`: one remaining
column's ordinal and whether its header is empty may be reported, but its text
and meaning remain withheld and unbound. There is no claim that the unexplained
column is harmless, a unit, a default or merely an export artifact. Known-role
matching is lexical evidence, not proof that those columns have the advertised
semantics throughout the file.

If width is ten, report `COLUMN_COUNT_DISAGREEMENT`; do not silently correct the
publisher's eleven. If width exceeds eleven, roles duplicate, any known role is
absent, or placement is ambiguous, report a fixed blocked reason with the role
mapping null. If the lone extra header is empty, that does not establish that
the whole column is empty or disposable. No body values, per-row type/count
histograms, arbitrary header strings, cell coordinates of failures, unit strings
or requirement codes are emitted in this first profile. There is no partial
semantic dictionary to promote after a parse/layout failure.

Consequently this contract can identify the discrepancy but cannot promise to
resolve the eleventh role while also refusing to disclose or interpret unknown
text. That limitation is intentional. The next semantic mapping would require
public source documentation naming the missing role, or a separately frozen,
explicitly exposure-bearing inspection limited to its header/definition. It is
not a reason to ask Alex for routine implementation permission.

## Bounded parsing and custody proposal

These are prospective engineering limits, not observed properties of the CSV:

- raw body exactly 41,000 bytes after successful identity verification; read at
  most 41,001 bytes to detect an overrun and stop;
- UTF-8 strict decode, optionally accepting one leading UTF-8 BOM; no encoding
  guessing, replacement characters or legacy-encoding fallback;
- at most 2,048 logical records, 16 fields per record and 8,192 Unicode code
  points in any cell, always also bounded by the whole-file byte limit;
- a fixed finite dialect set: comma, semicolon or tab delimiter; double-quote
  quoting with doubled embedded quotes; no backslash escape or comment syntax;
  CRLF/LF record endings, quoted newlines and a final non-newline record allowed;
- reject malformed quoting, NUL and unsupported control characters, empty body,
  ragged records and blank records; never skip or repair rows silently;
- accept a layout only if exactly one of the three dialects passes the entire
  strict parse and known-role/layout conditions. Zero candidates blocks; more
  than one blocks as ambiguous. No data-driven dialect sniffing or automatic
  fourth dialect. A failed attempt's exposure remains recorded.

The dialect and size choices should be confirmed by a frozen synthetic parser
contract before implementation. They may legitimately block the unseen file;
no automatic retry, cap increase or fallback follows. CSV libraries' permissive
edge behavior must not be mistaken for this stricter lexical contract.

A later acquisition should use only the pinned advertised HTTPS URL, a finite
timeout and the byte cap, without credentials, traversal of file links or
alternate mirrors. Initially reject redirects rather than assume an unseen
route; preserve the route/status metadata as a closed access failure for later
source-only review. Preserve a single acquired object's exact bytes privately
under an immutable identity receipt, and never overwrite failed/successful
slots. Repeated inspection, if needed, uses that same object and held parser;
it is reproduction, not a new independent observation. Do not publish raw CSV
or raw content-bearing error messages. Match committed reader, contract and
tests to their reviewed hashes before any future source operation; retain
before/after code and receipt identity, actual command timing and failures.

## What must remain unresolved after structural success

The public metadata names temperature measurement, specified temperature,
soaking time, manufacturing history, instruments and test results, and associates
`Rm`, `Rp0.2` and `Z` with same-test uncertainty assessments. These are documentary
categories only. The first profile leaves actual unit, condition, provenance,
requirement and endpoint dictionaries `UNBOUND`; it does not search every cell
for those words and report a hit as a validated field.

A subsequent small semantic adapter needs exact field definitions and accepted
unit spellings/conversions, operational endpoint definitions, requirement
tokens/applicability rules, and authoritative hierarchy/row associations. A
requirement marked mandatory is a schema rule, not proof of empirical
completeness. Meaning may reside in the very comments withheld here; neither
discarding comments nor guessing from a short symbol solves that dependence.
Scope should allow necessary provenance citations through a separately reviewed
projection rather than permanently excluding all scientific references.

Before any paired-endpoint evaluation, still establish:

1. Which record identifies a physical test piece, which observations are repeated
   readings or summaries of that piece, and how campaign/heat/batch/manufacturing
   stock, orientation, geometry, treatment, apparatus and reused literature
   connect pieces. File count, sheet count and schema rows are not sample counts.
2. Exact same-test joins of endpoints, conditions and uncertainties; absent,
   censored, inapplicable, invalid and duplicated values; whether per-endpoint
   uncertainty exists for every eligible pair and whether reported maxima hide
   missing per-test assessments. No outcome-based complete-case filtering is
   justified by this schema inspection.
3. Whether an uncertainty is absolute or relative, standard or expanded, which
   measurand/estimate it accompanies, coverage factor and intended coverage,
   rounding, and shared systematic components/covariance across endpoints and
   pieces. A marginal expanded measurement uncertainty is neither a hard
   enclosure nor a prediction-error interval. It cannot by itself certify joint
   endpoint or adaptively selected candidate-pool coverage.
4. The intended inferential frame: a metrology check on this campaign, a frozen
   finite collection sampled by a specified randomization, or future-material
   generalization. Correlated fixed labeled IDs can support a separately
   specified finite-population sampling argument; that does not manufacture IID
   physical replicates, extra measurement budget or a general discovery claim.

The dataset's single nominal alloy and specified temperature are consistent with
a focused reference use. They do not establish candidate diversity, independently
sampled panels, adequacy for calibration/evaluation or an equal-budget discovery
comparison. No model, outcome threshold, eligibility filter, split, allocation,
new mathematical claim or actual experiment is chosen here.

## Preparatory work still needed

Before a request, implement and independently review only this closed structural
profile and its custody wrapper, freeze exact output keys/types, permitted control characters and reason
precedence, and run synthetic adversarial checks. Useful fixtures include all
three dialects, misleading first records, quoted delimiter/newline boundaries,
ambiguous layouts, ten/eleven/twelve columns, duplicate labels, unknown header
canaries, formula/URL strings, comments/examples containing endpoint canaries,
malformed/overlong cells, boundary counts and partial read/write failures.
For the pure synthetic parser, changing a withheld cell body while keeping
CSV structure, recognized header labels and all admitted size/control limits
unchanged must leave the public projection unchanged, except the explicitly
allowed whole-file identity and exposure/runtime receipt fields. This invariance
does not apply to the fixed-source production identity gate: a changed body must
fail that gate rather than acquire a new accepted source identity. File identity
and transport errors must block before role publication; parse/layout errors
must preserve truthful exposure and publish no content-bearing exception text.

No tests or source operations are claimed by this note. The next engineering
decision is whether this deliberately partial inventory is worth implementing;
a complete dictionary requires the additional documentary/exposure scope above.
No new approval flow for Alex is created.
