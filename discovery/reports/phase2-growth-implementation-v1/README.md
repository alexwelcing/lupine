# Bounded growth-hint and envelope readers

Two separate readers now pass the combined **359-test Li suite**. They preserve
all 326 earlier runtime files and add six runtime files, for 332 total. The
[integration receipt](root/integration-first/execution.json) records the first
run at 10:32:11–17 UTC, exit 0, 5.339 seconds unittest time and 5.918997 seconds
process time, with identical before/after source hashes. These are generated
and mocked engineering checks. The new actual source operations, exact-commit
CI and retained-artifact gates remain pending at this implementation checkpoint.

The [eight reviewed file identities](root/final-reviewed-pins.json) bind each
reader, its author and independent tests, and its contract. The [G30 report](shape-candidate/README.md)
records 35 author tests, 21 independent tests and 472 complete synthetic report
comparisons against the earlier pure predicate. The [pure candidate history](pure-candidate/handoff.json)
preserves its first fixture failures and subsequent 18-author/21-independent
passes. The production contract's raw-read chronology correction changes prose
only; the original and exact diff remain available.

The [G31 report](envelope-candidate/README.md) and [independent source review](envelope-review/README.md)
record 31 author and 24 independent passes after a real generated failure.
The first run passed 27 of 28 tests: a final central ZIP header declared one
comment byte but supplied none, which the underlying library tolerated. The
original source, failed fixture and receipts are preserved. A written scope
addendum preceded the narrow correction: bounded raw central-directory framing
and declared-length checks now run before the new reader opens its archive.
The failing regression fixture is unchanged. This finding does not establish
that the actual Li archive has malformed central metadata.

G30 checks the already observed sole local A220 field against the retained
APPNOTE structure: signature A028, two unsigned little-endian words and a full
NUL scan of remaining bytes. The initial-padding value is withheld and unbound;
it is not equated to the current padding length. G31 separately repeats that
predicate on the same verified buffer, applies the bounded rule to every local
extra area, retains the original other header checks and admits only the four
existing envelope XML members. Central extras/comments stay prohibited. No
worksheet or shared-string decoding is authorized by either reader.

Both readers bind the existing G29 public receipt, producer d0505b9, and fixed
capture/source identities. G31 does not invent or require a future G30 receipt
hash. Root's later operation sequence additionally requires a completed positive
G30 pair before G31. Each reader keeps its own exposure/cleanup lifecycle;
nested selected-stage raw-acquisition flags mean no additional file read there,
while the outer whole-buffer read is explicit. Unexpected operation failures
stop and preserve evidence. Two runs are computational replay, not independent
measurements. Scientific schema, rows, pairs, overlap and independent units
remain unestablished; fits and splits stay zero.

The [preceding report-only commit](previous-report-ci.json), 2428c313, completed
all four original-push CI jobs (run 38885071479), observed at 10:33:15 UTC. That
CI belongs to its 326-file predecessor runtime and does not verify these new
readers. Root next publishes this implementation, verifies its own original CI,
clean retained package and independent artifact audits, then runs only the
fixed reviewed operations. G20 remains unresolved and G21 blocked.

[The publication map](publication-map.json) binds copied evidence to retained
ignored originals. Historical .cache paths identify original workspace inputs;
they do not promise those paths exist in a fresh checkout. Raw Li objects and
capture bodies are omitted. Any lossless historical-text wrappers are listed
separately, preserving the original bytes and digest instead of normalizing
failed-source/log evidence. The BAM encoding report is a separate documentary
comparison and supplies no discovery-benchmark admission or physical guarantee.
