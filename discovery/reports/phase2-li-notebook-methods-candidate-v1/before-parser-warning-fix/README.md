# Prospective pinned-notebook metadata candidate

Held for independent review; **notebook unacquired and unparsed**. This candidate
adds fixed opaque notebook custody and a closed static JSON/AST API projection.
It never executes notebook code. Arbitrary names, literals, outputs, figures,
arrays and source text do not enter its public inventory. Whole-container machine
read/JSON parse and code-constant AST exposure remain explicit.

The three current promotion files are inventoried in `candidate-receipt.json`;
generated `__pycache__` files are not promotion inputs. The fourth, independent
review test is pending. Do not promote or execute production until independent
review, publication, exact-source CI and package gates are complete. Original
custody source and all historical outcomes remain unchanged. Existing user
authorization covers this work; no new permission is requested.

Final held source SHA is
`5021605ea4092c5d7f4f7bc0fde6be1996b55c5db9b32128a776d28b674f4514`.
The final author invocation passed 19 tests (0.653s unittest), recorded in
`author-final.json` and its actual stdout/stderr. Earlier source-review findings
were real: float/int receipt-size equivalence, pre-hash size checking and AST
exposure for a notebook with no code. Repaired-source regression coverage is
included. Original 16-pass source/logs and intermediate 18-pass source/logs are
preserved under `before-review-fixes/` and `before-empty-code-exposure-fix/`.
Those earlier passes are not final-source validation. The first receipt timestamp
field clarification is retained alongside its original bytes.

These are synthetic/code-identity tests, not dataset admission or science results.
The earlier README/license/tree audit under `../phase2-li-author-methods-v1/`
remains held unchanged; its notebook metadata supplied fixed source identity,
not notebook implementation content. A notebook-static pass cannot establish
archive lineage, joint row unit, eligibility, IID/exchangeability, superiority,
or physical truth.
