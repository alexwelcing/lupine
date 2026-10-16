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

## Renewed active work — 2026-10-16

Alex explicitly resumed the project on October 16. The completed research-preview
release below remains a historical milestone; its scientific NO-GO decisions
are unchanged. This is a new active phase, not an extension of the expired
four-day schedule. The old automation remains disabled. Root owns integration
and publication on the same branch, with independent mathematics and source
evidence reviews. No task-by-task approval is needed within the existing scope.

The next objective is to make a fresh scientific evaluation informative before
opening its outcomes: distinguish finite calibration from useful reduction,
state the assumptions needed for prospective calculations, and establish a
previously unused source with paired outcomes and credible study grouping.

| ID | Work and acceptance | State | Owner / next action |
| --- | --- | --- | --- |
| G19 | Exact prospective planner, independent finite-world tests, CLI and usable browser; hypothetical-IID/unknown states and bounded inputs | DONE at `41d3e31` | [All four CI jobs, clean installed package and independent byte audit pass](reports/phase2-workbench-verification-v1/README.md). The 65-check full browser run and original failures remain recorded. General written proof and exact hypothetical figure distinguish arbitrary-count mathematics from bounded implementation and scientific validity. |
| G20 | Fresh-source identity/license, pairing/conditions, overlap and evaluation-unit audit before outcomes | ACTIVE / schema unresolved | [Actual a6e87c1 inspections](reports/phase2-notebook-header-verification-v1/README.md) identify LOCAL_EXTRA_PRESENT; no workbook member/XML decoding. [Paper methods audit](reports/phase2-li-paper-methods-v1/PUBLICATION.md) establishes documentary test-level rows and units, but preserves 1,038 table total / 1,050 prose / 1,070 catalog counts and reused source material. Actual joins, grouping, curation and version equivalence remain unbound. [Citation identity audit](reports/phase2-li-reference-identity-v1/PUBLICATION.md) finds a shared printed DOI that names different works and two unresolved registry candidates; no automatic correction or join. [BAM](reports/phase2-bam-readiness-v1/PUBLICATION.md) is a possible metrology reference, not an admitted discovery benchmark. |
| G21 | Freeze and evaluate a new archival protocol only if source and prospective design justify it | BLOCKED on G20 | No new allocation, fit, scientific threshold or sampling claim. [Risk-contract review](reports/phase2-risk-contracts-v1/README.md) distinguishes expected loss from fixed-policy high-confidence risk. [Finite confidence inversion](reports/phase2-finite-risk-inversion-design-v1/PUBLICATION.md) has written review and independent finite counting, including an optional-stopping counterexample; implementation is deferred until a justified fixed-frame target needs it. |
| G22 | Fixed Li v3 capture/envelope, opaque outcomes and explicit schema block | DONE; BLOCKED_SCHEMA preserved | Published `5addf4f` and all four successful CI jobs preceded capture. Publisher size/MD5 match; two byte-identical envelope results report BLOCKED_LAYOUT / ZIP_LAYOUT_UNSUPPORTED, zero decompression/XML decoding. This is custody, not scientific validity. |
| G23 | Separate header-only diagnostic for the recorded ZIP block; old custody bytes unchanged | DONE; BLOCKED_SCHEMA preserved | [Two actual runs](reports/phase2-workbench-verification-v1/README.md) followed verified `41d3e31` CI/package, returned identical MEMBER_FLAGS receipts and preserved all 306 runtime files. Whole raw buffer and directory names read; no member/XML/worksheet decoding. This identifies a profile mismatch, not the actual bits or archive corruption. |
| G24 | Resolve the first rejected flag family under a separate unchanged-source contract | DONE; BLOCKED_SCHEMA preserved | Published f7c6ccd passes all four original CI jobs and clean 28-case/six-schema/15-check package plus strict verifier. [Two actual diagnoses](reports/phase2-li-flag-verification-v1/README.md) are byte-identical DEFLATE_OPTION_FLAGS_ONLY with all309runtimefiles unchanged; no members/XML decoded. This identifies only the first failed entry. |
| G25 | Separate finite-population prospective planning from IID future-risk inference | DONE at `4492858` | [All four original CI jobs, clean 28-case/six-schema/16-check package, strict retention and independent byte audit pass](reports/phase2-finite-compatible-verification-v1/README.md). Exact API/CLI/HTTP/browser and independent finite-world checks retain their declared scope. [Walkthrough](docs/finite-planning-walkthrough.md) and [exact figure](reports/phase2-finite-planning-figure-v1/PUBLICATION.md) explain hypothetical finite-frame resolution; no power or future-risk claim. |
| G26 | Separately validate the original Li envelope while supporting standard method-8 option flags | DONE; BLOCKED_LAYOUT preserved | After verified `4492858` CI/package/audit, two actual fixed runs return identical BLOCKED_SCHEMA / BLOCKED_LAYOUT / ZIP_LAYOUT_UNSUPPORTED. All 317 runtime files held; no decompression/XML. G28 later identifies the first local extra-field rejection without replacing this result. Dependent documentary localization cannot run. |
| G27 | Inspect pinned author notebook methods through a bounded static projection | DONE at `a6e87c1`; BLOCKED_SCHEMA preserved | [Actual capture and two identical static inspections](reports/phase2-notebook-header-verification-v1/README.md) followed all four original CI jobs, clean 28-case/six-schema/16-check package and independent audits. All 323 runtime files held. Whole JSON/AST machine exposure is recorded; no notebook execution or output disclosure. Syntax does not establish executed methods, row exclusions or archive equivalence. |
| G28 | Identify the compatible ZIP rejection precisely without decompressing source members | DONE at `a6e87c1`; BLOCKED_SCHEMA preserved | [Two actual diagnoses](reports/phase2-notebook-header-verification-v1/README.md) return identical LOCAL_EXTRA_PRESENT at entry_local, no supplementary categories, no member/XML decoding and no cleanup error. All 323 runtime files, clean source and remote held; independent actual audit passes. Field types/payload meaning and later entries remain unknown; original profiles and all negatives remain unchanged. |
| G29 | Identify the rejected local extra field structurally under a separate bounded contract | DONE at `d0505b9`; BLOCKED_SCHEMA preserved | [Verified actual operations](reports/phase2-li-local-extra-verification-v1/README.md) followed all four original CI jobs, clean packaging and independent artifact audits. Two identical results identify one `0xA220` field with 516 declared data bytes in the first rejected local area. All 326 runtime files held; the independent public-receipt audit passes 11,189 checks. Payload, other entries and worksheet schema remain unestablished. Six predeclared synthetic mutations were detected; earlier failures remain recorded. |
| G30 | Check selected growth-hint shape without admitting an archive or interpreting measurements | IMPLEMENTED / release gates pending | [Reviewed implementation](reports/phase2-growth-implementation-v1/README.md): 35 author/21 independent tests and 472 synthetic report comparisons pass; exact eight-file integration with G31 passes 359 Li tests, 332 runtime files held. Root owns exact publication, CI/package/audit and fixed actual pair; initial-padding semantics remain unbound. |
| G31 | Separate all-entry local-growth envelope profile with unchanged scientific schema block | IMPLEMENTED / release gates pending | [Author and independent evidence](reports/phase2-growth-implementation-v1/README.md): 31 author/24 independent tests pass after preserving the first 27/28 failure. A narrow predeclared amendment closes inherited raw central-length validation; old readers stay unchanged. Only four envelope XML members may be decoded. Root will require actual G30 shape match plus exact-source gates before G31 operations. |

The immediate engineering probe is intentionally outcome-free. A hypothetical
IID score distribution permits exact prospective threshold arithmetic; it is
not measured power or evidence that a real ranker improves. All-score-one laws
prevent any distribution-free guarantee of reduction. A zero-loss sample-count
calculation provides best-case test resolution, not a promised observation.
Current archives, exposed tests and the original allocation are not retuned.

Stop a source route when its access, observation rights, pairing or grouping
cannot be supported; preserve the specific unresolved gate and advance another
authorized route. No paid work, third-party contact, production deployment or
new scheduled recurrence follows from this restart.

## Completed preview release state

**CLOSED: narrow research-preview build and release goal complete.** Research-preview decision: **GO_RESEARCH_PREVIEW**; physical-performance/general superiority: **NO-GO**. [The decision record](reports/research-preview-decision.md) binds runtime `6585a605d5d325e84423c7e35c7286efe85cfb6f`, exact-commit CI, retained artifacts and scientific limits. The scoped build goal is CLOSED for the narrow research preview at runtime commit `6585a605d5d325e84423c7e35c7286efe85cfb6f`, with completed source, package, interface and exact-commit CI evidence. Scientific evaluation and its computational reproductions are complete, including the negative results. Physical validity, independent scientific replication and general predictive superiority remain separate future research; they are not silently declared solved or added as unfinished preview requirements.

A positive scientific result is not added as a requirement for the narrow evidence-review preview already defined in [release-validation](docs/release-validation.md). Broader scientific claims remain open or NO-GO according to their evidence. Existing execution, review and stopping rules below are preserved. This documentation records no scheduler action; root handles and records any automation shutdown separately.

## Ordered backlog

Statuses: TODO, ACTIVE, DONE, BLOCKED, NEGATIVE. A negative scientific result
can complete an experiment while leaving its scientific release gate open.

| ID | Priority | Work and acceptance | State | Dependencies / evidence |
|---|---|---|---|---|
| G0 | P0 | Preserve and repair current CI before stacking changes | DONE; final exact-runtime CI and artifact checks PASS | Registered source `a0624cac` passed 1,359 unskipped tests and its four CI jobs. Final runtime `6585a605` has [38101296342](https://github.com/alexwelcing/lupine/actions/runs/38101296342): PASS: all four jobs completed successfully for exact runtime `6585a605` (observed `2026-10-11T01:40:16.973611+00:00`); 55 focused tests, actual-resource browser checks and a clean 28-case/six-schema/12-check package pass. [Final evidence](reports/research-preview-verification-v1/README.md) preserves earlier failures and source scope. |
| G1a | P0 | Exact joint-risk calibration planner; finite/unbounded distinction; adversarial rank/budget tests | DONE | `src/lupine_discovery/calibration.py`; five focused checks; `docs/calibration-planner.md`. Integration remains G1b. |
| G1b | P0 | Integrate calibration outcomes and safe abstention through versioned inputs, replay, CLI, and browser; reject unsupported guarantee promotion | DONE | Published in `b1e0d4f`; calibrated schema, original-seal replay, 3 demonstrations, exact browser exports and all-retained abstention |
| G2 | P1 | Select, provenance-audit, and preregister a constrained multi-property archived task before reading evaluation targets | DONE | NIST JARVIS protocol and source audit frozen in `b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` before acquiring targets |
| G3 | P1 | Run frozen constrained and shift evaluations with equal-budget baselines and complete failure reporting | DONE / NEGATIVE | 100 panels, 103 policies; primary screening fails because all candidates survive. Unsupported shift abstains. `reports/constrained-result-v1.md` |
| G4 | P1 | Prove and implement Pareto retention and selected domain-checked nonlinear interval maps; extend independent oracle | DONE | Published in `b1e0d4f`; 24 additional compiled theorems, one million compatible Pareto truth worlds; complete CLI/replay/browser integration |
| G5 | P1 | Evaluate evidence-acquisition rules over a predeclared sequence of measurement budgets | DONE / NEGATIVE | Budgets 0/1/2/4/8/20; 206,000 target bundles. Budget-four 42/50 vs nominal 40/50 fails predeclared advantage gate |
| G6 | P1 | Extend workbench for accepted engine modes and scientific benchmark comparisons | DONE | Measured constrained gates, both arms, denominators and all budgets visible; 17 browser checks pass |
| G7 | P0 at close | Fresh-environment reproduction, claim audit, release package, and go/no-go decision | DONE; GO_RESEARCH_PREVIEW, scientific claims remain NO-GO | Both historical negative digests match in the [clean same-host reproduction](reports/clean-reproduction-v1/README.md). The [final source/package/claim record](reports/research-preview-decision.md) separates local retained bytes from remote artifacts and computational reproduction from scientific replication. Independent arithmetic and aggregate claim reviews preserve scientific NO-GO. |
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
| G18 | P2 | Build exact declared-coefficient features, freeze a constrained experimental-archive protocol and evaluate source-group recovery at equal budgets | DONE / NEGATIVE; original, reproduction and public-result release complete | V1 remains blocked. [V2 original and fixed-allocation reproduction](reports/mpea-t25-archival-v1/recovery-v2/README.md) are COMPLETE / NO_GO_ARCHIVAL_USEFULNESS; primary 82/82 and secondary 55/55 retained, five frozen gates failed, independent arithmetic PASS. Same host/operator, not an independent sample. Exact public bytes, browser and package checks are retained in the final release record. |

The interface, six supported modes, 13-case independent finite suite and 28
packaged demonstrations support the scoped release record above. The completed
scientific negatives do not establish superiority. Any later changed scientific
claim needs a separately frozen evaluation with appropriate fresh data; that
broader research does not replace the narrow preview definition of done.

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

## Final operational checkpoint — 2026-10-11

Root owns the completed scoped research-preview decision and final branch
publication. The tested runtime/artifact source is `6585a605`; its four CI jobs,
clean package, independent byte/claim reviews and actual-result interface all
passed. The [final claim review](reports/research-preview-verification-v1/claim-review/README.md)
found no blocking wording. Scientific usefulness and physical qualification
remain NO-GO; the negative studies are completed evidence, not pending successes.

Scheduled continuation was actually disabled at 2026-10-11T01:45:57.014089+00:00
and a fresh provider query confirmed `is_enabled=false`. Prompt and bounded
schedule were unchanged; [the receipt](reports/research-preview-verification-v1/automation-closure.json)
and [continuation record](reports/continuation.json) preserve the observation.
Root continues the active final report-only push and its exact-commit CI
verification before handoff. The resulting hash/run are linked from draft
[PR #263](https://github.com/alexwelcing/lupine/pull/263); this source record does
not claim a future commit already passed. No deployment or main merge follows.

The next scientific action, outside this completed preview checkpoint, is a
separately frozen study using appropriate unused, independently custodied
evidence. [The future-study record](reports/next-independent-study-v1/README.md)
includes the operating-condition archive lead and unresolved access/paired-data
limits. Do not tune or redraw the exposed MPEA allocation.
