#!/usr/bin/env python3
"""Build loopable equirectangular video backgrounds from a motion manifest.

The creative contract lives in ``lupi-motion-loops.json``. This script is only
the renderer: it streams RGB frames directly into ffmpeg, supports multiple
output tiers, and keeps a small local cache so unchanged recipes do not rework
the same assets.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import math
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageStat

from lupi_equirect import inspect_pil_image


ATLAS_VIEW_ROOT = Path(__file__).resolve().parents[1]
BACKGROUND_DIR = ATLAS_VIEW_ROOT / "apps" / "web" / "public" / "backgrounds"
MANIFEST_PATH = ATLAS_VIEW_ROOT / "tools" / "lupi-motion-loops.json"
CACHE_DIR = ATLAS_VIEW_ROOT / "tools" / "lupi-motion-cache"
SCRIPT_PATH = Path(__file__).resolve()
RENDERER_VERSION = "2026-06-equirect-loop-qa-v2"


JsonObject = dict[str, Any]


@dataclass(frozen=True)
class MotionTier:
    id: str
    width: int
    height: int
    file_suffix: str
    crf: int
    format: str
    ffmpeg_preset: str
    codec: str
    pixel_format: str
    movflags: str


@dataclass(frozen=True)
class RenderJob:
    recipe: JsonObject
    tier: MotionTier


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH)
    parser.add_argument("--background-dir", type=Path, default=BACKGROUND_DIR)
    parser.add_argument("--cache-dir", type=Path, default=CACHE_DIR)
    parser.add_argument("--preset", action="append", default=[], help="Loop id to render. Repeat or comma-separate.")
    parser.add_argument("--tier", action="append", default=[], help="Tier id to render. Repeat or comma-separate.")
    parser.add_argument("--all", action="store_true", help="Render every authored motion loop.")
    parser.add_argument("--all-tiers", action="store_true", help="Render every manifest tier.")
    parser.add_argument("--force", action="store_true", help="Ignore the render cache and rebuild selected outputs.")
    parser.add_argument("--dry-run", action="store_true", help="Print selected jobs without rendering.")
    parser.add_argument("--list", action="store_true", help="Print manifest loop and tier ids.")
    parser.add_argument("--jobs", type=int, default=max(1, min(2, (os.cpu_count() or 2) // 2)))
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    parser.add_argument("--keep-frames", type=Path, help="Optional debug directory for rendered PNG frames.")
    return parser.parse_args()


def load_manifest(path: Path) -> JsonObject:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1:
        raise SystemExit(f"Unsupported motion manifest schema: {manifest.get('schema_version')}")
    if not manifest.get("loops"):
        raise SystemExit(f"Motion manifest has no loops: {path}")
    if not manifest.get("tiers"):
        raise SystemExit(f"Motion manifest has no tiers: {path}")
    return manifest


def selected_ids(raw_values: list[str]) -> set[str]:
    return {item.strip() for raw in raw_values for item in raw.split(",") if item.strip()}


def build_tier(raw_tier: JsonObject, defaults: JsonObject) -> MotionTier:
    return MotionTier(
        id=str(raw_tier["id"]),
        width=int(raw_tier["width"]),
        height=int(raw_tier["height"]),
        file_suffix=str(raw_tier.get("file_suffix", "")),
        crf=int(raw_tier.get("crf", defaults.get("crf", 23))),
        format=str(raw_tier.get("format", defaults.get("format", "mp4"))),
        ffmpeg_preset=str(raw_tier.get("ffmpeg_preset", defaults.get("ffmpeg_preset", "medium"))),
        codec=str(raw_tier.get("codec", defaults.get("codec", "libx264"))),
        pixel_format=str(raw_tier.get("pixel_format", defaults.get("pixel_format", "yuv420p"))),
        movflags=str(raw_tier.get("movflags", defaults.get("movflags", "+faststart"))),
    )


def select_tiers(args: argparse.Namespace, manifest: JsonObject) -> list[MotionTier]:
    defaults = manifest.get("defaults", {})
    tiers = [build_tier(raw_tier, defaults) for raw_tier in manifest["tiers"]]
    requested = selected_ids(args.tier)
    if args.all_tiers:
        return tiers
    if not requested:
        runtime_tier = str(manifest.get("runtime_tier", "quality"))
        requested = {runtime_tier}
    missing = requested - {tier.id for tier in tiers}
    if missing:
        raise SystemExit(f"Unknown tier(s): {', '.join(sorted(missing))}")
    return [tier for tier in tiers if tier.id in requested]


def select_recipes(args: argparse.Namespace, manifest: JsonObject) -> list[JsonObject]:
    requested = selected_ids(args.preset)
    recipes = list(manifest["loops"])
    if args.all or not requested:
        return recipes
    missing = requested - {str(recipe["id"]) for recipe in recipes}
    if missing:
        raise SystemExit(f"Unknown motion preset(s): {', '.join(sorted(missing))}")
    return [recipe for recipe in recipes if str(recipe["id"]) in requested]


def output_path(background_dir: Path, recipe: JsonObject, tier: MotionTier) -> Path:
    return background_dir / f"{recipe['output_base']}{tier.file_suffix}.{tier.format}"


def load_source(path: Path, size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as image:
        image = image.convert("RGB")
        if image.size != size:
            image = image.resize(size, Image.Resampling.LANCZOS)
        return image


def numeric_motion(recipe: JsonObject, defaults: JsonObject, name: str, fallback: float) -> float:
    return float(recipe.get("motion", {}).get(name, defaults.get(name, fallback)))


def add_periodic_light_band(frame: Image.Image, phase: float, recipe: JsonObject, defaults: JsonObject) -> Image.Image:
    strength = numeric_motion(recipe, defaults, "band_strength", 0)
    if strength <= 0:
        return frame

    width, height = frame.size
    band_color = tuple(int(value) for value in recipe.get("motion", {}).get("band_color", defaults.get("band_color", [122, 206, 230])))
    glow_blend = numeric_motion(recipe, defaults, "band_glow_blend", 0.18)
    center_y = height * (0.48 + 0.04 * math.sin(phase - math.pi / 5))
    band_height = height * 0.18

    mask = Image.new("L", frame.size, 0)
    draw = ImageDraw.Draw(mask)
    for y in range(height):
        distance = abs(y - center_y) / band_height
        value = max(0.0, 1.0 - distance * distance)
        if value:
            alpha = int(255 * strength * value)
            draw.line([(0, y), (width, y)], fill=alpha)

    glow = Image.new("RGB", frame.size, band_color)
    return Image.composite(Image.blend(frame, glow, glow_blend), frame, mask)


def render_frame(base: Image.Image, recipe: JsonObject, defaults: JsonObject, tier: MotionTier, index: int, total_frames: int) -> Image.Image:
    phase = math.tau * index / total_frames
    reference_width = float(defaults.get("reference_width", 2048))
    scale = tier.width / reference_width
    secondary_offset = numeric_motion(recipe, defaults, "secondary_phase_offset", 0.72)
    secondary_phase = phase + math.pi * secondary_offset

    drift_px = numeric_motion(recipe, defaults, "drift_px", 0) * scale
    layer_drift_px = numeric_motion(recipe, defaults, "layer_drift_px", 0) * scale
    layer_opacity = numeric_motion(recipe, defaults, "layer_opacity", 0)
    contrast = numeric_motion(recipe, defaults, "contrast", 1)
    color = numeric_motion(recipe, defaults, "color", 1)
    exposure_pulse = numeric_motion(recipe, defaults, "exposure_pulse", 0)

    base_shift = round(math.sin(phase) * drift_px)
    layer_shift = round(math.sin(secondary_phase) * layer_drift_px)

    frame = ImageChops.offset(base, base_shift, 0)
    if layer_opacity > 0:
        layer = ImageChops.offset(base, layer_shift, 0)
        frame = Image.blend(frame, layer, layer_opacity)
    frame = add_periodic_light_band(frame, phase, recipe, defaults)

    exposure = 1.0 + math.sin(phase + math.pi / 3) * exposure_pulse
    frame = ImageEnhance.Brightness(frame).enhance(exposure)
    frame = ImageEnhance.Contrast(frame).enhance(contrast)
    frame = ImageEnhance.Color(frame).enhance(color)
    return frame


def seam_delta(image: Image.Image, seam_px: int = 16) -> float:
    width, height = image.size
    left = image.crop((0, 0, seam_px, height)).convert("RGB")
    right = image.crop((width - seam_px, 0, width, height)).convert("RGB")
    stat = ImageStat.Stat(ImageChops.difference(left, right))
    return round(sum(stat.mean) / len(stat.mean), 3)


def mean_frame_delta(a: Image.Image, b: Image.Image) -> float:
    stat = ImageStat.Stat(ImageChops.difference(a.convert("RGB"), b.convert("RGB")))
    return round(sum(stat.mean) / len(stat.mean), 3)


def percentile(values: list[float], percent: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = (len(ordered) - 1) * max(0.0, min(100.0, percent)) / 100.0
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return round(ordered[int(index)], 3)
    weight = index - lower
    return round(ordered[lower] * (1.0 - weight) + ordered[upper] * weight, 3)


def render_hash(manifest: JsonObject, recipe: JsonObject, tier: MotionTier, source: Path) -> str:
    source_stat = source.stat()
    payload = {
        "schema_version": manifest["schema_version"],
        "renderer_version": RENDERER_VERSION,
        "defaults": manifest.get("defaults", {}),
        "recipe": recipe,
        "tier": tier.__dict__,
        "source": {
            "name": source.name,
            "size": source_stat.st_size,
            "mtime_ns": source_stat.st_mtime_ns,
        },
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def cache_path(cache_dir: Path, recipe: JsonObject, tier: MotionTier) -> Path:
    return cache_dir / f"{recipe['id']}__{tier.id}.json"


def cached_record(cache_dir: Path, recipe: JsonObject, tier: MotionTier) -> JsonObject | None:
    path = cache_path(cache_dir, recipe, tier)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def write_cache_record(cache_dir: Path, recipe: JsonObject, tier: MotionTier, record: JsonObject) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path(cache_dir, recipe, tier).write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")


def is_cached(args: argparse.Namespace, manifest: JsonObject, recipe: JsonObject, tier: MotionTier, source: Path, output: Path, key: str) -> bool:
    if args.force or not output.exists():
        return False
    record = cached_record(args.cache_dir, recipe, tier)
    return bool(record and record.get("render_hash") == key and record.get("output") == str(output))


def ffmpeg_command(args: argparse.Namespace, tier: MotionTier, fps: int, output: Path) -> list[str]:
    cmd = [
        args.ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{tier.width}x{tier.height}",
        "-r",
        str(fps),
        "-i",
        "-",
        "-an",
        "-c:v",
        tier.codec,
        "-preset",
        tier.ffmpeg_preset,
        "-crf",
        str(tier.crf),
        "-pix_fmt",
        tier.pixel_format,
    ]
    if tier.movflags:
        cmd.extend(["-movflags", tier.movflags])
    cmd.append(str(output))
    return cmd


def encode_stream(args: argparse.Namespace, manifest: JsonObject, recipe: JsonObject, tier: MotionTier, base: Image.Image, output: Path) -> tuple[Image.Image, Image.Image, JsonObject]:
    defaults = manifest.get("defaults", {})
    fps = int(defaults.get("fps", 24))
    duration = float(defaults.get("duration_seconds", 8))
    total_frames = int(round(duration * fps))
    output.parent.mkdir(parents=True, exist_ok=True)

    process = subprocess.Popen(
        ffmpeg_command(args, tier, fps, output),
        stdin=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert process.stdin is not None

    first_frame: Image.Image | None = None
    last_frame: Image.Image | None = None
    previous_frame: Image.Image | None = None
    adjacent_deltas: list[float] = []
    frame_dir = args.keep_frames / f"{recipe['id']}__{tier.id}" if args.keep_frames else None
    if frame_dir:
        frame_dir.mkdir(parents=True, exist_ok=True)

    try:
        for index in range(total_frames):
            frame = render_frame(base, recipe, defaults, tier, index, total_frames)
            if index == 0:
                first_frame = frame.copy()
            elif previous_frame is not None:
                adjacent_deltas.append(mean_frame_delta(previous_frame, frame))
            if index == total_frames - 1:
                last_frame = frame.copy()
            if frame_dir:
                frame.save(frame_dir / f"frame_{index:04d}.png")
            process.stdin.write(frame.tobytes())
            previous_frame = frame
    except BrokenPipeError as error:
        stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
        raise RuntimeError(f"ffmpeg closed early for {output}:\n{stderr}") from error
    finally:
        process.stdin.close()

    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg failed for {output} with exit {return_code}:\n{stderr}")
    assert first_frame is not None and last_frame is not None
    adjacent_metrics: JsonObject = {
        "mean_adjacent_frame_delta": round(sum(adjacent_deltas) / len(adjacent_deltas), 3) if adjacent_deltas else 0.0,
        "p95_adjacent_frame_delta": percentile(adjacent_deltas, 95),
        "max_adjacent_frame_delta": round(max(adjacent_deltas), 3) if adjacent_deltas else 0.0,
    }
    return first_frame, last_frame, adjacent_metrics


def render_job(args: argparse.Namespace, manifest: JsonObject, job: RenderJob) -> JsonObject:
    recipe = job.recipe
    tier = job.tier
    defaults = manifest.get("defaults", {})
    source = args.background_dir / str(recipe["source"])
    output = output_path(args.background_dir, recipe, tier)
    if not source.exists():
        raise RuntimeError(f"Missing source still for {recipe['id']}: {source}")
    if tier.width != tier.height * 2:
        raise RuntimeError(f"Tier {tier.id} must be 2:1 equirectangular, got {tier.width}x{tier.height}")

    key = render_hash(manifest, recipe, tier, source)
    if is_cached(args, manifest, recipe, tier, source, output, key):
        return {
            "id": recipe["id"],
            "tier": tier.id,
            "output": str(output),
            "status": "cached",
            "bytes": output.stat().st_size,
        }

    base = load_source(source, (tier.width, tier.height))
    source_qa = inspect_pil_image(base)
    first_frame, last_frame, adjacent_metrics = encode_stream(args, manifest, recipe, tier, base, output)
    first_frame_qa = inspect_pil_image(first_frame)
    last_frame_qa = inspect_pil_image(last_frame)
    loop_delta = mean_frame_delta(last_frame, first_frame)
    mean_adjacent_delta = float(adjacent_metrics["mean_adjacent_frame_delta"])
    p95_adjacent_delta = float(adjacent_metrics["p95_adjacent_frame_delta"])
    max_adjacent_delta = float(adjacent_metrics["max_adjacent_frame_delta"])
    loop_delta_ratio = round(loop_delta / mean_adjacent_delta, 3) if mean_adjacent_delta > 0 else 0.0
    loop_delta_p95_ratio = round(loop_delta / p95_adjacent_delta, 3) if p95_adjacent_delta > 0 else 0.0
    loop_delta_max_ratio = round(loop_delta / max_adjacent_delta, 3) if max_adjacent_delta > 0 else 0.0
    record: JsonObject = {
        "id": recipe["id"],
        "viewer_preset_id": recipe.get("viewer_preset_id"),
        "tier": tier.id,
        "source": str(source),
        "output": str(output),
        "render_hash": key,
        "renderer_version": RENDERER_VERSION,
        "width": tier.width,
        "height": tier.height,
        "fps": int(defaults.get("fps", 24)),
        "duration_seconds": float(defaults.get("duration_seconds", 8)),
        "frames": int(round(float(defaults.get("duration_seconds", 8)) * int(defaults.get("fps", 24)))),
        "bytes": output.stat().st_size,
        "source_qa": source_qa,
        "first_frame_qa": first_frame_qa,
        "last_frame_qa": last_frame_qa,
        "first_frame_seam_delta": first_frame_qa["seam_mean_abs_delta"],
        "last_to_first_mean_delta": loop_delta,
        **adjacent_metrics,
        "loop_delta_ratio": loop_delta_ratio,
        "loop_delta_p95_ratio": loop_delta_p95_ratio,
        "loop_delta_max_ratio": loop_delta_max_ratio,
        "status": "rendered",
    }
    write_cache_record(args.cache_dir, recipe, tier, record)
    return record


def main() -> None:
    args = parse_args()
    manifest = load_manifest(args.manifest)
    recipes = select_recipes(args, manifest)
    tiers = select_tiers(args, manifest)
    jobs = [RenderJob(recipe=recipe, tier=tier) for recipe in recipes for tier in tiers]

    if args.list:
        print(json.dumps({
            "manifest": str(args.manifest),
            "tiers": [tier.__dict__ for tier in select_tiers(argparse.Namespace(tier=[], all_tiers=True), manifest)],
            "loops": [{"id": recipe["id"], "viewer_preset_id": recipe.get("viewer_preset_id")} for recipe in manifest["loops"]],
        }, indent=2))
        return

    if args.dry_run:
        print(json.dumps([
            {
                "id": job.recipe["id"],
                "tier": job.tier.id,
                "output": str(output_path(args.background_dir, job.recipe, job.tier)),
            }
            for job in jobs
        ], indent=2))
        return

    if args.jobs <= 1 or len(jobs) <= 1:
        records = [render_job(args, manifest, job) for job in jobs]
    else:
        records = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as executor:
            future_to_job = {executor.submit(render_job, args, manifest, job): job for job in jobs}
            for future in concurrent.futures.as_completed(future_to_job):
                records.append(future.result())
        records.sort(key=lambda record: (str(record["id"]), str(record["tier"])))

    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
