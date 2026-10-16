# Independent prospective MPEA T25 mathematical/design review

Result: **no mathematical/design blocker found** in the two author-confirmed
stable drafts. This is a read-only review of the proposed experiment and exact
synthetic arithmetic, not authorization to execute it or proof of implementation.

Reviewed identities:

- `mpea-t25-archival-protocol-v1.md`: `989f79359af45a9bcc698400d1ddee410677933a8360c0c71a30e9bc2dba8eb4`
- `mpea-t25-implementation-contract-v1.md`: `2113d0e45799fb0117f22dbd80188e17d92f0e63c9857ba7a693e7f4ade99f10`

`review.py`, `execution.log`, and `review-receipt.json` preserve a fresh,
reconstructible source-bound check. The script reads only these drafts and
published formal source/receipts. It does not read scientific data, invoke entropy,
allocate groups, extract features, interpret targets, fit, or compile Lean.
The published Lean receipt is bound as existing evidence; this review does not
claim a new compile or a new theorem instantiating the archival protocol.

## Finite-law bridge and limits

The development 35 groups and ranker/threshold rule are fixed independently of
the random reserved split. Conditional on that fit and the external independent
uniform-byte assumption, successful capped rejection sampling gives a uniform
permutation of the remaining fixed 40 groups. Conditioning on sampler success
preserves uniformity of its accepted index; neither transcript checks nor the
production `os.urandom` route attest that external entropy premise.

For any evaluation position designated without looking at scores, the 20
calibration groups plus that position are a sample of 21 distinct groups under
uniform assignment. Their ordered score vector has finite support closed under
coordinate permutations, with invariant atom weights: permuting those 21
positions bijects underlying 40-group permutations. When equal scores collapse
multiple permutations onto the same vector, its mass is the sum of their masses;
one must not silently assume distinct score vectors themselves have uniform
weights. The compiled finite weighted exchangeability theorem permits those
nonuniform atom weights. No study independence or IID panel sampling is required
for this fixed-archive conditional permutation argument.

With N=21 and alpha=1/10, `ceil(N*(1-alpha))=19`, below 21 and within the 20
leave-one-out calibration values. Failure is strict score greater than the
19th ascending calibration score, bounded by `(21-19)/21 = 2/21 <= 1/10`.
Score ties are conservative. A weak prefix has length `floor(tau*m)` and
retains rank r exactly when `r/m <= tau` for positive m. All tied feasible
optima are covered by the maximum normalized rank score, not by one chosen
optimum. Empty/infeasible complete panels have score zero; empty prefix alone
never proves infeasibility. Two calibration scores of one force tau one.

This is a single-designated-future-panel marginal statement. It is not coverage
conditional on realized calibration, feasible panels, complete-case membership,
material families, the empirical F/D gate subsets, or useful recovery. It is
not simultaneous success over 20 evaluation panels or both populations. Shared
calibration and hash controls are not independent scientific replicates. The
drafts explicitly preserve these limits and use assumed-unverified status.

## Population definition, freezing, and target timing

The primary panels preserve every condition-eligible record. The all-40
role-blind completeness assessment checks the whole fixed reserved population
after full ranks freeze. One undefined evaluation endpoint forces unsupported
primary calibration even if all 20 realized calibration panels are complete.
This avoids substituting a calibration-selected defined score population.
The all-40 condition is a fixed population property, invariant under reserved
role reassignment, not evidence of actual source accuracy.

The secondary panel for each source is the predeclared complete-record subset,
retaining all source assignments and empty panels. Restricting frozen orders
produces a fixed score for each group even when the panel is empty. This selection
may depend on performance/reporting; the claim is confined to that selected
archive population and does not restore coverage of excluded primary records.
Unknown feature vectors do not change membership.

Development-only labels fix the lower-median elongation threshold and predictions.
Feature overlap inspection cannot change scope/allocation/model; full orders
freeze before reserved decoding. The custodian may parse all reserved endpoints
for role-blind completeness and membership, but the calibrator receives no
evaluation numeric vault. All future pool decisions and policy schedules seal
before evaluator reveals; complete truth audit follows all scheduled runs.
Existing mixed-byte custody is disclosed. These are process capabilities to be
implemented and tested, not cryptographic protection against a malicious operator.
Source-token holdout is not chemical-component holdout or independent studies.

The endpoint is recorded YS maximization subject to recorded total elongation
at least the frozen threshold. Equality is feasible; exact YS ties define all
optima. Plastic elongation is not substituted. No pairing, uncertainty, yield
convention, physical truth, or unseen historical-paper guarantee follows.

## Metrics and denominators

The 20 assigned evaluation panels per population and the original record funnel
are preserved. Empty/infeasible complete panels have vacuous all-optima retention
but any-optimum discovery zero; their best/regret are inapplicable. Incomplete
primary truth gives UNKNOWN metrics, not invented recall or success. No feasible
reveal means regret undefined. Empty panel K/m is null, not zero.

F is the feasible secondary evaluation subset; D further requires size at least
two. Adequacy `|D|>=10` excludes empty denominator passes. Recall gate
`10*sum_F retained >= 9*|F|` and size gate
`4*sum_F (K/m) <= 3*|F|` are exact source-panel macro quantities. At cap four,
`20*A-R >= 2*|D|` is exactly a 1/10 hit-rate margin over the mean of 20 hash
controls, with `A>P` and `A>O` strict. These retrospective empirical gates do not
claim a feasible-panel conditional coverage guarantee. Candidate totals remain
separate. Stopped/full primary policies are identical through K and provide no
equal-spend ranking advantage; full-order comparisons assess ranking separately.

The checker verifies exact rank arithmetic, synthetic strict leave-one-out tie
counts, weak-prefix floor equivalence, score-one quantile endpoints, and gate
cross-multiplication. These finite synthetic checks support transcription and
boundary review; they neither prove the universal Lean statements nor validate
physical/sample-generation premises or the future study worker.

## Final clarification rebind

The original receipt and arithmetic log remain unchanged historical evidence.
The author then clarified row-local target statuses versus stage-level stops,
and explicitly made empty-F/D component metrics unavailable with false
required-to-proceed checks rather than vacuous cross-product passes.
`rebind.py` reconstructs both original documents, verifies their exact historical
hashes, and preserves the exact clarification diff. Its fresh execution is in
`clarification-execution.log`; final signoff is `clarification-receipt.json`.

Final reviewed protocol SHA-256:
`c49047341d3932ddd67c67c9f2a04a6759c0d679bfeb96d811ba9541c0cc0378`.
Final reviewed contract SHA-256:
`be45b1d8db9586035cf37bd9bbb9046c065c3851b91f93386f8c68d155215af9`.

No mathematical blocker arose. No nonempty formula, population, allocation,
rank, alpha, stage timing, or statistical scope changed. Invalid row-local
endpoints retain primary records and fixed role-blind secondary selection;
empty empirical gate subsets cannot yield success. The unchanged arithmetic
checks were not rerun. `review.py` remains the original source-bound historical
checker and deliberately rejects the clarified drafts; `rebind.py` is the
current bounded-diff checker. Original drafts reconstructed against exact old
hashes are retained as `reviewed-original-*.md`.
