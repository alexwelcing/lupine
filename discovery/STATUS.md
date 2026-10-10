# Project state

Snapshot: 2026-10-10. Initial implementation session; four calendar days of work have not elapsed.

Alex has delegated the multi-day build without task-by-task management.
The active outcome, ordered backlog, and autonomous execution rules are in
[`GOAL.md`](GOAL.md); checkpoints are in [`reports/progress.md`](reports/progress.md).

## Implemented and exercised

- Exact rational finite candidate selection, tied-optimum retention, feasibility bounds, regret bounds, compatible refinement, signed linear and min/max interval composition.
- Anchored residual-envelope adapter with explicit Lipschitz premise.
- Strict versioned JSON, scoped evidence links, sealed input/output identity, deterministic exclusion witnesses and certificate recomputation.
- Separate outcome replay, incomplete-outcome handling, coverage failure reporting, optimum and regret audits.
- Synthetic runnable examples and an independent adversarial integration review.
- Local browser workbench using the actual selector: input upload/editing, candidate and evidence inspection, certificate export, and separately bound outcome replay. Desktop and mobile Chromium checks passed.
- Thirteen deterministic known-answer cases with an independent exhaustive oracle: eleven sound fixtures and two deliberately unsound controls. All declared expectations pass; this is software evidence, not materials prediction validation.
- Three pinned published-data pilots with recorded negative findings; no new DFT or synthesis. All three empirical interval constructions fail simultaneous coverage; band gap loses five tied optima.
- Independently reviewed joint-coverage derivation and identifiability limits. Exact calibration planning now implements uniform scalar-event risk allocation, rational rank arithmetic, and explicit unbounded diagnostics. Assumptions remain unverified. Versioned calibrated inputs now propagate finite conditional intervals or explicit all-retained abstention through CLI, replay, and browser.
- Posthoc exact-descriptor audit: three band-gap label collisions imply a 1.15 eV archive worst-error floor for composition-only predictors; physical causes remain unresolved.
- Standalone conditional Lean proof package: **88 statements** compiled and audited across scalar, Pareto, nonlinear interval, finite-risk, sharpness, and coupled-affine modules. The 19 coupled statements cover multiplier bounds, contradiction/consistency, candidate-feasible domains, strict conditional witnesses, ties, and conservative fallback. Consult [formal verification](formal/VERIFICATION.md) and the [source-bound inventory](formal/theorem-inventory.json).
- Pareto runtime and IO preserve tradeoffs, ties, feasible witnesses, and partial-truth states. Selected exact nonlinear maps reject invalid domains. See `reports/engine-extension-verification.md` for current checks; earlier checkpoints remain archived.
- The coupled/training checkpoint passes **226 Python tests** and all 19 packaged cases in an isolated wheel, including the new coupled Python API. The unchanged interface last passed **17 Chromium checks** at the constrained checkpoint. See [current checks](reports/coupled-training-verification.md).
- Experimental [coupled-evidence Python API](docs/coupled-kernel.md): 18 focused tests pass, and the [independent audit](reports/coupled-independent-audit.json) reports PASS for 10,003 checks across 11,027 synthetic worlds. Exact proofs bind the original domain and candidate universe; conditional witnesses preserve tied minima. Unsupported/learned-correlation premises, missing consistency, and proved-inconsistent models retain every candidate. No coupled JSON, CLI, browser mode, general solver, or scientific validation is claimed.
- The constrained NIST JARVIS protocol was frozen before target acquisition. The complete guarded evaluation passed engineering, nontriviality and shift-abstention checks, but failed useful-screening and recommendation-value gates. All 1,000 primary candidates survive; budget-four near-optimal success is 42/50 versus nominal ranking's 40/50. See `reports/constrained-result-v1.md`.
- A fresh noneditable wheel reproduced source partitioning, predictions, calibration and freeze byte-for-byte from verified raw source bytes. The complete one-command workflow is implemented; these same-host checks are not independent scientific replication.
- The [projection-field adapter design](docs/projection-field-adapter.md) specifies a route from Lupine correction fields to affine screening using scoped observation maps, anchors, and explicit discrepancy bounds. The adapter is not yet implemented or scientifically validated.
- The [training-only follow-up protocol](docs/training-tail-protocol-v1.md) and [runner contract](docs/training-tail-run.md) freeze a bounded 5NN-versus-ridge development comparison. The completed two-pass result is NO-GO; no improved predictor is established.

## Remaining four-day gates

This checkpoint covers the kernel, local research interface, and initial retrospective validation. The full four-day research and release program remains open; `docs/release-validation.md` tracks the distinction between preview readiness and scientific recommendation claims.

- Establish defensible simultaneous interval bounds under declared scientific scope, or explicitly abstain from physical guarantees.
- Broaden independent archived tasks, including actual operating-condition constraints and distribution shift; freeze protocols before examining evaluation outcomes.
- Preserve the completed negative training-only comparison. Further model changes need a new development protocol; any scientific validation then needs unused calibration/evaluation targets and cannot overwrite the completed negative benchmark.
- Integrate the experimental coupled API into versioned IO and the interface only with its premise, consistency, identity, and resource boundaries preserved. Implement and test the proposed projection-field adapter before making any scientific adapter claim.
- Audit runtime/formal conformance beyond examples and exhaustive small worlds; no formal refinement claim exists yet.
- Resolve original dataset provenance and redistribution rights before bundling data.
- Complete independent scientific reproduction and scoped release review. Branch publication is not a validated scientific release.

## Repository home

At Alex Welcing's direction, development now lives in `discovery/` on branch
`research/lupine-discovery` of `alexwelcing/lupine`. Creation of a separate
repository is deferred; the standalone source history is preserved as a merge
parent so this directory can be split out later. See `HOSTING.md` for commands
and the monorepo CI boundary.

## Resume

Start with `AGENTS.md`, `GOAL.md`, this file, `reports/progress.md`, and the verification record. Continue the highest-priority unblocked backlog item. Keep failed scientific assumptions visible in reports. Do not reinterpret successful finite-archive examples as universal physical accuracy.

## Completed training-only follow-up

The frozen five-fold comparison on 4,096 original training representatives returned
**NO_GO_MODEL_IMPROVEMENT**. All three ridge alternatives were ineligible; two
fresh processes matched exact predictions, metrics, gate decisions and raw float
artifacts. Original calibration/evaluation targets were not opened. The [result](reports/training-tail-result-v1.md) preserves every failed gate. No predictor is replaced and no new coverage claim follows.
