# Prepared categorical header recorder

`run_header_after_ci.py` is fixed to published commit
`a6e87c198d8116d26c523e0e1b2eedce4aeb225b` and two commands:
`li_v3_compatible_zip_diagnostic.py diagnose --run 1`, then `--run 2`.
Preparation performed syntax and static review only. No recorder import,
invocation, network request or private source read was performed.

After independent static review and all actual gates, root's prepared invocation is:

```sh
python .cache/phase2-next-source-operations-v1/run_header_after_ci.py \
  --artifact-review .cache/phase2-notebook-header-artifact-review-v1/actual-a6e87c/review.json
```

The recorder requires the matching artifact audit, original four successful CI
jobs, both matching clean package receipts, the fixed prerequisite public receipt,
323 held runtime files and the committed diagnostic source guard. The branch,
HEAD, remote, clean worktree and full source guard are rechecked before and after
each operation, including the final one. Every Git call has a 30-second timeout;
each child operation has a 100-second timeout.

The exclusive `header-production` directory holds before/after source maps,
timing, private logs, hashes and closed execution/stop records. There is no retry,
overwrite or cleanup. Failed or unknown state stops before the next command.
Only a canonical, exact-shape public report with the fixed source identities,
closed categories and validated exposure flags can reach the public summary.
The recorder does not open the raw workbook or private capture receipt.

The original recorder and failed static reviews are preserved under
`before-header-review-fixes/`. The exact repair is `header-repair.diff`.
This is a controlled workflow, not a hostile-operator security boundary; a
filesystem failure may prevent new receipts from being written. Static review
and matching output hashes do not establish scientific readiness.
