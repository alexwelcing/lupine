# Retrospective evaluation protocol

`replay.evaluate(predictions, outcomes)` runs the pure selector with predictions
alone, then opens a separately supplied hidden-outcome table. The selector never
receives outcomes. Predictions and truth use exact `Fraction` arithmetic.

Freeze candidate identities, constraint definitions, score direction, provenance,
interval construction, tolerances and exclusion rules before opening outcomes.
Record the complete candidate universe, including failures and untested candidates.
Missing scores or constraints remain unknown; untested candidates are never counted
as failed materials. Coverage denominators include only observed values and are
reported explicitly, with per-candidate checks and incomplete candidate IDs.

Report score and constraint coverage, interval counterexamples, retained fraction,
certified-infeasibility correctness, all-optima retention (including ties), incumbent
feasibility and regret. True optimum and regret require complete outcomes for the
entire finite universe. With partial outcomes, an observed best is descriptive and
is not asserted to be the true best. When no true feasible candidate exists,
optimum retention and regret are inapplicable. Empty-universe pool fraction is
undefined. Exclusion of a true optimum is recorded even when unsound intervals
cause it; empirical counterexamples never disappear behind a formal implication.

The mathematical certificate remains conditional on sound intervals. Complete
archive coverage supports those intervals on that finite archive; it establishes
neither physical generalization, a global Lipschitz bound, complete enumeration of
materials, nor industrial qualification. Runtime conformance is separate from
formal refinement and scientific evidence.

For generalization studies, group shared experiments, specimens, campaign revisions,
and near-duplicate material records before splitting. Hold out material families,
laboratories and later evidence where appropriate. Audit checkpoint-development
membership and reference compatibility. Temporal splits alone cannot rule out LLM
pretraining exposure or shared MLIP training data. Published experimental truth
must retain processing, environment, measurement uncertainty, units and provenance;
historical computed references must not be relabeled experimental ground truth.

Any sequential archival reveal protocol must precommit predictions and candidate
query policies. Update an anchor only after that candidate is actually revealed;
never fit interval widths, smoothness constants, thresholds or candidate pools to
hidden target outcomes. Compare random sampling and nominal-score ranking at equal
revealed-outcome budgets, across recorded seeds, using feasible-best discovery and
regret with ties handled explicitly. This evaluator implements static replay;
sequential policies and those comparisons are future work, not reported results.
