# Independent review of the public G15C result

**Public metadata audit passed.** Both original G15B and supplemental G15C
receipts passed their pinned closed validators. All 1,545 rows have the same
original order, ordinal and whole-source-bound record ID. G15B's zero recognized
formulas remains unchanged. G15C recognizes every row under its separate
supplemental lexical grammar, producing 630 exact token groups.

| Declared public population | Rows | Formula-token groups | Recognized source-token groups | Formula groups spanning at least two recognized source groups | Rows in those formula groups |
| --- | ---: | ---: | ---: | ---: | ---: |
| Whole archive | 1,545 | 630 | 264 | 74 | 687 |
| Declared tensile | 358 | 107 | 80 | 14 | 161 |
| Declared tensile at exact rational 25°C | 314 | 106 | 75 | 12 | 131 |

The whole archive has 1,544 source-assigned rows and one unresolved-source row.
That unresolved-source row belongs to a formula group which already spans
multiple **recognized** source groups: 686 of the 687 overlap rows have known
source groups, and one does not. Unknown sources were never collapsed into a
shared source identity. The exact25°C/T cohort has no unresolved source rows;
its overlapping formula groups involve 40 recognized source groups. Overlap is
computed separately within each displayed population. The JSON preserves full
group-size and known-source-count histograms and distinguishes unique source
pairs from repeated formula-group/source-pair incidences.

The reproduction record agrees with the public receipt's byte hash, length,
implementation map, scope and independently counted aggregates. All 29 listed
source/reference files match their current public bytes. Its four recorded CI
job completions precede both recorded producer commands, each of which records
the expected unresolved-status exit code 2 and the public receipt hash.
These are checks of the **published record's internal consistency**. This audit
did not query GitHub CI, rerun production extraction, or access either original
cache output to independently establish the asserted two-process byte equality.

The result permits describing lexical recognition and preserved public row
linkage. It does not provide reconstructible formula coefficients, normalized
composition vectors, verified chemistry, source-study independence, physical
specimen pairing, target completeness, eligibility or scientific readiness.
The exact25°C/T subset is a declared metadata cohort; its 314 rows are not
claimed to be complete paired measurements or independent experiments. Cross-
source lexical overlap should remain disclosed in any future source-holdout
design. It cannot be repaired by relabeling lexical groups as chemical entities.

## Reproducible evidence

All files are confined to ignored `.cache/mpea-formula-result-audit/`:

| Artifact | SHA256 |
| --- | --- |
| `check_public_formula.py` | `f19eecb9f1b4c1ead4fce721a66c0dc21753a60d7d6a7234cbdb8a853919f77e` |
| `test_public_formula_audit.py` | `88e0d10ecc5257dcb5f79b5cd120d627f639199c847bf6ee427dc80149ca0ddd` |
| `public-audit-v1.json` | `fb5d90e07be470119692b1743988f9c84f671af7732c3ff82de31a8e4c1477ba` |
| `engineering-v1.json` | `ec46d5c0ada72a68d9a9a82570b644ac515c44147adc24f4d41a15ecc86d6b5c` |

The audit JSON content seal is
`e0ed477c363e2d64bd23e6373b23d67cbc011655bd0f63bb2f662efa12b0f066`.
The engineering receipt binds 33 files before and after testing/audit, with
unchanged hashes, and preserves both commands and log hashes. Five synthetic
tests passed: hand-counted overlap and unknown-source cases, strict original-ID
joins, exact temperature filtering, empty populations, and malformed JSON.
No observed metadata values were used to construct those expected test answers.

Executed from `discovery/`:

```sh
python -m unittest discover -s .cache/mpea-formula-result-audit \
  -p test_public_formula_audit.py -v
python .cache/mpea-formula-result-audit/check_public_formula.py
```

The checker writes its fixed scratch output exclusively, so rerunning it into
the existing output fails rather than overwriting this evidence. The immutable
inputs are:

- `reports/mpea-formula-tokens-v1.json`, SHA256
  `ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7`.
- `reports/mpea-row-metadata-v1.json`, SHA256
  `36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55`.
- `reports/mpea-formula-reproduction-v1.json`, SHA256
  `3453b69b906230a627b128e8af8c7ff2722740295981950f972ec581096017ec`.

No raw CSV/cache, formula strings, coefficient vectors, target values or target-
presence information was read. No split, allocation, feature construction, fit,
network request or main-tree edit occurred. All findings are public-metadata
and executed-software evidence; hashes attest identity rather than physical
truth or honest prior execution.
