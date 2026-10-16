# Independent generated review of the Li complete-readiness adapter

The held behavior implementation `540088bc…` passed the same 50 independent
methods after two reviewer-fixture corrections. The pure core remains exactly
`5fd1b06c…`. This is engineering evidence at the historical `2975d6d0…` baseline;
final production-source approval is blocked by the post-run historical-counter
contradiction described below, the separately published baseline repair, its
narrow rebind verification and root's release gates.

The first invocation ran all 50 methods and had six failures: five larger generated
inputs were accidentally constrained by a fixture's smaller source-size override,
and one substring oracle found `air` in the key `pairing`. The exact first source,
test, stdout, stderr and execution receipt are retained in [first](first/).
[The correction](fixture-correction-1.json) restores the unchanged published byte
cap only around inner generated parser calls and compares JSON string values.
No product code, production cap, replay expectation or acceptance assertion was
weakened. The corrected run passed all 50 methods in 21.790 seconds of unittest
time, 24.250281344 seconds of process time. Both runs had zero guard violations,
unchanged candidate/core inputs and all 339 runtime files held. These are **50
distinct methods**, not 100 tests.

[behavior-review.json](behavior-review.json) records the bound sources, actual
receipts, coverage and limits. The [portable test](test_li_v3_readiness_production_review.py)
embeds the independent generated ZIP/XML fixture definitions and never imports
author fixtures. Generated Git repositories and objects are created beneath this
review directory; the child guard rejects network, undeclared data reads and
nonlocal subprocess operations before importing the candidate. The source-only
[static audit](static-first.json) made 18 checks; those checks are not test methods.

The test suite covers fixed custody and paired-prior lineage, replay-before-XML,
complete A sheet names, B inventory caps and incidental-text exposure, exact C
sheet/row accounting, strict mapping and explicit structural-only negative frames,
and partial read/write/cleanup failures. No actual archive, private capture,
scientific labels or real-checkout production guard was accessed.

A directory close failure after public-file creation
can leave an earlier complete file while the returned report is blocked. The
actual operation recorder must bind returned/stdout/persisted equality and final
cleanup before freezing dependent pins. A post-run source review found that historical aggregate XML/member counters
can be zero alongside completed role ledgers. Root requires rejecting this
internal contradiction before final publication; the existing source reviewer
is deriving the necessary predicates. This bundle preserves the successful
50-method intermediate and does **not** approve that unresolved boundary. A
focused generated regression and new held correction will be separate evidence.
Exact original receipt pins and operational review remain necessary. Neither these tests nor receipt hashes establish
physical correctness, independence, fresh data or scientific admission.

The [narrow rebind plan](rebind-plan.json) is prepared, not executed. It allows
only the supplied baseline commit/manifest change, checks the single declared
runtime delta and retains all other pins, then selects four existing generated
guard methods. It does not rerun unrelated algorithms to inflate test counts.

All `.log` files are intentional evidence. A publication copy must include them
explicitly and verify their Git blobs; ordinary `git add` may omit globally ignored
logs. Historical snapshots and unexecuted prepared suites are labeled as such.
