---
name: Bug report
about: Report something broken, inaccurate, or hard to reproduce
title: "[bug] "
labels: bug
---

## Summary

A clear, concise description of the bug. If this is about a scientific claim,
include the claim file or ledger entry.

## Steps to reproduce

1. Run `...`
2. Observe `...`

## Expected behavior

What you expected to happen.

## Actual behavior

What actually happened, including any error output or logs.

## Environment

- OS: <!-- Windows / macOS / Linux -->
- Python version: <!-- `python --version` -->
- Rust version: <!-- `cargo --version` -->
- Node version: <!-- `node --version` -->
- Commit/branch: <!-- `git rev-parse --short HEAD` -->

## Checklist

- [ ] I searched existing issues for duplicates.
- [ ] I can reproduce this on the latest `main`.
- [ ] I ran the focused gate for the root I am touching (see [`docs/ONBOARDING.md`](./docs/ONBOARDING.md)).
- [ ] I ran `git diff --check` before opening this issue.
