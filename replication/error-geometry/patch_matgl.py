"""Compatibility shim: matgl <= 4.0.2 custom-op annotations vs torch >= 2.11.

torch.library.infer_schema in torch >= 2.11 accepts typing.List/typing.Tuple
return annotations but rejects the builtin generics (list[Tensor]) that
matgl's ops modules use. This script rewrites the annotations in the installed
matgl/ops/*.py in place. It changes type annotations only — no numerics.

Run once after `pip install -r requirements.txt`. Idempotent.
"""

import re
import sys
from pathlib import Path

import matgl

ops_dir = Path(matgl.__file__).parent / "ops"
patched = []
for py in sorted(ops_dir.glob("*.py")):
    src = py.read_text(encoding="utf-8")
    new = src.replace("list[Tensor]", "typing.List[Tensor]")
    new = new.replace("tuple[Tensor", "typing.Tuple[Tensor")
    if new != src:
        if not re.search(r"^import typing", new, re.M):
            m = re.search(r"^(from __future__ import [^\r\n]+)", new, re.M)
            if m:
                new = new[:m.end()] + "\nimport typing" + new[m.end():]
            else:
                new = "import typing\n" + new
        py.write_text(new, encoding="utf-8")
        patched.append(py.name)

print(f"patched {len(patched)} files: {patched}" if patched else "nothing to patch (already applied or fixed upstream)")
sys.exit(0)
