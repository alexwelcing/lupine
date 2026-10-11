# Private MPEA custody retention: source-only recommendation

**Recommendation:** preserve a narrowly enumerated, exact-byte private evidence
bundle, then verify a second copy outside this workspace. An archive left only
in this workspace does not protect against workspace loss. No bundle was created
and no private input, attempt, feature file, vault or registry was opened for
this review.

There is **no implemented MPEA custody bundle/export/restore command** in the
reviewed producer. `python scripts/package_smoke.py --retain-directory ...`
preserves the tested wheel and committed source; it deliberately excludes ignored
`.cache` inputs and provides no scientific-custody backup. Use it for its existing
software-artifact purpose, not as proof that the private experiment survives.
The proposed evidence copier is a new operational retention utility, outside the
frozen experiment's implemented workflow. It should be reviewed and tested with
synthetic files before any authorized capture. No post hoc scientific rule change
is needed to preserve existing bytes.

## Exact proposed copyset

Root supplies an explicit manifest of existing original/reproduction paths and
authenticated whole-file hashes. Resolve no names by searching for a successful
attempt. The following are producer-defined names, not a claim that a proposed
backup already contains or has verified them.

| Component | Narrow allowlist and identity source |
| --- | --- |
| Each of the two completed attempt directories | The eight `stage-00-allocation.json`, `stage-01-input-freeze.json`, `stage-02-development.json`, `stage-03-rank-freeze.json`, `stage-04-reserved.json`, `stage-05-calibration.json`, `stage-06-replay.json`, `stage-07-evaluation.json`; plus `attempt-start.json`, `label-routes.json`, `development-targets.json`, `rank-summary.json`, `calibration-vault.json`, `evaluation-vault.json`, `secondary-membership.json`, `completeness.json`, `public-report.json`, `attempt-result.json`. Preserve all 18 exact files per completed attempt, including usage and failures/negative results where represented. The terminal graph supplies references for scientific artifacts; capture/bind the start marker independently as an existing evidence file. |
| Each corresponding launch directory | Exactly `parent-capture.json`, `supervisor.json`, `launch-result.json`. The launch receipt binds capture/supervisor/attempt result; preserve exact recorded command and original locations inside those bytes. |
| Durable allocation evidence | Only the one existing protocol/source registry-key directory: `attempt.json` and each existing `request-NNN.json`/`response-NNN.json` pair required by the original sealed sampler transcript. The expected draw count is obtained from that authenticated transcript, never guessed as one or inferred from success. `_verify_durable_original` requires the exact filename set and rejects extras. Preserve these as passive evidence under a backup namespace, not as a newly active registry. |
| Exact original scientific inputs | The pinned 332,126-byte source blob at the producer's fixed Figshare-v9 cache path; and the exact private feature file identified by the original launch and public readiness identity. Copy only those two named files, without parsing cells or vectors. Their existing bytes/whole-blob identities are sufficient for the copier. A missing source or feature is reported missing, never downloaded/re-extracted/replaced by this operation. |
| Registration and engineering custody | The exact original v2 registration-request file, and only its explicitly referenced manifest/engineering/CI files plus each exact engineering command log named and hashed by the engineering receipt. Preserve externally authenticated tag/publication and root approval records, both terminal reauthentication receipts, original/reproduction command-recorder evidence, and the independent arithmetic audit/handoff/execution record as explicitly enumerated files. These auxiliary locations are parent supplied; their names are not a fixed producer directory API. Include named v1 failure evidence, without copying unrelated scratch folders. |
| Software/history | Preserve the registered source commit, required ancestor commits and original v1/v2 annotated tag objects through an explicitly scoped Git object/history backup or full authenticated repository fetch. Preserve the registered manifest's exact committed files, including scientific protocol, contract, operational amendment, recovery amendment, original failure record and public metadata/readiness. The existing release source tar/wheel may be included by exact filename/hash, but the tar has no Git history and cannot alone satisfy ancestral/tag gates. Do not copy `.git/config`, credential helpers, token files, environment snapshots or arbitrary repository internals as a shortcut. |

This is intentionally broader than the independent arithmetic auditor's terminal
read allowlist: that auditor does not need raw source, features, rank/input-freeze,
allocation or registry files, but a complete custody backup would. The prior
audit authorization does **not** silently authorize opening those extra files.
Root must explicitly authorize the exact copy-only manifest before capture.

## Minimum retention behavior

Use a new ignored destination outside all input/attempt directories, private
directory/file permissions, and an explicit source-to-bundle-member manifest.
The manifest records original logical path, private original location, byte
length, full SHA-256, evidence role and existing content/scientific identities
where applicable. Do not normalize JSON, rewrite paths inside receipts, strip
timings, recompress existing files in place, merge the two attempts, or turn
scientific equality into a claim of identical whole-file bytes.

Reject symlinks, special files, traversal/absolute archive-member names, duplicate
members, undeclared inputs and an existing destination. Capture/hash/copy the
same bytes with source stability checks; verify the archive's exact member set
and every extracted member hash in a fresh **inert** location. Write the completion
receipt last, atomically and without overwrite. Partial output has no completion
claim and is retained as a failed retention attempt. Test truncation, mutation,
wrong identities, missing files, unsafe paths, output conflicts and interrupted
publication with synthetic files; this is not another scientific run.

The bundle and its manifest are **private**, including raw values, role assignments,
entropy transcript and paths. A separately reviewed public retention summary may
contain whole-bundle checksum/length and declared custody scope, never raw members,
individual IDs or per-cell hashes. A checksum detects changed bytes; it does not
encrypt or authenticate an untrusted source. Keep any privately shared copy in an
authorized custody channel, and verify the copied bundle/receipt outside the
workspace before declaring protection against workspace loss. No external transfer
is performed or implicitly authorized by this note.

## Recovery limitations and contract compatibility

Passive preservation does not contradict the frozen requirements to retain exact
ignored artifacts, failed/partial attempts and the original draw transcript.
The contracts do prohibit treating restoration as permission to overwrite/resume
an attempt, clear/rename/re-key the ledger, clone a registry to obtain another draw,
or silently change source/registration/feature hashes. The one-draw key remains
the same protocol/source digest across registration generations and hosts; a
copied marker remains evidence of the existing allocation, not new authority.

Reconstruction on a different filesystem is **not an implemented or verified
restore workflow**. The source locates the project `ROOT`, enforces fixed
repository-local input/output/registry layouts and main-tree module origins,
requires exact registered HEAD/manifest bytes and historical Git objects, and
performs live tag/CI/ancestor authentication. The registry override is rejected
for registered contexts. Source-archive extraction alone does not recreate that
state. Existing receipts may contain old absolute command paths; preserve them
unchanged as execution history rather than rewriting them for a new host.
The reproduction gate permits the remote branch to have advanced to a verified
descendant of the registered commit; it still requires the local checkout to be
the exact registered commit. This is not a requirement that remote HEAD remain
forever fixed. A repository-local marker also cannot attest that no other host
or operator copied or bypassed it; backup is not a global anti-duplication system.

Recovery should first restore only to a quarantined evidence directory and
verify hashes read-only, with no launcher/allocator invocation. Any future
computational reproduction would require a separate reviewed environment and
custody reconstruction, the same original registration/allocation/ledger, a new
nonexisting output attempt and the supported restricted reproduction route.
Such reproduction is not promised here, never a new independent sample, and not
required to establish that the retained evidence bytes survived. No restore,
registry copying, scientific execution or source modification occurred in this
source-only review.

## Source basis

- `scripts/mpea_archive_operations.py`: declared stage/companion artifact names.
- `scripts/mpea_production_store.py`: exclusive start marker, fixed output root,
  captured original-allocation import and no-overwrite artifacts.
- `scripts/mpea_archive_run.py`: launch sink, terminal graph authentication and
  reproduction comparisons.
- `scripts/mpea_registration_allocation.py`: exact registration-reference closure,
  protocol/source registry key, durable draw filename set and fixed registry gate.
- `scripts/mpea_archive_custody.py`: cache-only source path and exact readiness-bound
  private feature input.
- `docs/mpea-t25-implementation-contract-v1.md`,
  `docs/mpea-archive-driver-contract.md`,
  `docs/mpea-t25-operational-enforcement-v1.md`,
  `docs/mpea-preallocation-recovery-v2.md`: unchanged custody/execution boundaries.
- `docs/release-artifact-retention.md` and `docs/reproduction-environment.md`:
  software artifact retention versus historical/source-specific scientific
  reproduction; the latter environment guide applies to JARVIS/training, not a
  new MPEA restore command.
