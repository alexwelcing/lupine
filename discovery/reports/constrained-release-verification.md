# Constrained research-preview verification

Executed on 2026-10-10 in the branch workspace, Python 3.12.14. This record
describes software and reproducibility checks. The constrained experiment's
useful-screening and recommendation-value gates both **FAIL**; see
[the measured result](constrained-result-v1.md).

| Check actually executed | Outcome | Evidence |
|---|---|---|
| `python -m unittest discover -s tests -v` | 186 tests pass | [Complete log](constrained-release-tests.txt); includes 34 constrained custody/replay/projection tests, 11 reproduction-workflow tests, 7 sharpness and 7 diagnosis tests, plus existing runtime/IO/oracle/HTTP checks |
| `python scripts/browser_smoke.py` | 17 Chromium checks pass; zero JavaScript errors | [Browser record](browser-constrained-v1.json); actual measured gates, both arms, all budgets and exact result identity visible; mobile table keyboard scrolling and no page overflow |
| `python scripts/package_smoke.py --output reports/package-constrained-v1.json` | Isolated noneditable wheel passes | [Package record](package-constrained-v1.json); all 19 cases select/verify/replay; three schemas; original scientific resources and constrained negative results packaged and served |
| `lake --wfail build` | Five modules, 981 jobs, no warnings | [Formal record](../formal/VERIFICATION.md) |
| `python3 audit_axioms.py` | 69 statements pass independent elaboration/axiom audit | [Source-bound inventory](../formal/theorem-inventory.json); only standard logical axioms |
| `python3 -m unittest test_audit_axioms -v` | 11 tests pass | [Formal record](../formal/VERIFICATION.md) |
| Fresh-wheel source/model reconstruction | All six original artifact identities match | [Receipt](constrained-reproduction.json); new virtual environment, isolated imports, same host and verified raw source bytes |
| Complete fresh-workdir workflow | All six stages complete; scientific digest MATCH | [Result](constrained-workflow-reproduction-v1.json), [source/environment binding](constrained-workflow-start-v1.json); reused only raw archive bytes and recomputed every derived artifact and policy result |
| Independent arithmetic/history reconstruction | PASS: 10,300 histories, 61,800 budget snapshots, 206,000 reveals | [Audit receipt](constrained-independent-audit.json); separately expressed calculations, no selector/replay helpers imported |

The browser checks run an ephemeral local server and exercise the same selector
used by the CLI. Desktop and mobile screenshots were inspected. They are
interaction checks, not scientific validation. No production deployment or
merge to the default branch is part of this checkpoint.

The 34 constrained engineering checks were separately executed and source-bound
before the first evaluation-target opening. Their original
[receipt](constrained-engineering-validation.json) and
[log](constrained-engineering-tests.txt) remain unchanged. Later integration
checks do not retroactively replace that pre-replay evidence. Frozen producer,
replay, projector and core bytes are preserved so the original experiment can
be reconstructed without a silent implementation correction.

The full scientific report and its compressed copy are local reproducible
artifacts containing revealed archive values. The compact report is bundled
for the interface. Source attribution, point-target limitations, failed gates,
unsupported shift diagnostics and exact denominators remain visible.

The current byte manifest is [runtime-manifest.json](runtime-manifest.json).
Earlier engine-extension bytes remain in
[runtime-manifest-engine-extensions.json](runtime-manifest-engine-extensions.json).
These hashes establish source identity, not physical truth or formal refinement
of Python into Lean. Local executed checks and remote CI are distinct evidence;
the journal records remote results once observed.

The complete rerun reproduces scientific identity
`cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900`.
Machine timings, paths and engineering-log identities differ as expected; the
normalized identity covers the frozen scientific inputs, policy results and
gate checks. This is same-host, same-source computational reproduction, not an
independent scientific sample or prospective study.
