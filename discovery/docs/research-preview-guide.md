# Try the research preview

Use the local workbench to inspect a candidate pool, verify its saved decision, and compare it with separately revealed known answers. The engine does not supply a validated physical model or establish that an unknown material works in a power plant. The recorded release decision is **GO_RESEARCH_PREVIEW** for this evidence-review tool; [STATUS](../STATUS.md) and the [release matrix](release-validation.md) identify its exact source, checks and scientific limits.

## Install and try one case

From the Lupine checkout, enter `discovery/`. On Linux with Python 3.11 or newer, create a fresh environment:

```sh
python3 -m venv .cache/preview-venv
. .cache/preview-venv/bin/activate
python -m pip install -e .
python -m lupine_discovery serve
```

Use an unused environment path if that one exists. Open `http://127.0.0.1:8765` on the machine running the command; stop with Ctrl+C. Add `--port 8766` to change the port. This is a loopback service, not a hosted site. The base package needs no numerical library or dataset download to display its bundled cases and reports. All six HTTP modes work on Linux; coupled, projection and statistical-pool HTTP modes require its process guards.

Choose **Exhaustive integer design problem**, click **Build candidate pool**, then **Evaluate known answers**. The synthetic 81-candidate example retains `x3-y5`; replay confirms the known optimum survived. Inspect the excluded candidates and their reasons as well as the retained pool.

Download both **Problem** and **Certificate**. The problem file preserves the exact submitted text. From the download directory, with the environment still active:

```sh
python -m lupine_discovery verify lupine-problem-integer-design-grid.json lupine-certificate-integer-design-grid.json
```

Look for `"verified": true`. This checks input identity and deterministic recomputation, not physical truth. Edits or failed rebuilds invalidate the previous saved-pair controls; a page reload clears browser state. See the [workbench guide](workbench.md) for uploads, limits and all result details. An already installed wheel can run `python -m lupine_discovery serve` from any directory; the checkout is needed for the scripts below.

## Choose the input mode

All modes use the same `select`, `verify` and `replay` commands; the versioned JSON chooses the mode. They require supplied candidate inputs, bounds, models or rankings, rather than inventing molecules or atomistic predictions.

| Mode | Supplied information and what to inspect |
| --- | --- |
| [Scalar intervals](../examples/abstract.json) | One objective and constraint intervals. Inspect exclusions, feasibility bounds, and an incumbent/regret bound only when present. |
| [Calibrated predictions](calibrated-problem.md) | Nominal values, residual records and sampling declarations. Insufficient calibration or unsupported sampling withholds screening and retains everyone. |
| [Pareto objectives](pareto-problem.md) | Several objective intervals. Tradeoffs and ties may remain; there is no scalar winner or regret claim. |
| [Shared-affine / coupled](coupled-problem.md) | Affine quantities in a common latent model. Inspect proof witnesses and consistency separately from the assumed common physical world. Box diagnostics are not the operational pool. |
| [Scoped projection](projection-workbench-contract.md) | Context, normalization, observation weights, anchors and declared bounds. Missing required bounds produce no numerical model and retain every ID. |
| [Statistical pool](decision-pool-workbench-contract.md) | A frozen ranking and recorded calibration panels. Inspect every calibration label/null, risk budget and retained prefix. The conditional marginal guarantee is not a guarantee for this displayed pool. |

Use integers or quoted exact values such as `"0.125"` and `"1/3"`; JSON floating-point numbers are rejected. Quote large integers beyond browser precision. Keep future outcomes separate. Statistical calibration labels are inputs, not future truth. Coupled, projection and statistical outcomes also bind the decision certificate; statistical outcomes bind the future panel.

A retained candidate is not automatically feasible or optimal. A full pool can be correct conservative abstention. Missing truth remains unknown, not success. An empty statistical pool does not certify infeasibility: try **Empty statistical prefix loses a feasible optimum**. **Statistical prefix loses a tied optimum** exposes another realized failure. Pareto replay cannot establish the complete true frontier from incomplete outcomes.

## Use the CLI and known-answer suite

From `discovery/`, choose a fresh output directory; `--output` overwrites an existing file:

```sh
mkdir -p .cache
mkdir .cache/preview-demo
python -m lupine_discovery select examples/abstract.json --output .cache/preview-demo/certificate.json
python -m lupine_discovery verify examples/abstract.json .cache/preview-demo/certificate.json
python -m lupine_discovery replay examples/abstract.json examples/abstract.outcomes.json
python scripts/known_answer_benchmark.py
```

Choose another demo directory if it already exists. `lupine-discovery` is an equivalent installed command name. `replay` takes a problem and outcomes, not a certificate positional argument. CLI exit 0 means the command completed; a scientific replay failure remains in its JSON. Invalid input or a mismatched certificate exits 2.

The **Known answers** screen reruns the same original 13-case suite, including two deliberately unsound controls. A control passes when its expected failure is detected. The menu's 28 cases include fifteen additional mode demonstrations; the suite counter is still 13. Neither fixture success nor certificate verification establishes predictive accuracy on materials.

## Plan without opening outcomes

The planner commands take declared design values, not dataset paths or outcome
arrays. From an installed checkout:

```sh
python -m lupine_discovery plan-pool --calibration-count 20 --alpha 1/10 --cutoff 3/4
python -m lupine_discovery plan-pool --calibration-count 20 --alpha 1/10 --cutoff 3/4 --iid-score-probability 19/20
python -m lupine_discovery plan-zero-loss --loss-ceiling 1/10 --significance 1/20 --maximum-evaluation-panels 100
```

The first command leaves the chance of reaching the cutoff unknown. The second
assumes IID panel scores with a hypothetical 19/20 chance of meeting that cutoff;
it does not estimate that chance from materials. The third asks how many IID
evaluation panels would be needed to reject the stated loss null **if zero
losses were observed**. It does not compute power or certify observed accuracy.
Counts are bounded at 256 per command; exact fractions use integers, fraction
strings or ordinary decimal strings. `--output` writes a JSON plan. Exit 0 means
the arithmetic completed, including insufficient-resolution results. See
[the derivations, limits and counterexamples](study-planning.md).

## Read the archived evidence

Opening **Known answers** displays recorded results without rerunning fits or downloading datasets:

- The [three original archive pilots](../README.md#what-the-archived-experiments-found) violate simultaneous interval soundness; the band-gap pool loses five tied optima.
- [Constrained JARVIS](../reports/constrained-result-v1.md) retains all 1,000 primary candidates and fails useful-screening and recommendation-value gates. Its formation-energy constraint is an elemental-reference screen, not convex-hull stability or plant suitability. These are archived calculations.
- The [training-only comparison](../reports/training-tail-result-v1.md) remains `NO_GO_MODEL_IMPROVEMENT`; no replacement model or new coverage claim follows.

The separately registered [MPEA v2 study](../reports/mpea-t25-archival-v1/recovery-v2/README.md) completed and computationally reproduced `NO_GO_ARCHIVAL_USEFULNESS`. It retains all 82 primary and all 55 complete-record secondary candidates. The 82-to-55 difference is a predefined eligibility restriction, not screening. Secondary optimum recall is 9/9 feasible panels, but the full pool exceeds the 3/4 size limit; there are only 9 discovery panels, below the required 10. At cap 4, primary ranking hits 7/9 versus processing 8/9, objective-only 7/9 and random controls 147/180. All three ranking comparisons fail.

The authentic report is bundled in runtime `6585a605`; **Known answers** shows its recorded negative verdict and exact denominators. In an earlier or unbundled installation, a “no bundled result” notice describes local report availability, not whether the study occurred. The [preserved v1 operational stop](mpea-preallocation-recovery-v2.md) is a different event with no performance verdict. The [actual-resource browser check](../reports/research-preview-interface-v1/README.md) passes 10 assertion groups; the [clean installed-package checks](../reports/research-preview-artifact-v1/README.md) separately verify the resource bytes and HTTP JSON values. Synthetic controls are not actual results.

The full secondary pool at threshold 1 retains every member deterministically; this does not establish useful screening or validate the general calibration sampling premise. The same-host/same-operator MPEA reproduction reuses its fixed allocation, not a new statistical sample. Reconstructing it externally requires the authenticated original registration, allocation, registry and private custody artifacts; public aggregates alone are insufficient. That private custody currently remains in the execution workspace; no separately verified durable backup or restored-environment study execution has been demonstrated. There is no implemented MPEA custody export/restore command, and package retention excludes ignored `.cache` inputs. The supported frozen-source reproduction route permits a later remote branch descendant through its ancestry check; local execution still uses the registered source and original private graph. The demonstrated release scope is the package, examples and public reports plus the actual same-host study reproduction, not complete public reconstruction. [The next-study note](../reports/next-independent-study-v1/README.md) keeps new scientific evaluation separate from reproducing this result.

Archived replay can test recovery of recorded answers under its declared protocol and compare equal-cost policies. It cannot establish physical performance for an unknown material, general predictive superiority, or high-temperature/corrosion suitability. [Same-host reproduction](../reports/clean-reproduction-v1/README.md) checks the computation; it is not independent scientific replication or a new holdout.

## Reproduce the historical negative experiments

These optional runs are separate from trying the interface. First follow the complete [fresh-environment recipe](reproduction-environment.md): CPython 3.12.14 on Linux x86-64, NumPy 2.3.5, OpenBLAS/LAPACK 0.3.30 ILP64, recorded source/environment checks and one numerical thread. It creates `LUPINE_REPRO_ATTEMPT` and an editable install. Installing `.[benchmark]` alone does not reproduce that environment.

With that environment active, run the [constrained workflow](constrained-reproduce.md):

```sh
export LUPINE_CONSTRAINED_WORKDIR=".cache/reproduce-jarvis-${LUPINE_REPRO_ATTEMPT:?Complete the environment recipe first}"
python scripts/reproduce_constrained.py \
  --workdir "$LUPINE_CONSTRAINED_WORKDIR" \
  --expected-scientific-digest cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900 \
  --project-dashboard
```

This reads the original calibration/evaluation data; it is not training-only. Next complete the [training recipe's fresh engineering-receipt step](training-tail-run.md#create-the-source-bound-engineering-receipt). Only after that step passes:

```sh
export LUPINE_TRAINING_INPUT_CACHE="${LUPINE_CONSTRAINED_WORKDIR:?Complete constrained reproduction first}/artifacts"
export LUPINE_TRAINING_WORKDIR=".cache/training-tail/jarvis-training-tail-v1-${LUPINE_REPRO_ATTEMPT:?Set a fresh attempt token}"
python scripts/training_tail.py run \
  --input-cache "$LUPINE_TRAINING_INPUT_CACHE" \
  --output-dir "$LUPINE_TRAINING_WORKDIR" \
  --engineering-validation "reports/training-tail-engineering-validation-${LUPINE_REPRO_ATTEMPT}.json"
```

The two separate training workers accept only the four pinned original data inputs: metadata, training labels, source receipt and custody receipt. They do not read calibration/evaluation labels. Compare the completed reproduction's scientific digest with `60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656`; matching the two new processes alone is not a historical match. Keep failed attempts, exact receipts and private per-record outputs in the locations specified by the recipes. Do not overwrite published results or change frozen criteria to turn a negative result into a pass.
