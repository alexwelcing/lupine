# Temporary Git fixture housekeeping repair

The original [bd7 CI run](https://github.com/alexwelcing/lupine/actions/runs/38941904627)
completed 2,077 tests in Python 3.11 with one error: `TemporaryDirectory` cleanup
found `.git` nonempty after `test_own_source_worktree_drift`. Python 3.12, browser
and Lean jobs passed. This failed run is retained, not retried or replaced.
Earlier exact eaed and cb19 runs separately passed all four original jobs.

An ordinary `gh` log delivery returned Forbidden; the authorized GitHub connector
subsequently retrieved the official log. The failure excerpt and acquisition
receipts retain both facts; the signed delivery URL is not published. The
connector returns decoded text, so its recorded digest is of retained decoded
text rather than a claim about compressed transport bytes.

The unchanged original module passed 60 local Python 3.11 tests, but Trace2
observed **121 detached automatic-maintenance launches**. An added regression
with inherited housekeeping enabled failed against the original helper and
reported the detached child command. [Independent official-source review](git-review/README.md)
confirms the mechanism in Git 2.52 and 2.55. The exact writer in the original CI
race remains unidentified; the local cleanup race was not reproduced. Local
Python 3.11.16 differs from CI 3.11.17 and local Git 2.52 from CI 2.55.

Only the generated fixture's Git helper now sets command-scoped
`maintenance.auto=false` and `gc.auto=0`, overriding inherited host settings.
Strict temporary cleanup, all existing drift/no-target assertions, runtime
source guards, scientific readers and benchmark protocols are unchanged.
The regression checks actual Trace2 child launches after an empty commit.
The repaired 61-method module passes on local Python 3.11 and 3.12, with no
automatic housekeeping launches in either trace. Independent integrated review confirms old assertions are unchanged; an extracted
cleanup negative control still reports an injected ENOTEMPTY as a unittest error.
That control is not a product-test rerun. There is no retry/sleep or
ignored cleanup exception. This is fixture lifecycle evidence, not physics.

The manifest still binds 351 files: 350 unchanged and this one test file changed.
Formal source and installed wheel payload source are unchanged. Exact new-head
CI and clean packaging are pending publication at this checkpoint; predecessor
passes do not establish them. Actual final hash/run/decision will be recorded
in [draft PR263](https://github.com/alexwelcing/lupine/pull/263) after observation.
The source-only candidate review predates the added regression; its candidate
hash is not relabeled as the integrated file. The original complete logs/traces
remain in the working evidence lane; this public packet retains bounded excerpts,
actual process receipts and stream files, not scientific data.

Owner: root. Next: publish and verify the repair's exact remote, all original CI
jobs and clean installed package/strict retention. G20 remains unresolved and G21
blocked; physical-performance/general-superiority NO-GO, all negative scientific
results and the disabled historical automation remain unchanged.
