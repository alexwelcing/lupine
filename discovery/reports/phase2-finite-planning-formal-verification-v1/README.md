# Finite-population planning — formal verification

`LupineFinitePlanning` adds 13 conditional finite-count statements for arbitrary
finite populations. The held source is SHA256
`391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd`.
The original 130 statements and their historical audit remain separately bound.

Root completed the integrated verification successfully:

| Actual root command | Recorded result |
| --- | --- |
| `lake --wfail build` | All 11 modules built, exit 0 |
| Fresh `audit_axioms.py` | 143 statements across 11 modules, exit 0 |
| `unittest test_audit_axioms -v` | All 11 parser tests passed, exit 0 |

The command receipts hold the formal source/dependency/parser inputs and all 345
runtime files unchanged during each run. The ten prior module entries exactly
match the original 130-statement inventory; its original inventory and axiom
output survive byte-for-byte in the prepared history snapshots. The fresh audit
contains only the permitted standard logical axioms (`propext`,
`Classical.choice`, `Quot.sound`) and no admitted proof or new project axiom.
No Python runtime change is part of this formal increment.

For a fixed population `P`, a fixed failure subset `F ⊆ P`, and a fixed sample
size `e`, the no-failure samples are exactly the `e`-element subsets of `P \ F`.
Their favorable/total count ratio is `choose(M-K,e) / choose(M,e)`, with positive
denominator when `e ≤ M`. The proofs cover antitonicity in failure count,
attainment of the composite-null maximum at its minimum failure count, the exact
ceiling bridge from a fraction null, zero/equality boundaries, zero evaluation,
and census resolution. They quantify over arbitrary finite counts, beyond the
runtime's population cap of 256.

The probability reading requires uniform fixed-size sampling from a complete
fixed labeled frame, frozen policy and endpoint labels, and no outcome-dependent
removal or stopping. The module proves the rational counting statements; it does
not construct or authenticate an actual sampling mechanism. Fixed correlated
labels need no IID assumption for these finite counts. Distinct labels do not
prove physical independence, correct measurements, or future-population transfer.
The totalized rational definition outside the sampling domain has no asserted
probability interpretation.

No Python/Lean refinement, parser or `math.comb` correctness, minimum-count search
loop correctness, resource/input-cap verification, or monotonicity in evaluation
sample size is proved by this increment. The census result is conditional on the
fixed finite-frame null; it is not observed zero physical risk. Scientific
adequacy, calibration, useful reduction and superiority remain separate. G20/G21
status and existing negative scientific results are unchanged.

`candidate/` preserves the original ten-statement and final thirteen-statement
author compilations, source snapshots and axiom outputs. Both author invocations
passed. `independent-review/` preserves a separate successful final-source
compilation and the mathematical scope review. `integration-preparation/`
contains the exact reviewed six-path copyset, baseline and historical130 audit
snapshots. Earlier “not integrated” or “no independent review” statements remain
historical checkpoints; the later review and root result supply those later facts.

`root-execution/` contains all three completed command receipts and logs, the
source-bound root recorder, start/final records, and the fresh textual theorem
inventory and axiom output. Root confirmed completion at PTY 44006, exit 0,
chunk `6d3e1a` before capture. All three commands in the retained first root
invocation passed. Parser-test diagnostics are correctly
retained in stderr despite a successful exit. Receipt `process_seconds` values
include recorder bookkeeping; exact subprocess intervals remain available from
the recorded start/finish timestamps. This report does not call those different
measurements interchangeable.

Two preparation documents retain links written for their original `formal/`
location. Publishing those bytes as standalone Markdown broke five local links.
The [integration fragment](integration-preparation/finite-planning-section.md.utf8.json)
and [prepared formal README](integration-preparation/promotion/formal/README.md.utf8.json)
therefore use the same reversible UTF-8 transport as the logs. Their complete
original bytes and identities are preserved; no source link, theorem, command
result or original preparation inventory has been rewritten. This is a
publication-representation correction after the first finalizer's link check
failed, not a new verification run.

`assembly-map.json` binds every selected original to its publication destination.
Whitespace-sensitive logs and diffs use reversible UTF-8 JSON wrappers: encode
`text` as UTF-8 and verify the recorded original length and SHA256. No compiled
binary object is published; object hashes in the original receipts remain intact.
No Lean build, axiom audit, test, network request, scientific reader or operation
was rerun by the publication assembler. These proofs and verification records
grant no benchmark, release, source-operation or scientific-admission approval.
