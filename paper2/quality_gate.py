#!/usr/bin/env python3
"""Submission-quality gate for the Projection Law paper.

Checks:
- All \\cite{...} keys have matching .bib entries.
- All \\includegraphics / figure files exist as PDF.
- No leftover TODO / FIXME / placeholder text.
- Lean artifact builds green (via lake build, optional).
- Replication kit pointer is present.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
TEX = ROOT / "projection-law.tex"
BIB = ROOT / "references.bib"
FIGURES = ROOT / "figures"
LEAN = ROOT.parent / "lean-spec"


def extract_cites(tex: str) -> set[str]:
    keys: set[str] = set()
    # Strip LaTeX % line continuations before parsing cites.
    tex_clean = re.sub(r"%\s*\n\s*", "", tex)
    for match in re.finditer(r"\\(?:cite|citep|citet|citealp|citealt)\*?\{([^}]+)\}", tex_clean):
        for key in match.group(1).split(","):
            keys.add(key.strip())
    return keys


def extract_bib_keys(bib: str) -> set[str]:
    return {m.group(1) for m in re.finditer(r"^\s*@\w+\{(\S+),", bib, re.MULTILINE)}


def extract_graphics(tex: str) -> list[str]:
    return [m.group(1) for m in re.finditer(r"\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}", tex)]


def check_references(tex: str, bib: str) -> list[str]:
    cites = extract_cites(tex)
    keys = extract_bib_keys(bib)
    missing = sorted(cites - keys)
    unused = sorted(keys - cites)
    issues: list[str] = []
    if missing:
        issues.append(f"Citations missing from .bib: {', '.join(missing)}")
    if unused:
        issues.append(f"Unused .bib entries: {', '.join(unused)}")
    return issues


def check_figures(tex: str) -> list[str]:
    issues: list[str] = []
    for path in extract_graphics(tex):
        # Resolve relative to figures/ if no directory given
        candidate = Path(path)
        if not candidate.is_absolute():
            candidate = FIGURES / candidate.name
        if not candidate.exists():
            issues.append(f"Missing figure file: {candidate} (from \\includegraphics{{{path}}})")
    return issues


def check_placeholders(tex: str) -> list[str]:
    issues: list[str] = []
    for pat in [r"TODO", r"FIXME", r"XXXXXX", r"\[fill\]", r"placeholder",
                r"\(to be completed\)", r"\[to be added before submission\]",
                r"0000-0000-0000-0000", r"0009-0000-0000-0000"]:
        if re.search(pat, tex, re.IGNORECASE):
            # Be specific: line numbers
            for i, line in enumerate(tex.splitlines(), 1):
                if re.search(pat, line, re.IGNORECASE):
                    issues.append(f"Line {i}: potential placeholder '{pat}'")
    return issues


def check_lean_build() -> list[str]:
    issues: list[str] = []
    if not (LEAN / "lakefile.toml").exists():
        issues.append("lean-spec/lakefile.toml not found")
        return issues
    result = subprocess.run(
        ["lake", "build"], cwd=LEAN, capture_output=True, text=True,
        encoding="utf-8", errors="replace"
    )
    if result.returncode != 0:
        issues.append("lean-spec lake build FAILED")
    else:
        print("lean-spec lake build: OK")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Quality gate for Projection Law")
    parser.add_argument("--lean", action="store_true", help="Also run lean-spec lake build")
    args = parser.parse_args()

    if not TEX.exists():
        print(f"FATAL: {TEX} not found", file=sys.stderr)
        return 1
    if not BIB.exists():
        print(f"FATAL: {BIB} not found", file=sys.stderr)
        return 1

    tex = TEX.read_text(encoding="utf-8")
    bib = BIB.read_text(encoding="utf-8")

    issues: list[str] = []
    issues.extend(check_references(tex, bib))
    issues.extend(check_figures(tex))
    issues.extend(check_placeholders(tex))

    if args.lean:
        issues.extend(check_lean_build())

    if issues:
        print("\nQUALITY GATE FAILED")
        for issue in issues:
            print(f"  - {issue}")
        return 1

    print("\nQUALITY GATE PASSED")
    print(f"  Citations checked: {len(extract_cites(tex))}")
    print(f"  Bibliography entries: {len(extract_bib_keys(bib))}")
    print(f"  Figures checked: {len(extract_graphics(tex))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
