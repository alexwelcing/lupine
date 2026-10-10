# Project state

Snapshot: 2026-10-10. Initial implementation session; four calendar days of work have not elapsed.

## Implemented and exercised

- Exact rational finite candidate selection, tied-optimum retention, feasibility bounds, regret bounds, compatible refinement, signed linear and min/max interval composition.
- Anchored residual-envelope adapter with explicit Lipschitz premise.
- Strict versioned JSON, scoped evidence links, sealed input/output identity, deterministic exclusion witnesses and certificate recomputation.
- Separate outcome replay, incomplete-outcome handling, coverage failure reporting, optimum and regret audits.
- Synthetic runnable examples and an independent adversarial integration review.
- Local browser workbench using the actual selector: input upload/editing, candidate and evidence inspection, certificate export, and separately bound outcome replay. Desktop and mobile Chromium checks passed.
- Thirteen deterministic known-answer cases with an independent exhaustive oracle: eleven sound fixtures and two deliberately unsound controls. All declared expectations pass; this is software evidence, not materials prediction validation.
- Three pinned published-data pilots with recorded negative findings; no new DFT or synthesis. All three empirical interval constructions fail simultaneous coverage; band gap loses five tied optima.
- Independently reviewed joint-coverage derivation and identifiability limits; probabilistic construction remains unimplemented.
- Posthoc exact-descriptor audit: three band-gap label collisions imply a 1.15 eV archive worst-error floor for composition-only predictors; physical causes remain unresolved.
- Standalone conditional Lean proof package: 18 theorems compiled. Consult `formal/VERIFICATION.md` for exact execution evidence and axioms.
- Workbench checkpoint: 66 Python tests and 10 Chromium interaction checks passed; packaged assets and fixtures verified in an isolated wheel install. See `reports/workbench-verification.md`.

## Remaining four-day gates

This checkpoint covers the kernel, local research interface, and initial retrospective validation. The full four-day research and release program remains open; `docs/release-validation.md` tracks the distinction between preview readiness and scientific recommendation claims.

- Establish defensible simultaneous interval bounds under declared scientific scope, or explicitly abstain from physical guarantees.
- Broaden independent archived tasks, including actual operating-condition constraints and distribution shift; freeze protocols before examining evaluation outcomes.
- Implement and prove Pareto/nonlinear extensions and evaluate evidence acquisition at matched budgets.
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

Start with `AGENTS.md`, this file, `docs/four-day-plan.md`, and the verification record. Run the README smoke commands. Keep failed scientific assumptions visible in reports. Do not reinterpret successful finite-archive examples as universal physical accuracy.
