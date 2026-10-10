# Goal: build Lupine Discovery to a defensible research release

Owner: Codex, delegated by Alex Welcing on 2026-10-10. Work in
`alexwelcing/lupine`, branch `research/lupine-discovery`, directory `discovery/`.
The user has authorized implementation, research, delegation, testing, and
branch publication and does not want to manage individual work items.

Alex clarified that work should continue constantly rather than stop after each
small increment. During an active session, proceed directly to the next useful
task while parallel agents work. The scheduled task is a recovery mechanism,
not a substitute for sustained active implementation.

## Outcome

Produce a reproducible research release candidate that recommends inspectable
candidate pools across declared material/property representations, preserves
the exact conditional mathematical guarantees, and tests recommendations on
problems with independently known answers. The interface must expose the
scientific scope, uncertainty, exclusions, and observed failures.

The four-day execution window ends 2026-10-14. This is a target for completed
engineering, evaluation, and an evidence-based release decision. Predictive
accuracy is an empirical outcome, not something a deadline or passing proof
can guarantee. Preserve the broader goal if a scientific gate remains open;
report a no-go or narrower supported claim instead of changing acceptance
criteria after seeing results.

## Definition of done

1. **General engine:** exact scalar selection remains correct; new adapters and
   multi-objective extensions have explicit contracts, independent truth tests,
   and corresponding proofs for every advertised mathematical guarantee.
   No chemistry-specific descriptor is presented as universal physics.
2. **Uncertainty:** implement joint-risk accounting and an explicit abstention
   path for insufficient calibration or unsupported premises. Never replace an
   unbounded interval with an arbitrary finite number. A probability statement
   identifies its sampling assumptions and simultaneous failure budget.
3. **Known-answer evaluation:** retain current synthetic controls and all three
   scientific pilot failures. Add at least one frozen task with jointly
   recorded objective and feasibility properties, plus a source/family or
   temporal holdout where the data permit. Cite the measurement/calculation
   source and distinguish archived calculations from experimental evidence.
4. **Recommendation value:** compare against nominal ranking, random ordering,
   and an appropriate scoped baseline at equal information/measurement budgets.
   Report retention, regret, feasible hit rate, pool size, coverage, and cost.
   Record a negative result when no advantage is established. Scientific
   superiority claims require predeclared criteria met on untouched evaluation
   data; software completion alone cannot authorize them.
5. **Usability and reproducibility:** the interface covers supported modes and
   failure/unknown states; CLI and browser agree; a fresh install reproduces
   examples and frozen reports; Python, browser, Lean, and axiom checks pass at
   the release-candidate commit. Package source and commands with provenance.
6. **Audited release decision:** an independent review maps every public claim
   to a theorem, executed test, or scientific result. Resolve blocking software
   defects. Separate research-preview readiness from scientifically supported
   recommendations using `docs/release-validation.md`. No blanket claim of
   unknown-material validity follows from retrospective success.

## Ordered backlog

Statuses: TODO, ACTIVE, DONE, BLOCKED, NEGATIVE. A negative scientific result
can complete an experiment while leaving its scientific release gate open.

| ID | Priority | Work and acceptance | State | Dependencies / evidence |
|---|---|---|---|---|
| G0 | P0 | Preserve and repair current CI before stacking changes | DONE at baseline | `fb26810`; [all four jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38055093551) |
| G1a | P0 | Exact joint-risk calibration planner; finite/unbounded distinction; adversarial rank/budget tests | DONE | `src/lupine_discovery/calibration.py`; five focused checks; `docs/calibration-planner.md`. Integration remains G1b. |
| G1b | P0 | Integrate calibration outcomes and safe abstention through versioned inputs, replay, CLI, and browser; reject unsupported guarantee promotion | DONE locally | Calibrated versioned schema, original-seal replay, 3 demonstrations, exact browser exports and all-retained abstention; publication checks in progress |
| G2 | P1 | Select, provenance-audit, and preregister a constrained multi-property archived task before reading evaluation targets | DONE | NIST JARVIS protocol and source audit frozen in `b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` before acquiring targets |
| G3 | P1 | Run frozen constrained and shift evaluations with equal-budget baselines and complete failure reporting | ACTIVE | Guarded custodian/freeze/replay implementation and independent leakage review; no tuning against opened pilot tests |
| G4 | P1 | Prove and implement Pareto retention and selected domain-checked nonlinear interval maps; extend independent oracle | ACTIVE integration | Pure exact runtime, 24 additional compiled theorems, one million compatible Pareto truth worlds; CLI/replay/browser integration passing focused checks |
| G5 | P1 | Evaluate evidence-acquisition rules over a predeclared sequence of measurement budgets | ACTIVE | Frozen budgets 0/1/2/4/8/20; per-policy target access and equal-budget baselines |
| G6 | P1 | Extend workbench for accepted engine modes and scientific benchmark comparisons | ACTIVE | Calibration/Pareto modes pass 16 browser checks; constrained dashboard awaits measured report |
| G7 | P0 at close | Fresh-environment reproduction, claim audit, release package, and go/no-go decision | ACTIVE | Fresh wheel checks pass all 19 packaged cases; scientific release gates remain open |

The existing interface and 13-case finite suite are completed foundations;
they are not the end of this goal. Current archive results do not establish
predictive superiority. Choose additional models or justified assumptions based
on training/development evidence, and allocate fresh evaluation data before
testing a changed scientific claim.

## Autonomous execution contract

On every continuation:

1. Read the latest branch, repository instructions, this goal, `STATUS.md`,
   `reports/progress.md`, and the relevant release gates. Do not depend on a
   previous conversation, transient workspace path, or an unpushed commit.
2. Check current CI and any active work recorded in the journal. Pick the
   highest-priority unblocked item and complete reviewable increments, then
   continue to the next useful item while execution remains available.
   Delegate independent work with explicit file ownership; keep integrating,
   researching, or reviewing while delegates work.
3. Implement, run checks appropriate to the changed behavior, review claims,
   update the journal and backlog, commit, and push to the existing branch.
   Inspect the actual remote commit and CI. Record attempted checks separately
   from completed ones. Failed results stay in the record.
4. Avoid simultaneous edits from separate runs. Re-read the branch before
   publishing; reconcile intervening commits without force-pushing. A stale
   ACTIVE label is not proof that a process is still running: inspect journal
   timestamps and actual activity, then resume or recover the checkpoint.
5. Advance another useful item when one is blocked by data, tools, or a
   mathematical limitation. Do not stop at a plan, green build, or successful
   synthetic case when the goal still has feasible work.
6. Keep updates concise and evidence-backed: material milestone, changed
   scientific conclusion, or a blocker requiring Alex's action. No repeated
   permission requests for ordinary implementation, tests, or branch commits.

Use available local tools and connected GitHub. Scheduled runs must check what
execution tools are actually present. If a run cannot execute code, it may
advance source research or review through connected tools, but must not mark
tests or builds as passed. Report persistent execution/access failure once;
do not silently convert the build goal into reminder-only messages.

Existing authorization covers this branch. Escalate only a genuine decision
outside it, such as new paid compute or a production deployment, or a persistent
access problem that cannot be repaired within available permissions. Do not
merge to main, force-push, expose credentials, weaken tests to pass, or invent
physical validity. The target remains an inspectable research release.

## Continuation and stopping

Bounded scheduled continuation was configured successfully: every four hours,
24 occurrences across the four-day window. The exact confirmed scheduler
configuration is recorded in `reports/continuation.json`.
Scheduled wake-ups are not a claim that a process runs uninterrupted between
them. On each run, attempt actual progress and save the checkpoint to GitHub.

An attempt to start a standalone Codex worker on 2026-10-10 failed with an
authentication error before doing any repository work. No continuous worker
was launched. The scheduler cannot run more frequently than hourly and cannot
provide uninterrupted execution. Do not claim either that the failed worker
is running or that scheduled wake-ups prove work occurred between them.

Stop early only when the definition of done and release decision are recorded,
or the user cancels. At the window's close, publish a concrete final checkpoint:
what shipped, what ran, scientific successes/failures, remaining blockers, and
the next highest-value experiment. Do not silently extend a bounded automation.
