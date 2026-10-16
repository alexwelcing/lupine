# Software verification: local research workbench

Executed on 2026-10-10 with Python 3.12.14 and Chromium through Playwright.
This record establishes software behavior, not physical predictive validity.

## Executed checks

- `python -m unittest discover -s tests -v`: **66 tests passed**. The 41
  existing tests are joined by 12 known-answer tests, 8 HTTP tests, and 5
  additional archival-protocol tests. They challenge exact API/CLI agreement,
  outcome separation and binding, edited inputs, duplicate JSON keys, malformed
  numbers, and selection before built-in answer resources are opened.
- `python scripts/known_answer_benchmark.py`: **13 case expectations passed**.
  Eleven fixtures have sound intervals; all feasible optima survive in the ten
  with feasible solutions. Two deliberately unsound controls expose lost
  optima, separately counted as failure-detection checks. Independent finite
  truth enumeration and formula checks do not derive answers from selection.
  See `known-answers-v1.json` and `../docs/known-answer-benchmarks.md`.
- `python scripts/browser_smoke.py`: **10 named Chromium checks passed**,
  with no JavaScript errors. Tested desktop at 1440 × 1050 and mobile at
  390 × 844: selection, certificate download and Python re-verification,
  separate answer reveal/upload, unresolved and infeasible states, visible
  negative-control failures, invalidation after editing, preserved duplicate
  JSON rejection, and all three archived reports. Mobile screens had no
  horizontal overflow. See `browser-v1.json`; generated screenshots remain in
  ignored `.cache/browser/` and are uploaded by the browser CI job.
- `node --check src/lupine_discovery/web/app.js`: passed. The frontend uses
  local assets with no external runtime libraries.
- A fresh wheel was installed in a clean temporary virtual environment and
  exercised outside the checkout with `python -I`. HTTP `/`, `/app.js`, and
  `/styles.css` returned their assets; the catalog contained 13 cases; all
  13 benchmark expectations and all 3 archive records loaded; the grid's
  selected pool and incumbent were exactly `x3-y5`. The import path was
  confirmed under the virtual environment's `site-packages`. Wheel SHA256:
  `31e4f638eef802feb46fdfebaa3a55f3f7918ccb3c7b8d59dec13e9e83389627`.
- A separate agent reviewed the integrated HTTP/browser path and found no
  remaining research-preview blockers. This is a shared-workspace code review,
  not independent scientific reproduction.

`runtime-manifest-workbench.json` records the checked source, assets, packaged fixtures,
scripts, and test hashes. The earlier snapshot is preserved as
`runtime-manifest-initial.json`; `software-verification.md` records that history.
Later source additions are recorded in the current `runtime-manifest.json` and
their own execution records.

## Scientific evaluation

The first two pinned Matbench reports remain unchanged. The new FreeSolv
experiment uses 642 archived experimental records with a frozen
367/137/138 train/calibration/test split. It retains 8 of 138 candidates and
the unique held-out optimum, but **22 prediction intervals miss their answers**.
Nominal top-one ranking also finds the optimum. The report therefore refutes
the current joint interval premise and establishes no recommendation advantage.
See `additional-archived-v1.json` and `../docs/additional-archived-benchmark.md`.

The workbench reruns the finite synthetic suite when requested. Its scientific
cards display recorded archive reports; opening the screen does not reproduce
the full scientific training/calibration runs. Protocol-specific commands do
that separately. No new DFT or synthesis was performed.

## Formal and release boundaries

The 18 Lean statements and proof source are unchanged by the interface work;
their actual build and six parser-test evidence remain in
`../formal/VERIFICATION.md`. The interface does not add a Python-to-Lean
refinement theorem or discharge physical enclosure premises.

The monorepo workflow and standalone workflow now include desktop/mobile
Chromium checks alongside Python 3.11/3.12 and the pinned Lean build. This
document records local execution; remote runs are available from the
repository's **Discovery Verify** Actions workflow.

The deliverable is a **local research preview**. All three empirical archives
fail joint interval soundness, and band gap loses five tied optima. Operating
conditions, multi-property measurements, independent source/temporal holdouts,
and advantage over established baselines remain scientific release gates in
`../docs/release-validation.md`. A browser pass cannot override these failures.
