# Proposed first-local-extra header diagnostic

Recommendation: add one separately frozen, read-only diagnostic that reports
the **16-bit field IDs and declared data lengths** in the first rejected local
extra area. Do not amend either existing ZIP reader profile yet. A complete
structural inventory would identify what further format review is needed; it
would not show that any field is safe to ignore or that the workbook is usable.

This is a design, with no implementation, experiment or actual archive read.
Root reports that both actual header runs at producer
`a6e87c198d8116d26c523e0e1b2eedce4aeb225b` produced public SHA-256
`4ee25afe053f68b4b9331a9ebc94bccb2e1d96e0ce5700d78a45866ef7b0cc12`:
sole primary/category `LOCAL_EXTRA_PRESENT`, stage `entry_local`, same-entry
checks `CHECKED`, no supplementary category, no member decompression or XML,
and 323 held runtime files. Those public receipts have not been independently
read in this design task. Their exact bytes must be verified by any later
production gate. All preceding negative results and source profiles stay intact.

## What the existing result means

In `scripts/li_v3_compatible_zip_diagnostic.py`, `_classify` preserves the
compatible profile's ordered traversal. At the selected entry, a sole local
extra rejection means its central rejection group was empty and every listed
local comparison except nonzero `extra_len` was false. In particular, the
computed compressed-data end did not extend into the directory. The earlier
entries passed this profile's checks. This is a statement about that executed
header path; it is not an interpretation of the extra area.

It does not establish the selected member's public identity, extra-field IDs,
record count, well-formedness, payload semantics, CRC validity, later-entry
acceptance or XML validity. It does not show that the selected entry is the
first archive entry. A nonzero local extra length is not itself an archive
corruption finding. No known ID, padding-looking size or familiar producer
is sufficient reason to ignore unknown bytes.

## Authoritative format basis

The source is PKWARE's [APPNOTE.TXT, version 6.3.10 FINAL, revised
2022-11-01](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), reused
from the ordinary public HTTP-200 retrieval retained by the earlier flags
study. Its 174,585 bytes have SHA-256
`0b993022a7d320a0bf704e6980bea36fafd17a6066ab994db0a0c16278a50cd6`.
No new request, alternate route or access bypass was needed. The retained
request and body remain in the previous ignored evidence directory; this
note paraphrases the relevant provisions and references the specification.

- Section 4.3.7 places the filename and then the extra area after the 30-byte
  local fixed header. Both lengths are unsigned 16-bit header fields.
- Sections 4.4.10–4.4.12 describe those lengths. Their general 64-KiB guidance
  for combined header components does not make a field's semantic contents
  valid and is not a substitute for exact buffer bounds.
- Section 4.5.1 specifies consecutive records with a little-endian 16-bit ID,
  a little-endian 16-bit data length, then exactly that many data bytes.
- Section 4.6.2 permits moving over uninterested data using the declared
  length. Section 4.6.3 warns that IDs can collide and recommends checking a
  producer signature before treating a block as a known type. Therefore an
  ID/length inventory is structural metadata, not semantic identification.

## Exact prerequisite and first-entry location

A future command should retain the existing fixed object, capture identity,
exclusive output slots and descriptor-based no-follow helpers. Before any
private capture/object read it must hash-check the exact actual public receipt
above and its producer identity. Its committed source guard must bind its own
script, author tests, independent tests and contract, plus all 21 unchanged
predecessor files through the current header diagnostic's guard. Its own
publication, original successful CI and clean retained-package verification
remain separate root workflow gates. No URL, file, producer or source-hash
override should be exposed.

After verifying the same immutable raw byte buffer, run the unchanged frozen
`_classify(raw, exposure)` first. Proceed only when its complete classification
is exactly the sole `LOCAL_EXTRA_PRESENT` result, including the primary and
supplementary lists, coarse `ZIP_LAYOUT_UNSUPPORTED`, `entry_local`, `CHECKED`,
and successful cleanup. A different result blocks without a field inventory.
Preserve the predecessor's actual exposure flags even on mismatch or cleanup
failure. This check must use the bytes being inspected, not just a prior receipt.

There is no need to copy the entire classifier or reopen the directory to find
the selected span. A short locator can scan **fixed local headers only** from
position `p = 0`, following the compressed byte counts already validated by
the predecessor. Let `D` be the directory start from its validated end record.
For each local header, read its signature and unsigned filename length `N`,
extra length `L`, and compressed size `C`. Require the fixed 30 bytes to lie
before `D`, the local signature to agree, and all arithmetic to remain inside
the raw buffer and before `D`. Establish these bounds before using a slice:

```text
0 <= p <= D <= len(raw)
30 <= D - p
N <= D - (p + 30)
L <= D - (p + 30 + N)
C <= D - (p + 30 + N + L)
```

If `L == 0`, advance directly to `p + 30 + N + C`; do not read, decode or hash
that member's compressed data separately. Stop at the first `L > 0`, with the
extra span `[p + 30 + N, p + 30 + N + L)`. Do not inspect another entry after
that point. Limit the scan to the predecessor's validated directory count,
which is in `1..128`. A missing target, signature disagreement or bound failure
is a closed locator-mismatch error, not permission for a broader search.

Why this selects the same entry: the predecessor starts its contiguous end at
zero. Every earlier accepted entry has `L = 0`, verifies its local compressed
size against the directory, and requires its local offset to equal that end.
Induction therefore gives the same next position for both traversals. The
first positive `L` is precisely the entry where the sole-extra rejection
occurred. This reasoning depends on the exact predecessor result and identical
immutable bytes. The locator is not a standalone ZIP reader and must not be
used when those prerequisites are absent.

## Bounded field-header projection

Freeze the natural extra-area cap `65,535` and a separate output/work cap of
**256 records** before any actual field inventory. The record cap is a local
resource policy, not a ZIP validity rule, and must not be raised in response to
the same observation. The raw source remains bounded by the existing 183,878
byte cap; the locator remains bounded by 128 headers.

Within the selected span, use a cursor and inspect only the next four header
bytes. Interpret the two unsigned little-endian integers as `header_id` and
`data_size`. If fewer than four bytes remain, return `EXTRA_HEADER_TRUNCATED`.
If `data_size` exceeds the bytes remaining after that header, return
`EXTRA_DATA_TRUNCATED`. Otherwise advance by `4 + data_size` without decoding,
copying, searching, hashing or recursively parsing the intervening field data.
Zero-length field data is structurally allowed and still advances four bytes.
If bytes remain after 256 complete records, return `EXTRA_RECORD_LIMIT` before
reading a 257th header. Success requires the cursor to equal the declared end
exactly; trailing bytes are not silently treated as padding.

Only a complete bounded walk may publish `field_headers`, an ordered list of
objects with exactly `header_id` and `data_size`, each an integer in `0..65535`.
Retain duplicate IDs and their order; do not merge, deduplicate or pick a
winner. Unknown and reserved IDs may appear structurally but receive no
inferred semantics. On truncation, limit, locator or prerequisite failure,
publish `field_headers: null`, not a partial list. No field payload, payload
hash, filename, member ordinal, absolute offset, timestamp, CRC, nested ID,
string, cell coordinate or member-data size is included in this projection.
The order of the published list is the only implicit field ordinal.

Every completed structural diagnosis stays `BLOCKED_SCHEMA`, including an
engineering label such as `LOCAL_EXTRA_HEADERS_COMPLETE`. Guard failures may
retain the established `BLOCKED_GUARD` convention. Counts of rows, paired
observations, groups and overlaps remain null; fits and splits remain zero.
No parsing result enables the XML/envelope stage automatically.

## Why familiar IDs still require a separate decision

| ID or family | Relevant provision | What an ID/length observation cannot establish |
| --- | --- | --- |
| `0x0001`, ZIP64 | Sections 4.5.3, 4.4.8–4.4.9 and 4.3.9.2 | Actual 64-bit sizes/offsets, required sentinel relationships, valid local layout or a safe 32-bit fallback. Small files can use ZIP64. This diagnostic never resolves or applies those values. |
| `0x7075`, Unicode path | Section 4.6.9 | Recognized version, matching name CRC, valid UTF-8 or agreement of an alternate name with the canonical local/directory name. No path override is decoded or applied. |
| `0x6375`, Unicode comment | Section 4.6.8 | Valid version/CRC/UTF-8 or an innocuous comment. No comment is decoded. |
| `0xa220`, Open Packaging growth hint | Section 4.6.10 | Correct verification signature, declared padding value or actual null padding. ID and size alone are insufficient for an allowlist. |
| `0x000a` / `0x5455`, timestamp metadata | Sections 4.5.5 / 4.6.1 | Valid nested attributes, timestamp values or provenance consistency. Nested tags and times remain uninterpreted. |
| `0x9901`, encryption metadata | Appendix E | Whether an encryption structure is valid or active. Existing flag/method restrictions are not relaxed. |
| Other, duplicate or colliding IDs | Sections 4.5.1 and 4.6.3 | A unique producer, semantic meaning, valid duplicate policy or harmlessness. |

The current profile already restricts version, flags, methods and central
extra areas. Those restrictions continue to apply; recognizing a local ID
does not override them. The absence of an ID in this one span says nothing
about later entries. Any later compatibility proposal must separately define
its exact payload validation and name/size authority rules, preserve this
negative result, and pass its own review and synthetic adversarial controls.

## Exposure and meaningful independent checks

Production necessarily reads and hashes the entire target-bearing raw object
to verify identity. The unchanged predecessor privately decodes directory
names and processes ZIP directory metadata through `zipfile`; this design
does not claim that every ZIP metadata payload is globally uninterpreted.
The new locator reads only bounded fixed local-header integers. The new TLV
walk interprets selected local IDs and lengths; it does not interpret their
data bodies. Skipping a body in that loop is not equivalent to never having
acquired its bytes. Only structural IDs and lengths reach researchers through
the proposed additional projection.

Expose separate started/completed flags for locator and local-extra header
walking, preserving partial-read and predecessor cleanup flags. Retain all
flags on parsing, write and close failures; never replace them with a clean
unexposed base report. Keep member decompression, XML, worksheet and shared
string decoding, numeric validity, scientific eligibility and independence
claims false. Payload interpretation stays false for the new local-extra loop;
it must not be labeled as absence of raw-byte access.

Before implementation could be promoted, independent synthetic checks should
cover first/middle rejected entries, unchanged predecessor ordering, refusal
of mixed central/local failures, wrong prerequisite/source guards, positive
extra length before later unknown entries, bounds crossing the directory,
little-endian IDs/lengths, zero lengths, duplicates, unknown/reserved IDs,
one-to-three trailing bytes, overlong lengths, exact 256/257 record boundaries,
and the 65,535-byte span edge (one record can carry at most 65,531 data bytes).
Use payload/name/XML canaries and arbitrary changes within opaque data to show
that the permitted header inventory does not disclose or depend on those
values. Instrument member-open/decompression/XML/network APIs to fail if used;
exercise exceptional cleanup and confirm its exposure is retained. A pure
synthetic interface must reject the known actual source identities and expose
no filesystem, URL or production override. These tests would establish bounded
engineering behavior only, not archive semantics or scientific validity.

The next authorized engineering decision is whether to implement and review
this frozen diagnostic. No reader amendment, actual field inspection, dataset
readiness declaration, independent-sampling claim or G21 experiment selection
is made by this note.
