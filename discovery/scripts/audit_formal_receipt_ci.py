#!/usr/bin/env python3
"""Read-only receipt reconstruction and isolated Git enforcement fixtures."""
from hashlib import sha256
from pathlib import Path
import argparse
import importlib.util
import json
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
SCRIPT = Path(__file__).resolve()
DISCOVERY = next(parent for parent in SCRIPT.parents if (parent / 'formal/audit_axioms.py').is_file())
ROOT = DISCOVERY / '.cache/formal-receipt-ci-recheck'
FORMAL = DISCOVERY / 'formal'
WORKFLOW = DISCOVERY.parent / '.github/workflows/discovery-verify.yml'


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def git(cwd, *args):
    return subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', *args], cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def fixture(name, stale):
    with tempfile.TemporaryDirectory(prefix=f'{name}-', dir=ROOT) as temporary:
        repository = Path(temporary)
        formal = repository / 'discovery/formal'
        formal.mkdir(parents=True)
        require(git(repository, 'init', '--quiet').returncode == 0, 'Fixture Git initialization failed')
        for filename, content in stale.items():
            (formal / filename).write_bytes(content)
        require(git(repository, 'add', 'discovery/formal').returncode == 0, 'Fixture add failed')
        committed = git(repository, '-c', 'user.name=Receipt fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'Synthetic fixture baseline')
        require(committed.returncode == 0, 'Fixture local commit failed')
        # Model the auditor regenerating canonical current receipts. This is a
        # Git enforcement simulation, not a substitute for Lean compilation.
        for filename in ['AXIOMS.txt', 'theorem-inventory.json']:
            (formal / filename).write_bytes((FORMAL / filename).read_bytes())
        result = git(formal, 'diff', '--exit-code', '--', 'AXIOMS.txt', 'theorem-inventory.json')
        return dict(case=name, exit_code=result.returncode, diff=result.stdout,
                    command=['git', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'diff', '--exit-code', '--', 'AXIOMS.txt', 'theorem-inventory.json'],
                    cwd_relative_to_fixture='discovery/formal', isolated_local_git_only=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', action='store_true', help='Permit the not-yet-installed workflow guard for a pre-promotion preview')
    args = parser.parse_args()
    ROOT.mkdir(parents=True, exist_ok=True)
    sources = sorted(path for path in FORMAL.glob('*.lean') if path.name != 'lakefile.lean')
    inputs = sources + [SCRIPT, FORMAL/'AXIOMS.txt', FORMAL/'theorem-inventory.json', FORMAL/'audit_axioms.py', WORKFLOW]
    before = {str(p.relative_to(DISCOVERY.parent)): digest(p) for p in inputs}
    spec = importlib.util.spec_from_file_location('receipt_ci_audit', FORMAL/'audit_axioms.py')
    audit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit)
    output = (FORMAL/'AXIOMS.txt').read_text()
    inventory = json.loads((FORMAL/'theorem-inventory.json').read_text())
    all_declared = set()
    modules = []
    output_lines = {}
    for line in output.splitlines(keepends=True):
        require(line.startswith("'"), 'Current output contains noncanonical diagnostic lines')
        name = line.split("'", 2)[1]
        require(name not in output_lines, 'Duplicate current output line')
        output_lines[name] = line
    ordered_lines = []
    for source in sources:
        declared = audit.declared_theorems(source.read_text(), source.stem)
        module_output = ''.join(output_lines[name] for name in declared)
        parsed = audit.parse_audit(module_output, declared)
        all_declared.update(declared)
        modules.append(dict(source=source.name, source_sha256=digest(source), theorem_count=len(parsed),
                            theorems={name: sorted(axioms) for name, axioms in sorted(parsed.items())}))
        directives = [line.split()[-1] for line in source.read_text().splitlines() if line.startswith('#print axioms ')]
        ordered_lines.extend(output_lines[name] for name in directives)
    parsed = audit.parse_audit(output, all_declared)
    rebuilt_output = ''.join(ordered_lines)
    require(rebuilt_output == output, 'Output differs from sorted-module/directive ordering')
    regenerated = dict(schema='lupine-formal-theorem-inventory-v1', module_count=len(sources), theorem_count=len(parsed),
                       axiom_output_sha256=sha256(output.encode()).hexdigest(), modules=modules)
    encoded = (json.dumps(regenerated, indent=2, sort_keys=True)+'\n').encode()
    require(encoded == (FORMAL/'theorem-inventory.json').read_bytes(), 'Current inventory is stale relative to current source/axiom bytes')
    canonical = {name:(FORMAL/name).read_bytes() for name in ['AXIOMS.txt','theorem-inventory.json']}
    cases = []
    for name, stale_axioms, stale_inventory in [('matching', False, False), ('stale_axioms', True, False), ('stale_inventory', False, True), ('both_stale', True, True)]:
        stale = dict(canonical)
        if stale_axioms:
            stale['AXIOMS.txt'] += b'SYNTHETIC_STALE_RECEIPT\n'
        if stale_inventory:
            changed = dict(inventory)
            changed['axiom_output_sha256'] = '0'*64
            stale['theorem-inventory.json'] = (json.dumps(changed,indent=2,sort_keys=True)+'\n').encode()
        result = fixture(name, stale)
        require(result['exit_code'] == (0 if name == 'matching' else 1), f'Unexpected fixture result: {name}')
        cases.append(result)
    workflow = WORKFLOW.read_text()
    anchor = '          python3 audit_axioms.py\n'
    require(workflow.count(anchor) == 1, 'Workflow audit anchor changed')
    guard = '          git diff --exit-code -- AXIOMS.txt theorem-inventory.json\n'
    guard_present = anchor + guard in workflow
    require(guard_present or args.preview, 'Post-audit committed-receipt guard is missing from Discovery Verify')
    after = {str(p.relative_to(DISCOVERY.parent)): digest(p) for p in inputs}
    require(before == after, 'Published inputs changed during scratch check')
    receipt = dict(schema='lupine-formal-receipt-ci-review-v1',status=('PRE_PROMOTION_PREVIEW_FIXTURES_PASSED' if not guard_present else 'WORKFLOW_GUARD_AND_GIT_FIXTURES_PASSED'),
                   script_sha256=digest(Path(__file__)), inputs_before=before, inputs_after=after,
                   actual_lean_compilation_this_run=False, offline_source_inventory_binding=True,
                   offline_regeneration_byte_identical=True, theorem_count=len(parsed), module_count=len(sources),
                   fixture_cases=cases, workflow_guard_present=guard_present, preview_requested=args.preview,
                   unchanged_published_inputs=True,
                   limits=['Offline reconstruction uses existing audited Lean output; it is not a fresh proof compile.',
                           'Synthetic Git fixtures test receipt enforcement only.',
                           'The required one-line guard compares regenerated tracked receipts to the CI checkout index.',
                           'Proof/receipt identity is conditional mathematical evidence, not physical validity.'])
    (ROOT/'receipt.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
    print(json.dumps(dict(status=receipt['status'],theorem_count=len(parsed),module_count=len(sources),
                          fixture_exit_codes={case['case']:case['exit_code'] for case in cases},
                          receipt_sha256=digest(ROOT/'receipt.json')),indent=2))


if __name__=='__main__':
    main()
