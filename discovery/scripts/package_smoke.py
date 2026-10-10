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
known = run_known_answers()
assert known['summary']['failed'] == 0
assert known['negative_control_metrics']['lost_optimum_cases'] == 2
resources = files('lupine_discovery')
for name in ('index.html', 'app.js', 'styles.css'):
    assert resources.joinpath('web', name).read_bytes(), 'missing web asset'
for name in ('archived-v1.json', 'additional-archived-v1.json'):
    assert json.loads(resources.joinpath('resources', name).read_text())
constrained = json.loads(resources.joinpath('resources', 'constrained-v1.json').read_text())
assert constrained['schema'] == 'lupine.discovery.constrained.dashboard.v1'
assert constrained['gates']['observed_primary_screening']['status'] == 'FAIL'
assert constrained['gates']['recommendation_value']['status'] == 'FAIL'
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
        assert json.load(response)['constrained_archived'] == constrained
    for schema in sorted(schemas):
        row = next(row for row in catalog if get_case(row['id'])['problem']['schema'] == schema)
        problem = get_case(row['id'])['problem']
        request = Request(url + '/api/select', data=json.dumps({'problem': problem}).encode(),
                          headers={'Content-Type': 'application/json'})
        with urlopen(request) as response:
            assert json.load(response) == certificate(problem)
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
                             'installed_http_cli_agreement']},
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
