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
- Standalone conditional Lean proof package: 42 theorems compiled across scalar, Pareto, and nonlinear interval modules. Consult `formal/VERIFICATION.md` for exact execution evidence and axioms.
- Pareto runtime and IO preserve tradeoffs, ties, feasible witnesses, and partial-truth states. Selected exact nonlinear maps reject invalid domains. See `reports/engine-extension-verification.md` for current checks; earlier checkpoints remain archived.
- All 19 packaged cases pass selection, certificate verification and replay in a fresh wheel installation. The interface passes 16 Chromium checks across scalar, calibrated, and Pareto modes.
- The constrained NIST JARVIS evaluation protocol was frozen and pushed before target acquisition; implementation and guarded equal-budget evaluation are active.

## Remaining four-day gates

This checkpoint covers the kernel, local research interface, and initial retrospective validation. The full four-day research and release program remains open; `docs/release-validation.md` tracks the distinction between preview readiness and scientific recommendation claims.

- Establish defensible simultaneous interval bounds under declared scientific scope, or explicitly abstain from physical guarantees.
- Broaden independent archived tasks, including actual operating-condition constraints and distribution shift; freeze protocols before examining evaluation outcomes.
- Complete constrained archived-calculation and family-shift evaluation at matched evidence-acquisition budgets. Pareto/nonlinear mathematical implementation is complete; scientific usefulness remains a separate gate.
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
