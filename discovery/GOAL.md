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
| G1b | P0 | Integrate calibration outcomes and safe abstention through versioned inputs, replay, CLI, and browser; reject unsupported guarantee promotion | DONE | Published in `b1e0d4f`; calibrated schema, original-seal replay, 3 demonstrations, exact browser exports and all-retained abstention |
| G2 | P1 | Select, provenance-audit, and preregister a constrained multi-property archived task before reading evaluation targets | DONE | NIST JARVIS protocol and source audit frozen in `b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` before acquiring targets |
| G3 | P1 | Run frozen constrained and shift evaluations with equal-budget baselines and complete failure reporting | DONE / NEGATIVE | 100 panels, 103 policies; primary screening fails because all candidates survive. Unsupported shift abstains. `reports/constrained-result-v1.md` |
| G4 | P1 | Prove and implement Pareto retention and selected domain-checked nonlinear interval maps; extend independent oracle | DONE | Published in `b1e0d4f`; 24 additional compiled theorems, one million compatible Pareto truth worlds; complete CLI/replay/browser integration |
| G5 | P1 | Evaluate evidence-acquisition rules over a predeclared sequence of measurement budgets | DONE / NEGATIVE | Budgets 0/1/2/4/8/20; 206,000 target bundles. Budget-four 42/50 vs nominal 40/50 fails predeclared advantage gate |
| G6 | P1 | Extend workbench for accepted engine modes and scientific benchmark comparisons | DONE | Measured constrained gates, both arms, denominators and all budgets visible; 17 browser checks pass |
| G7 | P0 at close | Fresh-environment reproduction, claim audit, release package, and go/no-go decision | ACTIVE final scoped release review; both historical reruns complete | [Clean reproduction](reports/clean-reproduction-v1/README.md): six constrained stages/34 tests and two training processes/22 tests reproduce both original negative science digests. Exact local retained wheel/source audited; remote storage downloads remain unavailable. Independent scientific replication remains OPEN; superiority NO-GO |
| G8 | P1 | Explain interval bottlenecks and prove the limits of safe pruning | DONE | Target-free posthoc diagnosis, 12 compiled sharpness statements and 15 finite-risk/rank statements; 69 total audited theorems. No benchmark retuning |
| G9 | P1 | Freeze and run a bounded training-only model comparison before allocating fresh validation data | DONE / NEGATIVE | `reports/training-tail-result-v1.md`: all three ridge alternatives fail; two fresh processes reproduce exact outputs and decisions. Original calibration/evaluation untouched; no predictor replacement or new coverage claim |
| G10 | P2 | Design, prove and expose conditional screening using explicit relationships between candidates | DONE | `reports/coupled-interface-verification.md`: strict identities, actual-pool replay, guarded HTTP and browser mode. 298 Python tests, 24 browser checks, 22 packaged cases; 88 unchanged compiled statements. False common-world and stale-result controls pass |
| G11 | P2 | Implement a scoped correction-field adapter with explicit normalization, anchors and bounded discrepancy; prove its algebraic translation and test failure controls | DONE | `reports/projection-verification.md`: scoped Python adapter, 12 new compiled algebra statements, 27 focused tests and direct-equation audit. Missing/empirical bounds return no model/all candidates; no physical field sharing inferred |
| G12 | P2 | Integrate projection declarations into strict wire, CLI, guarded replay and browser without stripping scope/provenance; preserve no-model abstention | DONE; published 7c82058, all four CI jobs pass | `reports/projection-workbench-verification.md`: complete declarations, no-model fallback, 416 Python/35 browser checks and 25 cases/five schemas in a fresh wheel |
| G13 | P2 | Build and independently review a target-redacted custody manifest for the pinned Rhizo fcc archive before proposing a new scoped scientific protocol | DONE as custody; scientific readiness unresolved | Source frozen/pushed in 7c82058 before acquisition. 110 pinned artifacts verified, all 36 units retained, two fresh extraction processes byte-identical; `reports/projection-custody-readiness-v1.md` preserves reference ambiguity and missing physical prerequisites |
| G14 | P2 | Prove and prototype direct statistical candidate-pool calibration under explicit whole-panel score-law assumptions; independent exact tests and counterexamples before any scientific protocol | DONE; published 522fb28, all four CI jobs pass | `reports/decision-pool-verification.md`: exact Python API, 450 full-suite tests, fresh wheel, 17 new counting/finite-law statements (117 total). Counterexamples and first worker timeout preserved; no new scientific data/fits |
| G15 | P2 | Audit an operating-condition archive and freeze reviewed metadata custody before deciding a new scoped benchmark | DONE for metadata custody; scientific readiness unresolved | [Actual G15C result](reports/mpea-formula-readiness-v1.md): a1e4702 plus all four CI jobs preceded two identical scans, 1,545 rows/630 lexical formula groups. Original G15B zero-recognition result preserved. Exact-25 °C/tensile cohort has 314 rows/75 source groups; no targets, eligibility, features, splits or fits |
| G16 | P2 | Integrate the direct statistical pool API into strict wire, separate replay and workbench without strengthening its marginal claim | DONE; published c9fb192, all four CI jobs pass | `reports/decision-pool-workbench-verification.md`: 564 full-suite tests, 46 browser checks, 28 cases/six schemas in a fresh wheel. Strict original seals, actual-pool replay, explicit failure/unknown states; no scientific claim promotion |
| G17 | P2 | Derive the direct-pool finite-law symmetry premise from permutation invariance of a joint score law | DONE; published b899fc6, all four CI jobs pass | `formal/VERIFICATION.md`: eight independently reviewed new statements; all nine modules strictly build, fresh audit passes 125 statements, eleven parser tests pass. Existing runtime unchanged; no arbitrary measurable-law or physical sampling claim |
| G18 | P2 | Build exact declared-coefficient features, freeze a constrained experimental-archive protocol and evaluate source-group recovery at equal budgets | ACTIVE production registration/custody; reviewed guarded components and workbench integrated | [Guarded checkpoint](reports/mpea-guarded-components-v1/README.md): 981 Python tests/244 stable hashes; 56 Chromium checks, no JS errors. Store, fixture driver, supervisor and aggregate projector reviewed; actual archive report remains unavailable. The reviewed protocol and two actual feature runs remain unchanged. Root owns publication/CI; custody and registration engineers plus independent reviewers own separate production lanes. Complete factory-authenticated registration, single-attempt allocation and fresh-process reproduction before any real allocation, performance-target interpretation or fit |

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
