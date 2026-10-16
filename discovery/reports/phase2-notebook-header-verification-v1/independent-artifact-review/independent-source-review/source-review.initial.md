# Retained artifact auditor: independent source review

Reviewer: `/root/phase2_planner/ui_review`. This is source inspection, not an
artifact-audit execution, package test, scientific replication, or CI check.
The new retained packaging run and any extension remain unreviewed pending the
root's completion notice. No new retained receipts or private objects were read.

Reviewed auditor:
`.cache/phase2-finite-artifact-review-v1/actual-4492858/audit.py`

SHA-256: `b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119`.

The existing auditor checks exact HEAD and clean worktree; canonical release
receipt and its content hash; wheel/source artifact identities; the complete
source copyset against the selected commit's Git blobs; manifest hashes against
archived and working files; wheel RECORD coverage, sizes and hashes; and exact
wheel package membership/content against archived source. It checks fixed smoke
probe identities, assertion preservation, and hashes/status/source manifests of
two recorded runs. It rechecks held inputs, its own source, HEAD and worktree.

These checks establish byte and recorded-evidence consistency under controlled
local custody. They do not independently authenticate receipt claims, rerun the
recorded installed behavior, validate remote CI, or establish scientific truth.
The auditor is not a general adversarial archive security validator: compressed
input file caps are not universal expanded-member resource caps.

The immediate-baseline delta needs a separate small extension. The old auditor
only compares the current manifest to current source and preserves selected older
modules/resources; it does not compare all 317 prior runtime pins. Its wheel
check compares current package payload to current source, not the prior package.

Required extension assertions, using the root-specified counts as expectations
rather than observations made by this reviewer:

1. Bind baseline `4492858d9e55ddfa3cca2e208063799517948b13` and target
   `a6e87c198d8116d26c523e0e1b2eedce4aeb225b`. Parse their exact runtime manifests
   with duplicate-key rejection. Require 317 baseline and 323 target entries.
2. Require no removed keys and equal SHA-256 values for every baseline entry.
   Require the added-key set to equal the six explicitly named notebook-methods
   and compatible-ZIP-diagnostic script/test paths; counts alone are insufficient.
3. Require the eight explicitly named script/author-test/independent-test/contract
   paths in the already Git-verified source archive. Their bytes must match the
   target commit; the six runtime additions and two contracts are different sets.
4. Compare the entire wheel `lupine_discovery/` member-name/hash map with the
   baseline Git `discovery/src/lupine_discovery/` subtree, with name-set equality.
   This supports unchanged package payload, not unchanged ZIP bytes or `.dist-info`
   metadata. The existing auditor must still verify all wheel RECORD entries.
5. Bind the extension's source, baseline/target manifests, old auditor result,
   and artifact inputs. Recheck inputs and source state at completion. If the
   extension consumes an old-auditor JSON result, require its PASS/commit identity
   and preserve the connection to the actual retained artifact identities.

No source-level blocker was found in reusing the unchanged auditor for its
documented scope. Extension source review and actual retained evidence review
remain pending; this note makes no new PASS claim.
