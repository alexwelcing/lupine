# Prepare the environment for a fresh scientific reproduction

These instructions prepare a new local attempt of the published constrained
benchmark and training-only development experiment. Run them from `discovery/`
in a checkout containing the frozen protocols and implementations. They do not
change the protocols, provide new holdouts, or turn the negative findings into
successful material recommendations.

The package's [`pyproject.toml`](../pyproject.toml) deliberately allows Python
`>=3.11`, and its optional `benchmark` dependency allows NumPy `>=2,<3`. Those
are flexible installation requirements for the preview package. Installing
`.[benchmark]` alone does **not** reproduce the frozen numerical environment.
The current constrained wrapper and training runner also check that the loaded
package/helper comes from this checkout: use an editable installation for these
commands. An isolated wheel installation is a separate packaging check, not a
substitute for this source-origin requirement.

## Required environment and historical identity

The training runner enforces these requirements before fitting:

| Item | Requirement |
| --- | --- |
| Interpreter | CPython **3.12.14**, not merely a `python3.12` command name |
| Operating system and architecture | Linux, `platform.machine() == "x86_64"` |
| NumPy | **2.3.5** |
| NumPy BLAS and LAPACK build metadata | Both version **0.3.30**, both OpenBLAS configurations containing `USE64BITINT` (ILP64) |
| Process environment before NumPy import | `PYTHONHASHSEED=0`; all six numerical thread variables below equal `1` |
| Library evidence | Nonempty NumPy distribution-file hashes and loaded OpenBLAS shared-library hashes, readable through the Linux `/proc` interface |
| Source origin | Active editable checkout; frozen protocol/helper hashes and freshly tested implementation |

The published [first pass](../reports/training-tail-pass-1-v1.json) records
`OpenBLAS 0.3.30  USE64BITINT DYNAMIC_ARCH NO_AFFINITY Haswell MAX_THREADS=64`.
Its loaded library `libscipy_openblas64_-fdde5778.so` has SHA-256
`ee2039cf13a45e1e89f04d0cea9585657d93ffaa425594e1935161013fdf4e12`.
Its NumPy distribution-file aggregate SHA-256 is
`e6cd5dd9c188d974efa41175516cfc21a70e68a7b126dfca4b811fbca07b80a6`.
These are historical identities to compare and disclose, not a promise that
every NumPy 2.3.5 wheel has the same build. The runner records the actual hashes;
it does not pin these two historical hash values as environment acceptance gates.
Installation paths, generated executable scripts, operating-system/CPU details
and dynamic BLAS dispatch may differ between machines.

The historical receipt's `/opt/_internal/cpython-3.12.12/...` NumPy build paths
describe the wheel build environment. They do not replace the required runtime
CPython version, which is 3.12.14.

## Create a fresh virtual environment

Provision CPython 3.12.14 on Linux x86-64 first. This recipe does not install an
operating system or build an interpreter. It verifies the selected interpreter
before creating the environment and refuses to reuse an existing directory.
Use the same attempt token in the subsequent workflow and engineering receipts.

```sh
set -eu
export LUPINE_REPRO_ATTEMPT="local-$(date -u +%Y%m%dT%H%M%SZ)-$$"
export LUPINE_VENV=".cache/reproduction-envs/${LUPINE_REPRO_ATTEMPT}"
python3.12 - <<'PY'
import os
from pathlib import Path
import platform
import re
import venv

if (platform.python_implementation(), platform.python_version(),
        platform.system(), platform.machine()) != ("CPython", "3.12.14", "Linux", "x86_64"):
    raise SystemExit("Requires CPython 3.12.14 on Linux x86-64.")
if not re.fullmatch(r"[A-Za-z0-9_-]+", os.environ["LUPINE_REPRO_ATTEMPT"]):
    raise SystemExit("Invalid attempt token.")
environment = Path(os.environ["LUPINE_VENV"])
if environment.exists() or environment.is_symlink():
    raise SystemExit("Environment already exists; choose a new attempt token.")
venv.EnvBuilder(with_pip=True).create(environment)
PY
. "$LUPINE_VENV/bin/activate"
python -m pip install --only-binary=:all: "numpy==2.3.5"
python -m pip install -e .
```

The shell stops if any command fails. Binary-wheel availability depends on the platform
and configured package index. A missing or incompatible wheel is an environment
block, not permission to relax the frozen version or BLAS requirements. The
editable package install has no NumPy runtime dependency; the explicit NumPy
installation above supplies the numerical dependency for this experiment.

## Verify the actual numerical stack before data work

Set all six variables before starting the verification process. The training
orchestrator will also set them before starting each of its two fresh workers.

```sh
export PYTHONHASHSEED=0
export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
export BLIS_NUM_THREADS=1
export VECLIB_MAXIMUM_THREADS=1
export NUMEXPR_NUM_THREADS=1
python - <<'PY'
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, "scripts")
import training_tail as tail

source = tail.protocol_identity()
environment = tail.environment_identity()
record = Path(os.environ["LUPINE_VENV"]) / "environment-check.json"
with record.open("x", encoding="utf-8") as stream:
    json.dump({"source": source, "environment": environment}, stream,
              sort_keys=True, indent=2, allow_nan=False)
    stream.write("\n")
print("Source and numerical environment checks passed:", record)
PY
```

This preflight reads source files and installed-library metadata/bytes. It does
not open JARVIS labels or fit a model. Keep its record with the attempt. The
actual experiment still generates and verifies its own environment and source
receipts; this convenient preflight does not replace either those checks or the
source-bound engineering test receipt.

## Run the two workflows with separate access boundaries

1. Run the [constrained reproduction](constrained-reproduce.md), using a fresh
   `.cache/reproduce-jarvis-${LUPINE_REPRO_ATTEMPT}` workdir and the expected
   historical scientific digest. Its default route downloads the pinned
   archive; the documented alternative reuses only previously acquired raw
   source bytes. This workflow performs original calibration and evaluation.
2. Follow the [training-only instructions](training-tail-run.md). Generate fresh
   engineering evidence directly in `reports/`, use the constrained workflow's
   `artifacts/` directory as the pinned input cache, and choose the new output
   `.cache/training-tail/jarvis-training-tail-v1-${LUPINE_REPRO_ATTEMPT}`. The
   separate training processes allow only the four declared training/custody
   inputs and preserve the original calibration/evaluation access prohibition.

Existing workdirs and published `*-v1` evidence are not reusable output locations.
Do not delete an incomplete attempt to make its name available. Preserve the
stopping reason and choose a new token. Keep per-record data, raw predictions,
coefficients and complete evaluation reveal logs inside the ignored cache.

Each training process has a 900-second wall-time ceiling and a 2 GiB peak-RSS
ceiling; the two processes execute sequentially. The constrained workflow has
its own frozen compute limits and records acquisition, fitting, test and replay
costs. Passing software checks and reproducing the negative scientific result
are compatible outcomes.

## What matching does and does not establish

The two new training processes must match the runner's required environment,
source, exact prediction/metric and decision fields. Raw float64-only differences
are separately reported. Compare the new completed scientific digest with the
historical result as described in the training guide; the wrapper's two-process
comparison does not itself make that historical comparison.

Exact final rational quantization and pinned version/configuration checks do
**not** guarantee identical numerical results on every machine. Retain any
mismatch, the actual binary/environment identities and gate margins, and
investigate before making a reproduction claim. Do not change precision, limits
or reference hashes to obtain a match. Full receipt byte hashes normally differ
because paths, engineering logs and resource costs identify the new execution.
Repeating the archived experiment is computational reproduction, not a new
independent scientific sample or an additional coverage validation.

The formal development separately pins `leanprover/lean4:v4.29.0` in
[`formal/lean-toolchain`](../formal/lean-toolchain). Preserve that file and the
repository's dependency manifest when checking formal builds. Neither scientific
runner invokes Lean; a new Lean compilation must be reported separately from
Python execution and does not establish physical accuracy of the input models.
