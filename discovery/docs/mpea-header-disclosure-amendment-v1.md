# MPEA v9 first-record label disclosure amendment

Date: **2026-10-10**. Stage: **G15A; pending reviewed source checkpoint and execution**.
This amendment changes only the disclosure of the already verified CSV's first
logical record. It permits exact label strings that G15 redacted. It does not
authorize decoding observation rows, interpreting unknown fields, training,
scientific filtering, eligibility decisions or split assignment.

The existing project authorization covers ordinary execution. The new source,
tests and amendment must be committed before production disclosure; this is a
review/provenance prerequisite, not another permission request to Alex.

## Preserved evidence and exact source

G15 executed after commit `75caf5fc56ed3c8bb4a8da4cc913fc3816c3bb63` and its four
CI jobs passed. Its acquisition and two fresh header processes established the
same whole artifact and byte-identical redacted header receipts. The original
five frozen files remain unchanged. This amendment preserves G15's
`BLOCKED_SCHEMA` result and its historical redaction boundary.

| Identity | Fixed value |
|---|---|
| Source | Figshare article 12642953, version 9, DOI `10.6084/m9.figshare.12642953.v9` |
| File | 25797305, `MPEA_dataset.csv`, CC BY 4.0 |
| Exact bytes | 332,126 |
| Declared and observed MD5 | `6d29eb6018157b863ca0033ccec936d5` |
| Observed whole-file SHA-256 | `c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d` |
| Acquisition receipt | `reports/mpea-custody-acquisition-v1.json`, SHA-256 `2bd6a5f44c28e97460a5ee0fca8eaf0e77a243cd72259e23fff2a75b264aca83` |
| Initial header receipt | `reports/mpea-custody-header-v1.json`, SHA-256 `01f0e9899f8afb1517d0efd0d2bb4c43ca9df94daadc6a2d15664ac1bbe4d827` |

The observed redacted first record has **23 columns**, LF termination and no BOM.
Its only recognized tokens are `FORMULA` at position 1, `PROPERTY: Type of test`
at position 9 and `PROPERTY: Elongation (%)` at position 13. All other positions
are unknown. Positions are zero-based. No unknown spelling has been used to
choose this amendment's parser, caps, output shape or failure rules.

The source's MD5 is a legacy metadata-integrity check, not publisher
authentication. Its SHA-256 binds the acquired bytes; neither hash establishes
physical validity, sample independence or scientific completeness.

## Production gate and cache boundary

The dedicated tool is `scripts/mpea_header_labels.py`. Before it opens the real
cache it must verify that the following current files equal their committed
bytes: the original G15 producer, both original tests, original custody plan and
source inventory; both published receipts above; this amendment; the new
extractor and both new producer/review test files. The original five and initial
receipts additionally have literal pinned hashes. The production source must
run from its tracked path. Dirty, missing or symlinked required files fail
without opening the dataset cache.

Verify the two published receipts by their captured byte hashes before JSON
parsing. Validate their original closed schema and seals, original implementation
commit/file hashes, source identity and whole-blob identity. The initial header
must equal the exact redacted 23-column layout above.

Use only the existing ignored `.cache/mpea-custody/` path through the reviewed
cache-path guard. Read at most 332,127 bytes, then require the exact source
length, MD5 and SHA-256 before header framing or decoding. Hash and parse the
same captured buffer; a later file replacement must not change its meaning.
Do not refetch missing or conflicting bytes, choose mirrors, inspect an alternate
dataset or overwrite an existing cache object.

The extractor has no acquisition command. It hash-checks and executes the same
captured bytes of the original custodian source to reuse its reviewed parser.
That imported module **does contain unused network acquisition functions**;
the narrower claim is that this extractor never calls them. Tests must reject
any attempted network call during import, fixture use or production-path guard
failure. This is not a sandbox against arbitrary trusted Python code.

## Parsing and permitted output

Retain the original parser exactly: UTF-8, optional initial BOM, comma-separated
fields, double quotes/doubled quotes, LF or CRLF endings, and one logical header
record only. Limits remain 128 columns, 256 decoded characters per token,
65,536 header-record characters and the original 262,147-byte scan cap after an
optional BOM. Empty/duplicate/overlong tokens and invalid encoding/framing fail.
No dialect sniffing, whitespace trimming, alias replacement, case normalization,
unit inference or partial success is allowed. A quoted newline remains inside
the logical record. The body is never passed to a text decoder or CSV reader.

After framing, reconstruct the original redacted projection from the parsed
tokens. Require exact equality with the initial receipt, including all positions,
recognized/unknown statuses, token count, BOM and terminator. A mismatch releases
no additional label strings, even if whole-byte checks have otherwise passed.

On success, export each exact decoded first-record token and its zero-based
position, plus the column count/BOM/terminator and provenance. The canonical file
is ASCII JSON with escaped string contents. Treat labels as untrusted data;
do not execute or render them as markup or print them in exception messages.
The CLI prints only a fixed status/reason and receipt digest, not label strings.
The public sink revalidates the closed report shape and seal, and refuses
symlinks or conflicting existing output bytes.

The receipt remains **`BLOCKED_SCHEMA` / `SCHEMA_UNCONFIRMED`**, with
`first_record_labels_disclosed=true`, `full_schema_established=false`,
`data_rows_decoded=false`, `row_metadata_extracted=false`,
`target_numeric_validity_checked=false`, `scientific_eligibility_decisions=false`,
`fits=0`, `splits=0`; row count and numeric completeness remain null. The flag
`header_decode_attempted` denotes the bounded header-inspection operation,
including framing that may reject before UTF-8 decoding. Captured-byte exposure
and initial receipt verification are separately recorded. A blocked source or
header inspection emits no newly disclosed token labels. The public reference
may repeat the initial redacted layout and its three already-public labels;
`first_record_labels_disclosed` refers to the new full token list. Pre-inspection guard/cache failures
emit only a constant CLI failure; no valid disclosure receipt is fabricated.

This deliberately expands G15's unknown-token redaction policy. A header may
unexpectedly contain scientific or misleading text; lexical rules do not prove
that labels are harmless metadata. Disclose that exposure honestly. No body
values, row examples, per-row hashes, numeric validity, fitted features or
performance summaries may leave this stage. Preserve previous receipts and any
new failure. Do not retune the parser after a failure without another amendment.

## Synthetic verification and subsequent work

Before production, exercise source/receipt/hash mismatch before parsing; the
committed source gate before cache access; first-record quotes, newlines, BOM and
caps; hostile UTF-8/CSV solely in the body; same-buffer cache/source import
replacement; exact initial-header correspondence; escaping; closed output flags;
non-overwriting sinks; constant errors; and no network calls. Synthetic helpers
must label their provenance as `synthetic_fixture`, have no cache path, and reject
the real artifact's SHA-256. Their source identities are not production receipts.

Executable verification is finite test evidence, not formal parser refinement.
No actual label disclosure may run until this amendment and reviewed sources are
committed. A successful disclosure establishes first-record syntax and order
only. A separately reviewed and committed semantic mapping must then cover all
23 positions with cited meanings or explicit uninterpreted/withheld roles before
any row-metadata implementation reads observation rows. Units, ROM/experimental
provenance, tension/compression semantics, measurement pairing and feature
permissions remain unresolved here. No scientific benchmark or superiority
claim is registered by this amendment.
