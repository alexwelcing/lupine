# Verified local-extra header diagnostic — source schema remains blocked

Exact source `d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3` passed all four
original-push jobs in [CI 38880756519](https://github.com/alexwelcing/lupine/actions/runs/38880756519).
The final observation at 09:54:40 UTC preceded both actual archive commands.
Clean retained packaging, the strict verifier and independent source/wheel
audits also passed before either command. This closes G29's engineering scope.
It does not admit the source for scientific evaluation.

## Actual fixed-source result

The two predeclared commands ran at 09:54:48–09:54:50 and 09:54:51–09:54:53 UTC
on October 16. Each exited 2, with empty stderr, `BLOCKED_SCHEMA` and
`LOCAL_EXTRA_HEADERS_COMPLETE`. Both canonical public reports are byte-identical,
SHA-256 `52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e`.
The first local extra area rejected by the unchanged predecessor contains
exactly one complete field header: ID **41504 (`0xA220`)**, declared data length
**516 bytes**. Its header plus opaque data span is 520 bytes.

This is an inventory of one selected local area, not the first archive entry
or every extra field in the archive. The full source buffer was read, directory
names decoded internally, and the selected local fixed headers and TLV headers
interpreted. Field payloads were not interpreted, member names were not
published, no archive member was decompressed, and no XML, worksheet cell or
shared string was decoded. Header validation remains incomplete. Archive cleanup
completed without error. Rows, complete pairs, source groups and overlap counts
remain null; fits and splits remain zero. The recorded whole-buffer exposure
must not be described as untouched test data.

[Operation receipts](operations/production/final.json),
[first public result](public/1.json), [second public result](public/2.json), and
[independent actual audit](operation-review/actual-review.json) preserve the
result. The audit passed its first invocation: 11,189 checks, exit 0, empty
stderr, 2.829 process seconds. It checked public receipts, gate chronology,
canonical output, source identities and replay equality; it did not read private
objects or rerun the diagnostic. All 326 runtime files, clean HEAD and remote
branch held during the actual operations. Repetition is computational replay,
not an independent scientific sample.

## Exact-source engineering evidence

| Evidence | Observed result and scope |
| --- | --- |
| [Current CI](ci/final.json) | Original push, attempt 1, all four Python 3.11/3.12, browser and Lean jobs successful. Job metadata does not establish a new exact remote test count. |
| [Implementation source CI](prior-report-ci/b42-final.json) | Original `b42bd9a` push also passed all four jobs; current operations used corrected report descendant `d0505b9`. |
| [Previous report CI](prior-report-ci/c294-final.json) | Original `c294dbe` push passed all four jobs; separate from the current implementation gate. |
| [Clean package](clean-package/0-execution.json) | Exit 0, 20.438 process seconds; 28 demonstrations, six schemas and 16 mandatory installed checks. |
| [Strict retained verifier](clean-package/1-execution.json) | Exit 0, 0.915 process seconds, exact retained source and wheel. |
| [Independent artifact audit](artifact-review/actual-d0505b9b358a/review.json) | 3,492 Git source files, 326 runtime files, 115 wheel members, 114 RECORD digests, 108 package payloads checked. |
| [Additive artifact audit](artifact-review/additive-d0505b9b358a/additive-review.json) | All 323 predecessor runtime files and all 108 wheel package payloads unchanged. Whole wheel ZIP hashes are not claimed equal. |
| [Implementation tests](../phase2-li-local-extra-implementation-v1/PUBLICATION.md) | Final exact integrated source passed 248 Li tests; original fixture and formatting failures remain preserved. No additional full local suite is claimed here. |

The retained source tar has 74,997,760 bytes and SHA-256
`8c0cb60e847c07e8887ea29afd9649d524bdfdc49f4fa59a68247da66f399861`;
the wheel has 307,093 bytes and SHA-256
`b04beb40d502c54f1d91c6dfa719e8c17ef92f159e76c535141a249ecb94929d`.
[The artifact manifest](clean-package/release-artifacts.json) records their local
retention. This report publishes receipts and audit code, not the wheel, tar or
private scientific objects. External durable backup is not established.

The [recorder review](operation-review/recorder-review.json) retains an initial
overbroad continuation rule and its correction before actual use: unexpected
parser/locator failures stop after the first command, rather than triggering a
second attempt. Twenty-one synthetic recorder cases passed. Auditor preparation
findings and their original source are also retained. No actual operation was
retried after failure. Historical diff bytes that would trigger Git whitespace
checks are preserved in lossless UTF-8 JSON wrappers; the original ignored
files and their hashes remain available. The same lossless representation
preserves six mutation stderr logs with trailing spaces and a historical
Markdown snapshot whose original relative link no longer resolves after
relocation. [The publication precheck](publication-precheck.json) and
[additional wrapper map](additional-lossless-wrappers.json) retain that finding;
neither test results nor original log bytes were changed.

## Independent challenge and interpretation

[Six predeclared mutations](mutation-review/README.md) were all detected by an
unchanged 25-method synthetic subset. The baseline passed; each mutant produced
assertion failures with no runner errors or guard violations. These 175 method
executions challenge exact prerequisite agreement, cleanup, declared bounds,
the record cap, complete-or-null output, and independence from opaque payload
bytes. Subtest failure events are distinguished from unique failing methods.
The six selected defects do not establish exhaustive correctness or a general
mutation score. No actual archive was accessed in this challenge.

The separate [retained-standard research](../phase2-local-extra-semantics-v1/README.md)
predated the actual ID observation. APPNOTE describes `0xA220` as a growth-hint
field with a fixed signature and zero padding. The ID alone does not establish
that the payload matches, identify its producer or validate the archive. A new
bounded diagnostic can now be justified by the exact observed prerequisite;
it must retain initial-padding semantics as unbound and preserve the old readers.
No payload result is claimed by this checkpoint.

Root owns the next G30 implementation, independent tests, publication and
exact-source verification before any payload inspection. G20 remains unresolved
and G21 blocked: schema, same-test pairing, grouping, curation and source reuse
still require evidence. The historical research preview remains
`GO_RESEARCH_PREVIEW`; physical validity and general predictive superiority
remain `NO_GO`. No new DFT, allocation, fit, scientific threshold or exposed-test
tuning occurred. The expired automation stays disabled.
