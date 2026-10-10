# Private registration capture: prospective root-only commands

Nothing below has been executed except helper `--help` and Python syntax checking. No API, tag, entropy, metadata allocation, features or targets were accessed. The helper is preparation tooling, not a new authorization factory. Use only after the final implementation and tests are committed, pushed and all four exact-commit jobs are green. Keep the original source checkout at its registered commit. Paths below are placeholders, not a claim of a completed ceremony.

Run from `discovery/`. Set `CAPTURE=.cache/mpea-private-registration-<unique-name>` and use a fresh private directory under the repository (root mode0700/umask077). Never overwrite artifacts. The helper reads Git source and already published public closure files, not private scientific inputs. Paths in generated refs are relative to the monorepo root.

## 1. Before tests, snapshot the exact closure

```
umask 077
python .cache/mpea-registration-allocation/capture-runbook/prepare_capture.py --output "$CAPTURE" --snapshot-only
```

`source-before.json` records the exact committed and current bytes. Closure: every tracked file under discovery/src, scripts, tests, formal; pyproject; Discovery Verify workflow; three study specifications; registration-publication note; four pinned public metadata reports; six retained sampler source/test/review artifacts; both feature-readiness process readiness/execution receipts and root reproduction receipt. Deduplicated count is printed, never hardcoded from an older checkpoint. No ignored caches or arbitrary full repository inclusion. Each file must equal `git show <HEAD>:<path>`.

## 2. Run and preserve engineering evidence

From discovery, execute exactly `python -m unittest discover -s tests -v`, capturing both stdout and stderr to `$CAPTURE/unittest.log`, preserving its actual process exit status separately. Do not use pipeline status as the Python status. It must exit0, have one `Ran N tests in ...` summary and standalone `OK`, no skips. A failure blocks; preserve its log, do not manufacture a success receipt. The helper cannot authenticate that the command ran or its exit code; root must verify the retained execution record before using it.

Concrete exit capture (future root execution, from discovery):

```python
import os, subprocess, json
from pathlib import Path
capture = Path(os.environ['CAPTURE'])  # export CAPTURE first
command = ['python', '-m', 'unittest', 'discover', '-s', 'tests', '-v']
with (capture / 'unittest.log').open('xb') as log:
    result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
with (capture / 'unittest-process.json').open('x') as receipt:
    json.dump({'command': command, 'exit_code': result.returncode}, receipt)
if result.returncode != 0:
    raise SystemExit('STOP: engineering command failed; preserve artifacts')
```

Also run the complete browser command `python scripts/browser_smoke.py`, retain its output and actual exit status; retain the 11 protocol-required synthetic behavior evidence and independent producer reviews. The gate's `commands` grammar specifically requires unittest-style summaries, so browser output is NOT falsely converted to such a command receipt. These broader checks support root's explicit trusted approval of one exact engineering SHA, rather than automatic sufficiency from N tests. Root must inspect both before/after snapshots and all evidence; helper-generated PASS alone authorizes nothing.

## 3. Capture official exact-commit CI (root only, future live actions)

Preserve the actual command, UTC observation and raw responses of:

```
git ls-remote https://github.com/alexwelcing/lupine.git refs/heads/research/lupine-discovery > "$CAPTURE/remote-observation.txt"
gh api --hostname github.com repos/alexwelcing/lupine/actions/runs/<RUN_ID> > "$CAPTURE/run.json"
gh api --hostname github.com 'repos/alexwelcing/lupine/actions/runs/<RUN_ID>/jobs?per_page=100' > "$CAPTURE/jobs.json"
```

Require remote branchHEAD==registeredcommit. Parser checks exact repository, branch, workflow path, completed/success run, exactly four distinct positive jobIDs with the required job names and completed/success; no cancelled or additional jobs. Response JSON is not independently authenticated offline: official transport and trusted parent's actual command capture are the boundary. The parent factory repeats live verification after publication.

## 4. Assemble closed private artifacts and approve exact SHA

```
python .cache/mpea-registration-allocation/capture-runbook/prepare_capture.py --output "$CAPTURE" --source-before-json "$CAPTURE/source-before.json" --unittest-log "$CAPTURE/unittest.log" --unittest-process-json "$CAPTURE/unittest-process.json" --remote-observation "$CAPTURE/remote-observation.txt" --run-json "$CAPTURE/run.json" --jobs-json "$CAPTURE/jobs.json" > "$CAPTURE/preparation-summary.json"
```

Helper validates source unchanged, builds canonical sealed manifest/engineering/CI/registration receipts and runs `_request` locally (no network). All outputs exclusive. It prints closure count, engineering SHA, registration byte SHA, original run/four sorted jobIDs and annotation hash. `content_sha256` hashes canonical preimage without the seal; refs hash complete stored canonical bytes. Registration receipt scientific SHA is null. Root explicitly approves the printed engineering receipt byte SHA only after reviewing full Python/browser/behavior/independent evidence. Keep that decision and its supporting log hashes separately. No arbitrary approved SHA or caller-supplied green JSON is sufficient.

## 5. Publish immutable allowlisted annotated tag (future root action)

`tag-message.json` is canonical ASCII JSON plus exactly one LF, generated using the implemented `public_registration_record`; contains only schema/protocol/binding/original CI run+four jobIDs. No scientific data. Verify name is absent locally and remotely first; absence commands and their exit status require deliberate review (a failed remote lookup is not evidence of absence). Never force, replace or redraw if already present.

From monorepo root, using absolute capture annotation path:

```
git -c commit.gpgsign=false -c tag.gpgsign=false tag -a --cleanup=verbatim -F /ABS/discovery/<CAPTURE>/tag-message.json mpea-t25-registration-v1 <REGISTERED_COMMIT>
git push origin refs/tags/mpea-t25-registration-v1
```

Preserve exact command/status, tag object `git cat-file tag <TAG_OBJECT_SHA>`, official ref/tag API responses and observation ordering. BranchHEAD stays unchanged; no GitHub Release. Tagger date alone does not prove publication time. Tag message may not be stripped/reformatted/signed/extended. The parent independently authenticates fixed ref type tag, underlying commit, raw Git object SHA and exact annotation before entropy. A fresh reproduction checkout must fetch the original tag read-only before verification.

## 6. Factory and launcher calls (future root actions)

Direct original factory signature: `verify_registration(Path(REGISTRATION), approved_engineering_sha256=APPROVED_SHA)`. Reproduction: `verify_reproduction_registration(Path(REGISTRATION), approved_engineering_sha256=APPROVED_SHA)`. Do not call original verification before tag publication; do not invoke allocation here. The reviewed launcher invokes these itself and preserves the parent capture. Do not pass an independently fabricated capture.

From discovery using promoted final scripts:

```
python scripts/mpea_archive_run.py --registration /ABS/discovery/<CAPTURE>/registration.json --engineering-sha256 <APPROVED_SHA> --feature /ABS/<FROZEN_FEATURE_ARTIFACT> --attempt <UNIQUE_ORIGINAL_ATTEMPT>
python scripts/mpea_archive_run.py --registration /ABS/discovery/<ORIGINAL_CAPTURE>/registration.json --engineering-sha256 <ORIGINAL_APPROVED_SHA> --feature /ABS/<SAME_FROZEN_FEATURE_ARTIFACT> --attempt <UNIQUE_REPRODUCTION_ATTEMPT> --original-attempt <ORIGINAL_ATTEMPT>
```

Original requires exact remoteHEAD. Reproduction requires exact old source checkout, original successful CI/tag/registration and official published-ancestor check; it imports original allocation/routes bytes and seals and never calls entropy. Do not create a replacement registration/tag/allocation. Launcher privately captures parent authorization under `.cache/mpea-archival-launches/<attempt>/`; stages under `.cache/mpea-archival/<attempt>/`. Failures preserve sealed prefix. Production sampled RSS and trusted-worker/path/host limits remain those of the published operational amendment. A terminal COMPLETE is operational, not a scientific GO. Registration publication must be observed before first entropy and before targets; later results publication is separate.

Preparation helper imports the current main `discovery/scripts/mpea_registration_allocation.py`, not its historical scratch candidate. It requires the exact integer-zero process exit receipt and preserves the observed SHA from the exact ls-remote output. These private observation files still rely on root authenticity; no file parser proves execution or transport. The prior helper is preserved as prepare_capture-v1.py.
