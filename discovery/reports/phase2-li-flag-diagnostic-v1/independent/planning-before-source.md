# Independent Li flag-diagnostic implementation review

Owner: `/root/phase2_planner`. This directory is separate from the standards/design
review at `.cache/phase2-li-flags-review-v1/`. Candidate implementation review and
synthetic execution are pending a stable source/API checkpoint. No test pass or
real-source classification is claimed by this planning note.

The reviewed design requests a category for the **same first** `MEMBER_FLAGS`
failure selected by the frozen header diagnostic. It must not promote a flag
category to structural acceptance, local-header agreement, schema readiness or
sampling independence. Method context matters: method-8 options alone are a
narrower proposal than APPNOTE's definitions for methods 8/9; method 9 remains
outside this source-specific profile. Bit 3 is a declaration, not proof of a
valid descriptor. Encryption/masking has precedence over other set bits.

Planned independent synthetic challenges:

- Enumerate accepted method-8 option sets and method-specific descriptor sets,
  both with and without UTF-8; challenge encryption/masking precedence, every
  reserved bit, method 6/9/14 differences and mixed combinations.
- Build ZIP headers independently with opaque invalid-XML payloads. Reorder
  central entries to verify local-offset traversal. Earlier path, method and
  local-header failures must prevent disclosure of a later flag category.
- Require a closed public shape, unchanged negative scientific fields and honest
  raw/name-decoding exposure. Vary opaque canaries without semantic-output change.
- Forbid member open/read/extract, decompression, XML parsing and network/DNS APIs
  while diagnostics run. Source inspection supplements these finite guards;
  no hostile-Python security boundary is claimed.
- Challenge bytes/type/resource limits and the synthetic-real-source exclusion
  using fake hashes, without obtaining the actual source.
- Confirm an ignored script path rejects production context before git or cache
  access. Challenge exact frozen-source/capture bindings with synthetic stubs,
  never the production object or private receipts.

Permitted review inputs are public source code, the already-retained public
APPNOTE and synthetic fixtures. Historical `.cache/li-v3-custody/` paths named
in other evidence will not be opened by this reviewer. No archive acquisition,
private custody access, network request, tracked edit or scientific choice is
part of this review.
