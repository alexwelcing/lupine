"""Clean-release recorder requiring the reviewed public MPEA resource; no tracked writes."""
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
RESOURCE = 'src/lupine_discovery/resources/mpea-t25-v1.json'
EXPECTED_RESOURCE_SHA256 = 'd93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274'
assert sys.flags.optimize == 0, 'Release assertions must remain enabled'
assert len(sys.argv) == 2, 'Provide the root-authorized full commit SHA'
COMMIT = sys.argv[1]
assert len(COMMIT) == 40 and all(c in '0123456789abcdef' for c in COMMIT)
HERE = ROOT / ('.cache/package-present-release-execution-' + COMMIT[:12])
HERE.mkdir()
RETAINED = '.cache/release-artifacts-present-contract-' + COMMIT[:12]
SOURCES = ['scripts/package_smoke.py', 'scripts/verify_retained_artifacts.py',
           'scripts/runtime_manifest.py', 'reports/runtime-manifest.json', 'pyproject.toml',
           '.cache/package-present-release-preparation-v1/audit-wheel-source-present-v1.py', str(Path(__file__).relative_to(ROOT)), RESOURCE]


def save(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, sort_keys=True, indent=2)
        stream.write('\n')


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def snapshot():
    def git(*args):
        return subprocess.run(['git', *args], cwd=ROOT, check=True,
                              capture_output=True).stdout.decode('utf-8')
    return {'git_head': git('rev-parse', 'HEAD').strip(),
            'git_status_porcelain': git('status', '--porcelain=v1', '--untracked-files=all'),
            'source_sha256': {path: digest(ROOT / path) for path in SOURCES},
            'optional_mpea_resource_exists': (ROOT / RESOURCE).is_file(),
            'optional_mpea_resource_regular_path': (ROOT / RESOURCE).resolve() == ROOT / RESOURCE,
            'optional_mpea_resource_sha256': digest(ROOT / RESOURCE) if (ROOT / RESOURCE).is_file() else None}



def reviewed_transport_checks(retained, verifier, audit):
    expected_claim = {'resource': 'resources/mpea-t25-v1.json',
                      'status': 'present_exactly_served',
                      'javascript': 'packaged_and_exactly_served'}
    return {
        'installed_http_probe_reports_exact_present_resource':
            bool(retained and retained.get('verification', {}).get('optional_mpea') == expected_claim),
        'strict_auditor_binds_reviewed_wheel_resource':
            bool(verifier and verifier.get('status') == 'PASS'
                 and verifier.get('mpea_transport_audit', {}).get('optional_resource_present') is True
                 and verifier.get('mpea_transport_audit', {}).get('optional_resource_sha256') == EXPECTED_RESOURCE_SHA256),
        'payload_audit_binds_reviewed_wheel_and_source_resource':
            bool(audit and audit.get('status') == 'PASS'
                 and audit.get('reviewed_mpea_resource', {}).get('sha256') == EXPECTED_RESOURCE_SHA256
                 and audit.get('reviewed_mpea_resource', {}).get('wheel_equals_source_bytes') is True
                 and audit.get('reviewed_mpea_resource', {}).get('recorded_http_value_agreement') is True),
    }


before = snapshot()
assert before['git_head'] == COMMIT and before['git_status_porcelain'] == ''
assert before['optional_mpea_resource_exists'] and before['optional_mpea_resource_regular_path']
assert before['optional_mpea_resource_sha256'] == EXPECTED_RESOURCE_SHA256, 'Reviewed MPEA resource bytes differ'
assert not (ROOT / RETAINED).exists()
assert not (ROOT / ('.cache/wheel-source-present-contract-' + COMMIT[:12] + '.json')).exists()
save(HERE / 'source-before.json', before)
commands = [
    ('package', [sys.executable, 'scripts/package_smoke.py', '--retain-directory', RETAINED]),
    ('retained-verifier', [sys.executable, 'scripts/verify_retained_artifacts.py', '--directory', RETAINED,
                           '--commit', COMMIT]),
    ('wheel-source-audit', [sys.executable, '.cache/package-present-release-preparation-v1/audit-wheel-source-present-v1.py', COMMIT]),
]
results = []
for name, command in commands:
    current = snapshot()
    assert current == before, 'Source or Git state changed before command'
    started_utc = datetime.now(timezone.utc).isoformat()
    started = time.monotonic()
    timeout = False
    with (HERE / (name + '.stdout.txt')).open('xb') as output, (HERE / (name + '.stderr.txt')).open('xb') as error:
        process = subprocess.Popen(command, cwd=ROOT, stdout=output, stderr=error, start_new_session=True)
        save(HERE / (name + '.started.json'), {'command': command, 'cwd': str(ROOT),
             'pid': process.pid, 'wrapper_pid': os.getpid(), 'started_at_utc': started_utc,
             'source_state': current})
        try:
            code = process.wait(timeout=1200)
        except subprocess.TimeoutExpired:
            timeout = True
            os.killpg(process.pid, signal.SIGTERM)
            try:
                code = process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                code = process.wait()
    after_command = snapshot()
    record = {'name': name, 'command': command, 'cwd': str(ROOT), 'pid': process.pid,
              'started_at_utc': started_utc, 'finished_at_utc': datetime.now(timezone.utc).isoformat(),
              'elapsed_seconds': time.monotonic() - started, 'exit_code': code, 'timeout': timeout,
              'source_unchanged': current == after_command,
              'stdout_sha256': digest(HERE / (name + '.stdout.txt')),
              'stderr_sha256': digest(HERE / (name + '.stderr.txt')),
              'source_after': after_command}
    save(HERE / (name + '.execution.json'), record)
    results.append(record)
    print(json.dumps({key: record[key] for key in ('name', 'exit_code', 'elapsed_seconds', 'source_unchanged')}), flush=True)
    if name == 'package' and code != 0:
        break

after = snapshot()
retained_path = ROOT / RETAINED / 'release-artifacts.json'
retained = json.loads(retained_path.read_bytes()) if retained_path.is_file() else None
audit_path = ROOT / ('.cache/wheel-source-present-contract-' + COMMIT[:12] + '.json')
audit = json.loads(audit_path.read_bytes()) if audit_path.is_file() else None
verifier_record = next((record for record in results if record['name'] == 'retained-verifier'), None)
verifier = (json.loads((HERE / 'retained-verifier.stdout.txt').read_bytes())
            if verifier_record and verifier_record['exit_code'] == 0 else None)
present_checks = reviewed_transport_checks(retained, verifier, audit)
result = {
    'schema': 'lupine.discovery.retained_release_execution.v1',
    'source_commit': COMMIT, 'source_before': before, 'source_after': after,
    'source_unchanged': before == after, 'commands': results,
    'retained_receipt_path': str(retained_path.relative_to(ROOT)) if retained else None,
    'retained_receipt_sha256': digest(retained_path) if retained else None,
    'artifacts': retained['artifacts'] if retained else None,
    'optional_mpea_probe': retained['verification'].get('optional_mpea') if retained else None,
    'expected_mpea_resource_sha256': EXPECTED_RESOURCE_SHA256,
    'reviewed_resource_transport_checks': present_checks,
    'wheel_source_audit_path': str(audit_path.relative_to(ROOT)) if audit else None,
    'wheel_source_audit_sha256': digest(audit_path) if audit else None,
    'status': 'PASS' if before == after and len(results) == 3 and all(r['exit_code'] == 0 for r in results) and all(present_checks.values()) else 'FAIL',
    'scope': 'Actual clean-commit wheel build, isolated installation and HTTP/CLI probe; independent retained-identity verification and byte audit are separate command results. The already-reviewed public MPEA aggregate is read and served; no study rerun, allocation, private target access or scientific source execution. HTTP checks type-sensitive JSON value equality; wheel/source resource checks exact file bytes. Package results do not override the separate full Python suite or registration gates.'
}
save(HERE / 'execution.json', result)
print(json.dumps({'status': result['status'], 'receipt_sha256': digest(HERE / 'execution.json'),
                  'retained_receipt_sha256': result['retained_receipt_sha256'],
                  'optional_mpea_probe': result['optional_mpea_probe']}), flush=True)
sys.exit(0 if result['status'] == 'PASS' else 1)
