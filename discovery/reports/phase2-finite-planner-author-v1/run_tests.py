"""Record actual isolated candidate executions without changing tracked files."""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

BASE = Path(__file__).resolve().parent
DISCOVERY = BASE.parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def manifest(root):
    return {str(path.relative_to(root)): sha(path)
            for path in sorted(root.rglob('*')) if path.is_file()
            and '__pycache__' not in path.parts and path.suffix != '.pyc'}


def record_json(path, value):
    path.write_text(json.dumps(value, sort_keys=True, indent=2) + '\n')


def execute(name, replace=None, selected=None, expected=0):
    target = BASE / name
    target.mkdir()
    source = DISCOVERY / 'src' / 'lupine_discovery'
    before = manifest(source)
    candidate_before = manifest(BASE / 'promotion')
    runtime = target / 'src' / 'lupine_discovery'
    shutil.copytree(source, runtime, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    shutil.copy2(BASE / 'promotion/src/lupine_discovery/finite_planning.py',
                 runtime / 'finite_planning.py')
    tests = target / 'tests'
    tests.mkdir()
    shutil.copy2(BASE / 'promotion/tests/test_finite_planning.py',
                 tests / 'test_finite_planning.py')
    if replace:
        module = runtime / 'finite_planning.py'
        text = module.read_text()
        old, new = replace
        assert text.count(old) == 1
        module.write_text(text.replace(old, new))
    execution_sources = manifest(target)
    record_json(target / 'source-manifest.json', execution_sources)
    env = os.environ.copy()
    env['PYTHONPATH'] = os.pathsep.join((str(target / 'src'), str(tests)))
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    command = ([sys.executable, '-B', '-m', 'unittest', '-v', selected]
               if selected else
               [sys.executable, '-B', '-m', 'unittest', 'discover', '-s',
                str(tests), '-p', 'test_finite_planning.py', '-v'])
    head_before = subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=DISCOVERY, text=True).strip()
    status_before = subprocess.check_output(
        ['git', 'status', '--porcelain'], cwd=DISCOVERY, text=True)
    start = datetime.now(timezone.utc).isoformat()
    clock = time.monotonic()
    result = subprocess.run(command, cwd=DISCOVERY, env=env, text=True,
                            capture_output=True, timeout=120)
    duration = time.monotonic() - clock
    (target / 'stdout.txt').write_text(result.stdout)
    (target / 'stderr.txt').write_text(result.stderr)
    source_held = all(sha(target / path) == digest
                      for path, digest in execution_sources.items())
    status_after = subprocess.check_output(
        ['git', 'status', '--porcelain'], cwd=DISCOVERY, text=True)
    head_after = subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=DISCOVERY, text=True).strip()
    receipt = {
        'command': command, 'started_at_utc': start,
        'duration_seconds': duration, 'exit_code': result.returncode,
        'expected_exit_code': expected, 'expectation_met': result.returncode == expected,
        'mutation': list(replace) if replace else None,
        'source_held': source_held,
        'tracked_package_unchanged': manifest(source) == before,
        'candidate_unchanged': manifest(BASE / 'promotion') == candidate_before,
        'git_head_before': head_before, 'git_head_after': head_after,
        'git_status_before': status_before, 'git_status_after': status_after,
        'candidate_manifest': candidate_before,
        'scope': 'isolated synthetic executable arithmetic; no scientific observations',
    }
    record_json(target / 'execution.json', receipt)
    print(json.dumps(receipt, sort_keys=True), flush=True)
    if not (receipt['expectation_met'] and source_held
            and receipt['tracked_package_unchanged'] and receipt['candidate_unchanged']):
        raise SystemExit(1)


if __name__ == '__main__':
    execute('author-tests-first')
    execute('mutant-floor',
            ('minimum_failures = -(-(rho.numerator * population) // rho.denominator)',
             'minimum_failures = (rho.numerator * population) // rho.denominator'),
            'test_finite_planning.FinitePlanningWorldTests.test_ceiling_respects_attainable_fractions_and_exact_jump', 1)
    execute('mutant-strict', ('chance <= eta', 'chance < eta'),
            'test_finite_planning.FinitePlanningWorldTests.test_equality_qualifies_and_just_smaller_significance_does_not', 1)
    execute('mutant-iid',
            ('chance = _zero_failure_tail(population, minimum_failures, count)',
             'chance = (1 - rho) ** count'),
            'test_finite_planning.FinitePlanningWorldTests.test_hand_counted_without_replacement_differs_from_iid', 1)
    execute('mutant-last-minimum', ('minimum is None and chance <= eta', 'chance <= eta'),
            'test_finite_planning.FinitePlanningWorldTests.test_minimum_stays_minimum_after_cap_increases', 1)
