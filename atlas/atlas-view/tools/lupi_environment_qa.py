#!/usr/bin/env python3
"""Validate promoted Lupi environment-pack still panoramas."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from lupi_equirect import inspect_image
except ImportError as exc:  # pragma: no cover - operator environment check
    raise SystemExit("Pillow and numpy are required. Run with the portable ComfyUI Python or install them.") from exc


ATLAS_VIEW_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ATLAS_VIEW_ROOT / "tools" / "lupi-panorama-prompts.json"
DEFAULT_PUBLICATION_MANIFEST = ATLAS_VIEW_ROOT / "tools" / "lupi-publication-backgrounds.json"
DEFAULT_WORLD_MANIFEST = ATLAS_VIEW_ROOT / "tools" / "lupi-world-backgrounds.json"
DEFAULT_BACKGROUND_DIR = ATLAS_VIEW_ROOT / "apps" / "web" / "public" / "backgrounds"


def parse_int_list(value: str) -> list[int]:
    return [int(item.strip()) for item in value.split(",") if item.strip()]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", action="append", type=Path, help="Manifest to validate. Repeatable.")
    parser.add_argument("--background-dir", type=Path, default=DEFAULT_BACKGROUND_DIR)
    parser.add_argument("--seam-px", type=int)
    parser.add_argument("--pole-px", type=int)
    parser.add_argument("--max-seam-delta", type=float)
    parser.add_argument("--max-yaw-seam-delta", type=float)
    parser.add_argument("--max-pole-std", type=float)
    parser.add_argument("--max-cube-edge-gradient", type=float)
    parser.add_argument("--yaw-offsets", default="")
    parser.add_argument("--cube-face-size", type=int)
    parser.add_argument("--json-out", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_paths = args.manifest or [DEFAULT_MANIFEST, DEFAULT_PUBLICATION_MANIFEST, DEFAULT_WORLD_MANIFEST]

    report: list[dict[str, Any]] = []
    failed = False

    for manifest_path in manifest_paths:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        expected_width = manifest["contract"]["target_width"]
        expected_height = manifest["contract"]["target_height"]
        qa_contract = manifest.get("contract", {}).get("qa", {})
        seam_px = args.seam_px if args.seam_px is not None else int(qa_contract.get("seam_px", 32))
        pole_px = args.pole_px if args.pole_px is not None else int(qa_contract.get("pole_px", 48))
        yaw_offsets = parse_int_list(args.yaw_offsets) if args.yaw_offsets else list(qa_contract.get("yaw_offsets_degrees", [0, 90, 180, 270]))
        cube_face_size = args.cube_face_size if args.cube_face_size is not None else int(qa_contract.get("cube_face_size", 96))
        max_seam_delta = args.max_seam_delta if args.max_seam_delta is not None else float(qa_contract.get("max_seam_delta", 45.0))
        max_yaw_seam_delta = (
            args.max_yaw_seam_delta
            if args.max_yaw_seam_delta is not None
            else qa_contract.get("max_yaw_seam_delta")
        )
        max_pole_std = args.max_pole_std if args.max_pole_std is not None else qa_contract.get("max_pole_std")
        max_cube_edge_gradient = (
            args.max_cube_edge_gradient
            if args.max_cube_edge_gradient is not None
            else qa_contract.get("max_cube_edge_gradient")
        )

        for asset in manifest["assets"]:
            path = args.background_dir / asset["file"]
            entry: dict[str, Any] = {"id": asset["id"], "file": asset["file"], "manifest": str(manifest_path)}
            if not path.exists():
                entry["status"] = "missing"
                failed = True
            else:
                qa = inspect_image(path, seam_px=seam_px, pole_px=pole_px, yaw_offsets=yaw_offsets, cube_face_size=cube_face_size)
                issues: list[str] = []
                if qa["width"] != expected_width or qa["height"] != expected_height:
                    issues.append(f"expected {expected_width}x{expected_height}")
                if abs(qa["aspect"] - 2.0) > 0.001:
                    issues.append("not 2:1 equirectangular")
                if qa["seam_mean_abs_delta"] > max_seam_delta:
                    issues.append(f"seam delta above {max_seam_delta}")
                if max_yaw_seam_delta is not None and qa["yaw_seam_mean_abs_delta_max"] > float(max_yaw_seam_delta):
                    issues.append(f"yaw seam delta above {float(max_yaw_seam_delta)}")
                if max_pole_std is not None and qa["max_pole_horizontal_std"] > float(max_pole_std):
                    issues.append(f"pole std above {float(max_pole_std)}")
                if max_cube_edge_gradient is not None and qa["cube_edge_gradient_max"] > float(max_cube_edge_gradient):
                    issues.append(f"cube edge gradient above {float(max_cube_edge_gradient)}")
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
                f"seam={qa['seam_mean_abs_delta']} yaw={qa['yaw_seam_mean_abs_delta_max']} "
                f"pole={qa['max_pole_horizontal_std']} cube={qa['cube_edge_gradient_max']}{issue_text}"
            )

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
