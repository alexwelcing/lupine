# Independent compatible ZIP diagnostic review

The first executed independent suite passed 24 tests against the source held at
`59b4b549a1de33abf2c54ccfce15f4f980a3a36351f98e246ae4e9fd6c44c5d3`.
`review.json` records exact source/contract/test hashes, scope, and coverage.
`attempt-1/` retains the command, actual stdout/stderr, before/after hashes, and
exact executed source/test snapshots. The process exited 0; all bound files were
unchanged. A prior preflight hash mismatch stopped before any test execution;
it is recorded separately and is not counted as a test run.

Fixtures pack synthetic local, central and EOCD records directly. Production
cases use mocks and synthetic bytes; no actual source identity, private object,
actual custody receipt, archive cause, package installation, or CI was validated.
No implementation-author fixtures/tests were imported. Public prior source/test
files were hashed only to check frozen source bindings. Layout work remains paused;
its prior fixture file was neither changed nor executed.

Run the held independent tests from `discovery/` with:

```sh
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s .cache/phase2-li-compatible-diagnostic-review-v1/promotion/tests -p test_li_v3_compatible_zip_diagnostic_review.py -v
```

The test loader uses a promoted tracked diagnostic when present, otherwise the
candidate. A later run must record which source hash it actually exercised.
The held source snapshot is evidence, not a standalone production installation.
No actual diagnostic run is authorized by this review alone; root publication,
exact-commit CI/package checks and existing production guards remain required.
