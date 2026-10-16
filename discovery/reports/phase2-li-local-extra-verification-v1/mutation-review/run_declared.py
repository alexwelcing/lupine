"""Capture baseline and six predeclared mutation runs with unchanged runtime pins."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import subprocess
import sys
import time

BASE = Path(__file__).absolute().parent
ROOT = next(p for p in BASE.parents if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
EXPECTED_DECLARATION = '9f21914c7f8742e54aa23eeee5bfccebbdc57dcdd0da8ea9f787ca9f28383fb0'
EXPECTED_MANIFEST = 'e806d052dcfaadc5bbc0a9378318709da011fbaf3a53a290aa6141014bae3959'
MANIFEST = ROOT / 'reports/runtime-manifest.json'

def identity(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def read_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('duplicate JSON key')
            result[key] = value
        return result
    return json.loads(path.read_text(), object_pairs_hook=unique)

if sys.flags.optimize:
    raise SystemExit('ordinary unoptimized Python required')
assert identity(BASE / 'declaration.json')['sha256'] == EXPECTED_DECLARATION
declaration = read_json(BASE / 'declaration.json')
assert identity(MANIFEST)['sha256'] == EXPECTED_MANIFEST
manifest = read_json(MANIFEST)
assert len(manifest['files']) == 326

def snapshot():
    assert identity(MANIFEST)['sha256'] == EXPECTED_MANIFEST
    actual = {}
    for name, digest in manifest['files'].items():
        path = ROOT / name
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        assert path.resolve().is_relative_to(ROOT) and not path.is_symlink()
        observed = identity(path)
        assert observed['sha256'] == digest, name
        actual[name] = observed
    return {'runtime_manifest': identity(MANIFEST), 'files': actual}

def held_paths():
    paths = ['declaration.json', 'unchanged-independent-tests.py', 'baseline/li_v3_local_extra_headers.py',
             'execute_selected.py', 'run_declared.py', 'execution-plan.json', 'runtime-manifest.json']
    for mutation in declaration['mutations']:
        paths.extend([mutation['source'], mutation['diff']])
    return {name: identity(BASE / name) for name in paths}

cases = [('baseline', declaration['baseline_source'], {
    'bytes': declaration['production_source']['bytes'], 'sha256': declaration['production_source']['sha256']})]
cases.extend((m['id'], m['source'], m['identity']) for m in declaration['mutations'])
assert [name for name, _, _ in cases] == declaration['execution_order']
env = dict(os.environ)
env['PYTHONDONTWRITEBYTECODE'] = '1'
env.pop('PYTHONOPTIMIZE', None)
summary = []
for name, relative_source, expected in cases:
    source = BASE / relative_source
    assert identity(source) == expected
    # Production source/test hashes are also included in the 326-file snapshot.
    assert identity(ROOT / declaration['production_source']['path'])['sha256'] == declaration['production_source']['sha256']
    assert identity(ROOT / declaration['production_tests']['path'])['sha256'] == declaration['production_tests']['sha256']
    assert identity(BASE / 'unchanged-independent-tests.py')['sha256'] == declaration['production_tests']['sha256']
    run = BASE / 'runs' / name
    run.mkdir(parents=True, exist_ok=False)
    before = snapshot()
    held_before = held_paths()
    (run / 'runtime-before.json').write_text(json.dumps(before, indent=2) + '\n')
    command = [sys.executable, '-B', str(BASE / 'execute_selected.py'), str(source), str(run / 'test-result.json')]
    start = datetime.now(timezone.utc).isoformat()
    tick = time.monotonic()
    timed_out = False
    try:
        process = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, timeout=45)
        exit_code, stdout, stderr = process.returncode, process.stdout, process.stderr
    except subprocess.TimeoutExpired as error:
        timed_out = True
        exit_code, stdout, stderr = None, error.stdout or b'', error.stderr or b''
    elapsed = time.monotonic() - tick
    (run / 'stdout.txt').write_bytes(stdout)
    (run / 'stderr.txt').write_bytes(stderr)
    after = snapshot()
    (run / 'runtime-after.json').write_text(json.dumps(after, indent=2) + '\n')
    held_after = held_paths()
    receipt = {'schema': 'lupine.discovery.predeclared_mutation_execution.v1',
        'case': name, 'command': command, 'cwd': str(ROOT), 'started_utc': start,
        'finished_utc': datetime.now(timezone.utc).isoformat(), 'elapsed_seconds': elapsed,
        'exit_code': exit_code, 'timed_out': timed_out, 'source': identity(source),
        'declaration_sha256': EXPECTED_DECLARATION, 'test_sha256': declaration['production_tests']['sha256'],
        'selected_methods': declaration['selected_methods'],
        'runtime_before': identity(run / 'runtime-before.json'), 'runtime_after': identity(run / 'runtime-after.json'),
        'runtime_326_unchanged': before == after, 'held_before': held_before, 'held_after': held_after,
        'held_unchanged': held_before == held_after, 'stdout': identity(run / 'stdout.txt'),
        'stderr': identity(run / 'stderr.txt')}
    if (run / 'test-result.json').is_file():
        receipt['test_result'] = identity(run / 'test-result.json')
        outcome = read_json(run / 'test-result.json')
        if outcome['blocked_function_calls'] or outcome['blocked_audit_events']:
            classification = 'HARNESS_SCOPE_VIOLATION'
        elif outcome['tests_run'] != 25 or timed_out:
            classification = 'HARNESS_INCOMPLETE'
        elif name == 'baseline':
            classification = 'BASELINE_PASS' if exit_code == 0 and outcome['successful'] else 'BASELINE_FAIL'
        elif exit_code == 0 and outcome['successful']:
            classification = 'SURVIVED'
        elif outcome['failure_events'] and not outcome['error_events']:
            classification = 'DETECTED_BY_ASSERTIONS'
        else:
            classification = 'REVIEW_REQUIRED_ERRORS'
        record = {'case': name, 'classification': classification, 'exit_code': exit_code,
                  'elapsed_seconds': elapsed, 'tests_run': outcome['tests_run'],
                  'failure_events': outcome['failure_events'], 'error_events': outcome['error_events'],
                  'unique_failed_method_count': len(outcome['unique_failed_methods']),
                  'unique_failed_methods': outcome['unique_failed_methods']}
    else:
        record = {'case': name, 'classification': 'HARNESS_NO_RESULT', 'exit_code': exit_code,
                  'elapsed_seconds': elapsed}
    receipt['classification'] = record['classification']
    (run / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
    record['execution'] = identity(run / 'execution.json')
    summary.append(record)
    (BASE / 'results.json').write_text(json.dumps({'declaration_sha256': EXPECTED_DECLARATION, 'cases': summary}, indent=2) + '\n')
    print(json.dumps(record), flush=True)
    assert before == after and held_before == held_after, 'held bytes changed'
    if name == 'baseline' and record['classification'] != 'BASELINE_PASS':
        raise SystemExit('baseline failed; mutants not executed')
    if record['classification'].startswith('HARNESS'):
        raise SystemExit('harness failure; no later case executed')
