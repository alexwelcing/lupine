#!/usr/bin/env python3
"""Root-invoked notebook recorder. Preparation/syntax review does NOT run it.

Only the fixed capture, inspect 1 and inspect 2 operations are available. The
recorder never opens the private notebook object or private capture receipt.
"""
from __future__ import annotations

import argparse
import ast
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import time
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
BRANCH = 'research/lupine-discovery'
MAX_PUBLIC = 8 * 1024 * 1024
COMMAND_TIMEOUT = 120
NEW_FILES = {
    'scripts/li_v3_notebook_methods.py': '2423ee14f16b6b7ec46ef896f25cb5962b1c28dbea79fcb365e14b0919752049',
    'tests/test_li_v3_notebook_methods.py': '7a93116314786ea8a5b49562473c891bde225f6abf638c9427a361fa38b9d809',
    'tests/test_li_v3_notebook_methods_review.py': '81e36eba1e7fd7c75b63ac04cc19ec00893520e37e71f944525eafaf7492dfc1',
    'docs/li-v3-notebook-methods-plan.md': 'c19cd936e9c812e46a178d3dbff5d4bf2736505de6445858b6b5214e2066f5f5',
}
OLD_FILES = {
    'scripts/li_v3_custody.py': '3ead51f0afdf16be973743257be488669c988aa40443779e7a5c400e9b0d3234',
    'tests/test_li_v3_custody.py': 'b8113942416f5a2fc6cda565fa5e8b3d5fb9efb887d9241cc36047caca58780a',
    'tests/test_li_v3_custody_review.py': '6d49955ff2850484bdf8e47af061fa7649ba016a739467cbd0799379913e0151',
    'docs/li-v3-custody-plan.md': '0be13b0ed7dd7bc41b9c430d4f7d30f8efa0ead54a85d162f31c728eb928a241',
    'reports/li-v3-source-inventory.json': 'ef4d3de4deb08b3903230a7456fb50de689e49265868d78f0c73faab4461f9ba',
}
SOURCE = {
    'repository': 'avakanski/Subsized-Specimens-Tensile-Properties',
    'commit': 'd19b15127c8ae1be49308c29eac718b609ad895c',
    'path': 'Sample_Code.ipynb',
    'git_blob_sha1': '789b61339aa4c566b68794077fa7240a73677f9d',
    'bytes': 353800,
}
EXPOSURE_KEYS = {
    'target_bearing_source_bytes_read', 'json_container_parse_started',
    'json_container_parse_completed', 'code_ast_parse_started',
    'code_ast_parse_completed', 'notebook_code_executed', 'raw_code_disclosed',
    'output_values_disclosed',
}
REPORT_KEYS = {
    'schema', 'profile', 'status', 'engineering_status', 'reason', 'synthetic',
    'implementation', 'source', 'exposure', 'inventory', 'scientific_schema_approved',
}
PARSE_REASONS = {
    'JSON_INVALID', 'NOTEBOOK_PROFILE_UNSUPPORTED', 'CODE_SYNTAX_UNSUPPORTED',
    'STATIC_LIMIT', 'INTERNAL_FAILURE',
}


class Stop(Exception):
    """Only programmer-supplied constant codes reach the public summary."""


def require(condition, code):
    if not condition:
        raise Stop(code)


def now():
    return datetime.now(timezone.utc).isoformat()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def safe_path(path):
    path = Path(os.path.abspath(path))
    require(path.is_relative_to(ROOT), 'PATH_OUTSIDE_WORKSPACE')
    for component in (path, *path.parents):
        if component == ROOT.parent:
            break
        require(not component.is_symlink(), 'SYMLINK_PATH_REJECTED')
    return path


def read(path, cap=MAX_PUBLIC):
    path = safe_path(path)
    fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    try:
        info = os.fstat(fd)
        require(stat.S_ISREG(info.st_mode) and info.st_size <= cap, 'READ_BOUND_REJECTED')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            result = stream.read(cap + 1)
        require(len(result) <= cap, 'READ_BOUND_REJECTED')
        return result
    finally:
        os.close(fd)


def write(path, value):
    path = safe_path(path)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(value)


def store(path, value):
    write(path, canonical(value))


def parse(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'DUPLICATE_JSON_KEY')
            result[key] = value
        return result
    def constant(_):
        raise Stop('NONFINITE_JSON')
    data = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs, parse_constant=constant)
    stack = [data]
    while stack:
        item = stack.pop()
        require(not isinstance(item, float) or math.isfinite(item), 'NONFINITE_JSON')
        if isinstance(item, dict):
            stack.extend(item.values())
        elif isinstance(item, list):
            stack.extend(item)
    return data


def timestamp(value):
    require(type(value) is str, 'TIMESTAMP_INVALID')
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(result.tzinfo is not None, 'TIMESTAMP_INVALID')
    return result


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, check=True, capture_output=True,
                          timeout=30).stdout


def runtime_snapshot():
    extensions = {'.toml', '.py', '.json', '.html', '.css', '.js', '.svg'}
    paths = [ROOT / 'pyproject.toml']
    for directory in ('scripts', 'tests', 'src/lupine_discovery'):
        paths.extend(path for path in (ROOT / directory).rglob('*')
                     if path.is_file() and '__pycache__' not in path.parts
                     and path.suffix in extensions)
    return {str(path.relative_to(ROOT)): digest(read(path)) for path in sorted(paths)}


def check_state(commit, module=None, expected_runtime=None):
    require(git('rev-parse', 'HEAD').decode().strip() == commit, 'HEAD_CHANGED')
    require(git('branch', '--show-current').decode().strip() == BRANCH, 'WRONG_BRANCH')
    require(git('status', '--porcelain', '--untracked-files=all') == b'', 'WORKTREE_NOT_CLEAN')
    remote = git('remote', 'get-url', 'origin').decode().strip()
    url = urlsplit(remote)
    correct_origin = (url.scheme == 'https' and url.hostname == 'github.com'
                      and url.path.rstrip('/') in ('/alexwelcing/lupine', '/alexwelcing/lupine.git'))
    correct_origin |= remote in ('git@github.com:alexwelcing/lupine.git', 'git@github.com:alexwelcing/lupine')
    require(correct_origin, 'ORIGIN_IDENTITY_INVALID')
    remote_line = git('ls-remote', '--exit-code', 'origin', 'refs/heads/' + BRANCH).decode().split()
    require(remote_line == [commit, 'refs/heads/' + BRANCH], 'REMOTE_COMMIT_MISMATCH')
    current = runtime_snapshot()
    manifest_raw = read(ROOT / 'reports/runtime-manifest.json')
    prefix = git('rev-parse', '--show-prefix').decode().strip()
    require(manifest_raw == git('show', commit + ':' + prefix + 'reports/runtime-manifest.json'), 'MANIFEST_NOT_COMMITTED')
    require(parse(manifest_raw)['files'] == current, 'RUNTIME_MANIFEST_MISMATCH')
    require(expected_runtime is None or expected_runtime == current, 'RUNTIME_CHANGED')
    for relative, expected in {**OLD_FILES, **NEW_FILES}.items():
        value = read(ROOT / relative)
        require(digest(value) == expected, 'REVIEWED_SOURCE_PIN_MISMATCH')
        require(value == git('show', commit + ':' + prefix + relative)
                and value == git('show', ':' + prefix + relative), 'SOURCE_INDEX_HEAD_MISMATCH')
    identity = None
    if module is not None:
        identity = module.production_context()
        require(identity == {'mode': 'committed_source', 'commit': commit,
                             'files': NEW_FILES, 'prior_files': OLD_FILES}, 'SOURCE_GUARD_IDENTITY_INVALID')
    return {'checked_at': now(), 'head': commit, 'remote_head': commit,
            'branch': BRANCH, 'worktree_clean': True, 'runtime': current,
            'implementation': identity}


def receipt_path(value):
    path = safe_path(ROOT / value if not Path(value).is_absolute() else value)
    require(path.is_relative_to(ROOT / '.cache')
            and not path.is_relative_to(ROOT / '.cache/li-v3-custody'), 'GATE_RECEIPT_PATH_INVALID')
    return path


def validate_gates(args, current):
    paths = [receipt_path(v) for v in (args.ci_receipt, args.package_receipt, args.verifier_receipt)]
    bound = {str(p.relative_to(ROOT)): digest(read(p)) for p in paths}
    ci, package, verifier = [parse(read(p)) for p in paths]
    require(ci['commit'] == ci['run']['head_sha'] == args.expected_commit, 'CI_COMMIT_MISMATCH')
    run = ci['run']
    require(type(run['id']) is int and run['id'] > 0 and type(run['run_attempt']) is int
            and run['run_attempt'] == 1 and run['event'] == 'push'
            and run['status'] == 'completed' and run['conclusion'] == 'success'
            and ci['all_four_jobs_successful'] is True
            and run['html_url'] == 'https://github.com/alexwelcing/lupine/actions/runs/' + str(run['id']),
            'CI_NOT_ORIGINAL_SUCCESS')
    jobs = ci['jobs']
    require(type(jobs) is list and len(jobs) == 4
            and {j['name'] for j in jobs} == {'lean', 'browser', 'python (3.11)', 'python (3.12)'}
            and len({j['id'] for j in jobs}) == 4, 'CI_JOB_SET_INVALID')
    observed = timestamp(ci['observed_at'])
    require(observed <= datetime.now(timezone.utc), 'FUTURE_GATE_TIMESTAMP')
    for job in jobs:
        require(type(job['id']) is int and job['id'] > 0 and job['status'] == 'completed'
                and job['conclusion'] == 'success'
                and timestamp(job['started_at']) <= timestamp(job['completed_at']) <= observed,
                'CI_JOB_NOT_SUCCESSFUL')
    reports = []
    for index, record in enumerate((package, verifier)):
        require(record['commit'] == args.expected_commit and type(record['exit_code']) is int
                and record['exit_code'] == 0 and record['source_unchanged'] is True
                and record['head_unchanged'] is True and record['worktree_clean'] is True
                and record['runtime_before'] == record['runtime_after'] == current, 'PACKAGE_GATE_INVALID')
        require(timestamp(record['started_at']) <= timestamp(record['finished_at'])
                <= datetime.now(timezone.utc), 'PACKAGE_GATE_TIME_INVALID')
        path = paths[index + 1]
        require(path.name.endswith('-execution.json'), 'PACKAGE_LOG_NAMING_INVALID')
        stem = path.name[:-len('-execution.json')]
        logs = [path.with_name(stem + '-' + kind + '.txt') for kind in ('stdout', 'stderr')]
        for kind, log in zip(('stdout', 'stderr'), logs):
            content = read(log)
            require(digest(content) == record[kind + '_sha256'], 'PACKAGE_LOG_HASH_MISMATCH')
            bound[str(log.relative_to(ROOT))] = digest(content)
        require(read(logs[1]) == b'', 'PACKAGE_STDERR_NOT_EMPTY')
        reports.append(parse(read(logs[0])))
    require(package['command'][1] == 'scripts/package_smoke.py'
            and package['command'][2] == '--retain-directory' and len(package['command']) == 4,
            'PACKAGE_COMMAND_INVALID')
    directory = package['command'][3]
    require(verifier['command'][1:] == ['scripts/verify_retained_artifacts.py', '--directory', directory,
                                       '--commit', args.expected_commit], 'VERIFIER_COMMAND_INVALID')
    smoke, verified = reports
    verifier_constants = {}
    for node in ast.parse(read(ROOT / 'scripts/verify_retained_artifacts.py').decode()).body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in ('CHECKS', 'SCHEMAS'):
                    verifier_constants[target.id] = ast.literal_eval(node.value)
    require(smoke['status'] == 'passed' and type(smoke['case_count']) is int and smoke['case_count'] == 28
            and smoke['problem_schemas'] == verifier_constants['SCHEMAS']
            and smoke['checks'] == verifier_constants['CHECKS']
            and len(smoke['checks']) == 16, 'PACKAGE_SMOKE_INVALID')
    require(verified['status'] == 'PASS' and verified['expected_git_commit'] == args.expected_commit
            and verified['reported_smoke']['checks'] == smoke['checks']
            and verified['reported_smoke']['problem_schemas'] == smoke['problem_schemas']
            and verified['reported_smoke']['case_count'] == 28
            and verified['reported_smoke']['isolated_install'] is True, 'STRICT_VERIFIER_INVALID')
    artifact = receipt_path(str(Path(directory) / 'release-artifacts.json'))
    artifact_raw = read(artifact)
    retained = parse(artifact_raw)
    require(digest(artifact_raw) == verified['receipt_sha256']
            and retained['source']['git_commit'] == args.expected_commit
            and retained['source']['worktree_status'] == 'clean'
            and retained['source']['runtime_manifest']['sha256'] == digest(read(ROOT / 'reports/runtime-manifest.json'))
            and retained['source']['runtime_manifest']['file_count'] == len(current)
            and retained['source_state_rechecked_after_smoke'] is True
            and retained['artifacts'] == verified['artifact_identities']
            and retained['verification']['checks'] == smoke['checks']
            and retained['verification']['isolated_install'] is True
            and retained['verification']['status'] == 'passed', 'ARTIFACT_RECEIPT_INVALID')
    bound[str(artifact.relative_to(ROOT))] = digest(artifact_raw)
    return {'ci_run': run['id'], 'ci_observed_at': ci['observed_at'],
            'package_finished_at': verifier['finished_at'], 'receipt_hashes': bound}


def validate_inventory(inventory, module):
    require(type(inventory) is dict and set(inventory) == {
        'known_import_categories', 'unreported_imports_present', 'syntactic_calls',
        'unreported_calls_present', 'runtime_binding_or_execution_established'}, 'INVENTORY_INVALID')
    imports = inventory['known_import_categories']
    require(type(imports) is list and imports == sorted(set(imports))
            and set(imports) <= module.IMPORTS, 'INVENTORY_IMPORT_INVALID')
    require(type(inventory['unreported_imports_present']) is bool
            and type(inventory['unreported_calls_present']) is bool
            and inventory['runtime_binding_or_execution_established'] is False, 'INVENTORY_CLAIM_INVALID')
    calls = inventory['syntactic_calls']
    require(type(calls) is list and len(calls) <= 50000, 'INVENTORY_CALL_LIMIT')
    kinds = {'literal_scalar', 'literal_container', 'name', 'attribute', 'subscript', 'call', 'star_args', 'other_expression'}
    for call in calls:
        require(type(call) is dict and set(call) == {'syntactic_call_name', 'parameters', 'unreported_arguments_present'}, 'CALL_SHAPE_INVALID')
        name = call['syntactic_call_name']
        require(name in module.PARAMETERS and type(call['unreported_arguments_present']) is bool
                and type(call['parameters']) is list, 'CALL_CATEGORY_INVALID')
        for parameter in call['parameters']:
            require(type(parameter) is dict and set(parameter) == {'name', 'syntax', 'kind'}
                    and parameter['kind'] in kinds, 'PARAMETER_SHAPE_INVALID')
            permitted = module.PARAMETERS[name] if parameter['syntax'] == 'keyword' else module.POSITIONAL.get(name, ())
            require(parameter['syntax'] in ('keyword', 'positional') and parameter['name'] in permitted,
                    'PARAMETER_CATEGORY_INVALID')
        require(call['parameters'] == sorted(call['parameters'], key=lambda p: (p['name'], p['syntax'], p['kind'])), 'PARAMETER_ORDER_INVALID')
    encoded = [canonical(c) for c in calls]
    require(encoded == sorted(set(encoded)), 'CALL_ORDER_INVALID')


def validate_public(raw, module, identity, action, source=None):
    data = parse(raw)
    require(type(data) is dict and set(data) == REPORT_KEYS and canonical(data) == raw, 'PUBLIC_REPORT_SHAPE_INVALID')
    require(data['schema'] == 'lupine.discovery.li_v3.notebook_methods.v1'
            and data['profile'] == 'li_v3.notebook.static_api_projection.v1'
            and data['status'] == 'BLOCKED_SCHEMA' and data['synthetic'] is False
            and data['scientific_schema_approved'] is False
            and canonical(data['implementation']) == canonical(identity), 'PUBLIC_REPORT_IDENTITY_INVALID')
    observed = data['source']
    require(type(observed) is dict and type(observed.get('bytes')) is int
            and type(observed.get('sha256')) is str and re.fullmatch('[0-9a-f]{64}', observed['sha256'])
            and observed == dict(SOURCE, sha256=observed['sha256']), 'PUBLIC_SOURCE_IDENTITY_INVALID')
    require(source is None or canonical(observed) == canonical(source), 'CAPTURED_SOURCE_IDENTITY_CHANGED')
    exposure = data['exposure']
    require(type(exposure) is dict and set(exposure) == EXPOSURE_KEYS
            and all(type(v) is bool for v in exposure.values())
            and exposure['target_bearing_source_bytes_read'] is True, 'PUBLIC_EXPOSURE_INVALID')
    for forbidden in ('notebook_code_executed', 'raw_code_disclosed', 'output_values_disclosed'):
        require(exposure[forbidden] is False, 'UNAUTHORIZED_EXPOSURE_CLAIM')
    require(not exposure['json_container_parse_completed'] or exposure['json_container_parse_started'], 'EXPOSURE_ORDER_INVALID')
    require(not exposure['code_ast_parse_started'] or exposure['json_container_parse_completed'], 'EXPOSURE_ORDER_INVALID')
    require(not exposure['code_ast_parse_completed'] or exposure['code_ast_parse_started'], 'EXPOSURE_ORDER_INVALID')
    status = data['engineering_status']
    if action == 'capture':
        require(status == 'CAPTURE_VERIFIED' and data['reason'] is None and data['inventory'] is None
                and not any(exposure[k] for k in EXPOSURE_KEYS - {'target_bearing_source_bytes_read'}), 'CAPTURE_NOT_COMPLETE')
    elif status == 'STATIC_API_INVENTORY_COMPLETE':
        require(data['reason'] is None and exposure['json_container_parse_completed'] is True
                and exposure['code_ast_parse_started'] == exposure['code_ast_parse_completed'], 'STATIC_SUCCESS_INVALID')
        validate_inventory(data['inventory'], module)
    else:
        require(status == 'BLOCKED_STATIC_PROFILE' and data['reason'] in PARSE_REASONS
                and data['inventory'] is None and exposure['json_container_parse_started'] is True,
                'STATIC_REJECTION_NOT_REPLAYABLE')
    return data


def run_command(folder, module, commit, action, run_id, before, gates, captured_source):
    folder.mkdir(mode=0o700)
    argv = [sys.executable, 'scripts/li_v3_notebook_methods.py', action] + ([] if run_id is None else [run_id])
    start, tick = now(), time.monotonic()
    store(folder / 'start.json', {'command': argv, 'commit': commit, 'ci_run': gates['ci_run'],
          'started_at': start, 'runtime_before': before['runtime'], 'source_guard': before['implementation'],
          'gate_receipt_hashes': gates['receipt_hashes'], 'exposure_until_complete_report': 'UNKNOWN'})
    stdout, stderr = folder / 'stdout.txt', folder / 'stderr.txt'
    outfd = os.open(stdout, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    errfd = os.open(stderr, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    timed_out, returncode, launch_failed = False, None, False
    process = None
    env = dict(os.environ)
    env.pop('PYTHONPATH', None)
    env.pop('PYTHONHOME', None)
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    try:
        with os.fdopen(outfd, 'wb') as out, os.fdopen(errfd, 'wb') as err:
            process = subprocess.Popen(argv, cwd=ROOT, stdout=out, stderr=err, env=env,
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
    after, after_runtime, hold_error = None, None, None
    try:
        after_runtime = runtime_snapshot()
    except Exception:
        pass
    try:
        after = check_state(commit, module, before['runtime'])
        require(after_runtime == after['runtime'], 'POST_SNAPSHOT_CHANGED')
    except Stop as exc:
        hold_error = str(exc)
        after = None
    except Exception:
        hold_error = 'STATE_RECHECK_FAILED'
        after = None
    raw, public_data, output_error = None, None, None
    try:
        raw = read(stdout)
        require(read(stderr) == b'', 'COMMAND_STDERR_NOT_EMPTY')
        require(not timed_out and not launch_failed, 'COMMAND_DID_NOT_COMPLETE')
        public_data = validate_public(raw, module, before['implementation'], action, captured_source)
        expected_exit = 0 if public_data['engineering_status'] in ('CAPTURE_VERIFIED', 'STATIC_API_INVENTORY_COMPLETE') else 2
        require(returncode == expected_exit, 'COMMAND_EXIT_STATUS_MISMATCH')
        slot = 'capture' if action == 'capture' else run_id
        require(raw == read(ROOT / module.OUTPUT / slot / 'public.json'), 'PUBLIC_RECEIPT_MISMATCH')
    except Stop as exc:
        output_error = str(exc)
        public_data = None
    except Exception:
        output_error = 'PUBLIC_RESULT_NOT_VALIDATED'
        public_data = None
    # Preserve all actual logs, even when they are not safe to project publicly.
    hashes = {}
    for kind, path in [('stdout', stdout), ('stderr', stderr)]:
        try:
            hashes[kind + '_sha256'] = digest(read(path))
        except Exception:
            hashes[kind + '_sha256'] = None
    receipt = {'command': argv, 'commit': commit, 'ci_run': gates['ci_run'],
        'started_at': start, 'finished_at': now(), 'elapsed_seconds': time.monotonic() - tick,
        'returncode': returncode, 'timed_out': timed_out, 'launch_failed': launch_failed,
        'runtime_before': before['runtime'], 'runtime_after': after_runtime,
        'source_unchanged': (after_runtime == before['runtime']) if after_runtime is not None else None,
        'head_unchanged': True if after else None, 'worktree_clean': True if after else None,
        'state_recheck_error': hold_error,
        'public_report_complete_and_valid': public_data is not None, 'public_validation_error': output_error,
        'engineering_status': public_data['engineering_status'] if public_data else None,
        'reason': public_data['reason'] if public_data else None,
        'exposure': public_data['exposure'] if public_data else None, **hashes}
    store(folder / 'execution.json', receipt)
    print(json.dumps({k: receipt[k] for k in ('command', 'commit', 'ci_run', 'started_at', 'finished_at',
          'returncode', 'timed_out', 'launch_failed', 'source_unchanged', 'state_recheck_error',
          'public_report_complete_and_valid', 'public_validation_error', 'engineering_status', 'reason',
          'exposure', 'stdout_sha256', 'stderr_sha256')}, sort_keys=True), flush=True)
    require(after is not None and public_data is not None, 'STOP_PRESERVE_COMMAND_RESULT')
    return raw, public_data


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise Stop('ARGUMENT_INVALID')


def main(argv=None):
    folder = None
    try:
        parser = Parser(description=__doc__)
        parser.add_argument('--expected-commit', required=True)
        parser.add_argument('--ci-receipt', required=True)
        parser.add_argument('--package-receipt', required=True)
        parser.add_argument('--verifier-receipt', required=True)
        args = parser.parse_args(argv)
        require(re.fullmatch('[0-9a-f]{40}', args.expected_commit) is not None, 'EXPECTED_COMMIT_INVALID')
        safe_path(BASE)
        folder = BASE / ('run-' + args.expected_commit + '-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
        folder.mkdir(mode=0o700)
        script_sha256 = digest(read(Path(__file__)))
        initial = check_state(args.expected_commit)
        gates = validate_gates(args, initial['runtime'])
        sys.dont_write_bytecode = True
        sys.path.insert(0, str(ROOT / 'scripts'))
        spec = importlib.util.spec_from_file_location('reviewed_notebook_methods_recorder', ROOT / 'scripts/li_v3_notebook_methods.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        initial = check_state(args.expected_commit, module, initial['runtime'])
        # No raw object/capture read here: only absence of fixed paths is checked.
        for relative in [module.OBJECT, module.CAPTURE, *(module.OUTPUT + slot for slot in ('capture', '1', '2'))]:
            require(not os.path.lexists(safe_path(ROOT / relative)), 'PRIOR_NOTEBOOK_SLOT_EXISTS')
        store(folder / 'preflight.json', {'status': 'PASS', 'commit': args.expected_commit,
              'checked_at': now(), 'state': initial, 'gates': gates, 'recorder_sha256': script_sha256,
              'scope': 'Gate and public-source checks only; no private notebook or capture content opened.'})
        # Retain an exclusive one-attempt lock, including on failure. There is
        # no automated retry, cleanup or overwrite of a source attempt.
        store(BASE / 'notebook-production.lock', {'commit': args.expected_commit,
              'started_at': now(), 'record_directory': str(folder.relative_to(ROOT))})
        captured, reports = None, []
        for index, (action, run_id) in enumerate([('capture', None), ('inspect', '1'), ('inspect', '2')]):
            require(digest(read(Path(__file__))) == script_sha256, 'RECORDER_SOURCE_CHANGED')
            for relative, expected in gates['receipt_hashes'].items():
                require(digest(read(ROOT / relative)) == expected, 'GATE_RECEIPT_CHANGED')
            before = check_state(args.expected_commit, module, initial['runtime'])
            raw, report = run_command(folder / str(index), module, args.expected_commit, action,
                                      run_id, before, gates, captured)
            if action == 'capture':
                captured = report['source']
            else:
                reports.append(raw)
        require(reports[0] == reports[1], 'STATIC_REPLAY_MISMATCH')
        final = {'status': 'COMPLETE_TWO_IDENTICAL_STATIC_REPORTS', 'commit': args.expected_commit,
                 'finished_at': now(), 'inspection_public_sha256': digest(reports[0]),
                 'scientific_schema_approved': False, 'scientific_replication': False,
                 'scope': 'Fixed-source computational replay of a closed static report; all scientific gates remain blocked.'}
        store(folder / 'final.json', final)
        print(json.dumps(final, sort_keys=True), flush=True)
        return 0
    except Stop as exc:
        final = {'status': 'STOP_PRESERVE_EVIDENCE', 'reason': str(exc), 'finished_at': now(),
                 'no_automatic_retry': True, 'scientific_schema_approved': False}
    except Exception:
        final = {'status': 'STOP_PRESERVE_EVIDENCE', 'reason': 'RECORDER_INTERNAL_FAILURE',
                 'finished_at': now(), 'no_automatic_retry': True, 'scientific_schema_approved': False}
    if folder is not None:
        try:
            store(folder / 'stopped.json', final)
        except Exception:
            pass
    print(json.dumps(final, sort_keys=True), flush=True)
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
