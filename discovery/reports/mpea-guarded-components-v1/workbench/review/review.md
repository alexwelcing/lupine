# Independent MPEA workbench review

Scope: read-only review of the optional report loader, renderer and workbench
integration, with constructed aggregate reports only. No real source archive,
feature table, allocation or performance targets were opened. Main files were
not edited by this reviewer.

## Findings addressed by the author

The original renderer omitted `report.access` entirely. Consequently, an early
stop could show unavailable resource usage without showing its already recorded
mixed-source capture and development target interpretation. The insufficient
development control contains one capture, 1000 captured bytes and 49 interpreted
development bundles. Root added the closed `#mpea-access` details block for both
completed and unavailable reports. The final browser run checks these values.

The comparison subset was labeled "Panels with an observed feasible record".
Its actual kernel definition requires complete truth and at least one feasible
record. Root changed the option to "Truth-complete panels with a feasible record".
This wording matters because a partially labeled panel can contain a known
feasible record while remaining excluded from this comparison subset.

The third independent attempt found a real narrow-layout defect after the exact
policy, routing, export and early-stop checks had passed. At 320 pixels, absent
and closed reports fit the viewport, but expanded provenance made the document
405 pixels wide. The scientific-hash paragraph under `#mpea-provenance` had a
284-pixel box and 387-pixel scroll width; every table scroll region remained
inside the viewport. Applying `overflow-wrap:anywhere` only to provenance
restored 320-pixel document width. The original screenshot and JSON diagnosis
are preserved as `overflow-320.png` and `overflow-exact-node.json`. The author
owns the corresponding main-source correction.

## Scientific and interface scope

Synthetic controls have an explicit synthetic banner, including the constructed
positive control. The positive verdict permits designing a further independent
study, and does not claim physical performance or deployment readiness. Absent
and halted reports do not receive performance gates. Empty feasible/discovery
denominators stay unavailable. The displayed statistical statement is marginal
for one future panel under a premise; it is not a simultaneous claim about all
20 evaluation panels.

The fixed cap and same-pool-cost views retain all 24 policies, including all 20
hash controls, and distinguish any-optimum hits from the separate pool's
all-optima retention. The negative control intentionally has any-optimum hits
and zero regret while failing all-optima retention. No UI value is recomputed
through floating-point arithmetic; rational values are rendered as strings.

The renderer is a presentation layer for a reviewed bundled aggregate artifact,
not an independent registration, CI, receipt or scientific-truth verifier.
Its basic malformed-structure handling does not replace the upstream closed
projector and custody checks. Optional-resource publication must preserve that
boundary. Detailed metrics not shown directly remain in the full report export;
the interface does not claim differential privacy or specimen independence.

## Verification history

The author's first browser check failed because it queried visible text inside a
closed provenance disclosure. Its corrected second run passed 10 checks; this
review does not count that author result as an independent test.

Independent attempt 1 had a reviewer expectation error: it expected Python's
literal `None` for an undefined cost. The UI correctly displayed `Unavailable`.
The failure log is retained as `browser-review-v1.log`. The independent test was
corrected without changing the product. Attempt 2 exposed a reviewer timing bug:
the previous and newly requested reports both had a NO_GO verdict, so waiting on
that shared verdict did not await the refresh. The download correctly contained
the still-displayed previous report. The test now waits for the returned report's
distinct scientific identity before exporting; the original log/export remain.
The next source-bound run checks actual
rendered values across every policy, cap and comparison subset, real app routing
and exact export, early-stop access counts, and open disclosures at four widths.
Attempt 3's real overflow failure is retained in `browser-review-v3.log`.
The final run passed all seven independent check groups, including 1536 exact
policy/cap/same-cost comparisons. All seven implementation/test source hashes
were unchanged; no JavaScript errors occurred. Expanded document widths equal
320, 390, 768 and 1440 pixels at those respective viewport widths. Early-stop
source capture and interpretation counts are visible, and the full downloaded
value tree exactly matches the sealed synthetic projector fixture.

Final receipt: `browser-review-v4.json`, SHA-256
`284d71cbfb43aa3eda23cb1fe51b733121036a256b4e870be329464af05814c9`.
Bound renderer: `f760f6225e60f08d7b4217bae7e7499fe1b4d3ea91514c5b1e429c5b4523f35e`.
Bound stylesheet: `6a837b57aa7540a9d00d83a6de026d6996a51563abcd7c7fd0a1dd243bb7f8d3`.
No unresolved blocking finding remains within this review scope.
