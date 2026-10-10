# Incubate Lupine Discovery on an isolated Lupine branch

Alex Welcing explicitly directed this project to use a branch in
`alexwelcing/lupine`, with a separate repository deferred. The implementation
lives in `discovery/` on `research/lupine-discovery`; its standalone source
history remains available for later extraction. This direction takes precedence
over the general repository rule routing new engine development into Rhizo.

The scoped Python package, local research interface, proof package, reports and
dedicated CI are self-contained. Existing Rhizo and Library ownership remains
as recorded in the research release map. No production deployment or merge is
part of this incubation decision.

The durable [goal](../../discovery/GOAL.md) owns autonomous execution. The
[claim ledger](../../discovery/docs/claim-ledger.md) separates conditional
theorems, tested software and archived observations. The
[release matrix](../../discovery/docs/release-validation.md) preserves failures:
current engineering supports a research preview, while the constrained
experiment does not pass predictive-superiority gates.

See [hosting and extraction instructions](../../discovery/HOSTING.md) for the
monorepo boundary. Splitting the project later does not require rewriting the
scientific evidence or concealing its negative results.
