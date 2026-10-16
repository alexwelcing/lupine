# Integrated local-extra diagnostic

The bounded first-local-extra field-header diagnostic is integrated under
`discovery/`. Root's actual combined run passes all **248 Li tests**, exit 0,
with **326 runtime files held** and all **323 predecessor runtime files
unchanged**. The implementation adds one script and two test files plus its
[frozen contract](../../docs/li-v3-local-extra-headers-plan.md). It does not
change an existing archive reader or admit this dataset.

The [standards-based design](design/README.md), [candidate report](README.md), [independent executable review](independent/review.json)
and separate source argument preserve their original review scope. Author
checks passed 19; the independent final run passed 30. Its first run failed
one fixture expectation about the unchanged filename-length limit; original
bytes and logs remain available. Root separately reviewed the implementation
and contract before integration.

The [first integrated execution](integrated/execution.json) passed 248 tests
on October 16 at 09:17:51–09:18:00 UTC, 6.381 unittest seconds / 9.057 process
seconds, with all 326 runtime files held. The later staged whitespace check
failed on two redundant final newline bytes in the new independent test and its
historical snapshots. Root removed only those final two bytes from the production
test; its original bytes and the initial check observation remain in the
[correction record](integrated/format-correction/correction.json). Historical
snapshots are preserved in lossless UTF-8 JSON wrappers rather than rewritten.

The [final integrated execution](integrated/final-run/execution.json),
09:24:44–09:24:47 UTC, passed all 248 tests in 3.232 unittest seconds / 3.755
process seconds, exit 0. All 326 final runtime files held and all 323 predecessor
files were unchanged. Full [output](integrated/final-run/stderr.txt) is retained.
The final production review-test SHA-256 is
`570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e`;
the initial candidate/promotion inventories describe the prior bytes explicitly.
No implementation or assertion changed. Both combined runs use synthetic
source fixtures and mocked production boundaries.

Actual fixed-source field-header inspection has **not run** at this
publication checkpoint. Root must verify this commit's original CI, retain
a clean package and complete the independent artifact audit before invoking
the frozen two-slot operation. Unexpected parser, locator or predecessor
errors must stop with the first result preserved; ordinary structural
truncation/limit diagnoses may be computationally replayed under the fixed
contract. No profile adjustment or cap change follows automatically.

Every diagnostic remains BLOCKED_SCHEMA. A complete ordered ID/declared-length
list describes structure, not the meaning or harmlessness of its field bodies.
Whole archive bytes are still acquired and hashed; the predecessor privately
parses central-directory metadata. No member decompression, worksheet/XML
decoding, outcome validation, row pairing, independence, fitting or scientific
allocation occurs in this increment. Scientific usefulness and physical
performance claims remain unestablished; all prior negative results stand.
