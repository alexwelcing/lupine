# Public-metadata preallocation failure

The registered `9704ef46c1d0ab098dabb083199403a6296f7cf6` consumer rejects the first upstream header receipt because its content-seal preimage omits a trailing line feed. The upstream header, row-metadata and formula-token producers all include exactly one line feed in `canonical_bytes()`. Their four pinned whole-file identities (including the column mapping) match, and all three upstream content seals match their own producer convention. All three fail the unchanged registration `verify_seal()` convention. The subsequent metadata-only shape/linkage checks pass: 1,545 rows, 23 columns, and the previously published 314-row/75-source-group condition cohort.

The first failing call is `load_public_metadata -> verify_seal(header_document)`. The worker invokes it after registration verification and before constructing the production store, allocation or the target-phase marker. This source path is consistent with the operational symptoms reported by the parent. This independent audit did not inspect the failed private attempt, its directory or the allocation registry; the parent's separate check establishes their actual state.

## Exact public diagnostic

Run from the discovery checkout:

```sh
PYTHONDONTWRITEBYTECODE=1 python -X pycache_prefix=.cache/mpea-preallocation-diagnosis/unused-pycache .cache/mpea-preallocation-diagnosis/diagnose.py
```

`diagnosis-v1.json` records the exact public/source hashes, computed seal alternatives, aggregate-only shape result, unchanged before/after identities and allowed repository opens. The read guard excludes other repository inputs and external actions. The initial diagnostic invocation without the separate pycache prefix stopped at the read guard when Python attempted to inspect an existing source bytecode cache; no metadata validation, allocation or target access occurred in that initial attempt. The recorded command isolates bytecode lookup and completed successfully.

## Narrow candidate

`candidate/scripts/mpea_registration_allocation.py` leaves `canonical`, `digest`, `sealed` and the internal `verify_seal` unchanged. A distinct `verify_upstream_metadata_seal` uses the upstream one-LF preimage. The existing public-only read/validation body is factored into `_read_public_metadata`; `load_public_metadata` preserves its authority gate before calling it. The returned metadata context supplies no registration authority, and the allocation authority checks are unchanged. No scientific parser, predictor, grouping, allocation, target-access rule or decision rule changes.

`candidate/tests/test_mpea_registration_public_metadata.py` supplies seven focused tests. They check all four actual public pins, the three producer primitives, the entire public metadata-only path, separate internal/upstream seal conventions, alternate line-ending/spacing and payload tampering, whole-file rejection of corrupted and validly resealed inputs, and refusal of unissued registration identities before reads. Scientific operations are forbidden in the test harness. `author-regression-v1.json` records the exact direct test command, seven passing tests and 14 unchanged source/public/test bindings; its log reports 0.366 seconds.

`promotion-manifest-v1.json` identifies the two exact candidate copies. An AST comparison finds all 45 other existing top-level functions/classes unchanged; only the existing `load_public_metadata` body is factored, and the two named helpers are added. No main-tree source or tests were changed by this work. The candidate requires independent review and the parent's normal integration/publication gates; it does not authorize retrying the original attempt.

No archive bytes, private feature table, performance targets, target parser, actual group allocation, entropy source, fit, registration factory or production launch was used. No cohort rows or source-group assignments were emitted.
