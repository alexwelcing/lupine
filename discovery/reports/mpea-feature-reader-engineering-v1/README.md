# Source-bound feature custody: reviewed source freeze

The prospective [reader](../../scripts/mpea_feature_reader.py) preserves every
original row while constructing exact declared-coefficient features. It passes
**34 focused tests** (12 author and 22 independent) and **762 full Python tests**.
The full run took 121.477 unittest seconds with **208 unchanged source/resource
hashes**. [Full receipt](full-suite-v1.json), [actual log](full-tests-v1.txt),
[focused receipt](focused-receipt-v1.json) and [unchanged source promotion](promotion-v1.json)
bind these executions. **No actual archive feature extraction has run at this
source-freeze checkpoint.**

Independent tests exercise 88 opaque-cell substitutions, real temporary Git
history and dirty/missing/symlink failures, a single bounded source read, and
execution of the same captured helper bytes whose identities were checked.
Local-vector validation checks the closed shape, exact rational invariants and
original row links. Publication rejects extra fields, rows, vector data and
arbitrary exception text. Output tests cover ignored paths, force-tracked files,
atomic writes, parent replacement and temporary-file cleanup.

Two initial independent-test failures were reviewer fixture mistakes: an active
read guard unintentionally covered the public receipt load, and a scanner-code
read was counted as a second archive read. Their logs remain alongside the
corrected tests; the producer was unchanged. The combined reader/kernel run
passes 78 tests. The final promoted specifications received a separate
[source-bound review](specification-post-promotion-review-v1.json).

## Custody and scope

Before opening the archive cache, the reader verifies the 29 earlier formula
custody files, actual published G15C receipts and its new kernels, tests and
specifications against Git. Historical source/result ancestry is literal and
checked. Remote CI is an additional externally verified prerequisite; the
reader does not attest to GitHub job completion itself.

Only formula column 1 is accumulated from the verified source buffer; all other
22 cells remain opaque. Existing pinned metadata is joined by original ordinal.
All rows survive. Feature grammar or arithmetic limits give a null composition,
never a dropped row or a zero vector. The 118 exact coefficient coordinates and
processing indicators are saved only under ignored `.cache/mpea-features/`,
with mode 0600. Public output contains provenance, aggregate counts and the
whole private-artifact identity, without record IDs, vectors, tokens or per-cell
hashes. Both output paths must be explicit.

The hash-loaded reader is a standalone process boundary: reloaded module classes
are not interchangeable with already imported class objects in another context.
Structural artifact validation does not independently rederive vectors from
source formulas. Actual production provenance therefore requires the frozen
producer plus execution evidence, not a resealed arbitrary table. Neither
coefficient normalization nor a successful hash proves physical composition,
measurement uncertainty, specimen pairing, descriptor usefulness or prediction.

## Next execution gate

Publish this source freeze, verify the remote commit and all four Discovery
Verify jobs, then run two fresh processes to distinct ignored output directories.
The expected exit status remains 2 with scientific schema unresolved. Compare
both whole private and public outputs without disclosing the vectors; publish
only aggregate and execution receipts. Allocation, eligibility and performance
targets require the separately completed scientific protocol and staged runner.

The preceding `2e4162b` normalization checkpoint already passes all four CI jobs,
28 installed cases, five additional installed-API checks and the independent
577-source-file/110-wheel-entry audit. [Its exact evidence](../normalization-release-v1/README.md)
is preserved here. Existing interface and 130-statement proof sources are
unchanged by the feature reader. No scientific release gate advances.
