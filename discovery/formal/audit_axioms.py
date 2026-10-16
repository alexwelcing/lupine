#!/usr/bin/env python3
"""Re-elaborate every proof module and enforce complete theorem axiom audits."""
from pathlib import Path
from hashlib import sha256
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
ALLOWED = {"propext", "Classical.choice", "Quot.sound"}


def fail(message: str) -> None:
    raise SystemExit(f"Axiom audit failed: {message}")


def parse_audit(output: str, declared: set[str]) -> dict[str, set[str]]:
    pattern = re.compile(
        r"^'([^']+)' (?:depends on axioms: \[([^\]]*)\]|does not depend on any axioms)\s*$",
        re.MULTILINE,
    )
    audit = {}
    for match in pattern.finditer(output):
        name, raw = match.groups()
        if name in audit:
            raise ValueError(f"duplicate output for {name}")
        axioms = {item.strip() for item in (raw or "").split(",") if item.strip()}
        if axioms - ALLOWED:
            raise ValueError(f"{name} has disallowed axioms {sorted(axioms - ALLOWED)}")
        audit[name] = axioms
    if set(audit) != declared:
        raise ValueError(f"output coverage differs: missing={sorted(declared - set(audit))}, "
             f"unexpected={sorted(set(audit) - declared)}")
    if "sorryAx" in output:
        raise ValueError("Lean output contains sorryAx")
    return audit


def declared_theorems(text: str, namespace: str) -> set[str]:
    """Check source coverage under the package's one-namespace-per-file rule."""
    if re.search(r"^\s*(?:@\[[^\]]+\]\s*)*(?:(?:private|protected)\s+)*axiom\s+", text, re.MULTILINE):
        raise ValueError("project source declares an extra axiom")
    if re.search(r"\b(?:sorry|admit)\b", text):
        raise ValueError("project source contains an admitted-proof token")
    namespaces = re.findall(r"^\s*namespace\s+(\S+)", text, re.MULTILINE)
    if namespaces != [namespace]:
        raise ValueError(f"expected exactly the namespace {namespace}, got {namespaces}")
    declared = {
        f"{namespace}.{name}"
        for name in re.findall(r"^\s*(?:@\[[^\]]+\]\s*)*(?:(?:private|protected)\s+)*(?:theorem|lemma)\s+([^\s{(:]+)", text, re.MULTILINE)
    }
    printed = set(re.findall(r"^#print axioms\s+(\S+)", text, re.MULTILINE))
    if not declared:
        raise ValueError("no theorem declarations found")
    if printed != declared:
        raise ValueError(f"source audit coverage differs: missing={sorted(declared - printed)}, "
                         f"unexpected={sorted(printed - declared)}")
    return declared


def main() -> None:
    sources = sorted(path for path in ROOT.glob("*.lean") if path.name != "lakefile.lean")
    if not sources:
        fail("no proof modules found")
    lake = shutil.which("lake")
    if lake is None:
        fallback = Path.home() / ".elan/bin/lake"
        lake = str(fallback) if fallback.exists() else None
    if lake is None:
        fail("lake unavailable; install the pinned Lean toolchain")
    outputs = []
    all_declared = set()
    modules = []
    for source in sources:
        try:
            declared = declared_theorems(source.read_text(), source.stem)
        except ValueError as error:
            fail(f"{source.name}: {error}")
        result = subprocess.run(
            [lake, "env", "lean", source.name], cwd=ROOT,
            text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        )
        if result.returncode:
            sys.stderr.write(result.stdout)
            fail(f"{source.name}: Lean elaboration exited {result.returncode}")
        try:
            module_audit = parse_audit(result.stdout, declared)
        except ValueError as error:
            sys.stderr.write(result.stdout)
            fail(f"{source.name}: {error}")
        outputs.append(result.stdout)
        all_declared.update(declared)
        modules.append({
            "source": source.name,
            "source_sha256": sha256(source.read_bytes()).hexdigest(),
            "theorem_count": len(module_audit),
            "theorems": {name: sorted(axioms) for name, axioms in sorted(module_audit.items())},
        })
    output = "".join(outputs)
    try:
        audit = parse_audit(output, all_declared)
    except ValueError as error:
        fail(str(error))
    (ROOT / "AXIOMS.txt").write_text(output)
    (ROOT / "theorem-inventory.json").write_text(json.dumps({
        "schema": "lupine-formal-theorem-inventory-v1",
        "module_count": len(sources),
        "theorem_count": len(audit),
        "axiom_output_sha256": sha256(output.encode()).hexdigest(),
        "modules": modules,
    }, indent=2, sort_keys=True) + "\n")
    print(f"Axiom audit passed: {len(audit)} theorems in {len(sources)} modules; "
          "only standard logical axioms.")


if __name__ == "__main__":
    main()
