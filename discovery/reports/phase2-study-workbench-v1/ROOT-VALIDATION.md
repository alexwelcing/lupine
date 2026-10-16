# Root combined interface/package validation

Source was an isolated overlay of published `5addf4f` plus 14 reviewed mapped
files, with 303 runtime files held unchanged. The main checkout was observed
clean at the start and end of each command. These are precommit checks, not
clean committed retention or exact-commit CI for the upcoming source.

First pass: **31 HTTP tests, 48 package tests and 23 retained-artifact tests PASS**.
The installed package then **FAILED**: an inherited absolute PYTHONPATH let pip
see the source checkout as already installed and skip fresh-venv installation;
the isolated `-I` import correctly failed. The original command, source hashes
and traceback remain in `combined-v1/3`. A separate actual-wheel negative
control reproduced pip exit 0 with the skip message and isolated import exit 1.

The reviewed repair removes only PYTHONPATH from package build/install/probe
child environments. Proxy/tool settings remain intact. A real-child canary
regression verifies that the path-only module is visible in the positive control
and unavailable through the repaired helper while another setting is preserved.
No installation/probe assertions were removed. All 60 prior PROBE assertion
ASTs remain; installed HTTP/CLI and asset checks add the fifteenth mandatory flag.
The exact new PROBE hash and both explicit fixed pins were independently reviewed.

Repaired pass: **49 package tests PASS**, then the installed wheel passes
**28 demonstrations, six schemas and 15 ordered checks** while the parent
intentionally supplies the same absolute PYTHONPATH. The maintained full
browser command passes **65 checks with zero JavaScript errors**, in 80.035 s.
That full browser suite also exercises existing archived/synthetic views; its
scope is broader than the outcome-free planner's independent harness. No new
scientific experiment or outcome allocation occurs. The repaired 303-file
source remains unchanged throughout. All 14 mapped files were then promoted
byte-for-byte; a later documentation-only formal-reference clarification does
not change runtime bytes.

The earlier focused README/checkpoint/inventory in `focused/` are the unchanged author bundle;
this root record supersedes their pending combined-validation status. Candidate
source bindings and actual receipts support these claims. Root next publishes,
verifies exact remote/CI and retains/verifies a fresh package at that commit.
Scientific usefulness remains unestablished and all prior NO-GO results stand.
