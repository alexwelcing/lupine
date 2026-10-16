# Independent growth-hint production-binding review

The first independent invocation passed all **21 focused test methods** on
2026-10-16 (unittest 0.620 s; recorded process 2.503269385 s). No retry or broader
suite was run. Source, test, contract and guard-runner hashes were unchanged
across execution. The original stdout is empty; stderr contains the ordinary
21-test success log, without exception canaries or cleanup warnings.

The test is independently authored by `/root/phase2_planner/ui_review`, using
this reviewer's earlier raw ZIP fixture builder. No author fixtures were read
or imported. The final test has exactly one trailing newline.

- Product: `1a2bd6443bfe090ab3264b82b60f105cfad16f40182b716f032fd773a2e8354a`.
- Test: `13db80f49a6d8f83df58a3f2ae22f27450e5367c156368333db1908f90d01f85`.
- Contract: `e0ca28ad61181c6cf56d20a46733d2285acb6cb5bc39348f46ee3acb29dfcbc6`.

See [execution receipt](first-run/execution.json), [original log](first-run/stderr.txt),
[scope observation](first-run/scope-observation.json), and [review](review.json).
The first-run directory retains the exact executed test, implementation and
contract. `preparation.json` is a historical fixture-preparation record, not the
final test identity or result.

The bounded checks cover the fixed prerequisite constants and 25 public source
pins; strict canonical receipt applicability with synthetic hash rebinding;
four-file committed/index/HEAD consistency using fake Git results; detached
identity maps; fixed slot/argument closure; prerequisite-first ordering;
same-buffer A220/516 field matching; capture and source failure paths;
incomplete reads; write, partial-write and descriptor-close errors; occupied
slot replay; closed CLI output; and no member decompression or XML processing.
Pure synthetic input continues to permit its prior bounded lengths while
remaining unbound to production prerequisites.

All external dependencies were replaced before invoking the current production
wrapper or context. Default rejecting mocks are checked for accidental use.
A profile hook rejects real predecessor contexts/readers; an audit hook rejects
private custody file access, child processes and networking. The observed 9
current-context and 41 current-wrapper calls therefore exercise mocked control
flow. Both forbidden-call lists are empty. No actual custody receipt, capture,
object, payload, production guard chain or network was accessed. Public code
pin checks used direct read-only file hashing.

The receipt validator uses generated minimal applicability JSON and a narrowly
patched digest for semantic rejection cases; this does not prove that an actual
receipt satisfies the predicate. Parent review separately owns the public
receipt binding. Likewise, fake Git and identity results do not establish an
actual committed-source or custody event.

Source inspection found one new-code error before this execution: using the
unchanged custody exception for a new prerequisite code collapsed that code to
`INTERNAL_FAILURE`. The author added the local closed `GrowthHintError` before
either candidate test invocation; the independent test verifies the local code
and unchanged predecessor vocabulary. There was no failed executable attempt
in this independent lane. The author also corrected a contract-only chronology
sentence before this run. Historical author files are owned separately.

Write/close failures clear shape projections while retaining earlier exposure.
A successful write followed by descriptor-close failure leaves a previously
written matching report and a returned guard failure; the test preserves and
checks that chronology rather than claiming atomic rollback. Slot checks are
not a concurrency lock or general at-most-once reading proof.

This is bounded synthetic and mocked engineering evidence, not physical
validation, archive acceptance, semantic legitimacy, production readiness or
exhaustive adversarial coverage. Every scientific status stays blocked, and
initial-padding semantics remain unbound. No actual payload result is assumed.

For a new local reproduction, retain the candidate source/contract and run
`python -B .cache/phase2-growth-hint-production-review-v1/independent/run_review.py new-run`
from `discovery/`; choose an unused run name. The runner verifies the exact held
hashes and launches the guarded suite. Its paths intentionally target this
ignored candidate layout. After promotion, the test itself prefers the tracked
script and can run as `python -B tests/test_li_v3_growth_hint_review.py -v`.
These commands are reproduction instructions, not a claim that another run or
the promoted-tree checks already occurred.
