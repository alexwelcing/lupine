## Summary

What changed and why. Keep it connected to the evidence loop: benchmark →
hypothesize → prove → publish.

## Related issue

Closes # (if there is one).

## Verification

- [ ] I ran the focused gate for every root I touched.
- [ ] I ran `just verify` (or the equivalent focused gates if `verify` is too heavy).
- [ ] `git diff --check` is clean.
- [ ] I updated the relevant ledger:
  - [ ] [`CHANGELOG.md`](./CHANGELOG.md) for user-visible changes.
  - [ ] [`ROOTS.md`](./ROOTS.md) if I added, removed, or re-tagged a root.
  - [ ] [`docs/decisions/`](./docs/decisions/) if I changed architecture or ownership.
  - [ ] [`docs/conjectures/ledger.md`](./docs/conjectures/ledger.md) if I changed a claim's status.
- [ ] I read [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Windows notes

If this PR touches Node/build tasks, confirm it does not force PowerShell as the
default shell. The root `justfile` routes these through Git Bash on Windows.
