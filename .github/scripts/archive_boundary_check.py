#!/usr/bin/env python3
"""Enforce the active/archive boundary after the Distill-root consolidation.

Fails the build if:
- Any tracked file lives under a retired top-level root.
- Any active Python file imports a retired package (distiller, lupine_dspy,
  swarm_preprint_review).
- ROOTS.md does not list the expected retired roots in the archive table.

This is intentionally conservative: historical mentions in docs/comments are
fine, but executable imports and new files in retired roots are not.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

RETIRED_ROOTS = {
    "distiller",
    "lupine-distill",
    "lupine-dspy",
    "swarm_preprint_review",
    "KIMI_MLIP_UNIVERSAL",
    "lupine-start",
}

# Package names that are unambiguously retired.  Note: ``lupine_distill`` is the
# active Python package and must not be flagged here.
RETIRED_PACKAGES = {
    "distiller",
    "lupine_dspy",
    "swarm_preprint_review",
}

RETIRED_PACKAGE_RE = re.compile(
    r"\b(from\s+({roots})|import\s+({roots}))".format(
        roots="|".join(re.escape(r) for r in RETIRED_PACKAGES)
    )
)

REPO = Path(__file__).resolve().parents[2]


def git_tracked_files() -> list[Path]:
    out = subprocess.run(
        ["git", "ls-files"],
        cwd=REPO,
        check=True,
        capture_output=True,
        text=True,
    )
    return [REPO / p for p in out.stdout.splitlines() if p]


def check_retired_roots(files: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        try:
            rel = path.relative_to(REPO)
        except ValueError:
            continue
        parts = rel.parts
        if not parts:
            continue
        if parts[0] in RETIRED_ROOTS:
            errors.append(f"tracked file under retired root: {rel}")
        if len(parts) > 1 and parts[0] == "archive":
            # archive/<retired-root>/ is the only legitimate home.
            continue
    return errors


def check_imports(files: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in files:
        try:
            rel = path.relative_to(REPO)
        except ValueError:
            continue
        parts = rel.parts
        if not path.suffix == ".py":
            continue
        if parts[0] in {"archive", ".github"}:
            continue
        text = path.read_text(encoding="utf-8")
        for match in RETIRED_PACKAGE_RE.finditer(text):
            errors.append(
                f"{rel} references retired package near: {match.group(0)!r}"
            )
    return errors


def check_roots_md() -> list[str]:
    errors: list[str] = []
    roots_md = REPO / "ROOTS.md"
    if not roots_md.exists():
        return ["ROOTS.md missing"]
    text = roots_md.read_text(encoding="utf-8")
    for root in RETIRED_ROOTS:
        if root not in text:
            errors.append(f"ROOTS.md does not mention retired root {root!r}")
    return errors


def main() -> int:
    files = git_tracked_files()
    errors: list[str] = []
    errors.extend(check_retired_roots(files))
    errors.extend(check_imports(files))
    errors.extend(check_roots_md())

    if errors:
        print("Archive boundary violations:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print("Archive boundary clean.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
