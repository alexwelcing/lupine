# Required namespace capability in hosted CI

Published source `a67815e60561df1ea08a44e63227e2e3b6780c6c` matches the
remote branch. [Discovery Verify run 38087285589](https://github.com/alexwelcing/lupine/actions/runs/38087285589)
completed with browser and Lean success, Python 3.12 failure, and matrix
cancellation of Python 3.11. The Python 3.12 run executed 981 tests in 201.568
seconds and recorded 57 failures plus one error. The guarded tests encountered
`NETWORK_ISOLATION_UNAVAILABLE`; downstream expected-stage assertions therefore
failed. This is a failed CI checkpoint, despite the earlier successful local run.

The complete official run/jobs/remote response is retained in `original-ci.json`.
The exact failed-job log is losslessly encoded in `original-failure-log.json`.
Its namespace refusal does not establish a particular host-policy cause.

The Python jobs now pin the supported `ubuntu-22.04` hosted runner and require
an explicit preflight: a distinct network namespace with loopback as its only
interface. The same preflight executed successfully on the current local host.
That local check is not an execution on the hosted Ubuntu runner. All existing
isolation and behavior assertions remain unchanged; no tests are skipped, no
runtime fallback permits network access, and no host-wide security setting is
changed. Matrix fail-fast is disabled so both Python versions report their own
outcome. The next pushed run must establish that this runner satisfies the
capability and all four jobs pass before any actual study can register.

Root owns this CI repair and remote verification. The reviewed production
registration/store integration continues in a separate uncommitted increment.
No real allocation or performance target was opened. All scientific results and
claim limits remain unchanged.
