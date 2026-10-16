# Constructed-data persistent driver

This is a synthetic integration implementation, not the registered archival runner.
It has no archive/cache input path, actual allocation or entropy API. The fixture
source rejects the known real archive SHA. No actual MPEA targets or private
feature artifact were used in this work. The separately frozen parser and
mathematical kernel are unchanged.

`mpea_fixture_driver.run_fixture(case, attempt, sampling_premise='unsupported',
checkpoint=None)` accepts an immutable constructed `FixtureCase`. The case must
preserve the actual-shaped 1,545-row funnel, 314 condition rows, 75 source groups
and 35/20/20 role counts, with zero-based original ordinals. Feature objects use
the mathematical kernel's own `NormalizedVector` class; the frozen feature reader
can reload the representation module without making its replacement class object
the kernel's accepted type. A source-only reload test covers this boundary.

The driver stores all eight stages under the ignored
`.cache/mpea-study-custody/attempts/`, regardless of whether its source resides in
scratch or is promoted to `scripts/`. Existing attempts cannot be overwritten.
Files have captured directory handles, no-follow bounded reads, temporary-inode
flush before exclusive publication, inode/byte verification and anchored cleanup.
The store guarantees integrity and stage order for a serialized fixture writer.
It is not a semantic verifier, concurrent-writer protocol, recovery journal or
sandbox against a malicious local operator. Independent filesystem findings and
their first failing logs are preserved in `review_store/`.

The allocation and input-freeze payloads are reconstructed from the immutable case
and compared to sealed bytes before development decoding. Adequacy is computed
from parsed status counts; the development artifact is sealed before the kernel
receives labels. An inadequate fixture returns no fit and never opens reserved
cells. Before reserved decoding, the driver validates the scientific rank seal
and every reserved panel against both original metadata and the sealed 75-panel
rank table. The role-blind custodian then interprets all 40 reserved panels and
writes separate calibration/evaluation vaults. It exposes only completeness,
whole-vault identities and closed status aggregates to earlier consumers.

Calibration reads only its own vault. Both populations' complete decision and
schedule payloads are sealed before an evaluator is issued. The custodian checks
exact kernel plan types and canonical payload equality, not just supplied digest
strings. The trusted central scheduler receives the evaluator and allocates one
`PolicyOracle` per sealed schedule. A consumer gets only that bound oracle:
`request(record_id)`, `reveal(token)`, `history()` and `finish()` take no policy,
plan or panel selectors. Issued oracle identity and pending token object identity
are checked. Equal-looking, changed, replayed or foreign tokens do not grant a
reveal; a consumer cannot redirect an ordinary API call to another policy's
history or budget. Python private members are not a hostile-code boundary.

All 960 policy ledgers must finish and be sealed before the issued evaluator can
request complete original future truth for the final mathematical audit. The
kernel is the sole predictor, ranker, calibration and metric implementation.
Missing primary outcomes stay unknown; the secondary population is a literal
complete-record restriction with all empty panels preserved. No new statistical
premise status is introduced.

Private files retain exact labels, predictions and ledgers. Compact rank/plan
artifacts reference fit and original mathematical digests without recursively
embedding the entire development fit inside every prediction or decision. This
fixture implementation reruns from original constructed inputs in a fresh
process and compares all scientific stage identities. It does not resume from
unvalidated disk plan dictionaries. Registered production reloads, envelopes,
CI/source gates and allocation custody remain a separate implementation step.

`mpea_fixture_worker.py` accepts only a closed constructed scenario and attempt
name. It connects the driver callback to the independently reviewed supervisor's
acknowledged marker socket. Target timing begins before the development decoder.
An inadequate development result emits an explicit negative terminal; a failed
stage never emits scientific success. Network isolation is an actual Linux user
and network namespace. Resource enforcement is measured aggregate RSS polling
plus leader exit peak RSS, not an instantaneous resident-memory proof. The root
owns the separately bound operational-enforcement clarification.

The public aggregate projector is a separate backend-owned component. This
private driver does not serialize a private evaluation object directly into a
public report. No fixture result is a scientific MPEA performance result.
