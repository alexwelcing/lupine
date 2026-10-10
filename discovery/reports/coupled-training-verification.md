# Coupled kernel and training-only development verification

Executed on 2026-10-10 in the Linux x86-64 branch workspace with Python 3.12.14.
This checkpoint extends the [constrained release](constrained-release-verification.md).

- `python -m unittest discover -s tests -v`: **226 tests passed**, no failures,
  errors or skips, in 72.044 seconds. The complete log is
  [coupled-training-release-tests.txt](coupled-training-release-tests.txt).
- The new coupled kernel contributes 18 focused tests, including deterministic
  mapping order, lazy domains, exact certificate checks, all-retained fallback,
  strict ties and independent compatible-world checks.
- [A separate coupled audit](coupled-independent-audit.json) passes 10,003 checks
  across 11,027 synthetic worlds and 500 varied problems. It binds unchanged
  source hashes before and after; this is finite testing, not formal refinement.
- `python scripts/package_smoke.py --output reports/package-coupled-v1.json`
  builds and installs a noneditable wheel into a new environment outside the
  source checkout. All 19 existing cases select, verify and replay; the new
  coupled Python API and missing-point whole-universe fallback also pass.
  [Receipt](package-coupled-v1.json). The installed runtime has no dependencies.
- The [formal verification record](../formal/VERIFICATION.md) records the actual
  strict six-module build, 983 jobs, all **88 audited statements**, and eleven
  axiom-audit tests. Only the documented standard logical axioms occur.
- Before any actual training fits, a separate execution of both focused and
  independent numerical/custody suites passed **22 synthetic tests**. The
  [engineering receipt](training-tail-engineering-validation-v1.json) binds the
  precise implementation, tests, protocol and [log](training-tail-engineering-tests-v1.txt).
- Two fresh bounded training-only processes completed and reproduced exact
  predictions, metrics, decisions, metadata, and raw float artifacts. Scientific
  digest: `60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656`.
  [Reproduction receipt](training-tail-reproduction-v1.json). The scientific
  result is **NO_GO_MODEL_IMPROVEMENT**, not a software failure.
- A separate standard-library [arithmetic audit](training-tail-independent-audit.json)
  reconstructs all 96 metric summaries and 24 target gate evaluations, including
  the numerical guard. It checks 65,536 scalar OOF outputs, 16,384 saved-neighbor
  target averages, 49,152 raw ridge prediction quantizations and 60 binary seals.
  It confirms the same negative decision without importing runner arithmetic;
  it does not independently refit the models or establish scientific replication.

The web assets, HTTP server and CLI modes are unchanged at this checkpoint.
The 17 browser checks in [the preceding record](browser-constrained-v1.json)
remain historical evidence; they were not rerun locally for these Python-only
additions. Coupled JSON/CLI/browser integration is the next increment and is
not included in these counts. After publication as `b37d8db3acbcd98d761da451d348ac5b15df00c1`,
[all four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38069767606):
Python 3.11/3.12, source manifest, isolated packages, the 17 browser checks, and
the strict Lean build/axiom audit.

The checkpoint runtime byte inventory is [runtime-manifest-coupled-kernel.json](runtime-manifest-coupled-kernel.json).
The previous 98-file inventory is preserved as
[runtime-manifest-constrained.json](runtime-manifest-constrained.json).
Source hashes establish identity, not physical truth, independent scientific
replication, or a formal Python-to-Lean correspondence.
