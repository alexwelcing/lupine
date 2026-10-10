# G16 independent decision-pool wire review

This engineering review used constructed finite panels only. It did not read
scientific target data, fit a model, establish exchangeability, or prove Python
refinement of the mathematical results. The reviewer authored the independent
test file, not the G16 wire adapter, CLI dispatch, or worker transport changes.

## Source-bound tests

Executed from `discovery`:

```sh
PYTHONPATH=src python -m unittest discover -s tests -p 'test_decision_pool_wire_review.py' -v
```

Result: **20 tests passed**. The final focused execution reported 0.432 seconds.
The reviewed source identities were rechecked after that execution:

| File | SHA-256 |
| --- | --- |
| `tests/test_decision_pool_wire_review.py` | `39937fd734019cd7c20116ecc537533ab04a9db95ad16a9a35d44426ea200aa4` |
| `src/lupine_discovery/decision_pool_io.py` | `7dbc5d6c53b299fe69df9a79decd318972d3c11886b46e8556b5dbfe3973eac5` |
| `src/lupine_discovery/decision_pool.py` | `76e96165102ebe8c3785f510d169b5d393838fb144f9c4275ffdb0aa6c21f1f9` |
| `src/lupine_discovery/cli.py` | `efd9176dcc17cc96f42c4fd90492d0643a370aca163c46b1db0fac9e92ad0057` |

The tests challenge exact numeric and JSON parsing; aggregate candidate and
numeric-token limits before conversion; repeated draw and inconsistent universe
identities; missing calibration preservation without filtering `n`; complete
receipt sealing before deferred future labels; caller mutation during reveal;
original source, spelling, ordering, and metadata binding; and exact large-number
and Unicode round trips. Full verification rejects altered original records,
assessments, claims, and Boolean-for-count substitutions, including an outer
receipt whose hash has been recomputed.

Negative controls remain visible: a selected prefix loses a second tied minimum;
a finite zero threshold produces an empty pool despite feasible future candidates;
incomplete future truth leaves global retention unknown; empty-minimizer retention
is labeled vacuous; and successful replay cannot upgrade an unsupported premise.
The exact weak threshold boundary retains the candidate at equality.

## Exploratory live worker checks

An additional inline Python probe imported the independent test's `fixture` and
`outcomes` helpers, then called `run_coupled` for select, verify, and replay on four
constructed variants. All **12 real guarded operations passed**. Each selected
receipt equaled direct runtime recomputation, and every replay preserved that
original receipt.

| Variant | Calibration status | Actual retained IDs | Replay result |
| --- | --- | --- | --- |
| Finite, with a 300-bit rational and Unicode text | `finite_conditional` | `a,b,c` | `feasible_failure` |
| Missing calibration score | `incomplete_calibration` | `a,b,c,d` | `feasible_success` |
| Unsupported population premise | `unsupported_premise` | `a,b,c,d` | `feasible_success` |
| All calibration panels infeasible, threshold zero | `finite_conditional` | empty | `feasible_failure` |

The worker and transport were still being finalized, and their exact source
hashes were not captured at probe start. These are exploratory checks, not a
final source-bound worker validation. The release's final suite and source
receipt must bind the completed worker implementation.

## Findings and boundaries

Source review found that the initial parent transport accepted unconstrained
guarantee text and out-of-range normalized scores when consistently resealed.
The worker owner added known guarantee/status checks, bounded scores and
thresholds, and replay claim consistency checks. The owner supplies the focused
transport regressions and final source binding. A contract table also needed to
state that the 4,096-slot cap includes the future panel; this was reported to its
owner.

No remaining wire-adapter mathematical or claim-scope blocker was found within
this review. Parent transport checks establish shape and identity consistency;
the guarded verification operation performs exact recomputation. Neither hashes,
replay success, nor these tests verify the supplied ranking's chronology, source
truth, physical relevance, or statistical premises. Browser behavior and final
worker release validation are separate reviews.
