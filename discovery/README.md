# Lupine Discovery

A universal, conditional candidate-pool engine grounded in [Lupine Rhizo](https://github.com/alexwelcing/lupine-rhizo) and the [Lupine Library](https://github.com/alexwelcing/lupine-ledger). The core operates on arbitrary candidate IDs, objective intervals, and constraint intervals. Material-specific models supply those intervals and their evidence.

**The guarantee:** if every supplied interval encloses its corresponding true value, screening retains every feasible optimum in the supplied finite candidate universe. It also bounds the chosen feasible incumbent's regret. Physical interval soundness remains an explicit premise. A checksum, calibration score, or successful proof compilation cannot establish it.

This is the initial research implementation for a [four-day project](docs/four-day-plan.md). See [STATUS.md](STATUS.md) for completed work and open gates. No new DFT is required to run the examples or archived experiments.

Local verification: **18 Lean theorems compiled, 41 Python tests passed, and 6 axiom-audit parser tests passed**. See the [software execution record](reports/software-verification.md) and [formal verification record](formal/VERIFICATION.md). These counts record local verification; see [hosting and CI](HOSTING.md) for the current branch workflow.

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

Inputs minimize one scalar objective and express each constraint as `g <= 0`. Normalize a maximization objective by negation. Use integers or exact rational/decimal strings, such as `"1/3"` or `"0.125"`; floating-point JSON literals are rejected. Objective units, constraint units, scenario IDs, and reference definitions are explicit. Outcomes live in a separate file bound to the input digest.

## The mathematics

Write `F−` for candidates whose constraint upper bounds are all nonpositive and `F+` for those whose constraint lower bounds are all nonpositive. Sound intervals imply `F− ⊆ Ftrue ⊆ F+`.

When `F−` is nonempty, choose an incumbent `y` with the smallest objective upper bound `B = U(y)`. Retain exactly:

```text
P = {x in F+ : L(x) <= B}
R = B - min {L(x) : x in F+}
```

Every true feasible optimum is in `P`; the incumbent's regret is at most `R`. With no certified feasible incumbent, retain all of `F+` and report no regret bound. Ties survive. Compatible interval tightening can only shrink the retained pool. The pool may remain large.

See the [mathematical specification](docs/mathematical-specification.md), [Lean theorem map](formal/README.md), and actual [formal verification record](formal/VERIFICATION.md). The Lean definitions quantify over arbitrary candidate types; Python enumerates finite input sets. The Python implementation has not been formally proved to refine the Lean definitions. The [claim ledger](docs/claim-ledger.md) maps each guarantee to its evidence and identifies open premises.

## What the archived experiments found

Two published experimental-property archives were evaluated with a fixed composition-based surrogate and empirical calibration. Both violated simultaneous interval soundness:

| Archive | Test rows | Retained | Intervals missing truth | All optima retained |
|---|---:|---:|---:|---|
| Band gap | 888 | 842 | 89 | No: 5 of 471 tied optima discarded |
| Steel yield strength | 68 | 3 | 6 | Yes, in this run |

The steel nominal predictor already ranked the optimum first. These results establish neither superiority of this engine nor a physical discovery. The band-gap failure demonstrates why roughly 90% individual coverage is insufficient for a guarantee about the whole pool.

```sh
python -m pip install -e '.[benchmark]'
python scripts/archived_benchmark.py --output .cache/archived-results.json
```

Read the [frozen protocol and limitations](docs/archived-benchmark.md), [aggregate result artifact](reports/archived-v1.json), and [general evaluation protocol](docs/evaluation-protocol.md). Raw datasets are downloaded with pinned hashes and are not bundled. The run used NumPy 2.3.5; install that version to reproduce the recorded numerical environment.

The [joint-coverage design](docs/joint-coverage-design.md) derives one possible probabilistic route under explicit exchangeability assumptions. At a 5% joint failure budget, the pilot sample sizes would force unbounded intervals under that conservative construction. This route is documented, not implemented or validated by the pilots.

A separate [posthoc descriptor audit](docs/descriptor-audit.md) found three normalized-composition collisions with different band-gap labels. Their maximum disagreement gives a rigorous 1.15 eV worst-case error floor for deterministic predictors using only that descriptor on the recorded archive. The cause of the label disagreement remains unresolved; benchmark settings were not changed.

## Evidence and certificates

Certificates record the sealed input digest, exact selection, exclusion witnesses, evidence-link assessment, and a heuristic measurement queue. `verify` recomputes the certificate; it verifies identity and runtime consistency. It does not attest physical truth. Missing, assumed, rejected, or synthetic evidence remains visible. The measurement queue never truncates the retained pool and carries no acquisition-optimality guarantee.

The residual-envelope adapter supports Lupine's anchored Lipschitz correction formulation, conditional on a global residual bound in the declared scope. A Lipschitz estimate from sampled pairs does not discharge that premise. Run `python examples/anchored.py` for a synthetic end-to-end example. See [upstream provenance](docs/upstream-provenance.json) and the [adapter architecture](docs/architecture.md).

See [HOSTING.md](HOSTING.md) for the branch location and later extraction.

## License

Project code is AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). External datasets retain their own rights and unresolved provenance questions.
