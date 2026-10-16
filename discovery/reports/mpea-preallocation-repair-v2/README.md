# Repair the public metadata seal boundary

The registered v1 worker stopped before allocation because the metadata consumer
omitted the newline used by all three upstream producers' content hashes.
[The original operational failure](../mpea-t25-archival-v1/README.md) is permanent.
All four pinned whole-file hashes agree; no metadata values or scientific rules
were changed to resolve the mismatch.

The corrected reader uses a dedicated upstream seal verifier for canonical JSON
plus exactly one LF. Internal registration, capture and ledger seals retain their
existing no-LF convention. The public-only metadata reader is testable without
granting registration authority; its production entry retains the authority gate.

Seven [authored regressions](author/author-regression-v1.json) and ten
[independent counterexample tests](peer/independent-review-v1.json) pass. They
exercise the actual pinned public metadata, separate seal formats, Unicode/type
distinctions, tampering, alternate encodings, whole-file pins and access refusal.
The independent [adjacent public readiness preflight](peer/public-feature-readiness-v1.json)
also passes, including both published feature-readiness receipts and five tamper
controls. It does not open private feature vectors or performance targets.

The prospective registration generation changes only the fixed tag to
`mpea-t25-registration-v2` and adds the recovery amendment and v1 failure summary
to the mandatory source manifest. Three [independent constructed controls](registration-review/review.json)
check v1 rejection/v2 acceptance, required evidence closure and refusal to redraw
after an interrupted allocation even under a changed registration. The protocol,
source key, salt, provider, sampler and all scientific decisions stay fixed.

After integration, the actual focused registration suite passes **53 tests** in
6.575 seconds; [the tool observation](main-focused-observation.json) states its
recording limits. An additional [13 public-tag tests and integrated source review](registration-review/integrated-review.json)
pass without repeating the 53 registration tests. The [recorder review correction](registration-review/recorder-base-correction.json)
compares against the actual previously executed recorder.

The forthcoming complete committed-source test run, clean
package, all four exact-commit CI jobs, explicit engineering approval and
authenticated distinct tag are still required before execution. These focused
passes alone authorize neither a launch nor a scientific claim.

The author/peer copy manifests retain exact reviewed bytes; the patch is wrapped
losslessly as base64 to preserve its whitespace. Original source and negative
diagnosis remain available. No target inspection, allocation or production retry
was performed by these repairs or reviews.
