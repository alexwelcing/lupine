# G34 retained package and artifact verification

The clean package and retained-artifact verifier completed successfully for
`a064a2c0e4a7cce1fbcb0541f49aae132944e785`. The retained
[release record](clean-package/artifacts/release-artifacts.json) reports **28
cases, 6 problem schemas and 16 required installed-package checks**. The
[package receipt](clean-package/0-execution.json) records 34.855678 seconds and
the [verifier receipt](clean-package/1-execution.json) 1.493245 seconds; both exit
0 with empty stderr, clean unchanged HEAD and all 335 runtime files held.
These are completed local engineering operations, not a whole-CI claim.

The [independent artifact review](independent-artifact-review/actual-review.md)
matched **5,003 source files** to the exact Git revision and **335 runtime
files** to the archive and working tree. The additive audit confirmed all
**332 predecessor runtime files unchanged**, exactly three new runtime files,
all four reviewed source/test/contract pins and **108 wheel package payload
members unchanged** against both retained and Git baselines. Its wheel checks
also covered 115 members and 114 RECORD content digests. The full and corrected
additive results are bound by [actual-review.json](independent-artifact-review/actual-review.json).

The first generic audit passed. The first additive audit failed an exact
metadata-baseline assertion: the [integration pin record](publication/final-reviewed-pins.json)
named the immediate parent `9766b683`, while the predeclared artifact comparison
baseline was `c17c4c6b`. A separate [artifact pin record](publication/artifact-reviewed-pins.json)
now states both roles. The **unchanged additive auditor** passed in a distinct
recorded invocation; the generic audit was not rerun. This was a pin-record
role mismatch, not a product test failure. The first failed receipt, logs,
original pin record, recorder change and preparation evidence are preserved.
No auditor assertion was weakened.

The [publication receipt](publication/published.json) records the pushed commit
and exact branch state. The [draft PR verification](publication/pr-verified-pending.json)
records PR #263 at that same HEAD, with CI pending at that observation. These
are historical observations, not a current CI result. This bundle intentionally
contains no new actual scientific-source operation or CI outcome; root owns
those later gate/result additions separately. The earlier publication hold
failure is also retained: an intermediate Rhizo copy inventory changed before
copying, and its hash gate stopped before any Rhizo tracked write.

The independent artifact reviewer checked bytes and recorded engineering
results without running package contents, tests or scientific source readers.
This publication preparation only copied and checked authorized public evidence.
No archive/wheel binary, private object or cache tree is included, and none was
opened by the publication preparer. Artifact identities remain in the release
record; this is not a bit-reproducible-build, physical-validation, independent
scientific-reproduction or recommendation-superiority claim. Prior scientific
blocks and negative findings remain unchanged.

[publication-copy-map.json](publication-copy-map.json) gives explicit original
and destination paths and SHA256 identities. Historical diffs or whitespace-
bearing logs use lossless UTF-8 JSON wrappers; original bytes reconstruct exactly
and original inventories retain their historical paths/hashes. Other evidence
is copied byte-for-byte. [publication-checks.json](publication-checks.json)
records file, receipt, link and whitespace checks. Source paths in historical
records are provenance rather than a request to open inputs.
