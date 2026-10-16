# JARVIS source-format compatibility amendment 1

Recorded 2026-10-10 after the original strict import stopped and before any
prediction freeze, evaluation replay, or benchmark metric was produced.
This is an additive amendment to the unchanged
`constrained-benchmark-protocol.md` and `constrained-source-audit.md`, frozen
in commit `b5d432d1e7123ae8c33d48bbef2e04c44de7b37c`.

## Observed blocker and retained original attempt

The acquired archive matched the preregistered filename, byte count and MD5.
Its ZIP SHA-256 is
`d4c64660e9e1fa45c82bd8868a96ec10162195eed69636445972c05550d8d0d6`.
The JSON member has 208,929,736 bytes and SHA-256
`72da38713e509195220771b83b07cbd2d21f5d0d5cc203e1067dd597465b0b35`.

The strict JSON reader stopped on a bare nonfinite numeric token before the
metadata and representative-selection pass completed. A subsequent diagnostic
reported only source position and field path: the first such tokens occur in
zero-based record index 1307, under `elastic_tensor` nested array entries.
This is an auxiliary field forbidden to the predictor. No target values,
prediction results, or evaluation metrics informed this amendment.

The original attempt remains **BLOCKED: source-format rejection**. Keep its
source receipts and a blocked-result artifact. Do not relabel it successful,
overwrite its receipts, or rewrite the original source audit. The compatible
attempt uses separate run artifacts and identifies this amendment explicitly.

## Narrow permitted change

Only the raw upstream archive decoder may accept the nonstandard bare tokens
`NaN`, `Infinity`, and `-Infinity`. Decode each to a distinct typed invalid-value
sentinel, preserving the fact that it is not a finite observation. Never
convert it to zero, a large bound, a finite float, or a model feature.

- The metadata allowlist stays exactly `jid`, `atoms.elements`, and audit-only
  original row index. A sentinel cannot become a valid ID or element symbol.
- Representative selection still precedes either selected target's value or
  missingness. A representative is never replaced because of a missing or
  invalid target.
- If a selected target is a sentinel, record that representative as unresolved
  with reason `invalid_nonfinite`. It is excluded only from the joint-complete
  evaluation population, exactly as other invalid target observations are.
  Preserve its ID and reason. Never label it feasible or infeasible.
- Forbidden auxiliary fields remain unavailable to prediction, calibration,
  selection, or policy code. Their nonfinite values cannot affect the model.
- Reject every other malformed JSON number or syntax, duplicate object key,
  duplicate JARVIS ID, source identity mismatch, or schema substitution as
  before. Generated metadata, labels, predictions, seals, and reports continue
  to use strict finite JSON; the compatibility rule does not apply to them.

Keep the original strict decoder available. The compatible path must be
explicitly selected and bind the amendment's committed identity and SHA-256
into its source, freeze, and replay receipts. Commit and push this document
before resuming the raw-source pass under that path.

## Scientific invariants and interpretation

There is no change to the two target fields, constraint threshold, sign
normalization, composition grouping, hash prefix, representative tie rules,
oxygen-family split, caps, panel size, predictor, exact neighbor ordering,
calibration allocation, measurement budgets, policies, metrics, or acceptance
criteria. Tests must cover strict rejection, invalid sentinels, unchanged
finite-decimal decoding, representative-before-completeness ordering, and
continued target separation.

Report the failed strict attempt and the compatible attempt together. The
amendment responds to source syntax in a forbidden auxiliary field; it is not
an accuracy improvement or a new empirical result. The source is public and
the custodian has parsed records, so neither attempt constitutes an independent
prospective blind experiment. Future claims retain the original conditional
sampling and physical limitations.
