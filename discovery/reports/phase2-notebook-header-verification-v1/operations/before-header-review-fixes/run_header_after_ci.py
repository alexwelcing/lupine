"""Root-only fixed categorical diagnoses after observed source verification."""
from pathlib import Path
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import time

ROOT = Path.cwd()
COMMIT = 'a6e87c198d8116d26c523e0e1b2eedce4aeb225b'
BASE = ROOT / '.cache/phase2-next-source-operations-v1/header-production'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--artifact-review', required=True)
args = parser.parse_args()
audit_path = (ROOT / args.artifact_review).resolve()
assert audit_path.is_relative_to(ROOT / '.cache')
audit = json.loads(audit_path.read_text())
assert audit['status'] == 'PASS' and audit['commit'] == COMMIT
ci_path = ROOT / '.cache/phase2-notebook-header-ci-v1/final.json'
ci = json.loads(ci_path.read_text())
assert ci['commit'] == ci['run']['head_sha'] == COMMIT
assert ci['all_four_jobs_successful'] is True
assert ci['run']['event'] == 'push' and ci['run']['run_attempt'] == 1
assert ci['run']['status'] == 'completed' and ci['run']['conclusion'] == 'success'
assert len(ci['jobs']) == 4 and {j['name'] for j in ci['jobs']} == {'lean', 'browser', 'python (3.11)', 'python (3.12)'}
assert all(j['status'] == 'completed' and j['conclusion'] == 'success' for j in ci['jobs'])
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / 'scripts'))
import runtime_manifest
import li_v3_compatible_zip_diagnostic as diagnostic

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def store(path, value):
    with path.open('x') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')

def state(expected=None):
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == COMMIT
    assert subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip() == 'research/lupine-discovery'
    assert not subprocess.check_output(['git', 'status', '--porcelain'])
    assert subprocess.check_output(['git', 'ls-remote', 'origin', 'refs/heads/research/lupine-discovery'], text=True).split()[0] == COMMIT
    current = runtime_manifest.source_files(ROOT)
    assert current == json.loads((ROOT / 'reports/runtime-manifest.json').read_text())['files']
    assert len(current) == 323 and (expected is None or current == expected)
    identity = diagnostic.production_context()
    assert identity['commit'] == COMMIT
    return current, identity

before, identity = state()
for index in (0, 1):
    package = json.loads((ROOT / f'.cache/phase2-notebook-header-clean-package-v1/{index}-execution.json').read_text())
    assert package['commit'] == COMMIT and package['exit_code'] == 0
    assert package['source_unchanged'] and package['head_unchanged'] and package['worktree_clean']
    assert package['runtime_before'] == package['runtime_after'] == before
prerequisite = ROOT / diagnostic.PREREQUISITE
assert diagnostic._validate_prerequisite(prerequisite.read_bytes()) == '7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07'
for run in (1, 2):
    assert not os.path.lexists(ROOT / f'.cache/li-v3-custody/compatible-zip-diagnostic-v1/{run}/public.json')
BASE.mkdir(mode=0o700, exist_ok=False)
store(BASE / 'preflight.json', {'commit': COMMIT, 'checked_at': now(), 'ci_run': ci['run']['id'],
    'ci_receipt_sha256': digest(ci_path.read_bytes()), 'artifact_review': str(audit_path.relative_to(ROOT)),
    'artifact_review_sha256': digest(audit_path.read_bytes()), 'runtime': before, 'implementation': identity})
outputs = []
for run in (1, 2):
    current, current_identity = state(before)
    assert current_identity == identity
    folder = BASE / str(run)
    folder.mkdir(mode=0o700)
    command = [sys.executable, 'scripts/li_v3_compatible_zip_diagnostic.py', 'diagnose', '--run', str(run)]
    start, tick = now(), time.monotonic()
    store(folder / 'start.json', {'command': command, 'commit': COMMIT, 'started_at': start,
          'ci_run': ci['run']['id'], 'exposure_until_complete_report': 'UNKNOWN'})
    timed_out = False
    with (folder / 'stdout.txt').open('xb') as stdout, (folder / 'stderr.txt').open('xb') as stderr:
        try:
            result = subprocess.run(command, stdout=stdout, stderr=stderr, timeout=100,
                                    env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1'))
        except subprocess.TimeoutExpired:
            timed_out = True
            result = subprocess.CompletedProcess(command, 124)
    raw = (folder / 'stdout.txt').read_bytes()
    errors = (folder / 'stderr.txt').read_bytes()
    after = runtime_manifest.source_files(ROOT)
    receipt = {'command': command, 'commit': COMMIT, 'ci_run': ci['run']['id'],
        'started_at': start, 'finished_at': now(), 'elapsed_seconds': time.monotonic() - tick,
        'exit_code': result.returncode, 'timed_out': timed_out,
        'runtime_before': before, 'runtime_after': after, 'source_unchanged': before == after,
        'head_unchanged': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == COMMIT,
        'worktree_clean': not bool(subprocess.check_output(['git', 'status', '--porcelain'])),
        'stdout_sha256': digest(raw), 'stderr_sha256': digest(errors)}
    store(folder / 'execution.json', receipt)
    assert receipt['source_unchanged'] and receipt['head_unchanged'] and receipt['worktree_clean']
    assert result.returncode == 2 and not timed_out and errors == b''
    report = json.loads(raw)
    assert raw == diagnostic.custody.canonical(report)
    assert raw == (ROOT / f'.cache/li-v3-custody/compatible-zip-diagnostic-v1/{run}/public.json').read_bytes()
    assert report['schema'] == diagnostic.SCHEMA and report['status'] == 'BLOCKED_SCHEMA'
    assert report['source_identity_verified'] is True and report['implementation'] == identity
    assert report['observed']['sha256'] == diagnostic.header_diagnostic.OBJECT_SHA256
    assert report['observed']['bytes'] == diagnostic.custody.SOURCE_BYTES
    assert report['observed']['md5'] == diagnostic.custody.SOURCE_MD5
    assert report['reason'] in diagnostic.CATEGORIES and set(report['categories']) <= diagnostic.CATEGORIES
    exposure = report['exposure']
    assert exposure['members_decompressed'] == []
    assert exposure['xml_decoded'] is False
    assert exposure['worksheet_cells_decoded'] is False and exposure['shared_strings_decoded'] is False
    assert exposure['archive_close_error'] is None and exposure['fits'] == exposure['splits'] == 0
    assert all(report[key] is None for key in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'))
    outputs.append(raw)
    print(json.dumps({'run': run, 'commit': COMMIT, 'exit_code': result.returncode,
          'reason': report['reason'], 'categories': report['categories'],
          'first_rejection_stage': report['first_rejection_stage'],
          'same_entry_local_checks': report['same_entry_local_checks'],
          'exposure': exposure, 'stdout_sha256': digest(raw)}), flush=True)
assert outputs[0] == outputs[1]
store(BASE / 'final.json', {'status': 'COMPLETE_TWO_IDENTICAL_DIAGNOSES', 'commit': COMMIT,
    'finished_at': now(), 'public_sha256': digest(outputs[0]), 'scientific_schema_approved': False})
