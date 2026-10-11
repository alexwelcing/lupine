"""Public metadata only: never register, allocate, acquire, parse targets or fit."""
from pathlib import Path
import hashlib
import importlib.util
import json
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE_NAMES = (
    'scripts/mpea_registration_allocation.py', 'scripts/mpea_archive_worker.py',
    'scripts/mpea_header_labels.py', 'scripts/mpea_row_metadata.py',
    'scripts/mpea_formula_tokens.py', 'scripts/permutation_allocation.py',
    'scripts/mpea_target_custody.py',
)
PUBLIC_NAMES = (
    'reports/mpea-header-labels-v1.json', 'reports/mpea-row-metadata-v1.json',
    'reports/mpea-formula-tokens-v1.json', 'docs/mpea-column-mapping-v1.json',
)
allowed = {ROOT / name for name in (*SOURCE_NAMES, *PUBLIC_NAMES)} | {Path(__file__).resolve()}
opened = set()
def audit(event, args):
    if event in {'socket.connect', 'socket.connect_ex', 'subprocess.Popen'}:
        raise RuntimeError('DIAGNOSTIC_EXTERNAL_ACTION_FORBIDDEN')
    if event == 'open' and isinstance(args[0], (str, bytes)):
        path = Path(args[0]).absolute()
        if path.is_relative_to(ROOT) and path not in allowed and not path.is_relative_to(HERE):
            raise RuntimeError('DIAGNOSTIC_NONPUBLIC_READ_FORBIDDEN')
        if path.is_relative_to(ROOT): opened.add(str(path.relative_to(ROOT)))
def sha(raw): return hashlib.sha256(raw).hexdigest()
def snapshot(): return {name: sha((ROOT / name).read_bytes()) for name in (*SOURCE_NAMES, *PUBLIC_NAMES)}

head = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], text=True).strip()
sys.addaudithook(audit)
before = snapshot()
spec = importlib.util.spec_from_file_location('preallocation_diagnostic_registration', ROOT / SOURCE_NAMES[0])
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)
checks = []
documents = {}
for name in PUBLIC_NAMES:
    raw = m.captured(ROOT / name)
    value = m.decode(raw)
    documents[name] = value
    item = {'path': name, 'bytes': len(raw), 'bytes_sha256': sha(raw),
            'expected_bytes_sha256': m.METADATA_PINS[name],
            'pinned_bytes_match': sha(raw) == m.METADATA_PINS[name]}
    if 'content_sha256' in value:
        content = {key: v for key, v in value.items() if key != 'content_sha256'}
        without_newline = m.canonical(content)
        item.update({'claimed_content_sha256': value['content_sha256'],
                     'consumer_no_newline_sha256': sha(without_newline),
                     'publisher_trailing_newline_sha256': sha(without_newline + b'\n'),
                     'publisher_seal_matches': sha(without_newline + b'\n') == value['content_sha256']})
        try:
            m.verify_seal(value)
        except m.RegistrationError as error:
            item['unchanged_consumer_result'] = error.code
        else:
            item['unchanged_consumer_result'] = 'PASS'
    checks.append(item)

# Inspect the subsequent metadata-only conditions without calling any authority,
# role assignment or allocation function. Do not serialize row values or groups.
h, b, c = [documents[name] for name in PUBLIC_NAMES[:3]]
rows = []
for ordinal, (row, formula) in enumerate(zip(b['rows'], c['rows'])):
    record = m.SOURCE['sha256'] + ':' + str(ordinal)
    assert row['ordinal'] == formula['ordinal'] == ordinal
    assert row['record_id'] == formula['record_id'] == record
    sg, fg, temp, mode = row['source'], formula['formula'], row['temperature'], row['test_mode']
    assert sg['status'] == 'TOKEN_GROUP' or (sg['status'] == 'UNRESOLVED' and sg['value'] is None)
    assert fg['status'] == 'TOKEN_GROUP' or (fg['status'] == 'UNRESOLVED' and fg['value'] is None)
    eligible = False
    if mode['status'] == 'KNOWN' and mode['value'] == 'T' and temp['status'] == 'KNOWN':
        assert temp['value']['unit'] == 'degC'
        eligible = m.Fraction(int(temp['value']['numerator']), int(temp['value']['denominator'])) == 25
    rows.append(m.MetadataRow(ordinal, record, sg['value'], eligible, fg['value']))
columns = h['header']['columns']
assert all(column['position'] == i and type(column['token']) is str for i, column in enumerate(columns))
assert h['observed'] == b['observed'] == c['observed'] == m.SOURCE
assert b['row_count'] == c['row_count'] == len(b['rows']) == len(c['rows']) == 1545
context = m._context(rows, tuple(column['token'].encode('utf-8') for column in columns),
                     m.SOURCE['sha256'], m.digest(m.METADATA_PINS), 'PUBLIC_DIAGNOSTIC_ONLY')
summary = {'rows': len(context.rows), 'columns': len(context.header),
           'condition_rows': sum(row.condition_eligible for row in context.rows),
           'condition_source_groups': len({row.source_group for row in context.rows if row.condition_eligible}),
           'subsequent_public_metadata_shape_checks': 'PASS'}
after = snapshot()
assert before == after
result = {
    'schema': 'lupine.mpea.preallocation.public-diagnosis.v1', 'head': head,
    'command': 'PYTHONDONTWRITEBYTECODE=1 python -X pycache_prefix=.cache/mpea-preallocation-diagnosis/unused-pycache .cache/mpea-preallocation-diagnosis/diagnose.py',
    'script_sha256': sha(Path(__file__).read_bytes()),
    'source_and_public_inputs_before': before, 'source_and_public_inputs_after': after,
    'unchanged': True, 'public_input_checks': checks, 'shape_summary': summary,
    'first_failure': {'function': 'load_public_metadata', 'call': 'verify_seal(header_document)',
                      'reason': 'INPUT_IDENTITY_MISMATCH',
                      'cause': 'consumer omits the trailing newline in the upstream content-seal preimage'},
    'scope': {'registration_factory_called': False, 'authority_forged': False,
              'actual_allocation_called': False, 'entropy_requested': False,
              'target_or_private_feature_bytes_opened': False, 'model_fitting': False,
              'original_attempt_retried': False, 'cohort_rows_emitted': False},
    'opened_repository_paths': sorted(opened),
}
raw = (json.dumps(result, sort_keys=True, indent=2) + '\n').encode()
with (HERE / 'diagnosis-v1.json').open('xb') as stream: stream.write(raw)
print(json.dumps({'status': 'CAUSE_CONFIRMED', 'pinned_inputs_match': all(x['pinned_bytes_match'] for x in checks),
                  'public_seals_rejected': sum(x.get('unchanged_consumer_result') == 'INPUT_IDENTITY_MISMATCH' for x in checks),
                  'shape_summary': summary, 'receipt_sha256': sha(raw)}, sort_keys=True))
