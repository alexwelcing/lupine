#!/usr/bin/env python3
"""Repair and QA existing Lupi equirectangular still packs.

Use this before promoting or reusing older generated backgrounds. It applies
the shared horizontal seam feather and pole-cap smoothing pass, then reports
before/after QA for every manifest asset it touches.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image

from lupi_equirect import inspect_image, repair_equirect_image


ATLAS_VIEW_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BACKGROUND_DIR = ATLAS_VIEW_ROOT / "apps" / "web" / "public" / "backgrounds"
DEFAULT_MANIFEST = ATLAS_VIEW_ROOT / "tools" / "lupi-panorama-prompts.json"

JsonObject = dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", action="append", type=Path, help="Manifest to repair. Repeatable.")
    parser.add_argument("--background-dir", type=Path, default=DEFAULT_BACKGROUND_DIR)
    parser.add_argument("--asset", action="append", default=[], help="Asset id or filename. Repeat or comma-separate.")
    parser.add_argument("--quality", type=int, default=92)
    parser.add_argument("--seam-repair-px", type=int, default=192)
    parser.add_argument("--pole-repair-px", type=int, default=256)
    parser.add_argument("--qa-seam-px", type=int, default=128)
    parser.add_argument("--qa-pole-px", type=int, default=96)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json-out", type=Path)
    return parser.parse_args()


def selected_ids(raw_values: list[str]) -> set[str]:
    return {item.strip() for raw in raw_values for item in raw.split(",") if item.strip()}


def iter_assets(manifest_paths: list[Path], requested: set[str]) -> list[tuple[Path, JsonObject]]:
    selected: list[tuple[Path, JsonObject]] = []
    for manifest_path in manifest_paths:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for asset in manifest["assets"]:
            keys = {str(asset.get("id", "")), str(asset.get("file", ""))}
            if requested and keys.isdisjoint(requested):
                continue
            selected.append((manifest_path, asset))
    return selected


def repair_asset(args: argparse.Namespace, manifest_path: Path, asset: JsonObject) -> JsonObject:
    path = args.background_dir / asset["file"]
    record: JsonObject = {
        "id": asset.get("id"),
        "file": asset.get("file"),
        "manifest": str(manifest_path),
        "path": str(path),
    }
    if not path.exists():
        return {**record, "status": "missing"}

    before = inspect_image(path, seam_px=args.qa_seam_px, pole_px=args.qa_pole_px)
    record["before"] = before
    if args.dry_run:
        return {**record, "status": "dry-run"}

    with Image.open(path) as image:
        repaired = repair_equirect_image(
            image,
            seam_px=args.seam_repair_px,
            pole_px=args.pole_repair_px,
        )
        temp_path = path.with_suffix(path.suffix + ".repairing")
        repaired.save(temp_path, "JPEG", quality=args.quality, optimize=True, progressive=True)
    temp_path.replace(path)

    after = inspect_image(path, seam_px=args.qa_seam_px, pole_px=args.qa_pole_px)
    return {**record, "status": "repaired", "after": after}


def main() -> None:
    args = parse_args()
    manifest_paths = args.manifest or [DEFAULT_MANIFEST]
    requested = selected_ids(args.asset)
    records = [repair_asset(args, manifest_path, asset) for manifest_path, asset in iter_assets(manifest_paths, requested)]

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")

    for record in records:
        if record["status"] == "missing":
            print(f"missing {record['id']}: {record['file']}")
            continue
        before = record["before"]
        if record["status"] == "dry-run":
            print(f"dry {record['id']}: seam={before['seam_mean_abs_delta']} pole={before['max_pole_horizontal_std']}")
            continue
        after = record["after"]
        print(
            f"repaired {record['id']}: "
            f"seam {before['seam_mean_abs_delta']} -> {after['seam_mean_abs_delta']}, "
            f"pole {before['max_pole_horizontal_std']} -> {after['max_pole_horizontal_std']}"
        )


if __name__ == "__main__":
    main()
