# Additional molecular retrospective benchmark

Protocol fixed on 2026-10-10 before downloading or opening `database.txt` target
columns. This is a retrospective experiment on a public archive, not a
prospective blind trial. Public README provenance and format documentation were
read first. Settings below will not be tuned after test outcomes are opened.

## Frozen settings

- Source: MobleyLab/FreeSolv, commit
  `6c7d19b4b565537365ffd22006aa2cd4643200c6`, `database.txt`.
- Task: minimize archived experimental hydration free energy in kcal/mol.
  Calculated free energies in the archive are not features, training labels,
  calibration labels, or test answers. No simulation is run.
- All records with a nonempty ID and SMILES string are included. Missing,
  malformed, or duplicate records fail the run rather than being silently
  removed. Experimental uncertainties are retained in the audit as metadata;
  point values are the evaluation targets, not exact physical ground truth.
- Group by the exact archived SMILES string. Hash seed
  `lupine-freesolv-v1-2026-10-10`; SHA256 modulo 100 yields train below 60,
  calibration below 80, and test otherwise. Equivalent alternative SMILES and
  related chemical scaffolds are not detected by this grouping.
- Features are normalized counts of overlapping character bigrams in the
  archived SMILES. No learned vocabulary, names, row IDs, physical answers,
  published calculated values, or uncertainties enter the distance. This is a
  deliberately basic text representation, not a chemically invariant graph
  descriptor. Euclidean squared feature distance, five nearest training
  neighbors, unweighted exact mean of their experimental labels, deterministic
  ID ordering for distance ties. Fewer than five training rows fails closed.
- Calibrate symmetric prediction intervals using the order statistic
  `ceil((n + 1) * 0.9)` of absolute calibration errors. A rank exceeding n
  fails closed. This is empirical conformal-style calibration; no exchangeability
  or simultaneous coverage guarantee is asserted.
- Freeze all test prediction intervals before opening test targets. Run the
  unchanged exact selector. Keep all failures and tied optima in the report.
- Compare retained-pool size, optimum retention and regret to nominal and
  seeded random orders at identical pool size, and also nominal/random top one.
  No arbitrary top-k truncation changes the selector's retained pool.
- SHA256-pin source bytes, target-free split manifest, and prediction manifest.
  Hashes provide identity, not physical truth or prospective independence.

## Source attribution and reuse

Mobley and Guthrie, *FreeSolv: a database of experimental and calculated
hydration free energies, with input files*, Journal of Computer-Aided Molecular
Design 28, 711–720 (2014), [DOI:10.1007/s10822-014-9747-x](https://doi.org/10.1007/s10822-014-9747-x).
See the [pinned source README](https://github.com/MobleyLab/FreeSolv/blob/6c7d19b4b565537365ffd22006aa2cd4643200c6/README.md)
and [license](https://github.com/MobleyLab/FreeSolv/blob/6c7d19b4b565537365ffd22006aa2cd4643200c6/LICENSE).
The source offers its data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
to the extent its authors have the right to license it, explicitly retaining
possible original-source restrictions. Raw database bytes remain in ignored
cache files. This project reports a new analysis, with no endorsement by the
FreeSolv authors. Individual experimental references in the database remain
the provenance of the corresponding answers.

## First frozen-protocol results

The run used all 642 archived records. SHA256 of the downloaded source bytes:
`2d13f095713bc39b85f85dd7b4e5483fbb12fc694bf253bb1d92a4c4d484f260`.
The target-free manifest hash is
`ef89e18bb13d96532ae79f2457d58c0d44266da3294d289786e6b5e1341acfde`;
the frozen prediction manifest hash is
`4fdb4ee7697667dbd34dd49668cad7b67f5c8a059f6e83ae9d4a96a5bb14841b`.

| Measure | Result |
|---|---:|
| Train / calibration / test rows | 367 / 137 / 138 |
| Empirical calibration radius | 3.47 kcal/mol |
| Held-out point answers inside intervals | 116/138 (84.06%) |
| All test answers inside intervals | false |
| Retained pool | 8/138 (5.80%) |
| Unique archive optimum retained | true |
| Incumbent observed regret | 0 kcal/mol |
| Conditional regret bound | 6.94 kcal/mol |
| Nominal same-budget best regret | 0 kcal/mol |
| Random same-budget best regret | 8.69 kcal/mol |
| Nominal top-one regret | 0 kcal/mol |
| Random top-one regret | 14.14 kcal/mol |

The optimum was found, but 22 test answers fell outside their intervals. Thus
the simultaneous interval premise is refuted in this archive, despite perfect
observed incumbent regret. Nominal top-one ranking finds the same optimum,
so this run establishes no improvement over nominal selection. A single seeded
random comparison is not statistical evidence of improvement over random
selection across repetitions or domains. Source-reported test uncertainties
range from 0.10 to 1.93 kcal/mol; 124 of 138 test entries explicitly note assigned
default uncertainties. Those uncertainties are not asserted as hard physical
enclosures, and near-tied point values need not imply a physically resolved
ordering. The source includes some unpublished original experimental references;
publication of the curated archive does not resolve every primary-source
provenance question.

The simple character representation and exact-SMILES grouping do not establish
chemical identity invariance, family independence, or performance on novel
scaffolds. This task broadens the property family tested; it does not validate
operating-condition constraints, power-plant suitability, universal predictive
accuracy, or molecule generation.

## Reproduction

From `discovery/`:

```sh
PYTHONPATH=src python scripts/additional_archived_benchmark.py
PYTHONPATH=src python -m unittest discover -s tests -p 'test_additional_archived_benchmark.py'
```

The script uses the standard library plus the local package. Source bytes are
downloaded to ignored `.cache/freesolv-database.txt`; altered cache bytes fail
the pinned hash check. The aggregate report is
`reports/additional-archived-v1.json`, including every uncovered test ID and
the distinct test-answer references. Tests independently guard held-out label
access and verify that altered calculated free energies cannot affect parsed
features or experimental answers. The code's ordering enforces the stated
retrospective separation; this is not a third-party prospective lockbox.
