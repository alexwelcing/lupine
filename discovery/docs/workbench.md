# Research workbench

The local interface uses the same exact selector and replay evaluator as the CLI.
It is an inspectable research preview, not a validated prediction service.

From `discovery/` in the Lupine checkout:

```sh
python -m pip install -e .
lupine-discovery serve
```

Open `http://127.0.0.1:8765` on the machine running the command. Use
`--port 8766` to choose another port. The server binds to loopback only, stores
no uploaded inputs, and stops with Ctrl+C. Remote workspace loopback is not a
publicly hosted preview. Browser state is cleared by reloading; export a
certificate to preserve a result.

## Inspect a recommendation

1. Choose a built-in known-answer case, or upload a problem JSON. The example
   `examples/abstract.json` shows the scalar format; the menu also includes
   calibrated and Pareto demonstrations. Each versioned problem declares
   scenario semantics and evidence; outcomes remain separate.
2. Build the candidate pool. Inspect the retained and excluded candidates,
   interval bounds, exclusion witnesses, evidence gaps, and measurement order.
   Scalar mode reports an incumbent and regret when established. Pareto mode
   preserves separate objectives and ties without a scalar winner. Calibrated
   abstention retains everyone and withholds screening. None of these proves the supplied physical
   intervals sound.
3. Download the certificate. Verify it independently with
   `lupine-discovery verify problem.json certificate.json` using the exact
   input. Verification checks identity and deterministic computation.
4. Reveal the case's known answers, or upload an outcome file bound to the
   problem digest. The replay reports coverage failures, all-optimum retention,
   feasibility, regret, and missing outcomes. Editing a problem invalidates its
   prior displayed result and the packaged answer binding.

Inputs are finite JSON documents up to 2 MiB and 5,000 candidates in this
preview. Decimal values should be strings, such as `"0.125"`; fractions such as
`"1/3"` are also exact. Use quoted strings for large integers beyond the
browser safe-integer range as well. Floating-point JSON values and duplicate keys are
rejected by the server. The browser preserves original upload text when making
requests so parsing cannot silently change those decisions.

## Run known-answer checks

The Known answers screen reruns the deterministic finite fixture suite and
displays separately recorded scientific archive results. Synthetic passes mean
the implementation matched independently enumerated truth and declared
expectations. A negative-control pass means a deliberate failure was detected;
it is not successful physical screening.

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
