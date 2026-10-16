"""Source-bound candidate audit controls and read-only retained478 verification."""
from pathlib import Path
from hashlib import sha256
import json
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p / 'src/lupine_discovery/decision_pool.py').is_file())
COMMIT = '478208f0f3be4b5d810a2c113dbc395b9f1744cb'
RETAINED = ROOT / ('.cache/release-artifacts-contract-' + COMMIT[:12])
PATHS = [Path(__file__), HERE / 'scripts/verify_retained_artifacts.py',
         HERE / 'tests/test_retained_artifacts.py', HERE / 'tests/test_retained_mpea_transport.py',
         HERE / 'copy-manifest-v1.json', ROOT / 'scripts/verify_retained_artifacts.py',
         ROOT / 'scripts/package_smoke.py', RETAINED / 'release-artifacts.json',
         RETAINED / 'lupine_discovery-0.1.0-py3-none-any.whl',
         RETAINED / ('lupine-discovery-source-' + COMMIT[:12] + '.tar')]


def digest(p):
    return sha256(p.read_bytes()).hexdigest()


def snapshot():
    return {str(p.relative_to(ROOT)): digest(p) for p in PATHS}


def save(path, value):
    with path.open('x') as f:
        json.dump(value, f, sort_keys=True, indent=2)
        f.write('\n')


before = snapshot()
save(HERE / 'reports/source-before-v1.json', before)
commands = [
    ('existing-controls', [sys.executable, str(HERE / 'tests/test_retained_artifacts.py'), '-v']),
    ('new-controls', [sys.executable, str(HERE / 'tests/test_retained_mpea_transport.py'), '-v']),
    ('retained478-candidate-audit', [sys.executable, str(HERE / 'scripts/verify_retained_artifacts.py'),
                                  '--directory', str(RETAINED), '--commit', COMMIT]),
]
results = []
for name, command in commands:
    started = time.monotonic()
    process = subprocess.run(command, cwd=ROOT, capture_output=True, timeout=120)
    for suffix, raw in [('stdout', process.stdout), ('stderr', process.stderr)]:
        with (HERE / 'reports' / (name + '.' + suffix + '.txt')).open('xb') as f:
            f.write(raw)
    result = {'name': name, 'command': command, 'exit_code': process.returncode,
              'elapsed_seconds': time.monotonic() - started,
              'stdout_sha256': sha256(process.stdout).hexdigest(),
              'stderr_sha256': sha256(process.stderr).hexdigest()}
    results.append(result)
    print(json.dumps(result), flush=True)
after = snapshot()
receipt = {'schema': 'lupine.discovery.retained_mpea_candidate_execution.v1',
           'source_before': before, 'source_after': after, 'source_unchanged': before == after,
           'commands': results, 'status': 'PASS' if before == after and all(r['exit_code'] == 0 for r in results) else 'FAIL',
           'scope': 'Constructed full-reseal adversarial controls plus read-only candidate verification of unchanged retained478 artifacts. The published old-auditor failure is preserved. No artifact code imported/executed, no new wheel build or scientific/registration approval.'}
save(HERE / 'reports/execution-v1.json', receipt)
print(json.dumps({'status': receipt['status'], 'receipt_sha256': digest(HERE / 'reports/execution-v1.json')}), flush=True)
sys.exit(0 if receipt['status'] == 'PASS' else 1)
