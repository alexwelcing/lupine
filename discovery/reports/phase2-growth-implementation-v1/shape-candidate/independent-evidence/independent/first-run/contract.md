# Fixed-source growth-hint payload shape

This separate diagnostic binds the already observed G29 public field-header
receipt and checks a narrowly defined payload shape on the same verified raw
buffer. It does not amend any archive reader, rewrite input, decompress a member,
parse XML, or admit a scientific dataset. Even a matching shape remains
`BLOCKED_SCHEMA`. Actual operations require this profile's reviewed, committed
source and the release's CI/package gates; candidate tests never invoke actual
source operations.

The frozen preimplementation scope was written before production-candidate code
or tests. Its prerequisite is the canonical public G29 receipt SHA-256
`52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e`,
produced by `d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3`, with reason
`LOCAL_EXTRA_HEADERS_COMPLETE`, status `BLOCKED_SCHEMA`, and exactly one field
`{header_id: 41504, data_size: 516}`. This establishes the applicability of a
shape diagnostic, not the field's payload contents or semantic legitimacy.
No actual payload observation is assumed by this contract.

## Format basis and scope

Retained PKWARE APPNOTE 6.3.10 FINAL, revised 2022-11-01, has SHA-256
`0b993022a7d320a0bf704e6980bea36fafd17a6066ab994db0a0c16278a50cd6`.
Sections 4.3.3 and 4.4.1.1 establish little-endian, unsigned fixed words;
4.5.1 and 4.6.2–4.6.3 explain field framing and identifier collisions;
4.6.10 supplies the Open Packaging Growth Hint record shape. It does not state
that the initial-padding word equals present padding length or establish an
update history, duplicate policy, producer identity or complete OPC semantics.
The extra-field ID alone is not proof of semantic authority.

Only exactly one total outer record is eligible. It must be `0xA220`; a growth
hint accompanied by any other record is not eligible. On the selected G29 span
with payload length `L`, require `L >= 4`, interpret two little-endian unsigned
16-bit words, and require the first to be `0xA028`. Read the second word but
withhold it and do not compare it to current padding length. Only after the
signature matches, scan the full remaining `L - 4` bytes and require all to be
NUL. Empty padding is permitted. The scan does not stop at the first nonzero
byte. A 65,535-byte extra span permits at most 65,527 scanned padding bytes.
In the fixed production prerequisite, `L=516`, so a matching signature leads
to a 512-byte scan. This arithmetic is not an observation of those bytes.

This applies only to G29's first rejected local-entry extra span. A match says
nothing about later local entries, central extras, XML, worksheets, package
validity or scientific readiness. A future reader profile would be separate
work with its own complete validation rules; this diagnostic never authorizes
silently skipping or accepting other extras.

## Interfaces and same-buffer reasoning

`inspect_synthetic_growth_hint(raw)` remains the preserved fixture API. Its
unchanged G29 guard requires exact `bytes`, caps length at 183,878 and refuses
known actual-source SHA-256 or size/MD5 identities. It performs no file/network
operation and invokes no production guard. Synthetic imports of public modules
are not production-context invocation. The earlier pure candidate and its
first failures and later passes remain historical evidence.

Private `_inspect_payload(raw, report, fields)` contains the same bounded
predicate used by that fixture API. Its internal precondition is a complete
unchanged G29 inspection on the identical immutable buffer, with the inherited
report and its complete `field_headers`. It is not a public unchecked-source
entrypoint. `_result(prior)` initializes the closed growth report from G29's
base/inspection report. The production wrapper uses the actual G29 `_inspect`,
not its fixture API, after verifying the immutable captured source identity.
It additionally requires the reobserved field list to equal the exact pinned
sole A220/516 list before interpreting payload bytes.

G29's existing classifier, cleanup, locator, 256-record cap, complete-or-null
TLV walk and 65,535-byte span limit remain unchanged. The payload predicate calls
G29's unchanged locator again on the same bytes and checks span bounds and
`span_length == 4 + L`. The original contiguous-prefix induction identifies
the same first rejected entry. Separate second-locator exposure flags preserve
the predecessor's completed locator if the later call fails.

## Committed source, receipt and custody guards

All 25 predecessor files remain pinned: the original 21 plus G29's four.
The current G29 independent-test hash is
`570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e`.
The new guard rejects a noncanonical script path before invoking any predecessor
guard. It then calls G29's unchanged committed-source guard, checks its closed
identity groups against all 25 fixed hashes, and verifies its own script,
author test, independent test and this contract against both the same commit
and index. An end-of-guard HEAD check detects movement during this new layer.
Each new Git subprocess has a 15-second timeout. This reuses the immutable
predecessor guard rather than changing its implementation or resource policy.
Python globals/helpers do not constitute a hostile-code security boundary.

`diagnose(run)` accepts only exact strings `1` or `2`. In order it:

1. Establishes the committed source identity above.
2. Reads only the fixed G29 public receipt path, capped at 65,536 bytes; requires
   its exact hash and canonical bytes, fixed producer, complete closed source
   groups, exact typed field list and explicit prior exposure/applicability.
3. Opens the fixed new output slot and checks that its public receipt is absent.
4. Uses the unchanged original capture validation, marks raw-read exposure and
   reads the fixed original object under its existing byte cap. It records
   completed exposure before checking the object size, MD5 and SHA-256 identity.
5. Repeats G29 on those verified bytes, checks the pinned field list, and applies
   the bounded shape predicate to that same immutable buffer.
6. Writes one canonical public report with unchanged no-follow/exclusive helper
   behavior and closes the output directory descriptor.

The only slots are
`.cache/li-v3-custody/growth-hint-shape-v1/{1,2}/public.json`. There are no input,
URL, output, receipt, source or cap overrides. Absence checks plus exclusive
writes reject existing completed-slot replay and prevent overwrite; they are
not a concurrency lock or a general guarantee of at-most-once source reading.
Actual operations are controlled and serialized. A failed or occupied slot is
not automatically retried, overwritten or redirected elsewhere.

The new prerequisite error uses a local constant-only exception type; the old
custody error vocabulary is not mutated. Unexpected errors produce only the
fixed `INTERNAL_FAILURE` code, never arbitrary exception text. Read/write/close
failures preserve exposure. A successfully written receipt can precede a final
descriptor-close failure: the returned report then becomes `BLOCKED_GUARD`,
clears its shape claims, and can differ from the already written receipt.
The operation recorder must retain both and treat that operation as failed;
the diagnostic does not rewrite the receipt to hide this chronology.

## Closed projection and exposure

The report retains fixed custody metadata, predecessor classification/reason and
exposure, but removes numeric `field_headers`. New projection fields are fixed
schema/profile/reason labels and these booleans or null:
`exactly_one_a220_record`, `payload_length_at_least_four`, `signature_matches`,
and `padding_all_zero`. `growth_hint_shape` is `NOT_CHECKED`, `DOES_NOT_MATCH`,
`MATCHES_RETAINED_APPNOTE_SHAPE`, or `NOT_ESTABLISHED` after a failure.
`production_prerequisite_status` is `UNBOUND` for synthetic input and initially
`BOUND_NOT_CHECKED`, then `VERIFIED`, for the fixed production route.
`initial_padding_semantics` is always `UNBOUND`;
`archive_acceptance_established` is always false;
`scientific_evaluation_status` is always `BLOCKED`.

Normal classification reports remain `BLOCKED_SCHEMA`, including matches.
Guard failures are `BLOCKED_GUARD`, with shape booleans cleared; they preserve
prior identity and exposure that already occurred. Fixed classification reasons
are `GROWTH_PREDECESSOR_BLOCKED`, `GROWTH_PREDECESSOR_FIELDS_MISMATCH`,
`GROWTH_FIELD_SELECTION_BLOCKED`, `GROWTH_SPAN_MISMATCH`,
`GROWTH_PAYLOAD_TOO_SHORT`, `GROWTH_SIGNATURE_MISMATCH`,
`GROWTH_PADDING_NONZERO`, `GROWTH_HINT_SHAPE_MATCH` and
`GROWTH_PAYLOAD_INSPECTION_FAILED`. Invalid public prerequisites return the
constant `GROWTH_PREREQUISITE_INVALID`. CLI actions always exit 2: no result
represents scientific readiness.

Reading the original raw buffer is whole-file machine exposure, including
source bytes that may encode empirical observations. During an incomplete
object read, `target_bearing_source_bytes_read` is null, not false. After a
complete read it is true even if identity validation subsequently fails. ZIP
metadata processing can decode names internally; this projection does not
publish those names. No member is decompressed and no XML is parsed here.

Additional flags distinguish second locator started/completed, fixed words
interpreted, payload interpretation started/completed, and padding scan
started/completed. `local_extra_payload_interpreted` becomes true at the start
of the fixed-word attempt, conservatively recording attempted interpretation
on faults. A bad signature means both fixed words were interpreted but padding
was not scanned; the final interpretation-completed flag stays false. Finding
nonzero padding still completes the full scan and retains the negative result.

The new output publishes no arbitrary initial-padding value, signature value,
length, ID, filename, offset, payload bytes/hash, worksheet value or exception
text. Match booleans nevertheless reveal comparisons to public constants;
output withholding is not zero machine exposure or a target-free acquisition.
No physical truth, independent sampling, archive acceptance, calibrated coverage
or materials-performance claim follows from this projection.

## Verification scope

Author and independent checks use generated ZIP fixtures and controlled mocks.
All real production guard/Git/source/receipt/output dependencies are stubbed
before wrapper checks; no actual capture/object/private archive is read.
Inner prerequisite checks use a generated canonical report and an explicitly
limited hash stub, separately from unchanged fixed-hash rejection checks.
They test control ordering and disclosure, not an actual custody event.
Independent source inspection checks the unchanged predicate and predecessor
bindings. An ignored conformance check compares complete synthetic outputs with
the preserved earlier pure source; it is executable equivalence evidence for
those fixtures, not a formal refinement theorem. Actual retained receipts state
which tests ran, including first failures. No pass is asserted by this contract
alone. Release/source-operation gates and existing scientific negative results
remain in force.
