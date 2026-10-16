# Conditional growth-hint shape: synthetic candidate only

This candidate has only `inspect_synthetic_growth_hint(bytes)`. It has no CLI,
production guard, diagnosis/capture action, network, private-file read or output
receipt writer. `PRODUCTION_PREREQUISITE` is explicitly null. The candidate does
not assume that any actual archive contains `0xA220`. Future production work
would require root's actual G29 result and immutable receipt/producer bindings,
separate implementation/review and the existing publication/CI/package gates.
Assigning a value to the null constant does not enable a production operation.

The format basis is retained PKWARE APPNOTE 6.3.10 FINAL, revised 2022-11-01,
SHA-256 `0b993022a7d320a0bf704e6980bea36fafd17a6066ab994db0a0c16278a50cd6`,
sections 4.3.3, 4.4.1.1, 4.5.1, 4.6.2–4.6.3 and 4.6.10. The separate reviewed
source research derives only a payload-shape predicate. The specification does
not equate the initial-padding value to current padding length or establish
duplicate/update rules, producer identity or full OPC semantics.

## Same synthetic buffer and immutable predecessor

The module imports unchanged G29 `li_v3_local_extra_headers` solely for its
synthetic API and bounded locator, never invoking `production_context`,
`diagnose` or source/receipt helpers. Its inherited input guard requires exact
`bytes`, limits the buffer to 183,878 bytes, and rejects known actual source
SHA-256 or size/MD5 identities. Invalid inputs raise the predecessor's constant
safe `CustodyError`; they never select a path, URL or alternate source.

G29 runs its unchanged classifier, cleanup check, locator and complete TLV
walk on that buffer. Only `BLOCKED_SCHEMA` with
`LOCAL_EXTRA_HEADERS_COMPLETE` proceeds. Its report's preceding classification,
reason and exposure remain visible. G29's existing 256-record and 65,535-byte
span bounds are unchanged. This imports ZIP directory-metadata processing; it
does not decompress members or parse XML. Synthetic imports are not production
source-guard invocation.

Exactly **one total outer record** must be present, and its ID must be `0xA220`.
One growth hint among additional records, duplicate growth hints, an unknown ID
or another family all stop before payload interpretation. The candidate calls
the unchanged locator again on the same immutable bytes and verifies the
selected span length equals four plus the G29-declared data length. The same
contiguous-prefix induction used by G29 selects the same first rejected entry.
The second locator has separate exposure flags so a failure cannot erase the
predecessor's already-completed locator exposure.

The candidate stores 25 exact predecessor file hashes (the unchanged original
21 plus G29's four). Current G29 independent-test SHA-256 is
`570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e`.
These are audit bindings checked by author tests, not a runtime production guard.
No predecessor file is modified. Python helpers and monkeypatchable globals are
not a hostile-code boundary.

## Ordered, bounded payload check

For that sole field with data length `L`:

1. Require `L >= 4`. Too-short fields do not initiate payload interpretation.
2. Read two little-endian unsigned 16-bit words. Require the first word to be
   `0xA028`. Read the second, initial-padding word, but withhold its value and
   never compare it with current padding length.
3. Only for a matching signature, scan all remaining `L - 4` bytes and require
   every byte to be zero. Empty padding is allowed. The scan visits the entire
   bounded remainder even when a nonzero byte is found.

The maximum selected extra span is 65,535 bytes. Since its TLV header uses four
bytes and fixed payload words use four, the scan is at most 65,527 bytes. Nothing
is rewritten, decoded as text, hashed per field, interpreted recursively or used
to override a name, size or authority rule. Later local entries are not inspected
by this new check; a first-span match never means every extra in the archive
has been validated.

## Closed results and exposure

The report retains the predecessor's fixed custody metadata and exposure but
replaces its numeric `field_headers` projection. Added values are fixed schema,
profile, reason/status labels and booleans or null:

- `production_prerequisite_status`: always `UNBOUND`;
- `exactly_one_a220_record`, `payload_length_at_least_four`,
  `signature_matches`, `padding_all_zero`: null until their checks occur;
- `growth_hint_shape`: `NOT_CHECKED`, `DOES_NOT_MATCH`,
  `MATCHES_RETAINED_APPNOTE_SHAPE`, or `NOT_ESTABLISHED` after an unexpected error;
- `initial_padding_semantics`: always `UNBOUND`;
- `archive_acceptance_established`: always false;
- `scientific_evaluation_status`: always `BLOCKED`.

The original synthetic `source_identity_verified` remains false. Every normal
report remains `BLOCKED_SCHEMA`, including `GROWTH_HINT_SHAPE_MATCH`. Other fixed
reasons are `GROWTH_PREDECESSOR_BLOCKED`, `GROWTH_FIELD_SELECTION_BLOCKED`,
`GROWTH_SPAN_MISMATCH`, `GROWTH_PAYLOAD_TOO_SHORT`, `GROWTH_SIGNATURE_MISMATCH`,
`GROWTH_PADDING_NONZERO` and `GROWTH_PAYLOAD_INSPECTION_FAILED`. Unknown exception
text is never returned. Successfully completed prior checks remain visible on
failure; an unexpected failure does not reset exposure to an untouched report.

Added exposure flags distinguish second-locator started/completed, payload
interpretation started/completed, fixed words interpreted, and padding scan
started/completed. `local_extra_payload_interpreted` becomes true before the
fixed-word attempt, conservatively preserving attempted interpretation even if
it fails. A signature mismatch still means both words were read, but no padding
was scanned and the complete payload interpretation flag stays false. When a
nonzero padding byte is found, the entire scan still completes and the negative
shape result is retained. These flags concern synthetic inputs here.

No raw initial-padding value, signature, field length, field ID, filename,
offset, payload bytes/hash, worksheet/cell content or arbitrary error text is
newly disclosed. The inherited fixed-source metadata identifies the existing
custody profile, not the origin of a synthetic fixture. Acquisition of a future
real raw buffer would still expose all its bytes; output withholding would not
make those bytes unacquired or target-free.

## Verification scope

Author checks use generated stored-ZIP byte fixtures and actual unchanged G29
helpers. They challenge unsigned initial values, endianness, short fields,
wrong signatures, zero/nonzero padding, maximum span, duplicate/mixed records,
malformed TLVs, early/later selected entries, missing prerequisites, canary
withholding, forbidden production/content APIs and exceptional second-location
exposure. Separate independent fixtures/review are required before treating this
candidate as an integration option. Actual test receipts identify what ran;
this contract alone claims no executed pass.

This candidate cannot establish an actual field inventory, a legitimate producer
history, archive/package acceptance, XML/schema validity, scientific-data
readiness, independent samples or materials performance. Existing negative
results and all scientific claim gates remain unchanged.
