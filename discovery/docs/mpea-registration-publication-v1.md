# Public registration before the first MPEA allocation

This prospective operational note resolves the publication requirement in the
unchanged MPEA T25 protocol and implementation contract. A public source freeze
and green CI do not by themselves publish the subsequently selected manifest,
engineering receipt and complete registration binding. No real allocation or
performance-target interpretation has occurred at this note's introduction.

## Public record and unchanged source commit

Before the first allocation, publish the annotated Git tag
`mpea-t25-registration-v1` in `alexwelcing/lupine`, pointing to the exact frozen
implementation commit on `research/lupine-discovery`. The branch HEAD stays
unchanged. This is a research registration record, not a GitHub product release,
deployment, new scientific sample or new implementation branch. Never move,
replace or force-push an existing registration tag.

Its annotation is canonical ASCII JSON followed by exactly one LF. The closed
record has these fields:

- `schema`: `lupine.mpea.public-registration.v1`;
- `protocol_id`: `mpea-t25-archival-v1`;
- `binding`: the exact closed `RegistrationIdentity.binding`, including the
  source commit, original protocol/contract/operational-amendment hashes,
  implementation-manifest hash, explicitly approved engineering receipt hash,
  CI receipt hash and registration receipt byte/content identities;
- `ci`: the original positive integer `run_id` and sorted four distinct positive
  integer `job_ids` for the successful exact-commit Discovery Verify run.

This allowlist contains no allocation, source-role assignment, feature vector,
performance cell, missingness decision, threshold, ranking or scientific result.
The immutable implementation manifest additionally binds this publication note.
It does not change the original study documents, arithmetic, population, budgets,
sampling assumptions, adequacy rules or decision gates.

## Required verification

The trusted parent authenticates the official GitHub tag reference and annotated
tag object. It requires the fixed tag name, object type `tag`, underlying type
`commit`, exact registered source commit and exact closed annotation. A
lightweight tag, changed record, wrong commit, unavailable publication or failed
identity check blocks before the worker can allocate or interpret targets.
The actual Git tag object bytes and their object identity are checked against
the authenticated publication response and retained in the parent authorization
capture. The original branch/CI/source/engineering gates still apply.

The isolated worker verifies the captured publication evidence and its binding
under the externally supplied parent-capture hash. It trusts that authenticated
parent/transport boundary; it cannot query GitHub independently. Hashes establish
identity, not the adequacy of engineering review, scientific truth or physical
independence. Recorded tagger dates are metadata, not independently trusted
timestamps. Actual execution records must establish that publication verification
preceded the first entropy request and target access.

The original allocation factory still requires the exact registered commit at
remote branch HEAD. Reproduction retains the original registration, tag, CI run
and allocation bytes, and uses only its separately restricted ancestor-checking
authority. It cannot draw again. A fresh clone or detached reproduction checkout
must contain the original annotated tag object; ordinary read-only tag fetching
does not create or replace a registration.

## Execution checkpoint

Only after the complete implementation is independently reviewed, tested,
committed, pushed and green in all four CI jobs may root create the final private
registration artifacts, publish their allowlisted record, verify the public
record and launch the original worker. Preserve the actual publication object,
authorization capture, commands and subsequent attempt prefix. Failure preserves
the observed state; it does not authorize a replacement tag, redraw, target
inspection or scientific-rule change.

This note is prospective. Its existence, a constructed tag fixture or a passing
test does not claim that an actual registration has been published or verified.
