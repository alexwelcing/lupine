# Registration/allocation implementation boundary (draft)

Parent registration verification is live: exact official GitHub repository/branch
commit plus the identified Discovery Verify run and all four completed/success
job IDs. No arbitrary supplied green JSON authorizes production. A trusted parent
captures official responses before launch, persists them privately, and passes
that capture's expected whole-file hash to the network-isolated worker. Offline
worker verification binds registration, source manifest and capture and expressly
trusts that parent/transport boundary. It does not re-authenticate GitHub offline.
Synthetic injected evidence is a separate API and produces fixture identities;
production allocation rejects them. No production verification/allocation is
being invoked during authoring.

The immutable registration binding contains commit, protocol_sha256,
contract_sha256, operational_amendment_sha256, implementation_manifest_sha256,
engineering_receipt_sha256, ci_receipt_sha256 and registration receipt identity
{bytes_sha256,content_sha256,scientific_sha256}. Exact manifest closure covers
registered source/test/formal/workflow/specification and pinned public metadata
bytes. A source hash proves identity, not scientific correctness.

Metadata loading reads pinned public B/C/header/mapping metadata only, never the
CSV or private feature/target files. Production population checks remain 1545
original rows, 314 exact T25 rows,75 source groups, and23 header fields. Allocation
uses fixed salt/hash development35 then unchanged sampler on40 sorted numeric IDs.
A durable exclusive registration-specific first-attempt marker prevents an
accidental second draw sequence. Every request marker is fsynced before callback;
every complete response/disposition is sealed before another callback. Failures
and interrupted prefixes remain. A callback failure never restarts allocation.
Production provider is os.urandom; only separate fixture entry accepts injection.

Reproduction verifies the original complete allocation/transcript/routes, never
calls any entropy callback, and keeps original allocation kind unchanged; its
attempt marker separately says REPRODUCTION_FIXED_ALLOCATION. Route manifest
covers every original row; active non-T25 rows inherit role but remain target
inaccessible. Unknown source is not merged into another group. Tuple RowRoute
API and immutable Allocation expose routes,header,development/calibration/evaluation
groups,allocation_identity,route_identity and sampling_premise. No entropy/sample-
independence status stronger than assumed_unverified/unsupported is created.

Custody owns feature overlap aggregation during prepare_inputs before development
targets. Registration/allocation supplies fixed role/routes and public formula
IDs; unknown composition must not be grouped as a shared zero descriptor.

Current handoff corrections (draft, pending independent signoff):

- Production identities originate only from parent live verification or the offline worker factory with an externally trusted parent-capture hash. A fixture mode relabel does not receive that factory authority.
- The manifest closure includes pinned header metadata and retained sampler source/test/README/engineering/review evidence. Captured JSON reads are bounded to 8 MiB; binary floats, duplicate keys, depth above 32 and strings above 2048 characters reject.
- Store artifact name is `label-routes.json`, schema `lupine.discovery.mpea.label_routes.v1`. Allocation `inputs` is exactly `{'label_routes': route_identity}`; payload also binds `route_artifact` and `role_map_sha256`.
- `Allocation` retains verified original allocation/route bytes privately. `load_original_allocation` verifies the original store and reads allocation bytes even after later stages. Reproduction calls `import_original_allocation` and preserves original bytes and all three seals; no new sampler call, entropy draw, route reseal or allocation recommit occurs.
- Actual source/target authorization still belongs to authenticated parent/driver and metadata gates. Constructed registered-format store tests do not authenticate a scientific archive or establish runtime formal refinement.

Parent engineering authorization is explicit: `verify_registration(path, *,
approved_engineering_sha256=...)` requires the exact receipt hash reviewed and
supplied by the trusted parent. It is a trusted input, not independently proved
by a self-sealed PASS or a test count. The receipt additionally binds complete
manifest-equal `source_before` and `source_after` mappings and captured no-skip
command logs. The parent authorization capture records that approved hash;
the isolated worker verifies it against the externally supplied parent-capture
hash and registration binding. Python/stdlib, Git/GH executables, authenticated
GitHub transport and that parent review remain explicit environment assumptions.
The manifest also binds `pyproject.toml`, both feature-readiness process
`readiness.json`/`execution.json` reports and their root `reproduction.json`.

Final candidate additions:

`verify_reproduction_registration(path, *, approved_engineering_sha256=...)`
uses the original registered commit/manifest and original successful four-job CI.
The trusted parent queries the official compare endpoint for that exact original
commit and the live authorized branch head. It requires the original base/merge
base and an `ahead` or `identical` result with zero commits behind. Local HEAD
and all executing registered bytes must still match the original exact checkout.
The original parent verification route continues to require exact remote HEAD.
The capture records `authorization_kind`: `ORIGINAL_ALLOCATION` or
`REPRODUCTION_FIXED_ALLOCATION`. Offline verification propagates the latter as
`REPRODUCTION_WORKER_PARENT_TRUST`; the parent mode is
`REPRODUCTION_PARENT_LIVE`. Both may read verified metadata/source, but neither
reproduction mode may request an allocation without the verified original.

The durable ledger directory is keyed by the frozen protocol and source hash,
not by replaceable registration bytes. Its marker still binds the original
registration and metadata. New directory entries are fsynced through their
ancestor chain before the provider callback. A replacement registration cannot
redraw after an attempt, including interruption. The original successful
transcript requires exactly its marker and request/response files through the
first accepted draw; gaps, extra requests, symlinks and nonfiles reject.

`load_original_allocation_bytes(context, registration, stage_raw,
stage_identity, route_raw, route_identity, *, registry=None)` supports a fresh
process without reopening/resuming a store. It verifies whole-file identities,
source-bound store envelopes/seals, exact typed route/payload reconstruction and
the original durable ledger. Registered contexts cannot override the production
ledger path. Expected original artifact identities must come from authenticated
custody. `load_original_allocation(..., original_store, registry=None)` delegates
to the same verifier when an in-process store already exists. These gates never
call an entropy provider. Actual filesystem capture/anchoring and frozen command
selection remain the production caller/store's responsibility; a hostile
operator or arbitrary Python code is outside this cooperative-process boundary.

The authored actual-store test uses only constructed rows and a fake source.
It completes eight stages, verifies captured original artifacts in a new Python
process, and imports identical original bytes into a reproduction store with an
entropy callback that fails if called. This demonstrates the tested handoff,
not physical validity, entropy attestation or formal refinement of Python.

Public registration gate (prospective; no actual tag created):

The fixed tag `mpea-t25-registration-v1` must already be publicly available.
`public_registration_record(binding, run_id, job_ids)` returns only the closed
schema/protocol/binding/CI identity map. Its annotation must be canonical ASCII
JSON plus exactly one LF. The immutable source manifest now additionally requires
`discovery/docs/mpea-registration-publication-v1.md`; specifications still have
only the original three keys.

Both parent factories require `_official_public_tag()` before authorizing a
worker. The capture has exactly `ref`, `tag` and `raw_tag`: official reference
and annotated-tag responses plus exact UTF-8 local Git tag-object bytes. The
validator recomputes the Git SHA-1 object identity, requires annotated-tag and
underlying-commit types, fixed name/original source commit, exact four object
headers, matching API tagger identity/date, and the closed annotation matching
original registration and original four CI job identities. Missing/changed,
lightweight, wrong-target, noncanonical, signed/extra-message or invalid evidence
blocks. The local parent checkout must contain the public annotated object.

Parent authorization adds mandatory `public_tag`. Offline validation checks
that same evidence under the externally trusted parent-capture hash; it never
calls the network. Tagger date is authored metadata, not authenticated publication
time. Parent execution evidence must show live public verification before first
entropy/target work. This authenticates publication through GitHub and the parent,
not a publisher signature or scientific law. Original exact branch-HEAD gates,
reproduction-only ancestor authority and single-attempt ledger remain unchanged.
The publication note prohibits moving/replacing the registration tag. Prior
51c/36-test and 935f API evidence is preserved under `history/pre-public-tag/`
and the original independent review records, not claimed current after this change.
