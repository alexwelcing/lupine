# MLIP Distill Policy Limits

These files are pure `PolicyLimits` JSON objects so they can be passed directly
to `mlip_cell_runner.py --distill-policy-url`.

`hyperribbon-local-v1b-accuracy.json` is a local lab ribbon selected from:

- `tmp/mlip-local/chgnet-energy-distill-ribbon-v1`
- `tmp/mlip-local/chgnet-stress-distill-ribbon-v1`
- `tmp/mlip-local/mace-forces-distill-ribbon-v1`

It is intentionally conservative. The first local evidence showed that a large
CHGNet energy correction and a moderate CHGNet stress correction looked good on
support but did not transfer to held-out eval. This ribbon blocks those moves
while preserving raw-prediction replay and intervention evidence for local
model tests.

`hyperribbon-mptrj-support-v1-accuracy.json` is the first same-distribution
local support ribbon selected from non-overlapping MPtrj train support:

- support manifest:
  `gcp/mlip-cell-runner/fixtures/canonical_distill_support_mptrj_train_v1.json`
- selector report:
  `tmp/mlip-distill-growth/mace-energy-mptrj-support-v1-raw-replay/growth_report.json`
- validation run:
  `tmp/mlip-local/mace-energy-mptrj-support-v1-selected2`

On the local MACE-MP-0 energy row, this policy reduced held-out energy MAE from
`0.4116` to `0.2038` eV/atom by applying three bounded rank-aware residual
corrections and blocking two oversized corrections. This is local evidence for
Distill Accuracy mechanics, not yet a full 5x5x3 publication claim.
After the Ni EAM-home-turf paired run, this policy now requires exact
support/eval material-root overlap before residual correction. The prior global
MPtrj support lift was not enough to justify applying energy shifts to pure Ni.

`hyperribbon-mptrj-support-floor-v2-accuracy.json` is the first broad MPtrj
negative-transfer repair. The widened Cloud Run canary showed that MACE, ORB,
and SevenNet benefit from the global MPtrj residual ribbon, but CHGNet regresses
on energy-volume and relaxation-stability because its support residual is
already small before correction. The v2 policy keeps the global support lane
open but adds `min_ribbon_support_error_before = 0.05`, so the Rust policy
engine blocks residual ribbons whose support set is already below the physical
error floor. This is a general "do not over-correct a strong backend" guard, not
a CHGNet-only exception.

`hyperribbon-mptrj-row-hybrid-v3-accuracy.json` is a local replay candidate,
not the default cloud policy yet. It keeps v2's support-floor energy behavior,
then adds a `relaxation_stability` row override selected from the group-aware
local theory lane. Against the completed MPtrj promotion-canary checkpoints it
keeps the same 6 improved / 2 unchanged / 0 regressed pair verdict, while
increasing mean pair lift from the v2 replay's ~22.6% to ~25.6%. Promote it to
default only after a fresh Cloud Run canary confirms the replay.

`hyperribbon-mptrj-spectral-v4-accuracy.json` is a local science-gate
candidate for the projected hyper-ribbon lane. It is not the default cloud
policy. The paired MPtrj promotion-canary baseline artifacts now emit
`lupine.distill.subspace_diagnostic.v1`; on the completed canary,
energy-volume is complement-heavy across MACE, CHGNet, ORB, and SevenNet
(`0.9869`, `0.9999`, `0.9936`, `0.9986` complement residual fraction). The v4
policy enables projected residual correction only for spectral ribbon versions
and blocks correction when the complement fraction is low, projection distance
is high, or stiff-axis signal exceeds the drift budget. This is the next replay
gate before any Cloud Run spend.

`hyperribbon-ni-eam-support-v1-accuracy.json` is the first Lane A
material-family support ribbon. It is paired with
`gcp/mlip-cell-runner/fixtures/ni_fcc_eam_distill_support_v1.json`, a generated
Mishin-1999 EAM support fixture that deliberately avoids the sealed
`ni-fcc-eam-home-turf-v1` structure ids, scales, seeds, and strain choices.
This policy requires material-root overlap, sets the support/eval distance gate
to exact overlap, and adds a bounded ribbon-feature distance gate. It also
separates ordinary energy bias from material-family zero-point alignment:
large energy shifts stay blocked unless the support evidence has high lift,
same-material roots, and the exact support/eval distance gate passes. The
intended first use is the promotion canary over energy-volume and relaxation
for MACE-MP-0, CHGNet, and ORB-v3 before any new full 5x5 spend.

`hyperribbon-mptrj-sevennet-energy-v1-accuracy.json` is the SevenNet energy
variant selected with the same non-overlapping MPtrj support split:

- selector report:
  `tmp/mlip-distill-growth/sevennet-energy-mptrj-support-v1-raw-replay/growth_report.json`
- validation run:
  `tmp/mlip-local/sevennet-energy-mptrj-support-v1-selected`

On the local SevenNet energy row, this policy reduced held-out energy MAE from
`0.3997` to `0.2773` eV/atom. This gives backend diversity for the residual
ribbon method, but it is still scoped to the energy row and now uses the same
material-root overlap guard before transfer.

`hyperribbon-mptrj-mace-stress-v1-accuracy.json` is the first row-diverse
positive local ribbon. It was selected from:

- selector report:
  `tmp/mlip-distill-growth/mace-stress-mptrj-support-v1-raw-replay/growth_report.json`
- validation run:
  `tmp/mlip-local/mace-stress-mptrj-support-v1-selected`

On the local MACE-MP-0 stress row, this policy reduced held-out stress MAE from
`0.5669` to `0.3481` GPa. The accelerate variant currently degrades this stress
row, so treat this policy as Distill Accuracy only until an acceleration-safe
variant is selected and validated. The Ni run also pushed this policy behind
the material-root overlap guard so stress corrections cannot transfer from a
support family with no exact material-root match.

`hyperribbon-v2-orb-distance-gated-accuracy.json` is the first ORB-specific
held-out replay lift from the cross-MLIP GCP evidence cache. It adds a
per-prediction `ribbon_feature_distance_proxy` gate so the support residual is
only applied when the current structure is inside the learned ribbon feature
domain. On the ORB replay set it reduced energy MAE from `0.4295` to `0.3344`
eV/atom while leaving forces, stress, and relaxation neutral. The first full
cloud row run showed small red on elastic and relaxation, motivating the
row-aware v3 policy.

`hyperribbon-v3-orb-row-aware-accuracy.json` keeps the ORB energy/force/stress
lift but refuses residual correction in rows where the same correction is not
yet faithful to the downstream scoring contract. It disables stress correction
for `elastic_constants` and relaxed-energy/force correction for
`relaxation_stability`, preserving baseline behavior there until a strain-aware
elastic ribbon and active optimizer ribbon are selected. In the controlled GCP
accuracy run `mlip-v3-orb-controlled-accuracy-20260527a`, baseline and Distill
Accuracy shared the same raw-prediction checkpoint per row. ORB energy MAE
improved from `0.4295` to `0.3344` eV/atom (`+22.14%` relative error lift);
elastic, forces, stress, and relaxation were neutral to floating-point
precision.

`hyperribbon-v3-chgnet-signed-orientation-accuracy.json` is the first CHGNet
policy that turns the current support from red to green. The root cause was
residual orientation transfer: the support residual fit was predictive, but the
held-out CHGNet energy row improved only with a small signed scale. On the
CHGNet replay set this reduced energy MAE from `0.1035` to `0.0971` eV/atom and
kept forces, stress, and relaxation neutral. The cloud row run then exposed a
tiny force-row numerical red, so the policy now row-overrides `forces` to block
force correction until a real force lift is selected.

In the controlled GCP accuracy run
`mlip-v3-chgnet-controlled-accuracy-20260527a`, baseline and Distill Accuracy
shared the same raw-prediction checkpoint per row. CHGNet energy MAE improved
from `0.1035` to `0.0971` eV/atom (`+6.13%` relative error lift) and relaxation
error improved from `0.05567` to `0.05406` (`+2.89%`). Elastic, forces, and
stress were neutral to floating-point precision.

Controlled accuracy runs deliberately share raw prediction checkpoints between
baseline and Distill Accuracy to isolate the ribbon's accuracy effect from
backend nondeterminism. Do not treat their Distill speed values as acceleration
evidence; run separate speed/accelerate campaigns for that claim.

Example:

```powershell
python tools/mlip_local_lab.py `
  --mode campaign `
  --mlip chgnet `
  --row stress `
  --workers 1 `
  --ribbon-version hyperribbon-local-v1b `
  --distill-policy-engine rust `
  --distill-policy-url gcp/mlip-cell-runner/policies/hyperribbon-local-v1b-accuracy.json
```
