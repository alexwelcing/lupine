"""One-time root verification and byte-preserving publication of safe receipts."""
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

project = Path.cwd()
source = Path('/workspace/lupine-release-reproduction/discovery')
attempt = 'local-20261010T194558Z-58801'
prep = source / '.cache/reproduction-preparation' / attempt
manifest_raw = (prep / 'publishable-artifacts-v2.json').read_bytes()
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(manifest_raw) == '92d1c53f79ca8ae28e985f582b8b8ebfcd69bd549ecc8b507168d0b088088c2e'
manifest = json.loads(manifest_raw)
assert len(manifest['files']) == 37
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip() == manifest['source_commit']
subprocess.run(['git', 'diff', '--exit-code', 'HEAD', '--'], cwd=source, check=True, stdout=subprocess.DEVNULL)
raw = {}
for name, record in manifest['files'].items():
    path = source / name
    assert path.resolve().is_relative_to(source.resolve()) and not path.is_symlink()
    data = path.read_bytes()
    assert sha(data) == record['sha256'] and len(data) == record['bytes']
    raw[name] = data

cp = '.cache/reproduce-jarvis-' + attempt + '/'
tp = '.cache/training-tail/jarvis-training-tail-v1-' + attempt + '/'
read = lambda name: json.loads(raw[name])
start, result = read(cp + 'workflow-start.json'), read(cp + 'workflow-result.json')
assert result['status'] == 'complete'
stages = ['acquire', 'freeze', 'verify', 'engineering-tests', 'replay', 'dashboard']
assert result['completed_stages'] == stages
for name, digest in start['source_sha256'].items():
    assert sha((source / name).read_bytes()) == digest
for i, name in enumerate(stages, 1):
    rec = read(cp + f'{i:02}-{name}-result.json')
    assert rec['exit_code'] == 0 and rec['changed_sources'] == []
    assert rec['source_sha256_before'] == rec['source_sha256_after'] == start['source_sha256']
    assert sha((source / cp / rec['log']).read_bytes()) == rec['log_sha256']
assert read(cp + 'scientific-digest-comparison.json') == {
    'status': 'MATCH', 'expected': 'cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900',
    'actual': 'cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900'}
assert read(cp + 'scientific-result.json')['gate_statuses'] == {
    'engineering_integrity': 'PASS', 'nontrivial_constrained_evidence': 'PASS',
    'observed_primary_screening': 'FAIL', 'recommendation_value': 'FAIL', 'shift_behavior': 'PASS'}
reproduction = read(tp + 'reproduction.json')
fields = ('protocol_id', 'protocol_commit', 'protocol_sha256', 'input_sha256',
          'implementation_sha256', 'fold_manifest_sha256', 'metadata_artifact_sha256',
          'metrics', 'decision', 'prediction_sha256')
passes = [read(tp + f'pass-{i}/pass-receipt.json') for i in (1, 2)]
for i, receipt in enumerate(passes, 1):
    assert sha(raw[tp + f'pass-{i}/pass-receipt.json']) == reproduction['pass_receipt_sha256'][i-1]
    data = (json.dumps({key: receipt[key] for key in fields}, sort_keys=True,
                       separators=(',', ':'), ensure_ascii=False, allow_nan=False) + '\n').encode()
    assert sha(data) == receipt['scientific_result_sha256'] == '60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656'
    assert receipt['decision']['status'] == 'NO_GO_MODEL_IMPROVEMENT'
    assert receipt['decision']['selected_model'] is None
    assert receipt['opened_original_input_files'] == sorted(receipt['input_sha256'])
    assert len(receipt['input_sha256']) == 4
    for name, digest in receipt['input_sha256'].items():
        assert sha((source / cp / 'artifacts' / name).read_bytes()) == digest
    assert all(receipt[key] is False for key in ('calibration_targets_opened', 'evaluation_targets_opened', 'new_coverage_claim'))
assert all(passes[0][key] == passes[1][key] for key in reproduction['decision']['comparisons'])
assert passes[0]['raw_artifact_sha256'] == passes[1]['raw_artifact_sha256']
assert all(p['returncode'] == 0 for p in reproduction['process_usage'])

destination = project / 'reports/clean-reproduction-v1'
destination.mkdir(exist_ok=False)
mapping = {}
for name, data in raw.items():
    if name.startswith(cp):
        target = 'constrained/' + name[len(cp):]
    elif name.startswith(tp):
        target = 'training/' + name[len(tp):]
    elif name.startswith('.cache/reproduction-envs/' + attempt + '/'):
        target = 'environment/' + Path(name).name
    elif name.startswith('.cache/reproduction-preparation/' + attempt + '/'):
        target = 'preparation/' + Path(name).name
    elif name.startswith('reports/'):
        target = 'engineering/' + Path(name).name
    else:
        raise AssertionError('Unrecognized safe path')
    assert target not in mapping
    out = destination / target
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open('xb') as stream:
        stream.write(data)
    assert sha(out.read_bytes()) == sha(data)
    mapping[target] = {'original_path': name, 'bytes': len(data), 'sha256': sha(data)}
(destination / 'publication-allowlist.json').write_bytes(manifest_raw)
record = {
    'schema': 'lupine.discovery.clean_reproduction.root_publication.v1',
    'checked_at': datetime.now(timezone.utc).isoformat(), 'status': 'PASS',
    'source_commit': manifest['source_commit'], 'attempt': attempt,
    'publication_script_sha256': sha(Path(__file__).read_bytes()),
    'source_allowlist_sha256': sha(manifest_raw), 'copied_files': mapping,
    'checks': ['37 captured safe file identities', 'detached clean tracked checkout',
               'all six successful stage source and log bindings',
               'constrained completed-report digest comparison and negative gates',
               'two independently recomputed canonical training scientific digests',
               'two successful processes and actual comparison-field equality',
               'actual raw floating-point artifact hash-map equality',
               'four freshly rebuilt training input byte hashes',
               'copied bytes identical to original safe receipts'],
    'limits': ['Same-host same-frozen-data reproduction; not independent scientific replication.',
               'Constrained full scientific digest was checked by frozen workflow; root checked safe receipts, not full policy recalculation.',
               'Root rehashed four training input bytes without parsing numeric labels; these bytes were not copied.',
               'Access declarations rely on trusted frozen worker and tests, not OS-enforced security.',
               'No MPEA cache or targets read by this verification.']}
(destination / 'root-publication-verification.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
(destination / 'verify-publication-source.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({'status': 'PASS', 'copied_files': len(mapping), 'scientific_results': 'both historical negatives match'}))
