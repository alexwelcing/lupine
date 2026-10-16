# Run the frozen training-only development experiment

The [frozen protocol](training-tail-protocol-v1.md) is committed as
`188752f733e4768a995165fe9770696d5bbf09e1`, with SHA-256
`56b1810a2bae15261f64eef62abb7d74886d80b3116c7233700b0c52da88c9bf`.
The runner compares the original exact composition 5NN against three fixed ridge
configurations, using five folds of the existing 4,096 training representatives.
It performs development selection only. Original calibration/evaluation targets
are forbidden inputs; the original benchmark and its negative findings remain
unchanged. A successful development gate permits designing a fresh protocol,
not claiming coverage or publishing a validated material recommendation.

Implementation: [`scripts/training_tail.py`](../scripts/training_tail.py).
The focused and independent synthetic suites are
[`tests/test_training_tail.py`](../tests/test_training_tail.py) and
[`tests/test_training_tail_review.py`](../tests/test_training_tail_review.py).
Both must pass against the exact implementation before a real run. The public
command and its worker refuse a missing, failed, skipped, stale, or source-mismatched
engineering receipt. A test receipt identifies an executed check; it is not a
cryptographic proof that the log was produced honestly.

## Create the source-bound engineering receipt

First follow the [clean environment recipe](reproduction-environment.md), which
defines `LUPINE_REPRO_ATTEMPT` and verifies the frozen numerical requirements.
Run all commands from the same `discovery/` checkout and activated environment.
The package must be installed from this checkout with `python -m pip install -e .`;
a different installed copy fails the source-origin checks.

After independent source review, the following command runs only synthetic tests,
records source hashes before and after, and writes evidence with fresh names.
It reads no JARVIS input. The verifier requires its receipt and log directly in
`reports/`; these two engineering files contain no per-record scientific data.
Leave the published `*-v1` evidence untouched. A failed or interrupted attempt
keeps its artifacts: choose a new attempt token instead of overwriting them.

```sh
python - <<'PY'
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, "scripts")
import training_tail as tail

attempt = os.environ["LUPINE_REPRO_ATTEMPT"]
if not re.fullmatch(r"[A-Za-z0-9_-]+", attempt):
    raise SystemExit("Use a nonempty ASCII letter/digit/hyphen/underscore attempt token.")
log_path = tail.ROOT / f"reports/training-tail-engineering-tests-{attempt}.txt"
receipt_path = tail.ROOT / f"reports/training-tail-engineering-validation-{attempt}.json"
for path in (log_path, receipt_path):
    if path.exists() or path.is_symlink():
        raise SystemExit("Evidence path already exists; choose a fresh attempt token.")
identity = tail.protocol_identity()
tests = ["tests/test_training_tail.py", "tests/test_training_tail_review.py"]
names = list(identity["implementation_sha256"]) + tests
snapshot = lambda: {
    name: hashlib.sha256((tail.ROOT / name).read_bytes()).hexdigest()
    for name in names
}
before = snapshot()
command = [sys.executable, "-m", "unittest", "discover", "-s", "tests",
           "-p", "test_training_tail*.py", "-v"]
environment = os.environ.copy()
environment.update({name: "1" for name in tail.THREAD_VARIABLES})
environment["PYTHONHASHSEED"] = "0"
run = subprocess.run(command, cwd=tail.ROOT, env=environment,
                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
after = snapshot()
log_sha = tail.immutable_bytes(log_path, run.stdout)
summary = re.search(
    rb"(?:^|\n)Ran ([0-9]+) tests? in [0-9.]+s\n\nOK\n?\Z", run.stdout
)
passed = int(summary.group(1)) if summary else 0
ok = run.returncode == 0 and passed > 0 and before == after
receipt = {
    "schema": "lupine.discovery.training_tail.engineering.v1",
    "status": "PASS" if ok else "FAIL",
    "protocol_commit": tail.PROTOCOL_COMMIT,
    "protocol_sha256": tail.PROTOCOL_SHA256,
    "test_files": tests,
    "source_sha256_before": before,
    "source_sha256_after": after,
    "tests": {
        "command": command, "exit_code": run.returncode,
        "passed": passed, "failed": 0 if ok else None,
        "errors": 0 if ok else None, "skipped": 0 if ok else None,
        "log_path": str(log_path.relative_to(tail.ROOT)),
        "log_sha256": log_sha,
    },
}
tail.write_json(receipt_path, receipt)
if not ok:
    raise SystemExit("Engineering checks failed; evidence preserved. No real fit.")
print(tail.verify_engineering(receipt_path, identity))
PY
```

The gate binds the runner, original neighbor helper, imported serialization
implementation and both test files. It checks that the loaded serializer is the
file being hashed. The verbose test log's **final** summary must be an exact
passing unittest summary with the declared count; words such as “skipped” in
legitimate test method names are harmless. An actual skipped-test summary,
earlier nested `OK`, wrong count, incomplete run or changed source is rejected.

## Obtain the pinned training inputs

For an end-to-end reproduction, complete the
[fresh constrained workflow](constrained-reproduce.md) first. It defines
`LUPINE_CONSTRAINED_WORKDIR` and rebuilds the source custody artifacts from the
pinned archive. Pass its **`artifacts/` subdirectory** as the training input cache:

```sh
export LUPINE_TRAINING_INPUT_CACHE="${LUPINE_CONSTRAINED_WORKDIR:?Complete the fresh constrained workflow first}/artifacts"
```

This cache must contain the original pinned `metadata.json`, `train.json`,
`source-receipt.json` and `custody-receipt.json`. The training runner verifies their
exact hashes; it does not accept the workflow directory itself, a ZIP-only cache,
or `freeze.json` as a substitute. Do not populate the fresh cache by copying old
processed labels or prediction artifacts. A hash mismatch is `BLOCKED_INPUT`,
not permission to update the frozen input hashes.

The constrained workflow acquires target-bearing source bytes, builds the
original calibration/freeze, and replays the original evaluation. It is **not a
training-only operation**. The restriction on original calibration/evaluation
reads below applies to the separate training runner. A verified existing cache
may instead supply the same four pinned inputs; disclose that custody-artifact
reuse rather than claiming they were rebuilt in this attempt. Historical source
reuse cannot create newly untouched calibration or evaluation labels.

## Execute the two fresh processes

After review and the passing engineering receipt, run:

```sh
export LUPINE_TRAINING_WORKDIR=".cache/training-tail/jarvis-training-tail-v1-${LUPINE_REPRO_ATTEMPT:?Set a fresh attempt token}"
python scripts/training_tail.py run \
  --input-cache "${LUPINE_TRAINING_INPUT_CACHE:?Set the verified artifacts directory}" \
  --output-dir "$LUPINE_TRAINING_WORKDIR" \
  --engineering-validation "reports/training-tail-engineering-validation-${LUPINE_REPRO_ATTEMPT}.json"
```

The output directory must be new and resolve beneath `discovery/.cache/training-tail/`.
An existing directory or a path/symlink escaping this ignored cache is rejected.
The wrapper launches two separate Python processes with `PYTHONHASHSEED=0` and
all numerical thread variables set to one before NumPy imports. Each process
requires CPython 3.12.14, NumPy 2.3.5, Linux x86-64 and OpenBLAS/LAPACK 0.3.30 ILP64.
Its receipt records the actual package/shared-library hashes and numerical build.

Only the four pinned original input JSON files may be read: metadata, source
receipt, custody receipt and training labels. The label file is inaccessible
until the process writes `folds.json` **and** `folds-receipt.json`, which stores
the manifest hash. The original full-freeze verifier is never called because it
also opens calibration labels. There is no raw archive input route. The active
open audit rejects unrelated data files, including copied ZIP/compressed files;
it permits the fixed source/documents, Python library code and experiment-owned
artifacts needed for execution. This is a boundary around trusted runner code,
not a security sandbox for arbitrary hostile Python/native extensions.

Per process, the wall-time ceiling is 900 seconds and peak RSS ceiling is 2 GiB.
The worker checks both between queries and fits; the parent also terminates a
worker exceeding its 900-second process timeout. Completed fold checkpoints
survive interruption. A killed or incomplete worker cannot advance and is not
misreported as source drift merely because its identity receipt is missing.
No fitting jobs, cloud resources or target requests are launched outside these
two local processes.

## Artifacts and interpretation

The wrapper writes `reproduction.json`. Each `pass-1/` and `pass-2/` directory
contains its own:

- fold manifest and prelabel hash receipt;
- fold preprocessing means, row/feature/target order, unseen-element counts,
  neighbor IDs, fitted coefficients and raw little-endian float64 predictions;
- exact rational quantized OOF predictions for every model, retained in the
  ignored cache;
- completed-fold checkpoints and an incomplete checkpoint when needed;
- `pass-receipt.json`, with identities, all aggregate/fold metrics, exact gate
  margins, model failures, raw/quantized artifact hashes and separate resource costs.

The wrapper requires complete scientific fields, recomputes the scientific
receipt digest, compares both processes, binds both to its starting source
identity and rechecks its own source at completion. Quantized predictions,
metrics, gates and selection must match. Raw float64-only differences are
reported separately; they do not silently alter the rational decision outputs.
Machine resource costs are excluded from the scientific-result digest.

The published historical run completed with `NO_GO_MODEL_IMPROVEMENT`, no selected
model, and scientific SHA-256
`60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656`.
The wrapper compares the two new processes with each other; it does **not** accept
an expected historical digest argument. Compare the completed new
`reproduction.json` decision's `scientific_result_sha256` with that value before
calling the result a reproduction of the historical scientific output. Preserve
and investigate a mismatch; do not silently replace the reference. The complete
receipt bytes need not match: attempt paths, engineering logs, installation
identity and measured resource costs belong to the new execution.

`GO_DESIGN_FRESH_PROTOCOL` means that one fixed ridge configuration passed all
predeclared requirements for both targets, including the numerical sensitivity
guard, in a complete reproduced development run. It permits preparing a new
protocol with previously unused calibration/evaluation allocations and a clear
access history. No such labels are read by this command. The run does not fit a
final all-training model or generate new calibrated intervals.

`NO_GO_MODEL_IMPROVEMENT` preserves the failed comparison. A separate execution
status distinguishes a completed negative result from source, environment,
engineering, reproducibility or resource blocks. Do not change the grid, folds,
thresholds, precision or labels in response and rerun under the same protocol ID.

Publish aggregate metrics and receipts after review. Keep per-record predictions,
neighbor tables and coefficients inside the ignored experiment cache; do not
copy raw target tables into a public result. Pooled OOF residuals are model-selection
evidence, **not exchangeable calibration data or an unbiased independent test**.
Neither exact arithmetic nor a source hash removes that limitation.
The compact historical dashboard is pinned to the published receipts. A new
attempt does not authorize replacing those receipts or the dashboard resource.
