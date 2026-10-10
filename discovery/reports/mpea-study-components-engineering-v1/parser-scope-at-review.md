# Synthetic MPEA study custody workstream

This ignored scratch directory implements the custody side of the prospective
`mpea-t25-archival-v1` design. It is **not registered for production**, does not
authorize target access and does not contain experimental data. The reviewed
scientific documents remain in `../mpea-protocol-design/`.

`scripts/mpea_target_custody.py` is currently the only implementation. Its APIs
take explicit constructed fixture bytes and have no file, network or entropy
reader. The known experimental source identity is rejected. `FixtureSource`
checks byte limits before hashing and verifies the same captured immutable bytes
before framing. `FixtureRoutes` binds every original ordinal and source role.
The route-aware byte scanner accumulates only authorized target columns and
finishes structural/count validation before invoking a numeric decoder.

`parse_target` implements the draft's bounded exact decimal interpretation;
`Target` and `TargetRow` preserve finite, missing, unsupported, resource-limited
and negative-conflict states. No cell text, per-value hashes or exception details
are logged. `summarize_targets` returns aggregate fixture status counts only.
The scanner's framing rules derive from the unchanged historical metadata
scanner; this is a new sink with explicit target authorization, not an assertion
that the old scanner already had that capability.

The pure fixture parser exposes DEVELOPMENT-only or jointly CALIBRATION/EVALUATION
selection. It **does not itself establish a persistent stage capability**. The
next component is an immutable stage driver that seals routes before development
decoding, calls the separately owned math kernel to fit/freeze ranks, then permits
role-blind reserved custody and seals all pools before oracle replay. That driver
must consume `../mpea-study-engine/scripts/mpea_study.py`; this lane will not build
a second predictor, calibration rule or ranking implementation.

The initial 13 tests use only constructed byte strings. They include unauthorized
role/column canaries, invalid UTF-8, source mismatch before parsing, late framing
failure before any numeric decoder, decimal/exponent/bit guards, exact zero and
negative-state semantics, immutable fields and constant errors. One initial test
incorrectly expected `10**154` to exceed 512 bits; it is exactly 512 bits, so the
fixture boundary was corrected to `10**155`, without changing the parser.

Run from the discovery project:

```sh
python -m unittest discover -s .cache/mpea-study-custody/tests -p 'test_mpea_target_custody.py' -v
```

No actual group allocation, OS entropy, feature extraction, archive target read,
model fit or scientific evaluation was performed by this workstream. A future
production entry requires separate review, registration, published source and
green CI. The source and tests here are still an unfrozen synthetic prototype.
