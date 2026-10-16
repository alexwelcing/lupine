# Bounded repair artifact review

The first independent audit of repair commit
`e668b349e130cdfd1a8cfe94e3e38d4755507f72` passed all 57 checks. It ran on
2026-10-16 from 18:27:49.306789 to 18:27:51.459288 UTC, exited zero, and
emitted no stderr. The preserved command result is this audit's execution
evidence; the previous 22,005-check audit belongs to `eaed2e7a…` only.

All 6,981 files in the new source archive match the exact committed Git blobs
and tracked executable distinctions. The 351-file runtime has one change:
`tests/test_li_v3_readiness_production.py`, from SHA256 `809c0126…` to
`a38e2d7c…`. All other 350 runtime files and all 113 package source files are
unchanged from `eaed2e7a…`. The new wheel matches those source bytes and has
120 members, complete unique RECORD coverage, 119 verified content digests,
and the empty RECORD self-entry. Its two public resource pins and all 18
recorded mandatory flags remain held.

The first root release attempt stopped before package or strict-verifier
execution because the ordinary Git remote request returned CONNECT 502. Its
failure receipt, raw command evidence and observed exit two remain distinct
from the subsequent successful attempt. The successful attempt used the same
recorder bytes and has actual package/strict exits zero, empty stderr,
identical before/after source states, and root-observed outer exit zero.

New artifact identities:

- Source archive, 136,755,200 bytes:
  `620c44709621a341d48d478cd4a45397a9cff68e146b899249e766f851664877`
- Wheel, 324,053 bytes:
  `b41e20694a1b5efb68729c65b5f900a09482e112864daf6e2556cda32494ce58`
- Release receipt:
  `88b9c7006997d1da0c77d4c8efdc9f3051fe41e597196e827b9cbb312982a454`

The exact e668 HEAD was clean at this audit's end. That source hold is closed;
this report makes no claim about later changes. Artifact and receipt identities
were rechecked before completion. The public command-evidence JSON stores exact
UTF-8 originals with their byte lengths and hashes; no tar, wheel, raw scientific
data or private custody file is bundled. Only local read-only Git was used.
No package, strict-verifier, test or artifact code was rerun. This review does
not establish CI completion, formal compilation, scientific admission, physical
validity, superiority, or deterministic rebuilding.
