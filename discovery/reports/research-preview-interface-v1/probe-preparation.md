# Supplemental actual public-report browser probe

Preparation only. This script has not been run against an actual report, and no
actual-study/private data was read while preparing it. Syntax checking is not
browser, scientific, or layout validation. Root must supply the original public
resource and its exact SHA only after the relevant public-output review.

The supplied digest is an input identity, not evidence that this probe performed
review. The optional `--review-reference` records opaque provenance without
attesting it. There is no separate approval flag or new review gate.

## Later command

From the Discovery checkout with Playwright and Chromium already available:

```sh
export PYTHONDONTWRITEBYTECODE=1
: "${LUPINE_REVIEWED_ORIGINAL_PUBLIC_SHA256:?Root supplies the reviewed original SHA}"
: "${LUPINE_ACTUAL_PUBLIC_UI_ATTEMPT:?Choose a fresh attempt identifier}"
python .cache/actual-public-browser-preparation/verify_actual_public_browser.py \
  --project-root "$PWD" \
  --resource-path "$PWD/src/lupine_discovery/resources/mpea-t25-v1.json" \
  --expected-public-sha256 "$LUPINE_REVIEWED_ORIGINAL_PUBLIC_SHA256" \
  --output-dir "$PWD/.cache/actual-public-browser-preparation/runs/$LUPINE_ACTUAL_PUBLIC_UI_ATTEMPT"
```

Optionally add `--review-reference` with root's review reference. Do not copy a
synthetic fixture into the resource path to make the probe pass. Do not use an
actual-study/private path as an argument. A missing report, wrong exact SHA,
wrong packaged-resource path, symlink, unsupported original-report shape, or
existing output directory stops before server startup. The accepted execution
mode is exactly `registered_original`, including legitimate unavailable reports
whose registration identity may be null. An unavailable report never requires
completed policy populations or infers a scientific verdict from its status.

This is an additional source-checkout browser check. A separate package probe
owns installed-wheel/resource/HTTP identity verification. This script starts the
real `make_server(0)`, uses the real UI to request `/api/benchmarks`, and requires
the returned `mpea_archived` object to equal the supplied original object with
JSON types preserved. It neither patches the server nor injects a renderer
fixture. Exact original file bytes remain independently bound by the supplied
SHA; API and exported JSON are object comparisons because they are reserialized.

## Assertions and evidence

- Registered archival label, exact verdict/status, scientific identity and the
  supplied registration identity, preserving absent early-stage registration.
- Every complete-report component state/reason, frozen check/reason, denominator
  and signed margin; or exact early-stop reasons, stage, count, null performance
  fields, and absent performance tables/gates.
- Both populations, all 24 policies, all seven caps and same-actual-pool-cost
  views, both comparison denominators, exact displayed hit/cost/regret values,
  and calibration status/reasons. No policy control is dropped.
- Access/capture counts, including unavailable counts, and exact whole-object
  equality of the downloaded displayed report.
- Desktop 1440 px and mobile 390/320 px screenshots, page overflow checks with
  disclosure sections open and closed, no JavaScript/console/request errors.
  Screenshots still require a later human or agent visual inspection.
- Python source and web asset hashes before/after, original resource stability,
  interpreter/Playwright/Chromium versions, invocation, source commit, timestamps,
  elapsed time, actual API response hash and output artifact hashes.

The fresh output directory contains `execution-start.json`, an exported copy of
the reviewed public report, three screenshots, and `execution-result.json`.
JSON evidence uses exclusive creation and read-only file modes; all destinations
must be new. This prevents accidental overwrite within the probe, not deliberate
filesystem tampering. Failures after the source-bound start receipt preserve a
failed execution record. Input refusal before start emits no execution result.

The final record's scope is `registered_original_public_resource_ui_only`.
Passing would establish actual supplied-public-object display/export behavior.
It does not authenticate a public registration tag, reconstruct private
aggregation, execute an archival study, establish physical validity, or establish
scientific superiority. No actual outcome is assumed by this preparation.
