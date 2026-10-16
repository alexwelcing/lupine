# Independent Li flag-diagnostic review

**16 synthetic tests passed** on corrected source `c08c295d…`: 0.965 unittest
seconds, 1.622 elapsed seconds. All recorded source bytes stayed unchanged.
The suite includes 3,144 public-API mask/method combinations, first-failure order,
closed canary-invariant output, all nine prior public-source hashes and fully
stubbed positive/negative production guards. No real object or private custody
was opened; payload/XML/decompression and network APIs were forbidden.

The first independent invocation had one **reviewer-fixture failure**: it raised
an invented error code that the unchanged custody class correctly sanitized to
`INTERNAL_FAILURE`. Only that stub/expected value changed to `FILE_READ_FAILED`;
all exposure assertions remain. Original source, failure logs and the exact
fixture-only patch are retained. No product change was needed for this failure.

Root had separately identified an incorrect prior-source pin in the author's
initial candidate. The author preserved that candidate and its12-test receipts.
Independent execution began only after the explicit pin repair. A separate-agent
read verified that correction and the clearer no-member-decompression docstring;
no additional source/contract blocker was found.

`review.json` records exact source/test identities, actual receipts, scope and
limits. Promote only `test_li_v3_flag_diagnostic_review.py` as the independent
test source; the loader prefers the tracked script after promotion. The remaining
files are review evidence. `inventory.json` excludes itself to avoid a circular
identity. Raw `.log` files may require explicit staging if this evidence is copied
into a tracked report.

These checks do not identify actual source flags, approve a ZIP/XML profile or
establish scientific readiness. A descriptor category means only a central-header
declaration; encryption/masking has precedence. Counts remain null, independence
is not attested and every classification stays `BLOCKED_SCHEMA`. Root must still
publish the source and verify its CI before any real diagnostic.
