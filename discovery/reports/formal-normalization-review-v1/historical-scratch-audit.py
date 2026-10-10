#!/usr/bin/env python3
"""Scratch-only strict elaboration; run only after the coordinated CPU hold ends."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
DISCOVERY = HERE.parents[1]
FORMAL = DISCOVERY / 'formal'
SOURCE = HERE / 'LupineNormalization.lean'
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def snapshot():
    return {str(p.relative_to(FORMAL)): digest(p) for p in sorted(FORMAL.iterdir()) if p.is_file()}
def main():
    before = snapshot()
    spec = importlib.util.spec_from_file_location('published_audit', FORMAL / 'audit_axioms.py')
    auditor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(auditor)
    declared = auditor.declared_theorems(SOURCE.read_text(), SOURCE.stem)
    command = [str(Path.home() / '.elan/bin/lake'), 'env', 'lean', '-DwarningAsError=true', '-j', '1', '-R', str(HERE), '-o', str(HERE / 'LupineNormalization.olean'), str(SOURCE)]
    result = subprocess.run(command, cwd=FORMAL, env={**os.environ, 'LEAN_NUM_THREADS': '1'}, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=120)
    log = HERE / 'strict-compile.log'
    log.write_text(result.stdout)
    if result.returncode:
        raise SystemExit(result.stdout)
    axioms = auditor.parse_audit(result.stdout, declared)
    after = snapshot()
    if before != after:
        raise SystemExit('Published formal files changed during scratch audit')
    imports = {}
    for module in ('Mathlib.Data.Real.Basic', 'Mathlib.Algebra.Order.BigOperators.Group.Finset', 'Mathlib.Algebra.BigOperators.Ring.Finset'):
        relative = Path(*module.split('.'))
        for suffix, directory in (('.lean', '.lake/packages/mathlib'), ('.olean', '.lake/packages/mathlib/.lake/build/lib/lean')):
            path = FORMAL / directory / relative.with_suffix(suffix)
            imports[str(path.relative_to(FORMAL))] = digest(path)
    receipt = {'schema': 'lupine-scratch-normalization-audit-v1', 'scope': 'Conditional finite-real algebra only; no physical validity or Python refinement claim.', 'command': command, 'exit_code': result.returncode, 'source_sha256': digest(SOURCE), 'auditor_sha256': digest(FORMAL / 'audit_axioms.py'), 'script_sha256': digest(Path(__file__)), 'compile_log_sha256': digest(log), 'olean_sha256': digest(HERE / 'LupineNormalization.olean'), 'imports': imports, 'published_formal_before': before, 'published_formal_after': after, 'published_formal_unchanged': True, 'axioms': {name: sorted(value) for name, value in sorted(axioms.items())}, 'theorem_count': len(axioms)}
    (HERE / 'audit-receipt.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
    print(f'Strict scratch audit passed: {len(axioms)} statements; published formal unchanged.')
if __name__ == '__main__':
    main()
