# Independent generated growth-envelope review

The first independent invocation passed **24 focused test methods** on
2026-10-16: unittest 2.000 s, recorded process 2.616256202 s. Source, contract,
test, G30 predecessor and guarded runner stayed byte-identical across execution.
No independent retry or broader suite ran. Stdout is empty; stderr contains the
ordinary success log, with no private canary or unraisable cleanup output.

- G31 source: `f50069d028526ea045441a2e574a26192a210ff78ba34f5170777d32f5692ec3`.
- Independent test: `4e23e7582dc1da3b0a51507eab4181a39707f0d9057506f25eba61d72ce73ccb`.
- Contract: `4a5954b93b84d05c32a8ee2ea8254aec63283e915c331339cb97875e4b2aeb59`.
- G30 predecessor: `1a2bd6443bfe090ab3264b82b60f105cfad16f40182b716f032fd773a2e8354a`.

See [execution](first-run/execution.json), [original stderr](first-run/stderr.txt),
[scope observation](first-run/scope-observation.json), and [review](review.json).
The first-run directory retains the exact source, test, contract and predecessor
used. `preparation.json` and `before-central-length-probes/` are explicitly
unexecuted preparation history. The final test had one EOF newline before its
first execution.

The suite is independently authored by `/root/phase2_planner/ui_review`. It uses
this reviewer's earlier packed ZIP helper and independently constructed minimal
envelope XML derived from the unchanged helper grammar. No author fixture or
test was read or imported. The known generated workbook declares the two
documentary roles in reverse ordinal order, with distinct relationship IDs,
and the test checks the exact expected projection.

The bounded checks cover:

- Valid first extras followed by unknown, duplicate, mixed, truncated,
  wrong-signature or nonzero-padding extras at second, middle and last entries;
  retained progress after an earlier area passed and a later area failed.
- Empty current padding, the 65,535-byte local span, unsigned initial-word
  boundaries, all-entry applicability and ordinary zero-extra entries.
- Retained local and central mismatch groups, size extent, filename/member-kind,
  count 128/129, EOCD, offset/contiguity, required-member and method/flag rules.
- Eighteen raw central name/extra/comment declared-length overruns at second and
  last entries. Direct new-profile traversal rejects each with
  `CENTRAL_DIRECTORY_DECLARATION_INVALID` before its archive opens. The public
  fixture route also rejects without new-profile XML exposure.
- Exactly the four permitted member reads; unchanged role/type/relationship/XML
  rejection; malformed XML at each position and a CRC failure with exact partial
  decompression/decoding lists; opaque worksheet/shared-string invariance.
- Open/infolist faults, close on header/XML/success paths, and explicit close
  faults that stay armed by object identity through reference release and GC.
  Failed close retains prior reason and exposure, clears envelope approval, and
  emits no exception canary or destructor warning.
- Fully mocked prerequisite/source/slot/read/write/descriptor-close paths,
  same-buffer fixed A220/516 production applicability, sequential occupied-slot
  rejection, four-file commit/index/HEAD checks and detached source maps.

Invariance comparisons exclude the existing `observed` whole-buffer identity:
changing opaque bytes or the withheld initial word changes that identity, while
the remaining public projection stays the same in these generated cases.

The raw central preflight is an explicit approved scope addition. The author
found an inherited negative before independent execution: a final declared
comment byte could be absent while parsed empty fields made the old reconstructed
size check pass. [The retained addendum](context/scope-addendum-central-declarations.json)
records the author's first 27-pass/1-failure run and authorization; those author
execution artifacts remain in the author's bundle. This independent lane did
not execute the old defective candidate. It preserved its unexecuted earlier
test, then added strict overrun probes before its own first run. No malformed
layout expectation was relaxed.

The preflight precedes only the new G31 archive opening. The required earlier
selected G29/G30 check can already have decoded ZIP metadata, and its separate
nested lifecycle is retained. The tests distinguish these lifecycles rather
than claiming the entire operation is free of earlier exposure.

All production dependencies are mocked before invoking the current wrapper or
context. Default rejecting mocks catch missing injections. A profile hook blocks
real predecessor guards/readers; an audit hook blocks private custody paths,
process creation and networking. Both forbidden-event lists are empty. No actual
receipt, capture, object, workbook payload, source operation or real guard chain
was read or invoked. Generated member reads use in-memory stdlib buffers.
Mocked identities and prerequisite success are control-flow fixtures, not an
actual custody or receipt-applicability event.

Write and output-descriptor-close failure can occur after completed XML exposure.
The suite checks retained exposure with envelope acceptance false. A file written
before a later descriptor-close error may contain the earlier accepted profile
projection while returned stdout is a guard failure; both states are checked.
Sequential slot checks do not establish concurrency locking or at-most-once reads.

This is bounded software evidence. It does not prove general ZIP/OPC completeness,
producer authenticity, production readiness, scientific validity or physical
performance. The profile can accept generated envelopes while all scientific
states remain blocked, counts of scientific rows/pairs/groups/overlap stay unknown,
and initial-padding semantics stay unbound. Actual source acceptance is unknown.

To repeat this exact ignored-candidate run, retain the held paths and use
`python -B .cache/phase2-growth-envelope-review-v1/independent/run_review.py new-run`
from `discovery/`, choosing an unused run name. The runner enforces the frozen
hashes and captures a guarded subprocess. After promotion, the test prefers the
tracked scripts and can run as
`python -B tests/test_li_v3_growth_envelope_review.py -v`.
No promoted-tree, CI or second-run success is claimed here.
