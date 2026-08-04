#!/usr/bin/env python3
"""Publish canonical Lupine brand/agent files into every public site root."""

from __future__ import annotations

import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "docs" / "brand" / "agent"
BRAND_CONFIG = ROOT / "brand.config.json"

SITE_ROOTS = [
    ROOT / "library-site" / "src",
    ROOT / "atlas" / "atlas-view" / "apps" / "web" / "public",
]


def copy_text(source: Path, destination: Path) -> None:
    destination.write_text(source.read_text(encoding="utf-8"), encoding="utf-8", newline="\n")


def main() -> None:
    brand = json.loads(BRAND_CONFIG.read_text(encoding="utf-8"))
    for site_root in SITE_ROOTS:
        site_root.mkdir(parents=True, exist_ok=True)
        copy_text(SOURCE_DIR / "llms.txt", site_root / "llms.txt")
        copy_text(SOURCE_DIR / "llms-full.txt", site_root / "llms-full.txt")
        (site_root / "brand.json").write_text(
            json.dumps(brand, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
            newline="\n",
        )
    print(f"Synced brand agent text to {len(SITE_ROOTS)} site roots.")


if __name__ == "__main__":
    main()
