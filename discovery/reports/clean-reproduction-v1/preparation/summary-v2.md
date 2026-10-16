# Clean same-host frozen reproduction

Completed from detached commit `2a09d36491e092e851a529e58000444f3b6479e2` in `/workspace/lupine-release-reproduction/discovery`.
Attempt: `local-20261010T194558Z-58801`. No tracked source or frozen receipt was edited. The only new nonignored files are the fresh training engineering receipt and log required under `reports/`.

Both expected scientific digests match:

| Workflow | Expected and actual scientific SHA-256 | Result |
| --- | --- | --- |
| Frozen constrained JARVIS | `cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900` | MATCH; all six workflow stages complete |
| Training-only negative experiment | `60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656` | MATCH in both fresh processes; COMPLETE_REPRODUCED |

The constrained engineering suite passed 34 tests. Engineering integrity, nontrivial constrained evidence and shift behavior remain PASS; observed primary screening and recommendation value remain FAIL. The separate training engineering suite passed 22 tests, with zero failures, errors or skipped tests and identical before/after source hashes. Both training workers retain `NO_GO_MODEL_IMPROVEMENT`, select no model, and agree on every required comparison and all raw floating-point artifact hashes. No scientific gate was relaxed, result retuned, or failed result removed.

## Executed commands and source bindings

The existing target path was checked absent before creation:

```sh
git -C /workspace/lupine-discovery-branch worktree add --detach /workspace/lupine-release-reproduction 2a09d36491e092e851a529e58000444f3b6479e2
```

The fresh virtual environment was created with the documented `venv.EnvBuilder(with_pip=True)` recipe using CPython 3.12.14. Inside it:

```sh
python -m pip install --only-binary=:all: numpy==2.3.5
python -m pip install -e .
```

The documented numerical/source preflight passed. Six numerical thread variables were set to 1 and `PYTHONHASHSEED=0` before imports. The environment uses Linux x86_64, CPython 3.12.14, NumPy 2.3.5 and OpenBLAS/LAPACK 0.3.30 ILP64. Loaded OpenBLAS SHA-256 exactly matches the historical `ee2039cf13a45e1e89f04d0cea9585657d93ffaa425594e1935161013fdf4e12`. NumPy distribution aggregate is `93b3e82739780cbebe54313396f3ad297c649b2770736ee61f593ef035387f42`, differing from historical `e6cd5dd9c188d974efa41175516cfc21a70e68a7b126dfca4b811fbca07b80a6` only at generated `bin/f2py`, `bin/numpy-config`, and distribution `RECORD`. This installation identity difference is recorded and is not a relaxed version or BLAS gate.

Only the raw `jdft_3d-12-12-2022.json.zip` was copied from the original ignored JARVIS cache into a new ZIP-only cache. It is 40,811,489 bytes, MD5 `fb3e1eb80339a70ff313af1c644c1777`, SHA-256 `d4c64660e9e1fa45c82bd8868a96ec10162195eed69636445972c05550d8d0d6`. No old extracted member, labels, metadata, predictions, calibration, freezes or reports were copied. The frozen adapter rechecked archive size/MD5, member layout and member bytes before fresh custody processing. No MPEA archive was read.

With `LUPINE_REPRO_ATTEMPT=local-20261010T194558Z-58801`, the actual constrained command was:

```sh
python scripts/reproduce_constrained.py \
  --workdir .cache/reproduce-jarvis-local-20261010T194558Z-58801 \
  --source-cache .cache/reproduction-raw-source/local-20261010T194558Z-58801 \
  --expected-scientific-digest cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900 \
  --project-dashboard
```

The exact training engineering Python recipe was extracted unchanged from the committed `docs/training-tail-run.md`, then executed in the active environment. It ran:

```sh
python -m unittest discover -s tests -p 'test_training_tail*.py' -v
```

It generated fresh `reports/training-tail-engineering-validation-local-20261010T194558Z-58801.json` and `reports/training-tail-engineering-tests-local-20261010T194558Z-58801.txt`. The actual training command was:

```sh
python scripts/training_tail.py run \
  --input-cache .cache/reproduce-jarvis-local-20261010T194558Z-58801/artifacts \
  --output-dir .cache/training-tail/jarvis-training-tail-v1-local-20261010T194558Z-58801 \
  --engineering-validation reports/training-tail-engineering-validation-local-20261010T194558Z-58801.json
```

The recorded stage commands and before/after source maps are in each constrained `NN-*-result.json`; all exit codes are zero and all changed-source lists empty. The training engineering receipt binds both tests and scientific implementation before/after. Both worker receipts bind the same source, engineering, environment, input and fold identities. The final local audit independently reconstructed each training scientific digest from `SCIENTIFIC_FIELDS`, checked stage/log/source bindings, and checked that all original frozen four-input hashes match.

## Costs and access scope

Constrained replay reports 49.128279 seconds wall time and 571,088 KiB peak RSS; freeze reports 17.693221 seconds. These timings have the runner's recorded scope and exclude final JSON serialization/dashboard compression. Training process wall times were 32.72269531100028 and 29.15089052199619 seconds; worker peak RSS was 161,140 and 160,240 KiB, below the unchanged 900-second/2-GiB limits.

The constrained workflow legitimately opened the historical calibration/evaluation targets. Each separate trusted training worker records exactly `custody-receipt.json`, `metadata.json`, `source-receipt.json`, and `train.json` as original data inputs; all pinned hashes match freshly rebuilt custody artifacts. Both workers report no calibration/evaluation reads and no new coverage claim. Bound source, synthetic engineering tests and fold receipts support the fold-before-label read boundary; this is not an OS/native-code security audit.

This is a same-host reproduction in a separate checkout, virtual environment and processes using the same frozen archive. It is not new data, a new holdout, independent scientific replication, physical validation, or a demonstration of model improvement.

## Safe evidence and preserved private artifacts

`publishable-artifacts-v2.json` is an explicit hash-bound allowlist of aggregate receipts, commands, source bindings, environment metadata and engineering logs. `audit-result-v2.json` is the aggregate local audit result. All listed paths are relative to this detached `discovery/` checkout. The audit uses the constrained workflow's completed-report verification and does not claim to independently reconstruct its full policy digest from aggregate summaries alone.

Full reveal reports (including their compressed copy), raw source bytes, train/calibration/evaluation labels, per-record predictions, fold data and fitted coefficients are deliberately absent from the allowlist. They remain untouched in ignored cache directories. No artifacts were copied into the main checkout.

The final v2 local audit separately implements canonical scientific hashing with Python standard-library JSON and SHA-256. It requires the complete stage and process record sets, checks the constrained engineering log’s anchored final test summary, compares actual pass fields rather than trusting comparison flags alone, and captures each inspected receipt’s bytes once for parsing and hashing. The initial audit artifacts remain preserved; this refinement did not repeat any scientific workload or alter a scientific result.
