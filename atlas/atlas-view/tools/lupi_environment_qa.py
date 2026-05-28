#!/usr/bin/env python3
"""Validate promoted Lupi environment-pack still panoramas."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from PIL import Image, ImageChops, ImageStat
except ImportError as exc:  # pragma: no cover - operator environment check
    raise SystemExit("Pillow is required. Run with the portable ComfyUI Python or install Pillow.") from exc


ATLAS_VIEW_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ATLAS_VIEW_ROOT / "tools" / "lupi-panorama-prompts.json"
DEFAULT_PUBLICATION_MANIFEST = ATLAS_VIEW_ROOT / "tools" / "lupi-publication-backgrounds.json"
DEFAULT_BACKGROUND_DIR = ATLAS_VIEW_ROOT / "apps" / "web" / "public" / "backgrounds"


def inspect_image(path: Path, seam_px: int) -> dict[str, Any]:
    with Image.open(path) as image:
        width, height = image.size
        left = image.crop((0, 0, seam_px, height)).convert("RGB")
        right = image.crop((width - seam_px, 0, width, height)).convert("RGB")
        diff = ImageChops.difference(left, right)
        stat = ImageStat.Stat(diff)
        seam_mean = round(sum(stat.mean) / len(stat.mean), 3)
    return {
        "path": str(path),
        "width": width,
        "height": height,
        "aspect": round(width / height, 4),
        "bytes": path.stat().st_size,
        "seam_mean_abs_delta": seam_mean,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", action="append", type=Path, help="Manifest to validate. Repeatable.")
    parser.add_argument("--background-dir", type=Path, default=DEFAULT_BACKGROUND_DIR)
    parser.add_argument("--seam-px", type=int, default=32)
    parser.add_argument("--max-seam-delta", type=float, default=45.0)
    parser.add_argument("--json-out", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_paths = args.manifest or [DEFAULT_MANIFEST, DEFAULT_PUBLICATION_MANIFEST]

    report: list[dict[str, Any]] = []
    failed = False

    for manifest_path in manifest_paths:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        expected_width = manifest["contract"]["target_width"]
        expected_height = manifest["contract"]["target_height"]

        for asset in manifest["assets"]:
            path = args.background_dir / asset["file"]
            entry: dict[str, Any] = {"id": asset["id"], "file": asset["file"], "manifest": str(manifest_path)}
            if not path.exists():
                entry["status"] = "missing"
                failed = True
            else:
                qa = inspect_image(path, args.seam_px)
                issues: list[str] = []
                if qa["width"] != expected_width or qa["height"] != expected_height:
                    issues.append(f"expected {expected_width}x{expected_height}")
                if abs(qa["aspect"] - 2.0) > 0.001:
                    issues.append("not 2:1 equirectangular")
                if qa["seam_mean_abs_delta"] > args.max_seam_delta:
                    issues.append(f"seam delta above {args.max_seam_delta}")
                entry.update({"status": "fail" if issues else "pass", "issues": issues, "qa": qa})
                failed = failed or bool(issues)
            report.append(entry)

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    for entry in report:
        if entry["status"] == "missing":
            print(f"missing {entry['id']}: {entry['file']}")
        else:
            qa = entry["qa"]
            issue_text = "" if entry["status"] == "pass" else " issues=" + ",".join(entry["issues"])
            print(
                f"{entry['status']} {entry['id']}: {qa['width']}x{qa['height']} "
                f"seam={qa['seam_mean_abs_delta']}{issue_text}"
            )

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
