# Independent finite counting check of the risk-inversion design

2026-10-16. **PASS — finite synthetic arithmetic validation only.** No product/runtime files were edited or imported, no network request was made, and no empirical source or outcome was opened. The working tree was clean at commit `a6e87c198d8116d26c523e0e1b2eedce4aeb225b` both before and after execution.

## Written argument reviewed

The reviewed design is `../phase2-finite-risk-inversion-design-v1/README.md`, SHA-256 `142fc8fed2bc05fc784aa1cf0b2c696b818b0d2f2766087f8685b88198023e94`; its bytes held through the execution. The strict acceptance rule `F_K(k) > eta`, initial-segment argument, discrete lower-tail validity, and resulting one-sided finite-frame coverage are consistent. The coupling compares hypothetical count distributions without requiring actual scientific worlds to have nested labels. The support bounds, census/no-sample cases, integer-grid ceiling distinction, and optional-stopping caveat are correct. The design correctly limits inference to a fixed labeled frame and one uniform fixed-size sample, and does not claim a posterior, future-risk guarantee, power, or physical truth.

No blocker was found in that written argument. This is a human/agent source review, not a mechanically verified general theorem. The executable audit below supports bounded finite cases only. The recommendation to defer a product feature until G21 adopts an appropriate inference contract remains reasonable: none of this resolves source admission, scientific units, missingness, or overlap.

## Independent counting method

`audit.py` enumerates all binary label vectors on each frame size `M=1,...,8` and all size-`e` subsets for every `e=0,...,M`. Subset intersections produce an oracle histogram. Every labeled world with the same `K` is compared, checking permutation invariance. Separately, a binomial-coefficient formula computes each CDF and inversion endpoint. No product implementation is called.

For each `M`, significance values include `1/2`, `1/3`, `1/6`, and `1/20`, every attainable CDF atom strictly between zero and one, and the exact midpoint of every adjacent pair of CDF atoms, including intervals next to zero and one. Thus equality and both neighboring sides of every nontrivial boundary are exercised. These are 173 `(M, eta)` pairs, including 74 nontrivial `(M, CDF-atom)` pairs. Counts aggregate by frame size; they are not claims that all those rational values are globally distinct.

The audit checks strict inversion against the subset oracle, support, monotonicity in observations and significance, initial-segment acceptance, pointwise rejection equivalence, and actual coverage by recounting subset allocations. It also checks every count-world CDF against the independent combination formula, no-sample/census/all-failure boundaries, separate significance endpoint observations at zero and one, and zero-failure planner equivalence over an exact rho grid covering each `ceil(rho*M)` cell and its integer boundaries. All caps from zero to `M` are checked. The additional `rho=1` case is mathematical only; it does not extend the existing planner API. No existing runtime planner was imported, so these checks establish agreement with the documented semantics rather than executable runtime conformance.

## Actual result

The first and only audit invocation exited zero at `2026-10-16T08:39:53.979384+00:00`, after starting at `2026-10-16T08:39:47.103337+00:00`; elapsed monotonic time was **6.846437356 seconds**. `stderr.txt` is empty. There were no failed assertions, fixture corrections, or reruns.

- 510 complete binary label worlds.
- 4,096 labeled-world/sample-size distributions; 284 distinct `(M,e,K)` distributions.
- 87,380 world/subset allocations enumerated to establish the distributions.
- 5,544 inversion endpoints and 210 exact-equality rejection checks.
- 196,776 labeled-world/significance coverage checks, recounting 4,786,928 subset allocations.
- 17,120 planner/cap comparisons.
- **707,147 assertions** in total. This is an instrumentation count, not 707,147 independent tests or scientific experiments.

The equality example gives `U(0),U(1),U(2) = 1,3,4` at `M=4,e=2,eta=1/6`. The optional-stopping example enumerates all 24 distinct-ID permutations: 12 reject on the first draw, four additional paths reject after three draws, for `16/24 = 2/3 > 1/2`. The fixed three-draw test separately rejects on 12/24 paths. The complete permutation table is retained.

## Retained artifacts and limits

- `audit.py`: executed independent counting code, SHA-256 `4ad598ca979ae154df67ebcefecf0307261f18a430bfe25c205b7dc5d753d6f7`.
- `run_recorded.py`, `start.json`, `execution.json`: recorder, actual command/timestamps, source bindings, and before/after Git state.
- `stdout.txt`, `stderr.txt`: exact process output. Stdout SHA-256 `cf2bb3e48d5b08cd974abc1ce1a515664c25f7ed744345b5bbffd2db70723cda`; empty stderr SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- `result.json`: counts, all significance values, and per-frame accounting.
- `exact-distributions.json`: all 284 explicitly counted distributions and exact CDFs.
- `optional-stopping-paths.json`: all 24 paths and branch decisions.
- `review.json`, `inventory.json`: review scope and artifact identities.

No runtime feature, UI, scientific endpoint, model, frozen allocation, study success criterion, new DFT calculation, Lean proof, or release claim was introduced. Finite arithmetic passes do not prove the general statement, test physical premises, admit a dataset, rescue an exposed benchmark, or establish superiority. The exact written argument and a future defensible frozen study remain separate requirements.
