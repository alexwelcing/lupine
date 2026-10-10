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
import subprocess
import sys
import tempfile


PROBE = r'''
import json
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
                   'lupine.discovery.projection_problem.v1'}
assert sum(get_case(row['id'])['problem']['schema'] == 'lupine.discovery.coupled_problem.v1'
           for row in catalog) == 3, 'missing coupled demonstration in installed catalog'
assert sum(get_case(row['id'])['problem']['schema'] == 'lupine.discovery.projection_problem.v1'
           for row in catalog) == 3, 'missing scoped projection demonstration in installed catalog'
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
resources = files('lupine_discovery')
for name in ('index.html', 'app.js', 'styles.css'):
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
    for schema in sorted(schemas):
        row = next(row for row in catalog if get_case(row['id'])['problem']['schema'] == schema)
        problem = get_case(row['id'])['problem']
        request = Request(url + '/api/select', data=json.dumps({'problem': problem}).encode(),
                          headers={'Content-Type': 'application/json'})
        with urlopen(request) as response:
            assert json.load(response) == certificate(problem)
    for row in catalog:
        problem = get_case(row['id'])['problem']
        if problem['schema'] not in {'lupine.discovery.coupled_problem.v1', 'lupine.discovery.projection_problem.v1'}:
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
                  'checks': ['all_packaged_cases_select_verify_replay', 'known_answer_oracle_and_controls',
                             'web_assets_and_original_archive_reports', 'constrained_negative_results_packaged_and_served',
                             'installed_http_cli_agreement', 'coupled_python_api_and_missing_point_fallback',
                             'coupled_and_projection_guarded_http_replay_agree_with_installed_cli',
                             'scoped_projection_translation_and_missing_bound_abstention',
               'direct_statistical_pool_python_api_and_distinct_abstention',
                             'training_only_no_go_packaged_and_served']},
                 sort_keys=True))
'''


def checked(command, cwd):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {command[0]}\n"
                           + result.stdout + result.stderr)
    return result.stdout


def run():
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="lupine-distribution-") as temp:
        work = Path(temp)
        wheels = work / "wheels"
        wheels.mkdir()
        checked([sys.executable, "-m", "pip", "wheel", str(root), "--no-deps",
                 "--wheel-dir", str(wheels)], work)
        found = list(wheels.glob("lupine_discovery-*.whl"))
        if len(found) != 1:
            raise RuntimeError("Expected exactly one built discovery wheel")
        wheel = found[0]
        env = work / "venv"
        checked([sys.executable, "-m", "venv", str(env)], work)
        executable = env / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        checked([str(executable), "-m", "pip", "install", "--no-index", "--no-deps", str(wheel)], work)
        report = json.loads(checked([str(executable), "-I", "-c", PROBE], work))
        report.update({"schema": "lupine.discovery.package_verification.v1",
                       "wheel_sha256": hashlib.sha256(wheel.read_bytes()).hexdigest(),
                       "scope": "Isolated wheel and installed HTTP checks; not independent scientific reproduction"})
        return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(".cache/package-verification.json"))
    args = parser.parse_args()
    report = run()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("status", "case_count", "problem_schemas", "checks")}, indent=2))
