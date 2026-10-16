# G30 fixed-source growth-hint payload diagnostic candidate

This ignored implementation binds the already observed public G29 prerequisite
and adds a bounded payload-shape diagnostic. It leaves all 25 predecessor files
unchanged and admits no archive, XML schema, scientific dataset or sample unit.
A shape match remains `BLOCKED_SCHEMA`, initial-padding semantics remain
`UNBOUND`, and archive acceptance remains false.

The scope was frozen before production-candidate code/tests. The only actual
receipt read during candidate work was the root-authorized public G29 projection:
SHA-256 `52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e`,
producer `d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3`, sole A220 record with declared
payload length 516. That projection does not reveal a signature, initial-padding
word or padding bytes. No actual capture, object, archive, private receipt,
production context, network or source-operation command was accessed/invoked.

## Implemented behavior

The new source guard composes the unchanged G29 committed-source chain and
checks its own four files against commit and index, then checks HEAD again.
The wrapper validates the fixed public prerequisite before any private input,
reserves only an absent fixed output slot, uses unchanged capture/object guards,
and repeats unchanged G29 inspection on the same verified immutable buffer.
Only an identical sole A220/516 field list reaches the payload predicate.

The predicate reads the two little-endian unsigned words, compares the signature
to A028, withholds the initial-padding value without comparing it to current
length, and checks every remaining byte for NUL. Its own first-span result makes
no statement about later local spans, central extras or package validity.
Raw-read, attempted interpretation, partial-failure and cleanup exposure remain
explicit. The report gives fixed enums/booleans, not arbitrary payload values.
Existing-slot absence and exclusive writes are replay/overwrite protection in
controlled serialized operations; they are not a concurrency lock.

## Actual executed verification

The first author invocation passed 35 tests in 0.086 seconds of unittest time
(0.598386377 seconds total process time). It combines retained generated-fixture
shape challenges with new mocked source guards, prerequisite checks, same-buffer
ordering, raw-read failure exposure, negative source identity, write/close
failure, and CLI disclosure tests. Every real production dependency was stubbed
before wrapper/guard invocation. Generated prerequisite fixtures use an explicit
hash stub only to exercise inner checks, separately from real fixed-hash
rejection tests. These are control-path tests, not a custody event.

A separate invocation compared all fields of 472 synthetic reports against the
preserved earlier pure source `c42313dd…`: all matched (0.414608191 seconds total).
The new source is `1a2bd644…`; its payload predicate is also unchanged by static
AST review. Full receipts, commands, source/test/contract snapshots and stdout/
stderr are retained under `receipts/`. No first production-candidate execution
failed. The earlier pure candidate's fixture failures and subsequent passes
remain intact in its separate historical bundle and are not relabeled.

After those invocations, a reviewer caught a prose chronology error: the old
contract said identity checks preceded the raw read. The runtime already read
and recorded completed exposure before checking identity. Only the contract
sentence was corrected, from `f4f0ce8…` to `e0ca28ad…`; source and author test
bytes did not change. Both contract versions and the exact diff are retained.
No test rerun is claimed for that documentation-only delta.

The independent first invocation passed 21 tests in 0.620 seconds of unittest
time (2.503269385 seconds process time). It used separate fixtures and fully
mocked production dependencies, with audit-hook observations retaining no
forbidden calls/events. Its held test hash is `13db80f4…`; source/contract
review found no remaining blocker. Complete independent evidence is copied
byte-for-byte under `independent-evidence/`, with an exact copy map. Its source
review also explicitly limits concurrent replay and the disclosure scope.
The final four promotion files are listed in `promotion-map.json`. These
synthetic/mocked passes do not establish that actual production guards or
source interpretation have occurred.

This README does not claim an actual diagnostic execution,
production guard success, release/CI pass, physical validity, dataset readiness,
independent sampling, calibrated coverage or scientific performance.
