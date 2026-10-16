# Reviewed pinned-notebook metadata candidate

**Synthetic review complete; actual notebook remains unacquired and unparsed.**
No tracked files or Git state were changed. The candidate provides fixed opaque
notebook custody and a closed static JSON/AST inventory. It never executes
notebook code. Public output contains known syntactic names and reviewed argument
presence/expression kinds, with no literal values, arbitrary names, code, arrays,
figures or notebook outputs. Whole-container machine read/JSON parse and code
constant exposure are explicit. Original custody sources and outcomes stay frozen.

## Exact four promotion files

Copy only these files from `promotion/` to the same paths under `discovery/`:

| Path | SHA-256 |
|---|---|
| `scripts/li_v3_notebook_methods.py` | `2423ee14f16b6b7ec46ef896f25cb5962b1c28dbea79fcb365e14b0919752049` |
| `tests/test_li_v3_notebook_methods.py` | `7a93116314786ea8a5b49562473c891bde225f6abf638c9427a361fa38b9d809` |
| `tests/test_li_v3_notebook_methods_review.py` | `81e36eba1e7fd7c75b63ac04cc19ec00893520e37e71f944525eafaf7492dfc1` |
| `docs/li-v3-notebook-methods-plan.md` | `c19cd936e9c812e46a178d3dbff5d4bf2736505de6445858b6b5214e2066f5f5` |

Generated `__pycache__` files are excluded. The five prior source-helper pins are
unchanged and verified against public worktree/HEAD sources by both suites. Root
owns integration, publication, remote verification, exact-source CI/package checks
and actual operations. Existing user authorization covers this work.

## Executed checks and retained findings

Final source passed 20 author methods, 30 independent methods and the combined
50-method invocation (0.768s unittest, exit 0), with all four promotion hashes
unchanged. Actual commands/times/stdout/stderr are retained; `combined.json` is
the integration receipt. Independent source/test review is
`../phase2-li-notebook-methods-review-v1/review.json`, SHA
`cb5b2be652984a1c4b9386b691a57e7dd2f36ff0072b85ae43ed9c185b4484af`.
The separate math source review also approved the final warning delta at 2423;
`../phase2-li-notebook-methods-math-review-v1/final-warning-addendum.json` has SHA
`663f1fd9b0f29f94ac4241c8cfce60032b3f15e70743199eb4347b8b419bac6b`.
It verifies the exact AST delta and rebinds final author/independent receipts;
its preceding 502 review remains a historical snapshot.

Real source-review findings were fixed: Python float/int equivalence in capture
byte counts; input bounds before hashing; truthful hash/empty-code exposure; and
AST invalid-escape warnings that could leak literal text to stderr. The final
regressions exercise each. Earlier passing tests did not catch every finding:

- `before-review-fixes/` preserves original source and its 16-test invocation.
- `before-empty-code-exposure-fix/` preserves the intermediate 18-test invocation.
- `before-parser-warning-fix/` preserves the 19-test source and logs.
- `parser-warning-finding.json` preserves the separate synthetic warning evidence.
- The independent review's `first-invocation/` preserves its 28-method run with one
  reviewer fixture failure: valid deep JSON was rejected at the notebook-profile
  stage rather than the fixture's assumed parser stage. Its corrected test accepts
  only the two closed rejection routes and checks the corresponding exposure.

No historical pass is relabeled as final-source validation. The first author
receipt's post-run timestamp-label clarification is retained with original bytes.

## Test and operation recipe

From `discovery/`, the exact combined candidate recipe used was:

```sh
PYTHONDONTWRITEBYTECODE=1 LUPINE_NOTEBOOK_METHODS_CANDIDATE="$PWD/.cache/phase2-li-notebook-methods-candidate-v1/promotion/scripts/li_v3_notebook_methods.py" python -m unittest discover -s .cache/phase2-li-notebook-methods-candidate-v1/promotion/tests -p 'test_li_v3_notebook_methods*.py' -v
```

After promotion, use the default promoted module:

```sh
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_li_v3_notebook_methods*.py' -v
```

Only after reviewed publication and root's verified CI/package gates:

```sh
python scripts/li_v3_notebook_methods.py capture
python scripts/li_v3_notebook_methods.py inspect 1
python scripts/li_v3_notebook_methods.py inspect 2
```

Capture requests only the pinned Git notebook and stores its output-bearing raw
container privately. Two fixed cache-only inspections revalidate exact identity
and source-bound receipt before static parsing. These commands have **not** run
against actual source here. Unknown layout/syntax stays a recorded block; no
stripping or permissive parser fallback is authorized by a failure.

The preceding README/license/tree audit remains unchanged in
`../phase2-li-author-methods-v1/`. The notebook's relationship to the differently
sized archive workbook is unresolved. Static syntax cannot establish executed
curation, actual reference joins, row pairing, scientific independence or physical
truth. No study criteria, model, allocation, threshold, scientific claim or prior
negative result changed.
