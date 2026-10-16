# Completed historical counter correction

The narrow correction at `a3370ac8…` passes independent source review and five
focused generated methods. The [review](counter-review.json) binds exact sources
and actual receipts. Final production approval still awaits the published baseline
rebind and root's release gates.

The original `540088bc…` implementation passed 50 behavior methods but a subsequent
source review found contradictory completed historical ledgers were accepted.
The [first focused regression](counter-before-fix-first/execution.json) recorded
16 failures, including a mismatched prior reaching the record opener. Its final
inline-only assertion stopped before shared-string variants. These genuine
pre-fix failures are preserved alongside the earlier six reviewer-fixture failures;
they are different findings.

The fix retains the old exact-integer and paired started/completed checks. For
completed A receipts, opens, decompressions, UTF-8 decodes and XML parses agree
and are at least six. For completed B, opens equal decompressions and are at
least six plus one if shared strings are used; decodes equal parses and are two
more than opens. Same-source A/B totals differ only by that possible shared-string
open. Checks apply to completed priors, not failures or full C counters. These
are necessary consistency conditions, not proof of historical execution.

The [corrected focused run](counter-fixed-first/execution.json) passed five methods
in 6.184 seconds unittest / 8.944669299 seconds process time with zero guard
violations and all 339 runtime files held. It completed all 33 variants in the new
regression plus four existing positive B/shared-string/C/outer-prior methods.
The [portable file](test_li_v3_readiness_production_review_final.py) contains 51
methods, with the complete original 50-method file as its unchanged prefix; all
51 have not been rerun together on this corrected source. Root integration owns
that complete run. No actual archive or private object was accessed.

The [exact source-delta audit](counter-delta-audit.json) confirms that only two
reviewed helpers and four inserted checks changed the AST. Parser/frame helpers,
bounds, pure core, fixed G34 prerequisite and scientific limits remain intact.
The earlier returned/stdout/persisted cleanup requirement remains mandatory.

This addendum supplements the immutable original [handoff](handoff.json). Copy
only its explicit inventory entries; all four new `.log` files must be preserved
and verified in Git. Later baseline-rebind evidence will be separate.
