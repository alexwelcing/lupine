"""Execute the unchanged full local browser gate with the held343 closure."""
from datetime import datetime, timezone
from hashlib import sha256
import importlib.metadata
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REPOSITORY = ROOT.parent
COMMIT = 'a0624cac9abb20320629cce41f10270b9b8e2136'
BASELINE = ROOT / '.cache/mpea-preallocation-recovery-full-suite-v1/source-before.json'
baseline_raw = BASELINE.read_bytes()
expected = json.loads(baseline_raw)
assert type(expected) is dict and len(expected) == 343


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def save(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, sort_keys=True, indent=2)
        stream.write('\n')


def snapshot():
    def git(*args):
        return subprocess.run(['git', *args], cwd=ROOT, check=True,
                              capture_output=True).stdout.decode('utf-8')
    return {'source_sha256': {name: digest(REPOSITORY / name) for name in expected},
            'git_head': git('rev-parse', 'HEAD').strip(),
            'git_status_porcelain': git('status', '--porcelain=v1', '--untracked-files=all'),
            'closure_reference_sha256': digest(BASELINE),
            'runner_sha256': digest(Path(__file__)),
            'optional_mpea_resource_exists': (ROOT / 'src/lupine_discovery/resources/mpea-t25-v1.json').exists()}


before = snapshot()
assert before['source_sha256'] == expected
assert before['git_head'] == COMMIT and not before['optional_mpea_resource_exists']
save(HERE / 'source-before.json', before)
# Preserve the literal runbook command while relocating only its relative output
# directory. The symlink resolves to the unchanged main script/import directory.
(HERE / 'scripts').symlink_to(ROOT / 'scripts', target_is_directory=True)
command = [sys.executable, 'scripts/browser_smoke.py']
started_utc = datetime.now(timezone.utc).isoformat()
started = time.monotonic()
timed_out = False
with (HERE / 'stdout.txt').open('xb') as output, (HERE / 'stderr.txt').open('xb') as error:
    process = subprocess.Popen(command, cwd=HERE, stdout=output, stderr=error, start_new_session=True)
    save(HERE / 'started.json', {'command': command, 'cwd': str(HERE),
         'pid': process.pid, 'wrapper_pid': os.getpid(), 'started_at_utc': started_utc,
         'resolved_script': str((HERE / 'scripts/browser_smoke.py').resolve()),
         'script_sha256': digest(ROOT / 'scripts/browser_smoke.py')})
    try:
        code = process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(process.pid, signal.SIGTERM)
        try:
            code = process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            code = process.wait()
elapsed = time.monotonic() - started
after = snapshot()
save(HERE / 'source-after.json', after)
report_path = HERE / '.cache/browser/decision-pool/browser-report.json'
report = json.loads(report_path.read_bytes()) if report_path.is_file() else None
inner_bound = (type(report) is dict and type(report.get('source_sha256')) is dict
               and all(expected.get('discovery/' + name) == value
                       for name, value in report['source_sha256'].items()))
passed = (code == 0 and before == after and after['source_sha256'] == expected
          and report is not None and report.get('status') == 'passed'
          and report.get('javascript_errors') == [] and inner_bound)
receipt = {'schema': 'lupine.discovery.preallocation_recovery_browser_execution.v1',
           'source_commit': COMMIT, 'command': command, 'cwd': str(HERE),
           'resolved_script': str((HERE / 'scripts/browser_smoke.py').resolve()),
           'pid': process.pid, 'started_at_utc': started_utc,
           'finished_at_utc': datetime.now(timezone.utc).isoformat(),
           'elapsed_seconds': elapsed, 'exit_code': code, 'timeout': timed_out,
           'python': sys.version, 'playwright_version': importlib.metadata.version('playwright'),
           'source_before': before, 'source_after': after,
           'source_unchanged': before == after, 'closure_count': len(expected),
           'closure_matches_original_full_suite_reference': after['source_sha256'] == expected,
           'stdout_sha256': digest(HERE / 'stdout.txt'), 'stderr_sha256': digest(HERE / 'stderr.txt'),
           'browser_report_path': str(report_path.relative_to(ROOT)) if report is not None else None,
           'browser_report_sha256': digest(report_path) if report is not None else None,
           'browser_inner_source_count': len(report['source_sha256']) if inner_bound else None,
           'browser_inner_sources_match_held_closure': inner_bound,
           'check_count': len(report['checks']) if report is not None else None,
           'javascript_errors': report.get('javascript_errors') if report is not None else None,
           'status': 'PASS' if passed else 'FAIL',
           'scope': 'Full unchanged local Chromium workbench command, genuine browser/local server, held343 source closure and constructed MPEA aggregate controls. No actual MPEA resource, private scientific inputs, allocation or study invocation.',
           'limitations': ['Browser engineering evidence does not establish physical/statistical premises or authorize study registration.',
                           'A scratch scripts symlink changes only output working directory; its target is the exact unchanged main script tree.']}
save(HERE / 'execution.json', receipt)
print(json.dumps({key: receipt[key] for key in ('status', 'exit_code', 'elapsed_seconds', 'check_count',
                                               'source_unchanged', 'closure_count', 'browser_report_sha256')}), flush=True)
print('execution_sha256=' + digest(HERE / 'execution.json'), flush=True)
sys.exit(0 if passed else 1)
