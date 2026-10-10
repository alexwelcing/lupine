# Lupine Discovery

A universal, conditional candidate-pool engine grounded in [Lupine Rhizo](https://github.com/alexwelcing/lupine-rhizo) and the [Lupine Library](https://github.com/alexwelcing/lupine-ledger). The core operates on arbitrary candidate IDs, objective intervals, and constraint intervals. Material-specific models supply those intervals and their evidence.

**The guarantee:** if every supplied interval encloses its corresponding true value, screening retains every feasible optimum in the supplied finite candidate universe. It also bounds the chosen feasible incumbent's regret. Physical interval soundness remains an explicit premise. A checksum, calibration score, or successful proof compilation cannot establish it.

This is the initial research implementation for a [four-day project](docs/four-day-plan.md). See [STATUS.md](STATUS.md) for completed work and open gates. No new DFT is required to run the examples or archived experiments.

Verification now includes exact calibration abstention, multi-objective Pareto selection, nonlinear interval enclosures, and desktop/mobile interaction checks. The proof package contains **42 compiled and audited Lean statements**. See the [engine extension record](reports/engine-extension-verification.md), [formal record](formal/VERIFICATION.md), and machine-readable [theorem inventory](formal/theorem-inventory.json). The active goal and ordered backlog are in [GOAL.md](GOAL.md).

## Open the interface

In the Lupine checkout, first run `cd discovery`. With Python 3.11 or newer:

```sh
python -m pip install -e .
lupine-discovery serve
```

Open `http://127.0.0.1:8765` on the machine running the command. Choose a case or upload a problem, inspect the retained pool and exclusion reasons, download its certificate, then reveal separately bound known answers. The **Known answers** screen runs the finite fixture suite and displays all three recorded scientific archive reports. See the [workbench guide](docs/workbench.md).

This is a local research preview. The [release matrix](docs/release-validation.md) records remaining scientific validation gates.

## Run it

In the Lupine monorepo, first run `cd discovery`. Python 3.11 or newer:

```sh
python -m pip install -e .
lupine-discovery select examples/abstract.json --output /tmp/certificate.json
lupine-discovery verify examples/abstract.json /tmp/certificate.json
lupine-discovery replay examples/abstract.json examples/abstract.outcomes.json
python -m unittest discover -s tests -v
```

The synthetic example retains `A`, `D`, and `E`. It excludes `B` using a better certified feasible incumbent and excludes `C` using a violated constraint. The replay reveals that both true optima, `A` and `E`, survived. `refined.json` demonstrates tighter intervals; `unresolved.json` demonstrates the absence of a certified feasible incumbent.

The original input schema minimizes one scalar objective and expresses each constraint as `g <= 0`. Normalize a maximization objective by negation. Use integers or exact rational/decimal strings, such as `"1/3"` or `"0.125"`; floating-point JSON literals are rejected. Objective units, constraint units, scenario IDs, and reference definitions are explicit. Outcomes live in a separate file bound to the input digest.

The interface also accepts [calibrated nominal predictions](docs/calibrated-problem.md) and [multiple Pareto objectives](docs/pareto-problem.md). Insufficient calibration or unsupported sampling premises retains every candidate and withholds screening. Pareto mode preserves tradeoffs and ties without inventing a scalar winner; incomplete outcomes leave the full true frontier unresolved. Six additional packaged demonstrations exercise these modes, including deliberately unsound Pareto bounds.

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

```sh
python -m pip install -e '.[benchmark]'
python scripts/archived_benchmark.py --output .cache/archived-results.json
python scripts/additional_archived_benchmark.py --output .cache/additional-archived-results.json
```

Read the [Matbench protocol](docs/archived-benchmark.md), [FreeSolv protocol](docs/additional-archived-benchmark.md), their [original](reports/archived-v1.json) and [additional](reports/additional-archived-v1.json) result artifacts, and the [general evaluation protocol](docs/evaluation-protocol.md). Raw datasets are downloaded with pinned hashes and are not bundled. The runs used NumPy 2.3.5; install that version to reproduce the recorded numerical environment.

The [joint-coverage design](docs/joint-coverage-design.md) derives one possible probabilistic route under explicit exchangeability assumptions. The new [exact calibration planner](docs/calibration-planner.md) implements its risk allocation and rank arithmetic, returning explicit unbounded diagnostics when calibration is insufficient. At a 5% joint failure budget, the gap and steel pilot dimensions require that result. Sampling assumptions remain unverified. The planner is connected to selection, CLI, replay, and the browser: insufficient calibration or unsupported premises produces an explicit all-retained abstention. This repair does not validate the three pilot constructions.

The next [constrained evaluation protocol](docs/constrained-benchmark-protocol.md) was committed before target acquisition. It uses a pinned NIST JARVIS archive to maximize calculated band gap subject to nonpositive formation energy, with an oxygen-family holdout and matched measurement budgets. Formation energy here is an elemental-reference screen; it does not establish phase stability, synthesis, or power-plant suitability. Results are reported separately from the three experimental-property pilots.

A separate [posthoc descriptor audit](docs/descriptor-audit.md) found three normalized-composition collisions with different band-gap labels. Their maximum disagreement gives a rigorous 1.15 eV worst-case error floor for deterministic predictors using only that descriptor on the recorded archive. The cause of the label disagreement remains unresolved; benchmark settings were not changed.

## Evidence and certificates

Certificates record the sealed input digest, exact selection, exclusion witnesses, evidence-link assessment, and a heuristic measurement queue. `verify` recomputes the certificate; it verifies identity and runtime consistency. It does not attest physical truth. Missing, assumed, rejected, or synthetic evidence remains visible. The measurement queue never truncates the retained pool and carries no acquisition-optimality guarantee.

The [Pareto engine](docs/pareto.md) excludes a candidate only when a certified-feasible witness is no worse in every objective and strictly better in at least one. The [nonlinear interval operations](docs/nonlinear.md) enclose products, reciprocal, quotient, and square on their declared domains; zero-containing reciprocal or division inputs are rejected. These are representation-independent conditional mathematics, not a descriptor or a physical model.

The residual-envelope adapter supports Lupine's anchored Lipschitz correction formulation, conditional on a global residual bound in the declared scope. A Lipschitz estimate from sampled pairs does not discharge that premise. Run `python examples/anchored.py` for a synthetic end-to-end example. See [upstream provenance](docs/upstream-provenance.json) and the [adapter architecture](docs/architecture.md).

A source-byte manifest is checked in CI. `python scripts/package_smoke.py` builds a wheel, installs it into a fresh environment, and exercises every packaged case plus installed HTTP/CLI agreement. This is distribution verification, not an independent scientific rerun.

See [HOSTING.md](HOSTING.md) for the branch location and later extraction.

## License

Project code is AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). External datasets retain their own rights and unresolved provenance questions.
