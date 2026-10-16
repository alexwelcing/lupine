# Independent compatible-envelope review

The corrected independent test suite passed all 16 methods in 0.931 seconds
(unittest), 1.390 seconds elapsed, exit 0, against unchanged candidate source
`e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847`.
All 17 bound source/test/contract files remained unchanged. `second/` retains
the actual logs and before/after hashes. The independent test is intended for
`tests/test_li_v3_compatible_envelope_review.py` after root promotion.

The first invocation ran 16 methods with one reviewer-fixture failure. Its stub
used undeclared error code `OUTPUT_EXISTS`; the legacy constant-error sanitizer
correctly returned `INTERNAL_FAILURE`. The actual exclusive-output helper uses
`OUTPUT_CONFLICT`. The original test, raw logs and receipt are retained under
`first/`; `reviewer-fixture-fix.patch` records only the two corrected literals.
No product source changed and no exposure assertion was weakened.

Independent fixtures hand-build local and central headers, using actual Deflate
streams for the four permitted XML members. They challenge every allowed option
combination, prohibited flags/methods, later-member corruption, local/central
agreement, structural limits, actual four-member read scope, opaque canary
invariance, XML limits and partial exposure, relationship scope, fixed source
pins, prerequisite receipt forgery, capture gating and incomplete reads. Network,
real custody helpers and opaque-member reads are forbidden. All positive
production paths are explicitly stubbed with synthetic values.

Separate read-only source review by `/root/phase2_planner/ui_review` found no
blocker. Only the intended method8 flag mask differs from the original ZIP
predicate body; original validators, bounds, projection and negative scientific
states are preserved. The final contract hash is
`86b663de7a0e88e559a8cc6acbbacd3b17d4ca9ee4e759abc826f7afbd6211ca`.
Its exposure wording correctly avoids treating absent ZIP-name instrumentation
or incomplete XML arrays as evidence that no decoding began.

No actual workbook, private custody, actual flag receipt or network was read.
No real flag family is inferred. These checks do not attest production execution,
scientific schema, sampling independence or useful recommendations. Even a valid
envelope remains `BLOCKED_SCHEMA`. Root owns verifying a qualified prerequisite,
source publication and exact-source CI/package gates before any real run.
