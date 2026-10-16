# Prospective MPEA conformance producer evidence

Every named original is stored losslessly in a UTF-8 JSON wrapper. Decode its
`utf8` string and encode as UTF-8 to recover exact original bytes, then verify
its original size and SHA-256. Patches/log trailing whitespace are preserved.

Historical failures, held-v1/v2 sources and the successful v2 author31 receipt
remain labeled as historical. The v3 correction changes common companion
metadata/validation, with eight focused author checks. It does not change
numerical algorithms or reopen actual data. Independent peer receipts are
referenced separately rather than duplicated; the root main suite is separate.

The original v2 integration note was reconstructed by removing only the appended
v3 section and checking the retained v2 execution SHA. Its reconstruction record
states this explicitly. All other declared promotion copies/snapshots retain
their original exact hashes. No recursive attempt directory or scientific input
is included. This is engineering evidence, not scientific registration or a
performance result.
