#!/usr/bin/env python3
"""Batch runner for NIST demo generation — single-element potentials first."""
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
INDEX_PATH = REPO_ROOT / "atlas" / "nist_ipr" / "index" / "master_index.json"
GEN_SCRIPT = REPO_ROOT / "atlas" / "scripts" / "generate_nist_demos.py"

SUPPORTED_PS = {
    "eam/alloy", "eam/fs", "eam", "eam/cd", "eam/he",
    "meam", "meam/spline", "tersoff", "tersoff/zbl", "sw",
    "adp", "bop", "vashishta", "comb3", "reax/c", "morse",
}

with open(INDEX_PATH) as f:
    potentials = json.load(f)

single = [p for p in potentials if len(p.get("elements", [])) == 1 and p["pair_style"] in SUPPORTED_PS]
print(f"Running batch for {len(single)} single-element potentials...")

tmp_index = REPO_ROOT / "atlas" / "nist_ipr" / "index" / "_batch_single_element.json"
tmp_index.write_text(json.dumps(single))

try:
    result = subprocess.run(
        [sys.executable, str(GEN_SCRIPT), "--index", str(tmp_index)],
        cwd=REPO_ROOT,
        check=False,
    )
finally:
    tmp_index.unlink(missing_ok=True)

print(f"Batch finished with exit code {result.returncode}")
