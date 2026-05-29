"""Run one of the local ComfyUI logo workflows and copy the newest output."""

from __future__ import annotations

import argparse
import json
import shutil
import time
import urllib.request
import uuid
from pathlib import Path


COMFY_ROOT = Path(r"C:\Users\alexw\Downloads\USE_THIS_COMFY\ComfyUI_windows_portable\ComfyUI")
OUTPUT_DIR = COMFY_ROOT / "output"
INPUT_DIR = COMFY_ROOT / "input"


def post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def output_path(asset: dict) -> Path | None:
    filename = asset.get("filename")
    if not filename:
        return None
    subfolder = asset.get("subfolder") or ""
    return OUTPUT_DIR / subfolder / filename


def find_outputs(history: dict, prompt_id: str) -> list[Path]:
    outputs: list[Path] = []
    prompt_history = history.get(prompt_id, {})
    for node in prompt_history.get("outputs", {}).values():
        for key in ("images", "videos", "gifs", "audio"):
            for asset in node.get(key, []):
                path = output_path(asset)
                if path:
                    outputs.append(path)
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workflow", required=True, type=Path)
    parser.add_argument("--server", default="http://127.0.0.1:8199")
    parser.add_argument("--source-image", type=Path)
    parser.add_argument("--out-dir", default=Path("docs/brand/lupi-lupine-science/renders"), type=Path)
    parser.add_argument("--timeout-seconds", default=600, type=int)
    args = parser.parse_args()

    workflow = json.loads(args.workflow.read_text(encoding="utf-8"))

    if args.source_image:
        INPUT_DIR.mkdir(parents=True, exist_ok=True)
        target = INPUT_DIR / args.source_image.name
        shutil.copy2(args.source_image, target)
        for node in workflow.values():
            if node.get("class_type") == "LoadImage":
                node["inputs"]["image"] = target.name

    client_id = str(uuid.uuid4())
    prompt = post_json(f"{args.server}/prompt", {"prompt": workflow, "client_id": client_id})
    prompt_id = prompt["prompt_id"]

    deadline = time.time() + args.timeout_seconds
    outputs: list[Path] = []
    while time.time() < deadline:
        history = get_json(f"{args.server}/history/{prompt_id}")
        outputs = find_outputs(history, prompt_id)
        if outputs and all(path.exists() for path in outputs):
            break
        time.sleep(2)

    if not outputs:
        raise SystemExit(f"No Comfy output found for prompt {prompt_id}")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    copied = []
    for output in outputs:
        destination = args.out_dir / output.name
        shutil.copy2(output, destination)
        copied.append(destination)

    for path in copied:
        print(path)


if __name__ == "__main__":
    main()
