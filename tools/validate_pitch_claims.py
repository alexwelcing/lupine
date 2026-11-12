#!/usr/bin/env python3
"""
Guard against recurring false public claims.

Two mistakes are especially costly in public/investor-facing materials:
  1. claiming the research paper is submitted, published, in press, accepted, or
     assigned to a journal. It is a work-in-progress draft.
  2. implying more than one founder or a broader team.

This scans public surfaces for those claims, checks brand.config.json as the
single source of truth, and verifies synced brand/agent copies are current.
Internal research files that use IMMI as a working label are intentionally not
scanned as strict public surfaces.

It also scans every tracked text file (``git ls-files``) for strings that must
not be in a public repository: confidentiality labels, funding-status lines,
partner claims, tailnet host names, local agent-installation paths and personal
Gmail addresses (see LEAK_RULES). Third-party files that credit their authors,
archive banners and this guard's own patterns are exempt only through the
explicit LEAK_ALLOWLIST below.
"""
from __future__ import annotations

import fnmatch
import json
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]

# Investor-facing surfaces: the journal acronym must not appear at all. "IMMI" is
# matched case-sensitively so the lowercase asset path /immi_paper.pdf is not flagged.
SURFACES_STRICT = [
    "library-site/src/i18n.js",
    "library-site/src/app.js",
    "library-site/src/llms.txt",
    "library-site/src/llms-full.txt",
    "atlas/atlas-view/apps/web/public/llms.txt",
    "atlas/atlas-view/apps/web/public/llms-full.txt",
]

# These developer-facing records can use IMMI as a dataset / working name, so
# only false publication-status phrases are forbidden.
SURFACES_CLAIM_ONLY = [
    "README.md",
    "CHANGELOG.md",
    "docs/research_evolution_2026_05_05.md",
    "paper/README.md",
    "atlas-distill/README.md",
]

CLAIM_PHRASES = [
    "in press",
    "in-press",
    "submitted to",
    "submitted, in preparation",
    "manuscript status - IMMI",
    "manuscript status — IMMI",
    "Integrating Materials and Manufacturing Innovation",
    "预印本",
    "co-founder",
    "cofounder",
    "co-founded",
    "founding team",
]

STRICT_ONLY_PHRASES = [
    "welcing2026causal",
    "BibTeX key",
    "manuscript status",
    "47 theorems",
    "1,499 build targets",
    "Lean 4 specification",
]


def _scan(rel: str, *, forbid_immi: bool) -> list[str]:
    path = ROOT / rel
    if not path.exists():
        return []
    out: list[str] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        low = line.lower()
        for phrase in CLAIM_PHRASES:
            if phrase.lower() in low:
                out.append(f"{rel}:{line_no}: forbidden claim {phrase!r} in: {line.strip()[:100]}")
        if forbid_immi and "IMMI" in line:
            out.append(f"{rel}:{line_no}: journal acronym 'IMMI' in public surface: {line.strip()[:100]}")
        if forbid_immi:
            for phrase in STRICT_ONLY_PHRASES:
                if phrase.lower() in low:
                    out.append(f"{rel}:{line_no}: stale homepage/publication block {phrase!r} in: {line.strip()[:100]}")
    return out


def scan_public_surfaces() -> list[str]:
    errors: list[str] = []
    for rel in SURFACES_STRICT:
        errors += _scan(rel, forbid_immi=True)
    for rel in SURFACES_CLAIM_ONLY:
        errors += _scan(rel, forbid_immi=False)
    return errors


# Every tracked text file must be free of these. Each rule: (cheap lowercase
# substring used to skip files quickly, compiled pattern).
LEAK_RULES: dict[str, tuple[str, re.Pattern[str]]] = {
    "confidential-label": ("confidential", re.compile(r"\b(?:Confidential|CONFIDENTIAL)\b")),
    "do-not-distribute": ("distribute", re.compile(r"\bdo\s+not\s+distribute\b", re.IGNORECASE)),
    "funding-not-raising": ("raising", re.compile(r"\bnot\s+raising\b", re.IGNORECASE)),
    "funding-closed": ("investors", re.compile(r"\bclosed\s+to\s+further\s+investors\b", re.IGNORECASE)),
    "funding-raising-amount": ("raising", re.compile(r"\braising\s*~", re.IGNORECASE)),
    "immediate-partner": ("partner", re.compile(r"\bimmediate\s+partners?\b", re.IGNORECASE)),
    "tailnet-host": (".ts.net", re.compile(r"\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.ts\.net\b", re.IGNORECASE)),
    "hermes-path": (".hermes", re.compile(r"(?:~|/)\.hermes(?:/|\b)")),
    "personal-gmail": ("@gmail.com", re.compile(r"[a-z0-9._%+-]+@gmail\.com\b", re.IGNORECASE)),
}
ALL_LEAK_RULES = frozenset(LEAK_RULES)

# Explicit exemptions: (path glob, rules exempted, reason[, line regex]). With a
# line regex, only matching lines are exempt. Globs use fnmatch on the
# repo-relative POSIX path, so "*" also crosses "/".
LEAK_ALLOWLIST: list[tuple] = [
    # Third-party material listed in NOTICE.md: published file headers credit
    # their authors, sometimes with a personal address. Editing them would
    # break provenance.
    ("atlas-distill/lammps_runs/*", {"personal-gmail"}, "third-party potential file headers (NOTICE.md)"),
    ("atlas-distill/potentials/*", {"personal-gmail"}, "third-party potential file headers (NOTICE.md)"),
    ("atlas/nist_ipr/*", {"personal-gmail"}, "NIST IPR catalog data (NOTICE.md)"),
    ("replication/error-geometry/data/acwf/*", {"personal-gmail"}, "ACWF verification datasets (NOTICE.md)"),
    ("glim-think/worker-configuration.d.ts", {"personal-gmail"}, "generated third-party type definitions (NOTICE.md)"),
    # Archive banners may name the label of something that was removed, e.g.
    # "Archived: the confidential deck was removed". Only banner lines count.
    ("archive/*README.md", {"confidential-label", "do-not-distribute"}, "archive banner",
     r"(?i)\b(?:archived|removed|retired|superseded)\b"),
    # The guard and its tests necessarily contain the patterns.
    ("tools/validate_pitch_claims.py", ALL_LEAK_RULES, "the guard's own patterns"),
    ("tools/test_validate_pitch_claims.py", ALL_LEAK_RULES, "test fixtures for the guard"),
]


def tracked_files(root: Path = ROOT) -> list[str]:
    out = subprocess.run(
        ["git", "ls-files", "-z"], cwd=root, check=True, capture_output=True
    ).stdout
    return [p for p in out.decode("utf-8", errors="surrogateescape").split("\0") if p]


def _exempt(rel: str, rule: str, line: str) -> bool:
    for entry in LEAK_ALLOWLIST:
        glob, rules = entry[0], entry[1]
        line_rx = entry[3] if len(entry) > 3 else None
        if rule in rules and fnmatch.fnmatchcase(rel, glob):
            if line_rx is None or re.search(line_rx, line):
                return True
    return False


def scan_text_for_leaks(rel: str, text: str) -> list[str]:
    """Return one message per non-exempt leak match in ``text``."""
    low = text.lower()
    out: list[str] = []
    for rule, (needle, rx) in LEAK_RULES.items():
        if needle not in low:
            continue
        for m in rx.finditer(text):
            start = text.rfind("\n", 0, m.start()) + 1
            end = text.find("\n", m.end())
            line = text[start:] if end == -1 else text[start:end]
            if _exempt(rel, rule, line):
                continue
            line_no = text.count("\n", 0, m.start()) + 1
            out.append(f"{rel}:{line_no}: {rule} {m.group(0)!r} in: {line.strip()[:100]}")
    return out


def scan_tracked_files(root: Path = ROOT, files: list[str] | None = None) -> list[str]:
    """Scan every tracked text file (binary files are skipped)."""
    needles = tuple({needle.encode() for needle, _ in LEAK_RULES.values()})
    errors: list[str] = []
    for rel in tracked_files(root) if files is None else files:
        path = root / rel
        if not path.is_file() or path.is_symlink():
            continue
        data = path.read_bytes()
        if b"\0" in data[:8192]:
            continue  # binary
        low = data.lower()
        if not any(n in low for n in needles):
            continue
        errors += scan_text_for_leaks(rel, data.decode("utf-8", errors="replace"))
    return errors


def check_brand_config() -> list[str]:
    errors: list[str] = []
    cfg = json.loads((ROOT / "brand.config.json").read_text(encoding="utf-8"))
    pub = cfg.get("publication", {})
    if pub.get("status") != "in preparation":
        errors.append(f"brand.config.json: publication.status must be 'in preparation' (got {pub.get('status')!r})")
    if pub.get("venue") not in (None, ""):
        errors.append(f"brand.config.json: publication.venue must be null (got {pub.get('venue')!r})")
    founder = cfg.get("founder", {})
    if founder.get("soleFounder") is not True:
        errors.append("brand.config.json: founder.soleFounder must be true")
    return errors


def check_sync_drift() -> list[str]:
    errors: list[str] = []
    brand = json.loads((ROOT / "brand.config.json").read_text(encoding="utf-8"))
    expected_brand = json.dumps(brand, indent=2, ensure_ascii=False) + "\n"
    src_dir = ROOT / "docs" / "brand" / "agent"
    for site_root in ("library-site/src", "atlas/atlas-view/apps/web/public"):
        brand_json = ROOT / site_root / "brand.json"
        if brand_json.exists() and brand_json.read_text(encoding="utf-8") != expected_brand:
            errors.append(f"{site_root}/brand.json is stale - run: python scripts/sync_brand_agent_text.py")
        for name in ("llms.txt", "llms-full.txt"):
            dst = ROOT / site_root / name
            src = src_dir / name
            if src.exists() and dst.exists() and dst.read_text(encoding="utf-8") != src.read_text(encoding="utf-8"):
                errors.append(f"{site_root}/{name} is stale - run: python scripts/sync_brand_agent_text.py")
    return errors


def main() -> int:
    errors = scan_public_surfaces() + check_brand_config() + check_sync_drift()
    leaks = scan_tracked_files()
    if errors or leaks:
        print("PITCH CLAIM GUARD: FAIL\n")
        for error in errors + leaks:
            print(f"  x {error}")
        if errors:
            print(
                f"\n{len(errors)} claim violation(s). The paper is a work-in-progress draft "
                "(not submitted / in press / accepted / published, no journal named); there is one founder."
            )
        if leaks:
            print(
                f"\n{len(leaks)} leak(s) in tracked files. Remove the string or the file; exempt only "
                "third-party, archive-banner or guard files through LEAK_ALLOWLIST."
            )
        return 1
    print(
        "PITCH CLAIM GUARD: PASS - no false paper-status or multi-founder claims in public surfaces; "
        "no blocked strings in tracked files."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
