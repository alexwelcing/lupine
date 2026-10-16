# Implementation contract sections 6–9: consolidated source review

Scope: source inspection of the prospective scratch producer, frozen exact
kernel, and frozen public projector. No archive, actual features, allocation,
or labels were opened. This is an implementation requirement audit, not a new
scientific execution or proof of physical validity. The inspected producer is
still being repaired; final source-bound execution checks remain pending.

## Remaining concrete corrections

1. **Section 7, generic outcome references.** The archive driver's static third
   `REFERENCES` string describes co-recording/uncertainty, but does not bind source
   columns, the parser, or the particular private calibration vault. The shared
   flow passes it unchanged into the generic `PanelOutcomes.source_reference`.
   Outer custody seals contain that information, but the contract explicitly
   requires the outcome reference itself to bind it. Supply a source-bound
   reference after reserved custody seals: source SHA, columns/units, parser SHA,
   rank-freeze scientific SHA, and calibration-vault scientific SHA. Explicitly
   label that vault as the calibration evidence; future truth remains bound to
   the separate evaluation vault. Full byte/content hashes of resource-bearing
   envelopes must not enter generic scientific references. Objective/constraint
   references should likewise carry the exact source/column and threshold-freeze
   semantic binding already specified by this section.
2. **Section 7, full computed decision records.** Current compact decisions retain
   only decision/panel/calibration digests, retained IDs, calibration status and
   reasons. All original protocol/calibration/panel records are available in the
   same private plan, so reconstruction is possible, but the remaining computed
   fields are not explicitly persisted in the required decision view. Preserve
   every scalar/tuple `PoolDecision` field and link its original calibration and
   panel to named shared tables. That includes m, original IDs, premise status,
   threshold, guarantee status/text, assumptions and physical attestation. Obtain
   them directly from the existing typed decisions rather than reimplement their
   arithmetic. Shared originals avoid recursive repetition while preserving full
   reconstructibility. Validate the complete view before evaluator access.
3. **Section 9, exact error preservation.** The frozen `StudyError` carries its
   closed code in its single argument, not `.code`. A wrapper that only reads
   `.code` turns actual `ARITHMETIC_LIMIT` into `INTERNAL_FAILURE`, contrary to
   section 6 and the closed vocabulary. The other reviewer has independently
   reported this correction. Whitelist the exact trusted exception type and its
   single known enum argument; never publish generic exception text.
4. **Section 3/6 public rank freeze.** Final complete public reports have fallback
   counts, but an early stop after rank had no distinct aggregate freeze receipt.
   Root has approved a closed public rank-summary companion. The draft provides
   counts/whole rank scientific seal and no predictions, IDs, threshold or targets.
   It must be bound and revalidated with the private rank evidence, including
   publication of a later unavailable result. This resolves the explicit stage
   handoff without exposing private rows or changing the frozen final projector.

## Reviewed obligations without another identified numerical gap

- **Section 6 feature custody:** `prepare_registered` verifies manifest-pinned
  readiness/reproduction records, captures the local artifact once, invokes its
  frozen validator, checks exact bytes/content, and converts only the selected
  original features. The required profile, metadata identity joins, source links,
  118 axes, and null whole-vector semantics are explicit. Overlap reports keep
  source-token, exact formula-token, normalized composition and combined
  descriptor equality separate; unknown descriptors are not grouped together.
  No overlap changes the allocation.
- **Section 6 predictor:** the kernel uses both-target-complete development rows,
  checks 50 rows/15 groups before medians, uses the stated lower median, exact L1,
  one representative per source and numeric ordinal ties, then at most five
  shared neighbors. Unknown/no-known-composition and category/global processing
  fallback routes are explicit. Derived operations use the stated bounded exact
  arithmetic. No refit, uncertainty radius or reserved numeric labels enters
  the predictor.
- **Section 7 population/calibration:** the all-40 completeness gate, unsupported
  primary fallback, literal secondary restrictions (including empty panels),
  20 calibration panels, alpha 1/10, rank 19, arbitrary within-panel dependence,
  exact objective/constraint transforms and single-panel marginal wording match
  the contract. Feature manifests transitively bind the rank-freeze scientific
  artifact, which binds the exact feature/input evidence. Full original generic
  protocols/calibration assessments and ranked panels already remain private.
- **Section 8 replay:** all 960 fixed schedules exist, capabilities bind policy,
  panel, decision and original next ID, and the reveal appends its charged row
  before returning target states. Repeated/foreign/out-of-order requests reject.
  Full truth reaches the aggregate auditor only after replay completion. The
  implementation is an ordinary in-process capability boundary, not a sandbox
  against hostile Python, as disclosed.
- **Section 8 metrics:** all requested caps and same-actual-K comparisons remain
  separate, complete infeasible/empty panels retain vacuous all-minimizer truth
  outside discovery denominators, unknown panels retain null complete metrics,
  and zero-size fractions remain null. Exact F/D, recall, pool-size and cap-four
  gates match the declared inequalities, including strict processing/objective
  comparisons and unavailable components when denominators are empty. The public
  projector exposes all controls, exact margins/reasons, assigned and feasible
  panel denominators, candidate totals, unknown/empty/infeasible counts, and
  fallback counts without claiming superiority from partial execution.
- **Section 9 scope:** generic statuses/reasons remain unpromoted; completed NO_GO
  may contain passing components, while blocked/incomplete states have no
  performance verdict. Fixed source-bound explanation strings and closed reason
  enums remain separate from arbitrary exceptions.

The two publication joins from the earlier focused review—reopening companion
evidence before publication and matching supplied public metadata to input-freeze
metadata—are being repaired by the same owner. No other mismatch was identified
in this bounded sections 6–9 pass. This is not a blanket approval of unexecuted
production behavior or of sections assigned to other reviewers.
