# Isolate the remaining temporary Git fixtures

Twelve other test files contained thirteen real Git write call sites with the
same detached-housekeeping risk found in the [original repair](../phase2-fixture-housekeeping-repair-v1/README.md).
Each now supplies command-scoped `maintenance.auto=false` and `gc.auto=0`,
including the direct registration empty-commit call. Production Git queries,
selectors, scientific readers, frozen benchmark rules and cleanup are unchanged.
Independent source review checked the exact argv-only changes; mocked command
expectations and existing assertions were preserved.

The first actual affected-module run completed **326 tests with one error**:
a formula-custody fixture copied changed live test files into a historical Git
baseline, which the unchanged production pins correctly rejected. No automatic
housekeeping launch was observed. That failure and its original 351-file source
binding remain recorded. It was not a scientific experiment or a CI result.

The correction stores the exact original bytes of three historical test sources
in `tests/fixtures/mpea_formula_historical_sources.json`. They match original
Git commit `ec32247f404d7d2b0a916ff7012bded2accb48c8` and unchanged production
hashes. The generated baseline checks schema, the three allowed paths, source
commit and each digest before writing them; the stored Python text is not
executed. Other fixture paths still use their original source. Positive and
committed-historical-repin negative assertions remain unchanged, and shallow
CI checkouts do not need old Git objects at runtime. Independent review checked
the fixture bytes and retained gates; root separately checked original Git blobs.

The repaired actual run passes **326 methods on Python 3.11.16 in 87.765 seconds**,
with all **352 runtime files held** and no automatic housekeeping child launch
observed. These are fifteen affected/consumer modules, not the complete suite.
The new manifest changes twelve existing files from e668, adds one JSON fixture,
and keeps 339 prior runtime files. Formal source and installed package payload
source stay unchanged. The original bd7 cleanup writer remains unidentified;
this repair removes the observed automatic-launch mechanism without suppressing
cleanup errors, changing scientific bounds, repinning historical evidence or
retrying failed CI.

The preceding exact e668 source separately passes clean 28-demonstration,
six-schema/18-check packaging and strict artifact verification. Its
[independent 57-check artifact review](../phase2-fixture-repair-artifact-review-v1/README.md)
checks all 6,981 source files, the one declared test change, 350 unchanged runtime
files and 113 unchanged package payloads. The initial CONNECT502 preflight stop
and recovered actual execution remain separate records. That audit belongs to
e668, not this successor. Its dated CI observation is included; new-head CI,
clean packaging and independent delta verification are pending publication.

The accompanying [primary tmQM definitions](../phase2-tmqm-definitions-v1/README.md)
identify original-2020 CSD lookup, natural-population metal charge and gas-phase
closed-shell calculations with separate xTB polarizability. Current-2024 units,
key/version mapping and data/upstream rights remain unresolved.
[Independent review](../phase2-tmqm-definitions-review-v1/README.md) adds an
exposure qualification: results/benchmark/conclusion headings, IDs and paragraph
counts were visible; their prose and numeric contents were withheld. Full-article
machine exposure and an initial qualitative abundance passage are preserved.
No untouched-data claim, new numerical frame, allocation or scientific admission.

Owner: root. Publish, verify exact remote/original CI and clean package, then
complete the bounded artifact delta review. The observed final commit/run and
release decision will be recorded in [draft PR263](https://github.com/alexwelcing/lupine/pull/263).
G20 remains unresolved/G21 blocked; all scientific negatives and physical/general
superiority NO-GO remain. The expired automation stays disabled.

The proposed argv diff is retained losslessly as `changes.patch.json`; decode its
`text` field for the exact original patch and verify `original_sha256`. This avoids
trailing-space-only unified-diff context lines without altering the proposal.
