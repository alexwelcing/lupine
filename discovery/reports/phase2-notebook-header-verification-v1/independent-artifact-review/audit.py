"""Independent byte audit; never imports or executes retained project contents."""
import argparse
import ast
from collections import Counter
import base64
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import tarfile
import time
import traceback
import zipfile

if not __debug__:
    raise RuntimeError('This independent audit requires Python assertions enabled')

PARSER = argparse.ArgumentParser(description=__doc__)
PARSER.add_argument('--commit', required=True)
PARSER.add_argument('--retained-directory', required=True, type=Path)
PARSER.add_argument('--output-directory', required=True, type=Path)
ARGS = PARSER.parse_args()
ROOT = Path.cwd().resolve()
OUT = ARGS.output_directory.resolve()
RETAINED = ARGS.retained_directory.resolve()
ARTIFACTS = RETAINED / 'artifacts'
COMMIT = ARGS.commit
assert len(COMMIT) == 40 and all(c in '0123456789abcdef' for c in COMMIT)
assert OUT.is_relative_to(Path(__file__).resolve().parent)
assert RETAINED.is_relative_to(ROOT / '.cache')
OUT.mkdir(parents=True, exist_ok=False)
PROBE_SHA = 'a990a5aa825b1ed55caeb2551b86dae3efc4f0e258e95afc696b95f4919415a6'
FINITE_MODULE_SHA = '027785ccdf24f6e8cf9b7a8ac98987b821fcdb19c875bbe8d2ba52d2fc3895f8'
BASELINE_COMMIT = '41d3e31a14bea040fb37b0aa6a650d6d5e704551'
CAP = 256 * 1024 * 1024
HELD_INPUTS = {}
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
    'finite_population_zero_failure_cli_http_exact_scope',
    'optional_mpea_resource_presence_and_http_agreement', 'mpea_javascript_packaged_and_served',
]
COMMANDS = []
SCRIPT_BEFORE = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        assert key not in result, 'Duplicate JSON key'
        result[key] = value
    return result


def capture(path):
    path = Path(path).absolute()
    assert path.resolve() == path and not path.is_symlink()
    assert path.is_file() and path.stat().st_size <= CAP
    raw = path.read_bytes()
    assert len(raw) <= CAP
    hashed = digest(raw)
    if str(path) in HELD_INPUTS:
        assert HELD_INPUTS[str(path)] == hashed
    HELD_INPUTS[str(path)] = hashed
    return raw


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


def audit_finite_contract(sources, probe):
    """Review only source markers/identities; no runtime or browser execution."""
    raw = sources['discovery/src/lupine_discovery/finite_planning.py']
    assert digest(raw) == FINITE_MODULE_SHA
    tree = ast.parse(raw)
    function, = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                 and node.name == 'plan_finite_zero_failure_resolution']
    assert [argument.arg for argument in function.args.args] == [
        'population_panels', 'loss_ceiling', 'significance', 'maximum_evaluation_panels']
    assert not function.args.kwonlyargs and function.args.kwarg is None
    assert function.args.vararg is None
    data, = [node for node in tree.body if isinstance(node, ast.ClassDef)
             and node.name == 'FiniteZeroFailureResolutionPlan']
    fields = [node for node in data.body if isinstance(node, ast.AnnAssign)]
    expected_fields = [
        'population_panels', 'loss_ceiling', 'significance', 'maximum_evaluation_panels',
        'minimum_null_failures', 'attainable_null_failure_fraction',
        'minimum_evaluation_panels', 'zero_failure_null_bound',
        'minimum_zero_failure_null_bound', 'resolution_status',
        'adequacy_status', 'power_status', 'observed_evidence_status', 'premise_status',
        'future_population_risk_status', 'claim_scope', 'sampling_design',
        'null_hypothesis', 'premises', 'maximum_panel_count', 'maximum_input_bits',
    ]
    assert [node.target.id for node in fields] == expected_fields
    defaults = {}
    for field in fields:
        if isinstance(field.value, ast.Call):
            for keyword in field.value.keywords:
                if keyword.arg == 'default' and isinstance(keyword.value, ast.Constant):
                    defaults[field.target.id] = keyword.value.value
    fixed = {
        'adequacy_status': 'unestablished', 'power_status': 'not_computed',
        'observed_evidence_status': 'no_observations',
        'premise_status': 'hypothetical_unverified',
        'future_population_risk_status': 'not_established',
        'claim_scope': 'frozen_residual_finite_population_only',
        'sampling_design': 'uniform_without_replacement',
        'null_hypothesis': 'fixed finite-population failure fraction >= loss_ceiling',
    }
    assert all(defaults.get(name) == value for name, value in fixed.items())
    route = '/api/plan-finite-zero-loss'
    schema = 'lupine.discovery.finite_zero_failure_resolution_plan.v1'
    cli = sources['discovery/src/lupine_discovery/cli.py'].decode()
    server = sources['discovery/src/lupine_discovery/server.py'].decode()
    javascript = sources['discovery/src/lupine_discovery/web/planner.js'].decode()
    html = sources['discovery/src/lupine_discovery/web/index.html'].decode()
    for token in ('plan-finite-zero-loss', '--population-panels', schema,
                  'plan_finite_zero_failure_resolution'):
        assert token in cli
    for token in (route, schema, 'plan_finite_zero_failure_resolution'):
        assert token in server
    assert assignment(server, 'MAX_PLANNING_BODY_BYTES') == 4096
    paths_node, = [node for node in ast.parse(server).body
                   if isinstance(node, ast.Assign)
                   and any(isinstance(target, ast.Name) and target.id == 'PLANNING_PATHS'
                           for target in node.targets)]
    assert isinstance(paths_node.value, ast.Call)
    assert isinstance(paths_node.value.func, ast.Name)
    assert paths_node.value.func.id == 'frozenset'
    assert ast.literal_eval(paths_node.value.args[0]) == {
        '/api/plan-pool', '/api/plan-zero-loss', route}
    for token in (route, schema, "id: 'finite'", 'closed: true', *expected_fields,
                  *fixed.values()):
        assert token in javascript, 'Missing finite interface marker: ' + token
    for token in ('finite-plan-form', 'finite-plan-population', 'finite-plan-maximum',
                  'finite-plan-result', 'finite-plan-download'):
        assert token in html, 'Missing finite form marker: ' + token
    assert route in probe and schema in probe and "planning_command('plan-finite-zero-loss'" in probe
    iid_old = git('show', BASELINE_COMMIT + ':discovery/src/lupine_discovery/study_planning.py')
    assert sources['discovery/src/lupine_discovery/study_planning.py'] == iid_old
    return {'reviewed_finite_module_sha256': FINITE_MODULE_SHA,
            'public_input_names': [argument.arg for argument in function.args.args],
            'dataclass_field_count': len(fields), 'fixed_nonpromotion_fields': fixed,
            'cli_http_schema': schema, 'http_route': route,
            'planning_body_limit': 4096, 'interface_source_markers_present': True,
            'iid_module_unchanged_since': BASELINE_COMMIT,
            'scope': 'Source identity and static markers only; route/browser behavior not reexecuted.'}


def run():
    assert git('rev-parse', 'HEAD').decode().strip() == COMMIT
    assert not git('status', '--porcelain=v1', '--untracked-files=all')
    receipt_bytes = capture(ARTIFACTS / 'release-artifacts.json')
    receipt = json.loads(receipt_bytes, object_pairs_hook=unique_pairs)
    assert canonical(receipt) == receipt_bytes
    body = dict(receipt)
    content_hash = body.pop('content_sha256')
    assert digest(canonical(body)) == content_hash
    assert receipt['source']['git_commit'] == COMMIT
    assert receipt['source']['git_tree'] == git('rev-parse', COMMIT + '^{tree}').decode().strip()
    assert receipt['source']['archive_copyset'] == ['discovery', '.github/workflows/discovery-verify.yml']
    assert receipt['schema'] == 'lupine.discovery.release_artifacts.v1'
    assert receipt['source']['project_path'] == 'discovery'
    assert receipt['source']['worktree_status'] == 'clean'
    assert receipt['source_state_rechecked_after_smoke'] is True
    assert receipt['wheel_build_source'] == 'committed_source_archive'
    raw_artifacts = {}
    for kind in ('wheel', 'source_archive'):
        identity = receipt['artifacts'][kind]
        assert Path(identity['filename']).name == identity['filename']
        raw = capture(ARTIFACTS / identity['filename'])
        assert len(raw) == identity['bytes'] and digest(raw) == identity['sha256']
        raw_artifacts[kind] = raw

    object_format = git('rev-parse', '--show-object-format').decode().strip()
    assert object_format in ('sha1', 'sha256')
    expected = {}
    for line in git('ls-tree', '--full-tree', '-r', '-z', COMMIT, '--', 'discovery', '.github/workflows/discovery-verify.yml').split(b'\0'):
        if not line:
            continue
        metadata, path = line.split(b'\t', 1)
        mode, kind, object_id = metadata.split()
        assert kind == b'blob' and mode in (b'100644', b'100755')
        expected[path.decode()] = object_id.decode()
    assert expected, 'No committed files found in declared source scope'
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
    assert len(sources) == receipt['source']['archived_file_count']
    assert digest(canonical(source_hashes)) == receipt['source']['archived_file_hashes_sha256']

    manifest_path = 'discovery/' + receipt['source']['runtime_manifest']['path']
    assert digest(sources[manifest_path]) == receipt['source']['runtime_manifest']['sha256']
    manifest = json.loads(sources[manifest_path])
    assert len(manifest['files']) == receipt['source']['runtime_manifest']['file_count']
    runtime_count = len(manifest['files'])
    for relative, expected_hash in manifest['files'].items():
        assert source_hashes['discovery/' + relative] == expected_hash
        assert digest(capture(ROOT / relative)) == expected_hash

    wheel_sources, wheel_record_checks = {}, 0
    with zipfile.ZipFile(io.BytesIO(raw_artifacts['wheel'])) as wheel:
        members = wheel.infolist()
        member_names = [m.filename for m in members]
        assert len(member_names) == len(set(member_names))
        wheel_members = len(member_names)
        assert all(not member.is_dir() and not member.flag_bits & 1
                   and stat.S_IFMT(member.external_attr >> 16) in (0, stat.S_IFREG)
                   for member in members)
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

    expected_package_members = {path.removeprefix('discovery/src/')
                                for path in sources
                                if path.startswith('discovery/src/lupine_discovery/')}
    assert set(wheel_sources) == expected_package_members

    crucial = ['finite_planning.py', 'study_planning.py', 'server.py', 'cli.py', 'web/planner.js', 'web/app.js',
               'web/index.html', 'web/styles.css', 'web/mpea.js', 'resources/mpea-t25-v1.json']
    crucial_hashes = {}
    for path in crucial:
        name = 'lupine_discovery/' + path
        assert name in wheel_sources
        expected_hash = wheel_sources[name]
        assert digest(capture(ROOT / 'src' / name)) == expected_hash
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
    assert receipt['verification']['checks'] == CHECKS and len(CHECKS) == 16
    assert receipt['verification']['status'] == 'passed' and receipt['verification']['isolated_install'] is True
    assert type(receipt['verification']['case_count']) is int
    assert receipt['verification']['case_count'] == 28
    assert receipt['verification']['problem_schemas'] == sorted(
        'lupine.discovery.' + name + '.v1' for name in (
            'problem', 'calibrated_problem', 'pareto_problem', 'coupled_problem',
            'projection_problem', 'decision_pool_problem'))
    assert receipt['verification']['wheel_sha256'] == receipt['artifacts']['wheel']['sha256']
    assert assignment(sources['discovery/tests/test_package_retention_review.py'], 'PROBE_SHA256') == PROBE_SHA
    pins = [node.value for node in ast.walk(ast.parse(sources['discovery/tests/test_package_retention.py']))
            if isinstance(node, ast.Constant) and node.value == PROBE_SHA]
    assert pins == [PROBE_SHA]

    finite_contract = audit_finite_contract(sources, probe)
    old_probe = assignment(git('show', BASELINE_COMMIT + ':discovery/scripts/package_smoke.py'), 'PROBE')
    old_assertions = [ast.dump(node) for node in ast.walk(ast.parse(old_probe))
                      if isinstance(node, ast.Assert)]
    new_assertions = [ast.dump(node) for node in ast.walk(ast.parse(probe))
                      if isinstance(node, ast.Assert)]
    assert len(old_assertions) == 63 and len(new_assertions) == 72
    assert not (Counter(old_assertions) - Counter(new_assertions))

    recorded_runs = []
    for index in (0, 1):
        path = RETAINED / f'{index}-execution.json'
        run_bytes = capture(path)
        run = json.loads(run_bytes, object_pairs_hook=unique_pairs)
        assert run['commit'] == COMMIT and run['exit_code'] == 0
        assert run['source_unchanged'] and run['head_unchanged'] and run['worktree_clean']
        assert run['runtime_before'] == run['runtime_after'] == manifest['files']
        for stream in ('stdout', 'stderr'):
            assert digest(capture(RETAINED / f'{index}-{stream}.txt')) == run[stream + '_sha256']
        recorded_runs.append({'receipt': path.relative_to(ROOT).as_posix(), 'sha256': digest(run_bytes),
                              'exit_code': 0, 'elapsed_seconds': run['elapsed_seconds'],
                              'checked_log_hashes': True, 'runtime_count': runtime_count})
    assert all(digest(Path(path).read_bytes()) == expected for path, expected in HELD_INPUTS.items())
    assert digest(Path(__file__).read_bytes()) == SCRIPT_BEFORE
    assert git('rev-parse', 'HEAD').decode().strip() == COMMIT
    assert not git('status', '--porcelain=v1', '--untracked-files=all')
    return {
        'status': 'PASS', 'commit': COMMIT, 'receipt_sha256': digest(receipt_bytes),
        'artifact_identities': receipt['artifacts'], 'source_files_compared_to_git_blobs': len(sources),
        'source_copyset_exact': True, 'no_archive_links_or_cache_members': True,
        'runtime_source_files_matching_manifest_and_worktree': runtime_count,
        'wheel_members': wheel_members, 'wheel_record_content_digests_checked': wheel_record_checks,
        'wheel_package_members_matching_exact_git_source': len(wheel_sources),
        'crucial_finite_planner_and_mpea_files': crucial_hashes, 'preserved_mpea': preserved,
        'mandatory_checks': CHECKS, 'probe_sha256': PROBE_SHA,
        'producer_verifier_receipt_and_two_fixed_pins_agree': True,
        'finite_contract_source_marker_audit': finite_contract,
        'prior_installed_probe_assertions_preserved': len(old_assertions),
        'new_installed_probe_assertions': len(new_assertions) - len(old_assertions),
        'artifact_and_recorded_run_inputs_unchanged_at_end': True,
        'recorded_package_and_strict_verifier_runs': recorded_runs,
        'scope': 'Independent byte identity and recorded installed-engineering consistency audit only.',
        'artifact_contents_executed': False, 'project_modules_imported': False, 'package_or_full_tests_rerun': False,
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
                  command=[sys.executable, str(Path(__file__).resolve()), *sys.argv[1:]])
    destination = OUT / 'review.json'
    with destination.open('x') as stream:
        stream.write(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    sys.exit(status)
