# MPEA v9: reproduced target-opaque observation metadata

The frozen producer retained **all 1,545 observation records**, and two fresh
processes produced identical 603,510-byte metadata receipts. The result is
`METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED`; both commands returned the expected
exit 2. This is metadata availability evidence, not a scientific benchmark.

The source freeze is `ec32247f404d7d2b0a916ff7012bded2accb48c8`.
[All four CI jobs passed](https://github.com/alexwelcing/lupine/actions/runs/38079064532)
before either invocation, and the remote branch SHA was checked. The current
implementation passes 601 Python tests; that CI also exercises the unchanged
46-check browser, 28-case/six-schema wheel and 125-statement formal package.

Evidence:

- [Exact metadata receipt](mpea-row-metadata-v1.json), SHA-256
  `36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55`.
- [Two-process reproduction record](mpea-row-metadata-reproduction-v1.json), with
  the actual commands, exit codes, timestamps, CI results and all 21 frozen files.
- [Reviewed amendment](../docs/mpea-row-metadata-amendment-v1.md) and
  [engineering verification](mpea-row-metadata-engineering-v1.md).

## What was read and preserved

Each invocation verified committed source, mapping, scanner and captured artifact
identity before framing the immutable bytes. It processed only five metadata
cells per record. The source remains Figshare article 12642953, version 9, file
25797305, DOI [10.6084/m9.figshare.12642953.v9](https://doi.org/10.6084/m9.figshare.12642953.v9),
CC BY 4.0, described by Borg and colleagues in
[Scientific Data 7, 430 (2020)](https://doi.org/10.1038/s41597-020-00768-9).
Source and attribution details remain in the [inventory](mpea-source-inventory.json)
and [cited mapping](../docs/mpea-column-mapping-v1.md).

All performance cells, calculated ROM properties and other fields remained
opaque. No target text, target numeric validity, target presence or missingness
was interpreted. No features, split, fit or scientific eligibility decision ran.
The prior first-record-only receipts and their BLOCKED_SCHEMA states are unchanged.

## Permitted metadata findings

The following counts derive solely from the validated public metadata receipt.
The [reproducible summary](mpea-metadata-summary-v1.json) was generated from the
promoted [summary tool](../scripts/mpea_metadata_summary.py), matches its prior
fresh-process output byte-for-byte, and passes 18 focused synthetic checks.
Every denominator is the full 1,545 records; unresolved states are preserved.
`UNRESOLVED` describes the frozen recognizer's outcome, not an assertion that
the original field is physically absent or semantically missing.

| Metadata role | Recognized rows | Unresolved rows | Interpretation |
| --- | ---: | ---: | --- |
| Formula | 0 | 1,545 | No token passed the frozen concatenated-symbol grammar |
| Declared source DOI | 1,544 | 1 | 264 exact-token groups; not 264 proven independent studies |
| Processing | 1,426 | 119 | Only exact closed category tokens are recognized |
| Test mode | 1,150 | 395 | 358 tensile and 792 compression records |
| Test temperature | 1,364 | 181 | Exact declared decimals in degrees Celsius |

Recognized processing counts are CAST 647, WROUGHT 300, ANNEAL 273, OTHER 111,
and POWDER 95. The 119 unresolved records remain in the archive.

Among records with declared tensile mode, 314 report exactly 25 degrees Celsius,
across 75 recognized source-token groups. This is a metadata count, not the size
of a complete paired-target population, an eligibility choice or an independent
sample count. The archive also includes other temperatures and compression
records; no task-specific subset has been selected.

## Formula recognition is a preserved readiness failure

The frozen grammar recognized zero formulas. Do not convert that result into
empty compositions, zero-valued features, an assertion of no compositions, or
permission to silently relax the original reader.

Separate [source-code research](../docs/mpea-formula-format-evidence.md),
[independently refetched and checked](mpea-formula-format-independent-review-v1.json),
documents a plausible formatting mismatch:
the pinned Citrine helper returns Pymatgen's alphabetized formula, whose pinned
implementation separates element/count terms with ASCII spaces. G15B does not
accept spaces. The helper also normalizes ratios to the largest atomic fraction
and rounds them; coefficient text must not automatically be treated as percentages
summing to 100. That code lineage has not been established for every Figshare v9
record, and no actual formula cell was exposed by this metadata receipt.

The next amendment must state and test any additional grammar explicitly, retain
exact-token identity separately from chemical equivalence, preserve this original
zero-recognition result, and freeze before its first execution. Performance targets
remain outside that metadata-only amendment.

## Scientific decision and next action

The receipt establishes successful bounded framing and permitted metadata
extraction. It does not establish target completeness, specimen pairing,
composition equivalence, independent studies, exchangeability, physically matched
conditions or useful recommendations. Neither byte identity nor the compiled
mathematics resolves those premises. Previous scientific NO-GO results stand.

Resolve the documented formula-format contract under a separate reviewed
amendment, then freeze the scoped archival-recovery protocol before opening
performance targets. Any complete-record secondary population must be declared
prospectively; already declared incomplete calibration panels must still abstain.
Pool reduction/recall and stopping cost remain distinct from improving the
underlying ranking at equal measurement budgets.
