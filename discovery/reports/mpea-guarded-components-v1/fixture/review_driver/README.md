# Independent constructed-driver review

This directory tests the persistent fixture driver with independently constructed
CSV bytes: 1,545 original rows, 314 eligible rows interleaved with ineligible rows,
75 assigned groups, and both populations' 960 policy runs. These numbers specify
fixture shape only. No experimental source, private features, archived targets,
actual allocation, or allocation entropy source is used.

The source-reviewed boundaries include sealed input metadata before decoding,
sealed development before model consumption, validated rank/panel references
before reserved decoding, full original plans before opening the evaluation
vault, policy-specific request capabilities, and the completed-replay barrier
before full truth audit. Strictly typed, reconstructed kernel objects and complete
sealed plan comparisons are required; digest strings alone do not grant access.
The author repaired these checks before the independent full execution. A raw
zero-denominator error for the spelling `1/00` was also closed before execution.

The first full execution is preserved in `tests-first.txt`: 14 tests, 13 passed,
one failed. The failure was a reviewer test assumption: retained IDs are in
ranking order while original IDs are sorted. Equality of those ordered tuples
was too strong for the required all-candidate fallback. The assertion was corrected
to exact ID-set equality plus equal length, without changing the implementation
or scientific rule. `test_fixture_driver_review-first.py` preserves that test
version. An initial multiline-with syntax error was corrected during test authoring,
before any driver test ran. Shared execution load made the first run take 305s;
no test or scientific timeout was increased, and fresh processes completed within
the original 60-second per-process test limit.

The final 15-test run adds a resealed-input guard: changing an allocation eligibility
field or replacing ordinal zero with bool false must stop before the target parser.
Other controls include opaque invalid UTF-8 canaries, complete framing before any
numeric decoder, no-model/no-reserved NO_GO, one missing evaluation group's global
primary fallback, preserved empty secondary panels and empty runs, immutable tokens
and own history, wrong-order/duplicate/copied/cross-policy/cross-attempt requests,
incomplete or duplicate ledgers, vault substitution, closed failure prefixes,
source changes before target access, and two fresh-process scientific-chain matches.

The driver is a constructed-fixture integration, not a production registration,
source-reader, entropy allocation, resource supervisor or hostile-Python sandbox.
The trusted scheduler/custodian owns both vaults; policy consumers receive only a
bound oracle and their own observations. Interpreted evaluation outcomes become
available to the evaluator after the complete calibration artifact is sealed;
full audit access remains blocked until replay completes. Capturing and framing
mixed source bytes still observes bytes outside the authorized interpreted cells.
This does not establish physical accuracy, independent experimental sampling, or
formal Python-to-Lean refinement. The numerical study kernel's separate review
remains the arithmetic evidence; these tests concentrate on orchestration and
custody around that unchanged kernel.
