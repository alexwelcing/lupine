# Private contract conformance review

The [C1–C9 map](correction-closure-map-v1.md) identifies exact controls, source
holds and outstanding gates. Fourteen private integration checks pass on held-v1;
four decision-view checks pass on held-v2. Only the decision helper changed between
these holds. Final main integration will execute all promoted controls on v2.

Thirty lossless wrappers preserve the allowlisted source/tests, initial alias
failure, corrected checks, exact source transition, and portable candidates.
Root checked every original byte count/hash before wrapping. No generated source,
feature, target or attempt payload is included. Two original core review fixtures
receive only required input identity metadata; 95 assertion calls stay unchanged.
The original fixtures and exact adaptation patch are preserved.

The portable main tests have been copied, not yet executed. Backend final-pair
completion and whole-source publication/CI remain separate gates. No actual
scientific allocation or performance-target interpretation is reported.

The [final held-v3 map](v3/correction-closure-map-v3.md) closes all C1–C9
findings within reviewed implementation scope. Twelve new independent companion
controls and one scope-authentication control pass on final held sources. The
58-file allowlist is preserved by exact existing wrappers plus additive `v3/`
wrappers; the copy ledger states which. Root verified every original again.
Main full-suite and exact-commit CI remain separate pending gates.
