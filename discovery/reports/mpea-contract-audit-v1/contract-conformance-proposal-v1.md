# Prospective implementation conformance repair — proposal v1

Status: implementation proposal only, before registration or any real allocation/
performance interpretation. Original protocol/contract bytes and the held producer
checkpoint remain unchanged. The completed synthetic evidence bundle preserves
that checkpoint and its now-recognized literal contract gaps. No claim of full
contract conformance attaches to those earlier passing tests.

## Required-field inventory

The basis is implementation-contract §2, not a weakened replacement specification.
The table distinguishes already sealed evidence from missing declared structure.

| Required artifact | Present evidence | Missing required members or declared artifact |
| --- | --- | --- |
| `allocation.v1` | All ten required members are present in the registration allocator's exact keyset. The original route sidecar and first-draw transcript are sealed. | No required scientific member missing. Its stage usage is empty. Existing fixed extra provenance members are declared by its closed implementation schema. |
| `label_routes.v1` | All five required members are present: all 1,545 row routes, positions, mapping identity, condition and source-role map. | No required member missing. |
| `input_freeze.v1` | Feature/route identities, 314 typed feature records, original/condition counts, roles and overlap are sealed under compact names. | Required `feature_artifact`, `metadata_receipts`, `mapping`, `profile`, `label_route_seal`, `funnel_counts`, `overlap_counts`, `original_membership` are not the declared fields. `role_counts` exists. Full source membership is only reached through the route artifact; metadata/profile provenance is not explicitly joined here. |
| `development_targets.v1` | `development.v1` currently seals every parsed development row, aggregate status/reason counts, complete-row/source counts and the adequacy status/reasons. | The separately named artifact is absent. Required `target_profile` and `source_framing` are absent; `status_counts`, complete counts and `adequacy` are nested/renamed. |
| `rank_freeze.v1` | Threshold, processing/global medians and all 75 compact panel ranks are sealed; each rank contains exact predictions, query rows, neighbor IDs/routes and all 23 orders. | Required `development_membership`, `predictions`, `neighbor_or_fallback_records`, `full_orders`, `fallback_counts`, `predictor_profile` are absent as declared fields. Prediction/order/neighbor evidence mostly exists nested; complete versus original development membership and the explicit profile are genuinely missing here. |
| `completeness.v1` (public-safe) | `reserved.v1` privately seals the all-40 boolean, complete IDs, target aggregates and both vault identities. | The distinct public-safe artifact is absent. All nine required fields need the declared public structure: panel/row counts, all-defined flag, target-status counts, population counts, three companion identities and fixed scope. No row IDs may enter this artifact. |
| `target_vault.v1` | Separate role files contain role, exact rows and rank-freeze scientific identity. | Required `target_profile`, `row_count`, `source_framing` are absent. |
| `secondary_membership.v1` (private) | Complete-ID sets are in `reserved`; literal restricted future/calibration orders are subsequently materialized in typed plans. | The distinct artifact is absent. It must explicitly contain all 40 source groups, their complete members and literal restrictions of every frozen order, the fixed rule and rank-freeze identity, including empty panels. |
| `calibration.v1` | The two compact plans include full protocol/calibration/future-panel evidence, compact decisions and exact policy schedules. All-future-decisions-sealed is explicit. | Required `protocols`, `calibrations`, `future_panels`, `decisions`, `policy_schedules`, `scope` are not declared top-level members. The evidence mostly exists inside plans; add the exact typed views and their consistency checks. |
| Public `evaluation.v1` | The frozen public projector already emits every listed required field, including costs, gates, populations and scope, plus explicitly closed supporting fields. | No listed payload member missing. The private evaluation checkpoint is a distinct schema and is not its public substitute. Preserve that distinction. |

The original §10 stage CPU/wall/resource observations are absent: stage `usage`
is empty; final worker/supervisor totals do not supply stage measurements.

## Minimal implementation route

1. Add a small source-free `mpea_archive_artifacts.py` schema/profile adapter.
   It constructs and validates exact required fields from the already validated
   typed inputs and original compact objects. It never predicts, calibrates,
   chooses a reference, changes a parser decision, or reads a source file.
   Every schema has a closed keyset and exact nested types. Retained compact
   compatibility members have a fixed declared set and canonical consistency
   checks against their required views; no optional extension dictionary.
2. Expand the immutable input snapshot and its reconstitution check. Bind the
   feature artifact, pinned B/C/readiness/reproduction metadata identities,
   semantic mapping/units/positions, actual feature profile and label-route seal.
   Record all original membership through an explicit identity-bound full route
   table plus the selected membership, not just a count. `prepare_registered`
   supplies pinned context before any target access; fixtures use their explicitly
   constructed context and retain the actual-source guard.
3. At development seal, write a strict `development-targets.json` companion with
   all required payload fields before committing the development stage. The
   stage binds its whole identity in `inputs` and its semantic identity in payload.
   Existing compact rows/aggregate can remain only with exact equality checks.
   Adequacy includes actual complete counts, the fixed 50/15 rules and closed
   status/reasons; it is not recomputed using a different population.
4. Expand rank evidence from the existing 75 compact ranks and sealed development
   artifact. Record original and complete development IDs, each exact per-record
   prediction, actual ordered neighbor IDs or fallback route, all full orders,
   route counts and a literal fixed predictor profile. These are projections of
   current objects, not new model evaluations. Threshold and arithmetic remain
   unchanged; partial/inadequate development still produces no rank artifact.
5. Add `target_profile`, actual role row count and successful full-source framing
   evidence to each vault, and validate them on every open. Construct private
   `secondary-membership.json` from the role-blind complete-ID manifest and
   literal restrictions of all 23 frozen orders for all 40 reserved source groups.
   Never filter the universe or replace empty panels. Write public-safe
   `completeness.json` with the required counts/statuses/whole-artifact identities
   and fixed scope, with no IDs, arrays of targets or reference selection. Seal
   both before calibration access; the reserved stage binds both companion files.
6. Add the declared calibration views from the original two compact plans, with
   exact cross-view equality checks and explicit fixed scope. Continue to validate
   original typed plans against the sealed representation before any evaluator
   capability or vault open. No extra evaluation or recalibration is introduced.
7. Integrate the separately reviewed stage-usage collector in wrappers only.
   Root's explicit measurement decision is stage wall/CPU observations plus
   labeled process-lifetime and boundary RSS, with within-stage peak `null` /
   `NOT_MEASURED`; do not invent a peak or claim an instantaneous ceiling. The
   unchanged supervisor remains the aggregate RSS/wall enforcement boundary.

## Identity and ordering constraints

Full companion byte/content/scientific triples belong in declared envelope
`inputs`. Scientific payload references use only the referenced scientific seal,
so usage changes cannot enter downstream scientific identities through nested
wrapper hashes. Complete-file custody still binds every original byte. Source,
metadata and feature artifacts without scientific seals retain their byte binding.
No generic recursive hash stripping is introduced.

Newly required evidence legitimately changes scientific stage identities and
therefore downstream reference-bound generic receipt identities. The comparison
against the held checkpoint must instead establish unchanged exact predictions,
threshold, neighbors/fallback choices, full and restricted orders, calibrated
numeric thresholds/pool memberships, policy observations, metric values/costs,
gates and verdicts. Separately require identical new-schema scientific digests
under changed usage and a fresh-process byte-preserving allocation reproduction.

For usage: start a collector on stage entry and finish at the pre-publication
boundary, explicitly excluding self-referential publication overhead from that
observation; aggregate worker/supervisor costs retain their own stated scope.
Allocation instrumentation must preserve the allocator's original envelope and
byte-preserving reproduction. A narrow delegated store view may inject usage
only into the original allocation commit without changing registration/source
code; reproduction must retain original allocation bytes and record the import
observation separately in the new attempt. Input preparation starts its collector
before feature validation, not after `prepare_registered` has already finished.
The exact resource placement/API remains subject to root and reviewer agreement.

## Required meanings of new profile/framing fields

`target_profile` records the pinned target parser identity/profile, authorized
columns, YS MPa / total elongation percentage-point semantics, finite full-string
point-decimal grammar and caps, fixed missing/unresolved/conflict handling,
nonnegative domain with zero allowed, and the absence of an inferred uncertainty
model or same-specimen guarantee. It contains no source token or target-derived
syntax adjustment.

`source_framing` records successful pinned-source verification and successful
complete header/row/column checks, the original source row/column counts and the
role-authorized returned bundle count. It is emitted only after the frozen
framing helper succeeds; failed framing retains a BLOCKED stage with no fabricated
successful framing receipt. Counters and membership are derived from the actual
validated routes and returned rows. It does not mean unselected target bytes
were absent from the custodian's captured mixed source buffer.

`predictor_profile` explicitly names source-balanced exact 5NN, exact normalized
composition L1, nearest-per-source selection, ordinal ties, the shared neighbor
set for both targets, processing/global lower-median fallbacks, fixed processing
categories and all 23 full-order rules. Profiles cite fixed implementation and
protocol identities rather than claim chemistry or distributional validity.

## Focused verification before a new freeze

- Delete or alter every newly required member; add an unknown key; corrupt each
  duplicate view or companion seal. Reject before dependent target access.
- Require exact full original/development/reserved membership and neighbor/order
  evidence, not merely matching counts; retain all empty secondary panels.
- Assert source-framing/profile gates before any numerical consumer and no new
  read path for calibration/evaluation labels.
- Cross-check public completeness allowlisting and counts against private typed
  evidence; reject IDs/target text and stale companion identities.
- Compare old/new exact numerical outputs on the same constructed cases while
  acknowledging the intentional new identity graph. Reproduce new scientific
  digests across resource observations and fresh processes without entropy.
- Verify stage usage has the precise observer scope and stays outside scientific
  seals. Failed phases retain known observations or explicit unavailable values.
- Re-run focused author/independent suites and then root's main-layout full gate.
  The original passing baseline and every prior failure remain preserved.
