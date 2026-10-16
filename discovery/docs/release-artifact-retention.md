# Retaining a tested research-preview artifact

Status: artifact-retention implementation with synthetic custody tests. A
retained release candidate is established only by executing this command from
a published, clean checkout with a matching runtime manifest and preserving
its successful receipt. The implementation and its tests alone do not establish
that any real wheel or source archive has been retained.

The optional command is:

```sh
python scripts/package_smoke.py --retain-directory .cache/release/<new-attempt>
```

The existing command without this flag preserves its current development
behavior: it builds from the working project, tests an isolated wheel, deletes
the temporary build and environment, and writes `.cache/package-verification.json`
unless `--output` overrides that path. Its original `PROBE` string is unchanged.

Retention is stricter:

1. Require a clean Git checkout, including no untracked files outside ignore
   rules. Do not stash, reset, remove, stage or commit user work. Verify the
   current runtime manifest before building; bind its exact bytes, checkpoint
   and file count, the Git commit/tree, and the project path.
2. `git archive` that commit's project subtree and, in the monorepo, the
   committed `.github/workflows/discovery-verify.yml`. The concrete monorepo
   copyset is `discovery/` plus that one workflow. Ignored/untracked files are
   never archive inputs. Reject tracked cache directories, symbolic links,
   gitlinks and archives that omit declared files through `export-ignore`.
   Compare every extracted file with its committed Git blob identity; archive
   transformations such as `export-subst` are rejected.
3. Extract only the archive's validated regular files/directories in a new
   temporary location. Verify the runtime manifest there, and build the wheel
   from that committed snapshot. Thus ignored files in the working checkout
   cannot enter the tested wheel through a permissive package-data pattern.
4. Install that exact wheel into the existing isolated temporary environment
   and run the original complete probe. Hash the wheel before installation
   and after the probe; a mutation rejects retention. Bind the source tar hash
   at creation, verify it after extraction/validation and before retention, and
   require the copied tar to have that same hash. Recheck the Git state,
   manifest and every archived working-file byte. Byte comparison also catches
   edits hidden from `git status` with assume-unchanged or skip-worktree flags.
5. Reserve a new destination directory, copy the exact tested wheel and source
   tar, and verify the copied hashes. Write and flush the sealed completion
   receipt to a temporary file, then publish it last by atomic no-overwrite link.
   Existing directories/files or symlinked ancestors are never overwritten.

Ignored and untracked inputs and unrelated monorepo projects are excluded.
Tracked paths containing `.cache`, `.git`, `.venv` or `__pycache__` components
are rejected. Other deliberately committed archives, bytecode or directories
are not excluded by filename alone: this exports reviewed committed files,
not a general secret detector. Review the declared committed copyset before
retention. The fixed archive layout is `lupine-source/discovery/`
plus `lupine-source/.github/workflows/discovery-verify.yml`. A standalone project
checkout would use `lupine-source/` for its committed project tree.

By default the destination contains:

- The actual tested `lupine_discovery-<version>-py3-none-any.whl`.
- `lupine-discovery-source-<12-character-commit>.tar`, the committed source
  snapshot including proofs, scripts, tests, documentation and public reports.
- `release-artifacts.json`, schema `lupine.discovery.release_artifacts.v1`.

The receipt includes the full original smoke report, Git/source/manifest bindings,
copyset, scoped file-count and hash-map identity, both artifact filenames/lengths/
SHA-256 values, the fact that the wheel was built from the committed archive,
and a content digest over canonical ASCII JSON including its trailing newline.
The top-level normal smoke result additionally reports the retained paths and
receipt byte hash. This is identity and executed engineering evidence, not a
signature, independent scientific validation, deployment or publication.

With retention enabled, the receipt inside the new directory is sufficient;
no default `.cache/package-verification.json` is rewritten. An explicit
`--output` may save the normal smoke result to another **new** file. It cannot
overwrite the retained wheel, source tar, receipt or existing historical report.
Its path and ancestors are checked again after the smoke run, and complete
output bytes are published with the same atomic no-overwrite procedure.
If publication fails partway, the command fails and a directory may contain
partial artifacts without a completion receipt. It never substitutes an old
receipt or overwrites that directory on retry; choose a new attempt path.

The source tar has no Git history. Use a full repository fetch and checkout of
the bound commit with its required historical commits for provenance gates that invoke Git. The archive
supplies inspectable/buildable checkout assets, not a replacement for those
history-based checks. Dependency resolution and ZIP metadata are not normalized;
this is retention of the exact tested wheel, not a promise that a later build
will reproduce its bytes. Frozen scientific rerun protocols and their existing
negative results are unchanged.

Synthetic tests use tiny temporary Git repositories, constructed inert wheel
bytes and stubbed build/install/probe calls. They check artifact identities,
committed-source copysets, ignored-cache exclusion, immutable destination behavior,
stale manifests, hidden/ordinary user edits, source/commit/wheel/archive mutation, unsafe
archive entries and unchanged default behavior. They neither build a release
wheel nor open or evaluate any scientific source.
