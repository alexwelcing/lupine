"""Source-bound tiny review runner; no study execution."""
import ast
from hashlib import sha256
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = next(p for p in Path(__file__).resolve().parents
            if (p / 'src/lupine_discovery/decision_pool.py').is_file())
HERE = Path(__file__).resolve().parent
paths = {
    'scripts/mpea_registration_allocation.py', 'scripts/permutation_allocation.py',
    'scripts/mpea_target_custody.py', 'scripts/mpea_feature_reader.py',
    'scripts/mpea_formula_tokens.py', 'scripts/mpea_row_metadata.py',
    'scripts/mpea_header_labels.py', 'scripts/mpea_archive_custody.py',
    'scripts/mpea_features.py', 'src/lupine_discovery/representation.py',
    '.cache/mpea-preallocation-diagnosis/before/mpea_registration_allocation.py',
    '.cache/mpea-preallocation-diagnosis/candidate/scripts/mpea_registration_allocation.py',
    '.cache/mpea-preallocation-diagnosis/candidate/tests/test_mpea_registration_public_metadata.py',
    *[str((HERE / name).relative_to(ROOT)) for name in
      ('run_review.py', 'test_upstream_seal_peer.py', 'check_public_feature_readiness.py')],
    *['reports/mpea-feature-readiness-v1/' + name for name in
      ('process-1/readiness.json', 'process-2/readiness.json', 'reproduction.json')],
}
for file, keys in [('scripts/mpea_row_metadata.py', {'PRIOR_PINS'}),
                   ('scripts/mpea_formula_tokens.py', {'REFERENCE_PINS'}),
                   ('scripts/mpea_registration_allocation.py', {'METADATA_PINS'})]:
    for node in ast.parse((ROOT / file).read_text()).body:
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id in keys for target in node.targets):
            paths.update(ast.literal_eval(node.value))
paths.update({'reports/mpea-formula-tokens-v1.json', 'reports/mpea-formula-reproduction-v1.json'})

def snapshot():
    result = {}
    for name in sorted(paths):
        raw = (ROOT / name).read_bytes()
        result[name] = {'sha256': sha256(raw).hexdigest(), 'bytes': len(raw)}
    return result

before = snapshot()
commands = [
    (['-m', 'unittest', 'discover', '-s', str(HERE), '-p', 'test_upstream_seal_peer.py', '-v'], 'independent-tests-v1.txt'),
    ([str(HERE / 'check_public_feature_readiness.py')], 'public-feature-readiness-execution-v1.txt'),
]
results = []
for args, log in commands:
    command = [sys.executable, '-B', *args]
    with (HERE / log).open('xb') as output:
        run = subprocess.run(command, cwd=ROOT, stdout=output, stderr=subprocess.STDOUT,
                             env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}, check=False)
    raw = (HERE / log).read_bytes()
    results.append({'command': command, 'exit_code': run.returncode, 'log': log,
                    'sha256': sha256(raw).hexdigest(), 'bytes': len(raw)})
after = snapshot()
record = {
    'schema': 'lupine.review.mpea_preallocation_seal_peer.v1',
    'status': 'PASS' if before == after and all(r['exit_code'] == 0 for r in results) else 'FAIL',
    'source_before': before, 'source_after': after, 'sources_unchanged': before == after,
    'executions': results, 'independent_tests': 10,
    'scope': {'public_pinned_metadata_only': True, 'scientific_attempts_read': False,
              'private_features_read': False, 'raw_source_read': False, 'targets_read': False,
              'entropy_or_allocation': False, 'prepare_registered_called': False,
              'internal_canonical_unchanged': True,
              'physical_or_sampling_validity_established': False},
}
aux = HERE / 'public-feature-readiness-v1.json'
if aux.exists():
    raw = aux.read_bytes()
    record['separate_public_readiness_review'] = {'path': aux.name, 'sha256': sha256(raw).hexdigest(), 'bytes': len(raw)}
with (HERE / 'independent-review-v1.json').open('x') as output:
    json.dump(record, output, sort_keys=True, indent=2)
    output.write('\n')
print(json.dumps({'status': record['status'], 'bindings': len(before), 'sources_unchanged': before == after,
                  'exit_codes': [r['exit_code'] for r in results]}, sort_keys=True))
raise SystemExit(0 if record['status'] == 'PASS' else 1)
