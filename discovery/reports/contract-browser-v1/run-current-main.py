"""Run the unchanged main Chromium gate with fresh local artifacts and hashes."""
from pathlib import Path
from hashlib import sha256
import importlib.metadata
import json
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p / 'src/lupine_discovery/decision_pool.py').is_file())
PACKAGE = ROOT / 'src/lupine_discovery'
OPTIONAL = PACKAGE / 'resources/mpea-t25-v1.json'


def save(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, sort_keys=True, indent=2)
        stream.write('\n')


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def gate_sources():
    paths = [ROOT / 'scripts/browser_smoke.py', ROOT / 'scripts/mpea_browser_checks.py',
             *PACKAGE.rglob('*.py'),
             *(PACKAGE / 'web' / name for name in ('app.js', 'mpea.js', 'index.html', 'styles.css')),
             *(PACKAGE / 'resources').rglob('decision-pool*.json'),
             *(ROOT / 'tests/fixtures/mpea_ui').glob('*.json')]
    return {str(p.relative_to(ROOT)): digest(p) for p in sorted(paths)}


def supplemental_sources():
    # Public packaged fixtures/aggregate reports and abstract examples also read
    # by the unchanged gate, beyond its established 47-file source closure.
    paths = [*(PACKAGE / 'resources').rglob('*.json'),
             ROOT / 'examples/abstract.json', ROOT / 'examples/abstract.outcomes.json',
             ROOT / 'scripts/package_smoke.py', Path(__file__)]
    return {str(p.relative_to(ROOT)): digest(p) for p in sorted(paths)}


assert not OPTIONAL.exists(), 'This gate must run before the actual MPEA resource exists'
before = {'gate_sources': gate_sources(), 'supplemental_sources': supplemental_sources(),
          'optional_mpea_resource_exists': OPTIONAL.exists()}
assert len(before['gate_sources']) == 47
save(HERE / 'source-before.json', before)
command = [sys.executable, str(ROOT / 'scripts/browser_smoke.py')]
started = time.monotonic()
timeout = False
try:
    completed = subprocess.run(command, cwd=HERE, capture_output=True, timeout=600)
    output, error, code = completed.stdout, completed.stderr, completed.returncode
except subprocess.TimeoutExpired as failure:
    output, error, code = failure.stdout or b'', failure.stderr or b'', None
    timeout = True
elapsed = time.monotonic() - started
for name, raw in [('stdout.txt', output), ('stderr.txt', error)]:
    with (HERE / name).open('xb') as stream:
        stream.write(raw)
after = {'gate_sources': gate_sources(), 'supplemental_sources': supplemental_sources(),
         'optional_mpea_resource_exists': OPTIONAL.exists()}
save(HERE / 'source-after.json', after)
report_path = HERE / '.cache/browser/decision-pool/browser-report.json'
report = json.loads(report_path.read_bytes()) if report_path.is_file() else None
valid_report = (type(report) is dict and report.get('status') == 'passed'
                and report.get('javascript_errors') == []
                and report.get('source_sha256') == before['gate_sources'])
receipt = {
    'schema': 'lupine.discovery.browser_current_main_execution.v1',
    'command': command, 'cwd': str(HERE), 'exit_code': code, 'timeout': timeout,
    'elapsed_seconds': elapsed, 'python': sys.version,
    'playwright_version': importlib.metadata.version('playwright'),
    'source_before': before, 'source_after': after, 'source_unchanged': before == after,
    'stdout_sha256': digest(HERE / 'stdout.txt'), 'stderr_sha256': digest(HERE / 'stderr.txt'),
    'browser_report_path': str(report_path.relative_to(ROOT)) if report is not None else None,
    'browser_report_sha256': digest(report_path) if report is not None else None,
    'browser_report_source_binding_matches': valid_report,
    'check_count': len(report['checks']) if valid_report else None,
    'javascript_errors': report.get('javascript_errors') if report is not None else None,
    'status': 'PASS' if code == 0 and valid_report and before == after else 'FAIL',
    'scope': 'Unmodified main Chromium research-preview engineering gate. Real browser and local server, constructed MPEA aggregate controls only. No actual MPEA resource, scientific source, private features/targets, allocation or live API.',
    'limitations': ['Supplemental package_smoke.py identity is recorded; this browser command does not execute the installed-wheel smoke.',
                    'Browser engineering evidence does not validate physical or statistical premises.']
}
save(HERE / 'execution.json', receipt)
print(json.dumps({k: receipt[k] for k in ('status', 'exit_code', 'elapsed_seconds', 'check_count',
                                         'source_unchanged', 'browser_report_sha256')}), flush=True)
print('execution_sha256=' + digest(HERE / 'execution.json'), flush=True)
sys.exit(0 if receipt['status'] == 'PASS' else 1)
