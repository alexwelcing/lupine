"""Root-only fixed categorical diagnoses after observed source verification.

Preparation is static review only. This recorder never reads the private object
or capture record; those remain inside the committed diagnostic command.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import importlib
import json
import os
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
COMMIT = 'a6e87c198d8116d26c523e0e1b2eedce4aeb225b'
BRANCH = 'research/lupine-discovery'
BASE = ROOT / '.cache/phase2-next-source-operations-v1/header-production'
CAP = 8 * 1024 * 1024
COMMAND_TIMEOUT = 100


class Stop(Exception):
    """Only fixed programmer-supplied codes are emitted publicly."""


def require(condition, code):
    if not condition:
        raise Stop(code)


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    with path.open('rb') as stream:
        raw = stream.read(CAP + 1)
    require(len(raw) <= CAP, 'READ_BOUND_REJECTED')
    return raw


def store(path, value):
    raw = (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + '\n').encode('utf-8')
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, timeout=30,
                                   stderr=subprocess.PIPE).decode('utf-8')


def state(runtime_manifest, diagnostic, expected=None):
    require(git('rev-parse', 'HEAD').strip() == COMMIT, 'HEAD_CHANGED')
    require(git('branch', '--show-current').strip() == BRANCH, 'BRANCH_CHANGED')
    require(not git('status', '--porcelain', '--untracked-files=all'), 'WORKTREE_NOT_CLEAN')
    require(git('ls-remote', '--exit-code', 'origin', 'refs/heads/' + BRANCH).split()
            == [COMMIT, 'refs/heads/' + BRANCH], 'REMOTE_CHANGED')
    current = runtime_manifest.source_files(ROOT)
    require(current == json.loads(read(ROOT / 'reports/runtime-manifest.json'))['files'],
            'RUNTIME_MANIFEST_MISMATCH')
    require(len(current) == 323 and (expected is None or current == expected), 'RUNTIME_CHANGED')
    identity = diagnostic.production_context()
    require(identity['commit'] == COMMIT, 'SOURCE_GUARD_COMMIT_MISMATCH')
    return current, identity


def validate_report(raw, diagnostic, identity):
    report = json.loads(raw)
    template = diagnostic._base(False)
    require(type(report) is dict and set(report) == set(template)
            and raw == diagnostic.custody.canonical(report), 'PUBLIC_REPORT_SHAPE_INVALID')
    require(report['schema'] == diagnostic.SCHEMA and report['profile'] == diagnostic.PROFILE
            and report['status'] == 'BLOCKED_SCHEMA' and report['synthetic_fixture'] is False
            and report['source_identity_verified'] is True
            and diagnostic.custody.canonical(report['implementation']) == diagnostic.custody.canonical(identity),
            'PUBLIC_REPORT_IDENTITY_INVALID')
    require(diagnostic.custody.canonical(report['capture_identity'])
            == diagnostic.custody.canonical(diagnostic.compatible._capture_identity())
            and report['prerequisite_receipt_sha256'] == diagnostic.PREREQUISITE_SHA256
            and report['prerequisite_producer_commit'] == diagnostic.PREREQUISITE_PRODUCER,
            'PUBLIC_PREREQUISITE_IDENTITY_INVALID')
    expected_observed = {'sha256': diagnostic.header_diagnostic.OBJECT_SHA256,
                         'bytes': diagnostic.custody.SOURCE_BYTES, 'md5': diagnostic.custody.SOURCE_MD5}
    require(type(report['observed']) is dict and type(report['observed'].get('bytes')) is int
            and report['observed'] == expected_observed, 'PUBLIC_OBJECT_IDENTITY_INVALID')
    for key in ('categories', 'primary_categories', 'supplementary_local_categories'):
        require(type(report[key]) is list and len(report[key]) <= 2 * len(diagnostic.CATEGORIES)
                and all(type(value) is str and value in diagnostic.CATEGORIES for value in report[key]),
                'CATEGORY_INVALID')
    require(report['primary_categories'] and report['reason'] == report['primary_categories'][0]
            and report['categories'] == report['primary_categories'] + report['supplementary_local_categories']
            and report['first_rejection_stage'] in diagnostic.STAGES
            and report['same_entry_local_checks'] in diagnostic.LOCAL_SCOPES
            and report['compatible_reason'] in {'ZIP_INVALID', 'ZIP_LAYOUT_UNSUPPORTED', 'ZIP_LIMIT', 'HEADER_PROFILE_ACCEPTED'},
            'CLASSIFICATION_INVALID')
    exposure = report['exposure']
    require(type(exposure) is dict and set(exposure) == set(template['exposure']), 'EXPOSURE_SHAPE_INVALID')
    for key in set(exposure) - {'members_decompressed', 'archive_close_error', 'fits', 'splits'}:
        require(type(exposure[key]) is bool, 'EXPOSURE_TYPE_INVALID')
    require(exposure['raw_buffer_read_started'] is True and exposure['raw_buffer_read_completed'] is True
            and exposure['target_bearing_source_bytes_read'] is True
            and exposure['header_checks_started'] is True, 'SOURCE_EXPOSURE_INCOMPLETE')
    require(exposure['members_decompressed'] == [] and exposure['archive_close_error'] is None
            and type(exposure['fits']) is int and exposure['fits'] == 0
            and type(exposure['splits']) is int and exposure['splits'] == 0, 'EXPOSURE_SCOPE_INVALID')
    for key in ('member_names_published', 'xml_decoded', 'worksheet_cells_decoded',
                'shared_strings_decoded', 'target_numeric_validity_checked',
                'scientific_eligibility_decisions', 'sampling_independence_established'):
        require(exposure[key] is False, 'UNAUTHORIZED_EXPOSURE_CLAIM')
    require(not exposure['directory_name_decoding_completed'] or exposure['directory_name_decoding_started'],
            'EXPOSURE_ORDER_INVALID')
    require(exposure['archive_close_started'] == exposure['archive_close_completed'], 'ARCHIVE_CLOSE_INCOMPLETE')
    require(exposure['header_checks_completed'] == (report['reason'] == 'HEADER_PROFILE_ACCEPTED'),
            'HEADER_COMPLETION_INVALID')
    require(all(report[key] is None for key in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'))
            and report['overlap_status'] == 'NOT_ASSESSED', 'SCIENTIFIC_SCOPE_INVALID')
    return report


def run_command(folder, run, runtime_manifest, diagnostic, before, identity, ci_run):
    folder.mkdir(mode=0o700)
    command = [sys.executable, 'scripts/li_v3_compatible_zip_diagnostic.py', 'diagnose', '--run', str(run)]
    start, tick = now(), time.monotonic()
    store(folder / 'start.json', {'command': command, 'commit': COMMIT, 'started_at': start,
          'ci_run': ci_run, 'runtime_before': before, 'implementation': identity,
          'exposure_until_complete_report': 'UNKNOWN'})
    stdout_path, stderr_path = folder / 'stdout.txt', folder / 'stderr.txt'
    timed_out, launch_failed, returncode, process = False, False, None, None
    env = dict(os.environ)
    env.pop('PYTHONPATH', None)
    env.pop('PYTHONHOME', None)
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    try:
        with stdout_path.open('xb') as stdout, stderr_path.open('xb') as stderr:
            process = subprocess.Popen(command, cwd=ROOT, stdout=stdout, stderr=stderr, env=env,
                                       start_new_session=(os.name == 'posix'))
            try:
                returncode = process.wait(timeout=COMMAND_TIMEOUT)
            except subprocess.TimeoutExpired:
                timed_out = True
                try:
                    if os.name == 'posix':
                        os.killpg(process.pid, signal.SIGKILL)
                    else:
                        process.kill()
                except ProcessLookupError:
                    pass
                returncode = process.wait(timeout=15)
    except BaseException:
        launch_failed = True
        if process is not None:
            try:
                if process.poll() is None:
                    if os.name == 'posix':
                        os.killpg(process.pid, signal.SIGKILL)
                    else:
                        process.kill()
                returncode = process.wait(timeout=15)
            except Exception:
                pass
    after_runtime, after_identity, hold_error = None, None, None
    try:
        after_runtime = runtime_manifest.source_files(ROOT)
    except BaseException:
        pass
    try:
        checked, after_identity = state(runtime_manifest, diagnostic, before)
        require(checked == after_runtime, 'POST_SNAPSHOT_CHANGED')
        require(after_identity == identity, 'SOURCE_GUARD_IDENTITY_CHANGED')
    except Stop as error:
        hold_error, after_identity = str(error), None
    except BaseException:
        hold_error, after_identity = 'STATE_RECHECK_FAILED', None
    raw, report, output_error = None, None, None
    try:
        require(not timed_out and not launch_failed and returncode == 2, 'COMMAND_DID_NOT_COMPLETE')
        raw = read(stdout_path)
        require(read(stderr_path) == b'', 'COMMAND_STDERR_NOT_EMPTY')
        report = validate_report(raw, diagnostic, identity)
        require(raw == read(ROOT / f'.cache/li-v3-custody/compatible-zip-diagnostic-v1/{run}/public.json'),
                'PUBLIC_RECEIPT_MISMATCH')
    except Stop as error:
        output_error, report = str(error), None
    except BaseException:
        output_error, report = 'PUBLIC_RESULT_NOT_VALIDATED', None
    hashes = {}
    for kind, path in (('stdout', stdout_path), ('stderr', stderr_path)):
        try:
            hashes[kind + '_sha256'] = digest(read(path))
        except BaseException:
            hashes[kind + '_sha256'] = None
    receipt = {'command': command, 'commit': COMMIT, 'ci_run': ci_run,
        'started_at': start, 'finished_at': now(), 'elapsed_seconds': time.monotonic() - tick,
        'exit_code': returncode, 'timed_out': timed_out, 'launch_failed': launch_failed,
        'runtime_before': before, 'runtime_after': after_runtime,
        'source_unchanged': (before == after_runtime) if after_runtime is not None else None,
        'head_unchanged': True if after_identity is not None else None,
        'worktree_clean': True if after_identity is not None else None,
        'remote_unchanged': True if after_identity is not None else None,
        'source_guard_unchanged': True if after_identity is not None else None,
        'state_recheck_error': hold_error, 'public_report_complete_and_valid': report is not None,
        'public_validation_error': output_error,
        'reason': report['reason'] if report is not None else None,
        'exposure': report['exposure'] if report is not None else None, **hashes}
    store(folder / 'execution.json', receipt)
    summary = {key: receipt[key] for key in ('commit', 'ci_run', 'started_at', 'finished_at',
        'exit_code', 'timed_out', 'launch_failed', 'source_unchanged', 'remote_unchanged',
        'state_recheck_error', 'public_report_complete_and_valid', 'public_validation_error',
        'reason', 'exposure', 'stdout_sha256', 'stderr_sha256')}
    summary['run'] = run
    if report is not None:
        summary.update(categories=report['categories'], first_rejection_stage=report['first_rejection_stage'],
                       same_entry_local_checks=report['same_entry_local_checks'])
    print(json.dumps(summary, sort_keys=True), flush=True)
    require(after_identity is not None and report is not None, 'STOP_PRESERVE_COMMAND_RESULT')
    return raw


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise Stop('ARGUMENT_INVALID')


def main(argv=None):
    created = False
    try:
        parser = Parser(description=__doc__)
        parser.add_argument('--artifact-review', required=True)
        args = parser.parse_args(argv)
        audit_path = (ROOT / args.artifact_review).resolve()
        require(audit_path.is_relative_to(ROOT / '.cache')
                and not audit_path.is_relative_to(ROOT / '.cache/li-v3-custody'), 'AUDIT_PATH_INVALID')
        audit = json.loads(read(audit_path))
        require(audit['status'] == 'PASS' and audit['commit'] == COMMIT, 'ARTIFACT_AUDIT_INVALID')
        ci_path = ROOT / '.cache/phase2-notebook-header-ci-v1/final.json'
        ci = json.loads(read(ci_path))
        require(ci['commit'] == ci['run']['head_sha'] == COMMIT and ci['all_four_jobs_successful'] is True,
                'CI_COMMIT_INVALID')
        require(ci['run']['event'] == 'push' and type(ci['run']['run_attempt']) is int
                and ci['run']['run_attempt'] == 1 and ci['run']['status'] == 'completed'
                and ci['run']['conclusion'] == 'success', 'CI_NOT_ORIGINAL_SUCCESS')
        require(len(ci['jobs']) == 4 and {j['name'] for j in ci['jobs']}
                == {'lean', 'browser', 'python (3.11)', 'python (3.12)'}
                and all(j['status'] == 'completed' and j['conclusion'] == 'success' for j in ci['jobs']),
                'CI_JOB_SET_INVALID')
        sys.dont_write_bytecode = True
        sys.path.insert(0, str(ROOT / 'scripts'))
        runtime_manifest = importlib.import_module('runtime_manifest')
        diagnostic = importlib.import_module('li_v3_compatible_zip_diagnostic')
        before, identity = state(runtime_manifest, diagnostic)
        gate_paths = [audit_path, ci_path]
        for index in (0, 1):
            path = ROOT / f'.cache/phase2-notebook-header-clean-package-v1/{index}-execution.json'
            package = json.loads(read(path))
            require(package['commit'] == COMMIT and type(package['exit_code']) is int
                    and package['exit_code'] == 0 and package['source_unchanged'] is True
                    and package['head_unchanged'] is True and package['worktree_clean'] is True
                    and package['runtime_before'] == package['runtime_after'] == before, 'PACKAGE_GATE_INVALID')
            gate_paths.append(path)
        prerequisite = ROOT / diagnostic.PREREQUISITE
        require(diagnostic._validate_prerequisite(read(prerequisite))
                == '7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07',
                'PREREQUISITE_INVALID')
        gate_paths.append(prerequisite)
        gate_hashes = {str(path.relative_to(ROOT)): digest(read(path)) for path in gate_paths}
        script_hash = digest(read(Path(__file__)))
        for run in (1, 2):
            require(not os.path.lexists(ROOT / f'.cache/li-v3-custody/compatible-zip-diagnostic-v1/{run}/public.json'),
                    'PRIOR_HEADER_SLOT_EXISTS')
        BASE.mkdir(mode=0o700, exist_ok=False)
        created = True
        store(BASE / 'preflight.json', {'commit': COMMIT, 'checked_at': now(), 'ci_run': ci['run']['id'],
            'gate_receipt_hashes': gate_hashes, 'recorder_sha256': script_hash,
            'runtime': before, 'implementation': identity})
        outputs = []
        for run in (1, 2):
            require(digest(read(Path(__file__))) == script_hash, 'RECORDER_SOURCE_CHANGED')
            for relative, expected in gate_hashes.items():
                require(digest(read(ROOT / relative)) == expected, 'GATE_RECEIPT_CHANGED')
            current, current_identity = state(runtime_manifest, diagnostic, before)
            require(current_identity == identity, 'SOURCE_GUARD_IDENTITY_CHANGED')
            outputs.append(run_command(BASE / str(run), run, runtime_manifest, diagnostic,
                                       current, current_identity, ci['run']['id']))
        require(outputs[0] == outputs[1], 'HEADER_REPLAY_MISMATCH')
        final = {'status': 'COMPLETE_TWO_IDENTICAL_DIAGNOSES', 'commit': COMMIT,
            'finished_at': now(), 'public_sha256': digest(outputs[0]), 'scientific_schema_approved': False,
            'scope': 'Fixed-source categorical computational replay only; scientific gates remain blocked.'}
        store(BASE / 'final.json', final)
        print(json.dumps(final, sort_keys=True), flush=True)
        return 0
    except Stop as error:
        reason = str(error)
    except BaseException:
        reason = 'RECORDER_INTERNAL_FAILURE'
    final = {'status': 'STOP_PRESERVE_EVIDENCE', 'reason': reason, 'commit': COMMIT,
             'finished_at': now(), 'no_automatic_retry': True, 'scientific_schema_approved': False}
    if created:
        try:
            store(BASE / 'stopped.json', final)
        except Exception:
            pass
    print(json.dumps(final, sort_keys=True), flush=True)
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
