# Retained package transport audit repair

The actual clean package built from 478208f passed 28 cases and six schemas,
including the two new optional MPEA transport checks. The published retained
artifact auditor then failed with `probe check flags differ`: it still required
the old ten-flag list. That failed audit and the successful package execution are
separate, preserved observations.

The correction requires all 12 flags and a closed three-string optional transport
claim. It joins resource presence and nonempty JavaScript to verified wheel bytes
after the existing RECORD checks. Eleven existing and 12 new tests pass, including
fully resealed conflicting artifacts; five independent controls pass. The corrected
candidate also audits the original retained 478208f bundle successfully.

[The exact copy ledger](copy-ledger.json) preserves original failures, candidate
sources, tests and execution receipts. A byte audit does not reexecute HTTP or
validate scientific report semantics. The optional actual MPEA resource remains
absent. New-source full integration, installed package execution and CI remain
required before registration.
