# G15C independent engineering review

Result: **19 independent synthetic tests passed**. No implementation blocker was
found in this bounded review. The producer, author tests and amendment bytes
remained unchanged. This review does not authorize production cache access or
establish formula recognition rates, physical composition, source lineage,
independence, scientific eligibility or predictive performance.

Reviewed identities:

| Artifact | SHA256 |
| --- | --- |
| `scripts/mpea_formula_tokens.py` | `8f2bbaa34dccc9c50341f86863526cd3ad6380e97ff3d0e2ca07c0fbbe4c3139` |
| `tests/test_mpea_formula_tokens.py` | `4b3c1862d2c10b9bb5eb5ce35ebfb8b6e390292f651572aa0336b7d27e77d8e4` |
| `docs/mpea-formula-amendment-v1.md` | `751fe402dfc331c7b5498bc5503e4739ae4f127ddc7e291d0c7aea27efa09f1f` |
| `review/test_mpea_formula_tokens_review.py` | `fd1509cb343ff067445bc316d1c3c960f38ad290f7bbb65f449401d11b421059` |
| `review/independent-review.json` | `e7fcbabd680cce5860d5580eea921f20652d50a219f3138265923da2618fa9a5` |
| `review/attempt-2-tests.txt` | `ad26be3f7ca628edfb34522197fd4ed4628741f76d7985d943daeac8efaeaa1c` |

The final JSON receipt binds 29 source/reference/test files before and after
execution, with identical hashes. From `discovery/`, the executed command was:

```sh
python -m unittest discover \
  -s .cache/mpea-formula-amendment/review \
  -p test_mpea_formula_tokens_review.py -v
```

The final run passed 19 tests in 10.517 seconds. The earlier 18-test run also
passed and remains in `attempt-1.json` and `attempt-1-tests.txt`. One additional
test was then added for the exact production row-count guard, and the committed
reference-repin probe was strengthened. No executed test failures occurred.

## Executed boundaries

- All 22 nonformula positions were tested with 15 opaque substitutions each
  (330 transformations), including empty bytes, numeric-looking values, invalid
  UTF-8, NUL, commas, escaped quotes and quoted newlines. After removing only
  whole-artifact custody identities, formula reports were unchanged. A wrapped
  live scanner asserted its sole selected column was position 1 and all other
  returned observation cells were `None`.
- A manual count-token oracle checked 960 symbol/count/separator cases without
  using the producer's regular expression. Markers, non-ASCII values, invalid
  types, repeated symbols, reordered terms, leading zeroes, exact token groups,
  CSV unescaping and original ordinal linkage were challenged. A 16,384-byte
  accepted formula with a very long count confirms no integer conversion is
  required. Raw formula/target tokens and their individual hashes do not appear
  in the report.
- Exact field, logical-record and row caps were tested at and above their limits,
  including doubled quotes and trailing delimiters. Late width/framing failures
  produced no prefix or denominator. Empty successful fixtures remained distinct
  from blocked fixtures. A constructed source identity tested production-mode
  row counts 1,544, 1,545 and 1,546: only 1,545 could succeed.
- Closed validation was challenged with resealed raw channels, booleans in integer
  positions, skipped first-seen groups, duplicate/wrong-source row IDs, extra
  metadata, altered profiles/references, target-presence and numeric-conversion
  claims, and inconsistent blocked reports. Returned profile/reference structures
  did not alias global policy or caller-owned expected identity.
- Known-real-artifact fixture guards were tested for both supplied and observed
  SHA256 before helper loading. Source mismatches were rejected before framing.
  Every fixed helper/reference pin was independently perturbed. The cache reader
  made exactly one request for 332,127 bytes and rejected oversized, symlink,
  directory and FIFO inputs. A synthetic cache replacement demonstrated that the
  captured immutable buffer, rather than a second read, reached inspection.
- Real temporary Git repositories exercised a positive committed-source gate and
  dirty, missing and symlinked new paths. Historical-source and reference changes
  committed into a later tree, as well as absent baseline ancestry, were rejected.
  These temporary repositories use copied public source/reference bytes and
  injected synthetic commit identities; they do not claim to test remote CI or
  execute the real production gate against the experimental cache.
- Output tests covered exact idempotence, conflicting existing files, symlinks,
  malformed reports, fsync/link failures and an ancestor replacement during
  publication. No partial destination receipt was published; descriptor-relative
  cleanup preserved an unrelated file placed outside the captured directory.
  CLI source overrides and exception messages were rejected/sanitized.

All observation bytes were constructed in the tests. Previously public G15B
metadata/mapping/header and format evidence were read only as literal-hash-bound
references. No experimental cache or original formula/target cells were read;
no network request, fit, scientific split, main-tree edit or production extraction
was performed. A separate source/doc-only peer review found no actionable
contract mismatch. These checks are empirical software evidence, not a proof of
all executions, a hostile-code sandbox or a scientific-validation result.
