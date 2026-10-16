"""Root-only local-growth envelope operations after observed source verification.

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
COMMIT = 'c17c4c6b152af2e7bc1b7a7639336f6b0f733ace'
BRANCH = 'research/lupine-discovery'
BASE = ROOT / '.cache/phase2-growth-envelope-operations-v1/production'
CAP = 8 * 1024 * 1024
COMMAND_TIMEOUT = 100
SHAPE_REPORT = None


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
    require(len(current) == 332 and (expected is None or current == expected), 'RUNTIME_CHANGED')
    identity = diagnostic.production_context()
    require(identity['commit'] == COMMIT, 'SOURCE_GUARD_COMMIT_MISMATCH')
    return current, identity


def validate_shape_report(raw, diagnostic, identity):
    report = json.loads(raw)
    template = diagnostic._result(diagnostic.predecessor._base(False))
    require(type(report) is dict and set(report) == set(template)
            and raw == diagnostic.custody.canonical(report), 'PUBLIC_REPORT_SHAPE_INVALID')
    require(report['schema'] == diagnostic.PRODUCTION_SCHEMA
            and report['profile'] == diagnostic.PRODUCTION_PROFILE
            and report['status'] == 'BLOCKED_SCHEMA'
            and report['synthetic_fixture'] is False
            and report['source_identity_verified'] is True
            and diagnostic.custody.canonical(report['implementation'])
                == diagnostic.custody.canonical(identity), 'PUBLIC_REPORT_IDENTITY_INVALID')
    require(report['capture_identity'] == diagnostic.predecessor.compatible._capture_identity()
            and report['prerequisite_receipt_sha256'] == diagnostic.PREREQUISITE_SHA256
            and report['prerequisite_producer_commit'] == diagnostic.PREREQUISITE_PRODUCER
            and report['production_prerequisite_status'] == 'VERIFIED',
            'PUBLIC_PREREQUISITE_IDENTITY_INVALID')
    observed = {'sha256': diagnostic.predecessor.header_diagnostic.OBJECT_SHA256,
                'bytes': diagnostic.custody.SOURCE_BYTES, 'md5': diagnostic.custody.SOURCE_MD5}
    require(type(report['observed']) is dict and type(report['observed'].get('bytes')) is int
            and report['observed'] == observed, 'PUBLIC_OBJECT_IDENTITY_INVALID')
    require(report['predecessor_classification'] == diagnostic.predecessor.EXPECTED_CLASSIFICATION
            and report['predecessor_reason'] == 'LOCAL_EXTRA_HEADERS_COMPLETE',
            'PREDECESSOR_CLASSIFICATION_CHANGED')
    reason = report['reason']
    require(reason in {'GROWTH_HINT_SHAPE_MATCH', 'GROWTH_SIGNATURE_MISMATCH',
                       'GROWTH_PADDING_NONZERO'}, 'DIAGNOSIS_REASON_INVALID')
    require(report['exactly_one_a220_record'] is True
            and report['payload_length_at_least_four'] is True
            and report['initial_padding_semantics'] == 'UNBOUND'
            and report['archive_acceptance_established'] is False
            and report['scientific_evaluation_status'] == 'BLOCKED', 'SHAPE_SCOPE_INVALID')
    signature_matches = reason != 'GROWTH_SIGNATURE_MISMATCH'
    padding = (reason == 'GROWTH_HINT_SHAPE_MATCH') if signature_matches else None
    require(report['signature_matches'] is signature_matches
            and report['padding_all_zero'] is padding
            and report['growth_hint_shape'] == (
                'MATCHES_RETAINED_APPNOTE_SHAPE' if reason == 'GROWTH_HINT_SHAPE_MATCH'
                else 'DOES_NOT_MATCH'), 'SHAPE_CLASSIFICATION_INVALID')
    exposure = report['exposure']
    require(type(exposure) is dict and set(exposure) == set(template['exposure']),
            'EXPOSURE_SHAPE_INVALID')
    for key in set(exposure) - {'members_decompressed', 'archive_close_error', 'fits', 'splits'}:
        require(type(exposure[key]) is bool, 'EXPOSURE_TYPE_INVALID')
    require(exposure['members_decompressed'] == [] and exposure['archive_close_error'] is None
            and type(exposure['fits']) is int and exposure['fits'] == 0
            and type(exposure['splits']) is int and exposure['splits'] == 0,
            'EXPOSURE_SCOPE_INVALID')
    for key in ('member_names_published', 'xml_decoded', 'worksheet_cells_decoded',
                'shared_strings_decoded', 'target_numeric_validity_checked',
                'scientific_eligibility_decisions', 'sampling_independence_established',
                'header_checks_completed'):
        require(exposure[key] is False, 'UNAUTHORIZED_EXPOSURE_CLAIM')
    for key in ('raw_buffer_read_started', 'raw_buffer_read_completed',
                'target_bearing_source_bytes_read', 'header_checks_started',
                'directory_name_decoding_started', 'directory_name_decoding_completed',
                'archive_close_started', 'archive_close_completed',
                'local_header_locator_started', 'local_header_locator_completed',
                'local_extra_header_walk_started', 'local_extra_header_walk_completed',
                'local_extra_payload_interpreted', 'growth_hint_locator_started',
                'growth_hint_locator_completed', 'growth_hint_payload_interpretation_started',
                'growth_hint_fixed_words_interpreted'):
        require(exposure[key] is True, 'SOURCE_EXPOSURE_INCOMPLETE')
    for key in ('growth_hint_padding_scan_started', 'growth_hint_padding_scan_completed',
                'growth_hint_payload_interpretation_completed'):
        require(exposure[key] is signature_matches, 'PAYLOAD_EXPOSURE_INCONSISTENT')
    require(all(report[key] is None for key in ('row_count', 'paired_count',
                                              'source_group_count', 'overlap_count'))
            and report['overlap_status'] == 'NOT_ASSESSED', 'SCIENTIFIC_SCOPE_INVALID')
    return report

def validate_report(raw, diagnostic, identity):
    report = json.loads(raw)
    template = diagnostic._new_report(None, False, None)
    require(type(report) is dict and set(report) == set(template)
            and raw == diagnostic.custody.canonical(report), 'PUBLIC_REPORT_SHAPE_INVALID')
    require(report['schema'] == diagnostic.SCHEMA and report['action'] == 'growth_envelope'
            and report['parser_profile'] == diagnostic.PROFILE
            and report['status'] == 'BLOCKED_SCHEMA' and report['synthetic_fixture'] is False
            and report['source_identity_verified'] is True
            and diagnostic.custody.canonical(report['implementation'])
                == diagnostic.custody.canonical(identity), 'PUBLIC_REPORT_IDENTITY_INVALID')
    require(diagnostic.custody.canonical(report['source'])
                == diagnostic.custody.canonical(diagnostic.custody.EXPECTED_INVENTORY)
            and report['inventory_sha256'] == diagnostic.custody.INVENTORY_SHA256
            and report['capture_receipt_sha256'] == diagnostic.header_diagnostic.CAPTURE_SHA256
            and report['prerequisite_receipt_sha256'] == diagnostic.PREREQUISITE_SHA256
            and report['prerequisite_producer_commit'] == diagnostic.PREREQUISITE_PRODUCER,
            'PUBLIC_PREREQUISITE_IDENTITY_INVALID')
    observed = {'sha256': diagnostic.header_diagnostic.OBJECT_SHA256,
                'bytes': diagnostic.custody.SOURCE_BYTES, 'md5': diagnostic.custody.SOURCE_MD5}
    require(type(report['observed']) is dict and type(report['observed'].get('bytes')) is int
            and report['observed'] == observed, 'PUBLIC_OBJECT_IDENTITY_INVALID')
    require(report['initial_padding_semantics'] == 'UNBOUND'
            and report['validation_reason_before_cleanup'] is None
            and all(report[k] is None for k in ('row_count', 'paired_count',
                                               'source_group_count', 'overlap_count'))
            and report['overlap_status'] == 'NOT_ASSESSED', 'SCIENTIFIC_SCOPE_INVALID')
    expected_shape = {key: SHAPE_REPORT[key] for key in diagnostic.SHAPE_KEYS}
    require(diagnostic.custody.canonical(report['selected_growth_check'])
                == diagnostic.custody.canonical(expected_shape), 'SELECTED_SHAPE_CHANGED')
    exposure = report['exposure']
    require(type(exposure) is dict and set(exposure) == set(template['exposure']),
            'EXPOSURE_SHAPE_INVALID')
    expected_nested = dict(SHAPE_REPORT['exposure'])
    # The G31 contract distinguishes passing the already-read immutable buffer
    # from another file acquisition. Only these three nested flags differ.
    for key in ('raw_buffer_read_started', 'raw_buffer_read_completed',
                'target_bearing_source_bytes_read'):
        expected_nested[key] = False
    require(diagnostic.custody.canonical(exposure['selected_growth'])
                == diagnostic.custody.canonical(expected_nested), 'SELECTED_EXPOSURE_CHANGED')
    special = {'decompression_started', 'decompression_completed', 'xml_decoding_started',
               'xml_decoding_completed', 'inspected_xml_bytes', 'fits', 'splits',
               'selected_growth', 'archive_close_error', 'local_extra_areas_started',
               'local_extra_areas_completed', 'local_growth_fixed_words_interpreted',
               'local_growth_padding_scans_started', 'local_growth_padding_scans_completed'}
    for key in set(exposure) - special:
        require(type(exposure[key]) is bool, 'EXPOSURE_TYPE_INVALID')
    for key in ('raw_workbook_buffer_read', 'target_bearing_source_bytes_acquired',
                'raw_buffer_read_started', 'raw_buffer_read_completed',
                'target_bearing_source_bytes_read', 'header_checks_started',
                'central_directory_preflight_started'):
        require(exposure[key] is True, 'SOURCE_EXPOSURE_INCOMPLETE')
    require(exposure['archive_close_error'] is None, 'ARCHIVE_CLEANUP_FAILED')
    for key in ('worksheet_cells_decoded', 'shared_strings_decoded', 'formulas_executed',
                'target_numeric_validity_checked', 'scientific_eligibility_decisions',
                'sampling_independence_established'):
        require(exposure[key] is False, 'UNAUTHORIZED_EXPOSURE_CLAIM')
    for key in ('fits', 'splits'):
        require(type(exposure[key]) is int and exposure[key] == 0, 'SCIENTIFIC_SCOPE_INVALID')
    counts = ('local_extra_areas_started', 'local_extra_areas_completed',
              'local_growth_fixed_words_interpreted', 'local_growth_padding_scans_started',
              'local_growth_padding_scans_completed')
    require(all(type(exposure[k]) is int and 0 <= exposure[k] <= diagnostic.MAX_MEMBERS
                for k in counts), 'LOCAL_EXPOSURE_COUNT_INVALID')
    started, completed, words, scans, scanned = (exposure[k] for k in counts)
    require(0 <= completed <= scanned <= scans <= words <= started,
            'LOCAL_EXPOSURE_ORDER_INVALID')
    members = list(diagnostic.ENVELOPE_MEMBERS)
    lists = [exposure[k] for k in ('decompression_started', 'decompression_completed',
                                   'xml_decoding_started', 'xml_decoding_completed')]
    require(all(type(v) is list and v == members[:len(v)] for v in lists)
            and len(lists[3]) <= len(lists[2]) <= len(lists[1]) <= len(lists[0]) <= 4,
            'XML_EXPOSURE_ORDER_INVALID')
    require(type(exposure['inspected_xml_bytes']) is int
            and 0 <= exposure['inspected_xml_bytes'] <= diagnostic.custody.MAX_TOTAL_XML_BYTES,
            'XML_EXPOSURE_COUNT_INVALID')
    reason = report['reason']
    allowed = {'SCHEMA_UNCONFIRMED', 'ZIP_INVALID', 'ZIP_LAYOUT_UNSUPPORTED', 'ZIP_LIMIT',
               'LOCAL_GROWTH_SHAPE_UNSUPPORTED', 'CENTRAL_DIRECTORY_DECLARATION_INVALID',
               'XML_INVALID', 'XML_LIMIT',
               'XML_PROFILE_UNSUPPORTED', 'CONTENT_TYPES_UNSUPPORTED',
               'RELATIONSHIP_UNSUPPORTED', 'WORKBOOK_UNSUPPORTED'}
    require(reason in allowed, 'ENVELOPE_REASON_INVALID')
    central_block = reason == 'CENTRAL_DIRECTORY_DECLARATION_INVALID'
    require(exposure['central_directory_preflight_completed'] is (not central_block),
            'CENTRAL_PREFLIGHT_EXPOSURE_INVALID')
    for key in ('archive_open_started', 'archive_open_completed',
                'directory_name_decoding_started', 'directory_name_decoding_completed',
                'archive_close_started', 'archive_close_completed'):
        require(exposure[key] is (not central_block), 'ARCHIVE_LIFECYCLE_INCONSISTENT')
    if central_block:
        require(all(exposure[k] == 0 for k in counts)
                and exposure['local_growth_payload_interpretation_started'] is False
                and exposure['header_checks_completed'] is False,
                'CENTRAL_BLOCK_EXPOSURE_INVALID')
    accepted = reason == 'SCHEMA_UNCONFIRMED'
    require(type(report['archive_profile_accepted']) is bool
            and report['archive_profile_accepted'] is accepted
            and report['engineering_status'] == ('ENVELOPE_VALID' if accepted else 'BLOCKED_LAYOUT')
            and exposure['envelope_checks_completed'] is accepted, 'ENVELOPE_STATUS_INVALID')
    if exposure['header_checks_completed']:
        require(type(report['member_count']) is int and 1 <= report['member_count'] <= diagnostic.MAX_MEMBERS
                and 1 <= started == completed == words == scans == scanned
                and exposure['local_growth_payload_interpretation_started'] is True
                and exposure['local_growth_payload_interpretation_completed'] is True,
                'COMPLETE_HEADER_EXPOSURE_INVALID')
    else:
        require(report['member_count'] is None and all(v == [] for v in lists)
                and exposure['inspected_xml_bytes'] == 0
                and exposure['local_growth_payload_interpretation_completed'] is False,
                'INCOMPLETE_HEADER_EXPOSURE_INVALID')
    if accepted:
        require(exposure['header_checks_completed'] is True and all(v == members for v in lists)
                and type(report['sheet_count']) is int and 1 <= report['sheet_count'] <= diagnostic.custody.MAX_SHEETS
                and report['sheet_relationship_status'] == 'ALL_INTERNAL_AND_MAPPED',
                'ENVELOPE_COMPLETION_INVALID')
        roles = report['recognized_roles']
        require(type(roles) is dict and set(roles) == {'References', 'Column Descriptions'},
                'ROLE_PROJECTION_INVALID')
        ordinals = []
        for value in roles.values():
            require(type(value) is dict and set(value) == {'present', 'ordinal'}
                    and type(value['present']) is bool, 'ROLE_PROJECTION_INVALID')
            if value['present']:
                require(type(value['ordinal']) is int and 1 <= value['ordinal'] <= report['sheet_count'],
                        'ROLE_ORDINAL_INVALID')
                ordinals.append(value['ordinal'])
            else:
                require(value['ordinal'] is None, 'ROLE_ORDINAL_INVALID')
        require(len(set(ordinals)) == len(ordinals), 'ROLE_ORDINAL_INVALID')
    else:
        require(report['sheet_count'] is None and report['recognized_roles'] is None
                and report['sheet_relationship_status'] is None, 'PARTIAL_ROLE_DISCLOSURE')
    return report

def run_command(folder, run, runtime_manifest, diagnostic, before, identity, ci_run,
                script_hash, gate_hashes):
    folder.mkdir(mode=0o700)
    command = [sys.executable, 'scripts/li_v3_growth_envelope.py', 'envelope', '--run', str(run)]
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
        require(digest(read(Path(__file__))) == script_hash, 'RECORDER_SOURCE_CHANGED')
        for relative, expected in gate_hashes.items():
            require(digest(read(ROOT / relative)) == expected, 'GATE_RECEIPT_CHANGED')
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
        require(raw == read(ROOT / f'.cache/li-v3-custody/growth-envelope-v1/{run}/public.json'),
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
        'state_recheck_error': hold_error, 'public_report_canonical_and_closed': report is not None,
        'public_validation_error': output_error,
        'reason': report['reason'] if report is not None else None,
        'exposure': report['exposure'] if report is not None else None, **hashes}
    store(folder / 'execution.json', receipt)
    summary = {key: receipt[key] for key in ('commit', 'ci_run', 'started_at', 'finished_at',
        'exit_code', 'timed_out', 'launch_failed', 'source_unchanged', 'remote_unchanged',
        'state_recheck_error', 'public_report_canonical_and_closed', 'public_validation_error',
        'reason', 'exposure', 'stdout_sha256', 'stderr_sha256')}
    summary['run'] = run
    if report is not None:
        summary.update(archive_profile_accepted=report['archive_profile_accepted'],
                       engineering_status=report['engineering_status'])
    print(json.dumps(summary, sort_keys=True), flush=True)
    require(after_identity is not None and report is not None, 'STOP_PRESERVE_COMMAND_RESULT')
    return raw


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise Stop('ARGUMENT_INVALID')


def main(argv=None):
    global SHAPE_REPORT
    created = False
    try:
        parser = Parser(description=__doc__)
        parser.add_argument('--artifact-review', required=True)
        parser.add_argument('--additive-review', required=True)
        args = parser.parse_args(argv)
        require(COMMIT != 'UNBOUND_COMMIT', 'SOURCE_COMMIT_UNBOUND')
        audit_path = (ROOT / args.artifact_review).resolve()
        require(audit_path.is_relative_to(ROOT / '.cache')
                and not audit_path.is_relative_to(ROOT / '.cache/li-v3-custody'), 'AUDIT_PATH_INVALID')
        audit = json.loads(read(audit_path))
        require(audit['status'] == 'PASS' and audit['commit'] == COMMIT, 'ARTIFACT_AUDIT_INVALID')
        additive_path = (ROOT / args.additive_review).resolve()
        require(additive_path.is_relative_to(ROOT / '.cache')
                and not additive_path.is_relative_to(ROOT / '.cache/li-v3-custody'), 'AUDIT_PATH_INVALID')
        additive = json.loads(read(additive_path))
        require(additive['status'] == 'PASS' and additive['commit'] == COMMIT, 'ADDITIVE_AUDIT_INVALID')
        ci_path = ROOT / '.cache/phase2-growth-ci-v1/final.json'
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
        diagnostic = importlib.import_module('li_v3_growth_envelope')
        before, identity = state(runtime_manifest, diagnostic)
        gate_paths = [audit_path, additive_path, ci_path]
        for index in (0, 1):
            path = ROOT / f'.cache/phase2-growth-clean-package-v1/{index}-execution.json'
            package = json.loads(read(path))
            require(package['commit'] == COMMIT and type(package['exit_code']) is int
                    and package['exit_code'] == 0 and package['source_unchanged'] is True
                    and package['head_unchanged'] is True and package['worktree_clean'] is True
                    and package['runtime_before'] == package['runtime_after'] == before, 'PACKAGE_GATE_INVALID')
            gate_paths.append(path)
        shape_paths = [ROOT / '.cache/phase2-growth-shape-operations-v1/production/final.json',
                       ROOT / '.cache/li-v3-custody/growth-hint-shape-v1/1/public.json',
                       ROOT / '.cache/li-v3-custody/growth-hint-shape-v1/2/public.json']
        shape_final = json.loads(read(shape_paths[0]))
        shape_raw = read(shape_paths[1])
        require(shape_raw == read(shape_paths[2]), 'PRIOR_SHAPE_REPLAY_MISMATCH')
        require(shape_final['status'] == 'COMPLETE_TWO_IDENTICAL_DIAGNOSES'
                and shape_final['commit'] == COMMIT
                and shape_final['public_sha256'] == digest(shape_raw)
                and shape_final['reason'] == 'GROWTH_HINT_SHAPE_MATCH'
                and shape_final['growth_hint_shape'] == 'MATCHES_RETAINED_APPNOTE_SHAPE'
                and shape_final['scientific_schema_approved'] is False, 'PRIOR_SHAPE_GATE_INVALID')
        shape_identity = diagnostic.growth.production_context()
        require(shape_identity['commit'] == COMMIT, 'PRIOR_SHAPE_IDENTITY_CHANGED')
        SHAPE_REPORT = validate_shape_report(shape_raw, diagnostic.growth, shape_identity)
        require(shape_raw == diagnostic.custody.canonical(SHAPE_REPORT)
                and SHAPE_REPORT['implementation']['commit'] == COMMIT
                and SHAPE_REPORT['reason'] == 'GROWTH_HINT_SHAPE_MATCH'
                and SHAPE_REPORT['source_identity_verified'] is True
                and SHAPE_REPORT['synthetic_fixture'] is False
                and SHAPE_REPORT['status'] == 'BLOCKED_SCHEMA', 'PRIOR_SHAPE_REPORT_INVALID')
        gate_paths.extend(shape_paths)
        prerequisite = ROOT / diagnostic.PREREQUISITE
        require(diagnostic._validate_prerequisite(read(prerequisite))
                == '52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e',
                'PREREQUISITE_INVALID')
        gate_paths.append(prerequisite)
        gate_hashes = {str(path.relative_to(ROOT)): digest(read(path)) for path in gate_paths}
        script_hash = digest(read(Path(__file__)))
        for run in (1, 2):
            require(not os.path.lexists(ROOT / f'.cache/li-v3-custody/growth-envelope-v1/{run}/public.json'),
                    'PRIOR_GROWTH_ENVELOPE_SLOT_EXISTS')
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
                                       current, current_identity, ci['run']['id'], script_hash, gate_hashes))
        require(outputs[0] == outputs[1], 'GROWTH_ENVELOPE_REPLAY_MISMATCH')
        final = {'status': 'COMPLETE_TWO_IDENTICAL_ENVELOPES', 'commit': COMMIT,
            'finished_at': now(), 'public_sha256': digest(outputs[0]), 'scientific_schema_approved': False,
            'reason': json.loads(outputs[0])['reason'], 'archive_profile_accepted': json.loads(outputs[0])['archive_profile_accepted'],
            'scope': 'Fixed-source local-growth envelope computational replay only; no worksheet or shared-string decoding, scientific schema and independence remain unestablished.'}
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
