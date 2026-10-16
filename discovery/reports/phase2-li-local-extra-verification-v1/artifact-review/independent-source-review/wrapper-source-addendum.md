# Recording wrapper and final pins: source-only addendum

Reviewer: `/root/finite_inverse_check/artifact_adapter_review`.

**PASS, source review only; no concrete blocker found.** The reviewed wrapper is
`run_recorded.py`, SHA-256
`3b029be3e937f57219246d8feac8fc13a90a36d8ea2a6f0b431d16f1a5cf7478`.
This addendum preserves the earlier review, first findings, static comparison
and original inventory unchanged. Neither wrapper nor auditor was executed or
imported. No package, project reader, private custody object or network operation
was invoked. No new candidate tests were performed by this reviewer.

The wrapper constructs exactly two subprocess commands, using `sys.executable`
and the fixed local `audit.py` and `additive_audit.py` paths. It checks their
source digests before invocation against respectively
`b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119` and
`6b267cd11a73b0f73c63a7b9ae2ba75d30f9699edf14e41c5fd1f98f4932ce2a`.
Both observed source files still match those identities. The source resolves the
working directory to `discovery/` from the wrapper location. There are no package
build/test, source-reader, shell, acquisition or network commands in the wrapper.
The two reviewed children perform local artifact/source auditing; this remains a
controlled-input workflow, not a general security validator for arbitrary inputs.

The full audit is first. Both commands receive the same supplied commit and
retained-directory arguments. The additive command receives the first audit's
specific `review.json` path and the fixed local `reviewed-pins.json` path. A
nonzero full-audit return code exits the wrapper before the second command. The
additive auditor independently requires a full PASS for the same commit, exact
full-auditor identity, matching receipt bytes and artifact identities, plus the
323-to-326 runtime and four-pin checks reviewed previously. Both children require
assertions enabled. The wrapper explicitly rejects superseded commit
`b42bd9a94385ad43c3c2ac022584dae6bd135254` in its normal invocation; root still
supplies and verifies the corrected operational commit outside this wrapper.

The wrapper's final message says only that both read-only audit processes exited
zero. It does not independently verify remote CI or claim scientific validity.
Actual future artifact and execution evidence remains pending in this review.

The current final pin record, SHA-256
`af2fbb73b2c48c293ca7ab034e9fa2322d7b7382c5b556fc918bb85371fd7bb1`,
now records `FINAL_REVIEWED_SOURCE_PINS`, the a6e87c1 baseline and the four intended
files. The final independent test pin is
`570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e`;
the current production test bytes have that digest. The prior test is preserved
at `format-correction/independent-test-before.py` with digest
`24e54f7674a116a043aecaf3e5b396aba3139eb1739998f45ab5149c82b5602b`.
The recorded normalization rule is `new == old.rstrip(b'\n') + b'\n'`, a reduction
from 40,327 to 40,325 bytes: exactly two LF bytes, not one. The normalization
review records AST equality; this addendum did not rerun that AST check. The
final pin record binds the separate 248-test integrated execution receipt; this
reviewer inspected that reference, not the test execution or its full logs.

The prior pin record remains present with digest
`9ca937d072a81797d1434e2053f41ef75815c2ca9cb645734051d05c33d28b6c`.
The first byte-count expectation failure is preserved in
`test-eof-first-byte-count-finding.json`, digest
`916a62af22a9c94e811779ab71bcdf7d1d6e5658cad4149071af3b257ecb727a`.
It correctly identifies a reviewer metadata expectation failure, with the
original tool output as the first process record and no separately redirected
log. It is not relabeled as a candidate test failure. The corrected normalization
record remains separately preserved with digest
`27bed9433adffcfafe29e2604f418c4c300144f10d8be4d59724087da53fed48`.

The wrapper checks the final pin status and records its SHA-256 before each
child; it does not hardcode the complete pin-record digest or authenticate review
authorship. Root's supplied final pin record remains the trusted review input.
The additive auditor validates its structure and source bindings and rechecks
its bytes at completion. The earlier source-review requirement to verify the
concrete final pin-file identity therefore remains applicable.

First attempts are protected by exclusive creation of the per-commit run
directory, start records, log files and execution records. The child output
directories are also exclusive. There is no retry, cleanup or overwrite path.
Ordinary nonzero child exits retain start/log/final execution records and stop
progression. `subprocess.run(..., timeout=180)` raises on a timeout before the
wrapper writes that child's final execution JSON; the exclusive start record
and partial logs remain. Invocation failures likewise may lack a final execution
receipt. Such attempts must be reported as failed or incomplete, never as a
completed successful audit. A second wrapper call cannot silently overwrite
that occupied attempt directory.

Original review inventory SHA-256 remains
`968c3ea1d3f95147d245cb46eba8594f9e72490b27e44798e5451517f37e7e3c`.
The companion addendum hash list is separate; the original inventory was not
rewritten to conceal or retroactively include this later review.
