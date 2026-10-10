# MPEA header-only custody: engineering freeze

Date: 2026-10-10. Base commit: `522fb280bad7ef1794c97a0de1f64a0e90598efe`.
This checkpoint precedes the first real CSV GET. Only synthetic bytes were
used to implement and review the custodian. Existing user authorization covers
research and source acquisition; this record documents engineering readiness,
not an additional permission request or a scientific eligibility decision.

## Executed checks

- The combined focused suite passed **35 tests**: 13 producer tests and 22
  independently authored tests. The source, both test files, plan and inventory
  were unchanged during the run. The [independent receipt](mpea-custody-independent-review-v1.json)
  and [log](mpea-custody-independent-tests-v1.txt) bind their actual bytes.
- The complete Python suite passed **485 tests** in 62.803 seconds, with no
  failures, errors or skips. The wrapper measured 63.781 seconds.
  [Full log](mpea-custody-release-tests.txt) and
  [before/after source receipt](mpea-custody-test-receipt.json) preserve actual
  execution and unchanged source hashes. No dataset GET or row decoding was
  part of those tests.
- The installed library, browser assets, packaged examples and all 117 formal
  statements are unchanged from G14. Its isolated-wheel check is source-relevant
  historical evidence; this script-only increment does not claim another local
  package/browser/Lean run. Branch CI reruns those checks after publication.

Source SHA-256: `046aac4812802d1abf656aa93d0b832e8011e2feb59574615957c2550fe11b98`.
Plan SHA-256: `381406c91451ffb4592539b7bc66beb215bdb00cd852bf1a01106bebe7d1b895`.
Inventory SHA-256: `ce2e1487cb91436137086f7c9900d091eed30068f6c8e9595687458c3f12679c`.

## Boundary and scope

The fixed source is Figshare article 12642953 version 9, file 25797305,
`MPEA_dataset.csv`, declared 332,126 bytes and MD5
`6d29eb6018157b863ca0033ccec936d5`. Production execution requires the five
reviewed source/test/plan/inventory paths to match their committed bytes. The
fixed inventory digest is checked first. The download accepts only the declared
HTTPS route and at most one exact observed redirect; private query strings and
arbitrary exception text do not enter public receipts.

The custodian records a whole-file SHA-256 and verifies size/MD5 before parsing
the same captured bytes. MD5 is legacy integrity metadata, not cryptographic
publisher authentication. Conflicting cached bytes are not replaced. Header
framing is byte-bounded before decoding, uses one strict logical CSV record,
and does not pass the remaining bytes to a text decoder or CSV parser.
Recognized labels are explicit; unknown labels expose only their positions.
No per-cell hashes, raw unrecognized strings or target fragments enter output.

Every valid header still returns **BLOCKED_SCHEMA**. There is no row-metadata
command. Row count, numeric completeness, pairability and scientific eligibility
remain unknown; fits and splits stay zero. Tests cover forged/resealed receipt
promotions, invalid UTF-8 after the header, malformed quoting/BOM/CRLF, all parser
limits, same-buffer checks, cache conflicts/races/symlinks, clean/dirty source
checkpoints and sanitized CLI failures. These are ordinary local integrity
checks, not a security sandbox against malicious concurrent local processes.

## Next execution, after publication

Root will verify the pushed source checkpoint and its CI, then execute:

```sh
python scripts/mpea_custody.py acquire --output .cache/mpea-custody/acquisition-v1.json
python scripts/mpea_custody.py header --output .cache/mpea-custody/header-v1.json
```

A successful acquire returns CAPTURED with exit zero. A valid header returns
BLOCKED_SCHEMA with exit two by design; preserve that receipt, not a misleading
successful scientific status. Repeat header extraction in a fresh process and
compare its public receipt. Capture/hash of the full target-bearing file is
real acquisition and must be disclosed even though observation rows stay
undecoded. No blind-validation claim follows.

Any fuller header disclosure or later row-metadata extraction needs a separately
reviewed and committed schema amendment before execution. This is a protocol
freeze within the authorized work, not new permission from Alex. No thresholds,
eligibility rule, ranker, split, target-value check or model fit is selected by
this construction. All earlier negative scientific results remain intact.
