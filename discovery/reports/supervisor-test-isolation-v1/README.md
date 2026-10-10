# Isolating resource-enforcement test parents

A controlled 320 MiB resident parent changed the same small synthetic worker from
COMPLETE to RSS_LIMIT at the unchanged 256 MiB cap. Sampled worker residency was
about 10 MiB, while the Linux leader's wait4 high-water included approximately
346 MiB inherited before exec. Production correctly enforces that recorded peak.
Subtracting parent memory could hide a real worker peak and is not used.

The repair launches capped synthetic cases through a fresh small interpreter.
Production supervision, resource caps, process cleanup and all 105 original
assertions remain unchanged. The existing deliberately unsampled RSS control and
15 ms wait4 delay move into explicit fixture modes; the unsupported-platform
no-launch spy remains local. Real namespaces, sampling and wait4 are exercised.

The candidate passes 41 focused tests plus five high-parent-memory controls.
An independent reviewer passes four further controls under a 347,910,144-byte
resident parent, including both sampled and deliberately unsampled 64 MiB breaches.
The [37-file lossless manifest](manifest-v3.json) retains source, original failures,
the intermediate failed harness, final candidates and independent receipts. The
older README wrapper still accurately reflects its earlier pending-review time;
wrapper 30 records the completed independent review. A new main full suite is
required before engineering approval; no scientific inputs were opened.
