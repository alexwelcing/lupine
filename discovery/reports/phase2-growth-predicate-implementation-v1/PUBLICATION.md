# Artifact preservation and navigation

The [entrypoint](README.md) links four immutable engineering bundles:
[pure author](pure-author/COMPLETION.md), [pure review](pure-review/README.md),
[production author](production-author/COMPLETION.md) and
[production review](production-review/README.md).

The [source bindings](source-bindings.json) pin each final inventory and handoff.
Only their 222 listed artifacts plus the eight explicitly named inventory/handoff
files are copied. No directory glob supplies extra evidence. Generated temporary
repositories, bytecode caches and actual-source artifacts are excluded.

[The byte map](original-byte-map.json) records the original and published path,
size and SHA256 for all 230 source artifacts. One whitespace-bearing first-failure
log is retained as [a reversible original-byte wrapper](pure-review/first-run/stderr.txt.bytes.json).
Its original hash applies to the decoded base64 payload; no original line was
silently trimmed. All other source artifacts are exact copies.

No original Markdown document contains a Markdown link requiring repair.
Original Markdown is therefore unchanged; this new entrypoint provides explicit
promoted navigation. Original code-span cache paths and commands remain historical
source context, not promises that snapshot tests run from the report directory.
The source inventories retain their original relative paths; use the byte map
when a publication wrapper changes a filename. [Navigation checks](publication-checks/navigation.json)
record the published links.

The publication helper initially assumed that an inventory's files were a list;
its [preserved inspection failure](publication-checks/first-inventory-inspection-failure.json)
records the mapping/list mistake and correction. It was not a diagnostic-source
or test failure. Publication verification checks copies, wrappers, links and
whitespace only; it does not certify tests, CI or scientific evidence.
