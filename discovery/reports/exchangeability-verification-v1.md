# Finite permutation-law bridge verification

Date: 2026-10-10. The extension derives equal indexed failure probabilities from
an invariant finite joint score law, then applies the existing deterministic
count and finite-sum risk bound. It replaces an explicit symmetry premise in
the final new theorems with support closure and invariant atom weights. No
scientific dataset, runtime selector, ranker or benchmark result changes.

## Actual checks and source identity

- `lake --wfail build` passes all nine default modules, 1,013 jobs.
- A fresh `python3 audit_axioms.py` passes all **125 statements**, with only
  `propext`, `Classical.choice` and `Quot.sound`.
- All **11 audit-parser tests** pass.
- The new source matches the independently reviewed scratch source exactly:
  `0e326c4b51e5ca00d1deb32be61ba7b80ca0c443059d0fbf13e22f05717610ce`.
  All eight previous Lean sources are unchanged. The original 117-statement
  inventory and axiom output are preserved under `formal/history/g16-*`.
- [Integration receipt](exchangeability-formal-integration-v1.json) records
  commands and source/log bindings. The root independently rechecked the nine
  module hashes, current inventory/output hashes and each copied execution log.
  The [formal verification record](../formal/VERIFICATION.md) gives the full
  theorem and dependency scope.
- [Independent review](exchangeability-independent-review-v1.md) and its
  [execution receipt](exchangeability-independent-review-v1.json) record a fresh
  strict elaboration of the eight new statements and **24,336** constructed
  action/event comparisons, plus exact probability and alpha checks. The
  [standalone checker](../scripts/audit_exchangeability.py) is reproducible from
  the published formal source and pinned build; no archive or runtime-selector
  code is imported. This eight-statement rerun is not represented as another
  fresh 125-statement audit.
- [Runtime continuity](exchangeability-runtime-continuity-v1.json) confirms all
  151 tracked runtime/test/resource/browser/package-smoke files equal their
  bytes at `d169b1070eaec916ebf9af221aa4596dd4b2cb1d`, whose
  [four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38077229090).
  The prior 564 Python tests, 46 browser checks and 28-case/six-schema package
  results are historical execution evidence for unchanged sources. No new
  local runtime test run is claimed for this formal-only change. New-commit CI
  is verified separately after publication.

Public execution logs are exact copies of the recorded local outputs:
[build](exchangeability-g17-build.log), [125-statement audit](exchangeability-g17-audit.log),
[parser tests](exchangeability-g17-audit-tests.log), and the
[independent eight-statement elaboration](exchangeability-independent-review-v1.lean.log).
The independent report distinguishes original pre-promotion review evidence
from a later preservation assertion that correctly detected authorized
configuration changes; the subsequent current-source receipt states its own
bindings. No failed check was relabeled as a pass.

## Mathematical and scientific consequence

The [finite-law specification](../docs/finite-exchangeability.md) gives the
support, weights, quantile and symmetry assumptions. Real score values are
arbitrary, but the joint law has finite support. The designated future index,
normalization and exact order statistics exclude vacuous rank endpoints.
Strict failures preserve conservative handling of ties; the alpha theorem
covers only the finite rank branch.

The implication does not prove arbitrary measurable laws, scientific
exchangeability, independent fitting, conditional coverage after observing
calibration, conditional coverage on feasible panels, Python refinement,
physical validity, or useful screening. Connecting the score bound to candidate
retention still needs the actual panel-score definition, complete meaningful
truth and a nonnegative threshold. Marginal retention19/20 with zero retention
conditional on feasibility remains a valid counterexample.

All archive failures and scientific NO-GO results remain unchanged. Root owns
publication/remote-SHA/CI verification; the next scientific work remains the
separately reviewed MPEA metadata stage, not a new recommendation claim.
