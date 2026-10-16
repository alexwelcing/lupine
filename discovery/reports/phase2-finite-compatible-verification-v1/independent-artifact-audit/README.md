# Independent retained-artifact audit at 4492858

The first actual audit passed on commit
`4492858d9e55ddfa3cca2e208063799517948b13` in 6.277745 seconds. It ran only
after the actual clean package producer and strict retained verifier both
recorded successful exit codes for that commit. This audit did not build,
install, execute, or test the package again.

It independently checked all 2,954 archived source files against exact Git
blobs using `git ls-tree --full-tree`, all 317 runtime-manifest files against
the source archive and worktree, all 114 non-RECORD wheel content hashes, and
all 108 packaged source files against committed sources. The wheel had 115
members, with no link, directory, encrypted, or nonregular entry; the archive
had no linked or cache entry and exactly the declared source copyset.

The 16 mandatory ordered installed checks agree across producer, verifier,
receipt and both explicit probe pins. All 63 prior installed assertions remain
present and nine finite-planner assertions were added. The finite module
matches the reviewed source hash, four-input function and 21-field dataclass;
fixed uncertainty/scope fields and CLI/HTTP/browser source markers are present.
The existing IID module, MPEA resource and MPEA JavaScript remain byte-identical
to their checked historical versions. Static source markers are not an
additional execution of the HTTP or browser behavior.

The actual package and verifier execution receipts, logs, exact artifact
identities and runtime manifests agree. Those read inputs and the audit script
retain their initial identities at the end, and HEAD and the clean worktree
remain unchanged. `review.json` contains the exact command, timestamps, hashes,
counts and read-only Git command transcript. `stdout.txt` and `stderr.txt` are
the actual audit streams; `audit.py` is the exact executed reviewer source.

No private Li custody or compatible-envelope input was opened, and no project
module or retained artifact was executed by this audit. Published source-package
resources were hashed for byte identity without scientific interpretation.
This result establishes retained engineering identity and consistency with
recorded installed checks. It is not a scientific evaluation, independent
sampling validation, deterministic-build proof, or CI-success claim.

There was no failed actual attempt at this commit. The separate
`historical-first-fixture-failure/` directory in the parent review workspace
preserves the earlier 41d3 review's failed pathspec fixture unchanged; it is not
reclassified as a failure or pass of this new audit.
