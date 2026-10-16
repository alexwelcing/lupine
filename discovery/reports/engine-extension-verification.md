# Engine extension verification

Executed 2026-10-10 with Python 3.12.14, before the constrained archive replay.
This checkpoint extends the research preview; it does not establish physical
predictive validity or superiority over scientific baselines.

- Full Python discovery suite: **126 tests passed**. The captured output is in
  `engine-extension-tests.txt`; exact source bytes are pinned by the runtime
  manifest for this checkpoint.
- Browser: **16 checks passed** in actual Chromium across scalar, calibrated,
  and Pareto workflows. See `browser-engine-v1.json`. Checks include exact large
  calibration-count export, original-seal verification, all-retained abstention,
  tied Pareto tradeoffs, partial truth, negative controls, mobile layout, and no
  browser JavaScript errors. An initial test expected the word “unknown” where
  the interface correctly said “unresolved”; the assertion was corrected and
  the complete suite rerun. No scientific criterion changed.
- HTTP: **14 tests passed** as part of the full suite. All supported schemas
  match CLI selection and use separate, originally sealed outcome resources.
- The pure Pareto oracle checks **46,656 interval problems and 1,000,000
  compatible truth worlds**. Nonlinear checks enumerate **27,225 product
  worlds and 6,600 quotient worlds**, including zero-domain rejection.
  Pareto IO adds 256 independent finite-front checks. These are executable
  conformance evidence, not a proof that Python refines Lean.
- Independent reviews challenged partial outcomes, invalid scope promotion,
  interval domains, tie handling, certificate tampering, and exact exports.
  One review found a large-integer JSON diagnostic rounded by JavaScript;
  derived minimum calibration counts now serialize as exact strings, with a
  regression test and browser download/reverification check.
- Lean: **42 statements across 3 modules compiled**, strict build passed, and
  the axiom audit covered every statement. **11 audit parser tests passed**.
  The machine inventory and toolchain details are in `../formal/`.
- Fresh-wheel verification exercises all **19 packaged cases** across the
  three problem schemas, web assets, original archive reports, and installed
  HTTP/CLI agreement outside the checkout. `scripts/package_smoke.py` is now
  a repeatable CI check; this is package verification, not independent
  scientific reproduction.
- Existing scalar example certificate and replay outputs remain byte-identical.
  The runtime version remains 0.1.0; new input/certificate schemas distinguish
  the new modes.

Calibrated abstention retains the full universe and reports no certified
incumbent or finite regret. Nominal predictions remain predictions. Finite
calibration is conditional on explicit unverified sampling premises. Pareto
certificates establish only conditional finite-universe retention; there is
no scalar winner or regret. A missing outcome leaves the global true frontier
unresolved, while an observed interval miss immediately refutes soundness.

The constrained JARVIS protocol was committed and pushed in
`b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` before source target acquisition.
Its evaluation is a separate checkpoint. No constrained result is claimed
by these software and proof checks.
