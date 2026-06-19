#!/usr/bin/env python3
"""Generate 360-safe World backgrounds for Lupi.

The asset manifest describes the editorial direction; this renderer makes the
projection contract mechanical. Every output is a 2:1 cylindrical/ERP still with
periodic horizontal detail, softened pole caps, and a QA record that can be used
before any generated image becomes a runtime background.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from typing import Any, Callable

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from lupi_equirect import assert_equirect_size, inspect_image, repair_equirect_image, smoothstep


ATLAS_VIEW_ROOT = Path(__file__).resolve().parents[1]
BACKGROUND_DIR = ATLAS_VIEW_ROOT / "apps" / "web" / "public" / "backgrounds"
MANIFEST_PATH = ATLAS_VIEW_ROOT / "tools" / "lupi-world-backgrounds.json"

JsonObject = dict[str, Any]
Renderer = Callable[[JsonObject, int, int], Image.Image]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH)
    parser.add_argument("--background-dir", type=Path, default=BACKGROUND_DIR)
    parser.add_argument("--asset", action="append", default=[], help="Asset id to render. Repeat or comma-separate.")
    parser.add_argument("--all", action="store_true", help="Render every World background.")
    parser.add_argument("--width", type=int)
    parser.add_argument("--height", type=int)
    parser.add_argument("--quality", type=int, default=93)
    parser.add_argument("--seam-repair-px", type=int, default=160)
    parser.add_argument("--pole-repair-px", type=int, default=220)
    parser.add_argument("--qa-seam-px", type=int, default=128)
    parser.add_argument("--qa-pole-px", type=int, default=96)
    parser.add_argument("--qa-yaw-offsets", default="")
    parser.add_argument("--qa-cube-face-size", type=int)
    parser.add_argument("--json-out", type=Path)
    return parser.parse_args()


def selected_ids(raw_values: list[str]) -> set[str]:
    return {item.strip() for raw in raw_values for item in raw.split(",") if item.strip()}


def parse_int_list(value: str) -> list[int]:
    return [int(item.strip()) for item in value.split(",") if item.strip()]


def hex_to_rgb(value: str) -> np.ndarray:
    raw = value.strip().lstrip("#")
    return np.array([int(raw[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def mix(a: np.ndarray, b: np.ndarray, t: np.ndarray | float) -> np.ndarray:
    return a * (1.0 - t) + b * t


def palette(asset: JsonObject) -> list[np.ndarray]:
    return [hex_to_rgb(color) for color in asset["palette"]]


def base_field(asset: JsonObject, width: int, height: int) -> np.ndarray:
    top = hex_to_rgb(asset["top"])
    horizon = hex_to_rgb(asset["horizon"])
    bottom = hex_to_rgb(asset["bottom"])
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    upper = mix(top, horizon, np.vectorize(smoothstep)(np.clip(y * 2.0, 0.0, 1.0)))
    lower = mix(horizon, bottom, np.vectorize(smoothstep)(np.clip((y - 0.5) * 2.0, 0.0, 1.0)))
    column = np.where(y < 0.5, upper, lower)
    arr = np.repeat(column[:, None, :], width, axis=1)

    lat = np.sin(np.linspace(0.0, math.pi, height, dtype=np.float32))[:, None]
    center_quiet = 1.0 - 0.42 * np.exp(-((y - 0.5) / 0.18) ** 2)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    haze = (
        0.55 * np.sin(x * 2.0 + y * 5.8)
        + 0.28 * np.sin(x * 5.0 - y * 9.0)
        + 0.17 * np.cos(x * 9.0 + y * 4.2)
    )
    haze = haze[:, :, None] * lat[:, :, None] * center_quiet[:, :, None]
    arr += haze * 8.0

    edge_vignette = np.maximum(np.abs(y - 0.5) * 2.0 - 0.18, 0.0) / 0.82
    arr *= 1.0 - edge_vignette[:, :, None] * 0.12
    return arr


def to_image(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def add_periodic_specks(image: Image.Image, rng: random.Random, colors: list[np.ndarray], count: int, band: tuple[float, float], alpha: int) -> None:
    width, height = image.size
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    y0, y1 = band
    for _ in range(count):
        x = rng.randrange(width)
        y = rng.randrange(int(height * y0), int(height * y1))
        radius = rng.choice([1, 1, 2, 2, 3])
        color = tuple(int(v) for v in rng.choice(colors))
        local_alpha = rng.randrange(max(8, alpha // 3), alpha)
        for dx in (0, -width, width):
            draw.ellipse((x + dx - radius, y - radius, x + dx + radius, y + radius), fill=(*color, local_alpha))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.25)))


def draw_wrapped_polyline(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], width: int, fill: tuple[int, int, int, int], line_width: int) -> None:
    for shift in (-width, 0, width):
        draw.line([(x + shift, y) for x, y in points], fill=fill, width=line_width, joint="curve")


def render_quantum_horizon(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    band = np.exp(-((y - 0.51) / 0.11) ** 2)
    wave = (np.sin(x * 3.0 + y * 9.5) + 0.45 * np.sin(x * 7.0 - y * 5.0))[:, :, None]
    arr += wave * band[:, :, None] * colors[2] * 0.045
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for k, color in enumerate([colors[2], colors[3], colors[4]]):
        for row in (0.34, 0.66):
            points = []
            for px in range(-8, width + 9, 8):
                t = px / width
                py = height * row + math.sin(t * math.tau * (2.0 + k) + k * 1.7) * height * (0.018 + k * 0.004)
                points.append((px, py))
            draw_wrapped_polyline(draw, points, width, (*map(int, color), 42 - k * 7), 2)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.5)))
    add_periodic_specks(image, random.Random(asset["seed"]), [colors[2], colors[3], colors[4]], 520, (0.16, 0.84), 84)
    return image.convert("RGB")


def render_graphene_dawn(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    moire = np.sin(x * 8.0 + y * 12.0) * np.sin(x * 7.0 - y * 9.0)
    detail = (np.abs(y - 0.5) * 2.0) ** 0.7
    arr += moire[:, :, None] * detail[:, :, None] * colors[2] * 0.06
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for family, color in enumerate([colors[2], colors[3], colors[4]]):
        for offset in range(-4, 15):
            points = []
            slope = (0.058 + family * 0.027) * height
            base_y = height * (0.16 + offset * 0.062)
            for px in range(-16, width + 17, 16):
                t = px / width
                py = base_y + math.sin(t * math.tau * (1.0 + family * 0.5) + offset) * height * 0.018 + (t - 0.5) * slope
                points.append((px, py))
            draw_wrapped_polyline(draw, points, width, (*map(int, color), 28), 2)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.35)))
    return image.convert("RGB")


def render_cryo_vault(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    cold = np.exp(-((y - 0.42) / 0.24) ** 2)
    arr += cold[:, :, None] * colors[2] * 0.035
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for shift in (-width, 0, width):
        for i, color in enumerate([colors[2], colors[3], colors[4]]):
            cx = width * (0.18 + i * 0.31) + shift
            bbox = (cx - width * 0.22, height * 0.12, cx + width * 0.22, height * 0.92)
            draw.arc(bbox, start=194, end=346, fill=(*map(int, color), 44 - i * 8), width=5)
            draw.arc((bbox[0] + 34, bbox[1] + 28, bbox[2] - 34, bbox[3] - 28), start=202, end=338, fill=(*map(int, color), 28), width=2)
    for x in range(0, width, width // 24):
        draw.line((x, height * 0.18, x, height * 0.82), fill=(*map(int, colors[2]), 12), width=1)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.85)))
    add_periodic_specks(image, random.Random(asset["seed"]), [colors[2], colors[3]], 360, (0.2, 0.82), 52)
    return image.convert("RGB")


def render_alloy_foundry(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    lower = np.clip((y - 0.48) / 0.52, 0.0, 1.0)
    molten = np.maximum(0.0, np.sin(x * 5.0 + y * 16.0) + 0.35 * np.sin(x * 13.0 - y * 7.0))
    arr += molten[:, :, None] * lower[:, :, None] * colors[2] * 0.16
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(asset["seed"])
    for i in range(18):
        row = 0.58 + rng.random() * 0.25
        amp = height * (0.018 + rng.random() * 0.03)
        color = colors[2] if i % 3 else colors[3]
        points = []
        for px in range(-12, width + 13, 12):
            t = px / width
            py = height * row + math.sin(t * math.tau * (2 + i % 5) + i) * amp
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), 42), 3)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.7)))
    add_periodic_specks(image, rng, [colors[2], colors[3], colors[4]], 430, (0.42, 0.86), 72)
    return image.convert("RGB")


def render_bioelectric_cavern(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    glow = np.sin(x * 4.0 + np.sin(y * 9.0) * 2.2) * np.cos(y * math.pi * 3.0)
    edge = (np.abs(y - 0.5) * 2.0) ** 0.55
    arr += np.maximum(glow, 0)[:, :, None] * edge[:, :, None] * colors[2] * 0.12
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(asset["seed"])
    for i in range(28):
        row = 0.18 + rng.random() * 0.64
        color = colors[2] if i % 2 else colors[3]
        points = []
        for px in range(-10, width + 11, 10):
            t = px / width
            py = height * row + math.sin(t * math.tau * (1.2 + (i % 4) * 0.45) + i * 0.6) * height * (0.013 + rng.random() * 0.012)
            py += math.sin(t * math.tau * 9.0 + i) * height * 0.004
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), 34), 2)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.65)))
    add_periodic_specks(image, rng, [colors[2], colors[3], colors[4]], 520, (0.18, 0.84), 64)
    return image.convert("RGB")


def render_beamline_mist(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    mist = np.exp(-((y - 0.55) / 0.22) ** 2) * (0.65 + 0.35 * np.sin(x * 2.0 + y * 7.0))
    arr += mist[:, :, None] * colors[3] * 0.045
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    horizon = int(height * 0.58)
    draw.rectangle((0, horizon, width, height), fill=(*map(int, colors[0]), 32))
    for x0 in range(-width // 10, width + width // 10, width // 10):
        draw.polygon(
            [
                (x0, horizon),
                (x0 + width * 0.025, horizon),
                (x0 + width * 0.11, height),
                (x0 - width * 0.035, height),
            ],
            fill=(*map(int, colors[1]), 42),
        )
    for row, color in [(0.42, colors[2]), (0.52, colors[4])]:
        points = []
        for px in range(-16, width + 17, 16):
            t = px / width
            py = height * row + math.sin(t * math.tau * 1.5) * height * 0.025
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), 44), 4)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.9)))
    return image.convert("RGB")


def render_catalyst_rain(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    rain = (np.sin(x * 11.0 + y * 18.0) + 0.35 * np.sin(x * 23.0 - y * 5.0))
    arr += np.maximum(rain, 0)[:, :, None] * colors[2] * 0.035
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(asset["seed"])
    for i in range(64):
        x0 = rng.randrange(width)
        y0 = rng.randrange(int(height * 0.16), int(height * 0.82))
        length = height * (0.035 + rng.random() * 0.11)
        slant = width * (0.006 + rng.random() * 0.018)
        color = colors[2] if i % 4 else colors[3]
        for shift in (-width, 0, width):
            draw.line(
                (x0 + shift, y0, x0 + shift + slant, y0 + length),
                fill=(*map(int, color), 42),
                width=rng.choice([1, 1, 2]),
            )
    for row, color in [(0.36, colors[4]), (0.63, colors[2])]:
        points = []
        for px in range(-12, width + 13, 12):
            t = px / width
            py = height * row + math.sin(t * math.tau * 3.0 + row * 9.0) * height * 0.02
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), 34), 2)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.45)))
    add_periodic_specks(image, rng, [colors[2], colors[3], colors[4]], 460, (0.18, 0.84), 58)
    return image.convert("RGB")


def render_perovskite_twilight(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    lattice = np.cos(x * 6.0 + y * 10.0) * np.cos(x * 6.0 - y * 8.0)
    calm_center = 1.0 - np.exp(-((y - 0.5) / 0.18) ** 2) * 0.72
    arr += lattice[:, :, None] * calm_center[:, :, None] * colors[2] * 0.05
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for family, color in enumerate([colors[2], colors[3], colors[4]]):
        for offset in range(-7, 18):
            points = []
            base_y = height * (0.1 + offset * 0.06)
            slope = height * (0.08 if family % 2 == 0 else -0.065)
            for px in range(-18, width + 19, 18):
                t = px / width
                py = base_y + (t - 0.5) * slope + math.sin(t * math.tau * 1.5 + offset) * height * 0.01
                points.append((px, py))
            draw_wrapped_polyline(draw, points, width, (*map(int, color), 24 + family * 5), 2)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.32)))
    add_periodic_specks(image, random.Random(asset["seed"]), [colors[2], colors[3]], 320, (0.2, 0.82), 46)
    return image.convert("RGB")


def render_ion_storm(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    field = np.sin(x * 4.0 + y * 17.0) + 0.5 * np.cos(x * 13.0 - y * 5.0)
    edges = (np.abs(y - 0.5) * 2.0) ** 0.7
    arr += np.maximum(field, 0)[:, :, None] * edges[:, :, None] * colors[2] * 0.1
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(asset["seed"])
    for i in range(24):
        row = 0.12 + rng.random() * 0.74
        color = colors[2] if i % 3 else colors[3]
        points = []
        drift = rng.uniform(-0.05, 0.05)
        for px in range(-8, width + 9, 8):
            t = px / width
            py = height * (row + drift * math.sin(t * math.tau * 2.0 + i))
            py += math.sin(t * math.tau * (5 + i % 4) + i) * height * 0.012
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), 48), rng.choice([1, 2, 2, 3]))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.62)))
    add_periodic_specks(image, rng, [colors[2], colors[3], colors[4]], 650, (0.14, 0.86), 78)
    return image.convert("RGB")


def render_solvent_blue(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    flow = 0.5 + 0.5 * np.sin(x * 3.0 + np.sin(y * 8.0) * 2.6)
    flow *= np.exp(-((y - 0.48) / 0.32) ** 2)
    arr += flow[:, :, None] * colors[2] * 0.04
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(asset["seed"])
    for i in range(22):
        row = 0.22 + rng.random() * 0.56
        color = colors[2] if i % 2 else colors[4]
        points = []
        for px in range(-14, width + 15, 14):
            t = px / width
            py = height * row + math.sin(t * math.tau * (1.0 + i % 5) + i) * height * (0.018 + rng.random() * 0.014)
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), 28), 2)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.85)))
    add_periodic_specks(image, rng, [colors[2], colors[3], colors[4]], 260, (0.24, 0.76), 36)
    return image.convert("RGB")


def render_laser_sheet(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    sheet = np.exp(-((y - 0.52) / 0.09) ** 2) + 0.45 * np.exp(-((y - 0.34) / 0.04) ** 2)
    arr += sheet[:, :, None] * colors[2] * 0.045
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for row, color, alpha, line_width in [
        (0.35, colors[2], 48, 3),
        (0.51, colors[3], 42, 4),
        (0.68, colors[2], 32, 2),
    ]:
        points = []
        for px in range(-12, width + 13, 12):
            t = px / width
            py = height * row + math.sin(t * math.tau * 1.5 + row * 4.0) * height * 0.012
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), alpha), line_width)
    for x0 in range(0, width, max(1, width // 18)):
        draw.line((x0, height * 0.18, x0 + width * 0.045, height * 0.84), fill=(*map(int, colors[4]), 16), width=1)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.55)))
    return image.convert("RGB")


def render_folding_grove(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    arr = base_field(asset, width, height)
    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    organic = np.sin(x * 2.0 + y * 11.0) * np.sin(x * 5.0 - y * 3.0)
    arr += np.maximum(organic, 0)[:, :, None] * colors[2] * 0.055
    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(asset["seed"])
    for i in range(18):
        row = 0.16 + rng.random() * 0.68
        color = colors[2] if i % 3 else colors[3]
        points = []
        for px in range(-10, width + 11, 10):
            t = px / width
            py = height * row + math.sin(t * math.tau * (1.4 + i % 4) + i * 0.9) * height * 0.032
            py += math.sin(t * math.tau * 9.0 + i) * height * 0.006
            points.append((px, py))
        draw_wrapped_polyline(draw, points, width, (*map(int, color), 36), 4 if i % 4 == 0 else 2)
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.7)))
    add_periodic_specks(image, rng, [colors[2], colors[3], colors[4]], 380, (0.18, 0.84), 54)
    return image.convert("RGB")


def draw_wrapped_arc(
    draw: ImageDraw.ImageDraw,
    bbox: tuple[float, float, float, float],
    width: int,
    start: float,
    end: float,
    fill: tuple[int, int, int, int],
    line_width: int,
) -> None:
    left, top, right, bottom = bbox
    for shift in (-width, 0, width):
        draw.arc((left + shift, top, right + shift, bottom), start=start, end=end, fill=fill, width=line_width)


def render_procedural_world(asset: JsonObject, width: int, height: int) -> Image.Image:
    colors = palette(asset)
    motif = str(asset.get("motif", "filaments"))
    motif_score = sum(ord(char) for char in motif)
    rng = random.Random(int(asset["seed"]) + motif_score)
    arr = base_field(asset, width, height)

    x = np.linspace(0.0, math.tau, width, endpoint=False, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    center_guard = 1.0 - 0.62 * np.exp(-((y - 0.5) / 0.16) ** 2)
    edge_energy = (np.abs(y - 0.5) * 2.0) ** (0.5 + (motif_score % 5) * 0.06)
    phase = rng.random() * math.tau
    waves = (
        0.58 * np.sin(x * (2.0 + motif_score % 4) + y * (7.0 + motif_score % 9) + phase)
        + 0.28 * np.cos(x * (5.0 + motif_score % 6) - y * (5.0 + motif_score % 7))
        + 0.14 * np.sin(x * (11.0 + motif_score % 5) + y * 3.0)
    )
    arr += np.maximum(waves, 0.0)[:, :, None] * center_guard[:, :, None] * edge_energy[:, :, None] * colors[2] * 0.07
    arr += np.minimum(waves, 0.0)[:, :, None] * center_guard[:, :, None] * colors[3] * 0.03

    image = to_image(arr).convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    if motif in {"lattice", "crystal", "moire", "topology", "qubit", "diffraction"}:
        for family, color in enumerate([colors[2], colors[3], colors[4]]):
            spacing = 0.052 + family * 0.018
            slope = height * rng.uniform(-0.11, 0.11)
            for offset in range(-8, int(1 / spacing) + 10):
                points = []
                base_y = height * (offset * spacing - 0.08)
                for px in range(-16, width + 17, 16):
                    t = px / width
                    py = base_y + (t - 0.5) * slope + math.sin(t * math.tau * (1.2 + family) + offset) * height * 0.012
                    points.append((px, py))
                draw_wrapped_polyline(draw, points, width, (*map(int, color), 22 + family * 6), 2)
        if motif in {"diffraction", "topology", "moire"}:
            for i in range(6):
                cx = width * (rng.random() * 0.92 + 0.04)
                cy = height * (0.22 + rng.random() * 0.56)
                radius_x = width * (0.08 + rng.random() * 0.18)
                radius_y = height * (0.08 + rng.random() * 0.22)
                color = colors[2 + i % 3]
                draw_wrapped_arc(
                    draw,
                    (cx - radius_x, cy - radius_y, cx + radius_x, cy + radius_y),
                    width,
                    rng.randrange(0, 90),
                    rng.randrange(210, 358),
                    (*map(int, color), 34),
                    rng.choice([2, 2, 3]),
                )

    if motif in {"filaments", "bio", "orchard", "softmatter", "synapse", "oxide"}:
        for i in range(28):
            row = 0.14 + rng.random() * 0.72
            color = colors[2 + i % 3]
            points = []
            amp = height * (0.014 + rng.random() * 0.035)
            width_px = 3 if i % 7 == 0 else 2
            for px in range(-10, width + 11, 10):
                t = px / width
                py = height * row
                py += math.sin(t * math.tau * (1.1 + i % 5) + i * 0.8) * amp
                py += math.sin(t * math.tau * 8.0 + i) * height * 0.004
                points.append((px, py))
            draw_wrapped_polyline(draw, points, width, (*map(int, color), 28 + (i % 4) * 5), width_px)

    if motif in {"rain", "plasma", "weather", "storm", "diamond"}:
        for i in range(82):
            x0 = rng.randrange(width)
            y0 = rng.randrange(int(height * 0.12), int(height * 0.88))
            length = height * rng.uniform(0.025, 0.12)
            slant = width * rng.uniform(-0.018, 0.026)
            color = colors[2 + i % 3]
            alpha = rng.randrange(24, 70)
            for shift in (-width, 0, width):
                draw.line(
                    (x0 + shift, y0, x0 + shift + slant, y0 + length),
                    fill=(*map(int, color), alpha),
                    width=rng.choice([1, 1, 2]),
                )

    if motif in {"beam", "instrument", "vacuum", "spectral", "forge"}:
        horizon = height * (0.44 + rng.random() * 0.18)
        for i, color in enumerate([colors[2], colors[3], colors[4]]):
            row = 0.28 + i * 0.16 + rng.uniform(-0.02, 0.02)
            points = []
            for px in range(-12, width + 13, 12):
                t = px / width
                py = height * row + math.sin(t * math.tau * (1.4 + i) + phase) * height * 0.012
                points.append((px, py))
            draw_wrapped_polyline(draw, points, width, (*map(int, color), 34 + i * 8), 3 if i == 1 else 2)
        for x0 in range(-width // 16, width + width // 16, max(1, width // 16)):
            color = colors[1 if x0 % 3 else 4]
            for shift in (-width, 0, width):
                draw.polygon(
                    [
                        (x0 + shift, horizon),
                        (x0 + shift + width * 0.018, horizon),
                        (x0 + shift + width * rng.uniform(0.04, 0.11), height * 0.9),
                        (x0 + shift - width * rng.uniform(0.018, 0.05), height * 0.9),
                    ],
                    fill=(*map(int, color), 12),
                )

    if motif in {"flow", "tide", "aquifer", "cloud", "aerogel", "fermi"}:
        for i in range(24):
            row = 0.18 + rng.random() * 0.64
            color = colors[2 + i % 3]
            points = []
            for px in range(-14, width + 15, 14):
                t = px / width
                py = height * row + math.sin(t * math.tau * (0.8 + i % 4) + i) * height * (0.024 + rng.random() * 0.016)
                py += math.cos(t * math.tau * 2.0 + phase) * height * 0.01
                points.append((px, py))
            draw_wrapped_polyline(draw, points, width, (*map(int, color), 24 + i % 5 * 4), 3 if i % 6 == 0 else 2)

    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.58)))
    speck_count = 300 if asset.get("intensity") == "quiet" else 560 if asset.get("intensity") == "balanced" else 760
    add_periodic_specks(image, rng, [colors[2], colors[3], colors[4]], speck_count, (0.14, 0.86), 58)
    return image.convert("RGB")


STYLE_RENDERERS: dict[str, Renderer] = {
    "quantum_horizon": render_quantum_horizon,
    "graphene_dawn": render_graphene_dawn,
    "cryo_vault": render_cryo_vault,
    "alloy_foundry": render_alloy_foundry,
    "bioelectric_cavern": render_bioelectric_cavern,
    "beamline_mist": render_beamline_mist,
    "catalyst_rain": render_catalyst_rain,
    "perovskite_twilight": render_perovskite_twilight,
    "ion_storm": render_ion_storm,
    "solvent_blue": render_solvent_blue,
    "laser_sheet": render_laser_sheet,
    "folding_grove": render_folding_grove,
    "procedural_world": render_procedural_world,
}


def render_asset(asset: JsonObject, width: int, height: int, output: Path, args: argparse.Namespace) -> JsonObject:
    renderer = STYLE_RENDERERS.get(asset["style"])
    if renderer is None:
        raise RuntimeError(f"Unknown World background style: {asset['style']}")
    image = renderer(asset, width, height)
    image = repair_equirect_image(image, seam_px=args.seam_repair_px, pole_px=args.pole_repair_px)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "JPEG", quality=args.quality, optimize=True, progressive=True)
    qa = inspect_image(
        output,
        seam_px=args.qa_seam_px,
        pole_px=args.qa_pole_px,
        yaw_offsets=args.qa_yaw_offsets,
        cube_face_size=args.qa_cube_face_size,
    )
    return {
        "id": asset["id"],
        "file": asset["file"],
        "output": str(output),
        "qa": qa,
    }


def main() -> None:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    width = args.width or int(manifest["contract"]["target_width"])
    height = args.height or int(manifest["contract"]["target_height"])
    assert_equirect_size(width, height)
    qa_contract = manifest.get("contract", {}).get("qa", {})
    args.qa_seam_px = int(args.qa_seam_px or qa_contract.get("seam_px", 128))
    args.qa_pole_px = int(args.qa_pole_px or qa_contract.get("pole_px", 96))
    args.qa_yaw_offsets = parse_int_list(args.qa_yaw_offsets) if args.qa_yaw_offsets else list(qa_contract.get("yaw_offsets_degrees", [0, 90, 180, 270]))
    args.qa_cube_face_size = args.qa_cube_face_size or int(qa_contract.get("cube_face_size", 96))

    requested = selected_ids(args.asset)
    assets = list(manifest["assets"])
    if not args.all and requested:
        missing = requested - {asset["id"] for asset in assets}
        if missing:
            raise SystemExit(f"Unknown World asset(s): {', '.join(sorted(missing))}")
        assets = [asset for asset in assets if asset["id"] in requested]

    records = [render_asset(asset, width, height, args.background_dir / asset["file"], args) for asset in assets]

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
