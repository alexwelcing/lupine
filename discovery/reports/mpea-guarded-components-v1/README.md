# Guarded archival components and workbench: constructed-data checkpoint

This increment integrates the reviewed filesystem stage store, fixture study
driver, network/resource supervisor, aggregate report projector and archive
workbench. **The actual MPEA study is still unregistered.** No real allocation,
performance target, completeness decision, threshold or model fit occurred.
The interface therefore shows an unavailable archive report, not a result.

The preceding `b442e53dc1e7e0e7bf3b2576ebc4e76f69afb28c` source is confirmed
on the remote branch and passed all four Discovery Verify jobs in
[run 38084821268](https://github.com/alexwelcing/lupine/actions/runs/38084821268).
This report describes the next local tested snapshot; publication and its CI
must be verified separately rather than inferred from those prior jobs.

## Executed verification

The [complete Python execution](integrated-verification/python-execution.json)
passes **981 tests in 374.132 unittest seconds**, with **244 source/resource
hashes unchanged**. The [integrated Chromium run](integrated-verification/browser-report.json)
passes **56 checks**, binds **47 source/resource hashes**, and records no
JavaScript errors. Exact logs and copy identities are in
[the verification summary](integrated-verification/summary.json).

Independent component checks include 21 supervisor tests, 22 store tests,
15 fixture-driver tests and 24 projector tests. The final main-layout focused
runs pass 41 supervisor, 22 store, 15 driver-review and 38 projector checks
(35 together plus three initial-consistency regressions). The full suite also
includes ten author driver tests and two actual network-namespace worker tests.
The browser review compares 1,536 exact policy/cap/same-cost cells and checks
320/390/768/1440-pixel layouts with details open. These are constructed inputs.

From `discovery/`, the portable main commands are:

```sh
python -m unittest discover -s tests -v
python scripts/browser_smoke.py
python scripts/runtime_manifest.py
python scripts/mpea_ui_fixtures.py --output .cache/mpea-ui-new-run
```

The fixture generator requires a fresh output directory. Its five aggregate
reports reproduce the reviewed JSON bytes exactly. They reside only under
`tests/fixtures/mpea_ui/`; none is installed as an actual scientific result.
The browser suite covers missing, inadequate, unknown, complete-negative and
constructed-positive cases. Its positive verdict supports only designing a
further independent study. The existing six engine modes remain available.

## Boundaries and preserved failures

- The supervisor establishes a real network namespace before target work,
  checks ordered UTF-8 stage messages, enforces a cumulative wall clock and an
  observed resident-memory threshold, and terminates surviving same-session
  children. The [prospective operational amendment](../../docs/mpea-t25-operational-enforcement-v1.md)
  explicitly distinguishes sampled RSS from an instantaneous memory ceiling.
  This is a cooperative workflow boundary, not a hostile-Python sandbox or
  proof that arbitrary supplied commands are the registered implementation.
- The fixture driver seals development and all reserved rankings before later
  disclosures, validates the complete fixed schedule, and charges issued
  target-bundle queries including unresolved values. Its fixture source still
  rejects the real archived source identity. Production registration, source
  access and fresh-process reproduction are the next separate integration.
- The public projector accepts typed, upstream-validated context and emits only
  aggregate outcomes. Empty denominators remain null; unavailable stages have
  no performance verdict. Scientific identity excludes usage and execution
  receipts while preserving scientific inputs. A checksum does not authenticate
  supplied upstream context or prove physical validity.
- Independent reviews fixed stage-store symlink/publication races, a failed
  durability operation leaving a completed stage, decoder/plan ordering,
  UTF-16 message acceptance, post-completion traffic and metadata contradictions.
  Initial failures and exact source histories remain in this bundle. A first
  main-layout promotion broke reviewer temporary/import paths; only test paths
  were corrected. Initial browser test mistakes and the real narrow-screen
  provenance overflow are also preserved. Synthetic success timing allowances
  changed during supervisor development; production resource limits did not.

[The copy ledger](artifact-copies.json) records 184 losslessly preserved historical
artifacts (182 direct copies and two UTF-8 log envelopes). [Final source identities](promotion/final-main-identities.json) and
[main test-path adaptations](promotion/main-review-path-adaptations.json)
distinguish current files from historical review snapshots. Some original
receipts reference ignored author scratch paths; their hashes and preserved
logs are historical evidence, not portable execution commands. Raw path-only
diffs are stored losslessly as JSON strings. The root's driver receipt check
is a verification of an existing executed review, not an additional test run.

The source-specific kernel, parser and sampler retain their reviewed bytes.
The runtime-manifest tool now treats nested test fixtures identically in its
staged and worktree views; two temporary-repository tests check that closure
and detect mutations. The prior 202-file manifest is preserved separately.
The 130 conditional formal statements are unchanged; no new local formal
build or installed-wheel run is claimed for this dirty source checkpoint.

## Scientific decision and next action

Every previous scientific negative remains unchanged. The new tests establish
software behavior on constructed cases, not archival utility, physical
qualification, exchangeability, or a Python-to-Lean refinement proof.

Root owns integration, publication, remote identity and CI verification.
The custody engineer and independent reviewer own production source access,
shared scientific flow and fresh-process original/fixed-allocation execution;
the registration engineer and reviewer own authenticated CI registration and
a durable single-attempt allocation ledger. Complete those paths, rerun the
integrated controls and publish a green freeze before any actual allocation
or target interpretation. The bounded release decision remains due 2026-10-14.
