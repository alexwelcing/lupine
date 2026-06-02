#!/usr/bin/env python3
"""
validate_pitch_claims.py — guard against recurring false public claims.

Two mistakes keep reappearing in public / investor-facing materials:
  1. claiming the research paper is published / in press / accepted / a preprint,
     or naming a journal (IMMI). It is a WORK-IN-PROGRESS DRAFT.
  2. implying more than one founder / a team. There is ONE founder.

This scans the public surfaces for those claims, checks brand.config.json is the
single source of truth, and verifies the synced brand copies are not stale.
Exit non-zero on any violation. Wired into CI via
.github/workflows/pitch-content-validation.yml.

Internal research files (paper/immi-paper.tex, mlip_immi/, swarm_preprint_review/)
legitimately use the "IMMI" working name and are intentionally NOT scanned.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # ASCII-safe on Windows consoles

ROOT = Path(__file__).resolve().parents[1]

# Investor-facing surfaces: the journal acronym must not appear at all. "IMMI" is
# matched case-SENSITIVELY so the lowercase asset path /immi_paper.pdf is not flagged.
SURFACES_STRICT = [
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
]

# The dev README legitimately uses "IMMI" as the dataset / working name, so only
# the publication-STATUS claims are forbidden there (not the bare acronym).
SURFACES_CLAIM_ONLY = ["README.md"]

# Publication-status + multi-founder claim phrases (case-insensitive). The bare
# word "preprint" is intentionally excluded — it lives in i18n keys / CSS classes;
# the acronym + status phrases below catch the actual recurring claims.
CLAIM_PHRASES = [
    "in press",
    "in-press",
    "Integrating Materials and Manufacturing Innovation",
    "预印本",  # ZH: preprint
    "co-founder",
    "cofounder",
    "co-founded",
    "founding team",
]


def _scan(rel: str, *, forbid_immi: bool) -> list[str]:
    path = ROOT / rel
    if not path.exists():
        return []
    out: list[str] = []
    for i, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        low = line.lower()
        for phrase in CLAIM_PHRASES:
            if phrase.lower() in low:
                out.append(f"{rel}:{i}: forbidden claim {phrase!r} in: {line.strip()[:100]}")
        if forbid_immi and "IMMI" in line:  # case-sensitive: the journal acronym, not /immi_paper.pdf
            out.append(f"{rel}:{i}: journal acronym 'IMMI' in investor surface: {line.strip()[:100]}")
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
        errors.append(f"brand.config.json: publication.venue must be null (got {pub.get('venue')!r}); do not name a journal")
    founder = cfg.get("founder", {})
    if founder.get("soleFounder") is not True:
        errors.append("brand.config.json: founder.soleFounder must be true (one founder)")
    return errors


def check_sync_drift() -> list[str]:
    """Synced brand.json copies must match brand.config.json; llms copies must match source."""
    errors: list[str] = []
    brand = json.loads((ROOT / "brand.config.json").read_text(encoding="utf-8"))
    expected_brand = json.dumps(brand, indent=2, ensure_ascii=False) + "\n"
    src_dir = ROOT / "docs" / "brand" / "agent"
    for sr in ("library-site/src", "atlas/atlas-view/apps/web/public"):
        bj = ROOT / sr / "brand.json"
        if bj.exists() and bj.read_text(encoding="utf-8") != expected_brand:
            errors.append(f"{sr}/brand.json is stale - run: python scripts/sync_brand_agent_text.py")
        for name in ("llms.txt", "llms-full.txt"):
            dst, src = ROOT / sr / name, src_dir / name
            if src.exists() and dst.exists() and dst.read_text(encoding="utf-8") != src.read_text(encoding="utf-8"):
                errors.append(f"{sr}/{name} is stale - run: python scripts/sync_brand_agent_text.py")
    return errors


def main() -> int:
    errors = scan_public_surfaces() + check_brand_config() + check_sync_drift()
    if errors:
        print("PITCH CLAIM GUARD: FAIL\n")
        for e in errors:
            print(f"  x {e}")
        print(f"\n{len(errors)} violation(s). The paper is a work-in-progress draft "
              "(not in press / accepted / a preprint, no journal named); there is one founder.")
        return 1
    print("PITCH CLAIM GUARD: PASS - no false paper-status or multi-founder claims in public surfaces.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
