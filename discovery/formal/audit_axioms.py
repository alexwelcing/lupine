#!/usr/bin/env python3
"""Re-elaborate the proof module and enforce its declared theorem axiom audit."""
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "LupineDiscovery.lean"
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


def main() -> None:
    text = SOURCE.read_text()
    if re.search(r"^\s*(?:@\[[^\]]+\]\s*)*(?:(?:private|protected)\s+)*axiom\s+", text, re.MULTILINE):
        fail("project source declares an extra axiom")
    if re.search(r"\b(?:sorry|admit)\b", text):
        fail("project source contains an admitted-proof token")
    declared = {
        f"LupineDiscovery.{name}"
        for name in re.findall(r"^\s*(?:@\[[^\]]+\]\s*)*(?:(?:private|protected)\s+)*(?:theorem|lemma)\s+([^\s{(:]+)", text, re.MULTILINE)
    }
    printed = set(re.findall(r"^#print axioms\s+(\S+)", text, re.MULTILINE))
    if not declared:
        fail("no theorem declarations found")
    if printed != declared:
        fail(f"source audit coverage differs: missing={sorted(declared - printed)}, "
             f"unexpected={sorted(printed - declared)}")
    lake = shutil.which("lake")
    if lake is None:
        fallback = Path.home() / ".elan/bin/lake"
        lake = str(fallback) if fallback.exists() else None
    if lake is None:
        fail("lake unavailable; install the pinned Lean toolchain")
    result = subprocess.run(
        [lake, "env", "lean", SOURCE.name], cwd=ROOT,
        text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    if result.returncode:
        sys.stderr.write(result.stdout)
        fail(f"Lean elaboration exited {result.returncode}")
    try:
        audit = parse_audit(result.stdout, declared)
    except ValueError as error:
        sys.stderr.write(result.stdout)
        fail(str(error))
    (ROOT / "AXIOMS.txt").write_text(result.stdout)
    print(f"Axiom audit passed: {len(audit)} theorems; only standard logical axioms.")


if __name__ == "__main__":
    main()
