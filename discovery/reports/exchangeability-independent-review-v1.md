# Independent published finite-exchangeability review

Fresh strict source elaboration and all 24,336 synthetic action/event checks
passed. Independent mathematical review found no blocking issue in the eight
published exchangeability statements. This report binds the current published
source and inventory after authorized integration.

## Reproduction

From `discovery/`, with the pinned Lean toolchain installed:

```sh
(cd formal && lake --wfail build)
python3 scripts/audit_exchangeability.py
```

The checker defaults to `formal/LupineExchangeability.lean`. It does not import
Python candidate-selection or calibration implementation code and requires no
scientific data. It runs `lake env lean -DwarningAsError=true` on the published
source, without writing a compiled object. The current compiled exchangeability
and imported DecisionPool objects are separately hash-bound as existing build
artifacts. The actual compiler command, output digest, theorem axioms, source and
object hashes, current inventory identity, and unchanged before/after bindings
are recorded in the JSON receipt. The script refuses source changes from the
exact proof and imported source independently reviewed here.

## Actual evidence

- Fresh source compile exited zero and emitted all eight theorem axiom outputs.
- The shared audit parser accepted only standard logical foundations:
  `propext`, `Classical.choice`, and `Quot.sound`.
- Fresh theorem outputs match the corresponding published inventory entry.
- The current inventory records 125 statements
  in 9 modules. This run freshly compiled
  eight exchangeability statements; it does not claim a fresh audit of the other
  modules solely by reading that inventory.
- All recorded source/configuration/inventory/object bindings were unchanged
  during this execution.

The synthetic checker enumerates all vectors over {-1,0,1} for N=2,3,4, all
coordinate permutations, and every valid leave-one-out rank. Atom weights are
nonuniform, `1 + number of zero scores`, and exactly normalized with rational
arithmetic. It checks support closure, weight invariance, the inverse action,
strict-event equivariance, equality of event masses, the deterministic count
bound, and the marginal bound. The 24,336 count refers specifically to indexed
strict-event equivariance comparisons; the script also performs the listed
support, mass, bound, and inverse checks. These constructed finite examples are
executable corroboration, separate from Lean's arbitrary-real-score statements.

Exact arithmetic confirms:

| Calibration n | Alpha | N | k | Covered finite branch |
| --- | --- | --- | --- | --- |
| 19 | 1/20 | 20 | 19 | Yes; bound 1/20 |
| 18 | 1/20 | 19 | 19 | No; insufficient-rank branch remains separate |
| 19 | 1/10 | 20 | 18 | Yes; bound 1/10 |
| 3 | 1/2 | 4 | 2 | Yes; bound 1/2 |

## Mathematical review and limits

The action is score composed with a coordinate permutation, with inverse
composition by its inverse. Exact leave-one-out quantiles derive strict-event
equivariance, including ties; finite-sum reindexing and swaps derive equal
indexed masses from closure and invariant weights. The final theorems do not
assume equal event risks or the desired probability bound.

A target index excludes N=0. Normalization excludes empty support. Exact
leave-one-out order-statistic premises force 1 <= k <= N-1, so invalid rank
endpoints cannot yield nonvacuous guarantees. Strict failure matches weak pool
retention. The exact-ceiling alpha theorem covers only its finite branch.

The Lean statements quantify over arbitrary real score values for nonnegative
normalized finite-support weighted joint laws with closed support and invariant
atom weights. They establish neither arbitrary measurable/infinite-support laws
nor scientific exchangeability, fitting independence, conditional coverage,
Python refinement, physical validity, or useful pool reduction. Downstream
all-minimizer retention still requires actual panel scores, correct objective
and feasibility truth, and a nonnegative threshold.

## Historical distinction

The earlier read-only review completed before promotion was authorized. Its
compiler output and observed whole-formal equality checks are preserved in
`.cache/decision-pool-exchangeability/review/pre-integration-lean.log` and
`pre-integration-review.json`. The original orchestration was an inline tool
script; that provenance limit is explicit. The first subsequent preservation
attempt detected already-authorized Lake configuration/history metadata changes
and retained its failed assertion log. The corrected scratch receipt explicitly
listed those changes. No failure was relabeled as a proof success.

Those scratch artifacts are preserved historical evidence, not dependencies of
this clean-checkout command. This new report binds current published inputs and
does not claim old configuration or inventory hashes remained unchanged through
promotion.

## Artifact identities

- Reviewed source SHA-256: `0e326c4b51e5ca00d1deb32be61ba7b80ca0c443059d0fbf13e22f05717610ce`
- Checker SHA-256: `b03dc88edb45cbb5726f520e5aebd89dd11e0174d26bc4c61aa64a0072fc12fb`
- Current inventory SHA-256: `bd6823b9340a1d8b8f4595f95b83677df5e19eae4ac2585f6ec7f304db2424e7`
- JSON receipt SHA-256: `45d77a4a21e3449629444857c2c529c06905d5741cd694cb4ba415b778b4f4a0`

These hashes identify artifacts and add no mathematical or physical premise.
