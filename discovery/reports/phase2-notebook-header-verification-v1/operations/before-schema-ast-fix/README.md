# Prepared notebook operation recorder

Preparation is syntax and static review only. No recorder invocation, network
request, notebook acquisition or source inspection was performed by this work.

Root may invoke `run_notebook_after_ci.py` only after the commit containing the
four reviewed notebook files has its own successful original CI run and clean
retained package/strict verifier receipts. The expected commit is supplied
explicitly; it is never inferred from whichever branch happens to be checked out.

```sh
python .cache/phase2-next-source-operations-v1/run_notebook_after_ci.py \
  --expected-commit FULL_40_CHARACTER_COMMIT \
  --ci-receipt .cache/phase2-notebook-header-ci-v1/final.json \
  --package-receipt .cache/phase2-notebook-header-clean-package-v1/0-execution.json \
  --verifier-receipt .cache/phase2-notebook-header-clean-package-v1/1-execution.json
```

The explicit commit must be the newly published commit checked by all receipts.
These are root's prepared CI/package receipt locations; their existence or
completion has not been inferred by preparing this recorder. Receipt paths
must be under `discovery/.cache/`, outside private source custody. Package log
names follow the retained `0-stdout.txt`, `0-stderr.txt`, `1-stdout.txt` and
`1-stderr.txt` convention beside their execution receipts.

The recorder requires the exact repository/branch/HEAD/remote and clean source,
the runtime manifest, all four new reviewed hashes and five unchanged custody
hashes, and the committed-source guard. It verifies four original successful CI
jobs and links package/verifier results to their logs and retained-artifact
receipt. It checks source, remote, guard and input receipt hashes before each
operation and source/remote again afterward. It does not rerun CI or packaging.

Only these three child commands exist, with the current interpreter and fixed
working directory: `capture`, `inspect 1`, `inspect 2`. Each has a 120-second
timeout. Owned processes are terminated and reaped on timeout. There is no
automatic retry, command/URL/object override, cleanup or overwrite. Required
proxy and CA environment settings are preserved; Python import-path overrides
are removed. The recorder never opens the raw notebook or private capture record;
those reads remain inside the separately frozen source tool.

Every fixed object/capture/public slot must be absent before capture. The source
tool retains its own exclusive-write guards. An exclusive recorder attempt lock
is retained even after failure. A failed capture stops the sequence. Inspection
2 may follow inspection 1 only when its canonical closed public report matches
the fixed receipt, contains the same verified source/implementation, records a
complete supported success or static-profile rejection, has the corresponding
exit code and empty stderr, and passes the source hold. A valid schema/profile
block can therefore be replayed once without changing the source or parameters.

Private mode-0600 stdout/stderr logs, start/execution records and source maps
remain in a fresh mode-0700 timestamped directory. Unvalidated output is never
echoed. The public summary uses only validated fixed categories, exposure flags,
times, return codes and hashes. Invalid/incomplete output or state change stops
without turning that failure into a usable static finding. Two identical reports
establish computational replay only; scientific schema and all prior NO_GO
decisions remain unchanged.

This is a controlled-workflow recorder, not a hostile-operator security boundary.
Its production control flow has not been executed or runtime-tested during this
preparation. Actual operation remains root-owned and must produce its own records.
