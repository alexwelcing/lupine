# Fresh fixed-role recomputation assertion failure

The exact held test fails at line244, comparing the full allocation identity
triple of two independent `run_synthetic` computations. The earlier assertion
that all eight scientific stage identities match succeeds. Both allocation
scientific hashes are dba06bafa0360f717ccc90c5c26cc01943697354867473764f15843017519311;
byte/content hashes differ because the allocation receipt now binds measured
resource usage. The focused1-test failure and unchanged source map are retained
in exact-test.log/json. No runtime producer defect is established by this failure.

The two-file test/helper candidate exposes the child's verified allocation
envelope and exact route identity/hash. Assertions recompute the child's full
identity, verify its canonical envelope against the exact fixture source and
registration, compare exact scientific preimages and fixed-role route bytes,
and require equality of complete receipts/content/byte hashes exactly when
usage is equal. All other allocation fields must match byte-for-byte after
removing only usage/content seal; all original eight-stage/evaluation/count
checks remain. No timeout changes.

The distinct genuine fixed-allocation reproduction test still requires exact
original allocation and route bytes and forbidden entropy. Its two files are
retained in before/ and remain untouched. This correction distinguishes fresh
computation from importing an existing sealed allocation; it does not weaken
the production reproduction contract.

All inputs and executions here are constructed fixtures. No actual archive,
feature table, targets, entropy provider or production registration is used.
The main source/test/spec hold is unchanged; candidate edits exist only in this
ignored diagnostic directory.
