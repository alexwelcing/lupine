"""Prepare an ignored, source-bound formal integration copy set; never build."""
import hashlib
import json
from pathlib import Path
import subprocess
import tomllib

BASE = Path(__file__).resolve().parent
DISCOVERY = BASE.parent.parent
COMMIT = '9d1f21dae141a28db378ee2e16aa83340df57877'
SOURCE_SHA = '391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def git(*args):
    return subprocess.run(['git', *args], cwd=DISCOVERY, check=True,
                          capture_output=True, timeout=15).stdout

def committed(path):
    raw = git('show', f'{COMMIT}:discovery/{path}')
    if raw != (DISCOVERY / path).read_bytes():
        raise ValueError(f'Current bytes differ from declared baseline: {path}')
    return raw

def main():
    if git('rev-parse', 'HEAD').decode().strip() != COMMIT:
        raise ValueError('Unexpected baseline HEAD')
    if git('status', '--porcelain').strip():
        raise ValueError('Tracked baseline is not clean')
    baseline_paths = [
        'formal/lakefile.toml', 'formal/README.md', 'formal/history/README.md',
        'formal/theorem-inventory.json', 'formal/AXIOMS.txt',
        'formal/lean-toolchain', 'formal/lake-manifest.json',
        'formal/audit_axioms.py', 'formal/test_audit_axioms.py',
        'formal/VERIFICATION.md',
    ]
    old = {p: committed(p) for p in baseline_paths}
    inventory = json.loads(old['formal/theorem-inventory.json'])
    if (inventory['module_count'], inventory['theorem_count']) != (10, 130):
        raise ValueError('Unexpected old inventory totals')
    if inventory['axiom_output_sha256'] != sha(old['formal/AXIOMS.txt']):
        raise ValueError('Old axiom output does not match its inventory')
    for module in inventory['modules']:
        p = 'formal/' + module['source']
        old[p] = committed(p)
        if sha(old[p]) != module['source_sha256']:
            raise ValueError(f'Old source does not match its inventory: {p}')
    candidate = (DISCOVERY / '.cache/phase2-finite-planning-formal-candidate-v1/LupineFinitePlanning.lean').read_bytes()
    if sha(candidate) != SOURCE_SHA:
        raise ValueError('Reviewed candidate source changed')
    targets_before = tomllib.loads(old['formal/lakefile.toml'].decode())
    lake = old['formal/lakefile.toml'].decode().replace(
        '"LupineExchangeability", "LupineNormalization"]',
        '"LupineExchangeability", "LupineNormalization", "LupineFinitePlanning"]', 1)
    lake += '[[lean_lib]]\nname = "LupineFinitePlanning"\n'
    targets_after = tomllib.loads(lake)
    if targets_after['defaultTargets'] != targets_before['defaultTargets'] + ['LupineFinitePlanning']:
        raise ValueError('Unexpected target change')
    if targets_after['lean_lib'] != targets_before['lean_lib'] + [{'name': 'LupineFinitePlanning'}]:
        raise ValueError('Unexpected library change')
    for key in targets_before:
        if key not in {'defaultTargets', 'lean_lib'} and targets_before[key] != targets_after[key]:
            raise ValueError('Unexpected dependency/package change')
    readme = old['formal/README.md'].decode()
    old_intro = ('conditional finite coefficient normalization and L1 algebra. Each module has\n'
                 'its own namespace. All ten modules are default build targets.')
    new_intro = ('conditional finite coefficient normalization and L1 algebra. '
                 '`LupineFinitePlanning.lean`\n'
                 'proves fixed-population zero-failure subset counting, exact rational null\n'
                 'bounds, and census resolution. Each module has its own namespace. All eleven\n'
                 'modules are default build targets.')
    if readme.count(old_intro) != 1:
        raise ValueError('README introduction differs from expected baseline')
    readme = readme.replace(old_intro, new_intro, 1)
    section = (BASE / 'finite-planning-section.md').read_text()
    if readme.count('## Reproduction and trust\n') != 1:
        raise ValueError('README insertion point differs')
    readme = readme.replace('## Reproduction and trust\n', section + '\n## Reproduction and trust\n', 1)
    history = old['formal/history/README.md'].decode() + (
        '\n`pre-finite-planning-theorem-inventory.json` and\n'
        '`pre-finite-planning-AXIOMS.txt` preserve the ten-module, 130-statement\n'
        f'receipt at checkpoint `{COMMIT}`, before finite-population\n'
        'planning integration. The copies were verified against committed bytes,\n'
        'all ten module source hashes, and the combined axiom-output hash. Their\n'
        'module paths remain relative to parent `formal/`. These historical bytes\n'
        'do not replace the fresh audit required after adding the eleventh module.\n')
    outputs = {
        'formal/LupineFinitePlanning.lean': candidate,
        'formal/lakefile.toml': lake.encode(),
        'formal/README.md': readme.encode(),
        'formal/history/README.md': history.encode(),
        'formal/history/pre-finite-planning-theorem-inventory.json': old['formal/theorem-inventory.json'],
        'formal/history/pre-finite-planning-AXIOMS.txt': old['formal/AXIOMS.txt'],
    }
    for path, raw in outputs.items():
        target = BASE / 'promotion' / path
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as stream:
            stream.write(raw)
    baseline = {
        'schema': 'lupine.finite-planning-formal-integration.baseline.v1',
        'commit': COMMIT, 'old_modules': 10, 'old_theorems': 130,
        'all_worktree_bytes_match_committed_baseline': True,
        'all_old_inventory_module_hashes_match': True,
        'old_inventory_axiom_output_hash_matches': True,
        'source_files': {p: {'bytes': len(raw), 'sha256': sha(raw)} for p, raw in old.items()},
        'new_candidate_source_sha256': sha(candidate),
        'dependency_toolchain_parser_changes': False,
        'tracked_integration_build_or_audit_performed': False,
    }
    (BASE / 'baseline.json').write_text(json.dumps(baseline, indent=2, sort_keys=True) + '\n')
    copyset = {
        'schema': 'lupine.finite-planning-formal-integration.copyset.v1',
        'baseline_commit': COMMIT,
        'files': [{'path': p, 'candidate_path': 'promotion/' + p,
                   'sha256': sha(raw), 'bytes': len(raw),
                   'baseline_sha256': sha(old[p]) if p in old else None}
                  for p, raw in sorted(outputs.items())],
        'do_not_copy_as_current_inventory': [
            'formal/history/pre-finite-planning-theorem-inventory.json',
            'formal/history/pre-finite-planning-AXIOMS.txt'],
        'current_inventory_and_axiom_output_not_regenerated': True,
    }
    (BASE / 'copyset.json').write_text(json.dumps(copyset, indent=2, sort_keys=True) + '\n')
    if git('rev-parse', 'HEAD').decode().strip() != COMMIT or git('status', '--porcelain').strip():
        raise ValueError('Baseline changed while overlay was prepared')
    print(json.dumps({'files': len(outputs), 'candidate_source_sha256': sha(candidate),
                      'baseline_commit': COMMIT, 'tracked_files_unchanged': True}, sort_keys=True))

if __name__ == '__main__':
    main()
