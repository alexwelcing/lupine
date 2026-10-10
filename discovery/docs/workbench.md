# Research workbench

The local interface uses the same exact selector and replay evaluator as the CLI.
It is an inspectable research preview, not a validated prediction service.

From `discovery/` in the Lupine checkout:

```sh
python -m pip install -e .
python -m lupine_discovery serve
```

With the wheel already installed, run `python -m lupine_discovery serve` from
any directory. Its 28 built-in cases and displayed reports are bundled; no
source checkout, dataset download, or numerical package is needed to try them.
All six interface modes are available on Linux. Coupled, projection and direct
statistical-pool HTTP modes require Linux process guards; the other three modes
remain available on other platforms.

Open `http://127.0.0.1:8765` on the machine running the command. Use
`--port 8766` to choose another port. The server binds to loopback only, stores
no uploaded inputs, and stops with Ctrl+C. Remote workspace loopback is not a
publicly hosted preview. Browser state is cleared by reloading; download both
the **Problem** and **Certificate** files to preserve a verifiable result.

For a first run, choose **Exhaustive integer design problem**, click **Build
candidate pool**, then **Evaluate known answers**. The 81 candidates reduce to
`x3-y5`, and replay confirms that the known optimum survived. Download both
files; from their download directory, run:

```sh
python -m lupine_discovery verify lupine-problem-integer-design-grid.json lupine-certificate-integer-design-grid.json
```

The JSON result should contain `"verified": true` and
`"scope": "identity_and_exact_runtime_recomputation_only"`. This verifies the
saved pair, not physical truth. An altered or mismatched pair exits with code 2.

## Inspect a recommendation

1. Choose a built-in known-answer case, or upload a problem JSON. The example
   `examples/abstract.json` shows the scalar format; the menu also includes
   calibrated, Pareto, coupled, scoped projection and statistical-pool demonstrations.
   Each versioned problem declares scenario semantics and evidence; future
   outcomes remain separate. Statistical calibration outcomes are explicit input
   records and are displayed as such.
2. Build the candidate pool. Inspect the retained and excluded candidates,
   interval bounds, exclusion witnesses, evidence gaps, and measurement order.
   Scalar mode reports an incumbent and regret when established. Pareto mode
   preserves separate objectives and ties without a scalar winner. Calibrated
   abstention retains everyone and withholds screening. None of these proves the supplied physical
   intervals sound. Coupled mode distinguishes an exact model-consistency point
   from the assumed common physical world, and shows the operational pool
   separately from marginal box diagnostics. Projection mode also shows the
   original physical context, normalization, quantity maps, anchors and source
   declarations; missing bounds yield no numerical model and retain every ID.
   Statistical mode displays the supplied ranking, complete calibration records,
   exact risk budget and quantile, and the actual prefix. Its conditional marginal
   claim supplies no feasibility or regret certificate.
3. Download **Problem** and **Certificate** together. The problem download is
   the exact text submitted for this successful decision, including whitespace
   and exact numeric strings. It is not a reconstruction from displayed bounds.
   Verify the saved pair with `python -m lupine_discovery verify problem.json certificate.json`,
   substituting the actual filenames. Verification checks identity and
   deterministic computation. Both exports are disabled during pending work;
   edits and failed rebuilds clear the previous pair.
4. Reveal the case's known answers, or upload an outcome file bound to the
   problem digest; coupled, projection and statistical outcomes also bind the
   certificate digest. Statistical outcomes additionally bind the future panel. Replay
   audits the actual pool, reported feasibility and retained optima, preserving
   missing outcomes. Coverage, Pareto fronts, and regret appear only in the modes
   and states where they are defined. Editing a problem invalidates its
   prior displayed result and the packaged answer binding.

The usual outer request limit is 2 MiB and nesting depth 32. Verification alone
allows 14,156,800 bytes to carry JSON-escaped text, while separately enforcing
the 256 KiB problem and 2 MiB certificate document caps. Scalar, calibrated and
Pareto inputs allow up to 5,000 candidates. Coupled and projection input documents have stricter
limits: 256 KiB, depth 24 and 64 candidates, plus the dimension and proof limits
in the [coupled guide](coupled-problem.md#local-workbench-and-resource-limits)
and [projection contract](projection-workbench-contract.md). Statistical pools
use the same byte/depth profile, at most 64 calibration panels, 64 candidates per
panel, 4,096 total calibration-plus-future candidate slots and eight constraints.
All lexical/node/number limits also apply; they can reject a request before a
count ceiling is reached. See the [statistical contract](decision-pool-workbench-contract.md).
Decimal values should be strings, such as `"0.125"`; fractions such as
`"1/3"` are also exact. Use quoted strings for large integers beyond the
browser safe-integer range as well. Floating-point JSON values and duplicate keys are
rejected by the server. The browser preserves original upload text when making
requests so parsing cannot silently change those decisions.

## Understand an open pool or failed result

| Try this case or screen | What the result means |
| --- | --- |
| **Loose intervals**, then **Tightened intervals** | All six candidates initially remain; tighter supplied bounds reduce the pool to A. Retaining everyone can be a correct conservative decision. |
| **Insufficient calibration** or **Unsupported sampling scope** | All three candidates remain and screening is withheld. The nominal values do not certify feasibility, exclusions, coverage, or regret. Inspect the calibration reason before changing any premise. |
| **Tradeoffs and tied Pareto candidates** | The pool retains a, a-twin and b. Separate objectives and ties need not yield one winner. |
| **Missing consistency point, screening withheld** or **Learned relation, screening withheld** | Both candidates remain operationally, even when the separate box diagnostic is smaller. A hypothetical point or learned correlation does not establish a common physical world. |
| **Scoped correction field, conditional screening**, **Missing field bound, no numerical model**, or **Scoped field with an attained tie** | Inspect the complete original relation. A synthetic shared field can support a strict difference; missing bounds abstain, and attained ties survive. These examples do not validate a material model. |
| **Statistical prefix loses a tied optimum** | The exact prefix retains a,b; the separate truth reveals tied minima a,c. Lost optimum c remains a visible failure. A marginal theorem does not guarantee this realized pool. |
| **Unknown calibration label, full pool** | Every calibration record remains in n; the missing value withholds the threshold and retains all future candidates. Successful future replay cannot upgrade the sampling premise. |
| **Empty statistical prefix loses a feasible optimum** | Nineteen infeasible calibration panels yield threshold zero. The future feasible optimum is lost. The empty pool does not certify infeasibility, and vacuous calibration panels are not successful held-out discoveries. |
| **Negative control: false score interval** | Replay exposes the lost true optimum. Detecting this deliberately false premise is expected engine behavior. |
| **Known answers** → scientific gates and training-only development | Failed recommendation gates and `NO_GO_MODEL_IMPROVEMENT` are recorded scientific/development results, not installation errors. No replacement model or new coverage claim follows. |

## Run known-answer checks

The Known answers screen reruns the original 13-case deterministic fixture suite and
displays separately recorded scientific archive results. Synthetic passes mean
the implementation matched independently enumerated truth and declared
expectations. A negative-control pass means a deliberate failure was detected;
it is not successful physical screening.
The selector contains those 13 cases plus fifteen calibrated, Pareto, coupled,
projection and statistical-pool demonstrations. Open and evaluate those demonstrations from the candidate-pool
menu; the suite counter continues to describe the original 13 cases.

The scientific reports cover experimental band gaps, steel yield strength,
and molecular hydration free energies. Those frozen archived runs expose
interval failures and show comparison baselines. Opening the screen does not
retrain their models or redownload their source data. Full reproduction is
documented in the corresponding benchmark protocols.

A separate **Archived calculations** section displays the frozen constrained
JARVIS evaluation when its report is bundled. It separates primary and
oxygen-family holdout arms, displays every gate and failed check, and compares
four policies at six equal measurement budgets. Exact numerators, denominators,
and undefined states remain visible. The formation-energy constraint is not a
phase-stability, synthesis, or power-plant suitability certificate. Full replay
event logs contain archived target values and remain in a local ignored cache;
the bundled dashboard preserves derived results, complete failure summaries,
and the identities and commands needed to reproduce the audit.

The [release matrix](release-validation.md) separates research-preview readiness
from scientific recommendation claims. The [known-answer protocol](known-answer-benchmarks.md)
and [additional archive protocol](additional-archived-benchmark.md) preserve the
meaning and limits of these checks.

The **Training-only development** section records the reproduced comparison on
4,096 training records. All three ridge alternatives are ineligible; no model
is selected. Inspect both properties, every fold, ordinary and numerical-guard
gates, costs, and source identities. Its NO-GO result is development evidence,
not an independent coverage estimate. Loading the dashboard performs no fits.

Coupled, projection and statistical-pool inputs share a separate Linux worker
with CPU, wall-time, address-space and output limits. Unsupported platforms
refuse these three HTTP modes;
the other interface modes remain available. A hard failure clears the pending
result and offers no decision receipt. See the [coupled guide](coupled-problem.md)
for exact inputs, proof inspection, deferred outcome replay and limits.

## Interpret statistical-pool calibration

This mode requires an externally frozen ranking and complete recorded calibration
panels from a declared population. The receipt binds those declarations; it does
not verify their history or exchangeability. Its retention statement is marginal
over calibration and **one** future panel. It is not a verified risk for the
particular displayed pool, nor coverage conditional on feasibility, family, a
candidate, or the realized calibration set. Repeated/adaptive use is outside the
stated single-panel guarantee.

Incomplete labels and unsupported sampling withhold the threshold and retain
every candidate. Insufficient calibration uses threshold one, also retaining
every candidate. A finite threshold one is a distinct calibrated outcome; it
still offers no pool reduction. Empty statistical prefixes and empty universes
are separate states. There is no automatic top-one substitute, physical
feasibility color, candidate confidence, incumbent or regret bound.

The calibration table retains every original source, panel, ranking, label/null
and assessment. Future replay fixes the decision first, then checks every tied
minimizer against the actual pool. Incomplete future truth remains unknown;
complete empty/infeasible panels show vacuous logical retention separately from
feasible success. Every lost optimum remains visible. These constructed examples
are software controls, not a scientific validation of the panel sampling law.

## Package and test

Web assets, finite fixtures, and aggregate archived reports are included in the
Python wheel. Raw published datasets and local build/download caches are not.
HTTP tests exercise the actual API, input rejection, outcome binding, and exact
agreement with the CLI. Run the desktop/mobile Chromium checks with:

```sh
python -m pip install -e '.[test-ui]'
python -m playwright install chromium
python scripts/browser_smoke.py
```

Screenshots and a JSON report are written to ignored `.cache/browser/`.
See the [initial execution record](../reports/workbench-verification.md) and
[engine extension record](../reports/engine-extension-verification.md). The service
adds no runtime package dependencies.
