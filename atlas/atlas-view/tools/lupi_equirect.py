"""Shared equirectangular image repair and QA helpers for Lupi backgrounds.

The viewer consumes 2:1 ERP/cylindrical equirectangular media. The horizontal
axis wraps, while the top and bottom rows collapse toward poles in spherical
viewers. These helpers keep both contracts explicit for stills and source
frames used by motion-loop generation.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageChops, ImageStat


JsonObject = dict[str, Any]


def smoothstep(value: float) -> float:
    t = max(0.0, min(1.0, value))
    return t * t * (3.0 - 2.0 * t)


def assert_equirect_size(width: int, height: int) -> None:
    if width != height * 2:
        raise ValueError(f"expected a 2:1 equirectangular image, got {width}x{height}")


def _as_rgb_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image.convert("RGB"), dtype=np.float32)


def _seam_mean_for_array(arr: np.ndarray, seam_px: int, shift_px: int = 0) -> float:
    height, width, _channels = arr.shape
    assert_equirect_size(width, height)
    seam = max(1, min(seam_px, width // 8))
    rolled = np.roll(arr, shift_px, axis=1) if shift_px else arr
    left = rolled[:, :seam]
    right = rolled[:, width - seam :]
    return float(np.mean(np.abs(left - right)))


def _bilinear_sample_equirect(arr: np.ndarray, lon: np.ndarray, lat: np.ndarray) -> np.ndarray:
    height, width, channels = arr.shape
    x = ((lon / (2.0 * math.pi)) + 0.5) * width
    y = (0.5 - lat / math.pi) * (height - 1)

    x0 = np.floor(x).astype(np.int32) % width
    x1 = (x0 + 1) % width
    y0 = np.clip(np.floor(y).astype(np.int32), 0, height - 1)
    y1 = np.clip(y0 + 1, 0, height - 1)
    wx = (x - np.floor(x))[..., None]
    wy = (y - np.floor(y))[..., None]

    top = arr[y0, x0] * (1.0 - wx) + arr[y0, x1] * wx
    bottom = arr[y1, x0] * (1.0 - wx) + arr[y1, x1] * wx
    sampled = top * (1.0 - wy) + bottom * wy
    return sampled.reshape((*lon.shape, channels))


def _cube_face(arr: np.ndarray, face: str, size: int) -> np.ndarray:
    axis = np.linspace(-1.0, 1.0, size, dtype=np.float32)
    u, v = np.meshgrid(axis, -axis)
    if face == "px":
        direction = np.stack([np.ones_like(u), v, -u], axis=-1)
    elif face == "nx":
        direction = np.stack([-np.ones_like(u), v, u], axis=-1)
    elif face == "py":
        direction = np.stack([u, np.ones_like(u), -v], axis=-1)
    elif face == "ny":
        direction = np.stack([u, -np.ones_like(u), v], axis=-1)
    elif face == "pz":
        direction = np.stack([u, v, np.ones_like(u)], axis=-1)
    elif face == "nz":
        direction = np.stack([-u, v, -np.ones_like(u)], axis=-1)
    else:
        raise ValueError(f"unknown cube face: {face}")

    direction /= np.linalg.norm(direction, axis=-1, keepdims=True)
    lon = np.arctan2(direction[..., 2], direction[..., 0])
    lat = np.arcsin(np.clip(direction[..., 1], -1.0, 1.0))
    return _bilinear_sample_equirect(arr, lon, lat)


def _cube_edge_gradient(arr: np.ndarray, face_size: int) -> dict[str, float]:
    size = max(16, min(face_size, 512))
    gradients: list[float] = []
    face_means: dict[str, float] = {}
    for face in ("px", "nx", "py", "ny", "pz", "nz"):
        sample = _cube_face(arr, face, size)
        edge_deltas = [
            np.abs(sample[:, 0] - sample[:, 1]),
            np.abs(sample[:, -1] - sample[:, -2]),
            np.abs(sample[0, :] - sample[1, :]),
            np.abs(sample[-1, :] - sample[-2, :]),
        ]
        face_value = float(np.mean([np.mean(delta) for delta in edge_deltas]))
        face_means[face] = face_value
        gradients.append(face_value)
    return {
        "cube_edge_gradient_mean": round(float(np.mean(gradients)), 3),
        "cube_edge_gradient_max": round(float(np.max(gradients)), 3),
        "cube_edge_gradient_faces": {face: round(value, 3) for face, value in face_means.items()},
    }


def repair_equirect_image(
    image: Image.Image,
    seam_px: int = 128,
    pole_px: int = 192,
    seam_strength: float = 0.92,
) -> Image.Image:
    """Feather horizontal wrap seams and smooth polar caps.

    This is deliberately conservative: it does not invent content. It makes the
    left and right seam strips agree and fades high-frequency pole detail into
    row averages so the zenith/nadir do not pinch into spiky artifacts.
    """

    arr = _as_rgb_array(image)
    height, width, _channels = arr.shape
    assert_equirect_size(width, height)

    max_seam = max(0, min(seam_px, width // 8))
    seam_widths = sorted(
        {
            candidate
            for candidate in (max_seam, min(256, max_seam), min(128, max_seam), min(64, max_seam), min(32, max_seam))
            if candidate > 0
        },
        reverse=True,
    )
    for seam in seam_widths:
        left = arr[:, :seam].copy()
        right = arr[:, width - seam :].copy()
        for x in range(seam):
            edge_t = x / max(1, seam - 1)
            weight = seam_strength * (1.0 - 0.72 * smoothstep(edge_t))
            average = (left[:, x] + right[:, x]) * 0.5
            arr[:, x] = arr[:, x] * (1.0 - weight) + average * weight
            arr[:, width - seam + x] = arr[:, width - seam + x] * (1.0 - weight) + average * weight

    pole = max(0, min(pole_px, height // 5))
    if pole > 0:
        for y in range(pole):
            keep = smoothstep(y / max(1, pole - 1))
            top_mean = arr[y].mean(axis=0)
            arr[y] = top_mean * (1.0 - keep) + arr[y] * keep

            bottom_y = height - 1 - y
            bottom_mean = arr[bottom_y].mean(axis=0)
            arr[bottom_y] = bottom_mean * (1.0 - keep) + arr[bottom_y] * keep

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def inspect_pil_image(
    image: Image.Image,
    seam_px: int = 32,
    pole_px: int = 48,
    yaw_offsets: tuple[int, ...] | list[int] = (0, 90, 180, 270),
    cube_face_size: int = 96,
) -> JsonObject:
    width, height = image.size
    rgb = image.convert("RGB")
    assert_equirect_size(width, height)
    left = rgb.crop((0, 0, seam_px, height))
    right = rgb.crop((width - seam_px, 0, width, height))
    diff = ImageChops.difference(left, right)
    seam_stat = ImageStat.Stat(diff)
    seam_mean = float(sum(seam_stat.mean) / len(seam_stat.mean))

    arr = _as_rgb_array(rgb)
    pole = max(1, min(pole_px, height // 5))
    top_band = arr[:pole]
    bottom_band = arr[height - pole :]
    top_std = float(np.std(top_band, axis=1).mean())
    bottom_std = float(np.std(bottom_band, axis=1).mean())
    yaw_metrics = {
        str(int(offset)): round(_seam_mean_for_array(arr, seam_px, int(round(width * (offset / 360.0)))), 3)
        for offset in yaw_offsets
    }
    cube_metrics = _cube_edge_gradient(arr, cube_face_size)

    return {
        "width": width,
        "height": height,
        "aspect": round(width / height, 4) if height else 0,
        "seam_mean_abs_delta": round(seam_mean, 3),
        "yaw_seam_mean_abs_delta_max": round(max(yaw_metrics.values()), 3),
        "yaw_seam_mean_abs_delta": yaw_metrics,
        "top_pole_horizontal_std": round(top_std, 3),
        "bottom_pole_horizontal_std": round(bottom_std, 3),
        "max_pole_horizontal_std": round(max(top_std, bottom_std), 3),
        **cube_metrics,
    }


def inspect_image(
    path: Path,
    seam_px: int = 32,
    pole_px: int = 48,
    yaw_offsets: tuple[int, ...] | list[int] = (0, 90, 180, 270),
    cube_face_size: int = 96,
) -> JsonObject:
    with Image.open(path) as image:
        qa = inspect_pil_image(image, seam_px=seam_px, pole_px=pole_px, yaw_offsets=yaw_offsets, cube_face_size=cube_face_size)
    qa["path"] = str(path)
    qa["bytes"] = path.stat().st_size
    return qa
