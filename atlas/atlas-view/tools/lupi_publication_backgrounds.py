#!/usr/bin/env python3
"""Generate practical publication-context backgrounds for Lupi.

The editorial intent lives in ``lupi-publication-backgrounds.json``. This script
renders deterministic 2:1 equirectangular stills with calm centers and contextual
edge detail for scientific figures.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat


ATLAS_VIEW_ROOT = Path(__file__).resolve().parents[1]
BACKGROUND_DIR = ATLAS_VIEW_ROOT / "apps" / "web" / "public" / "backgrounds"
MANIFEST_PATH = ATLAS_VIEW_ROOT / "tools" / "lupi-publication-backgrounds.json"

JsonObject = dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH)
    parser.add_argument("--background-dir", type=Path, default=BACKGROUND_DIR)
    parser.add_argument("--asset", action="append", default=[], help="Asset id to render. Repeat or comma-separate.")
    parser.add_argument("--all", action="store_true", help="Render every publication context asset.")
    parser.add_argument("--width", type=int)
    parser.add_argument("--height", type=int)
    parser.add_argument("--quality", type=int, default=92)
    return parser.parse_args()


def selected_ids(raw_values: list[str]) -> set[str]:
    return {item.strip() for raw in raw_values for item in raw.split(",") if item.strip()}


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    normalized = value.strip().lstrip("#")
    return tuple(int(normalized[i:i + 2], 16) for i in (0, 2, 4))


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def soften_center(image: Image.Image, strength: float = 0.45) -> Image.Image:
    width, height = image.size
    veil = Image.new("RGB", image.size, image.resize((1, 1), Image.Resampling.BICUBIC).getpixel((0, 0)))
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(
        (
            int(width * 0.28),
            int(height * 0.18),
            int(width * 0.72),
            int(height * 0.82),
        ),
        fill=int(255 * strength),
    )
    mask = mask.filter(ImageFilter.GaussianBlur(int(height * 0.12)))
    return Image.composite(veil, image, mask)


def add_vignette(image: Image.Image, color: tuple[int, int, int], strength: float = 0.35) -> Image.Image:
    width, height = image.size
    mask = Image.new("L", image.size, 0)
    pix = mask.load()
    for y in range(height):
        ny = abs(y / (height - 1) - 0.5) * 2
        for x in range(width):
            nx = abs(x / (width - 1) - 0.5) * 2
            edge = max(nx, ny)
            pix[x, y] = round(255 * strength * max(0, edge - 0.35) / 0.65)
    overlay = Image.new("RGB", image.size, color)
    return Image.composite(overlay, image, mask.filter(ImageFilter.GaussianBlur(40)))


def base_gradient(width: int, height: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    image = Image.new("RGB", (width, height), top)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        t = y / max(1, height - 1)
        draw.line([(0, y), (width, y)], fill=mix(top, bottom, t))
    return image


def draw_periodic_vertical_lines(draw: ImageDraw.ImageDraw, width: int, height: int, spacing: int, fill: tuple[int, int, int], alpha: int) -> None:
    rgba = (*fill, alpha)
    for x in range(0, width, spacing):
        draw.line([(x, 0), (x, height)], fill=rgba, width=1)


def overlay_grid(image: Image.Image, color: tuple[int, int, int], spacing: int, alpha: int, every: int = 4) -> Image.Image:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    width, height = image.size
    draw_periodic_vertical_lines(draw, width, height, spacing, color, alpha)
    for y in range(0, height, spacing):
        draw.line([(0, y), (width, y)], fill=(*color, alpha), width=1)
    for x in range(0, width, spacing * every):
        draw.line([(x, 0), (x, height)], fill=(*color, min(255, alpha * 2)), width=1)
    for y in range(0, height, spacing * every):
        draw.line([(0, y), (width, y)], fill=(*color, min(255, alpha * 2)), width=1)
    return Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")


def figure_plate(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[0], palette[1])
    image = overlay_grid(image, palette[2], max(64, width // 48), 24, every=4)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rectangle((0, int(height * 0.76), width, int(height * 0.78)), fill=(*palette[2], 38))
    draw.rectangle((0, int(height * 0.18), width, int(height * 0.19)), fill=(*palette[2], 24))
    image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
    return soften_center(image, 0.36)


def cryoem_grid(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[1], palette[0])
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    radius = max(56, width // 34)
    spacing_x = radius * 3
    spacing_y = radius * 3
    for row, y in enumerate(range(-spacing_y, height + spacing_y, spacing_y)):
        offset = (row % 2) * spacing_x // 2
        for x in range(-spacing_x, width + spacing_x, spacing_x):
            cx = (x + offset) % width
            alpha = 48 if abs(cx - width / 2) > width * 0.22 or abs(y - height / 2) > height * 0.22 else 18
            draw.ellipse((cx - radius, y - radius, cx + radius, y + radius), outline=(*palette[3], alpha), width=3)
            draw.ellipse((cx - radius // 2, y - radius // 2, cx + radius // 2, y + radius // 2), fill=(*palette[2], alpha // 3))
    layer = layer.filter(ImageFilter.GaussianBlur(1.2))
    image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
    return soften_center(add_vignette(image, palette[0], 0.42), 0.48)


def diffraction_plate(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[1], palette[0])
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    center = (width // 2, height // 2)
    for r in [height * 0.18, height * 0.31, height * 0.44, height * 0.58]:
        draw.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), outline=(*palette[2], 26), width=2)
    for k in range(1, 10):
        for angle in range(0, 360, 18):
            phase = math.radians(angle + k * 7)
            r = height * (0.13 + k * 0.055)
            x = int((center[0] + math.cos(phase) * r) % width)
            y = int(center[1] + math.sin(phase) * r * 0.76)
            if abs(x - center[0]) < width * 0.16 and abs(y - center[1]) < height * 0.22:
                continue
            spot = max(2, int(8 - k * 0.35))
            alpha = max(28, 96 - k * 6)
            draw.ellipse((x - spot, y - spot, x + spot, y + spot), fill=(*palette[3], alpha))
    image = Image.alpha_composite(image.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(0.6))).convert("RGB")
    return soften_center(image, 0.52)


def density_contours(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[1], palette[0])
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(22):
        cy = int(height * (0.12 + 0.78 * i / 21))
        points = []
        for x in range(0, width + 16, 16):
            wave = math.sin(x / width * math.tau * 3 + i * 0.7) + 0.45 * math.sin(x / width * math.tau * 7 - i)
            y = cy + int(wave * height * 0.018)
            points.append((x, y))
        alpha = 42 if abs(cy - height / 2) > height * 0.18 else 18
        draw.line(points, fill=(*palette[3], alpha), width=2)
    for i in range(16):
        cx = int(width * i / 16)
        points = []
        for y in range(0, height + 12, 12):
            wave = math.sin(y / height * math.tau * 2 + i * 0.8)
            x = (cx + int(wave * width * 0.012)) % width
            points.append((x, y))
        draw.line(points, fill=(*palette[2], 24), width=1)
    image = Image.alpha_composite(image.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(0.5))).convert("RGB")
    return soften_center(add_vignette(image, palette[0], 0.35), 0.45)


def spectrum_strip(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[1], palette[0])
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    base_y = int(height * 0.78)
    for trace, color in enumerate([palette[2], palette[3], mix(palette[2], palette[3], 0.5)]):
        points = []
        for x in range(0, width + 8, 8):
            t = x / width
            y = base_y - trace * 70
            y -= int(height * 0.04 * math.sin(t * math.tau * (3 + trace) + trace))
            for peak in [0.18, 0.33, 0.49, 0.68, 0.82]:
                y -= int(height * 0.08 / (1 + ((t - peak) * 90) ** 2))
            points.append((x, y))
        draw.line(points, fill=(*color, 92 - trace * 18), width=3)
    for x in range(0, width, width // 32):
        draw.line([(x, int(height * 0.74)), (x, int(height * 0.91))], fill=(*palette[2], 22), width=1)
    image = Image.alpha_composite(image.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(0.2))).convert("RGB")
    return soften_center(image, 0.50)


def lab_notebook(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[0], palette[1])
    image = overlay_grid(image, palette[2], max(48, width // 64), 35, every=4)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    margin = int(width * 0.07)
    draw.line([(margin, 0), (margin, height)], fill=(*palette[3], 48), width=2)
    draw.line([(width - margin, 0), (width - margin, height)], fill=(*palette[3], 24), width=1)
    image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
    return soften_center(image, 0.42)


def beamline_slate(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[1], palette[0])
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    horizon = int(height * 0.58)
    draw.rectangle((0, horizon, width, height), fill=(*palette[0], 62))
    draw.line([(0, horizon), (width, horizon)], fill=(*palette[3], 54), width=3)
    for x in range(-width // 8, width + width // 8, width // 8):
        draw.polygon([(x, horizon), (x + width // 18, horizon), (x + width // 7, height), (x - width // 20, height)], fill=(*palette[2], 34))
    draw.line([(0, int(height * 0.44)), (width, int(height * 0.32))], fill=(*palette[3], 46), width=5)
    image = Image.alpha_composite(image.convert("RGBA"), layer.filter(ImageFilter.GaussianBlur(0.8))).convert("RGB")
    return soften_center(add_vignette(image, palette[0], 0.32), 0.43)


def phase_map(asset: JsonObject, width: int, height: int) -> Image.Image:
    palette = [hex_to_rgb(c) for c in asset["palette"]]
    image = base_gradient(width, height, palette[1], palette[0])
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(10):
        points = []
        y_base = int(height * (0.18 + i * 0.07))
        for x in range(0, width + 20, 20):
            t = x / width
            y = y_base + int(math.sin(t * math.tau * (1.5 + i * 0.12) + i) * height * 0.035)
            points.append((x, y))
        color = mix(palette[2], palette[3], i / 9)
        alpha = 50 if i < 7 else 34
        draw.line(points, fill=(*color, alpha), width=3)
    image = overlay_grid(Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB"), palette[2], max(96, width // 40), 18, every=3)
    return soften_center(add_vignette(image, palette[0], 0.38), 0.46)


STYLE_RENDERERS = {
    "figure_plate": figure_plate,
    "cryoem_grid": cryoem_grid,
    "diffraction_plate": diffraction_plate,
    "density_contours": density_contours,
    "spectrum_strip": spectrum_strip,
    "lab_notebook": lab_notebook,
    "beamline_slate": beamline_slate,
    "phase_map": phase_map,
}


def seam_delta(image: Image.Image, seam_px: int = 32) -> float:
    width, height = image.size
    left = image.crop((0, 0, seam_px, height)).convert("RGB")
    right = image.crop((width - seam_px, 0, width, height)).convert("RGB")
    stat = ImageStat.Stat(ImageChops.difference(left, right))
    return round(sum(stat.mean) / len(stat.mean), 3)


def render_asset(asset: JsonObject, width: int, height: int, output: Path, quality: int) -> JsonObject:
    renderer = STYLE_RENDERERS.get(asset["style"])
    if renderer is None:
        raise RuntimeError(f"Unknown publication background style: {asset['style']}")
    image = renderer(asset, width, height)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, quality=quality, optimize=True, progressive=True)
    return {
        "id": asset["id"],
        "file": asset["file"],
        "output": str(output),
        "width": width,
        "height": height,
        "bytes": output.stat().st_size,
        "seam_delta": seam_delta(image),
    }


def main() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    width = args.width or int(manifest["contract"]["target_width"])
    height = args.height or int(manifest["contract"]["target_height"])
    if width != height * 2:
        raise SystemExit("publication backgrounds must be 2:1 equirectangular")

    requested = selected_ids(args.asset)
    assets = list(manifest["assets"])
    if not args.all and requested:
        missing = requested - {asset["id"] for asset in assets}
        if missing:
            raise SystemExit(f"Unknown publication asset(s): {', '.join(sorted(missing))}")
        assets = [asset for asset in assets if asset["id"] in requested]
    elif not args.all and not requested:
        assets = assets

    records = [
        render_asset(asset, width, height, args.background_dir / asset["file"], args.quality)
        for asset in assets
    ]
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
