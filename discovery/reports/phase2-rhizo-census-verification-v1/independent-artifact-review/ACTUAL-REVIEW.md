# Completed independent artifact audit

The prepared auditor passed on its **first actual invocation**, at 14:03:40–14:03:42 UTC on 2026-10-16, for published commit `2975d6d0b9111cc84adb82ccc673bc82339ab154`. It returned exit zero after 1.846 seconds inside the auditor (2.004 seconds recorded process wall time). The [original first result](first-actual-artifact-audit/review.json) preserves all 17,555 byte, metadata and scope checks with no failure. These are artifact checks, not scientific experiments.

The source archive contains 5,442 files, each matching its exact committed Git blob. Independently enumerated runtime contents match all 339 manifest entries. Against `d4d8504a97d362a6339eaa27453a86e0eb167cee`, exactly nine existing runtime files changed and four were added; all other 326 previous entries are byte-identical. The baseline's own 335 manifest entries were reconciled against its Git blobs, rather than accepted solely from a stored manifest.

The wheel has 117 members, 116 content digests covered by RECORD, and 110 package payloads. Every payload matches the source archive, every RECORD digest/size matches the member bytes, and the expected entry point and package metadata agree. Against the baseline's 108 payloads, 104 are unchanged; the four declared changes are `server.py`, `web/app.js`, `web/index.html`, and `web/styles.css`. The two additions are the census JavaScript and public census JSON. The public resource retains SHA `a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a`.

The retained receipt reports 28 demonstrations, six schemas and all 16 previous mandatory checks plus the new census check. This audit checks those recorded assertions and exact artifact identities; it does not rerun installed behavior tests or the generic verifier. CI was not queried or certified by this auditor.

Artifact identities are:

- Source archive: 102,297,600 bytes; SHA `ddfb56771aa1141ce4eee37946893b21699025ca27ec5f09dbc0cd9cd3c6d489`.
- Wheel: 315,469 bytes; SHA `c57635cb71f49fb8bb38243cf783bb1067907c10c4ae54b1a65bb8b501e6693a`.
- Retention receipt: SHA `495de1cb3f66894b8c1d93ab810c8d24a75cc7295b8a4bfac797ac0c1905d2ac`.
- Runtime manifest: SHA `b2c35e48c8dc837d78aba0047d112dabbd30b8ff11e66bba0f45e9da92a0eb2f`.

The auditor source `b6566a01f8704699174dbdaaacb4a51182e58bf1e346bf249375c534ac1728db` was prepared and syntax-checked before root supplied the published commit and retained path. Its final promotion map `b3867dd99e7a7d890ac0bee36e1448ff811d3931be7f3a21c80035e995a82a6a` includes the root's type-sensitive HTTP/probe correction. The original map, preparation, syntax receipt and auditor version remain preserved. The separate static tar-mode amendment was made before any actual audit, not in response to a failed artifact check. [README.md](README.md) remains the original preparation-only checkpoint and is superseded for execution status by this report.

No package contents, census producer, scientific reader, tests, guards or formal code were executed. Committed public source archive members were streamed solely for identity checks; the ignored producer and private/raw scientific inputs were not opened. No Git mutation or network operation occurred. This audit supplies identity and packaging evidence, without a deterministic rebuild, independent physical truth, training independence, model superiority or scientific admission claim.
