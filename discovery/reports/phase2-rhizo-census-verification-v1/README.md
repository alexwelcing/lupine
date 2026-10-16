# Published census release: package and artifact verification

Published commit [`2975d6d0b9111cc84adb82ccc673bc82339ab154`](https://github.com/alexwelcing/lupine/commit/2975d6d0b9111cc84adb82ccc673bc82339ab154) passed the completed local clean-package checks and two retained-artifact checks below. Exact-source [CI run 38912404614](https://github.com/alexwelcing/lupine/actions/runs/38912404614) remains **pending observation at this report's handoff**. A local pass does not establish CI success; root must add the final exact-source CI receipt separately.

| Completed operation | Recorded result |
| --- | --- |
| [Clean package execution](package/package-execution.json) | Exit 0 in 42.489204461 seconds, with the source HEAD unchanged and worktree clean. |
| [Isolated installed-wheel checks](package/package-verification.json) | 28 demonstration cases, six schemas and 17 named checks passed, including the new public census resource/HTTP/asset check; the 13 known-answer checks also passed. These counts describe overlapping checks at different levels, not additional scientific experiments. |
| [Strict retained-artifact verifier](package/retained-audit-execution.json) | PASS, exit 0 in 1.347567797 seconds; [original result](package/retained-audit.json) retained. |
| [Separate independent artifact audit](independent-artifact-review/ACTUAL-REVIEW.md) | First actual invocation passed 17,555 identity, metadata and scope checks in 1.846464329 internal seconds (2.00421452 process seconds). It did not rerun installed behavior, the generic verifier or CI. |

The independent audit matched all 5,442 archived source files to the committed Git blobs and independently enumerated all 339 runtime entries. Against parent `d4d8504a97d362a6339eaa27453a86e0eb167cee`, nine existing runtime files changed, four were added and the other 326 previous entries stayed byte-identical. The wheel has 117 members, 116 content digests covered by RECORD and 110 package payloads; all payloads matched source. Of the baseline's 108 payloads, 104 were unchanged, four changed and two were added. The original detailed [audit result](independent-artifact-review/first-actual-artifact-audit/review.json) and [execution receipt](independent-artifact-review/actual-execution.json) preserve these distinctions.

The [retention receipt](package/retained/release-artifacts.json) identifies the exact tested artifacts:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Committed source archive | 102,297,600 | `ddfb56771aa1141ce4eee37946893b21699025ca27ec5f09dbc0cd9cd3c6d489` |
| Tested wheel | 315,469 | `c57635cb71f49fb8bb38243cf783bb1067907c10c4ae54b1a65bb8b501e6693a` |
| Retention receipt | Recorded in the copy map | `495de1cb3f66894b8c1d93ab810c8d24a75cc7295b8a4bfac797ac0c1905d2ac` |

This report copies receipt metadata, logs and the independent public review; it does not copy or reopen wheel/archive bodies. The underlying independent auditor did stream committed public artifact members for identity checks, as its own report states. Neither that audit nor this publication reran the census or read private/raw scientific inputs. Successful packaging and exact hashes establish neither a deterministic rebuild nor physical truth, training independence, model superiority or fresh screening evidence. The census remains a historical description of exposed stored labels; G21 fresh paired screening is not completed by this checkpoint.

The original [publication receipt](published.json) still says package and CI pending because it predates their observation. The independent [preparation README](independent-artifact-review/README.md) likewise remains preparation-only history; its later [actual review](independent-artifact-review/ACTUAL-REVIEW.md) establishes the completed audit status. The [pre-execution amendment](independent-artifact-review/preexecution-amendment.json) preserves final promotion pins, the type-sensitive comparison correction and the static tar-permission correction before the first actual artifact audit. No failed artifact invocation was replaced: this independent audit's first actual invocation passed.

The [copy map](source-copy-map.json) binds all 30 explicitly selected original files, copied byte-for-byte. The independent handoff's 19-file allowlist is preserved in full; no bytecode or unlisted files are included. Existing Markdown links remain valid, so no navigation repair or whitespace wrapper was needed. [Publication validation](publication-validation.json) checks those bytes, links and text formatting only; no tests or artifact-verification commands were rerun while assembling this bundle. The [pending CI checkpoint](ci-pending-at-handoff.json) is explicitly separate from the completed local results.
