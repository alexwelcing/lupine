# Recorded census HTTP boundary tests

The first invocation passed all six methods (18 real loopback HTTP requests),
with no failures, errors, skips, or forbidden operations. Unittest reported
2.098 seconds; the enclosing process took 2.552493294 seconds on 2026-10-16,
13:48:37.791320–13:48:40.346418 UTC. The held server, asset, and public resource
identities matched before and after this run.

Promote only [tests/test_server_recorded_census.py](tests/test_server_recorded_census.py)
to `tests/test_server_recorded_census.py`. It resolves every expected resource
through `importlib.resources` from the imported package and contains no ignored
workspace path. The ignored runner selected the isolated full v3 package overlay;
this was not an installed-wheel run or a test of already-promoted tracked bytes.
The same test can be run against an installed package by selecting that package
on Python's import path.

The tests check the complete HTTP census JSON against the exact packaged public
resource and its immutable v1 hash, exact rational string preservation, explicit
`NOT_ADMITTED`/`UNKNOWN` and historical scope, omission of a missing optional
report without changing the remaining report, the exact packaged asset and
entrypoint under CSP, eight unavailable private/direct-resource/traversal routes
without resource access, and Host/Origin rejection before resource access.
They do not execute JavaScript or independently recompute the census arithmetic.
The separately owned browser tests address rendering.

The [first execution receipt](first/execution.json), [test outcome](first/result.json),
and [complete unittest log](first/stderr.txt) preserve the first run. Stdout was
empty. The test and both runners were held unchanged during execution. A later
`git diff --no-index --check /dev/null` emitted no whitespace findings (exit 1
indicates the expected nonempty added-file diff). An earlier discovery command
looked for nonexistent `tests/test_server_mpea.py`; that source lookup miss
preceded implementation and was not a failed product test.

The author wrote the prior census producer but did not write this server/UI
overlay. These are independent HTTP boundary tests, not an independent scientific
review or validation of physical accuracy. The audit hook allowed only the copied
public package and this test lane within the repository, blocked subprocesses
and non-loopback sockets, and recorded zero violations. No private projection,
original bound/reference object, census producer, source reader, or production
operation was opened or invoked. No tracked files were edited. This lane did not
re-hash all 335 original runtime files; the hold is explicitly the three tested
overlay identities plus the test and runners.
