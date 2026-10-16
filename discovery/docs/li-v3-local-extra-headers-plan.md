# Li v3 first-local-extra field headers

This separate diagnostic publishes only a complete ordered list of unsigned
16-bit field IDs and declared data lengths from the first rejected local extra
area. Every completed inspection remains `BLOCKED_SCHEMA`. Familiar IDs,
well-formed headers and successful synthetic tests do not make the fields safe
to ignore, approve an archive profile or establish a usable scientific dataset.
No existing reader, source pin or previous negative result changes.

## Fixed prerequisite and source

The production command is `python scripts/li_v3_local_extra_headers.py diagnose
--run 1` (or the separate fixed slot `--run 2`). It exposes no URL, path, source,
producer, record-cap or profile override. Output is exclusively created under
`.cache/li-v3-custody/local-extra-headers-v1/{1,2}/public.json` using the existing
descriptor-based no-follow helpers. Existing output cannot be overwritten.

Before any private capture or object read, production checks the exact public
predecessor receipt at
`.cache/li-v3-custody/compatible-zip-diagnostic-v1/1/public.json`, SHA-256
`4ee25afe053f68b4b9331a9ebc94bccb2e1d96e0ce5700d78a45866ef7b0cc12`,
with producer `a6e87c198d8116d26c523e0e1b2eedce4aeb225b`. Its source guard
requires its four own committed files (script, author tests, independent tests,
this contract), plus the unchanged 21 predecessor files through the existing
guard chain. Each own file must match both index and the same committed bytes.
The independently held publication, successful original CI and clean retained
package are additional operational gates; a local receipt or source hash alone
does not establish scientific validity or provenance against hostile code.

The original capture and exact 183,878-byte object identity remain fixed. The
raw object is acquired and hashed in full before inspection. The pure
`inspect_synthetic_local_extra(bytes)` interface accepts only bounded bytes,
rejects the known actual SHA-256 and size/MD5 identities, and has no production
or filesystem override. Private Python functions are not a hostile-code
security boundary.

## Same-buffer prerequisite and bounded locator

The unchanged `li_v3_compatible_zip_diagnostic._classify` runs on the same
immutable raw bytes. Its complete result must equal:

```json
{"reason":"LOCAL_EXTRA_PRESENT","categories":["LOCAL_EXTRA_PRESENT"],"primary_categories":["LOCAL_EXTRA_PRESENT"],"supplementary_local_categories":[],"compatible_reason":"ZIP_LAYOUT_UNSUPPORTED","first_rejection_stage":"entry_local","same_entry_local_checks":"CHECKED"}
```

Archive close must have started and completed, with no close error. Any other
classification blocks before the new locator; the actual prior classification
and exposure remain visible. An exact classification without successful close
is `PREDECESSOR_CLEANUP_FAILED`, also with no field list.

The new locator does not construct a second `ZipFile` or copy the classifier.
It reads the validated end record and scans at most its 1–128 fixed local
headers from offset zero. For local position `p`, directory start `D`, filename
length `N`, extra length `L` and compressed length `C`, it checks the signature
and all bounds before advancing:

```text
0 <= p <= D <= len(raw)
30 <= D - p
N <= D - (p + 30)
L <= D - (p + 30 + N)
C <= D - (p + 30 + N + L)
```

For `L=0`, advance by `30+N+C`; stop at the first `L>0`. Earlier entries passed
the unchanged classifier, had no extra area, matched local and directory
compressed sizes, and were contiguous from zero. Induction therefore makes
this the same selected entry. A missing target, bad signature or inconsistent
bound is `LOCAL_EXTRA_LOCATOR_MISMATCH`, not permission to search elsewhere.
This locator depends on that exact prior result; it is not a standalone reader.
It does not read or decode member names or compressed member bodies. The
unchanged predecessor privately decodes directory names and processes metadata
for the complete directory; stopping the new locator does not undo that exposure.

## Complete field-header projection

The extra-area cap is 65,535 bytes and the output/work cap is 256 records.
The latter is an engineering policy, not a ZIP validity rule. Neither cap is
automatically adjusted. While bytes remain, the walker performs exactly this
ordered procedure:

1. If 256 records have already completed, return `EXTRA_RECORD_LIMIT` before
   reading another header, including when only one to three tail bytes remain.
2. If fewer than four bytes remain, return `EXTRA_HEADER_TRUNCATED`.
3. Read the little-endian unsigned pair `header_id`, `data_size`. If the declared
   data exceeds the remaining span, return `EXTRA_DATA_TRUNCATED`.
4. Append the pair and advance four bytes plus the declared data length.

Success requires ending exactly at the declared boundary. Exactly 256 records
ending there succeed. Zero-length data is permitted, duplicate and unknown IDs
retain order, and trailing bytes are never silently padding. A maximum-length
span can contain one record with 65,531 data bytes. The walker never copies,
decodes, searches, hashes or recursively parses the intervening data bodies.

`field_headers` is either the entire list of objects containing exactly
`header_id` and `data_size` (integers 0–65535), or null. All failure paths return
null rather than a partial list. No payload, payload hash, filename, selected
member ordinal, absolute offset, timestamp, CRC, nested tag, cell coordinate
or member-data size is published by this projection. List order is the only
implicit field ordinal. Generic known whole-object identity/exposure metadata
remains part of the existing custody report.

The format basis is PKWARE APPNOTE 6.3.10 FINAL, revised 2022-11-01, sections
4.3.7, 4.4.10–4.4.12, 4.5.1 and 4.6.2–4.6.3; the previously retained public
174,585-byte specification has SHA-256
`0b993022a7d320a0bf704e6980bea36fafd17a6066ab994db0a0c16278a50cd6`.
Its collision warning prevents equating an observed ID with validated semantics.
ZIP64, Unicode name/comment, timestamp, encryption and OPC growth-hint fields
receive no interpretation or profile exception here. A later proposal would
need its own exact payload and authority rules, synthetic review and frozen
execution. This stage does not enable XML or later layout localization.

## Exposure, failures and validation limits

Schema `lupine.discovery.li_v3.local_extra_headers.v1` retains the source,
capture, observed identity and existing exposure fields. It adds the exact
`predecessor_classification`, complete-or-null `field_headers`, and separate
started/completed flags for `local_header_locator` and
`local_extra_header_walk`. `local_extra_payload_interpreted` remains false;
that does not mean those raw bytes were never acquired. Fits and splits are
zero; row, paired, group and overlap counts stay null. Member decompression,
XML, shared strings, worksheet cells, numeric validity, eligibility and
independence remain unestablished and their exposure flags remain false.

The complete engineering reason is `LOCAL_EXTRA_HEADERS_COMPLETE`. Other
completed inspections use the fixed mismatch/truncation/limit codes above or
`LOCAL_EXTRA_PARSE_FAILED`. Production source, prerequisite, read/write and
descriptor-close errors use `BLOCKED_GUARD` and constant safe reasons.
All paths preserve the report's current exposure. A failed output write may
leave partial bytes; a descriptor-close error after a successful write can
leave an earlier complete receipt while the returned report records the guard
failure and null field list. Operations must retain both returned status and
file state; neither case permits silent retry or overwriting. The unchanged
predecessor contains its in-memory archive-close errors and prevents a normal
destructor retry; this is not protection against arbitrary modified Python code.

Author and separate independent synthetic checks cover first/middle/late
selection, unchanged predecessor rejection order, mixed failure refusal,
unsigned/duplicate/unknown IDs, zero data sizes, truncated headers/data,
256-record precedence, maximum spans, locator bounds, opaque payload/name
canaries, prohibited decompression/XML/network APIs, source/prerequisite gates
and partial-read/write/cleanup exposure. These test engineering behavior only.
The implementation and this contract do not assert an actual field inventory,
archive compatibility, independent samples, measured prediction performance,
or a scientific release decision.
