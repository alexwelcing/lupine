# Reproduce the constrained benchmark in one command

Use a checkout containing the frozen JARVIS protocol, its committed source-format
amendment, and the implementation. Run from `discovery/`. For the complete
constrained-then-training reproduction, first follow the
[clean environment recipe](reproduction-environment.md) and keep that activated
environment and its fresh `LUPINE_REPRO_ATTEMPT` token. The constrained workflow
alone supports Linux and Python 3.11 or newer; the frozen training experiment has
the narrower numerical requirements described there.

Install the checkout into the active environment if not already installed, then
choose a fresh workdir and require the historical scientific digest:

```sh
python -m pip install -e .
export LUPINE_CONSTRAINED_WORKDIR=".cache/reproduce-jarvis-${LUPINE_REPRO_ATTEMPT:?Set a fresh attempt token}"
python scripts/reproduce_constrained.py \
  --workdir "$LUPINE_CONSTRAINED_WORKDIR" \
  --expected-scientific-digest cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900 \
  --project-dashboard
```

The source adapter records Linux peak memory and uses the standard-library
`resource` module. No new DFT, paid compute, or publication step is involved.
This command acquires target-bearing source bytes, freezes calibration and
predictions, and replays evaluation targets. It is not the training-only runner.

`--workdir` is required and must name a **new directory beneath this checkout's
`.cache`**. The workflow refuses existing directories, including empty ones.
This keeps raw targets and full reveal logs ignored, preserves previous runs,
and lets the engineering receipt bind its log inside the source tree as required
by the existing replay verifier. A stopped run remains available for inspection;
choose a new directory for another attempt.

To avoid downloading the same pinned source again, use the following **alternative
instead of the command above**, with a still-new workdir. Set
`LUPINE_RAW_SOURCE_CACHE` to a local directory holding the verified pinned archive;
this may be an earlier constrained workflow's `artifacts/` directory. Only its
raw ZIP and, optionally, extracted member are reused:

```sh
python scripts/reproduce_constrained.py \
  --workdir "${LUPINE_CONSTRAINED_WORKDIR:?Set a fresh workdir}" \
  --source-cache "${LUPINE_RAW_SOURCE_CACHE:?Set the existing raw source cache}" \
  --expected-scientific-digest cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900 \
  --project-dashboard
```

The source cache is read only. The workflow copies exactly the two authorized
raw filenames; it never copies labels, metadata, predictions, calibration,
freezes, or reports. The existing acquisition command verifies the pinned ZIP
size/MD5 and extracted-member agreement before any target custody pass. A
corrupt raw cache stops the run; it does not authorize a different dataset.
Record this as reused source bytes, not a new download or new scientific sample.

## What the command does

1. Verify the active editable package belongs to this checkout. Bind the original
   protocol and source audit, the format amendment, and source-file fingerprints
   in a new workflow receipt before acquisition.
2. Run the existing `acquire`, `freeze`, and `verify` commands against a fresh
   `artifacts` directory. The verification command leaves evaluation targets
   unopened.
3. Run every `tests/test_constrained*.py` engineering test, capturing the command,
   complete output, exit status, and source fingerprints before and after it.
   A nonempty successful unittest result with no skipped tests is required. Generate the replay's
   engineering-validation receipt automatically.
4. Run the existing guarded replay with that receipt. It saves its own execution
   identity before target access, gives every policy the same reveal budgets,
   and opens the full-truth evaluator only after policy runs finish.
5. Verify the complete report's content and normalized scientific digests. If
   requested, project compact dashboard/resource files and compress the complete
   audit report. Every output stays inside the selected workdir; committed
   reports and application resources are never overwritten.

Every stage writes its complete log under `logs/` and preserves stage receipts.
Source changes, command failures, invalid receipts, empty tests, or identity
mismatches stop dependent stages. Failed scientific acceptance gates remain
valid reported outcomes: they do not cause retuning or a fresh sampling seed.
The existing freeze and replay commands enforce the frozen computation budget;
acquisition and engineering verification have their own recorded stage logs.

## Compare a scientific result

The commands above request comparison with the published **scientific** digest.
Omitting `--expected-scientific-digest` performs the workflow without making that
comparison; a successful execution alone then does not establish a match with
the historical result.

The actual and expected digests are always preserved in
`scientific-digest-comparison.json`. A mismatch stops with its artifacts intact;
it is not silently accepted as a new reference result. A match compares the
normalized protocol/source/model/prediction identities, full policy results,
all 100 random-seed curves, and scientific gate status/checks. Run timing, local
paths and engineering-log byte identity are excluded from that digest. Full
report byte hashes still identify the particular run and may differ.

Use the workflow for a fresh run so its engineering receipt binds the executing
sources and test log. Do not rerun the direct replay command into its existing
`artifacts/constrained-full.json`; the workflow already created that immutable
report. The complete local report includes revealed raw targets; publish the
compact projection and provenance rather than placing it in Git.

Key artifacts are:

| Path under workdir | Contents |
| --- | --- |
| `workflow-start.json` | Protocol/amendment identities, source bindings, environment and requested comparison |
| `engineering-validation.json` | Actual successful test command, source hashes and preserved log hash |
| `artifacts/metadata.json`, `train.json`, `source-receipt.json`, `custody-receipt.json` | Four exact pinned inputs for the subsequent training-only runner; all four files are under `artifacts/` |
| `artifacts/freeze.json` | Frozen predictions/calibration and unopened-target seal |
| `artifacts/constrained-full.json` | Complete policy/reveal audit and all scientific results; keep local |
| `scientific-result.json` | Verified result identities and gate statuses without bulk reveal events |
| `scientific-digest-comparison.json` | Requested comparison and match/mismatch outcome |
| `derived/constrained-dashboard.json` | Optional compact derived view; the resource copy is also under `derived/` |
| `artifacts/constrained-full.json.gz` | Optional deterministic compression of this run's complete report bytes |
| `workflow-result.json` or `workflow-failed.json` | Completion or stopping reason with all preceding evidence retained |

After successful completion, the [training-only recipe](training-tail-run.md)
uses `--input-cache "$LUPINE_CONSTRAINED_WORKDIR/artifacts"`. That runner verifies
the four fixed input hashes and reads neither the co-located calibration labels
nor evaluation targets. It creates its own new output directory and separately
requires a fresh training engineering receipt; the constrained engineering
receipt is not interchangeable with it.

The command explicitly selects `--source-format nonfinite-sentinels` for the
existing acquisition CLI. This is the narrow, committed
[format amendment](constrained-format-amendment.md): upstream nonfinite tokens
become typed invalid observations, never finite numbers or model features.
The original strict source-format attempt remains blocked and preserved. The
[original scientific protocol](constrained-benchmark-protocol.md) is unchanged.

Reproducing the same public archive is a computational reproducibility check.
It is not a new independent scientific sample, a proof of exchangeability, a
physical validation, or a service-temperature/corrosion benchmark. The reported
screening and recommendation failures remain part of the result.
