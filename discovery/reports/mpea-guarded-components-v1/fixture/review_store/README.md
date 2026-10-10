# Independent fixture-stage-store review

This workstream examines the integrity and ordering primitive in
`../scripts/mpea_stage_store.py` using constructed sources and isolated attempts
inside this directory. It does not open experimental source bytes, features,
labels, allocations, or entropy sources, and does not validate scientific payload
semantics or establish a production access boundary.

The initial 14-test execution is preserved in `tests-first.txt`. Eleven tests
passed and three identified implementation defects on source SHA-256
`371744f046269861cc9407f09fdd546a35680caaa6f01e0f1091c9d20ca67969`:

1. Replacing an attempt directory with a symlink immediately before the final
   pathname open redirected a stage file and still returned COMPLETE.
2. An injected file-flush durability failure left a final-named, canonically
   COMPLETE stage file while the in-memory chain remained empty.
3. Replacing a marker with a symlink to an identical copy between path checks and
   its open let verification follow the replacement.

The initial source snapshot and minimal publication reproductions are preserved
as `source-first-371744f0.py` and `probes.py`. They are historical evidence, not
alternate implementations to import in the final tests. The author owns repairs;
final test status and source bindings will be recorded separately.

The tests independently reconstruct canonical receipt bytes, content seals,
scientific digests and predecessor hashes. They also challenge order, terminal
failure, missing/replaced predecessors, overwrite protection, returned-snapshot
mutation, source/hash-map identity, malformed/noncanonical JSON, duplicate keys,
nonfinite/floating numbers, node/depth/byte/string/integer limits, and exact
Fraction normalization. Fresh synthetic attempts must yield identical chains.

Scientific payload booleans are deliberately generic values here. This does not
validate a bool in a count slot or a container in any scientific schema. Exact
Fraction values normalize to rational strings, and dataclasses normalize to field
maps; Python type identity is not preserved by canonical JSON. The caller must
validate payload semantics before storing them.

The fixture scientific digest currently includes its predecessor's complete file
hash. This is stable across these attempts because their receipts contain no
attempt paths, timestamps, timing or RSS. A future production receipt carrying
usage information needs the separately specified predecessor scientific identity;
this fixture mechanism alone does not implement usage-insensitive production
identity. No hostile-operator, operating-system isolation, crash-recovery or
formal proof claim follows from these tests.

A fourth implementation defect was found after the first filesystem repair:
replacing the pending filename with another regular file before hardlink
publication could return COMPLETE for foreign bytes. `tests-fd-repair.txt`
preserves that 18-test run (17 passed, one failed). The author added original
inode checks around publication and a captured-FD content comparison. All 19
then-current tests passed in `tests-repaired.txt`; two additional boundary tests
cover same-inode content corruption and ancestor symlinks/closed handles.

`run_review.py` records the final 21-test execution with source and test hashes
captured before and after, and publishes its actual result in
`independent-review-v1.json`. `tests-final.txt` is the captured execution log.
The fixture implementation hash map is caller supplied: this store binds that
map but does not independently attest the currently executing implementation.
The reviewed usage is one serialized driver in one process, with explicit close;
no concurrent-writer or cross-process reopening/resumption guarantee is made.
Operating-system process death during publication can leave an interrupted
attempt that must not be automatically resumed.

A subsequent layout-only repair keeps the workspace under the discovery root’s
ignored `.cache/mpea-study-custody` after promotion to main `scripts/`. The v2
review adds relocated main/scratch layouts, an initially absent cache root, and
a symlinked cache ancestor. `run_review_v2.py`, `tests-final-v2.txt`, and
`independent-review-v2.json` bind that 22-test execution. Original v1 test and
README bytes are preserved as `test_stage_store_review-v1.py` and `README-v1.md`;
all earlier results remain unmodified.
