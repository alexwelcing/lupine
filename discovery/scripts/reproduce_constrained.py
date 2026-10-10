#!/usr/bin/env python3
"""Rebuild the frozen constrained experiment in a fresh ignored workspace.

This orchestrator reuses only raw source bytes, never prior labels, predictions,
freezes, or scientific reports. Every subprocess and its log is preserved. A
failed scientific gate is a valid reproducible result, not a workflow error.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
SOURCE_FORMAT = 'nonfinite-sentinels'
TEST_PATTERN = 'test_constrained*.py'


class WorkflowFailure(RuntimeError):
    pass


class ScientificDigestMismatch(WorkflowFailure):
    pass


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def _write_new_json(path, value):
    with Path(path).open('xb') as stream:
        stream.write(canonical_bytes(value))


def _load_script(name, root):
    directory = str(Path(root) / 'scripts')
    if directory not in sys.path:
        sys.path.insert(0, directory)
    return importlib.import_module(name)


def _verify_installation(root):
    import lupine_discovery
    expected = (Path(root) / 'src/lupine_discovery/__init__.py').resolve()
    actual = Path(lupine_discovery.__file__).resolve()
    if actual != expected:
        raise WorkflowFailure('Install this checkout with python -m pip install -e . before reproduction; '
                              'the active Python package does not come from this source tree.')
    return {'python_executable': sys.executable, 'python_version': sys.version,
            'package_path': str(actual), 'installation': 'verified_editable_checkout'}


def source_fingerprint(root):
    root = Path(root)
    paths = set((root / 'src/lupine_discovery').rglob('*.py'))
    paths.update((root / 'scripts').glob('constrained*.py'))
    paths.update((root / 'tests').glob(TEST_PATTERN))
    paths.update(root / name for name in (
        'scripts/reproduce_constrained.py', 'tests/test_reproduce_constrained.py',
        'docs/constrained-benchmark-protocol.md', 'docs/constrained-source-audit.md',
        'docs/constrained-format-amendment.md', 'pyproject.toml'))
    return {path.relative_to(root).as_posix(): sha256_file(path) for path in sorted(paths)}


def _changed_sources(before, after):
    return sorted(name for name in before.keys() | after.keys() if before.get(name) != after.get(name))


def _run_command(command, cwd, log_path):
    """Argument-vector execution, no shell interpolation or inherited stdin."""
    with Path(log_path).open('xb') as log:
        result = subprocess.run(command, cwd=cwd, stdin=subprocess.DEVNULL,
                                stdout=log, stderr=subprocess.STDOUT, check=False)
    return result.returncode


def _raw_source_copy(source_cache, artifacts, producer):
    """Only two literal raw-source filenames are eligible for reuse."""
    source = Path(source_cache).resolve()
    archive = source / producer.ZIP_NAME
    if not source.is_dir() or not archive.is_file():
        raise WorkflowFailure('--source-cache must contain the pinned raw ZIP filename')
    copied = []
    for name in (producer.ZIP_NAME, producer.MEMBER_NAME):
        original = source / name
        if original.is_file():
            destination = artifacts / name
            with original.open('rb') as incoming, destination.open('xb') as outgoing:
                shutil.copyfileobj(incoming, outgoing, 1024 * 1024)
            copied.append({'name': name, 'bytes': destination.stat().st_size,
                           'sha256': sha256_file(destination)})
    return {'source_cache': str(source), 'copied': copied,
            'verification': 'Pinned ZIP size/MD5 and ZIP-member agreement are checked by acquire before custody.',
            'labels_predictions_freezes_or_reports_reused': False}


def _test_count(log_path):
    text = Path(log_path).read_text(encoding='utf-8', errors='replace')
    summaries = re.findall(r'^Ran ([0-9]+) tests? in [^\r\n]+\r?\n(?:[ \t]*\r?\n)*([^\r\n]+)',
                            text, flags=re.MULTILINE)
    if not summaries or int(summaries[-1][0]) < 1 or summaries[-1][1] != 'OK':
        raise WorkflowFailure('A successful, nonempty, unskipped unittest completion was not found in the engineering log.')
    return int(summaries[-1][0])


def _report_summary(path, root):
    """Validate the completed report before extracting public result identities."""
    dashboard = _load_script('constrained_dashboard', root)
    raw = Path(path).read_bytes()
    report = dashboard.verify_full_report(raw)
    return {'scientific_result_sha256': report['scientific_result_sha256'],
            'report_content_sha256': report['report_content_sha256'],
            'full_report_bytes_sha256': hashlib.sha256(raw).hexdigest(),
            'panel_count': len(report['panels']),
            'gate_statuses': {name: gate['status'] for name, gate in report['gates'].items()},
            'source_receipt_sha256': report['source_receipt_sha256'],
            'model_digest': report['model_digest'], 'prediction_sha256': report['prediction_sha256'],
            'resources': report['resources']}


def run_workflow(workdir, source_cache=None, project_dashboard=False, expected_scientific_digest=None,
                 *, root=ROOT, executor=None, producer=None):
    """Execute the existing scientific CLIs in order, stopping on any failure.

    `root`, `executor`, and `producer` are injection points for workflow tests;
    the user CLI exposes none of these. Every user-selected output remains in
    a new descendant of this checkout's ignored .cache directory.
    """
    root = Path(root).resolve()
    requested = Path(workdir)
    workdir = (root / requested).resolve() if not requested.is_absolute() else requested.resolve()
    cache_root = (root / '.cache').resolve()
    if not cache_root.is_relative_to(root):
        raise WorkflowFailure('the checkout .cache directory must not resolve outside the source tree')
    if workdir == cache_root or not workdir.is_relative_to(cache_root):
        raise WorkflowFailure('--workdir must be a fresh descendant of this checkout\'s .cache directory')
    if workdir.exists():
        raise FileExistsError('workdir already exists; preserve it and choose a fresh reproduction directory')
    if expected_scientific_digest is not None:
        if not isinstance(expected_scientific_digest, str) or not re.fullmatch('[0-9a-fA-F]{64}', expected_scientific_digest):
            raise ValueError('--expected-scientific-digest must be a 64-digit SHA-256 hexadecimal string')
        expected_scientific_digest = expected_scientific_digest.lower()
    environment = _verify_installation(root)
    producer = _load_script('constrained_benchmark', root) if producer is None else producer
    protocol = producer.protocol_identity()
    required = {'protocol_id', 'protocol_commit', 'protocol_sha256',
                'format_amendment_commit', 'format_amendment_sha256'}
    if not required <= set(protocol) or any(not isinstance(protocol[key], str) or not protocol[key] for key in required):
        raise WorkflowFailure('the original protocol and committed format amendment must both be bound')
    before = source_fingerprint(root)
    if not any(name.startswith('tests/test_constrained') for name in before):
        raise WorkflowFailure('constrained engineering test sources are missing')
    workdir.mkdir(parents=True, exist_ok=False)
    artifacts, logs = workdir / 'artifacts', workdir / 'logs'
    artifacts.mkdir()
    logs.mkdir()
    started = {'schema': 'lupine.discovery.constrained.reproduction-start.v1',
               'status': 'started', 'started_utc': datetime.now(timezone.utc).isoformat(),
               'protocol': protocol, 'source_format': SOURCE_FORMAT,
               'workdir': str(workdir), 'environment': environment,
               'source_sha256': before, 'expected_scientific_digest': expected_scientific_digest,
               'raw_source_reuse_requested': source_cache is not None,
               'scientific_limits': 'Same public archive and frozen protocol; not an independent source replication.'}
    _write_new_json(workdir / 'workflow-start.json', started)
    execute = _run_command if executor is None else executor
    completed = []
    current_stage = 'raw_source_reuse'

    def stage(name, command):
        nonlocal current_stage
        current_stage = name
        prior = source_fingerprint(root)
        changed = _changed_sources(before, prior)
        if changed:
            raise WorkflowFailure('source changed before stage ' + name + ': ' + ', '.join(changed))
        order = len(completed) + 1
        log_path = logs / f'{order:02d}-{name}.log'
        _write_new_json(workdir / f'{order:02d}-{name}-start.json', {
            'stage': name, 'command': command, 'cwd': str(root), 'log': str(log_path.relative_to(workdir)),
            'source_sha256_before': prior})
        print(json.dumps({'stage': name, 'status': 'running', 'log': str(log_path)}, sort_keys=True), flush=True)
        exit_code = execute(command, root, log_path)
        after = source_fingerprint(root)
        changed = _changed_sources(prior, after)
        record = {'stage': name, 'command': command, 'exit_code': exit_code,
                  'log': str(log_path.relative_to(workdir)), 'log_sha256': sha256_file(log_path),
                  'source_sha256_before': prior, 'source_sha256_after': after, 'changed_sources': changed}
        _write_new_json(workdir / f'{order:02d}-{name}-result.json', record)
        completed.append(record)
        if exit_code != 0:
            raise WorkflowFailure(f'{name} exited with code {exit_code}; preserved log: {log_path}')
        if changed:
            raise WorkflowFailure('source changed during stage ' + name + ': ' + ', '.join(changed))
        print(json.dumps({'stage': name, 'status': 'passed'}, sort_keys=True), flush=True)
        return record, log_path

    try:
        if source_cache is not None:
            _write_new_json(workdir / 'raw-source-reuse.json', _raw_source_copy(source_cache, artifacts, producer))
        benchmark = [sys.executable, 'scripts/constrained_benchmark.py']
        stage('acquire', [*benchmark, 'acquire', '--cache', str(artifacts), '--source-format', SOURCE_FORMAT])
        stage('freeze', [*benchmark, 'freeze', '--cache', str(artifacts)])
        stage('verify', [*benchmark, 'verify', '--cache', str(artifacts)])
        test_command = [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', TEST_PATTERN, '-v']
        test_result, test_log = stage('engineering-tests', test_command)
        engineering = {'schema': 'lupine.discovery.engineering-validation.v1',
                       'status': 'passed', 'command': test_command, 'exit_code': 0,
                       'source_sha256': test_result['source_sha256_after'],
                       'result_log_path': test_log.relative_to(root).as_posix(),
                       'result_log_sha256': sha256_file(test_log), 'test_count': _test_count(test_log)}
        engineering_path = workdir / 'engineering-validation.json'
        _write_new_json(engineering_path, engineering)
        full_report = artifacts / 'constrained-full.json'
        stage('replay', [sys.executable, 'scripts/constrained_replay.py', str(artifacts / 'freeze.json'),
                         '--output', str(full_report), '--engineering-validation', str(engineering_path)])
        current_stage = 'verify_completed_report'
        summary = _report_summary(full_report, root)
        if _changed_sources(before, source_fingerprint(root)):
            raise WorkflowFailure('source changed during completed report verification')
        _write_new_json(workdir / 'scientific-result.json', summary)
        comparison = {'expected': expected_scientific_digest, 'actual': summary['scientific_result_sha256'],
                      'status': 'not_requested' if expected_scientific_digest is None else
                      'MATCH' if summary['scientific_result_sha256'] == expected_scientific_digest else 'MISMATCH'}
        _write_new_json(workdir / 'scientific-digest-comparison.json', comparison)
        if comparison['status'] == 'MISMATCH':
            current_stage = 'scientific_digest_comparison'
            raise ScientificDigestMismatch('reproduced scientific identity differs from the requested identity; '
                                            'both identities and all run artifacts are preserved')
        if project_dashboard:
            derived = workdir / 'derived'
            derived.mkdir()
            stage('dashboard', [sys.executable, 'scripts/constrained_dashboard.py', str(full_report),
                                 '--output', str(derived / 'constrained-dashboard.json'),
                                 '--resource', str(derived / 'constrained-resource.json'),
                                 '--full-artifact', str(artifacts / 'constrained-full.json.gz')])
        result = {'schema': 'lupine.discovery.constrained.reproduction.v1', 'status': 'complete',
                  'protocol': protocol, 'source_format': SOURCE_FORMAT,
                  'scientific_result': summary, 'digest_comparison': comparison,
                  'engineering_validation': str(engineering_path.relative_to(workdir)),
                  'full_report': str(full_report.relative_to(workdir)),
                  'dashboard_created': bool(project_dashboard),
                  'completed_stages': [record['stage'] for record in completed],
                  'scientific_gate_failures_are_preserved_results': True,
                  'interpretation': 'Same-protocol computational reproduction; no new-data or independent replication claim.'}
        _write_new_json(workdir / 'workflow-result.json', result)
        return result
    except BaseException as error:
        _write_new_json(workdir / 'workflow-failed.json', {
            'schema': 'lupine.discovery.constrained.reproduction-failure.v1',
            'status': 'stopped', 'stage': current_stage, 'error_type': type(error).__name__,
            'message': str(error), 'completed_stages': [record['stage'] for record in completed],
            'preservation': 'All logs, receipts and artifacts remain; choose a fresh workdir for a new attempt.'})
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workdir', type=Path, required=True,
                        help='A new directory beneath discovery/.cache; existing paths are never reused')
    parser.add_argument('--source-cache', type=Path,
                        help='Optional read-only raw ZIP/member cache; labels and fitted artifacts are never copied')
    parser.add_argument('--project-dashboard', action='store_true',
                        help='Also create compact views and compressed full report inside workdir only')
    parser.add_argument('--expected-scientific-digest',
                        help='Optional scientific SHA-256 to compare; mismatch stops with both values preserved')
    args = parser.parse_args(argv)
    try:
        result = run_workflow(args.workdir, args.source_cache, args.project_dashboard,
                              args.expected_scientific_digest)
    except Exception as error:
        print(json.dumps({'status': 'stopped', 'error': str(error)}, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps({'status': result['status'],
                      'scientific_result_sha256': result['scientific_result']['scientific_result_sha256'],
                      'gate_statuses': result['scientific_result']['gate_statuses'],
                      'digest_comparison': result['digest_comparison']}, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
