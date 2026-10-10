# Public bridge fixture repair

The first boundary run had seven errors; the complete suite also rejected the
review class's setup. Synthetic fixtures supplied metadata unrelated to their
constructed header, and one early route writer omitted its declared observation
view. Strict production joins correctly refused them.

Both fixture candidates now satisfy the same contracts. All 98 original assertion
calls are unchanged, including corruption controls and pinned historical checks.
Eight boundary tests pass in 61.279 seconds and 13 review tests pass in 354.950
seconds, with stable source bindings. [The diagnosis](diagnosis-v2.json) and
[lossless copy ledger](copy-ledger.json) retain exact failures, candidates and logs.
Production code was unchanged. The optional class-cleanup patch is preserved as
unexecuted and was not promoted. Main full-suite success is not claimed here.
