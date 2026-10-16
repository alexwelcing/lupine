#!/usr/bin/env python3
"""Build a wheel and exercise it from an isolated, dependency-free installation.

This verifies distribution contents and installed behavior, not independent
scientific reproduction. No source-tree imports or editable install are used.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tarfile
import tempfile


PROBE = r'''
from hashlib import sha256
import json
import subprocess
from dataclasses import replace
from importlib.resources import files
from pathlib import Path
import sys
import threading
from urllib.request import Request, urlopen

import lupine_discovery
from lupine_discovery.benchmarks import case_catalog, get_case, get_case_outcomes, run_known_answers
from lupine_discovery.cli import certificate, replay_report, verify_certificate
from lupine_discovery.evidence import digest
from lupine_discovery.server import make_server
from lupine_discovery.core import Interval
from lupine_discovery.coupled import Affine, CoupledCandidate, CoupledProblem, screen_coupled
from lupine_discovery.evidence import Scope
from lupine_discovery.decision_pool import (PoolProtocol, RankedPanel, PanelOutcome,
    PanelOutcomes, CalibrationPanel, assess_panel, calibrate_panels, select_pool)
from lupine_discovery.projection import (FieldBlock, FieldScope, Observation, PhysicalContext,
    ProjectionCandidate, ProjectionProblem, QuantityUse, build_projection, screen_projection)

module_path = Path(lupine_discovery.__file__).resolve()
assert Path(sys.prefix).resolve() in module_path.parents, 'package imported outside isolated installation'
catalog = case_catalog()
assert len({row['id'] for row in catalog}) == len(catalog), 'duplicate packaged case ID'
schemas = set()
certificates = {}
replays = {}
for row in catalog:
    problem = get_case(row['id'])['problem']
    selected = certificate(problem)
    assert verify_certificate(problem, selected)['verified'] is True
    outcomes = get_case_outcomes(row['id'], problem)
    replay = replay_report(problem, outcomes)
    schemas.add(problem['schema'])
    certificates[row['id']] = digest(selected)
    replays[row['id']] = digest(replay)
assert schemas == {'lupine.discovery.problem.v1', 'lupine.discovery.calibrated_problem.v1',
                   'lupine.discovery.pareto_problem.v1', 'lupine.discovery.coupled_problem.v1',
                   'lupine.discovery.projection_problem.v1', 'lupine.discovery.decision_pool_problem.v1'}
assert sum(get_case(row['id'])['problem']['schema'] == 'lupine.discovery.coupled_problem.v1'
           for row in catalog) == 3, 'missing coupled demonstration in installed catalog'
assert sum(get_case(row['id'])['problem']['schema'] == 'lupine.discovery.projection_problem.v1'
           for row in catalog) == 3, 'missing scoped projection demonstration in installed catalog'
assert sum(get_case(row['id'])['problem']['schema'] == 'lupine.discovery.decision_pool_problem.v1'
           for row in catalog) == 3, 'missing statistical pool demonstration in installed catalog'
known = run_known_answers()
assert known['summary']['failed'] == 0
assert known['negative_control_metrics']['lost_optimum_cases'] == 2
coupled = CoupledProblem('package-coupled', ('t',), (Interval(0, 2),),
    Scope('package-coupled', 'score', 'utility', 'synthetic package check'), {},
    (CoupledCandidate('A', Affine((1,), 1), {}), CoupledCandidate('B', Affine((1,), 0), {})))
coupled_result = screen_coupled(coupled, (0,))
assert coupled_result.box_selection_diagnostic.retained == ('A', 'B')
assert coupled_result.retained == ('B',)
assert screen_coupled(coupled).retained == ('A', 'B')
projection_context = PhysicalContext('installed-projection', 'synthetic', 'fixed', 'fixed', 'fixed')
projection_scope = FieldScope(projection_context, 'synthetic', '1', 'test', 'constructed', 'fixed')
projection_quantity = Scope('installed-projection', 'score', 'synthetic-unit', 'minimize synthetic value')
projection_block = FieldBlock('local', projection_scope, ('theta',), ('synthetic-unit',),
    (1,), ((1,),), ('z',), (Interval(-1, 1),), 'theta=1+z is an explicit example premise',
    'normalized coordinate is declared inside [-1,1]')
projection_observations = tuple(Observation(name, 'local', projection_scope, projection_quantity,
    nominal, (1,), '1/4', 'constructed discrepancy bound') for name, nominal in (('A', 5), ('B', 4)))
projection_candidates = tuple(ProjectionCandidate(name, projection_context,
    QuantityUse(name, 1, 0, projection_quantity, 'whole-expression identity map'), {}) for name in ('A', 'B'))
projection_problem = ProjectionProblem('installed-projection', projection_quantity, {},
    (projection_block,), projection_observations, projection_candidates, 'same constructed physical context')
projection_build = build_projection(projection_problem)
assert projection_build.model is not None
projection_result = screen_projection(projection_problem, (0, 0, 0))
assert projection_result.retained == ('B',)
assert projection_result.selection.box_selection_diagnostic.retained == ('A', 'B')
projection_unknown = replace(projection_problem, blocks=(replace(projection_block, latent_bounds=(None,)),))
projection_abstention = screen_projection(projection_unknown)
assert projection_abstention.build.model is None and projection_abstention.selection is None
assert projection_abstention.retained == ('A', 'B')
statistical_protocol = PoolProtocol('package-statistical', 'package-statistical',
    'constructed-fixed-order', 'ordinal', 'IDs', 'constructed-panels',
    'Synthetic declaration, no trained model', 'Constructed package probe only',
    Scope('package-statistical', 'score', 'synthetic-unit', 'minimize'), {})
statistical_panel = RankedPanel('calibration-draw', 'two-options', statistical_protocol.protocol_digest,
    'a' * 64, ('A', 'B'), ('A', 'B'))
statistical_truth = PanelOutcomes(statistical_panel.panel_digest, 'constructed exact truth',
    (PanelOutcome('A', 0, {}), PanelOutcome('B', 1, {})))
statistical_calibration = calibrate_panels(statistical_protocol,
    (CalibrationPanel(statistical_panel, statistical_truth),), '1/2')
statistical_future = RankedPanel('future-draw', 'three-options', statistical_protocol.protocol_digest,
    'b' * 64, ('C', 'D', 'E'), ('C', 'D', 'E'))
statistical_decision = select_pool(statistical_calibration, statistical_future)
assert statistical_calibration.status == 'finite_conditional'
assert statistical_decision.retained == ('C',)
assert statistical_decision.guarantee_status == 'conditional_single_panel_marginal'
assert statistical_decision.physical_attestation == 'not_established_by_this_program'
assert not hasattr(statistical_decision, 'regret_bound')
statistical_missing = PanelOutcomes(statistical_panel.panel_digest, 'constructed incomplete truth',
    (PanelOutcome('A', None, {}), PanelOutcome('B', 1, {})))
statistical_unknown = calibrate_panels(statistical_protocol,
    (CalibrationPanel(statistical_panel, statistical_missing),), '1/2')
assert statistical_unknown.n == 1 and statistical_unknown.threshold is None
assert statistical_unknown.status == 'incomplete_calibration'
assert select_pool(statistical_unknown, statistical_future).retained == ('C', 'D', 'E')
statistical_unresolved = calibrate_panels(statistical_protocol, (), '1/20')
assert statistical_unresolved.status == 'insufficient_calibration'
assert select_pool(statistical_unresolved, statistical_future).retained == ('C', 'D', 'E')
def planning_command(*arguments):
    completed = subprocess.run([sys.executable, '-I', '-m', 'lupine_discovery', *arguments],
                               capture_output=True, text=True, check=True, timeout=20)
    return json.loads(completed.stdout)
pool_plan = planning_command('plan-pool', '--calibration-count', '20', '--alpha', '1/10',
                             '--cutoff', '3/4')
assert pool_plan['schema'] == 'lupine.discovery.pool_threshold_plan.v1'
assert pool_plan['plan']['rank'] == 19
assert pool_plan['plan']['threshold_event_probability'] is None
assert pool_plan['plan']['adequacy_status'] == 'unestablished'
assert pool_plan['plan']['calibrated_guarantee_status'] == 'not_established_by_planning'
iid_plan = planning_command('plan-pool', '--calibration-count', '2', '--alpha', '1/2',
                            '--cutoff', '3/4', '--iid-score-probability', '1/2')
assert iid_plan['plan']['threshold_event_probability'] == '1/4'
assert iid_plan['plan']['planning_status'] == 'hypothetical_iid'
resolution_plan = planning_command('plan-zero-loss', '--loss-ceiling', '1/10',
                                   '--significance', '1/20', '--maximum-evaluation-panels', '100')
assert resolution_plan['schema'] == 'lupine.discovery.zero_failure_resolution_plan.v1'
assert resolution_plan['plan']['minimum_evaluation_panels'] == 29
assert resolution_plan['plan']['power_status'] == 'not_computed'
assert resolution_plan['plan']['observed_evidence_status'] == 'no_observations'
finite_plan = planning_command('plan-finite-zero-loss', '--population-panels', '10',
                               '--loss-ceiling', '1/5', '--significance', '1/20',
                               '--maximum-evaluation-panels', '10')
assert finite_plan['schema'] == 'lupine.discovery.finite_zero_failure_resolution_plan.v1'
assert finite_plan['plan']['minimum_null_failures'] == 2
assert finite_plan['plan']['attainable_null_failure_fraction'] == '1/5'
assert finite_plan['plan']['minimum_evaluation_panels'] == 8
assert finite_plan['plan']['minimum_zero_failure_null_bound'] == '1/45'
assert finite_plan['plan']['zero_failure_null_bound'] == '0'
assert finite_plan['plan']['power_status'] == 'not_computed'
assert finite_plan['plan']['observed_evidence_status'] == 'no_observations'
assert finite_plan['plan']['adequacy_status'] == 'unestablished'
def check_optional_mpea(resources, observed_reports, url):
    """Compare installed/served identities only; never infer a scientific verdict."""
    report_resource = resources.joinpath('resources', 'mpea-t25-v1.json')
    present = report_resource.is_file()
    if present:
        packaged = json.loads(report_resource.read_text(encoding='utf-8'))
        assert type(packaged) is dict, 'packaged MPEA report must be a JSON object'
        assert 'mpea_archived' in observed_reports, 'packaged MPEA report missing from HTTP'
        exact = lambda value: json.dumps(value, sort_keys=True, separators=(',', ':'),
                                        ensure_ascii=True, allow_nan=False)
        assert exact(observed_reports['mpea_archived']) == exact(packaged), 'MPEA HTTP payload differs from installed resource'
    else:
        assert 'mpea_archived' not in observed_reports, 'HTTP invented an absent MPEA report'
    asset = resources.joinpath('web', 'mpea.js').read_bytes()
    assert asset, 'missing MPEA JavaScript asset'
    with urlopen(url + '/mpea.js') as response:
        assert response.status == 200 and response.read() == asset, 'MPEA HTTP JavaScript differs from installed asset'
    return {'resource': 'resources/mpea-t25-v1.json',
            'status': 'present_exactly_served' if present else 'absent',
            'javascript': 'packaged_and_exactly_served'}


resources = files('lupine_discovery')
for name in ('index.html', 'app.js', 'styles.css', 'mpea.js'):
    assert resources.joinpath('web', name).read_bytes(), 'missing web asset'
for name in ('archived-v1.json', 'additional-archived-v1.json'):
    assert json.loads(resources.joinpath('resources', name).read_text())
constrained = json.loads(resources.joinpath('resources', 'constrained-v1.json').read_text())
assert constrained['schema'] == 'lupine.discovery.constrained.dashboard.v1'
assert constrained['gates']['observed_primary_screening']['status'] == 'FAIL'
assert constrained['gates']['recommendation_value']['status'] == 'FAIL'
training_tail = json.loads(resources.joinpath('resources', 'training-tail-v1.json').read_text())
assert training_tail['schema'] == 'lupine.discovery.training_tail.dashboard.v1'
assert training_tail['decision']['status'] == 'NO_GO_MODEL_IMPROVEMENT'
assert training_tail['decision']['selected_model'] is None
assert training_tail['reproduction']['execution_status'] == 'COMPLETE_REPRODUCED'
assert len(training_tail['models']) == 4
# Exact public historical artifact; this check does not recompute private labels.
census_raw = resources.joinpath('resources', 'recorded-census-v1.json').read_bytes()
assert sha256(census_raw).hexdigest() == 'a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a'
census = json.loads(census_raw)
assert census['status'] == 'DESCRIPTIVE_CENSUS_COMPLETE'
assert census['scientific_status'] == 'NOT_ADMITTED' and census['actual_reference_choice'] == 'UNKNOWN'
assert census['model_ranking_or_winner'] is None and census['tolerance_success_criterion'] is None
assert census['exposure']['fresh_holdout_claim'] is False
census_asset = resources.joinpath('web', 'recorded-census.js').read_bytes()
assert census_asset, 'missing stored-label census JavaScript'
server = make_server(0)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
url = 'http://127.0.0.1:' + str(server.server_address[1])
try:
    with urlopen(url) as response:
        assert response.status == 200 and b'Lupine' in response.read()
    with urlopen(url + '/api/catalog') as response:
        assert json.load(response)['cases'] == catalog
    with urlopen(url + '/api/benchmarks') as response:
        observed_reports = json.load(response)
        assert observed_reports['constrained_archived'] == constrained
        assert observed_reports['training_tail'] == training_tail
    mpea_check = check_optional_mpea(resources, observed_reports, url)
    assert json.dumps(observed_reports['recorded_census'], sort_keys=True, separators=(',', ':')) == json.dumps(census, sort_keys=True, separators=(',', ':'))
    with urlopen(url + '/recorded-census.js', timeout=10) as response:
        assert response.status == 200 and response.read() == census_asset
    # Compare the exact installed CLI objects to installed guarded HTTP routes.
    planning_requests = [
        ('/api/plan-pool', {'calibration_count': 20, 'alpha': '1/10', 'cutoff': '3/4'}, pool_plan),
        ('/api/plan-pool', {'calibration_count': 2, 'alpha': '1/2', 'cutoff': '3/4',
                            'iid_score_probability': '1/2'}, iid_plan),
        ('/api/plan-zero-loss', {'loss_ceiling': '1/10', 'significance': '1/20',
                                'maximum_evaluation_panels': 100}, resolution_plan),
        ('/api/plan-finite-zero-loss', {'population_panels': 10, 'loss_ceiling': '1/5',
                                       'significance': '1/20', 'maximum_evaluation_panels': 10}, finite_plan),
    ]
    for route, planning_input, expected_plan in planning_requests:
        request = Request(url + route, data=json.dumps(planning_input).encode('utf-8'),
                          headers={'Content-Type': 'application/json'})
        with urlopen(request, timeout=10) as response:
            assert response.status == 200 and json.load(response) == expected_plan
    planner_asset = resources.joinpath('web', 'planner.js').read_bytes()
    assert planner_asset, 'missing prospective planning JavaScript asset'
    with urlopen(url + '/planner.js', timeout=10) as response:
        assert response.status == 200 and response.read() == planner_asset, 'planning HTTP JavaScript differs from installed asset'
    for schema in sorted(schemas):
        row = next(row for row in catalog if get_case(row['id'])['problem']['schema'] == schema)
        problem = get_case(row['id'])['problem']
        envelope = ({'problem_raw': json.dumps(problem)}
                    if schema == 'lupine.discovery.decision_pool_problem.v1' else {'problem': problem})
        request = Request(url + '/api/select', data=json.dumps(envelope).encode(),
                          headers={'Content-Type': 'application/json'})
        with urlopen(request) as response:
            assert json.load(response) == certificate(problem)
    for row in catalog:
        problem = get_case(row['id'])['problem']
        if problem['schema'] not in {'lupine.discovery.coupled_problem.v1', 'lupine.discovery.projection_problem.v1',
                                     'lupine.discovery.decision_pool_problem.v1'}:
            continue
        outcomes = get_case_outcomes(row['id'], problem)
        request = Request(url + '/api/replay',
                          data=json.dumps({'problem_raw': json.dumps(problem),
                                           'outcomes_raw': json.dumps(outcomes)}).encode(),
                          headers={'Content-Type': 'application/json'})
        with urlopen(request) as response:
            assert json.load(response) == replay_report(problem, outcomes)
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)
print(json.dumps({'status': 'passed', 'python': sys.version.split()[0],
                  'isolated_install': True, 'runtime_dependencies': [],
                  'case_count': len(catalog), 'problem_schemas': sorted(schemas),
                  'certificate_digests': certificates, 'replay_digests': replays,
                  'known_answer_summary': known['summary'],
                  'optional_mpea': mpea_check,
                  'checks': ['all_packaged_cases_select_verify_replay', 'known_answer_oracle_and_controls',
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
                             'optional_mpea_resource_presence_and_http_agreement',
                             'mpea_javascript_packaged_and_served',
                             'fixed_stored_census_identity_scope_and_http_asset_agreement']},
                 sort_keys=True))
'''


def checked(command, cwd):
    # An inherited source PYTHONPATH can make pip see the checkout as already
    # installed and skip installing into the fresh venv. Preserve transport and
    # tool settings, but never expose caller module paths to build/install/probe.
    environment = dict(os.environ)
    environment.pop("PYTHONPATH", None)
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True,
                            env=environment)
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {command[0]}\n"
                           + result.stdout + result.stderr)
    return result.stdout


def _git(root, *arguments):
    return subprocess.run(["git", *arguments], cwd=root, check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def _sha256_file(path):
    result = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def _canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"),
                       ensure_ascii=True, allow_nan=False) + "\n").encode("ascii")


def _release_state(root):
    """Opt-in release artifacts require a clean Git checkout and checked manifest."""
    repository = Path(_git(root, "rev-parse", "--show-toplevel").decode().strip()).resolve()
    project = root.resolve().relative_to(repository).as_posix()
    if _git(repository, "status", "--porcelain=v1", "--untracked-files=all"):
        raise RuntimeError("Release retention requires a clean Git worktree, including untracked files; commit or preserve edits separately first")
    commit = _git(repository, "rev-parse", "HEAD").decode("ascii").strip()
    tree = _git(repository, "rev-parse", "HEAD^{tree}").decode("ascii").strip()
    manifest_path = root / "reports/runtime-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    check = json.loads(checked([sys.executable, str(root / "scripts/runtime_manifest.py")], root))
    if check.get("status") != "passed" or check.get("file_count") != len(manifest["files"]):
        raise RuntimeError("Release runtime manifest did not verify")
    copyset = [project]
    workflow = ".github/workflows/discovery-verify.yml"
    if project != "." and _git(repository, "ls-tree", "--name-only", commit, "--", workflow).strip():
        copyset.append(workflow)
    return {"git_commit": commit, "git_tree": tree, "project_path": project,
            "archive_copyset": copyset, "worktree_status": "clean",
            "runtime_manifest": {"path": "reports/runtime-manifest.json",
                "sha256": _sha256_file(manifest_path), "checkpoint": manifest["checkpoint"],
                "file_count": len(manifest["files"])}}


def _source_archive(root, state, work):
    """Archive committed scoped files only, then build from that exact snapshot."""
    repository = Path(_git(root, "rev-parse", "--show-toplevel").decode().strip()).resolve()
    prefix = "lupine-source/"
    archive = work / ("lupine-discovery-source-" + state["git_commit"][:12] + ".tar")
    listing = _git(repository, "ls-tree", "-r", "-z", state["git_commit"], "--", *state["archive_copyset"])
    object_format = _git(repository, "rev-parse", "--show-object-format").decode("ascii").strip()
    if object_format not in {"sha1", "sha256"}:
        raise RuntimeError("Unsupported Git object format for source archive verification")
    expected = set()
    expected_objects = {}
    for record in listing.split(b"\0"):
        if not record:
            continue
        metadata, raw_name = record.split(b"\t", 1)
        mode, kind, object_id = metadata.split()
        name = raw_name.decode("utf-8")
        parts = Path(name).parts
        if (mode not in {b"100644", b"100755"} or kind != b"blob"
                or any(part in {".cache", ".git", ".venv", "__pycache__"} for part in parts)):
            raise RuntimeError("Release source scope contains unsupported links, objects or cache files")
        expected.add(prefix + name)
        expected_objects[prefix + name] = object_id.decode("ascii")
    if not expected:
        raise RuntimeError("Release source archive scope is empty")
    with archive.open("xb") as stream:
        subprocess.run(["git", "archive", "--format=tar", "--prefix=" + prefix,
                        state["git_commit"], "--", *state["archive_copyset"]],
                       cwd=repository, stdout=stream, stderr=subprocess.PIPE, check=True)
    archive_sha256 = _sha256_file(archive)
    destination = work / "source-snapshot"
    destination.mkdir()
    # Git attributes may suppress tracked files; reject incomplete source snapshots.
    # Never follow archive links or extract absolute/parent-relative paths.
    source_hashes = {}
    with tarfile.open(archive, "r:") as bundle:
        members = bundle.getmembers()
        files = [member for member in members if member.isfile()]
        if len(files) != len(expected) or {member.name for member in files} != expected:
            raise RuntimeError("Committed source archive does not contain the full declared copyset")
        for member in members:
            name = Path(member.name)
            if (name.is_absolute() or ".." in name.parts
                    or not (member.name.startswith(prefix) or (member.isdir() and member.name == prefix.rstrip("/")))
                    or not (member.isdir() or member.isfile())):
                raise RuntimeError("Unsafe or unsupported committed source archive entry")
            target = destination / name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                blob_hash = hashlib.new(object_format)
                blob_hash.update(b"blob " + str(member.size).encode("ascii") + b"\0")
                with bundle.extractfile(member) as source, target.open("xb") as output:
                    for chunk in iter(lambda: source.read(1024 * 1024), b""):
                        blob_hash.update(chunk)
                        output.write(chunk)
                if blob_hash.hexdigest() != expected_objects[member.name]:
                    raise RuntimeError("Source archive member differs from its committed Git blob; export substitutions are unsupported")
                target.chmod(member.mode & 0o777)
                source_hashes[member.name[len(prefix):]] = _sha256_file(target)
    _check_worktree_sources(repository, source_hashes)
    build_root = destination / prefix / state["project_path"]
    manifest = json.loads(checked([sys.executable, str(build_root / "scripts/runtime_manifest.py")], build_root))
    if manifest.get("status") != "passed":
        raise RuntimeError("Archived runtime manifest did not verify")
    if _sha256_file(build_root / "reports/runtime-manifest.json") != state["runtime_manifest"]["sha256"]:
        raise RuntimeError("Archived and worktree runtime manifests differ")
    if _sha256_file(archive) != archive_sha256:
        raise RuntimeError("Source archive bytes changed during snapshot validation")
    return archive, build_root, source_hashes, archive_sha256


def _check_worktree_sources(repository, source_hashes):
    # git status can hide assume-unchanged/skip-worktree files. Compare actual
    # scoped bytes to the committed archive before and after the smoke check.
    for relative, expected in source_hashes.items():
        path = repository / relative
        if path.is_symlink() or path.resolve() != path.absolute() or _sha256_file(path) != expected:
            raise RuntimeError("Release working source differs from the committed archive")


def _new_destination(path):
    path = Path(path).absolute()
    if path.exists() or path.is_symlink() or path.resolve() != path:
        raise RuntimeError("Release artifact directory must be new and have no symlinked ancestors")
    return path


def _write_new_file(path, raw):
    """Publish complete bytes atomically without overwriting an existing path."""
    path = _new_destination(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path = _new_destination(path)
    directory_fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    temporary_name = None
    try:
        _new_destination(path)
        captured = os.fstat(directory_fd)
        current = os.stat(path.parent, follow_symlinks=False)
        if (captured.st_dev, captured.st_ino) != (current.st_dev, current.st_ino):
            raise RuntimeError("Artifact publication parent changed before writing")
        while True:
            name = ".lupine-artifact-" + secrets.token_hex(16)
            try:
                fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                             0o600, dir_fd=directory_fd)
                temporary_name = name
                break
            except FileExistsError:
                continue
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        _new_destination(path)
        current = os.stat(path.parent, follow_symlinks=False)
        if (captured.st_dev, captured.st_ino) != (current.st_dev, current.st_ino):
            raise RuntimeError("Artifact publication parent changed during writing")
        os.link(temporary_name, path.name, src_dir_fd=directory_fd,
                dst_dir_fd=directory_fd, follow_symlinks=False)
    finally:
        try:
            if temporary_name is not None:
                os.unlink(temporary_name, dir_fd=directory_fd)
        finally:
            os.close(directory_fd)


def _retain(directory, wheel, archive, archive_sha256, state, report):
    """No overwrite: reserve a new directory; the complete receipt is written last."""
    if _sha256_file(archive) != archive_sha256:
        raise RuntimeError("Source archive bytes changed after snapshot validation")
    directory = _new_destination(directory)
    directory.parent.mkdir(parents=True, exist_ok=True)
    directory = _new_destination(directory)
    directory.mkdir()
    artifacts = {}
    for kind, source in (("wheel", wheel), ("source_archive", archive)):
        target = directory / source.name
        with source.open("rb") as incoming, target.open("xb") as outgoing:
            for chunk in iter(lambda: incoming.read(1024 * 1024), b""):
                outgoing.write(chunk)
        expected = report["wheel_sha256"] if kind == "wheel" else archive_sha256
        if _sha256_file(source) != expected or _sha256_file(target) != expected:
            raise RuntimeError("Retained artifact differs from its tested or committed source")
        artifacts[kind] = {"filename": target.name, "bytes": target.stat().st_size, "sha256": expected}
    if artifacts["wheel"]["sha256"] != report["wheel_sha256"]:
        raise RuntimeError("Retained wheel differs from the exact tested wheel")
    payload = {"schema": "lupine.discovery.release_artifacts.v1", "source": state,
               "source_state_rechecked_after_smoke": True,
               "wheel_build_source": "committed_source_archive",
               "artifacts": artifacts, "verification": report,
               "scope": "Committed source assets and the exact tested wheel; not a bit-reproducible-build claim, Git history bundle, deployment or scientific rerun"}
    receipt = {**payload, "content_sha256": hashlib.sha256(_canonical(payload)).hexdigest()}
    raw = _canonical(receipt)
    receipt_path = directory / "release-artifacts.json"
    _write_new_file(receipt_path, raw)
    return {"directory": str(directory), "receipt": receipt_path.name,
            "receipt_sha256": hashlib.sha256(raw).hexdigest(),
            "git_commit": state["git_commit"], "artifacts": artifacts}


def run(retain_directory=None):
    root = Path(__file__).resolve().parents[1]
    state = None
    if retain_directory is not None:
        retain_directory = _new_destination(retain_directory)
        state = _release_state(root)
    with tempfile.TemporaryDirectory(prefix="lupine-distribution-") as temp:
        work = Path(temp)
        archive, build_root, source_hashes, archive_sha256 = (
            _source_archive(root, state, work) if state else (None, root, None, None))
        wheels = work / "wheels"
        wheels.mkdir()
        checked([sys.executable, "-m", "pip", "wheel", str(build_root), "--no-deps",
                 "--wheel-dir", str(wheels)], work)
        found = list(wheels.glob("lupine_discovery-*.whl"))
        if len(found) != 1:
            raise RuntimeError("Expected exactly one built discovery wheel")
        wheel = found[0]
        tested_wheel_sha256 = _sha256_file(wheel)
        env = work / "venv"
        checked([sys.executable, "-m", "venv", str(env)], work)
        executable = env / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        checked([str(executable), "-m", "pip", "install", "--no-index", "--no-deps", str(wheel)], work)
        report = json.loads(checked([str(executable), "-I", "-c", PROBE], work))
        if state and tested_wheel_sha256 != _sha256_file(wheel):
            raise RuntimeError("Wheel bytes changed during the installed smoke check")
        report.update({"schema": "lupine.discovery.package_verification.v1",
                       "wheel_sha256": _sha256_file(wheel),
                       "scope": "Isolated wheel and installed HTTP checks; not independent scientific reproduction"})
        if state:
            if report.get("status") != "passed" or report.get("isolated_install") is not True:
                raise RuntimeError("Release retention requires a passing isolated smoke report")
            if _release_state(root) != state:
                raise RuntimeError("Release source state changed during the smoke check")
            repository = Path(_git(root, "rev-parse", "--show-toplevel").decode().strip()).resolve()
            _check_worktree_sources(repository, source_hashes)
            state = {**state, "archived_file_count": len(source_hashes),
                     "archived_file_hashes_sha256": hashlib.sha256(_canonical(source_hashes)).hexdigest()}
            report["retention"] = _retain(retain_directory, wheel, archive, archive_sha256, state, dict(report))
        return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path,
                        help="Write the smoke report; defaults to .cache/package-verification.json without retention")
    parser.add_argument("--retain-directory", type=Path,
                        help="Preserve the exact tested wheel, committed source archive and sealed receipt in a NEW directory; requires a clean Git checkout and matching runtime manifest")
    args = parser.parse_args(argv)
    output = args.output
    if args.retain_directory is None:
        output = output or Path(".cache/package-verification.json")
    elif output is not None:
        output = _new_destination(output)
    report = run(args.retain_directory)
    if output is not None:
        if args.retain_directory is not None:
            _write_new_file(output, (json.dumps(report, indent=2, sort_keys=True) + "\n").encode("utf-8"))
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("status", "case_count", "problem_schemas", "checks")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
