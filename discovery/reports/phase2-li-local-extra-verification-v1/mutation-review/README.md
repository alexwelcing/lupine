# Bounded local-extra mutation adequacy check

The unchanged independent synthetic suite detected all six defects declared before execution. The baseline passed all 25 selected methods. Each mutant ran those same 25 methods once in a fresh process and produced assertion failures, with no test errors, survivors, invalid mutations or harness failures. No test or mutant was adjusted after observing a result.

| Case | Deliberate defect | Assertion failure events | Unique failed methods |
| --- | --- | ---: | ---: |
| Baseline | Unmodified production source | 0 | 0 |
| m01 | Bypass exact predecessor classification equality | 14 | 4 |
| m02 | Bypass the successful archive-close prerequisite | 5 | 2 |
| m03 | Ignore the declared TLV data-span bound | 6 | 1 |
| m04 | Raise the frozen record cap from 256 to 257 | 5 | 2 |
| m05 | Publish an accumulated prefix on header truncation | 6 | 1 |
| m06 | Make the field ID depend on an opaque payload byte | 23 | 6 |

Failure events include separate subtest failures and are not counts of test methods. All six mutations introduce concrete defects; none was treated as an equivalent or unreachable control. This is a finite check of the existing tests' sensitivity to those defects, not a general mutation score, total correctness proof, archive semantic validation or scientific result.

## Declaration and unchanged inputs

`declaration.json` was sent to root and parent before baseline or mutant execution. SHA-256: `9f21914c7f8742e54aa23eeee5bfccebbdc57dcdd0da8ea9f787ca9f28383fb0`. It contains the exact replacements, resulting source/diff identities, all selected and excluded method names, execution order and stop rules. `execution-plan.json` separately binds the runners and runtime manifest before execution.

The source is `54db58a567afc9211303f2edff13541ab2f97beb77ef2edaa518ad32bf6b1026`; the unchanged production independent test is `570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e`. The parent reported commit `d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3`; this reviewer did not invoke Git. The current test differs from the earlier held `24e54f…` copy by two removed trailing LF bytes; parent independently reviewed that normalization. This run uses the exact production bytes, copied as `unchanged-independent-tests.py`.

Five methods invoking `diagnose`, production source context or their synthetic production harness are excluded. The remaining 25 methods cover inspection, helper boundaries, cleanup, synthetic digest/receipt stubs, and read-only hashes of public predecessor code. Their source is unmodified. The sole test-module selector change sets `SCRIPT` to one isolated baseline/mutant before class setup. Production functions and inspected helpers are not replaced by the runner.

Python profile instrumentation rejects any discovery call to `production_context`, `diagnose` or `_read_relative` before its body executes. An audit hook rejects private custody file opens, socket creation/connect/DNS and child process creation; it is installed before importing the test copy. No such call or event was recorded. Bytecode writing is disabled. No actual workbook, capture, prerequisite receipt, private custody object or network resource was accessed.

## What failed

- **m01:** The suite observes changed guard reasons with a mocked locator, and non-null inventories on concrete synthetic mixed-rejection and overlong-name fixtures. This is synthetic guard detection, not an observation of actual archive disclosure.
- **m02:** The real synthetic archive-close fault incorrectly returns `LOCAL_EXTRA_HEADERS_COMPLETE`; cleanup-state stubs also yield the wrong guard reason. The baseline verifies stderr/GC cleanup behavior; a failing mutant method can stop before its later assertions.
- **m03:** Oversized declared field data incorrectly returns a complete result instead of `EXTRA_DATA_TRUNCATED`.
- **m04:** A short tail after 256 records changes error precedence, and the helper no longer rejects the 257th record.
- **m05:** Non-null partial output is caught by the common inspection assertion requiring a completed walk for every published list (`False is not True`). This occurs before the method's later explicit null-list assertion.
- **m06:** Exact known IDs change, and the direct equality check for equal headers/lengths with opaque payloads starting with `P` versus `0xff` also fails.

All first stdout/stderr streams, event details, elapsed times and exits are retained under `runs/<case>/`. Every case has before/after snapshots of all **326** files declared in the public runtime manifest, which has SHA-256 `e806d052dcfaadc5bbc0a9378318709da011fbaf3a53a290aa6141014bae3959`. Every actual file digest matched its declared digest before and after every run. The declaration, exact test, all isolated source/diff files and runners also remained unchanged. Only this new ignored review directory was written.

`results.json` summarizes the seven invocations; `review.json` binds their receipts and limits. `inventory.json` covers reviewer-owned files except itself and the independently owned `parent-audit/` subtree. It does not certify future additions. To replay, use the same frozen public checkout and stage the declared inputs/runners into a fresh ignored directory; exclusive per-case output directories intentionally prevent overwriting these historical runs. No production reader or scientific experiment follows automatically from this adequacy result.
