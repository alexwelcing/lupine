# Narrow correction source review

The correction at adapter
`a3370ac84762ef7f859061bde93f118a1c1981b02460e9ddd0b1cd38e55b840b`
implements the root-accepted predicates in `DERIVATION.md`. No remaining
source blocker was found in this narrow change.

The diff adds exactly two private helpers and four call sites. Removing only
those additions leaves an AST identical to preserved adapter `540088bc…`; the
independently reconstructed byte diff also matches the author's retained diff.
No parser, bound, output shape, source operation, or scientific criterion changes.

The completed-A helper is called after the original exact-int, range,
started/completed and successful-history checks. The completed-B helper follows
those checks and the validated inventory/SST ledger. Thus equality comparisons
cannot admit bool/int substitutions. Both prior results are individually
validated before the pair predicate runs: in outer frame-material validation
before source-buffer access, and in the internal frame seam after header replay
but before package/XML processing. Failure-prefix and full-C totals are not
subjected to the A/B formulas.

The contract snapshot `87d3bc80…` states the counter scope and necessary-only
meaning accurately. These checks reject impossible histories; they do not
recompute every historical count, authenticate arbitrary resealed receipts, or
replace fixed source/prior identities and external cleanup acceptance.

The original 540 behavior checkpoint, source review, and test results remain
unchanged. The planner's first focused counter regression and the author's later
60-method run are separate execution evidence, not executions by this reviewer.
This review used source hashing, text diffs and AST inspection only. No adapter,
test, production guard, archive, private input or network operation was used.
Final independent confirmation and later baseline rebinding remain separate.
