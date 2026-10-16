# Compatible ZIP diagnostic candidate

This increment adds a categorical engineering diagnosis of the first rejection
in the unchanged Li v3 compatible ZIP profile. It opens or decompresses no
members, decodes no XML, changes no profile, and confers no scientific approval. The actual
compatible-envelope negative result is preserved: both observed runs stopped
with `BLOCKED_LAYOUT / ZIP_LAYOUT_UNSUPPORTED` before decompression or XML.
The next documentary layout stage remains blocked.

The new diagnostic preserves the original primary group ordering and reports
every failing conjunct in the first rejected group. If a central entry fails
and its expected local offset and fixed header bounds are safe, it additionally
reports that same entry's local failures in a separate supplementary list.
It never proceeds to another entry after rejection. Source review found no
legacy-validator reentry in the failed compatible envelope; the new actual
cause remains unknown until a separately verified production invocation.

The candidate contract is `docs/li-v3-compatible-zip-diagnostic-plan.md`.
`source-bindings.json` binds all 17 unchanged predecessor files and the exact
observed public prerequisite receipt. The fixed receipt binding is SHA-256
`7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07`,
producer `4492858d9e55ddfa3cca2e208063799517948b13`. Only that named public
receipt was read during candidate work, with root authorization; no actual
raw workbook, archive payload or private cache traversal occurred.

## Executed author checks and preserved limitation

The first invocation (`author-first/`) passed 16 test methods in 0.142 seconds
at source `f4d99799f55e890fdf68a4eebc2343cfb4c4a16ecc7227ae9938a9721b5d8925`.
It was not a clean exception-channel result: an unconditional fault-injected
`ZipFile.close` raised again from `ZipFile.__del__`, printing a synthetic canary
to stderr despite the report containing only fixed error fields. The complete
first source, test, contract, stdout, stderr and execution receipt are retained.
There was no real private-data exposure; the canary is synthetic test content.

The correction detaches the diagnostic-owned in-memory handle after a failed
archive close, retaining the completed classification and exposure. The final
fault fixture raises before closing only while the handle is open, forces
garbage collection and asserts empty stderr. This represents a failed close
with an open handle; an arbitrary monkeypatch that always raises even with
`fp is None` overrides the normal Python close contract and is not claimed to
be contained. Standard read-only `ZipFile.close` normally clears `fp` before
its `_fpclose` call. The initial unconditional fixture and its noise remain
visible rather than being reinterpreted as evidence of safety.

The final author invocation (`author-final/`) passed the same 16 test methods
in 0.133 seconds at source
`59b4b549a1de33abf2c54ccfce15f4f980a3a36351f98e246ae4e9fd6c44c5d3`, with
no canary or unraisable exception in the retained stderr. The test and contract
hashes are bound by the execution receipt. `cleanup-correction.patch.bytes.json`
losslessly retains the exact source, fixture and wording diff as base64, with
its byte count and SHA-256; its whitespace-only context lines are preserved.
Both attempts held their source bytes
unchanged during execution.

Author checks include exact AST correspondence for all six compound rejection
groups, equality of the 17 predecessor pins, compatible primary acceptance
across stored/deflate flag cases, same-entry aggregation and first-rejection
locality, every local agreement field, no payload opening, opaque canary
invariance, cleanup failures, exact-source and prerequisite ordering guards,
positive fully synthetic source contexts, output conflicts, partial-read
unknown exposure and constant CLI errors. Mocked production tests are labelled
synthetic and do not attest to real provenance or production execution.

## Publication state

The independent first executed invocation passed 24 test methods in 0.410
seconds (0.808 seconds process elapsed) at the same held script hash. Its
separately authored fixture builder does not import the author tests and checks
the full category boundary matrix, primary compatibility, safe supplementary
scope, prohibited decompression, source/receipt guards and both cleanup
channels. Its explicit close-fault test captures stderr and Python's
`sys.unraisablehook`, forces garbage collection, and preserves the same
classification and exposure. Final review details and hashes accompany the
independent receipt bundle.

Root owns
integration, final source review, source publication, actual CI and clean
package verification. No new production diagnostic invocation has run in this
candidate work. An actual result must be retained separately after those gates.
Header acceptance, if reported, would still be `BLOCKED_SCHEMA` and would not
establish CRC validity, XML validity, documentary semantics, outcome validity,
row eligibility, sample independence, power or scientific superiority.
