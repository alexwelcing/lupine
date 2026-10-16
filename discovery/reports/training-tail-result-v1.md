# Training-only tail comparison: complete, reproduced, no model qualifies

**Decision: `NO_GO_MODEL_IMPROVEMENT`.** Both fresh processes completed and
reproduced the same predictions, metrics, gates and decision; raw float64
artifacts also matched. None of the three predeclared ridge configurations
qualified for designing a fresh calibration/evaluation experiment under this
protocol. The original benchmark verdict remains unchanged.

The two smaller ridge penalties improved the pooled formation-energy tail, but
both increased mean absolute error and violated a fold-level tail limit. Every
ridge configuration worsened the pooled band-gap tail and mean absolute error.
The smallest penalty also produced a gap-error maximum of **25.43017185 eV**,
compared with **7.4386 eV** for 5NN. Selecting only the favorable formation result
would reverse the predeclared joint decision rule.

## Fixed task and measured results

The [protocol](../docs/training-tail-protocol-v1.md) was committed and pushed in
`188752f733e4768a995165fe9770696d5bbf09e1` before fitting. Its SHA-256 is
`56b1810a2bae15261f64eef62abb7d74886d80b3116c7233700b0c52da88c9bf`.
The experiment used only the original 4,096 oxygen-free training representatives
from the [pinned NIST JARVIS archive](../docs/constrained-source-audit.md), with
five composition-disjoint validation folds of 820/819/819/819/819 records.
Training sizes were 3,276/3,277/3,277/3,277/3,277. No new DFT was performed.

The comparator used exact atomic-fraction L1 5NN and rational target means.
Ridge used the fixed 118 element-fraction columns, exact training-fold centering,
mean squared loss, an unpenalized intercept and the three penalties below.
Only final ridge predictions were quantized to rational multiples of `1e-8`.
No negative predictions, labels or outliers were clipped or removed.

The descriptive tail statistic is rank **4,087 of 4,096**, the tenth-largest
absolute OOF residual. Fold tails are the second-largest residual in each fold.
These OOF errors are development evidence from overlapping fitted models;
they are **not exchangeable calibration data, coverage estimates, or an
independent test of a selected model**.

| Model | Property | Pooled tail | MAE, rounded | Maximum error |
| --- | --- | ---: | ---: | ---: |
| Exact 5NN | Gap, eV | 5.498 | 0.334380 | 7.4386 |
| Ridge, lambda `1e-6` | Gap, eV | 5.61120635 | 0.440601 | 25.43017185 |
| Ridge, lambda `1e-3` | Gap, eV | 5.5022266 | 0.413852 | 7.05812157 |
| Ridge, lambda `1e-1` | Gap, eV | 6.9323826 | 0.520382 | 8.28739311 |
| Exact 5NN | Formation, eV/atom | 3.17387 | 0.343432 | 5.116696 |
| Ridge, lambda `1e-6` | Formation, eV/atom | 2.64432166 | 0.406864 | 5.26237101 |
| Ridge, lambda `1e-3` | Formation, eV/atom | 2.64787894 | 0.408510 | 4.4920973 |
| Ridge, lambda `1e-1` | Formation, eV/atom | 3.37938824 | 0.533847 | 5.31595722 |

Tail and maximum values above are exact terminating decimals; MAE is displayed
to six decimal places. The [pass-one receipt](training-tail-pass-1-v1.json)
preserves every metric and margin as an exact rational value, including medians,
90th/95th/99th percentiles and all five fold results. The
[pass-two receipt](training-tail-pass-2-v1.json) reproduces them.

## Every predeclared eligibility gate

A single common lambda had to pass **both** properties. Requirements were at
least 10% pooled-tail improvement; strict tail improvement in at least four
folds; no fold tail or maximum more than 10% worse; no pooled MAE increase; and
no pooled maximum more than 10% worse. Fold numbers below are zero-based.

| Lambda | Property | Pooled tail <=90% baseline | Strictly improved folds, need >=4 | Every fold tail <=110% | Every fold max <=110% | Pooled MAE no worse | Pooled max <=110% |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `1e-6` | Gap | FAIL | 3, FAIL | PASS | FAIL: 1, 4 | FAIL | FAIL |
| `1e-6` | Formation | PASS | 4, PASS | FAIL: 1 | PASS | FAIL | PASS |
| `1e-3` | Gap | FAIL | 4, PASS | PASS | FAIL: 4 | FAIL | PASS |
| `1e-3` | Formation | PASS | 4, PASS | FAIL: 1 | PASS | FAIL | PASS |
| `1e-1` | Gap | FAIL | 0, FAIL | FAIL: 0, 2, 3, 4 | FAIL: 2, 4 | FAIL | FAIL |
| `1e-1` | Formation | FAIL | 1, FAIL | FAIL: 0, 1 | PASS | FAIL | PASS |

The exact pooled-tail caps were **4.9482 eV** for gap and
**2.856483 eV/atom** for formation. All three gap tails exceed the cap. Formation
tails for `1e-6` and `1e-3` clear it, but their fold-one tails are respectively
`4.3727138` and `4.25348047 eV/atom`, above that fold's exact permitted
`4.1439244 eV/atom`. Their MAE increases independently fail eligibility.

For completeness, every failed fold non-deterioration margin is listed below
as the exact **excess above the allowed 110% threshold**, in the property's unit:

| Lambda | Property | Fold tail excesses | Fold maximum excesses |
| --- | --- | --- | --- |
| `1e-6` | Gap | None | 1: `18.20823185`; 4: `0.20085268` |
| `1e-6` | Formation | 1: `0.2287894` | None |
| `1e-3` | Gap | None | 4: `0.41503786` |
| `1e-3` | Formation | 1: `0.10955607` | None |
| `1e-1` | Gap | 0: `0.07920235`; 2: `0.73907025`; 3: `0.67714302`; 4: `0.85571552` | 2: `0.8845826`; 4: `2.09703311` |
| `1e-1` | Formation | 0: `0.47653579`; 1: `0.97848283` | None |

Every configuration was already `INELIGIBLE` before the additional numerical
sensitivity guard. Adding the predeclared `1e-6` to each ridge metric used in
the gates left every configuration ineligible; no decision depended on a
numerically borderline pass. All 15 ridge fits per process completed with finite
outputs and accepted backward residuals; there were no solver failures. This
engineering success does not overcome the negative predictive comparison.

## Reproduction, access and cost

The [reproduction receipt](training-tail-reproduction-v1.json) records
`COMPLETE_REPRODUCED`: both processes returned zero, every scientific comparison
passed, and raw prediction/coefficient artifact hashes matched. The common
scientific-result digest is
`60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656`.
This was a fresh-process local reproduction on the same host and numerical
stack, not independent research-group replication or a new untouched evaluation.

A separately expressed standard-library [audit](training-tail-independent-audit.json)
reconstructs all 96 metric summaries and 24 target gate evaluations from the
saved predictions and original training labels. It also checks fold identities,
saved-neighbor averages, raw prediction quantization and artifact seals. It
confirms the negative result without importing runner arithmetic or refitting
models. [Audit source](../scripts/audit_training_tail.py).

| Cost | Pass 1 | Pass 2 |
| --- | ---: | ---: |
| Worker elapsed seconds | 103.535 | 54.871 |
| User CPU seconds | 88.425 | 50.242 |
| System CPU seconds | 6.566 | 4.014 |
| Peak RSS, KiB | 147,428 | 147,384 |
| Budget checks | 4,134 | 4,134 |

Both remained below the 900-second and 2-GiB per-process limits. Wrapper process
times, including startup/exit overhead, were 105.747 and 55.461 seconds. Resource
measurements are separate from the scientific-result digest. The numerical stack
was CPython 3.12.14, NumPy 2.3.5 and OpenBLAS/LAPACK 0.3.30 ILP64 on Linux x86-64,
with one numerical thread. Full package/library identities are in both receipts.

The executed [engineering receipt](training-tail-engineering-validation-v1.json)
binds 22 passing synthetic tests, both test files and all scientific implementation
sources before and after testing. During each actual pass the only original
inputs opened were custody receipt, metadata, source receipt and training labels.
Fold identities and their hash receipt were written before training-label bytes
opened. **No original calibration/evaluation target or truth-report access was
needed for this development experiment or this result summary.**

The three public receipts are byte-for-byte copies of completed cache receipts,
verified against the reproduction seal and inspected for publication: they
contain aggregate metrics, source/environment metadata and artifact hashes, with
no per-record label/JID/prediction tables or coefficient arrays. Those artifacts
remain inside the ignored experiment cache.

| Public receipt | SHA-256 |
| --- | --- |
| Pass 1 | `649b54cdc6ba5de1bbac4b27f788da3e1b0a8febf9266463050b5d2f084c6348` |
| Pass 2 | `5c121c0e3b1c954b6b69e364dce3c22cf9acaf89630905c1c35d4225510c9fbd` |
| Reproduction | `98615bde3ef4c1ad24a1693d56c2252152a8767ea52ec9b44a0d4dcde3101c93` |

The runner hash remains
`abb5782f3c135d54d36ac52d37edee329f9a8c3f310d15a30305fc3383276b43`.
[Run instructions](../docs/training-tail-run.md) preserve the exact engineering
and execution workflow. This result gives no support for promoting any tested
ridge configuration into a new scientific evaluation under the declared gate.
It does not establish that all composition-based or other predictive models
must fail. A different hypothesis requires a new development protocol; the
negative result, grid, folds and thresholds here remain fixed.
