# Frozen development protocol: training-only extreme-tail prediction

Protocol ID: **`jarvis-training-tail-v1`**. Authored 2026-10-10 after the original
constrained evaluation and its [interval diagnosis](interval-bottleneck.md).
This is a bounded model-development experiment, not an untouched test or a new
calibration. No fitting, out-of-fold prediction, or performance calculation may
begin until the exact bytes of this document are committed and pushed and their
commit and SHA-256 are recorded. The parent integration agent supplies that
identity. Preserve this protocol and all failures; changes require a new ID.

## Question and allowed information

Does a simple learned elemental-composition model reduce both targets' extreme
absolute-error tails sufficiently and consistently, compared with the existing
composition 5NN method, to justify designing a **new** calibration/evaluation
experiment? The hypothesis is motivated by the already observed failure of wide
intervals to reduce the original candidate pools. That history is disclosed;
withholding further reads does not make the prior results unobserved.

Use exactly the **4,096 original training representatives**, with their original
reduced-composition counts and rational target labels. Do not add an archive row,
choose another polymorph, remove an outlier, change a target, or move a record
from another role. Each representative already denotes a distinct composition.
They are oxygen-free under the original protocol.

| Input | Exact SHA-256 |
| --- | --- |
| `metadata.json` | `e4f623329be262c9057eb9a7e9d7ca96fb05c8e7877845e3da4fb450c8c90655` |
| `train.json` | `6ffb1e687ef888388f06b4ac4d2b951f3600e4ea00fb04f9d8a1d03c5c2a3a31` |
| `source-receipt.json` | `dd2fd4405009e0b897b986b7392f21f664b3928f7fc4330909bef207dd5e3def` |
| `custody-receipt.json` | `bed6061e33bc7961f6cff858d043b012c8e2337ae31decd6ac30acd5f82fe626` |

Read and hash each input's captured bytes before decoding the same bytes. Accept
only `metadata.selected.train` as model records and the identical JID set from
`train.targets`; require 4,096 unique JIDs and composition keys, valid positive
integer reduced counts, no oxygen, and finite rational targets. Metadata for
other roles is not used. The source-receipt hash preserves original archive
provenance; no raw ZIP/member needs opening or redownloading.

The custody receipt must agree with the metadata, training and source hashes
above. Bind the original protocol commit
`b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` and protocol-file SHA-256
`1a61c76865525b62ad7ea7555b87e0fb334e8e2cc9a6db9ad18bd820199adef0`,
and the format-amendment commit `e04c5d6cca8e677cadc0cefa4208f2625d89e227`
and file SHA-256 `3c97d3f2d2f8d586c0b3c60ce742d24cd87d0c327052fa5832f18a11daeae94a`.
Check those document bytes without invoking the full original verifier.

The only original-cache JSON read allowlist is **metadata, source receipt,
custody receipt, and training labels**, at their resolved expected paths.
Access to new experiment-owned manifests, prediction artifacts and receipts is
allowed; an unexpected input JSON path is blocked. Training-label bytes,
including bytes read solely for hashing, may be opened only after the fold
manifest has been written. The receipt may bind the old evaluation seal as
metadata but must never open the file named by it.

**Forbidden target inputs:** the original calibration file, original evaluation
targets, original replay/truth reports, unselected archive targets, and any
fresh calibration/evaluation targets. The earlier diagnosis report must not
be a runtime input. The implementation must not call the existing
`verify_freeze`/`load_fit_inputs` helpers, because those also open calibration
labels. File-access tests and the actual runner must enforce this boundary.

Targets remain `gap = optb88vdw_bandgap` in eV and
`formation = formation_energy_peratom` in eV/atom. Use signed values as recorded;
do not clip negative gap predictions or labels. The downstream objective remains
minus gap and the feasibility threshold remains formation at most zero. This
development run does not calculate a new selector pool, coverage rate, feasible
hit rate, or benchmark gate. Existing exact selector and calibration code remain
unchanged. No new DFT, external property table, pretrained model, or structure
descriptor is introduced.

## Five folds fixed without outcomes

For each selected training composition, retain its original ASCII composition
key, such as `Al:2|O:3`. Define:

```
F(key) = SHA256(UTF8("jarvis-training-tail-v1\nfold\n" + key))
```

Sort all 4,096 records by `(F(key) digest bytes, key, jid)` and assign the record
at zero-based position `i` to fold `i % 5`. No seed search or fold retry is
permitted. This balances validation counts at `[820, 819, 819, 819, 819]` and
training counts at `[3276, 3277, 3277, 3277, 3277]`. All records of a composition
would share its assignment; duplicate composition keys are a blocking input
error, not a reason to split them. This prevents direct composition overlap but
does not establish independence between chemically related compositions.

Write an immutable JID/key/fold manifest and its hash **before opening training
target labels**. In each fold fit only the other four folds. For every matrix,
neighbor index and prediction output, order training and validation rows by JID
in ASCII lexicographic order. Execute folds 0 through 4 in that order. Every
record receives exactly one held-out prediction from each model. The global
out-of-fold output order is JID order.

## Four fixed model configurations

The comparator is the original exact atomic-fraction **5NN** regression, fitted
anew within each training fold. Use exact L1 distance and sort equal distances by
training JID; predict each property by the rational mean of the same five
neighbors. No validation record can be its own neighbor. The safe exact overlap
index optimization is allowed if it agrees with the full-distance oracle. Keep
5NN predictions as exact Fractions; do not quantize them.

The three alternatives are **element-fraction ridge** with
`lambda in {1/1000000, 1/1000, 1/10}`. One common lambda predicts both properties;
there is no target-specific model selection or additional hyperparameter search.
Use exactly these 118 element symbols, sorted in ASCII order for feature columns:

```
H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn
Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu
Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm
Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og
```

Feature `x_e` is the exact count fraction `n_e / sum(n)`, with zero for an absent
element. No variance standardization, feature selection, interaction terms,
target scaling, sample weighting, PCA, or learned descriptor is used. Columns
unseen in a training fold stay present, with zero fitted coefficient; report
validation records containing an element absent from that training fold.

For each fold, compute feature means `mux` and both target means `muy` as exact
Fractions using **training-fold rows only**. Center the training and validation
features using those same means, and center training targets using `muy`.
Convert each exact centered value to NumPy `float64` once when constructing the
matrices. Validation targets are forbidden to the fit/predict function.

For each property the intended objective is mean squared error plus ridge
penalty, with an unpenalized intercept:

```
(1/ntrain) * sum_i (y_i - intercept - x_i @ beta)^2
    + lambda * sum_e beta_e^2

G = Xcentered.T @ Xcentered / ntrain
C = Xcentered.T @ Ycentered / ntrain
A = G + float64(lambda) * identity(118)
beta = numpy.linalg.solve(A, C)       # two target columns: gap, formation
raw_prediction = Xvalidation_centered @ beta + float64(muy)
```

This is the **mean-loss** convention; substituting sum loss changes the model
and is prohibited. The feature fractions are dimensionless; each target retains
its stated unit, and lambda has the normalization implied by this objective.
Execute lambda values in increasing order. No iterative optimizer, random seed,
coefficient rounding, clipping, numerical fallback, or alternate solver is used.

Block that configuration if solving raises an error or any matrix, coefficient,
or output is nonfinite. Also block if the computed relative backward residual
exceeds `1e-10`:

```
||A @ beta - C||inf / (||A||inf * ||beta||inf + ||C||inf)
```

Use matrix infinity norms (maximum absolute row sum). If the denominator is zero,
accept exactly zero numerator and otherwise block. This check detects numerical
problems; it is not a formal error bound on the fitted model. Preserve all such
failures and exclude incomplete configurations from eligibility.

## Numerical boundary and reproducibility

The fitting stack for this run is CPython **3.12.14**, NumPy **2.3.5**, Linux
x86-64, and the installed OpenBLAS/LAPACK **0.3.30** ILP64 build. Record complete
NumPy build configuration, Python/platform/CPU identities, NumPy package and
loaded BLAS shared-library hashes, and implementation source hashes. A stack
mismatch is `BLOCKED_ENVIRONMENT`; do not silently replace it.

Launch a fresh process with `PYTHONHASHSEED=0` and all of
`OPENBLAS_NUM_THREADS`, `OMP_NUM_THREADS`, `MKL_NUM_THREADS`, `BLIS_NUM_THREADS`,
`VECLIB_MAXIMUM_THREADS`, and `NUMEXPR_NUM_THREADS` set to `1` **before importing
NumPy**. Retain raw final ridge predictions and coefficients as canonical
little-endian float64 bytes with shapes, row/column identities and hashes.

Quantize only final ridge predictions, after restoring the intercept. For finite
binary64 value `v`, define the exact rational output:

```
q(v) = Fraction(round(Fraction.from_float(float(v)) * 10**8), 10**8)
```

Here `round` is integer nearest rounding with ties to even, applied to the exact
binary64 value, not to a decimal rendering. Each quantized value differs from
that raw binary64 value by at most `1/(2*10**8)` in the target's unit. All error
metrics, ranks, comparisons, ratios, and gate margins use original rational
labels and exact quantized predictions. This preserves the exact downstream
arithmetic boundary; it does not turn floating-point regression into a proved
physical model or guarantee identical output on another architecture.

Repeat the whole out-of-fold calculation in a second fresh process with the same
inputs and pinned environment, without copying processed predictions. Require
identical fold manifests, quantized predictions, metrics, and gate decisions;
compare raw float64 hashes as well and report their equality separately. Different
quantized outputs or decisions give `BLOCKED_REPRODUCIBILITY`, not a new seed or
precision. Raw-only differences with identical quantized outputs remain disclosed.

## Descriptive metrics and exact eligibility

For each model, target, and held-out fold, and for all 4,096 held-out predictions
pooled, compute absolute residuals `r = abs(y - prediction)`. Define the descriptive
near-`1/400` tail statistic:

```
k(n) = ceil((n + 1) * 399/400)
T = kth residual in ascending order
```

The pooled rank is **4,087**, the tenth-largest residual. Fold ranks are 819 of
820 and 818 of 819, both the second-largest residual. If a count or rank differs
from these requirements, block the run; never replace an unavailable order
statistic with the maximum. Also report count, MAE, median, nearest-rank 90th,
95th and 99th percentiles, maximum absolute error, and the five fold tail values
with their minimum/maximum and exact range. Even medians average the middle pair.

These pooled out-of-fold residuals come from different overlapping fitted models.
They are **not an exchangeable calibration sample for a final fitted model**.
The rank formula is a descriptive tail yardstick, not a conformal radius or
coverage result. Fold extremes are sensitive to individual records. Do not
report confidence intervals, p-values, or statistical significance from five
dependent folds. All three ridge configurations and failures remain reported.

A ridge configuration is provisionally eligible only if **each property** meets
every gate below, using exact arithmetic and cross multiplication:

1. The pooled 5NN tail statistic is strictly positive, and
   `10 * T_ridge <= 9 * T_5NN` (at least 10% lower pooled extreme-tail error).
2. In at least **four of five folds**, `T_ridge < T_5NN`; ties do not improve.
3. In **every fold**, `10 * T_ridge <= 11 * T_5NN` and
   `10 * maxerror_ridge <= 11 * maxerror_5NN`.
4. Pooled `MAE_ridge <= MAE_5NN` and
   `10 * maxerror_ridge <= 11 * maxerror_5NN`.

Zero fold baseline errors are handled by these inequalities: the corresponding
ridge error must also be zero for a non-deterioration gate and cannot count as a
strict improvement. A zero pooled baseline tail makes that configuration
ineligible for this relative-improvement question; its ratio is unavailable,
with an explicit reason rather than infinity or an invented denominator.

Record every exact gate margin. Apply an additional **numerical sensitivity
guard**, with `tau = 1/1000000` in each target's unit: replace every ridge tail,
maximum-error and MAE metric by that metric plus tau and reevaluate the same
gates. An otherwise eligible configuration that fails this guard is
`NUMERICAL_BORDERLINE`, not eligible for advancing. This is a predeclared
decision-stability check, not a certified bound on numerical error.

If several configurations remain eligible, choose the one with the smallest
`max(T_gap/T_5NN_gap, T_formation/T_5NN_formation)`. Break ties by the sum of
those two ratios, then **larger lambda**. All ratios are exact Fractions. One
configuration must pass for both properties; do not assemble a winner from
different target-specific lambdas. Any configuration with a fit failure is
ineligible. The selected model's OOF results are development-selection results,
not an unbiased estimate of its future performance.

## Cost, receipts and go/no-go meaning

Use local CPU only, one numerical thread, at most **900 seconds per complete
process pass**, two passes, and a **2 GiB peak-RSS ceiling**. Check elapsed time
and memory between nearest-neighbor queries and model/fold fits. Checkpoint
completed work with an explicit `INCOMPLETE` status if a limit is reached; no
partial configuration or incomplete repetition can pass. Do not change folds,
shrink the dataset, substitute approximate neighbors, or expand the grid to fit
the budget. Record wall/user/system CPU time, peak memory, per-stage costs, and
whether limits were checked. No paid resources or external service calls.

The run produces immutable, source-bound receipts containing protocol commit/hash,
input hashes, environment, fold manifest, model identities, raw/quantized output
hashes, numerical checks, every model's aggregate/fold metrics, gate margins,
selection, costs and failures. Store prediction/coefficient artifacts only in
an ignored experiment cache; publish aggregate reports without raw label tables.
Keep machine resource measurements outside the scientific-result digest.

Before actual execution, synthetic tests must verify: fold disjointness and exact
counts; fit functions cannot read held-out labels; prohibited file reads fail;
5NN tie/oracle agreement; training-only centering; ridge mean-loss/intercept
semantics on an independently solvable small example; exact ties-even output
quantization; rank/zero-baseline/tied-gate/numerical-borderline decisions; and
source/environment mismatches failing before fitting. Tests may fit tiny synthetic
examples only after this protocol is frozen.

`GO_DESIGN_FRESH_PROTOCOL` requires a complete reproducible run and at least one
eligible ridge configuration. It authorizes only preparation of a new frozen
calibration/evaluation protocol with adequate **previously unused target
allocations**, recorded access history, and the selected representation/model.
It does not authorize reading those labels, certify coverage, change the original
benchmark verdict, or establish a scientifically supported recommendation.

Otherwise record `NO_GO_MODEL_IMPROVEMENT`, with any input/environment/numerical/
resource block separately identified. Preserve the full negative development
result; no additional model, regularization value, fold salt or metric is tried
under this ID. This run does not fit a final all-training model or create new
intervals. The next concrete deliverable after freezing is the tested runner,
its two executions, and the resulting go/no-go receipt.
