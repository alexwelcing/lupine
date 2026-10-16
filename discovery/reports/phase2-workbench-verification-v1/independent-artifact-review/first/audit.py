"""Independent byte audit; never imports or executes retained project contents."""
import ast
import base64
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
import tarfile
import time
import traceback
import zipfile

ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
RETAINED = ROOT / '.cache/phase2-workbench-clean-package-v1'
ARTIFACTS = RETAINED / 'artifacts'
COMMIT = '41d3e31a14bea040fb37b0aa6a650d6d5e704551'
PROBE_SHA = '0f3a266c196c1b86bc2c77b89026b9c19d5f19dce86d1cbf6d0ea047c476c15a'
CHECKS = [
    'all_packaged_cases_select_verify_replay', 'known_answer_oracle_and_controls',
    'web_assets_and_original_archive_reports', 'constrained_negative_results_packaged_and_served',
    'installed_http_cli_agreement', 'coupled_python_api_and_missing_point_fallback',
    'coupled_projection_and_statistical_guarded_http_replay_agree_with_installed_cli',
    'scoped_projection_translation_and_missing_bound_abstention',
    'direct_statistical_pool_python_api_and_distinct_abstention',
    'training_only_no_go_packaged_and_served',
    'prospective_pool_planning_cli_hypothesis_and_unknown',
    'prospective_zero_failure_resolution_cli_not_observed_power',
    'prospective_planning_http_cli_agreement_and_assets',
    'optional_mpea_resource_presence_and_http_agreement', 'mpea_javascript_packaged_and_served',
]
COMMANDS = []


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def git(*args):
    command = ['git', *args]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, check=True)
    COMMANDS.append({'command': command, 'exit_code': result.returncode,
                     'stdout_bytes': len(result.stdout), 'stdout_sha256': digest(result.stdout),
                     'stderr_sha256': digest(result.stderr)})
    return result.stdout


def assignment(raw, name):
    for node in ast.parse(raw).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError('missing literal assignment: ' + name)


def run():
    assert git('rev-parse', 'HEAD').decode().strip() == COMMIT
    assert not git('status', '--porcelain=v1', '--untracked-files=all')
    receipt_bytes = (ARTIFACTS / 'release-artifacts.json').read_bytes()
    receipt = json.loads(receipt_bytes)
    assert canonical(receipt) == receipt_bytes
    body = dict(receipt)
    content_hash = body.pop('content_sha256')
    assert digest(canonical(body)) == content_hash
    assert receipt['source']['git_commit'] == COMMIT
    assert receipt['source']['git_tree'] == git('rev-parse', COMMIT + '^{tree}').decode().strip()
    assert receipt['source']['archive_copyset'] == ['discovery', '.github/workflows/discovery-verify.yml']
    assert receipt['source_state_rechecked_after_smoke'] is True
    assert receipt['wheel_build_source'] == 'committed_source_archive'
    raw_artifacts = {}
    for kind in ('wheel', 'source_archive'):
        identity = receipt['artifacts'][kind]
        assert Path(identity['filename']).name == identity['filename']
        raw = (ARTIFACTS / identity['filename']).read_bytes()
        assert len(raw) == identity['bytes'] and digest(raw) == identity['sha256']
        raw_artifacts[kind] = raw

    object_format = git('rev-parse', '--show-object-format').decode().strip()
    assert object_format in ('sha1', 'sha256')
    expected = {}
    for line in git('ls-tree', '-r', '-z', COMMIT, '--', 'discovery', '.github/workflows/discovery-verify.yml').split(b'\0'):
        if not line:
            continue
        metadata, path = line.split(b'\t', 1)
        mode, kind, object_id = metadata.split()
        assert kind == b'blob' and mode in (b'100644', b'100755')
        expected[path.decode()] = object_id.decode()
    sources, source_hashes = {}, {}
    with tarfile.open(fileobj=io.BytesIO(raw_artifacts['source_archive']), mode='r:') as archive:
        members = archive.getmembers()
        names = set()
        for member in members:
            path = PurePosixPath(member.name)
            assert not path.is_absolute() and '..' not in path.parts
            assert not set(path.parts).intersection({'.git', '.cache', '.venv', '__pycache__'})
            assert member.name == 'lupine-source' or member.name.startswith('lupine-source/')
            assert member.isdir() or member.isfile()
            assert member.name not in names
            names.add(member.name)
            if member.isdir():
                continue
            relative = member.name.removeprefix('lupine-source/')
            assert relative in expected
            raw = archive.extractfile(member).read()
            assert len(raw) == member.size
            blob = hashlib.new(object_format, b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()
            assert blob == expected[relative], 'Git blob mismatch: ' + relative
            sources[relative] = raw
            source_hashes[relative] = digest(raw)
    assert set(sources) == set(expected)
    assert len(sources) == receipt['source']['archived_file_count'] == 2522
    assert digest(canonical(source_hashes)) == receipt['source']['archived_file_hashes_sha256']

    manifest_path = 'discovery/' + receipt['source']['runtime_manifest']['path']
    assert digest(sources[manifest_path]) == receipt['source']['runtime_manifest']['sha256']
    manifest = json.loads(sources[manifest_path])
    assert len(manifest['files']) == receipt['source']['runtime_manifest']['file_count'] == 306
    for relative, expected_hash in manifest['files'].items():
        assert source_hashes['discovery/' + relative] == expected_hash
        assert digest((ROOT / relative).read_bytes()) == expected_hash

    wheel_sources, wheel_record_checks = {}, 0
    with zipfile.ZipFile(io.BytesIO(raw_artifacts['wheel'])) as wheel:
        members = wheel.infolist()
        member_names = [m.filename for m in members]
        assert len(member_names) == len(set(member_names)) == 114
        for name in member_names:
            path = PurePosixPath(name)
            assert not path.is_absolute() and '..' not in path.parts
            assert not set(path.parts).intersection({'.git', '.cache', '.venv', '__pycache__'})
        record_name, = [name for name in member_names if name.endswith('.dist-info/RECORD')]
        records = list(csv.reader(io.StringIO(wheel.read(record_name).decode())))
        assert len(records) == len({r[0] for r in records}) == len(member_names)
        assert {r[0] for r in records} == set(member_names)
        for name, hashed, size in records:
            raw = wheel.read(name)
            if name == record_name:
                assert hashed == size == ''
            else:
                assert int(size) == len(raw)
                assert hashed == 'sha256=' + base64.urlsafe_b64encode(hashlib.sha256(raw).digest()).decode().rstrip('=')
                wheel_record_checks += 1
            if name.startswith('lupine_discovery/'):
                relative = 'discovery/src/' + name
                assert raw == sources[relative], 'Wheel/source mismatch: ' + name
                wheel_sources[name] = digest(raw)
            else:
                assert name.startswith('lupine_discovery-0.1.0.dist-info/')

    crucial = ['study_planning.py', 'server.py', 'cli.py', 'web/planner.js', 'web/app.js',
               'web/index.html', 'web/styles.css', 'web/mpea.js', 'resources/mpea-t25-v1.json']
    crucial_hashes = {}
    for path in crucial:
        name = 'lupine_discovery/' + path
        assert name in wheel_sources
        expected_hash = wheel_sources[name]
        assert digest((ROOT / 'src' / name).read_bytes()) == expected_hash
        crucial_hashes['src/' + name] = expected_hash
    preserved = {}
    for path in ('web/mpea.js', 'resources/mpea-t25-v1.json'):
        name = 'lupine_discovery/' + path
        old = git('show', '5addf4f80e345afa50a4bcc26b9db24d220a3af5:discovery/src/' + name)
        assert digest(old) == wheel_sources[name]
        preserved[path] = {'sha256': digest(old), 'unchanged_since': '5addf4f80e345afa50a4bcc26b9db24d220a3af5'}

    smoke = sources['discovery/scripts/package_smoke.py']
    probe = assignment(smoke, 'PROBE')
    assert digest(probe.encode()) == PROBE_SHA
    probe_checks = []
    for node in ast.walk(ast.parse(probe)):
        if isinstance(node, ast.Dict):
            for key, value in zip(node.keys, node.values):
                if isinstance(key, ast.Constant) and key.value == 'checks':
                    probe_checks.append(ast.literal_eval(value))
    assert probe_checks == [CHECKS]
    assert assignment(sources['discovery/scripts/verify_retained_artifacts.py'], 'CHECKS') == CHECKS
    assert receipt['verification']['checks'] == CHECKS and len(CHECKS) == 15
    assert receipt['verification']['status'] == 'passed' and receipt['verification']['isolated_install'] is True
    assert receipt['verification']['wheel_sha256'] == receipt['artifacts']['wheel']['sha256']
    assert assignment(sources['discovery/tests/test_package_retention_review.py'], 'PROBE_SHA256') == PROBE_SHA
    pins = [node.value for node in ast.walk(ast.parse(sources['discovery/tests/test_package_retention.py']))
            if isinstance(node, ast.Constant) and node.value == PROBE_SHA]
    assert pins == [PROBE_SHA]

    recorded_runs = []
    for index in (0, 1):
        path = RETAINED / f'{index}-execution.json'
        run = json.loads(path.read_bytes())
        assert run['commit'] == COMMIT and run['exit_code'] == 0
        assert run['source_unchanged'] and run['head_unchanged'] and run['worktree_clean']
        assert run['runtime_before'] == run['runtime_after'] == manifest['files']
        for stream in ('stdout', 'stderr'):
            assert digest((RETAINED / f'{index}-{stream}.txt').read_bytes()) == run[stream + '_sha256']
        recorded_runs.append({'receipt': path.relative_to(ROOT).as_posix(), 'sha256': digest(path.read_bytes()),
                              'exit_code': 0, 'elapsed_seconds': run['elapsed_seconds'],
                              'checked_log_hashes': True, 'runtime_count': 306})
    assert git('rev-parse', 'HEAD').decode().strip() == COMMIT
    assert not git('status', '--porcelain=v1', '--untracked-files=all')
    return {
        'status': 'PASS', 'commit': COMMIT, 'receipt_sha256': digest(receipt_bytes),
        'artifact_identities': receipt['artifacts'], 'source_files_compared_to_git_blobs': len(sources),
        'source_copyset_exact': True, 'no_archive_links_or_cache_members': True,
        'runtime_source_files_matching_manifest_and_worktree': 306,
        'wheel_members': 114, 'wheel_record_content_digests_checked': wheel_record_checks,
        'wheel_package_members_matching_exact_git_source': len(wheel_sources),
        'crucial_planner_and_mpea_files': crucial_hashes, 'preserved_mpea': preserved,
        'mandatory_checks': CHECKS, 'probe_sha256': PROBE_SHA,
        'producer_verifier_receipt_and_two_fixed_pins_agree': True,
        'recorded_package_and_strict_verifier_runs': recorded_runs,
        'scope': 'Independent byte identity and recorded installed-engineering consistency audit only.',
        'artifact_contents_executed': False, 'package_or_full_tests_rerun': False,
        'private_scientific_cache_read': False, 'scientific_replication': False,
        'scientific_claim_changed': False, 'remote_ci_verified_by_this_audit': False,
    }


if __name__ == '__main__':
    started = datetime.now(timezone.utc).isoformat()
    clock = time.monotonic()
    status, result = 1, {}
    try:
        result = run()
        status = 0
    except BaseException:
        result = {'status': 'FAIL', 'failure': traceback.format_exc()}
        traceback.print_exc()
    result.update(started_at=started, finished_at=datetime.now(timezone.utc).isoformat(),
                  elapsed_seconds=time.monotonic() - clock, exit_code=status,
                  audit_script_sha256=digest(Path(__file__).read_bytes()), actual_git_commands=COMMANDS,
                  command=[sys.executable, str(Path(__file__).resolve())])
    destination = OUT / 'review.json'
    with destination.open('x') as stream:
        stream.write(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    sys.exit(status)
