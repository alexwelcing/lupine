# Fixed-archive inference and future-material inference are different targets

2026-10-16. Root design clarification only. No protocol, source admission,
threshold, frame, model, allocation, query schedule, fit or outcome read is
introduced. Existing scientific NO-GO results and G20/G21 gates remain intact.
This note uses the already published finite-frame planning and confidence-
inversion arguments. It does not implement the deferred inversion feature.

A lack of independent experimental specimens blocks an independence claim.
It does not, by itself, make every probability statement about a fixed archive
impossible. Conversely, a valid sampling calculation on archived rows does not
repair uncertain measurement truth, duplicated provenance or future transfer.
The unit and target must be explicit before choosing the inference law.

| Target | Required premise | What the result would concern |
| --- | --- | --- |
| Deterministic replay on a completely specified recorded archive | A validated immutable frame, correctly interpreted recorded outcomes and a fixed algorithm | The actual recorded entries and their declared weights; no sampling extrapolation |
| Uniform finite-frame audit of a fixed policy | A fixed M-unit frame, fixed binary error indicators, a uniform sample without replacement of fixed size e, and correct audited error labels | The number or fraction of errors in that exact frame, under the declared sampling randomization |
| A new specimen, campaign or future material | A justified relation between observed and future units, model and uncertainty premises, plus the stated sampling/coverage law | Only that declared future target and population; finite-frame arithmetic alone is insufficient |

For the second row, conditional on the entire frame and already fixed policy,
take integers M >= 1 and 0 <= e <= M, and write b_i in {0,1} for the
policy's error on unit i and K=sum_i b_i, so 0 <= K <= M. If S is
uniform over all e-element subsets of {1,...,M}, then

    P(sum_{i in S} b_i = k) = C(K,k) C(M-K,e-k) / C(M,e),

with impossible binomial terms zero. Exactly C(K,k) subsets select k errors,
and C(M-K,e-k) choices select the remaining nonerrors. This counting law needs
no stochastic independence among the b_i: here they are fixed. It does need
the specified sampling mechanism and fixed sample size. The probability law
is conditional on the frozen frame/training/policy information, not additionally
on the realized sample or audit transcript. Optional stopping,
error-driven selection, or updating the policy from audit labels is a different
experiment; earlier counterexamples and restrictions still apply.

A frame may contain records from a shared experiment or even repeated recorded
outcomes. Uniform sampling of its indexed entries still has the stated finite
counting law. Its estimand then weights those entries as represented. This
neither makes them independent physical replicates nor estimates a de-duplicated
experiment population. An unverified many-to-one source join must remain
unresolved; do not infer a valid physical sample size from archive row counts.

Likewise, an equal budget of recorded-row revelations is an artificial archive
oracle cost, not automatically an equal laboratory measurement cost. Reused
measurements, shared inputs, and grouped acquisition costs need an evidenced
cost model before physical-efficiency claims. No equal-budget criterion from
an existing experiment is replaced or weakened by this distinction.

This gives a decision boundary for G20 rather than a shortcut around it. A
future strictly finite-archive proposal could explicitly state that independent
physical units are unestablished and restrict its target to validated recorded
entries. It would still need a complete source-bound frame, row/panel semantics,
endpoint pairing, units, missing/censoring rules, exposure/overlap accounting,
source provenance and a declared cost/weighting convention. Unknown physical
lineage must remain a reported limitation. A report must distinguish this
narrow inference target from a source/family holdout or future-material test.

The frame and policy must be fixed before the audit's outcomes are inspected.
If training precedes that audit, the audit rule must remain valid conditional
on the realized training information; the audit selection cannot adapt to its
unseen error labels. The archive's membership, candidate/panel construction,
error definition and claim scope must not be picked after seeing audit results.
Partial or missing outcomes cannot be silently treated as nonerrors, removed
post hoc, or supplied by model predictions to manufacture known answers.

Recorded measurements also differ from latent physical quantities. A fixed
archive calculation can use the publisher's documented recorded endpoints as
its explicit labels; it does not prove their metrological accuracy. To make a
claim about latent quantities or future measurements, the missing measurement-
to-decision risk bridge in the separately reviewed metrology contract remains
necessary. This note does not choose between those targets or grant source
admission to Li, BAM, or any exposed benchmark.

At this checkpoint Li schema, complete frame, pairing and grouping remain
unestablished. BAM's three paired documentary records are permanently exposed
and excluded from a fresh blind predictive benchmark. Finite inference does
not undo exposure, create useful variation, justify a predictor, or establish
superiority. G21 remains blocked pending a separately justified and frozen
proposal; the existing requirements and scientific negatives stay unchanged.
