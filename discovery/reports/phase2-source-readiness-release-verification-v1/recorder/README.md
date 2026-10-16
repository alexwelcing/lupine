# Prospective clean package recorder

This recorder has not run a release. It is a small standalone recorder for the
reviewed 351-file source snapshot and its package/strict-verifier commands. Root
supplies the exact published commit after source publication and invokes:

```sh
python .cache/phase2-source-readiness-release-v1/record_release.py --commit FULL_COMMIT_SHA
```

The only run directory is the new exclusive `run-FULL_COMMIT_SHA` under this
lane. An existing directory stops invocation; there is no overwrite, retry,
resume, second slot or success conversion. A failed invocation is preserved and
needs a separately reviewed disposition. No production science command runs.

Before and after the commands, the recorder checks exact HEAD, empty Git status
for tracked/non-ignored untracked files, a named branch whose `origin` remote
reference equals that commit, exact committed runtime-manifest bytes and the
independently enumerated 351 working paths and hashes. Script, interpreter and
both tool identities are included in the before/after state. Ignored cache and
temporary data are outside the Git-status claim; the package tool separately
checks the committed source archive and its build sources.

The actual tool commands are:

```text
PYTHON -I scripts/package_smoke.py --retain-directory RUN/retained --output RUN/package-report.json
PYTHON -I scripts/verify_retained_artifacts.py --directory RUN/retained --commit COMMIT --repository REPOSITORY
```

Every command, including each read-only Git gate, first records its actual argv,
working directory and start time. Raw stdout/stderr go directly to exclusive
files. The completed execution record includes its observed return code or
launch error, end time, and stream hashes; it is saved before that result is
judged. There is no recorder-level timeout or claimed outer observation. If the
recorder is interrupted, a started record and partial streams are evidence of an
incomplete invocation, not completion. The existing tools retain their own
internal checks and limits.

The strict verifier runs only after package exit zero. The final `review.json`
can say PASS only when both actual subprocess exits are zero, no guard/error
occurred, and before/after source and recorder/interpreter identities agree.
Root separately observes the recorder's real exit code. A parsed report alone
does not provide that outer observation.

Evidence handoff for the independent artifact audit:

- `request.json`, `executed-recorder.py`, `source-before.json`, `source-after.json`;
- `package.started.json`, `package.execution.json`, `package.stdout`,
  `package.stderr`, and `package-report.json`;
- `strict.started.json`, `strict.execution.json`, `strict.stdout`, `strict.stderr`;
- the preserved before/after Git command records and streams;
- `review.json`, plus root's separately recorded actual outer exit observation;
- `retained/release-artifacts.json` and the two artifacts named by that receipt.

Root's actual artifact binding must name and hash the completed gate review and
relevant exact evidence, published commit, retained directory, auditor source,
preparation and runtime manifest. This recorder does not manufacture that gate
review or a CI result. It does not run the independent audit, acquire sources,
read private inputs, retry Li or Dryad operations, or alter scientific admission.
Retained wheel identity means exact tested bytes; it is not a claim that a later
wheel build will be byte-identical.
