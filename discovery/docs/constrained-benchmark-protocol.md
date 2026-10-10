# Frozen protocol: constrained archived electronic-material screening

Protocol ID: **`jarvis-gap-formation-v1`**. Authored 2026-10-10 before accessing
the selected archive's target data. The protocol is frozen by the first Git
commit containing this file and its [source audit](constrained-source-audit.md).
Record that commit and the SHA-256 of these exact Markdown bytes in every run.
Until that commit exists, do not download or parse the target archive. This
document specifies an experiment; it reports no completed scientific result.

Changes to targets, filters, splits, representations, calibration, acquisition
policies, budgets or acceptance criteria after evaluation outcomes are opened
require a new protocol ID and a fresh evaluation allocation. Mechanical bug
fixes retain both original and corrected receipts/results, identify affected
outcomes already seen, and do not recreate an untouched-test claim.

## Question, finite universe and interpretation

Can a fixed conditional interval selector reduce a finite candidate pool while
retaining **every archived feasible optimum**, and can its evidence-acquisition
order recover good feasible candidates with fewer revealed target bundles than
simple baselines? Test this for jointly recorded electronic properties, then
test whether the implementation abstains when the declared chemistry family
is outside calibration scope.

Source: the exact NIST JARVIS `dft_3d` 2022 ZIP identified in the source audit,
file 38521619, 40,811,489 bytes, upstream MD5
`fb3e1eb80339a70ff313af1c644c1777`. Pin ZIP and member SHA-256 values after
download and before parsing. Never switch to a newer archive or a moving API.

For one JARVIS structure record x:

| Role | Archived field / transform | Unit / pass rule |
|---|---|---|
| Performance target | `E_gap(x) = optb88vdw_bandgap` | eV; larger is better |
| Engine objective | `s(x) = -E_gap(x)` | eV; minimize |
| Feasibility target | `g(x) = formation_energy_peratom` | eV/atom; feasible iff `g(x) <= 0` |

The zero formation-energy threshold is fixed by comparison with the elemental
references, independently of test labels. It is an energetic screen relative
to elements, **not** a convex-hull, kinetic, synthesis or service-condition
stability certificate. The gap is an archived OptB88vdW electronic gap, not a
measured operating-temperature gap. These computations have existing answers;
no DFT calculation will be run. The archived point values define the replay
oracle only. Exact arithmetic does not make those values physically exact.

Each evaluation panel contains **20 candidates**. Its optimum is defined only
over those 20 admitted candidates under the recorded constraint. A successful
panel says nothing about discarded polymorphs, the rest of JARVIS, unknown
compositions, or all possible materials. A small predeclared panel avoids
pretending a calibration set can certify an arbitrarily large search universe.

## Input allowlist and target-blind identities

The archive custodian may parse full records only after protocol freezing.
The predictor and policy receive a stripped metadata table plus their
explicitly authorized labels, never the raw record mapping. Allowed metadata:

- `jid`, required to be a unique string matching `JVASP-[0-9]+`;
- `atoms.elements`, a nonempty list of recognized chemical element symbols;
- original row index for error/audit reporting only, never a feature.

Use `atoms.elements` counts rather than a formula-string parser. Divide all
integer element counts by their greatest common divisor. The composition key
is ASCII element-symbol order, joined as `Al:2|O:3`, including `:1` when needed.
This joins equivalent stoichiometries and cell multiples. It is a chemistry-
aware stoichiometric identity, not a crystal-structure equivalence test.

Define the hash operation for all decisions as:

```
H(tag, text) = SHA256(UTF8("jarvis-gap-formation-v1\n" + tag + "\n" + text))
```

Compare the 32 digest bytes lexicographically. For each composition, choose the
one structurally valid record with smallest `(H("representative", jid), jid)`
**before reading either target or its missingness**. Discard the other records
from this experiment but retain their IDs in the identity manifest. Do not
choose the lowest-energy polymorph or replace a chosen representative with a
better-labeled or more favorable one. If duplicate IDs occur, stop the run;
do not quietly deduplicate them.

After representative selection, the custodian checks the two authorized
fields for finite scalar numeric values. Parse JSON decimals directly into
`Decimal`/`Fraction`, not through binary floats. Numeric JSON strings, if any,
must match a documented finite decimal grammar; `na`, nulls, missing keys,
arrays and nonnumeric strings are missing, not zeros. Booleans and nonfinite
numbers are invalid. Preserve counts/IDs/reasons. The joint-complete
representatives define the evaluation population; incomplete representatives
remain recorded as unresolved and are not labeled feasible or infeasible.

No clipping or value-based outlier removal is permitted, including for
unexpected negative gaps. Report such records as archive-quality flags after
opening labels. Presence of each required schema field somewhere in the
archive is a gate; an absent/renamed field blocks execution rather than
authorizing a substitution. All other archive fields are forbidden features,
including total energies, alternative gaps, energy above hull, CFID entries,
forces, elastic tensors, source calculation outputs and DFT-relaxed geometry.

## Scope, split, caps and panels

The primary family is **oxygen-free compositions**. The shift family is
**oxygen-containing compositions**, detected from metadata before any labels.
Withhold all oxygen-containing compositions from fitting and calibration.
This is a fixed family intervention chosen before outcomes, not a worst-looking
subgroup chosen afterward. No claim of temporal or source independence follows.

For each jointly complete oxygen-free representative, let
`r = int.from_bytes(H("split", composition_key), "big") % 100`:

| Role | Hash bucket | Cap and ordering |
|---|---|---|
| Training | `0 <= r < 50` | first 4,096 by `(H("train-cap", key), key)` |
| Calibration | `50 <= r < 80` | first 2,048 by `(H("cal-cap", key), key)` |
| Primary evaluation | `80 <= r < 100` | first 1,000 by `(H("primary-panel", key), key)` |
| Shift evaluation | all oxygen-containing | first 1,000 by `(H("shift-panel", key), key)` |

In each evaluation role, take consecutive complete blocks of 20 from its
stated ordering. Report the unused final short block and all cap exclusions;
do not pad, resample or search for interesting panels. Up to 50 primary and
50 shift panels result. Panel IDs are role plus zero-based block index padded
to three digits. No composition crosses roles. JIDs, composition keys, grouping
members, missingness counts, split/cap assignments, feature serialization and
panel memberships are sealed in a metadata manifest before fitting.

If fewer than five training representatives exist, mark the model arm blocked.
Fewer than 399 calibration representatives does **not** permit a lower risk
threshold; run the exact unbounded/abstention path. Fewer than 40 complete
primary panels leaves scientific acceptance underpowered/open under this
protocol, but all available panels are still reported. Do not change the caps,
family definition, thresholds or hash seed to increase apparent success.

Hashing is a reproducible sampling device, not a proof that chemically related
materials are IID or exchangeable. The statistical premise remains explicitly
`assumed_unverified` even in the primary arm. One representative per composition
removes direct stoichiometric overlap and changes the target population; it
does not remove all structural, source or chemical-family dependence.

## Fixed predictors and representations

For a reduced composition with counts n_e and total N, use the sparse exact
atomic-fraction vector `x_e = n_e / N`. Predict each target with the mean of
the same **five nearest training compositions** under L1 distance. Distance is
computed exactly, for compositions a and b, as

```
d(a,b) = sum_e abs(n_ae*N_b - n_be*N_a) / (N_a*N_b)
```

The sum spans their union of elements. Sort neighbors by exact distance then
training JID lexicographically. Average their archived target Fractions with
equal weights. Obtain the predicted engine objective by negating the gap
prediction. There is no tuning, target standardization, learned embedding,
external pretrained model, chemistry-property table or covariate-based test
selection. Batching/caching distance calculations is allowed if it leaves the
exact neighbor order unchanged. Record fitted training IDs and a model digest.

The scoped scientific baseline is **one-nearest-composition regression** with
the identical feature/distance/tie rules and training set. This is a transparent
analogy baseline, not a claim to match a state-of-the-art crystal graph model.
Both models receive exactly the same train/calibration information allowance;
neither trains on calibration labels. The nominal baseline below uses the
five-neighbor model, so selector benefit is separated from predictor benefit.

## Calibration and conditional selection

For each scalar target separately, compute n absolute residuals on the fixed
calibration representatives using the frozen five-neighbor predictor. Declare
a **per-panel** joint failure budget `delta = 1/10` across 20 candidates and
two scalar targets. The equal allocation is `epsilon = 1/400`. Use

```
k = ceil((n + 1) * 399/400)
q_gap = kth sorted absolute gap residual, or unbounded if k = n+1
q_formation = kth sorted absolute formation residual, or unbounded if k = n+1
```

Compute the rank and radii with the project's exact calibration planner.
Finite thresholds require `n >= 399`; maximum-residual clamping when k=n+1
is forbidden. Finite intervals are `prediction +/- radius`. Negate both gap
endpoints in the correct order to obtain the objective interval. No physical
range clipping is applied. The two properties have separate radii and units.

The probability interpretation requires calibration/new-score exchangeability
for each target and each admitted new candidate, frozen training/policy and a
matching target population. These assumptions are unproved. A union bound
does not require independence across candidates or properties, but it cannot
repair invalid marginal premises. The budget is per panel; shared calibration
across panels does **not** establish 90% probability that every panel in the
whole experiment is sound. Do not pool all 1,000 evaluation candidates into
one certificate using the 20-candidate budget.

For the primary arm with finite radii, run the exact conditional selector and
label every conclusion conditional on assumed/unverified empirical premises.
When either radius is unbounded, retain all panel candidates, give no finite
regret bound or unmeasured feasibility certificate, and report abstention.
For the oxygen shift arm, the declared family is unsupported: the operational
answer is abstention/all candidates retained, irrespective of whether a
numerical radius can be computed from the oxygen-free calibration data.

For diagnosis only, also freeze the finite primary-family intervals on shift
candidates, when available, and later measure their coverage/exclusions under
the label `unsupported_transfer_diagnostic`. Those intervals must never be
presented as a calibrated shift guarantee or used for operational pruning in
the shift arm. This separates a useful shift failure demonstration from safe
abstention, which by itself is not predictive accuracy.

## Frozen reveal policies and equal budgets

A reveal buys the two archived targets for **one** panel candidate. Every
policy pays the same one-bundle cost; no policy sees another policy's revealed
labels during its run. This is a retrospective information budget, not an
estimate of DFT wall time, laboratory expense or synthesis feasibility.
Training/calibration acquisition counts are reported separately and identically
for all policies. Public availability is not treated as free evaluation access.

Evaluate cumulative budgets **0, 1, 2, 4, 8, 20** on every panel. The primary
comparison is budget **4**, fixed before labels. Preserve every selection and
reveal event so the curves can be regenerated.

| Policy | Next unrevealed candidate |
|---|---|
| Interval acquisition | Recompute the conditional pool after replacing each revealed candidate's score and constraint intervals by its exact archived point values. Among unrevealed retained candidates, choose smallest objective lower bound, then JID. If none remains, fill the remaining budget from unrevealed panel candidates by the nominal order below; mark these `fallback_outside_pool`. |
| Nominal five-neighbor | Sort once by `(predicted_g > 0, max(predicted_g, 0), predicted_s, jid)` and reveal in that order. |
| Nearest-composition baseline | The same nominal order from the one-neighbor predictions. |
| Primary random baseline | Sort once by `(H("random-0", panel_id + "\n" + jid), jid)`. |

For unbounded or unsupported-scope operational intervals, interval acquisition
retains all unmeasured candidates and uses the nominal five-neighbor order
without claiming a finite lower bound. Its shift behavior is deliberately
identical to nominal scheduling plus explicit abstention. A reveal is an exact
archive oracle call for this benchmark, not a proof the physical property has
zero uncertainty. Keep the predictor and original calibration fixed throughout;
do not refit, narrow other candidates' intervals or recycle revealed targets
as new calibration. Replacing only a measured candidate's intervals preserves
the original all-unmeasured coverage event if that event held.

As a prespecified random-order sensitivity analysis, repeat random ordering
with tags `random-1` through `random-99`. Publish all 100 curves and their mean
and range. The primary random comparator remains `random-0`; do not select a
favorable seed or call the 100 correlated reruns independent experiments.

At budget 0 report the conditional pool/certificate and each policy's nominal
top suggestion separately. An unmeasured suggestion is not counted as a
verified feasible hit. At later budgets, each policy's returned incumbent is
its best **revealed, truly feasible** candidate, with all ties retained and JID
as a display tie-break. If none was found, report `no_verified_feasible_hit` and
null regret; never silently drop that panel from a success denominator.

## Sealing and access controls

Implement three distinct interfaces/process roles, with adversarial tests:

1. **Custodian/acquisition:** verifies archive identity, constructs the declared
   representation/missingness manifest and writes separate train, calibration
   and sealed evaluation targets. It never prints evaluation target values.
   Target fields cannot be carried along as opaque record dictionaries.
2. **Fit/freeze:** reads metadata plus train/calibration labels only, creates
   all predictions, radii, baseline orders and panel certificates, and writes
   an immutable receipt containing protocol/source/metadata/model/prediction
   digests. A test must replace evaluation-target access with an exception and
   still complete this stage successfully.
3. **Replay:** refuses to open the target seal until the freeze receipt verifies.
   A per-policy oracle reveals only the selected JID once per policy, logs each
   request and enforces its budget. The acquisition function receives only the
   current intervals and its own history. Full target access occurs only in
   the post-run evaluator for metrics and is logged as such.

Logical access boundaries and hashes make accidental leakage testable; the
custodian and public source mean this is not independent prospective blinding.
Do not claim otherwise. Instrument a guarded mapping/oracle in tests to reject
unselected IDs, cross-policy history, early target reads, post-freeze model
changes, broken seals, duplicate reveals and excess budgets. Save receipts
before any metrics are calculated; do not merely hash a report after outcomes
were already used. Raw archives and evaluation-target tables stay out of Git.

## Required reported metrics

Report per-panel results and aggregate numerators/denominators for both arms,
never a sole average that hides constraint or soundness failures:

- eligible/missing/invalid/duplicate counts, group/cap exclusions, split sizes,
  calibration count/rank/radii, exact model/target/receipt identities;
- feasible population count and fraction, mixed-feasibility panel count,
  archive-optimum value and all exactly tied optimum IDs;
- scalar interval coverage for each property, candidate joint coverage, and
  **panel simultaneous** coverage of all 40 scalar values; list every miss;
- retained count/fraction, feasible-candidate retention, all-optimum retention,
  lost-optimum IDs, false infeasibility exclusions, certified-incumbent actual
  feasibility, and conditional regret-bound violations;
- every budget's feasible-hit rate, revealed-feasible fraction, best verified
  feasible gap, simple regret in eV, exact/all-optimum recovery, and success
  within **0.1 eV** of the best feasible archived gap;
- abstention, no-incumbent and no-feasible-truth states with explicit nulls;
  reveal counts, fallback counts, total target bundles and elapsed CPU time;
- paired policy differences at budget 4, all other budgets descriptively,
  random-seed sensitivity, and shift operational versus diagnostic results.

For feasible panels, simple regret is `best_feasible_gap - found_gap >= 0`.
If no feasible incumbent is found, regret is null **and** the success indicator
is zero. For a panel with no feasible candidate, optimum/recovery/regret are
undefined; report it in a separate stratum and exclude it only from metrics
that mathematically require an optimum, with the denominator visible.
All-optimum retention is undefined, not automatically true, in that stratum.
The 0.1 eV success tolerance is an engineering comparison resolution fixed
here; it is not an error bar on DFT or an experimental indistinguishability
claim. Also publish exact archived-decimal ties and the within-0.1-eV set.

## Acceptance rules and non-success outcomes

The experiment is complete when its declared run is reproducible with intact
seals and a complete report, even if no scientific criterion succeeds. Do not
retune the protocol on a failed result. Scientific acceptance is narrower:

1. **Engineering integrity:** all access-control, exact-neighbor/tie, constraint
   orientation, scope-abstention and equal-budget tests pass. At budget 20 all
   policies recover the exact feasible optimum on every feasible panel. An
   injected unsound-interval control must expose a lost optimum or false
   exclusion, not be counted as real-data accuracy. Any integrity failure
   blocks scientific interpretation until fixed and transparently rerun.
2. **Nontrivial constrained evidence:** at least 40 primary panels, at least
   5% truly infeasible primary candidates, and at least 10 mixed-feasibility
   primary panels. Otherwise report the run but leave constrained-screening
   usefulness open; do not adjust the zero threshold to force a harder task.
3. **Observed primary screening:** panel simultaneous coverage at least 90%,
   all-optimum retention at least 95% of feasible panels, no actual infeasible
   certified incumbent, and median retained fraction at most 80%. These are
   predeclared observed gates, not a proof of 90% future joint coverage. Report
   failure counts and interval widths even if optimum retention happens to pass.
4. **Recommendation value:** at budget 4, the interval policy's fraction of
   feasible panels finding a verified candidate within 0.1 eV of optimum must
   exceed **each** primary comparator by at least 10 percentage points.
   Report exact paired win/loss/tie counts. Additionally report one-sided
   paired sign-test p-values for the three success-indicator comparisons,
   using `sum(comb(w+l,i) for i in range(w,w+l+1))/2**(w+l)`, or 1 if no
   discordant panels. A provisional statistical criterion is p <= 0.05/3 for
   each comparison; its independent-panel premise is unverified here and must
   be stated. Shared calibration and chemical dependence prevent treating
   this as independently confirmed superiority. No such claim is released
   without a separate source/family replication under a new frozen protocol.
5. **Shift behavior:** operational abstention on every oxygen panel, no finite
   unmeasured feasibility/regret guarantee, and all unrevealed candidates
   retained. Publish unsupported-transfer diagnostic coverage and losses.
   Passing this gate demonstrates safe scope handling, not successful
   prediction on oxygen chemistry.

Report each gate as PASS, FAIL, OPEN or BLOCKED with measured evidence and
denominators. A finite conformal radius, successful optimizer recovery or a
green browser test cannot by itself upgrade exchangeability or physical scope.
Do not rename this source's calculations as experimental validation or infer
performance under high temperature/corrosion. The three original pilot failures
remain in the release record regardless of this result.

## Resource and release record

Use local CPU only, with a 60-minute computation budget excluding acquisition
and dependency installation, and a documented peak-memory target below 2 GiB.
If exact-neighbor evaluation exceeds the budget, checkpoint complete frozen
predictions and mark remaining panels unexecuted; do not reduce the dataset or
change the distance after seeing results. Algorithmic optimization that provably
preserves exact distances/neighbors is a mechanical change and must be checked
against the scalar reference on generated adversarial compositions.

An implementation should expose separate `acquire`, `freeze` and `replay`
commands, then a reproducibility command that verifies the receipts. Save the
source receipt, protocol commit/digest, metadata/split digests, runtime and
dependency versions, predictions/calibration receipt, oracle-access log digest,
per-panel/budget report and aggregate gate decisions. Attribute JARVIS/Figshare
under the source's CC BY 4.0 terms, identify Lupine's transformations, and keep
raw targets in an ignored local cache. Publish the frozen protocol before
execution and derived reports afterward; no favorable-result-only publication.
