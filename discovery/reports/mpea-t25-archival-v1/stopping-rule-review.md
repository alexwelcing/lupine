# Frozen stopping-rule review

The original v1 operational execution is permanently `BLOCKED` /
`INPUT_IDENTITY_MISMATCH`, with no scientific performance verdict. Do not retry
that attempt, alter its tag, discard its records or convert the absence of a
scientific report into a usefulness result.

The protocol limits **actual allocation**, rather than merely counting process
launches: [protocol lines 115 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-t25-archival-protocol-v1.md#L115)
states “There is one actual allocation per registered version.” Nevertheless,
[lines 267 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-t25-archival-protocol-v1.md#L267)
forbid automatic retries, and
[lines 274 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-t25-archival-protocol-v1.md#L274)
make identity conflicts a dependent-stage stop. A failure is not a standing
exception to those rules.

The scientific attempt cannot be inferred from `attempt_result_identity=null`
or `post_terminal_private_receipts_decoded=false`. The frozen
[launcher lines 165 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/scripts/mpea_archive_run.py#L165)
initializes those values for every run and opens terminal private reports only
for COMPLETE or insufficient-development terminals. A blocked run can have
made earlier progress.

The specific authorized handoff supplies stronger evidence: no supervisor stage
seals, no target-phase entry, a source-bound diagnostic that passes the captured
worker registration then fails public metadata validation, and exact lstat
absence observations for the attempt directory, protocol/source registry
directory and allocation marker. The
[frozen worker lines 45 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/scripts/mpea_archive_worker.py#L45)
validates metadata before constructing the store or calling allocation. Under
this source-bound cooperative execution, the evidence locates this failure
before the scientific allocation provider and before target interpretation.
It does not prove universal past secrecy or the absence of another operator.

| Reached boundary | Permitted conclusion and next action |
| --- | --- |
| Boundary not established | Preserve BLOCKED; no inference of zero access or unconsumed allocation; no retry. |
| Verified failure before store/registry-marker/provider/target entry, as in this handoff | No scientific allocation was consumed by this run. Preserve the failed operational attempt. Source-only repair and prospective review remain possible; the failure itself authorizes no rerun. |
| Allocation-attempt marker or scientific entropy request exists, but no complete authenticated allocation | No replacement sequence. The contract preserves interruption and forbids another draw sequence; never delete the registry or change identifiers to evade it. |
| Complete authenticated original allocation exists | Only the separately specified fresh-process, no-entropy reproduction may be considered, subject to all of its gates. A sealed allocation alone does not establish that the current launcher can authenticate a failed original terminal. |

The exact no-redraw boundary is explicit in
[contract lines 179 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-t25-implementation-contract-v1.md#L179):
the marker and request precede the callback; an interrupted request cannot be
replaced. The frozen
[allocator lines 419 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/scripts/mpea_registration_allocation.py#L419)
also refuses an existing marker before drawing, keyed by protocol and source.
Its conservative marker boundary must remain intact even if a marker exists
without a completed draw.

Same-process restarts and later-stage resumes are forbidden by the
[operational amendment lines 44 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-t25-operational-enforcement-v1.md#L44).
Fresh reproduction uses the original sealed allocation. The
[publication note lines 64 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-registration-publication-v1.md#L64)
preserves failure and denies replacement-tag/redraw authority; its
[lines 11 onward](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-registration-publication-v1.md#L11)
forbid moving or replacing the registration tag.

The proposed separately published **v2 engineering recovery** is a reasonable
exercise of Alex's existing implementation, testing and research authorization,
conditional on preserving the demonstrated zero-allocation boundary and every
scientific rule. It requires a new explicit prospective engineering/publication
amendment, corrected source review, execution tests, source freeze, approval,
four exact-commit CI passes and a distinct fixed tag before any allocation.
This is a new registration generation, not reproduction or an automatic retry
under the old tag. Any claim that frozen v1 itself authorizes source repair and
re-execution would be inaccurate. The accompanying draft states the narrow
versioned exception explicitly and leaves the original documents unchanged.

The correction must verify each metadata producer's exact documented seal
preimage while retaining the pinned whole-file hashes, closed schema and all
identity checks. Do not remove seal checks or accept both arbitrary encodings as
a convenience. The amendment must be a mandatory member of the new source
manifest; its hash is then bound through the new public registration. Reuse
neither the old engineering approval nor old exact-commit CI for changed code.

The original outcome remains an engineering failure, not
`NO_GO_ARCHIVAL_USEFULNESS`. The
[contract line 456](https://github.com/alexwelcing/lupine/blob/9704ef46c1d0ab098dabb083199403a6296f7cf6/discovery/docs/mpea-t25-implementation-contract-v1.md#L456)
requires no overall performance verdict for a blocked run. No authenticated
worker projection exists in this handoff, so the optional scientific report
resource stays absent; the closed operational summary belongs in reports.

No retry, amendment adoption, source edit, entropy request or target read was
performed by this review. Earlier source acquisition and disclosed paper exposure
remain historical facts; “no target interpretation in this attempt” must not be
rewritten as “these scientific observations were never previously available.”
