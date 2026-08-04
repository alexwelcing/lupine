#!/usr/bin/env python3
"""Generate Lupi equirectangular backgrounds through the local ComfyUI API."""

from __future__ import annotations

import argparse
import json
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from PIL import Image
    from lupi_equirect import inspect_image, repair_equirect_image
except ImportError as exc:  # pragma: no cover - operator environment check
    raise SystemExit(
        "Pillow and numpy are required for JPEG conversion, equirect repair, "
        "and QA. Run this with the portable ComfyUI python_embeded/python.exe, "
        "or install both packages."
    ) from exc


ATLAS_VIEW_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ATLAS_VIEW_ROOT / "tools" / "lupi-panorama-prompts.json"
DEFAULT_BACKGROUND_DIR = ATLAS_VIEW_ROOT / "apps" / "web" / "public" / "backgrounds"
DEFAULT_CANDIDATE_DIR = ATLAS_VIEW_ROOT / "tools" / "lupi-environment-candidates"
DEFAULT_RUN_LEDGER = ATLAS_VIEW_ROOT / "tools" / "lupi-panorama-runs.jsonl"

SOTA_SEAM_POSITIVE = (
    "panorama-native spherical environment, circular horizontal latent continuity, "
    "yaw-invariant composition, cubemap-safe zenith and nadir, no discontinuity at any longitude cut, "
    "consistent lighting and texture flow across the left/right wrap"
)
SOTA_SEAM_NEGATIVE = (
    "single-sided lighting, unmatched left edge, unmatched right edge, discontinuous panorama, "
    "cube face edge artifact, polar swirl, polar pinch, stretched pole texture"
)


def request_json(base_url: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    url = base_url.rstrip("/") + path
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8") or "{}")


def request_bytes(base_url: str, path: str, query: dict[str, str]) -> bytes:
    url = base_url.rstrip("/") + path + "?" + urllib.parse.urlencode(query)
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def parse_int_list(value: str) -> list[int]:
    return [int(item.strip()) for item in value.split(",") if item.strip()]


def append_suffix(existing: str, addition: str) -> str:
    return ", ".join(part for part in (existing.strip(), addition.strip()) if part)


def build_workflow(asset: dict[str, Any], manifest: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    prompt_parts = [asset["prompt"]]
    if args.prompt_suffix:
        prompt_parts.append(args.prompt_suffix)
    prompt_parts.append(manifest["global_positive"])
    positive = ", ".join(prompt_parts)
    negative = manifest["global_negative"]
    if args.negative_suffix:
        negative = f"{negative}, {args.negative_suffix}"
    prefix = f"LUPI_PANO/{Path(asset['file']).stem}"

    workflow: dict[str, Any] = {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": args.model}},
        "2": {"class_type": "CLIPLoaderGGUF", "inputs": {"clip_name": args.clip, "type": args.clip_type}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": args.vae}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": args.shift}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": positive, "clip": ["2", 0]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["2", 0]}},
        "7": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": args.base_width, "height": args.base_height, "batch_size": 1},
        },
        "8": {
            "class_type": "KSampler",
            "inputs": {
                "seed": int(asset["seed"]) + args.seed_offset,
                "steps": args.steps,
                "cfg": args.cfg,
                "sampler_name": args.sampler,
                "scheduler": args.scheduler,
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0],
            },
        },
        "9": {
            "class_type": "VAEDecodeTiled" if args.tiled_decode else "VAEDecode",
            "inputs": {"samples": ["8", 0], "vae": ["3", 0]},
        },
    }

    if args.tiled_decode:
        workflow["9"]["inputs"].update(
            {
                "tile_size": args.vae_tile_size,
                "overlap": args.vae_overlap,
                "temporal_size": 64,
                "temporal_overlap": 8,
            }
        )

    image_ref: list[Any] = ["9", 0]
    next_id = 10
    if args.seamless_node:
        workflow[str(next_id)] = {
            "class_type": "Image Seamless Texture",
            "inputs": {
                "images": image_ref,
                "blending": args.seamless_blending,
                "tiled": "false",
                "tiles": 2,
            },
        }
        image_ref = [str(next_id), 0]
        next_id += 1

    workflow[str(next_id)] = {"class_type": "UpscaleModelLoader", "inputs": {"model_name": args.upscale_model}}
    upscale_model_ref = [str(next_id), 0]
    next_id += 1
    workflow[str(next_id)] = {
        "class_type": "ImageUpscaleWithModel",
        "inputs": {"upscale_model": upscale_model_ref, "image": image_ref},
    }
    image_ref = [str(next_id), 0]
    next_id += 1
    workflow[str(next_id)] = {
        "class_type": "ImageScale",
        "inputs": {
            "image": image_ref,
            "upscale_method": "lanczos",
            "width": args.target_width,
            "height": args.target_height,
            "crop": "disabled",
        },
    }
    image_ref = [str(next_id), 0]
    next_id += 1
    workflow[str(next_id)] = {"class_type": "SaveImage", "inputs": {"filename_prefix": prefix, "images": image_ref}}
    return workflow


def select_assets(manifest: dict[str, Any], requested: list[str], limit: int | None) -> list[dict[str, Any]]:
    assets = manifest["assets"]
    if requested:
        wanted = {item for raw in requested for item in raw.split(",") if item}
        assets = [asset for asset in assets if asset["id"] in wanted or asset["file"] in wanted]
        found = {asset["id"] for asset in assets} | {asset["file"] for asset in assets}
        missing = wanted - found
        if missing:
            raise SystemExit(f"Unknown panorama asset(s): {', '.join(sorted(missing))}")
    if limit is not None:
        assets = assets[:limit]
    return assets


def wait_for_history(base_url: str, prompt_id: str, timeout_s: int, poll_s: float) -> dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        history = request_json(base_url, f"/history/{prompt_id}")
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(poll_s)
    raise TimeoutError(f"ComfyUI prompt did not finish within {timeout_s}s: {prompt_id}")


def find_saved_image(history_entry: dict[str, Any]) -> dict[str, str]:
    for output in history_entry.get("outputs", {}).values():
        for image in output.get("images", []):
            if image.get("type") == "output":
                return {
                    "filename": image["filename"],
                    "subfolder": image.get("subfolder", ""),
                    "type": image.get("type", "output"),
                }
    status = history_entry.get("status", {})
    for message_type, payload in status.get("messages", []):
        if message_type == "execution_error":
            node_id = payload.get("node_id", "?")
            node_type = payload.get("node_type", "?")
            exception_type = payload.get("exception_type", "ComfyExecutionError")
            exception_message = payload.get("exception_message", "unknown ComfyUI error").strip()
            raise RuntimeError(f"ComfyUI node {node_id} ({node_type}) failed: {exception_type}: {exception_message}")
    raise RuntimeError("No output image was reported by ComfyUI history")


def apply_postprocess(image: Image.Image, postprocess: dict[str, Any], target_size: tuple[int, int]) -> Image.Image:
    crop_fill = postprocess.get("crop_fill")
    if crop_fill:
        if len(crop_fill) != 4:
            raise ValueError("postprocess.crop_fill must contain [left, top, right, bottom]")
        width, height = image.size
        left, top, right, bottom = crop_fill
        if all(isinstance(value, (int, float)) and 0 <= value <= 1 for value in crop_fill):
            box = (
                int(round(left * width)),
                int(round(top * height)),
                int(round(right * width)),
                int(round(bottom * height)),
            )
        else:
            box = (int(left), int(top), int(right), int(bottom))
        image = image.crop(box)
        image = image.resize(target_size, Image.Resampling.LANCZOS)
    return image


def write_jpeg(
    image_bytes: bytes,
    destination: Path,
    quality: int,
    postprocess: dict[str, Any],
    target_size: tuple[int, int],
    repair: bool,
    seam_repair_px: int,
    pole_repair_px: int,
    yaw_offsets: list[int],
    cube_face_size: int,
) -> dict[str, Any]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_png = destination.with_suffix(".comfy.png")
    temp_png.write_bytes(image_bytes)
    with Image.open(temp_png) as image:
        image = image.convert("RGB")
        image = apply_postprocess(image, postprocess, target_size)
        if repair:
            image = repair_equirect_image(image, seam_px=seam_repair_px, pole_px=pole_repair_px)
        image.save(destination, "JPEG", quality=quality, optimize=True, progressive=True)
    temp_png.unlink(missing_ok=True)
    return inspect_image(destination, yaw_offsets=yaw_offsets, cube_face_size=cube_face_size)


def append_ledger(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, sort_keys=True) + "\n")


def make_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]


def candidate_path(candidate_dir: Path, run_id: str, asset: dict[str, Any]) -> Path:
    return candidate_dir / run_id / asset["id"] / asset["file"]


def load_run_record(ledger: Path, run_id: str) -> dict[str, Any]:
    if not ledger.exists():
        raise SystemExit(f"Run ledger does not exist: {ledger}")
    found: dict[str, Any] | None = None
    with ledger.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("run_id") == run_id:
                found = record
    if not found:
        raise SystemExit(f"Run id not found in ledger: {run_id}")
    return found


def normalize_requested_assets(requested: list[str]) -> set[str]:
    return {item for raw in requested for item in raw.split(",") if item}


def qa_settings(manifest: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    qa_contract = manifest.get("contract", {}).get("qa", {})
    yaw_offsets = parse_int_list(args.qa_yaw_offsets) if args.qa_yaw_offsets else list(qa_contract.get("yaw_offsets_degrees", [0, 90, 180, 270]))
    cube_face_size = args.qa_cube_face_size if args.qa_cube_face_size is not None else int(qa_contract.get("cube_face_size", 96))
    return {
        "seam_px": int(qa_contract.get("seam_px", 32)),
        "pole_px": int(qa_contract.get("pole_px", 48)),
        "yaw_offsets": yaw_offsets,
        "cube_face_size": cube_face_size,
        "max_seam_delta": args.max_seam_delta if args.max_seam_delta is not None else qa_contract.get("max_seam_delta"),
        "max_yaw_seam_delta": args.max_yaw_seam_delta if args.max_yaw_seam_delta is not None else qa_contract.get("max_yaw_seam_delta"),
        "max_pole_std": args.max_pole_std if args.max_pole_std is not None else qa_contract.get("max_pole_std"),
        "max_cube_edge_gradient": args.max_cube_edge_gradient
        if args.max_cube_edge_gradient is not None
        else qa_contract.get("max_cube_edge_gradient"),
    }


def qa_issues(qa: dict[str, Any], settings: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    max_seam_delta = settings.get("max_seam_delta")
    max_yaw_seam_delta = settings.get("max_yaw_seam_delta")
    max_pole_std = settings.get("max_pole_std")
    max_cube_edge_gradient = settings.get("max_cube_edge_gradient")
    if max_seam_delta is not None and qa["seam_mean_abs_delta"] > float(max_seam_delta):
        issues.append(f"seam delta above {float(max_seam_delta)}")
    if max_yaw_seam_delta is not None and qa["yaw_seam_mean_abs_delta_max"] > float(max_yaw_seam_delta):
        issues.append(f"yaw seam delta above {float(max_yaw_seam_delta)}")
    if max_pole_std is not None and qa["max_pole_horizontal_std"] > float(max_pole_std):
        issues.append(f"pole std above {float(max_pole_std)}")
    if max_cube_edge_gradient is not None and qa["cube_edge_gradient_max"] > float(max_cube_edge_gradient):
        issues.append(f"cube edge gradient above {float(max_cube_edge_gradient)}")
    return issues


def promote_run(
    record: dict[str, Any],
    output_dir: Path,
    qa_options: dict[str, Any],
    requested: set[str] | None = None,
) -> dict[str, Any]:
    requested = requested or set()
    found: set[str] = set()
    promoted: list[dict[str, Any]] = []
    for asset in record.get("assets", []):
        if asset.get("skipped"):
            continue
        asset_keys = {str(asset.get("id", "")), str(asset.get("file", ""))}
        if requested and asset_keys.isdisjoint(requested):
            continue
        found.update(asset_keys & requested)
        source = Path(asset.get("candidate_file", ""))
        if not source.exists():
            raise SystemExit(f"Candidate file is missing for {asset.get('id')}: {source}")
        destination = output_dir / asset["file"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        qa = inspect_image(
            destination,
            seam_px=qa_options["seam_px"],
            pole_px=qa_options["pole_px"],
            yaw_offsets=qa_options["yaw_offsets"],
            cube_face_size=qa_options["cube_face_size"],
        )
        issues = qa_issues(qa, qa_options)
        if issues:
            raise SystemExit(f"Promoted asset failed equirect QA for {asset['id']}: {', '.join(issues)}")
        promoted.append({"id": asset["id"], "file": asset["file"], "source": str(source), "destination": str(destination), "qa": qa})
        print(f"promoted {asset['id']} -> {destination}")
    missing = requested - found
    if missing:
        raise SystemExit(f"Requested promoted asset(s) were not found in run: {', '.join(sorted(missing))}")
    return {
        "promoted_at": datetime.now(timezone.utc).isoformat(),
        "source_run_id": record.get("run_id"),
        "assets": promoted,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comfy-url", default="http://127.0.0.1:8199")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_BACKGROUND_DIR, help="Final public background directory used by --promote-run.")
    parser.add_argument("--candidate-dir", type=Path, default=DEFAULT_CANDIDATE_DIR)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_RUN_LEDGER)
    parser.add_argument("--run-id", help="Optional stable run id. Defaults to a timestamp plus short UUID.")
    parser.add_argument("--promote-run", help="Promote a completed run id from the ledger into --output-dir and exit.")
    parser.add_argument("--asset", action="append", default=[], help="Asset id or filename. Repeat or comma-separate.")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--workflow-out", type=Path, help="Write the first generated API workflow JSON and exit.")
    parser.add_argument("--production-quality", action="store_true", help="Use a heavier 2:1 latent and tiled decode defaults for final 4K candidates.")
    parser.add_argument("--sota-seam-profile", action="store_true", help="Apply SHERPA-inspired circular seam prompts, production defaults, wider repair, and yaw/cube QA.")
    parser.add_argument("--base-width", type=int, default=1024)
    parser.add_argument("--base-height", type=int, default=512)
    parser.add_argument("--target-width", type=int, default=4096)
    parser.add_argument("--target-height", type=int, default=2048)
    parser.add_argument("--steps", type=int, default=8)
    parser.add_argument("--cfg", type=float, default=1.0)
    parser.add_argument("--seed-offset", type=int, default=0, help="Add a deterministic offset to every manifest seed for variant sweeps.")
    parser.add_argument("--prompt-suffix", default="", help="Append extra positive prompt language to every selected asset.")
    parser.add_argument("--negative-suffix", default="", help="Append extra negative prompt language to every selected asset.")
    parser.add_argument("--sampler", default="euler")
    parser.add_argument("--scheduler", default="simple")
    parser.add_argument("--shift", type=float, default=1.0)
    parser.add_argument("--model", default="z_image_turbo-Q8_0.gguf")
    parser.add_argument("--clip", default="Qwen_3_4b-Q8_0.gguf")
    parser.add_argument("--clip-type", default="sd3")
    parser.add_argument("--vae", default="ae.safetensors")
    parser.add_argument("--upscale-model", default="4x-UltraSharp.pth")
    parser.add_argument("--jpeg-quality", type=int, default=92)
    parser.add_argument("--no-equirect-repair", action="store_true", help="Disable seam and pole-cap repair before writing JPEGs.")
    parser.add_argument("--seam-repair-px", type=int, default=160)
    parser.add_argument("--pole-repair-px", type=int, default=220)
    parser.add_argument("--qa-yaw-offsets", default="", help="Comma-separated yaw cuts to inspect after generation. Defaults to manifest QA offsets.")
    parser.add_argument("--qa-cube-face-size", type=int)
    parser.add_argument("--max-seam-delta", type=float)
    parser.add_argument("--max-yaw-seam-delta", type=float)
    parser.add_argument("--max-pole-std", type=float)
    parser.add_argument("--max-cube-edge-gradient", type=float)
    parser.add_argument("--allow-qa-fail", action="store_true", help="Record failed QA candidates instead of aborting the run.")
    parser.add_argument("--timeout-s", type=int, default=900)
    parser.add_argument("--poll-s", type=float, default=2.0)
    parser.add_argument("--tiled-decode", action="store_true")
    parser.add_argument("--vae-tile-size", type=int, default=512)
    parser.add_argument("--vae-overlap", type=int, default=64)
    parser.add_argument("--seamless-node", action="store_true")
    parser.add_argument("--seamless-blending", type=float, default=0.28)
    return parser.parse_args()


def apply_sota_seam_profile(args: argparse.Namespace) -> None:
    if not args.sota_seam_profile:
        return
    args.production_quality = True
    args.prompt_suffix = append_suffix(args.prompt_suffix, SOTA_SEAM_POSITIVE)
    args.negative_suffix = append_suffix(args.negative_suffix, SOTA_SEAM_NEGATIVE)
    if not args.qa_yaw_offsets:
        args.qa_yaw_offsets = "0,45,90,135,180,225,270,315"
    if args.qa_cube_face_size is None:
        args.qa_cube_face_size = 128
    if args.steps == 8:
        args.steps = 22
    if args.seam_repair_px == 160:
        args.seam_repair_px = 320
    if args.pole_repair_px == 220:
        args.pole_repair_px = 320


def apply_quality_profile(args: argparse.Namespace) -> None:
    if not args.production_quality:
        return
    if args.base_width == 1024 and args.base_height == 512:
        args.base_width = 2048
        args.base_height = 1024
    if args.steps == 8:
        args.steps = 18
    if not args.tiled_decode:
        args.tiled_decode = True
    if args.vae_tile_size == 512:
        args.vae_tile_size = 768
    if args.vae_overlap == 64:
        args.vae_overlap = 96
    if args.seam_repair_px == 160:
        args.seam_repair_px = 256
    if args.pole_repair_px == 220:
        args.pole_repair_px = 256


def main() -> None:
    args = parse_args()
    apply_sota_seam_profile(args)
    apply_quality_profile(args)
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    qa_options = qa_settings(manifest, args)

    if args.promote_run:
        record = load_run_record(args.ledger, args.promote_run)
        promotion_record = promote_run(record, args.output_dir, qa_options, normalize_requested_assets(args.asset))
        append_ledger(args.ledger, {"type": "promotion", **promotion_record})
        print(f"promotion ledger appended: {args.ledger}")
        return

    if args.target_width != args.target_height * 2:
        raise SystemExit("target dimensions must be a true 2:1 equirectangular aspect")
    if args.base_width != args.base_height * 2:
        raise SystemExit("base dimensions must be a true 2:1 equirectangular aspect")

    assets = select_assets(manifest, args.asset, args.limit)
    if not assets:
        raise SystemExit("No panorama assets selected")

    first_workflow = build_workflow(assets[0], manifest, args)
    if args.workflow_out:
        args.workflow_out.parent.mkdir(parents=True, exist_ok=True)
        args.workflow_out.write_text(json.dumps(first_workflow, indent=2) + "\n", encoding="utf-8")
        print(f"wrote workflow: {args.workflow_out}")
        if args.dry_run:
            return

    client_id = str(uuid.uuid4())
    run_id = args.run_id or make_run_id()
    run_record: dict[str, Any] = {
        "type": "candidate_generation",
        "run_id": run_id,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "comfy_url": args.comfy_url,
        "base_size": [args.base_width, args.base_height],
        "target_size": [args.target_width, args.target_height],
        "candidate_dir": str(args.candidate_dir),
        "promotion_dir": str(args.output_dir),
        "seed_offset": args.seed_offset,
        "prompt_suffix": args.prompt_suffix,
        "negative_suffix": args.negative_suffix,
        "model": args.model,
        "clip": args.clip,
        "vae": args.vae,
        "upscale_model": args.upscale_model,
        "sota_seam_profile": args.sota_seam_profile,
        "qa_settings": qa_options,
        "assets": [],
    }
    if not args.dry_run:
        print(f"candidate run: {run_id}")

    for asset in assets:
        destination = candidate_path(args.candidate_dir, run_id, asset)
        if args.skip_existing and destination.exists():
            qa = inspect_image(destination)
            print(f"skip existing {asset['id']}: {qa['width']}x{qa['height']}")
            run_record["assets"].append(
                {"id": asset["id"], "file": asset["file"], "candidate_file": str(destination), "skipped": True, "qa": qa}
            )
            continue

        workflow = build_workflow(asset, manifest, args)
        if args.dry_run:
            print(json.dumps({"asset": asset["id"], "workflow": workflow}, indent=2))
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        (destination.parent / "workflow.json").write_text(json.dumps(workflow, indent=2) + "\n", encoding="utf-8")
        (destination.parent / "prompt.json").write_text(
            json.dumps(
                {
                    "id": asset["id"],
                    "file": asset["file"],
                    "seed": int(asset["seed"]) + args.seed_offset,
                    "base_seed": asset["seed"],
                    "prompt": asset["prompt"],
                    "prompt_suffix": args.prompt_suffix,
                    "global_positive": manifest["global_positive"],
                    "global_negative": manifest["global_negative"],
                    "negative_suffix": args.negative_suffix,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

        print(f"queue {asset['id']} -> candidate {destination}")
        response = request_json(args.comfy_url, "/prompt", {"prompt": workflow, "client_id": client_id})
        prompt_id = response["prompt_id"]
        history_entry = wait_for_history(args.comfy_url, prompt_id, args.timeout_s, args.poll_s)
        image_info = find_saved_image(history_entry)
        image_bytes = request_bytes(args.comfy_url, "/view", image_info)
        qa = write_jpeg(
            image_bytes,
            destination,
            args.jpeg_quality,
            asset.get("postprocess", {}),
            (args.target_width, args.target_height),
            not args.no_equirect_repair,
            args.seam_repair_px,
            args.pole_repair_px,
            qa_options["yaw_offsets"],
            qa_options["cube_face_size"],
        )
        issues = qa_issues(qa, qa_options)
        print(
            f"saved {asset['id']}: {qa['width']}x{qa['height']} "
            f"{qa['bytes'] / 1024:.1f} KB seam_delta={qa['seam_mean_abs_delta']} "
            f"yaw_delta={qa['yaw_seam_mean_abs_delta_max']} "
            f"pole_std={qa['max_pole_horizontal_std']} cube_edge={qa['cube_edge_gradient_max']}"
        )
        if issues:
            print(f"qa fail {asset['id']}: {', '.join(issues)}")
        run_record["assets"].append(
            {
                "id": asset["id"],
                "file": asset["file"],
                "candidate_file": str(destination),
                "prompt_id": prompt_id,
                "comfy_image": image_info,
                "qa": qa,
                "qa_issues": issues,
            }
        )
        if issues and not args.allow_qa_fail:
            raise SystemExit(f"Stopping after failed equirect QA for {asset['id']}: {', '.join(issues)}")

    if not args.dry_run:
        run_record["finished_at"] = datetime.now(timezone.utc).isoformat()
        append_ledger(args.ledger, run_record)
        print(f"ledger appended: {args.ledger}")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.URLError as exc:
        raise SystemExit(f"ComfyUI request failed: {exc}") from exc
