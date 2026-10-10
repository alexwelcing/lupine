# Fresh-install reproduction of the constrained benchmark freeze

**PASS, 2026-10-10.** A new virtual environment, installed wheel and isolated
local process rebuilt the JARVIS custody and exact prediction freeze from raw
source bytes. All six compared artifact files and the freeze payload checksum
matched the original run exactly. The full machine record is
[reports/constrained-reproduction.json](../reports/constrained-reproduction.json).

This checks deterministic acquisition, grouping, splitting, prediction,
calibration and packaging. It does not run outcome replay or establish
scientific predictive success. It is a fresh installation on the same host and
base Python interpreter, not an independent research-group replication or
prospective blinded experiment.

## Isolation and rebuilt work

The run used a new directory,
`/tmp/lupine-constrained-reproduction-tkaac2ef`, containing a copied project,
wheelhouse, virtual environment, empty working directory and separate cache.
The copy contained the exact benchmark script, package source, `pyproject.toml`,
license/readme, and pinned protocol, source audit and format amendment. No
original processed JARVIS labels, split manifests, predictions or freeze files
were copied into the reproduction cache.

Only the verified ZIP and extracted JSON member were reused as raw bytes.
Their hashes were rechecked by acquisition. This avoids another download; it
does not test network availability independently. The initial cache inventory
and copied implementation hashes are recorded in the machine report.

The wheel was built from the isolated project using the host build tools,
then installed into a new Python **3.12.14** virtual environment with
`pip install --no-index --no-deps`, without editable installation. Each benchmark
command used the virtual environment's Python with `-I`, from a directory
outside both project copies. Import checks confirmed that `core`, `calibration`
and `serialization` came from the new wheel installation and had the pinned
source hashes. No original-checkout import path supplied those modules.

The new custodian reconstructed the representatives and missingness checks,
fixed splits/caps, training/calibration labels and sealed evaluation partition.
The new freeze reconstructed exact neighbor predictions, radii, candidate
panels, baseline orders and receipt. The final `verify` command passed without
opening evaluation-target bytes. The custodian necessarily parses the public
source; no evaluation replay, target-value inspection or scientific metric
computation occurred in this reproduction.

## Commands executed

The machine report preserves complete absolute arguments and working
directories. With `$run_root` denoting the temporary directory above, the
essential sequence was:

```sh
python -m pip wheel --no-deps --no-build-isolation "$run_root/project" --wheel-dir "$run_root/wheelhouse"
python -m venv "$run_root/venv"
"$run_root/venv/bin/python" -I -m pip install --no-index --no-deps "$run_root/wheelhouse/lupine_discovery-0.1.0-py3-none-any.whl"
"$run_root/venv/bin/python" -I "$run_root/project/scripts/constrained_benchmark.py" acquire --source-format nonfinite-sentinels --cache "$run_root/cache"
"$run_root/venv/bin/python" -I "$run_root/project/scripts/constrained_benchmark.py" freeze --cache "$run_root/cache"
"$run_root/venv/bin/python" -I "$run_root/project/scripts/constrained_benchmark.py" verify --cache "$run_root/cache"
```

The explicit source-format compatibility mode is the
[committed amendment](constrained-format-amendment.md). The original strict
import remains blocked and preserved. Neither the scientific protocol nor the
pinned producer source was edited for reproduction. Source identities bind
protocol commit `b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` and amendment commit
`e04c5d6cca8e677cadc0cefa4208f2625d89e227`; implementation identities are exact
file hashes, since this test used a source snapshot rather than a remote Git
checkout.

## Matched identities and resource use

| Rebuilt artifact | Result |
|---|---|
| Source receipt | Exact SHA-256 match |
| Target-blind representative manifest | Exact SHA-256 match |
| Metadata and split manifest | Exact SHA-256 match |
| Custody receipt, including target-seal identity | Exact SHA-256 match |
| Prediction manifest | `530b13400aa1b6b97b3362f76358cfd2bce5a8610221f3fc69da3ec39323c343` |
| Complete freeze file | `7490a580796566bb972e52394816b680b472e46d83566a22f415168582ac49b6` |
| Freeze payload excluding its own checksum field | `6a6166486b5761d1138d3d31df03a2dc00ed900a28dfa1ee59780eae70637ff0` |

The recreated population counts also agree: 75,993 archived rows, 51,889
composition representatives, 4,096 training and 2,048 calibration examples,
and 50 panels of 20 candidates in each evaluation arm. These are partition
counts, not coverage or success measurements.

The installed wheel was 105,542 bytes with SHA-256
`d13a2ef9c1f9be292dd89e02504f689b397f25012b77c808661f672156d4d8d5`.
The driver took **254.18 seconds** including wheel construction, environment
creation, installation, acquisition, freeze and verification. The freeze's own
execution record reports **127.48 seconds** and **183,052 KiB** peak RSS on
Linux. Across subprocesses, measured CPU time was 100.901772 user seconds plus
9.770024 system seconds, with maximum recorded child peak RSS of 201,884 KiB.
Timings and memory measurements live outside the frozen scientific identity;
they are not expected to match the first run.

The original negative pilot results and any constrained-replay failures remain
unchanged. A byte-identical freeze establishes reproducibility of this
implementation and source snapshot; it does not establish exchangeability,
physical accuracy, recommendation advantage or validity outside the declared
finite candidate panels.
