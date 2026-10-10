# MPEA row-metadata producer: reviewed pre-execution checkpoint

The reviewed G15B producer passes **37 focused checks** (19 author, 18 independent)
and **601 full-suite Python tests**. The full run completed in 77.006 test-runner
seconds, with all 192 source/resource hashes unchanged. See the
[integration receipt](mpea-row-metadata-engineering-v1.json),
[full execution receipt](mpea-row-metadata-test-receipt-v1.json),
[full log](mpea-row-metadata-release-tests-v1.txt), and
[independent review](mpea-row-metadata-independent-review-v1.md).

These are synthetic engineering checks. No actual observation row has been
processed at this checkpoint. The source must be committed and its CI verified
before the first fixed-cache invocation. Root owns that execution boundary.

## Implemented scope

The [amendment](../docs/mpea-row-metadata-amendment-v1.md) permits byte framing
of the verified CSV and processing only formula, processing, test mode,
temperature and source DOI metadata. Formula/DOI become opaque exact-token
groups; only closed categories and exact decimal test temperatures are disclosed.
Unknown metadata never removes a row or becomes a shared unknown identity.
Every other cell remains opaque, including target presence and numeric validity.

The wrapper verifies the committed files, pinned mapping and captured scanner
bytes before one bounded cache read. Hashing and framing use the same immutable
buffer. Any framing, width or limit failure withholds the entire row array and
count. There is no successful prefix or failed-row position. Successful metadata
processing still reports `METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED` and exit 2.

The five promoted files exactly match the reviewed bytes; all sixteen prior
custody/mapping pins remain unchanged. [Promotion verification](mpea-row-metadata-promotion-v1.json)
also confirms all 214 pre-existing runtime, test, script, example and formal files
match `b899fc6995f6dab9bfbb5eade958371e1033ee11`.

## Executed challenges and limits

The production tests include 90 author and 270 independent substitutions across
all eighteen withheld columns. Invalid UTF-8, NUL, empty/marker cells, apparent
numbers, quotes and embedded newlines leave permitted metadata unchanged when
framing and caps remain valid. Malformed target bytes may block the whole source;
the noninterference claim explicitly excludes invalid framing or exceeded caps.

Independent tests exercise exact field/record/row caps and late failures; clean,
dirty, missing, symlinked and historically substituted files in a temporary Git
repository; single bounded reads and non-regular files; replacement after buffer
capture; alias mutation; resealed claim promotion; and atomic output failures.
These finite tests are not a formal parser refinement or an adversarial OS sandbox.

The prior 18+14 prototype checks are historical scratch evidence, preserved in
the [prototype receipt](mpea-row-metadata-prototype-engineering-v1.json). They are
not added to the current 37-test count. Earlier development corrected exponent
acceptance, a trailing-comma record-cap boundary, and returned-container aliasing;
the promoted tests retain these regressions. The scientific-contract review
binds the same wrapper and the earlier scratch-status opening; the independent
production run binds the final amendment's durable pre-execution opening.

Actual commands from `discovery/`:

```sh
python -m unittest discover -s tests -p 'test_mpea_row_metadata*.py' -v
python -m unittest discover -s tests -v
```

The prior [all-four-job CI run](https://github.com/alexwelcing/lupine/actions/runs/38077825298)
at `b899fc6` includes the unchanged 46-check browser, 28-case/six-schema installed
wheel and 125-statement proof package. No new local execution of those checks is
claimed for this metadata-only increment. The next commit's CI remains a separate
required checkpoint before production.

## Scientific implication and next action

Exact token equality is neither chemical equivalence nor independent-study or
specimen identity. Metadata completeness is not target completeness or physical
compatibility. This checkpoint adds no split, feature, fit, paired measurement,
scientific evaluation or superiority claim. All prior negative findings stand.

Publish, verify the remote commit and all four CI jobs, then invoke the frozen
reader twice in fresh processes and preserve both results. Inspect only the
permitted metadata to determine the next explicitly frozen scientific protocol.
