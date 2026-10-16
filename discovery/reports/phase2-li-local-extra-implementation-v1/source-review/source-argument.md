# Independent local-extra source argument

This is a source-level engineering argument. It is not a Lean proof, Python
refinement theorem, runtime test or interpretation of the actual archive. The
final review receipt binds the exact candidate and contract reviewed. The
separate executable reviewer owns its own fixtures and execution receipts.

For the locator, the indispensable premise is the unchanged predecessor's
exact sole local-extra classification on the same immutable byte string, with
completed archive cleanup. All earlier entries therefore passed their central
and local checks. If its contiguous position is `p`, an earlier entry has
local extra length zero, a local-header offset recorded by the directory equal
to `p`, and local compressed size equal to its directory compressed size. The predecessor advances to
`p + 30 + name_size + compressed_size`. The candidate advances to exactly
that same position. Both start at zero, so induction gives equality of their
positions until the first positive extra length. That is the predecessor's
rejected entry, rather than an independently selected member.

The candidate checks the complete 30-byte header, then the name, extra and
compressed spans against the directory boundary using subtraction bounds.
Unsigned unpacked integers and those bounds prevent backward movement or
overshoot. The directory-end check bounds the directory position by the raw
buffer. The loop has at most the already bounded member count. These checks
do not make the locator a general ZIP validator; without the exact predecessor
premise it must not supply an accepted production inventory.

For the TLV walk, let `s` and `e` be the selected span bounds. At the start of
each iteration, the invariant is `s <= cursor <= e`, with the already recorded
prefix length equal to the sum of `4 + data_size` over its records. The cap is
checked before interpreting another header. Four available bytes give exactly
two unsigned little-endian 16-bit integers. Requiring the declared length to
be at most `e - cursor - 4` preserves the invariant after advancing by
`4 + data_size`. Progress is at least four bytes, including zero-length data.
Successful return requires `cursor == e`; incomplete trailing bytes cannot
disappear. At most 256 records are published, in original order with duplicates.
At the cap, any remaining bytes cause the limit error before another read.

The loop interprets only its four-byte headers. Its raw-byte operations on field
bodies are limited to advancing an integer cursor; it does not slice, decode,
hash, recurse into or apply body values. This claim concerns the added local
walk. The production source is still read and hashed in full, and the unchanged
predecessor still parses directory metadata. It would be incorrect to describe
the whole operation as having acquired no payload bytes.

The candidate accumulates records privately and publishes them only after the
walk returns. A walk or locator exception sets `field_headers` to null. The
same report and exposure dictionary are mutated throughout predecessor,
locator, walker and production wrapper, so those errors do not replace an
already exposed report with a fresh untouched one. Production write or output
close failures also clear the public field inventory and retain the existing
exposure. If the output close fails after an immutable receipt was written,
returned stdout may differ from that receipt; a future operation audit must
detect that discrepancy rather than select the more favorable copy.

The fixed prerequisite hash is checked before private capture/object reads.
The committed source guard binds the new four files and all predecessor
groups. The synthetic API rejects the known actual source identities; its
inputs cannot select a production path, URL or producer. These are controlled
workflow conditions, not a security claim against a caller who can monkeypatch
Python or replace the process environment.

None of this establishes the semantics of any extra-field body, a unique
meaning for an ID, a valid ZIP64 or Unicode name override, later archive-entry
acceptance, XML validity, dataset readiness or statistical independence.
Existing profile rejection and scientific claim gates remain in force.
