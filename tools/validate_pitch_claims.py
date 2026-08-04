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
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]

# Investor-facing surfaces: the journal acronym must not appear at all. "IMMI" is
# matched case-sensitively so the lowercase asset path /immi_paper.pdf is not flagged.
SURFACES_STRICT = [
    "gcp/lupine-site-router/public/index.html",
    "gcp/lupine-site-router/public/llms.txt",
    "library-site/src/i18n.js",
    "library-site/src/app.js",
    "atlas/lupine-vc/deck.html",
    "atlas/lupine-vc/index.html",
    "atlas/lupine-vc/one-pager.html",
    "atlas/manifesto/index.html",
    "library-site/src/llms.txt",
    "library-site/src/llms-full.txt",
    "atlas/atlas-view/apps/web/public/llms.txt",
    "atlas/atlas-view/apps/web/public/llms-full.txt",
    "deck/public/index.html",
    "deck/public/access.html",
    "deck/public/one-pager.html",
    "deck/public/methodology.html",
    "deck/public/status.html",
    "deck/public/partials/nav.html",
    "deck/public/partials/footer.html",
    "raise/command-center.html",
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
    if errors:
        print("PITCH CLAIM GUARD: FAIL\n")
        for error in errors:
            print(f"  x {error}")
        print(
            f"\n{len(errors)} violation(s). The paper is a work-in-progress draft "
            "(not submitted / in press / accepted / published, no journal named); there is one founder."
        )
        return 1
    print("PITCH CLAIM GUARD: PASS - no false paper-status or multi-founder claims in public surfaces.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
