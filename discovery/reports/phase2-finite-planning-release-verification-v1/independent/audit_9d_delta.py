"""Supplement the unchanged retained-artifact audit with the requested 9d baseline."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
OLD = '9d1f21dae141a28db378ee2e16aa83340df57877'
NEW = '88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d'
SHA = '6bfd99aa4b3fdf254038570fc9e40cbb574a1fbbe587c943cdf909359c456a5f'
checks = []


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT.parent)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def require(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)


slot = BASE / 'first-9d-delta-audit'
slot.mkdir(exist_ok=False)
observed = {}
try:
    raw = {c: git('show', c + ':discovery/reports/runtime-manifest.json') for c in (OLD, NEW)}
    manifests = {c: json.loads(v) for c, v in raw.items()}
    require('both_exact_manifest_identities', all(digest(v) == SHA for v in raw.values()))
    require('all_345_runtime_hashes_identical', len(manifests[OLD]['files']) == 345
            and manifests[OLD]['files'] == manifests[NEW]['files'])
    entries = {}
    for commit in (OLD, NEW):
        entries[commit] = {}
        tree = git('ls-tree', '-r', '-z', commit, '--', 'discovery')
        for item in tree.split(b'\0'):
            if not item:
                continue
            metadata, name = item.split(b'\t', 1)
            name = name.decode('utf-8')
            relative = name.removeprefix('discovery/')
            if relative in manifests[commit]['files']:
                entries[commit][relative] = metadata.decode('ascii')
    require('all_345_exact_git_entries_present', len(entries[OLD]) == len(entries[NEW]) == 345)
    require('all_345_git_blob_identities_and_modes_unchanged', entries[OLD] == entries[NEW])
    report_raw = (BASE / 'first-actual-artifact-audit/review.json').read_bytes()
    report = json.loads(report_raw)
    require('first_artifact_audit_passed_for_exact_new_commit', report['published_commit_requested'] == NEW
            and report['status'] == 'PASS_EXACT_RETAINED_ARTIFACT_AND_DECLARED_DELTA'
            and all(check['passed'] is True for check in report['checks']))
    require('current_archive_runtime_independently_bound_to_identical_manifest',
            report['observed']['runtime_files'] == 345
            and report['observed']['source_manifest_sha256'] == SHA)
    require('head_and_source_still_clean', git('rev-parse', 'HEAD').decode().strip() == NEW
            and git('status', '--porcelain=v1', '--untracked-files=all') == b'')
    observed = {'old_commit': OLD, 'new_commit': NEW, 'unchanged_runtime_files': 345,
        'changed_runtime_files': [], 'added_runtime_files': [], 'removed_runtime_files': [],
        'manifest_sha256': SHA, 'artifact_review_sha256': digest(report_raw),
        'source_head_exact': True, 'source_clean': True}
except Exception as exc:
    checks.append({'check': 'delta_audit_stopped', 'passed': False,
                   'exception_type': type(exc).__name__, 'message': str(exc)})
result = {'schema': 'lupine.finite-planning.independent-9d-runtime-delta.v1',
    'status': 'PASS_345_RUNTIME_FILES_UNCHANGED' if all(c['passed'] for c in checks) else 'FAIL_RUNTIME_DELTA',
    'completed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'source_sha256': digest(Path(__file__).read_bytes()), 'checks': checks, 'observed': observed,
    'scope': 'Read-only exact-commit Git manifests/tree identities, linked to the first completed archive byte audit. No artifact execution or rerun, scientific input, network or tracked edit.'}
(slot / 'review.json').write_text(json.dumps(result, indent=2, sort_keys=True) + '\n')
print(json.dumps(result, indent=2))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
