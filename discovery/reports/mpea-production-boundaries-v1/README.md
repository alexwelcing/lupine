# Production registration and persistence: constructed boundary checkpoint

The reviewed production store and registration/allocation source are integrated
without producer edits. Main-layout controls pass **24 store tests in 1.752
seconds** and **43 registration/allocation tests in 4.374 seconds**. The latter
includes 36 independent controls, six author boundary checks and one constructed
store/fresh-process integration. No real allocation or study input was used.

Registration requires the exact published implementation commit, complete
source/specification closure, a source-bound engineering receipt explicitly
approved by the trusted parent, and authenticated official GitHub evidence for
all four successful jobs. The isolated worker trusts the externally supplied
parent capture hash; it does not reauthenticate GitHub offline. Self-sealed PASS
claims or test counts cannot establish that parent approval.

One durable protocol/source ledger prevents another draw after a replacement
registration, interrupted provider call, rejected draw or response-write failure.
It records each request before calling the entropy provider and every response
before another request. Reproduction imports original allocation/route bytes
unchanged and never requests fresh entropy. Its separately restricted authority
allows the original source commit to remain an authenticated ancestor of the
branch after later publication. It cannot initiate a new allocation; the original
allocation gate still requires exact remote HEAD.

The store preserves all eight ordered stage envelopes, predecessor byte identity,
semantic identity, terminal states and exclusive attempts. Scientific identity
excludes declared execution metadata; whole-byte identity still binds the full
envelope. Schema, scope and byte-limit defects found by independent review remain
in the evidence, including the compressed exact initial oversized-input log.
Filesystem and fsync tests establish observed behavior, not immunity to every
power-loss scenario or malicious host.

[The 92-artifact copy ledger](artifact-copies.json) preserves independent reviews,
original failures, repaired source snapshots, author observations and root
main-layout executions. Promotion adapts only test import/workspace paths and
cache initialization. A first fresh-process helper still required its old review
directory and failed; its guard now requires the dedicated ignored-cache fixture
workspace. Both versions and the failure are retained. Producer hashes remain
those independently reviewed: store `9b5caa9a…`, registration `51c19d99…`.

This is a partial production engineering increment. The complete source adapter,
shared scientific flow, public bridge and supervised launcher remain under
independent integration review. Full source-bound tests, publication and green
CI must precede actual registration/allocation and performance-target decoding.
No scientific gate changes, and all historical negative results remain intact.
