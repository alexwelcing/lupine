# Independent feature-result evidence review

Result: PASS for the public aggregate and execution evidence from frozen commit `5b1ed62f1c7f0010682ce3f554e2430f103e4709`. No inconsistency or claim-promotion blocker found.

The two public readiness files are byte-identical: SHA256 `666b13adf2ce0c9169806aa112f39f4aff49e7eff23e2a0f8427889f325e0b76`, content seal `b5a73a3f73b2260fadef9201f96a81e3ab2326a3620cd2baf623fc8dcae881a6`. Both pass the frozen closed public validator, and the content seal was separately recomputed. All 41 implementation/reference bindings match current captured bytes and their exact Git blobs at the producer commit; the reproduction receipt binds the same map and execution-wrapper hash.

Every aggregate denominator is 1,545 rows. The reports classify 1,545 as KNOWN with reason DECLARED_COEFFICIENTS_NORMALIZED and zero unresolved/limit cases. Independently recounting the original public G15B metadata reproduces CAST 647, POWDER 95, WROUGHT 300, ANNEAL 273, OTHER 111 and UNRESOLVED 119, totaling 1,545. The one unresolved-source row remains counted. This verifies public aggregate consistency; private vectors and row-level normalized sums were deliberately not inspected.

The retained CI response binds run 38083897613 to the exact producer commit, with all four required jobs successful. Its latest job completion is 2026-10-10 20:31:34 UTC and run update is 20:31:35 UTC, before the first execution at 20:31:42.546429 UTC. Two distinct subprocess command records, stdout hashes and empty stderr match the reproduction receipt; both exit with the specified code 2 for SCIENTIFIC_SCHEMA_UNRESOLVED. The checker did not make a new remote CI query or rerun extraction.

The private artifact's reported SHA256 `ac5318c5011cb431f35874775ad144334ec757841fc30d2906b2db43213a8a57`, size 1,575,932 bytes and equality are consistent across the public/execution receipts. The wrapper source records whole-byte equality, ignored-path and private-mode checks. These are wrapper attestations in this independent review: neither local.json was opened, hashed or decoded by the reviewer.

The public schema and scope continue to say feature availability only: declared lexical coefficients have been numerically normalized, while physical composition, producer lineage, sampling independence, full scientific schema, eligibility and predictive usefulness remain unestablished. No targets, target presence/missingness, splits or fits are claimed. This evidence does not authorize or establish the prospective archival study.

The executed checker uses a cache-read allowlist that rejects other cache paths and symlinked cache accesses. It opened only the named public aggregate/execution/log records and wrapper in the feature-run cache, plus published metadata and source files; it did not access raw scientific cache or private vector artifacts. No main files were edited. The first checker run passed with empty stderr; source and all reviewed input bytes remained unchanged during the check.

Evidence is adjacent: check_public_execution.py, check-v1.execution.json, check-v1.stdout.txt, check-v1.stderr.txt and review-v1.json. The checker is a historical fixed-path review artifact with exclusive output creation, not a portable user-facing rerun CLI.
