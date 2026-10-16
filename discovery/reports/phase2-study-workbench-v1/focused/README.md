# Exact study-planning workbench: bounded engineering evidence

This increment adds an outcome-free study-planning view and two strict HTTP
endpoints for the existing exact planner. It preserves unknown score probability,
deterministic infeasible-rank threshold-event zero, unverified hypothetical IID
assumptions, and best-case zero-failure resolution. Probability, rank and resolution
arithmetic remain in Python; the browser displays and exports its exact JSON.
Finite rank does not establish useful pool reduction. A zero-failure resolution
count is not prospective power or an observed scientific result.

**Checkpoint: focused candidate checks passed; root combined validation is pending.**
Read [checkpoint.json](checkpoint.json) for the explicitly unfinished integration
and publication steps. This bundle does not attest a full-suite, package,
full-workbench-browser or exact-commit CI pass for the final combined source.

## Actual focused executions

| Execution | Result | Scope |
| --- | --- | --- |
| Separate-agent HTTP tests, first filename | 15 passed | Real loopback HTTP; closed bounded inputs, exact wire behavior and negative states |
| Same HTTP tests, final neutral filename | 15 passed | Final test source; 0.834 s unittest time; not 15 additional test cases |
| Selected unchanged legacy HTTP tests | 2 passed | Selection/CLI agreement and strict duplicate/float rejection |
| Author browser, final | 9 groups passed | Real Chromium, exact exports, stale requests, 320/390 px layout and maximum valid fraction |
| Separate-agent browser, first and second | 6 groups passed in each | Independent harness; exact boundary cases, keyboard/navigation, invalidation, forged guarantee-status rejection and visual review |

All runs used copied local source. Author browser execution included only the six
synthetic catalogs and their problem fixtures, package modules and web assets; archived reports and
outcome files were absent. The author and independent browser runners explicitly
blocked archive-report and outcome-reading functions. HTTP tests were conducted
in a modules-only overlay. The HTTP receipts bind both the original base server
(`f58f55c5…`) and its candidate replacement (`c2c0e436…`): the candidate file was
copied over the base module in the execution overlay, so the latter is the server
that was exercised. These are software checks of hypothetical planning,
not new scientific experiments, validation of physical truth, evidence of IID
sampling, or proof that Python or JavaScript refines a Lean theorem. Scientific
usefulness remains unestablished; the scientific NO_GO is unchanged.

## Every author browser attempt is retained

| Attempt | Actual process exit | Interpretation |
| --- | --- | --- |
| `browser-first` | 0 | Initial 9-group pass; long exact fractions were fully wrapped but made an excessively tall page |
| `browser-second` | 1 | Harness synchronization failed before the second held `route.fetch` completed; response capture and cleanup were corrected |
| `browser-third` | 1 | Harness string `wait_for_function` was blocked by the existing CSP; locator/data-attribute synchronization replaced it, with no CSP weakening |
| `browser-fourth` | 0 | 9-group pass with bounded, labeled, keyboard-focusable exact-value scrolling |
| `browser-revision-mutant` | 1 | Intentional synthetic negative control: removing the two stale-response revision guards caused the stale-result equality assertion to fail |
| `browser-final` | 0 | Exact final helper and product; 9 groups, no JavaScript errors, all 66 overlay file hashes unchanged; 8.366 s elapsed |

The mutant is a deliberately broken control and must never be applied to release
source. Its exact two-line patch and original/mutant source hashes are retained.
No failed attempt was relabeled as a pass. Original receipts include source hashes,
commands, process exits, timestamps and raw logs. Historical helper source versions
for the first three attempts are identified by receipt hashes but are not included
as complete source snapshots in this compact bundle. The final helper and runner
are retained. The independent browser's second run changed only screenshot scroll
position; its first runner and both actual receipts are retained.

## Contents and identity

- `http/`: both HTTP invocations, two selected legacy tests, reviews and raw logs.
- `author-browser/`: all six attempts, exact JSON exports, logs and mutation control.
- `independent-browser/`: separately authored harness, both executions and review.
- `source-review/`: separate-agent source review and final styling addendum.
- `scripts/`: final HTTP tests and author browser helpers, plus first HTTP source.
- `screenshots/`: three original PNGs: final author desktop, final 320 px maximum
  exact fraction, and independently inspected 320 px form. Other screenshots are
  named in original receipts but intentionally omitted from this compact bundle.
- `bindings/`: exact original and candidate file bindings and the candidate handoff.
- `inventory.json`: copied/generated byte inventory, excluding itself to avoid a
  circular hash. Each copied file retains its original workspace-relative path.

Files were copied without rewriting their provenance. Absolute execution paths and
ignored-cache paths in the historical receipts identify the actual original
execution environment; they are not claims that those paths exist in a new checkout.
Hashes establish file identity, not trustworthy observations or scientific validity.
No source overlays, environments, binary packages, papers or scientific archives
are included. The PNGs show only synthetic planning inputs and interface output.

## Reproduction and remaining work

After root integrates the mapped product files, the HTTP tests live at
`tests/test_server_study_planning.py`; the planner browser checks live at
`scripts/planning_browser_checks.py` and are called by `scripts/browser_smoke.py`.
From `discovery/`, the focused HTTP command is:

```sh
PYTHONPATH=src python -m unittest discover -s tests -p test_server_study_planning.py -v
```

With the documented Playwright test dependencies installed, the maintained full
workbench entrypoint is `PYTHONPATH=src python scripts/browser_smoke.py`. That broader
command includes existing archived/synthetic workbench checks beyond the outcome-free
planner; its execution and claim scope must be reported separately. It was not run by
the author for this candidate bundle. Use the release validation workflow for final
source and package reproduction.

The copied independent browser harness deliberately binds the original ignored
synthetic overlay and is an execution record, not a portable standalone installer.
A fresh run requires recreating a source-equivalent synthetic overlay and recording
new bindings; editing historical receipts would not reproduce their execution.

Root owns final combined package/browser checks, source publication, required CI,
and updating the pending checkpoint. No deployment or new scientific claim follows
from these focused passes.
