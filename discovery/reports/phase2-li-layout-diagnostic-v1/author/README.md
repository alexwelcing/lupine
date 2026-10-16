# Li ZIP-header diagnostic candidate

Ignored candidate for root and independent review; no production execution.

The separate script preserves the captured source and original five frozen files. It classifies the original ZIP-header predicates in order and returns one categorical reason, never a member name or value. Header acceptance remains `BLOCKED_SCHEMA`; guard failure is `BLOCKED_GUARD`. Raw source reads are false before attempt, unknown (`null`) if an attempt fails before completion, and true once completed. No decompression, XML, worksheet or shared-string access exists in this diagnostic.

Author synthetic tests: first 12 passed; root review added explicit unknown partial-read exposure and a regression, then 13 passed. The original log is retained. Tests include unchanged legacy-reason comparison, invalid opaque payloads, central/local flags and extras, ordering, canary nondisclosure, fixed-input CLI, capture rejection before object access and an uncommitted production guard. No tests used the real archive or private capture receipt. Independent review and exact-commit CI remain pending at this handoff.

Promotion candidates are the script, author test and contract under `promotion/`. The fourth frozen path is `tests/test_li_v3_zip_diagnostic_review.py`, owned by the independent reviewer. Root must integrate all four, publish and verify CI before running either closed production slot. Existing user research authorization is sufficient; these are source-validation gates.

See `candidate-receipt.json` for exact files and evidence. No tracked files or historical capture/envelope receipts were modified.
