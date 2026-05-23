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

`hyperribbon-mptrj-sevennet-energy-v1-accuracy.json` is the SevenNet energy
variant selected with the same non-overlapping MPtrj support split:

- selector report:
  `tmp/mlip-distill-growth/sevennet-energy-mptrj-support-v1-raw-replay/growth_report.json`
- validation run:
  `tmp/mlip-local/sevennet-energy-mptrj-support-v1-selected`

On the local SevenNet energy row, this policy reduced held-out energy MAE from
`0.3997` to `0.2773` eV/atom. This gives backend diversity for the residual
ribbon method, but it is still scoped to the energy row.

`hyperribbon-mptrj-mace-stress-v1-accuracy.json` is the first row-diverse
positive local ribbon. It was selected from:

- selector report:
  `tmp/mlip-distill-growth/mace-stress-mptrj-support-v1-raw-replay/growth_report.json`
- validation run:
  `tmp/mlip-local/mace-stress-mptrj-support-v1-selected`

On the local MACE-MP-0 stress row, this policy reduced held-out stress MAE from
`0.5669` to `0.3481` GPa. The accelerate variant currently degrades this stress
row, so treat this policy as Distill Accuracy only until an acceleration-safe
variant is selected and validated.

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
