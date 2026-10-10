# Lupine Discovery

A universal, conditional candidate-pool engine grounded in [Lupine Rhizo](https://github.com/alexwelcing/lupine-rhizo) and the [Lupine Library](https://github.com/alexwelcing/lupine-ledger). The core operates on arbitrary candidate IDs, objective intervals, and constraint intervals. Material-specific models supply those intervals and their evidence.

**The scalar guarantee:** if every supplied interval encloses its corresponding true value, screening retains every feasible optimum in the supplied finite candidate universe. When a certified feasible incumbent exists, its regret is bounded. Pareto mode preserves feasible tradeoffs; shared-affine mode additionally requires one common admissible world. Physical validity remains an explicit premise. A checksum, calibration score, or successful proof compilation cannot establish it.

This is the initial research implementation for a [four-day project](docs/four-day-plan.md). See [STATUS.md](STATUS.md) for completed work and open gates. No new DFT is required to run the examples or archived experiments.

Verification includes exact calibration abstention, Pareto selection, nonlinear enclosures, shared-affine screening, scoped projection and direct statistical pools. The proof package contains **125 compiled and audited Lean statements**, including a [finite permutation-law bridge](docs/finite-exchangeability.md); probability results remain limited to their explicit finite-law premises. The statistical-workbench/custody integration passes **564 Python tests**, **46 Chromium checks** and a fresh isolated wheel with **28 cases across six wire schemas**. See the [current verification record](reports/decision-pool-workbench-verification.md), [formal scope](formal/VERIFICATION.md), and [source-bound inventory](formal/theorem-inventory.json). [All four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38076623056) at the published `c9fb192` workbench checkpoint (then 117 formal statements). The subsequent eight-statement proof extension is published as `b899fc6`, with [all four CI jobs passing](https://github.com/alexwelcing/lupine/actions/runs/38077825298) and [source-bound local build/audit evidence](formal/VERIFICATION.md). The subsequent [target-opaque MPEA custody increment](reports/mpea-row-metadata-engineering-v1.md) passed 601 Python tests and [all four CI jobs](https://github.com/alexwelcing/lupine/actions/runs/38079064532) before two real metadata scans. [Both runs preserved all 1,545 records](reports/mpea-row-metadata-readiness-v1.md); the original formula grammar recognized none, and performance targets remain opaque. [Release integration](reports/metadata-release-verification-v1.md) adds reviewed exact-artifact retention, proof-receipt freshness checks and fresh-attempt reproduction instructions; these do not change the negative scientific results. The retained-release checkpoint `2a09d36` passes [all four CI jobs](https://github.com/alexwelcing/lupine/actions/runs/38080586212); its local wheel/source bytes are independently audited. A separate [formula-only amendment](reports/mpea-formula-engineering-v1.md) passes 684 Python tests and must freeze before real execution. The ordered backlog is in [GOAL.md](GOAL.md).

## Open the interface

In the Lupine checkout, first run `cd discovery`. With Python 3.11 or newer:

```sh
python -m pip install -e .
lupine-discovery serve
```

Open `http://127.0.0.1:8765` on the machine running the command. Choose a case or upload a problem, inspect the retained pool and exclusion reasons, download its exact input and certificate, then reveal separately bound known answers. The **Known answers** screen runs the finite fixture suite and displays the three original archive pilots plus the measured constrained JARVIS comparison, including every failed release gate. See the [workbench guide](docs/workbench.md).

This is a local research preview. The [release matrix](docs/release-validation.md) records remaining scientific validation gates.

## Run it

In the Lupine monorepo, first run `cd discovery`. Python 3.11 or newer:

```sh
python -m pip install -e .
lupine-discovery select examples/abstract.json --output /tmp/certificate.json
lupine-discovery verify examples/abstract.json /tmp/certificate.json
lupine-discovery replay examples/abstract.json examples/abstract.outcomes.json
python -m pip install -e '.[benchmark]'  # numerical development tests
python -m unittest discover -s tests -v
```

The synthetic example retains `A`, `D`, and `E`. It excludes `B` using a better certified feasible incumbent and excludes `C` using a violated constraint. The replay reveals that both true optima, `A` and `E`, survived. `refined.json` demonstrates tighter intervals; `unresolved.json` demonstrates the absence of a certified feasible incumbent.

The original input schema minimizes one scalar objective and expresses each constraint as `g <= 0`. Normalize a maximization objective by negation. Use integers or exact rational/decimal strings, such as `"1/3"` or `"0.125"`; floating-point JSON literals are rejected. Objective units, constraint units, scenario IDs, and reference definitions are explicit. Outcomes live in a separate file bound to the input digest.

The interface also accepts [calibrated nominal predictions](docs/calibrated-problem.md) and [multiple Pareto objectives](docs/pareto-problem.md). Insufficient calibration or unsupported sampling premises retains every candidate and withholds screening. Pareto mode preserves tradeoffs and ties without inventing a scalar winner; incomplete outcomes leave the full true frontier unresolved. Six additional packaged demonstrations exercise these modes, including deliberately unsound Pareto bounds. Three coupled demonstrations show shared-error screening, missing-point abstention and a learned-relation failure control.

## The mathematics

Write `F−` for candidates whose constraint upper bounds are all nonpositive and `F+` for those whose constraint lower bounds are all nonpositive. Sound intervals imply `F− ⊆ Ftrue ⊆ F+`.

When `F−` is nonempty, choose an incumbent `y` with the smallest objective upper bound `B = U(y)`. Retain exactly:

```text
P = {x in F+ : L(x) <= B}
R = B - min {L(x) : x in F+}
```

Every true feasible optimum is in `P`; the incumbent's regret is at most `R`. With no certified feasible incumbent, retain all of `F+` and report no regret bound. Ties survive. Compatible interval tightening can only shrink the retained pool. The pool may remain large.

See the [mathematical specification](docs/mathematical-specification.md), [Lean theorem map](formal/README.md), and actual [formal verification record](formal/VERIFICATION.md). The Lean definitions quantify over arbitrary candidate types; Python enumerates finite input sets. The Python implementation has not been formally proved to refine the Lean definitions. The [claim ledger](docs/claim-ledger.md) maps each guarantee to its evidence and identifies open premises.

## Test problems with known answers

The deterministic suite has **13 cases: 11 with sound intervals and 2 deliberately unsound controls**. An independent oracle enumerates complete truth; all feasible optima survive in the 10 sound cases with feasible solutions, and the two controls correctly expose lost optima. Cases cover ties, multiple constraints, infeasibility, uncertain feasibility, refinement, signed interval composition, maximization, and exact rational ordering. One constrained integer design case reduces 81 candidates to the known optimum.

```sh
python scripts/known_answer_benchmark.py
```

These are engine checks, not evidence of physical predictive accuracy. See the [known-answer protocol](docs/known-answer-benchmarks.md) and [recorded result](reports/known-answers-v1.json).

## What the archived experiments found

Three published experimental-property archives were evaluated with frozen surrogate protocols and empirical calibration. All three violated simultaneous interval soundness:

| Archive | Test rows | Retained | Intervals missing truth | All optima retained |
|---|---:|---:|---:|---|
| Band gap | 888 | 842 | 89 | No: 5 of 471 tied optima discarded |
| Steel yield strength | 68 | 3 | 6 | Yes, in this run |
| Molecular hydration free energy | 138 | 8 | 22 | Yes, in this run |

Nominal top-one ranking already selected an optimum in each archive. These results establish neither superiority of this engine nor a physical discovery. The band-gap failure demonstrates why roughly 90% individual coverage is insufficient for a guarantee about the whole pool.

The completed, preregistered constrained experiment uses archived NIST JARVIS band
gaps and formation energies. It retains all 1,000 primary candidates: 49/50
panels have simultaneous interval coverage, but the useful-screening gate
fails. At four reveals, interval acquisition finds a near-optimal feasible
answer in 42/50 panels versus nominal ranking's 40/50; the predeclared
recommendation-value gate also fails. Unsupported oxygen-family panels
explicitly abstain. Read the [executed result](reports/constrained-result-v1.md)
and [one-command reproduction](docs/constrained-reproduce.md). These are
archived calculations, not operating-condition or experimental validation.

The subsequent [frozen training-only comparison](reports/training-tail-result-v1.md) also returned **NO-GO**: none of three fixed ridge configurations met both properties' improvement gates. Two fresh processes reproduced all exact predictions, metrics and decisions. This is development evidence; it does not reuse calibration/evaluation targets or establish new coverage.

```sh
python -m pip install -e '.[benchmark]'
python scripts/archived_benchmark.py --output .cache/archived-results.json
python scripts/additional_archived_benchmark.py --output .cache/additional-archived-results.json
```

Read the [Matbench protocol](docs/archived-benchmark.md), [FreeSolv protocol](docs/additional-archived-benchmark.md), their [original](reports/archived-v1.json) and [additional](reports/additional-archived-v1.json) result artifacts, and the [general evaluation protocol](docs/evaluation-protocol.md). Raw datasets are downloaded with pinned hashes and are not bundled. The runs used NumPy 2.3.5; install that version to reproduce the recorded numerical environment.

The [joint-coverage design](docs/joint-coverage-design.md) derives one possible probabilistic route under explicit exchangeability assumptions. The new [exact calibration planner](docs/calibration-planner.md) implements its risk allocation and rank arithmetic, returning explicit unbounded diagnostics when calibration is insufficient. At a 5% joint failure budget, the gap and steel pilot dimensions require that result. Sampling assumptions remain unverified. The planner is connected to selection, CLI, replay, and the browser: insufficient calibration or unsupported premises produces an explicit all-retained abstention. This repair does not validate the three pilot constructions.

The [constrained evaluation protocol](docs/constrained-benchmark-protocol.md) was committed before target acquisition. It uses a pinned NIST JARVIS archive to maximize calculated band gap subject to nonpositive formation energy, with an oxygen-family holdout and matched measurement budgets. Formation energy here is an elemental-reference screen; it does not establish phase stability, synthesis, or power-plant suitability. Results are reported separately from the three experimental-property pilots.

A [frozen training-only follow-up](docs/training-tail-protocol-v1.md) compares composition 5NN with three ridge configurations using only original training records. Its [runner contract](docs/training-tail-run.md) separates model development from a future fresh evaluation. The completed run returned NO-GO; see the recorded result above.

A separate [posthoc descriptor audit](docs/descriptor-audit.md) found three normalized-composition collisions with different band-gap labels. Their maximum disagreement gives a rigorous 1.15 eV worst-case error floor for deterministic predictors using only that descriptor on the recorded archive. The cause of the label disagreement remains unresolved; benchmark settings were not changed.

## Evidence and certificates

Certificates record the sealed input identity, exact selection and the decision details supported by their mode. `verify` recomputes the certificate; it verifies identity and runtime consistency. It does not attest physical truth. Missing, assumed, rejected, or synthetic evidence remains visible. Where a measurement queue is supplied, it never truncates the retained pool and carries no acquisition-optimality guarantee. Pareto ordering is by ID, and coupled mode supplies no measurement queue or operational regret bound.

The [Pareto engine](docs/pareto.md) excludes a candidate only when a certified-feasible witness is no worse in every objective and strictly better in at least one. The [nonlinear interval operations](docs/nonlinear.md) enclose products, reciprocal, quotient, and square on their declared domains; zero-containing reciprocal or division inputs are rejected. These are representation-independent conditional mathematics, not a descriptor or a physical model.

The [coupled-evidence kernel](docs/coupled-kernel.md) and [strict adapter](docs/coupled-problem.md) support Python, CLI, separate replay and a guarded local workbench mode. Shared affine quantities can expose strict comparisons hidden by overlapping marginal intervals. Exact nonnegative row multipliers certify bounds or contradictions; a candidate-specific witness must be feasible and strictly better wherever its target is feasible. Retention of tied optima assumes one common admissible latent world represents the actual quantities. Unsupported premises, learned correlation alone, missing/rejected consistency, or a proved-inconsistent model retain every candidate; diagnostic box intervals do not authorize pruning in those states. A verified consistency point establishes model nonemptiness, not physical truth. See the [design and limits](docs/coupled-evidence-design.md) and [independent synthetic audit](reports/coupled-independent-audit.json).

The implemented [projection-field Python adapter](docs/projection-adapter.md) connects this kernel to Lupine's correction-field research through scoped observation weights, explicit normalization, uncertain anchor rows, and bounded discrepancies. It preserves full physical context and separately records image, coordinate-bound and discrepancy premises. Missing or empirical-only bounds produce no numerical model and retain every candidate. Run `python examples/projected.py` for the constructed gain, tie, missing-bound and contradictory-anchor cases. Twelve compiled algebraic statements and 27 focused tests support this translation; no physical model is validated. The [upstream data-readiness audit](docs/projection-data-readiness.md) identifies a concrete Rhizo archive and unresolved scientific prerequisites. The [projection workbench wrapper](docs/projection-workbench-contract.md) preserves complete declarations through guarded selection, verification, replay and browser exports; three additional demonstrations cover shared-field screening, missing-bound abstention and ties. The frozen JARVIS result remains unchanged.

The separate [statistical-pool engine](docs/decision-pool-calibration-design.md) calibrates the maximum rank of all feasible tied optima using complete recorded panels. Its guarantee is marginal under a declared exchangeable panel-score law, not a per-material, feasible-panel or fixed-calibration guarantee. Missing labels and unsupported premises retain every candidate; an empty statistical pool does not certify infeasibility. Run `python examples/statistical_pool.py` for six constructed controls, including a visible lost optimum. Its [strict workbench adapter](docs/decision-pool-workbench-contract.md) supports versioned JSON, CLI, guarded HTTP and separately bound outcome replay, including three packaged failure/abstention demonstrations. It has not been scientifically evaluated. Calibration supplies a conditional pool threshold; it does not improve the frozen candidate order.

The residual-envelope adapter supports Lupine's anchored Lipschitz correction formulation, conditional on a global residual bound in the declared scope. A Lipschitz estimate from sampled pairs does not discharge that premise. Run `python examples/anchored.py` for a synthetic end-to-end example. See [upstream provenance](docs/upstream-provenance.json) and the [adapter architecture](docs/architecture.md).

A source-byte manifest is checked in CI. `python scripts/package_smoke.py` builds a wheel, installs it into a fresh environment, and exercises every packaged case plus installed HTTP/CLI agreement. This is distribution verification, not an independent scientific rerun.

See [HOSTING.md](HOSTING.md) for the branch location and later extraction.

## License

Project code is AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). External datasets retain their own rights and unresolved provenance questions.
