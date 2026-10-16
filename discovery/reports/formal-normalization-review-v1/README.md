# Normalization proof review and integration provenance

The five-statement scratch source was strictly compiled with one Lean worker,
then independently reviewed read only before unchanged main-package integration.
`LupineNormalization.lean`, `strict-compile.log`, `audit-receipt.json`, and
`historical-scratch-audit.py` preserve those exact historical artifacts. The
script is preserved as evidence, not a runnable command from this relocated
folder: its original execution location was `.cache/normalization-formal/`.
Receipt absolute paths and pre-integration hashes describe that historical
workspace state, not the current ten-module package. Compiled objects are
hash-bound in the receipt but not included in this report.

`review/peer-review-v1.json` records the independent successful review. The
reviewer checked all five premises/proofs, source, log, object, direct imported
source/object hashes, and published formal-file hashes without claiming an
independent compile. `review/peer-review-first-command-error-v1.json` preserves
a first reviewer-check failure caused by a regex that did not match the digit
in `l1` theorem names; the corrected checker is preserved separately. No proof
source changed in response to that tooling error.

`previous-source-hashes.json` binds the nine pre-existing Lean sources.
`full-build.log`, `parser-tests.log`, `fresh-audit.log`, and
`integration-receipt.json` record the actual integrated-package verification.
The published `formal/theorem-inventory.json` and `formal/AXIOMS.txt` are the
current source-bound receipt. The preceding 125-statement receipt is preserved
under `formal/history/pre-normalization-*`.

These results are conditional finite-real algebra. They do not certify physical
composition, chemical distance, scientific data, or Python implementation
refinement. Hashes identify evidence bytes; they do not establish physical truth.
