"""Audit only public aggregate/execution evidence; never open private vectors."""
from pathlib import Path
from collections import Counter
from datetime import datetime
import hashlib
import importlib.util
import json
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path('/workspace/lupine-discovery-branch/discovery')
RUN = ROOT / '.cache/mpea-features/production-5b1ed62-v1'
OUT = Path(__file__).resolve().parent
COMMIT = '5b1ed62f1c7f0010682ce3f554e2430f103e4709'
WRAPPER = ROOT / '.cache/run-feature-production-v1.py'
EVIDENCE = [RUN / name for name in ('reproduction.json', 'ci-verification.json')]
EVIDENCE += [RUN / f'process-{i}' / name for i in (1, 2)
             for name in ('readiness.json', 'execution.json', 'stdout.txt', 'stderr.txt')]
ALLOWED_CACHE = {*EVIDENCE, WRAPPER, Path(__file__).resolve()}
OPENED_CACHE = set()


def guard(event, args):
    if event != 'open' or not isinstance(args[0], (str, bytes, Path)):
        return
    path = Path(args[0].decode() if isinstance(args[0], bytes) else args[0]).absolute()
    if ROOT / '.cache' in path.parents:
        if path.resolve() != path:
            raise AssertionError('Symlink cache access forbidden')
        if path not in ALLOWED_CACHE and path.parent != OUT:
            raise AssertionError('Non-allowlisted cache access forbidden')
        OPENED_CACHE.add(str(path.relative_to(ROOT)))


sys.addaudithook(guard)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            assert key not in result, 'Duplicate JSON key'
            result[key] = value
        return result
    def reject(value):
        raise AssertionError('Nonfinite JSON')
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=reject)


def instant(text):
    value = datetime.fromisoformat(text.replace('Z', '+00:00'))
    assert value.tzinfo is not None
    return value


def audit():
    captures = {path: path.read_bytes() for path in [*EVIDENCE, WRAPPER]}
    reproduction = strict_json(captures[RUN / 'reproduction.json'])
    assert set(reproduction) == {'schema', 'status', 'producer_commit', 'ci_run', 'ci_sha256',
                                'ci_verified_before_first_execution', 'started_at', 'finished_at',
                                'executions', 'local_bytes_identical', 'public_bytes_identical',
                                'runtime_manifest_sha256', 'implementation_files', 'wrapper_sha256',
                                'row_count', 'counts', 'scope', 'private_vectors_published'}
    assert reproduction['schema'] == 'lupine.discovery.mpea.features.reproduction.v1'
    ci = strict_json(captures[RUN / 'ci-verification.json'])
    publics = [strict_json(captures[RUN / f'process-{i}/readiness.json']) for i in (1, 2)]
    public = publics[0]
    assert captures[RUN / 'process-1/readiness.json'] == captures[RUN / 'process-2/readiness.json']
    assert reproduction['producer_commit'] == public['implementation']['commit'] == COMMIT
    assert reproduction['wrapper_sha256'] == sha(captures[WRAPPER])
    assert reproduction['ci_sha256'] == sha(captures[RUN / 'ci-verification.json'])
    assert reproduction['ci_run'] == 38083897613
    assert ci['headSha'] == COMMIT and ci['status'] == 'completed' and ci['conclusion'] == 'success'
    assert len(ci['jobs']) == 4
    assert {job['name'] for job in ci['jobs']} == {'lean', 'browser', 'python (3.11)', 'python (3.12)'}
    assert all(job['status'] == 'completed' and job['conclusion'] == 'success' for job in ci['jobs'])
    first = instant(reproduction['executions'][0]['started_at'])
    assert max(instant(job['completedAt']) for job in ci['jobs']) < first
    assert instant(ci['updatedAt']) < instant(reproduction['started_at']) <= first
    assert reproduction['ci_verified_before_first_execution'] is True
    bindings = public['implementation']['files']
    assert len(bindings) == 41 and bindings == reproduction['implementation_files']
    for relative, expected in bindings.items():
        path = ROOT / relative
        assert not Path(relative).is_absolute() and '..' not in Path(relative).parts
        assert path.resolve() == path and not path.is_symlink()
        raw = path.read_bytes()
        assert sha(raw) == expected, relative
        pinned = subprocess.check_output(['git', 'show', COMMIT + ':discovery/' + relative], cwd=ROOT.parent)
        assert raw == pinned, relative
        captures[path] = raw
    for relative, expected in public['inputs']['files'].items():
        assert sha(captures[ROOT / relative]) == expected
    manifest = subprocess.check_output(['git', 'show', COMMIT + ':discovery/reports/runtime-manifest.json'], cwd=ROOT.parent)
    assert sha(manifest) == reproduction['runtime_manifest_sha256']
    spec = importlib.util.spec_from_file_location('reviewed_feature_reader', ROOT / 'scripts/mpea_feature_reader.py')
    reader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(reader)
    context = reader.load_context()  # Only pinned public references and source modules.
    for report in publics:
        assert reader.validate_public_report(report, _context=context) is True
        assert report['content_sha256'] == sha(canonical({k: v for k, v in report.items() if k != 'content_sha256'}))
    metadata = strict_json(captures[ROOT / 'reports/mpea-row-metadata-v1.json'])
    assert len(metadata['rows']) == metadata['row_count'] == public['row_count'] == reproduction['row_count'] == 1545
    processing = Counter(row['processing']['value'] if row['processing']['status'] == 'KNOWN' else 'UNRESOLVED'
                         for row in metadata['rows'])
    unknown_sources = sum(row['source']['status'] == 'UNRESOLVED' for row in metadata['rows'])
    assert dict(processing) == public['counts']['processing_category_counts']
    assert unknown_sources == public['counts']['unknown_source_rows'] == 1
    assert public['counts'] == reproduction['counts']
    assert public['counts']['composition_status_counts'] == {'KNOWN': 1545, 'UNRESOLVED': 0, 'UNRESOLVED_LIMIT': 0}
    assert public['counts']['composition_reason_counts'] == {'DECLARED_COEFFICIENTS_NORMALIZED': 1545}
    assert all(sum(public['counts'][key].values()) == 1545 for key in
               ('composition_status_counts', 'composition_reason_counts', 'processing_category_counts'))
    assert public['scope'] == reproduction['scope'] == reader.FIXED_SCOPE
    assert public['status'] == 'FEATURES_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED'
    assert reproduction['status'] == 'FEATURES_REPRODUCED_SCIENTIFIC_SCHEMA_UNRESOLVED'
    assert public['all_rows_preserved'] is True and public['per_row_features_published'] is False
    assert reproduction['private_vectors_published'] is False
    assert reproduction['local_bytes_identical'] is True and reproduction['public_bytes_identical'] is True
    assert len(reproduction['executions']) == 2
    for i, record in enumerate(reproduction['executions'], 1):
        directory = RUN / f'process-{i}'
        execution = strict_json(captures[directory / 'execution.json'])
        assert set(execution) == {'command', 'exit_code', 'started_at', 'finished_at',
                                  'wall_seconds', 'stdout_sha256', 'stderr_sha256'}
        assert execution == {k: v for k, v in record.items() if k not in
                             {'local_bytes', 'local_sha256', 'public_bytes', 'public_sha256'}}
        assert execution['exit_code'] == 2 and captures[directory / 'stderr.txt'] == b''
        for stream in ('stdout', 'stderr'):
            assert execution[stream + '_sha256'] == sha(captures[directory / (stream + '.txt')])
        assert strict_json(captures[directory / 'stdout.txt']) == {
            'status': public['status'], 'reason': public['reason'],
            'receipt_sha256': sha(captures[directory / 'readiness.json'])}
        assert record['public_sha256'] == sha(captures[directory / 'readiness.json'])
        assert record['public_bytes'] == len(captures[directory / 'readiness.json'])
        assert record['local_sha256'] == public['local_artifact_identity']['sha256']
        assert record['local_bytes'] == public['local_artifact_identity']['bytes']
        assert instant(record['started_at']) < instant(record['finished_at']) <= instant(reproduction['finished_at'])
        assert record['wall_seconds'] > 0
        command = record['command']
        assert command[1:] == ['scripts/mpea_feature_reader.py', '--local-output',
                               str((directory / 'local.json').relative_to(ROOT)), '--public-output',
                               str((directory / 'readiness.json').relative_to(ROOT))]
    assert instant(reproduction['executions'][0]['finished_at']) <= instant(reproduction['executions'][1]['started_at'])
    assert all(path.read_bytes() == raw for path, raw in captures.items())
    return {'schema': 'lupine.discovery.mpea.feature_public_result_review.v1',
            'status': 'PASS_PUBLIC_EVIDENCE_AUDIT', 'producer_commit': COMMIT,
            'ci_run': 38083897613, 'implementation_files_verified': len(bindings),
            'public_bytes_identical_independently_verified': True,
            'public_sha256': sha(captures[RUN / 'process-1/readiness.json']),
            'public_content_sha256': public['content_sha256'],
            'row_count': public['row_count'], 'counts': public['counts'],
            'processing_and_unknown_source_counts_recomputed_from_public_metadata': True,
            'all_four_recorded_ci_jobs_completed_before_both_executions': True,
            'latest_recorded_ci_job_completion': max(job['completedAt'] for job in ci['jobs']),
            'first_execution_started_at': reproduction['executions'][0]['started_at'],
            'closed_public_report_validation': True, 'scope': public['scope'],
            'evidence_unchanged_during_check': True,
            'local_artifact_identity_from_receipts_only': public['local_artifact_identity'],
            'local_artifacts_opened': False, 'raw_scientific_cache_opened': False,
            'limits': ['CI chronology is checked against the retained CI response, not a new remote query.',
                       'Private vector equality and normalization are producer/wrapper attestations; private local artifacts were not opened.',
                       'Aggregate known counts establish declared-coefficient feature availability only, not physical composition, target completeness, eligibility, independence, or predictive usefulness.',
                       'No actual extraction, fitting, allocation, target interpretation or scientific workload was repeated.'],
            'checker_sha256': sha(Path(__file__).read_bytes()),
            'input_sha256': {str(path.relative_to(ROOT)): sha(raw) for path, raw in sorted(captures.items())},
            'cache_files_opened': sorted(OPENED_CACHE)}


if __name__ == '__main__':
    result = audit()
    with (OUT / 'review-v1.json').open('xb') as stream:
        stream.write((json.dumps(result, sort_keys=True, indent=2) + '\n').encode())
    print(json.dumps({'status': result['status'], 'row_count': result['row_count'],
                      'source_files': result['implementation_files_verified'],
                      'public_sha256': result['public_sha256']}, sort_keys=True))
