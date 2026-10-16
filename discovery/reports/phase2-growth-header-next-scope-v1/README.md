# G31 block: remaining predicate families and one bounded next audit

The observed block is still **unlocalized within G31's remaining header
predicates**. The two canonical public receipts are identical, SHA-256
`01cce9e57b26e204a9d31959f747768c70abf7543bedb6ab104b3b4b623f094f`,
produced by `c17c4c6b152af2e7bc1b7a7639336f6b0f733ace`. They report
`BLOCKED_SCHEMA / BLOCKED_LAYOUT / ZIP_LAYOUT_UNSUPPORTED`. This does not
identify archive corruption, a particular member, unsupported bit or failed
scientific assumption.

This source/public-receipt review ran no source reader or production guard and
read no private object or capture. The [80-check binding record](public-source-binding.json)
matches the exact two public receipts, producer, source pins and committed
code; its first execution exited 0 with empty stderr in 0.320503 seconds.
This author implemented G31, so the review is a control-flow and public-evidence
interpretation, not an independent correctness audit of G31 or certification
of its CI/package/operational gates.

## What the observed progress establishes

G31's selected G29/G30 predicate completed with a matching retained growth-hint
shape and successful separate cleanup. Its own raw central declaration
preflight completed; the archive and directory-name parsing completed. The
full-header stage started but did not complete. The own archive closed without
error. No member decompression or XML decoding started, inspected XML bytes
are zero and recognized roles/member count remain null.

The full traversal reports **three completed nonempty local-extra areas**, each
with a completed fixed-word pair interpretation and padding scan. These are
software progress counters, **not three members total**, three scientific
examples, or proof that only three areas exist. Entries with empty extras do
not increment these counters; additional entries or areas may be unvisited.
The third completed area is not identified as the failing member. At least
three corresponding entries reached their local-growth check successfully;
the selected preliminary check is a separate stage, not an additional
independent scientific observation.

The first actual stop therefore occurred within a later iteration of the
member loop, or at its final aggregate checks. An iteration can contain no
local extra area. The public receipt does not distinguish these locations.
The `local_growth_payload_interpretation_completed=false` flag means the full
traversal did not finish; it does not reverse the three completed scans.

## Source-level candidates

The following retained sites can emit the observed generic reason. The source
references identify the frozen implementation and its unchanged helpers;
they do not assert that any listed value has been observed in the archive.

| Site | Remaining predicate families |
| --- | --- |
| `custody._canonical_member`, called from the loop | Empty/long/absolute/trailing-directory/unsafe/non-ASCII path syntax and forbidden path components or characters. |
| G31 loop name check | Parsed/original member-name agreement and duplicate canonical names. |
| `custody._member_type`, called from the loop | Membership in the fixed known part-name/type patterns. This checks the name profile, not actual XML content. |
| G31 central-entry compound check | Allowed flags, method, extraction version, ordinary file-kind/directory attribute, equal stored sizes and expected contiguous local offset. The check also retains central extra/comment tests; see the preflight redundancy note below. |
| G31 local-entry compound check | Local signature; local/central version, flags, time, date, method, CRC-field, compressed-size, uncompressed-size and name agreement; bounded data end before the central directory. CRC-field agreement does not verify payload CRC because no payload was decompressed. |
| G31 final aggregate check | Last data end versus directory start, reconstructed central-directory size, and presence of all four required envelope members. No workbook relationship or XML semantic check has run. |

The successful raw preflight already checked every central declared extra and
comment length was zero and consumed the exact declared directory count and
extent. Under the ordinary faithful ZIP parser, nonempty parsed central
extras/comments cannot independently explain a later failure. Likewise some
name-transformation and reconstructed-size checks may be redundant after
faithful decoding and all earlier path/framing predicates. They should remain
in an exact diagnostic mapping rather than being removed based on this
source-only argument. The receipt does not expose their individual outcomes.

The earlier EOCD/count/directory-opening gates cannot be the executed stopping
site after three completed areas. A newly encountered growth-shape rejection,
raw central declaration rejection, local fixed-header bounds failure, parsing
exception or cleanup failure would have a different closed reason in this
source. This rules those branches out as the **recorded stop**, not as possible
unvisited defects elsewhere in the archive. Header predicates remain stricter
than general ZIP/OOXML standards; failing one is not automatically corruption.

## Recommended next scope

Use **one separately frozen categorical all-entry audit**, detailed in
[proposal.json](proposal.json), with exact first-rejection equivalence to G31
and aggregate results for all safely evaluable predicate families. Preserve
the first failure while checking later independent central/header conditions
where their explicit bounds permit it. A family whose dependencies are unsafe
or unavailable must remain `NOT_CHECKED` or partial, even if other checks pass.
Do not convert a skipped predicate into success or conflate the broader audit
with acceptance under the original sequential profile.

This is more direct than another single-field diagnostic: it can expose
multiple independent remaining restrictions in one bounded operation, allowing
one coherent, evidence-supported compatibility decision. It does not promise
that all defects are observable without decompression or that later scientific
schema gates disappear. It changes no existing predicate and authorizes no
automatic format relaxation, altered bytes or fallback reader. New production
source, independent synthetic tests, exact CI/package/artifact gates and root's
verified prerequisite remain required before any actual new invocation.

The next audit reads the same fixed bounded source and structural metadata;
bounded local-extra payload checks, if reached, are explicitly additional
interpretation. It opens no ZIP member, XML, worksheet or shared-string payload.
Public output is closed categorical evidence and honest progress, without raw
names, offsets, lengths, flags, content or hashes of members. Every result stays
scientifically `BLOCKED_SCHEMA`; replay does not supply independent science.

**Design only:** this directory contains no implementation or execution of the
proposed diagnostic. Root requested publication of the current increment before
further runtime work. The pure two-sheet layout candidate remains unbound:
actual G31 did not establish `ENVELOPE_VALID`, so it supplies no qualifying
prerequisite for worksheet access. G20 remains unresolved and G21 blocked.
