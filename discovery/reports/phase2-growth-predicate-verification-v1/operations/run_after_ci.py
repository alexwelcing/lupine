"""Two fixed G34 header diagnoses after exact publication/artifact/CI gates.

Preparation does not import the project or call a guard. Root must bind every
field of bindings.json and explicitly invoke this recorder. No raw object or
capture receipt is opened by the recorder; only the committed command may do so.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import importlib
import json
import os
import re
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BINDINGS = HERE / 'bindings.json'
BASE = HERE / 'production'
BRANCH = 'research/lupine-discovery'
SOURCE = 'scripts/li_v3_growth_predicate_audit.py'
OWN_FILES = (SOURCE, 'tests/test_li_v3_growth_predicate_audit.py',
             'tests/test_li_v3_growth_predicate_audit_review.py',
             'docs/li-v3-growth-predicate-audit-plan.md')
PREREQUISITE = '.cache/li-v3-custody/growth-envelope-v1/1/public.json'
PREREQUISITE_SHA = '01cce9e57b26e204a9d31959f747768c70abf7543bedb6ab104b3b4b623f094f'
PREREQUISITE_COMMIT = 'c17c4c6b152af2e7bc1b7a7639336f6b0f733ace'
TARGET = '.cache/li-v3-custody/growth-predicate-audit-v1'
CAP = 8 * 1024 * 1024
TIMEOUT = 100
GATE_NAMES = {'ci', 'package', 'strict', 'artifact_review', 'additive_review'}

class Stop(Exception):
    """Only fixed programmer-supplied codes are emitted."""

def require(condition, code):
    if not condition:
        raise Stop(code)

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def safe(path):
    path = Path(path).absolute()
    require(path.is_relative_to(ROOT) and path.resolve() == path
            and not any(p.is_symlink() for p in (path, *path.parents)), 'PATH_REJECTED')
    return path

def read(path, cap=CAP):
    with safe(path).open('rb') as stream:
        raw = stream.read(cap + 1)
    require(len(raw) <= cap, 'READ_BOUND_REJECTED')
    return raw

def store(path, value):
    raw = (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + '\n').encode()
    fd = os.open(safe(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)

def save_raw(path, raw):
    fd = os.open(safe(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, timeout=30,
                                   stderr=subprocess.PIPE).decode('utf-8')

def is_hash(value, length=64):
    return type(value) is str and re.fullmatch('[0-9a-f]{' + str(length) + '}', value) is not None

def load_bindings(expected_sha):
    raw = read(BINDINGS)
    require(is_hash(expected_sha) and sha(raw) == expected_sha, 'BINDING_IDENTITY_INVALID')
    binding = json.loads(raw)
    require(type(binding) is dict and set(binding) == {'schema', 'commit', 'branch',
        'runtime_count', 'runtime_manifest_sha256', 'recorder_sha256', 'source_files', 'gates'},
        'BINDING_SHAPE_INVALID')
    require(binding['schema'] == 'lupine.discovery.g34.operation-binding.v1'
        and is_hash(binding['commit'], 40) and binding['branch'] == BRANCH
        and type(binding['runtime_count']) is int and binding['runtime_count'] == 335
        and is_hash(binding['runtime_manifest_sha256']) and is_hash(binding['recorder_sha256']),
        'BINDING_UNBOUND_OR_INVALID')
    require(type(binding['source_files']) is dict and set(binding['source_files']) == set(OWN_FILES)
        and all(is_hash(v) for v in binding['source_files'].values()), 'SOURCE_PINS_UNBOUND')
    require(type(binding['gates']) is dict and set(binding['gates']) == GATE_NAMES, 'GATES_UNBOUND')
    for value in binding['gates'].values():
        require(type(value) is dict and set(value) == {'path', 'sha256'}
            and type(value['path']) is str and is_hash(value['sha256']), 'GATE_BINDING_INVALID')
        path = safe(ROOT / value['path'])
        require(path.is_relative_to(ROOT / '.cache')
            and not path.is_relative_to(ROOT / '.cache/li-v3-custody'), 'GATE_PATH_REJECTED')
    require(sha(read(Path(__file__))) == binding['recorder_sha256'], 'RECORDER_SOURCE_CHANGED')
    return binding

def bound_inputs(binding, binding_sha):
    require(sha(read(BINDINGS)) == binding_sha, 'BINDINGS_CHANGED')
    require(sha(read(Path(__file__))) == binding['recorder_sha256'], 'RECORDER_SOURCE_CHANGED')
    require(sha(read(ROOT / 'reports/runtime-manifest.json')) == binding['runtime_manifest_sha256'],
            'RUNTIME_MANIFEST_CHANGED')
    for path, digest in binding['source_files'].items():
        require(sha(read(ROOT / path)) == digest, 'OWN_SOURCE_CHANGED')
    gates = {}
    for key, row in binding['gates'].items():
        raw = read(ROOT / row['path'])
        require(sha(raw) == row['sha256'], 'GATE_RECEIPT_CHANGED')
        gates[key] = json.loads(raw)
    prior_raw = read(ROOT / PREREQUISITE, 65536)
    require(sha(prior_raw) == PREREQUISITE_SHA, 'PREREQUISITE_CHANGED')
    return gates, prior_raw

def gates_valid(binding, gates, runtime):
    commit = binding['commit']
    ci = gates['ci']
    require(ci['commit'] == ci['run']['head_sha'] == commit and ci['all_four_jobs_successful'] is True,
            'CI_COMMIT_INVALID')
    require(ci['run']['event'] == 'push' and type(ci['run']['run_attempt']) is int
        and ci['run']['run_attempt'] == 1 and ci['run']['status'] == 'completed'
        and ci['run']['conclusion'] == 'success' and type(ci['run']['id']) is int,
        'CI_NOT_ORIGINAL_SUCCESS')
    require(len(ci['jobs']) == 4 and {j['name'] for j in ci['jobs']}
        == {'lean', 'browser', 'python (3.11)', 'python (3.12)'}
        and all(j['status'] == 'completed' and j['conclusion'] == 'success' for j in ci['jobs']),
        'CI_JOB_SET_INVALID')
    for key, script in [('package', 'scripts/package_smoke.py'),
                        ('strict', 'scripts/verify_retained_artifacts.py')]:
        receipt = gates[key]
        require(receipt['commit'] == commit and type(receipt['exit_code']) is int
            and receipt['exit_code'] == 0 and receipt['timed_out'] is False
            and receipt['source_unchanged'] is True and receipt['head_unchanged'] is True
            and receipt['worktree_clean'] is True and receipt['runtime_before'] == receipt['runtime_after'] == runtime
            and receipt['command'][1] == script, 'PACKAGE_GATE_INVALID')
    artifact, additive = gates['artifact_review'], gates['additive_review']
    require(artifact['status'] == additive['status'] == 'PASS'
        and artifact['commit'] == additive['commit'] == commit, 'ARTIFACT_GATE_INVALID')
    require(artifact['runtime_source_files_matching_manifest_and_worktree'] == 335
        and artifact['artifact_and_recorded_run_inputs_unchanged_at_end'] is True
        and artifact['producer_verifier_receipt_and_two_fixed_pins_agree'] is True,
        'ARTIFACT_BINDINGS_INVALID')
    require(additive['unchanged_prior_runtime_files'] == 332
        and additive['added_runtime_files'] == {p: h for p, h in binding['source_files'].items() if not p.startswith('docs/')}
        and additive['new_source_test_contracts_exact_in_git_archive_worktree'] == binding['source_files']
        and additive['source_pins_match_final_reviewed_pin_record'] is True
        and additive['unchanged_full_artifact_auditor_review_sha256'] == binding['gates']['artifact_review']['sha256'],
        'ADDITIVE_BINDINGS_INVALID')
    recorded = artifact['recorded_package_and_strict_verifier_runs']
    require(len(recorded) == 2 and {r['sha256'] for r in recorded}
        == {binding['gates'][key]['sha256'] for key in ('package', 'strict')}
        and all(r['exit_code'] == 0 and r['checked_log_hashes'] is True and r['runtime_count'] == 335 for r in recorded),
        'ARTIFACT_PACKAGE_RECEIPT_MISMATCH')
    return ci['run']['id']

def state(binding, binding_sha, runtime_module, diagnostic, expected=None):
    gates, prior_raw = bound_inputs(binding, binding_sha)
    commit = binding['commit']
    require(git('rev-parse', 'HEAD').strip() == commit, 'HEAD_CHANGED')
    require(git('branch', '--show-current').strip() == BRANCH, 'BRANCH_CHANGED')
    require(not git('status', '--porcelain', '--untracked-files=all'), 'WORKTREE_NOT_CLEAN')
    require(git('ls-remote', '--exit-code', 'origin', 'refs/heads/' + BRANCH).split()
        == [commit, 'refs/heads/' + BRANCH], 'REMOTE_CHANGED')
    runtime = runtime_module.source_files(ROOT)
    require(runtime == json.loads(read(ROOT / 'reports/runtime-manifest.json'))['files']
        and len(runtime) == 335 and (expected is None or runtime == expected), 'RUNTIME_CHANGED')
    ci_run = gates_valid(binding, gates, runtime)
    identity = diagnostic.production_context()
    require(identity['commit'] == commit and identity['files'] == binding['source_files'],
            'SOURCE_GUARD_IDENTITY_INVALID')
    require(diagnostic.PREREQUISITE == PREREQUISITE
        and diagnostic.PREREQUISITE_SHA256 == PREREQUISITE_SHA
        and diagnostic.PREREQUISITE_PRODUCER == PREREQUISITE_COMMIT
        and diagnostic._validate_prerequisite(prior_raw) == PREREQUISITE_SHA,
        'PREREQUISITE_IDENTITY_INVALID')
    return runtime, identity, ci_run, json.loads(prior_raw)

def validate_report(raw, diagnostic, identity, prior):
    """Closed source-bound public projection; not a raw-data/classifier re-execution."""
    require(len(raw) <= 65536, 'PUBLIC_REPORT_TOO_LARGE')
    report = json.loads(raw)
    template = diagnostic._production_report()
    require(type(report) is dict and set(report) == set(template)
        and raw == diagnostic.custody.canonical(report), 'PUBLIC_REPORT_NOT_CANONICAL_AND_CLOSED')
    require(report['schema'] == diagnostic.SCHEMA and report['action'] == 'audit'
        and report['parser_profile'] == diagnostic.PROFILE and report['scope'] == 'G29_G30_AND_G31_HEADERS'
        and report['status'] == 'BLOCKED_SCHEMA' and report['synthetic_fixture'] is False
        and report['source_identity_verified'] is True and report['implementation'] == identity,
        'PUBLIC_REPORT_IDENTITY_OR_GUARD_FAILURE')
    require(report['prerequisite_receipt_sha256'] == PREREQUISITE_SHA
        and report['prerequisite_producer_commit'] == PREREQUISITE_COMMIT
        and report['capture_receipt_sha256'] == diagnostic.G31.header_diagnostic.CAPTURE_SHA256,
        'PUBLIC_PREREQUISITE_INVALID')
    require(report['observed'] == {'sha256': diagnostic.G31.header_diagnostic.OBJECT_SHA256,
        'bytes': diagnostic.custody.SOURCE_BYTES, 'md5': diagnostic.custody.SOURCE_MD5}
        and type(report['observed']['bytes']) is int, 'PUBLIC_OBJECT_IDENTITY_INVALID')
    require(report['selected_growth'] == prior['selected_growth_check']
        and report['selected_growth_exposure'] == prior['exposure']['selected_growth'],
        'SELECTED_GROWTH_REPLAY_CHANGED')
    require(report['archive_accepted'] is False and report['scientific_counts'] is None
        and report['initial_padding_semantics'] == 'UNBOUND'
        and type(report['fits']) is int and report['fits'] == 0
        and type(report['splits']) is int and report['splits'] == 0, 'SCIENTIFIC_SCOPE_CHANGED')
    primary = report['first_rejection']
    require(type(primary) is dict and set(primary) == {'category', 'stage', 'g31_reason'}
        and primary['category'] in diagnostic.FAMILIES
        and primary['stage'] in {'member_path', 'member_name', 'member_kind', 'entry_central',
            'entry_local', 'local_growth', 'directory_totals'}
        and primary['g31_reason'] == 'ZIP_LAYOUT_UNSUPPORTED', 'PRIMARY_CATEGORY_NOT_CLOSED')
    require(report['predecessor_reproduction_checked'] is True
        and report['predecessor_reproduction_matched'] is True
        and diagnostic._matches_observed_predecessor(primary, report['exposure']),
        'PREDECESSOR_REPRODUCTION_CHANGED')
    forbidden = ('member_opens', 'decompressed_bytes', 'xml_parses', 'worksheet_decodes',
                 'shared_string_decodes', 'formula_evaluations')
    for key in ('exposure', 'aggregate_exposure'):
        value, expected = report[key], template[key]
        require(type(value) is dict and set(value) == set(expected), 'EXPOSURE_NOT_CLOSED')
        for name, default in expected.items():
            if type(default) is bool:
                require(type(value[name]) is bool, 'EXPOSURE_TYPE_INVALID')
            elif type(default) is int:
                require(type(value[name]) is int and 0 <= value[name] <= 128, 'EXPOSURE_COUNT_INVALID')
            else:
                require(value[name] is None, 'ARCHIVE_CLEANUP_FAILED')
        require(value['whole_buffer_supplied'] is True and all(value[n] == 0 for n in forbidden),
                'MEMBER_OR_XML_EXPOSURE_NOT_ALLOWED')
    exposure = report['exposure']
    require(all(exposure[k] is True for k in ('central_directory_preflight_started',
        'central_directory_preflight_completed', 'archive_open_started', 'archive_open_completed',
        'directory_name_decoding_started', 'directory_name_decoding_completed', 'header_checks_started',
        'archive_close_started', 'archive_close_completed')), 'PRIMARY_EXPOSURE_INCOMPLETE')
    operation = report['operation_exposure']
    require(type(operation) is dict and set(operation) == set(template['operation_exposure'])
        and operation['output_directory_close_error'] is None
        and all(operation[k] is True for k in operation if k != 'output_directory_close_error'),
        'OPERATION_INCOMPLETE_OR_CLOSE_FAILURE')
    families = report['families']
    require(type(families) is dict and set(families) == set(diagnostic.FAMILIES), 'FAMILIES_NOT_CLOSED')
    any_failure = any_partial = False
    for value in families.values():
        require(type(value) is dict and set(value) == {'status', 'checked', 'partial', 'dependencies'}
            and type(value['checked']) is bool and type(value['partial']) is bool
            and type(value['dependencies']) is list, 'FAMILY_SHAPE_INVALID')
        status, checked, partial, deps = value['status'], value['checked'], value['partial'], value['dependencies']
        require(status in {'ALL_APPLICABLE_CHECKS_PASS', 'FAILURES_OBSERVED', 'INCOMPLETE_NO_FAILURE_OBSERVED',
            'FAILURES_AND_INCOMPLETE', 'NOT_APPLICABLE'}, 'FAMILY_STATUS_INVALID')
        if partial:
            require(deps and all(type(d) is str and d in diagnostic.DEPENDENCIES for d in deps)
                and deps == sorted(set(deps)) and status in {'FAILURES_AND_INCOMPLETE', 'INCOMPLETE_NO_FAILURE_OBSERVED'},
                'FAMILY_DEPENDENCIES_INVALID')
        else:
            require(deps == ['CHECKED' if checked else 'NOT_APPLICABLE']
                and status in ({'ALL_APPLICABLE_CHECKS_PASS', 'FAILURES_OBSERVED'} if checked else {'NOT_APPLICABLE'}),
                'FAMILY_DEPENDENCIES_INVALID')
        if status.startswith('FAILURES'):
            require(checked, 'FAILURE_WITHOUT_CHECK')
            any_failure = True
        any_partial |= partial
    aggregate = ('FAILURES_AND_INCOMPLETE' if any_failure and any_partial else 'FAILURES_OBSERVED' if any_failure
        else 'INCOMPLETE_NO_FAILURE_OBSERVED' if any_partial else 'ALL_APPLICABLE_CHECKS_PASS')
    complete = not any_partial and exposure['archive_close_completed'] and exposure['archive_close_error'] is None
    require(report['aggregate_status'] == aggregate and type(report['diagnostic_complete']) is bool
        and report['diagnostic_complete'] is complete
        and report['engineering_status'] == ('DIAGNOSTIC_COMPLETE' if complete else 'DIAGNOSTIC_INCOMPLETE')
        and report['reason'] == ('HEADER_PREDICATE_AUDIT_COMPLETE' if complete else 'HEADER_PREDICATE_AUDIT_INCOMPLETE'),
        'DIAGNOSTIC_STATUS_INCONSISTENT')
    return report

def run_one(run, binding, binding_sha, runtime_module, diagnostic, before, identity, ci_run, prior):
    folder = BASE / str(run)
    folder.mkdir(mode=0o700, exist_ok=False)
    target = ROOT / TARGET / str(run)
    require(not os.path.lexists(target), 'TARGET_SLOT_CONSUMED')
    command = [sys.executable, '-B', SOURCE, 'audit', '--run', str(run)]
    started, tick = now(), time.monotonic()
    store(folder / 'start.json', {'command': command, 'commit': binding['commit'], 'ci_run': ci_run,
        'started_at': started, 'runtime_before': before, 'implementation': identity,
        'bindings_sha256': binding_sha, 'exposure_until_validated_report': 'UNKNOWN'})
    stdout_path, stderr_path = folder / 'stdout.txt', folder / 'stderr.txt'
    timed_out = launch_failed = False
    returncode = process = None
    env = dict(os.environ)
    env.pop('PYTHONPATH', None); env.pop('PYTHONHOME', None)
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    env['PYTHONPYCACHEPREFIX'] = str(BASE / 'unused-bytecode')
    try:
        with stdout_path.open('xb') as stdout, stderr_path.open('xb') as stderr:
            process = subprocess.Popen(command, cwd=ROOT, stdout=stdout, stderr=stderr, env=env,
                                       start_new_session=(os.name == 'posix'))
            try:
                returncode = process.wait(timeout=TIMEOUT)
            except subprocess.TimeoutExpired:
                timed_out = True
                if os.name == 'posix': os.killpg(process.pid, signal.SIGKILL)
                else: process.kill()
                returncode = process.wait(timeout=15)
    except BaseException:
        launch_failed = True
        if process is not None:
            try:
                if process.poll() is None:
                    if os.name == 'posix': os.killpg(process.pid, signal.SIGKILL)
                    else: process.kill()
                returncode = process.wait(timeout=15)
            except Exception: pass
    after = after_identity = None
    hold_error = output_error = None
    try:
        after = runtime_module.source_files(ROOT)
        checked, after_identity, after_ci, after_prior = state(binding, binding_sha, runtime_module, diagnostic, before)
        require(checked == after and after_identity == identity and after_ci == ci_run and after_prior == prior,
                'POST_STATE_CHANGED')
        require(not os.path.lexists(BASE / 'unused-bytecode'), 'BYTECODE_PREFIX_CREATED')
    except Stop as exc:
        hold_error = str(exc); after_identity = None
    except BaseException:
        hold_error = 'POST_STATE_CHECK_FAILED'; after_identity = None
    raw = persisted = report = None
    persisted_error = None
    try:
        if os.path.lexists(target / 'public.json'):
            persisted = read(target / 'public.json', 65536)
            save_raw(folder / 'persisted-public.json', persisted)
    except BaseException:
        persisted_error = 'PERSISTED_PUBLIC_NOT_RETAINED'
    try:
        require(not timed_out and not launch_failed and type(returncode) is int and returncode == 2,
                'COMMAND_DID_NOT_COMPLETE')
        raw = read(stdout_path, 65536)
        require(read(stderr_path) == b'', 'COMMAND_STDERR_NOT_EMPTY')
        report = validate_report(raw, diagnostic, identity, prior)
        require(persisted_error is None and persisted is not None and raw == persisted,
                'RETURNED_AND_PERSISTED_PUBLIC_DIFFER')
    except Stop as exc:
        output_error = str(exc); report = None
    except BaseException:
        output_error = 'PUBLIC_RESULT_NOT_VALIDATED'; report = None
    hashes = {}
    for name, path in [('stdout', stdout_path), ('stderr', stderr_path)]:
        try: hashes[name + '_sha256'] = sha(read(path))
        except BaseException: hashes[name + '_sha256'] = None
    receipt = {'command': command, 'commit': binding['commit'], 'ci_run': ci_run, 'started_at': started,
        'finished_at': now(), 'elapsed_seconds': time.monotonic() - tick, 'exit_code': returncode,
        'timed_out': timed_out, 'launch_failed': launch_failed, 'runtime_before': before, 'runtime_after': after,
        'source_unchanged': before == after if after is not None else None,
        'head_branch_remote_source_guard_held': True if after_identity is not None else None,
        'state_recheck_error': hold_error, 'public_report_canonical_and_closed': report is not None,
        'public_validation_error': output_error, 'persisted_public_error': persisted_error,
        'persisted_public_sha256': sha(persisted) if persisted is not None else None,
        'returned_equals_persisted': raw == persisted if raw is not None and persisted is not None else None,
        'reason': report['reason'] if report is not None else None,
        'first_rejection': report['first_rejection'] if report is not None else None,
        'diagnostic_complete': report['diagnostic_complete'] if report is not None else None,
        'exposure': report['exposure'] if report is not None else None,
        'aggregate_exposure': report['aggregate_exposure'] if report is not None else None,
        'operation_exposure': report['operation_exposure'] if report is not None else None,
        'unvalidated_exposure_interpretation': None if report is not None else 'UNKNOWN_SEE_RETAINED_STDOUT_AND_PUBLIC_BYTES',
        'scientific_schema_approved': False, **hashes}
    store(folder / 'execution.json', receipt)
    print(json.dumps({k:receipt[k] for k in ('commit','exit_code','reason','first_rejection',
        'diagnostic_complete','state_recheck_error','public_validation_error','stdout_sha256')},sort_keys=True),flush=True)
    require(after_identity is not None and report is not None, 'STOP_PRESERVE_COMMAND_RESULT')
    return raw

class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise Stop('ARGUMENT_INVALID')

def main(argv=None):
    created = False
    commit = None
    try:
        parser = Parser(description=__doc__)
        parser.add_argument('--binding-sha256', required=True)
        args = parser.parse_args(argv)
        require(not os.path.lexists(BASE), 'RECORDER_SLOT_CONSUMED')
        binding = load_bindings(args.binding_sha256)
        commit = binding['commit']
        gates, prior_raw = bound_inputs(binding, args.binding_sha256)
        runtime = json.loads(read(ROOT / 'reports/runtime-manifest.json'))['files']
        require(len(runtime) == 335 and all(sha(read(ROOT / p)) == h for p,h in runtime.items()),
                'RUNTIME_BINDINGS_INVALID')
        ci_run = gates_valid(binding, gates, runtime)
        for run in (1,2):
            require(not os.path.lexists(ROOT / TARGET / str(run)), 'TARGET_SLOT_CONSUMED')
        require(not os.path.lexists(BASE / 'unused-bytecode'), 'BYTECODE_PREFIX_EXISTS')
        sys.dont_write_bytecode = True
        sys.pycache_prefix = str(BASE / 'unused-bytecode')
        sys.path.insert(0, str(ROOT / 'scripts'))
        runtime_module = importlib.import_module('runtime_manifest')
        diagnostic = importlib.import_module('li_v3_growth_predicate_audit')
        before, identity, checked_ci, prior = state(binding, args.binding_sha256, runtime_module, diagnostic)
        require(checked_ci == ci_run, 'CI_CHANGED')
        BASE.mkdir(mode=0o700, exist_ok=False)
        created = True
        store(BASE / 'preflight.json', {'commit':commit,'checked_at':now(),'ci_run':ci_run,
            'bindings_sha256':args.binding_sha256,'bindings':binding,'runtime':before,
            'implementation':identity,'prerequisite_sha256':PREREQUISITE_SHA,
            'prerequisite_producer_commit':PREREQUISITE_COMMIT,'scientific_schema_approved':False})
        outputs=[]
        for run in (1,2):
            current, current_identity, current_ci, current_prior = state(binding,args.binding_sha256,runtime_module,diagnostic,before)
            require(current_identity == identity and current_ci == ci_run and current_prior == prior,'PRE_RUN_STATE_CHANGED')
            outputs.append(run_one(run,binding,args.binding_sha256,runtime_module,diagnostic,current,identity,ci_run,prior))
        require(outputs[0] == outputs[1], 'REPLAY_BYTES_DIFFER')
        result=json.loads(outputs[0])
        final={'status':'COMPLETE_TWO_IDENTICAL_BOUNDED_DIAGNOSES','commit':commit,'finished_at':now(),
            'public_sha256':sha(outputs[0]),'reason':result['reason'],'first_rejection':result['first_rejection'],
            'diagnostic_complete':result['diagnostic_complete'],'aggregate_status':result['aggregate_status'],
            'scientific_schema_approved':False,'archive_accepted':False,'no_automatic_retry':True,
            'scope':'Fixed-source categorical header replay only; no member/XML payload opens or scientific admission.'}
        store(BASE/'final.json',final)
        print(json.dumps(final,sort_keys=True),flush=True)
        return 0
    except Stop as exc:
        reason=str(exc)
    except BaseException:
        reason='RECORDER_INTERNAL_FAILURE'
    final={'status':'STOP_PRESERVE_EVIDENCE','reason':reason,'commit':commit,'finished_at':now(),
           'no_automatic_retry':True,'scientific_schema_approved':False}
    if created:
        try: store(BASE/'stopped.json',final)
        except Exception: pass
    print(json.dumps(final,sort_keys=True),flush=True)
    return 2

if __name__ == '__main__':
    raise SystemExit(main())
