#!/usr/bin/env python3
"""Write or check the current source-byte manifest; hashes do not certify truth."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import subprocess


def source_files(root, staged=False):
    if staged:
        prefix = subprocess.check_output(["git", "rev-parse", "--show-prefix"], cwd=root, text=True).strip()
        names = subprocess.check_output(["git", "ls-files", "--", "pyproject.toml", "scripts", "tests",
                                         "src/lupine_discovery"], cwd=root, text=True).splitlines()
        return {name: hashlib.sha256(subprocess.check_output(["git", "show", ":" + prefix + name], cwd=root)).hexdigest()
                for name in sorted(names) if Path(name).suffix in {".toml", ".py", ".json", ".html", ".css", ".js", ".svg"}}
    paths = [root / "pyproject.toml"]
    paths.extend((root / "scripts").glob("*.py"))
    paths.extend((root / "tests").glob("*.py"))
    paths.extend(path for path in (root / "src/lupine_discovery").rglob("*")
                 if path.is_file() and "__pycache__" not in path.parts and path.suffix in
                 {".py", ".json", ".html", ".css", ".js", ".svg"})
    return {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(paths)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--staged", action="store_true", help="Read the staged Git snapshot while other work is in progress")
    parser.add_argument("--checkpoint", help="Required label when writing a new current snapshot")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    target = root / "reports/runtime-manifest.json"
    current = source_files(root, args.staged)
    if args.write:
        if not args.checkpoint:
            parser.error("--write requires --checkpoint")
        manifest = {"schema": "lupine.discovery.runtime-manifest.v1", "python": platform.python_version(),
                    "checkpoint": args.checkpoint, "files": current}
        target.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"Recorded {len(current)} source files")
        return 0
    manifest = json.loads(target.read_text(encoding="utf-8"))
    expected = manifest["files"]
    changed = sorted(key for key in set(expected) | set(current) if expected.get(key) != current.get(key))
    if changed:
        print(json.dumps({"status": "failed", "different_or_missing_files": changed}, indent=2))
        return 1
    print(json.dumps({"status": "passed", "file_count": len(current), "checkpoint": manifest["checkpoint"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
