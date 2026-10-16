"""Read public readiness only; deliberately never call prepare_registered."""
from copy import deepcopy
from hashlib import sha256
import importlib.util
import json
import os
from pathlib import Path
import sys
from unittest.mock import patch

ROOT = next(p for p in Path(__file__).resolve().parents
            if (p / 'src/lupine_discovery/decision_pool.py').is_file())
HERE = Path(__file__).resolve().parent
opened = set()
forbidden_events = []

def guard(event, args):
    if event in {'subprocess.Popen', 'os.system', 'socket.connect', 'socket.bind'}:
        forbidden_events.append(event)
        raise AssertionError('public-only operation attempted process/network access')
    if event != 'open' or not isinstance(args[0], (str, bytes, os.PathLike)):
        return
    path = Path(os.fsdecode(args[0])).absolute()
    if path.is_relative_to(ROOT):
        relative = path.relative_to(ROOT)
        if relative.parts[0] not in {'scripts', 'src', 'reports', 'docs'} and not path.is_relative_to(HERE):
            forbidden_events.append('repository_path_outside_public_allowlist')
            raise AssertionError('nonpublic path forbidden')
        opened.add(str(relative))

sys.addaudithook(guard)
source = ROOT / 'scripts/mpea_feature_reader.py'
spec = importlib.util.spec_from_file_location('peer_public_feature_reader', source)
reader = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = reader
spec.loader.exec_module(reader)

def canonical(value):
    return (json.dumps(value, sort_keys=True, ensure_ascii=True,
                       separators=(',', ':'), allow_nan=False) + '\n').encode('ascii')

paths = ['reports/mpea-feature-readiness-v1/process-1/readiness.json',
         'reports/mpea-feature-readiness-v1/process-2/readiness.json',
         'reports/mpea-feature-readiness-v1/reproduction.json']
raws = [(ROOT / name).read_bytes() for name in paths]
documents = [json.loads(raw) for raw in raws]
first, second, reproduction = documents
if raws[0] != raws[1]:
    raise AssertionError('published readiness bytes differ')
if not (reproduction['status'] == 'FEATURES_REPRODUCED_SCIENTIFIC_SCHEMA_UNRESOLVED'
        and reproduction['local_bytes_identical'] is True
        and reproduction['public_bytes_identical'] is True):
    raise AssertionError('published reproduction checks differ')

with patch.object(reader, 'build_from_bytes', create=True, side_effect=AssertionError('no source processing')), \
        patch.object(reader, 'validate_local_artifact', side_effect=AssertionError('no private feature validation')), \
        patch.object(reader, 'frozen_source_identity', side_effect=AssertionError('no registration or Git calls')), \
        patch.object(reader.os, 'urandom', side_effect=AssertionError('no entropy')):
    context = reader.load_context()
    for value in (first, second):
        if reader.validate_public_report(value, _context=context) is not True:
            raise AssertionError('public readiness not accepted')
        body = {k: v for k, v in value.items() if k != 'content_sha256'}
        if value['content_sha256'] != sha256(canonical(body)).hexdigest():
            raise AssertionError('upstream LF seal mismatch')
    refused = 0
    variants = []
    altered = deepcopy(first); altered['row_count'] -= 1; variants.append(altered)
    altered = deepcopy(first); altered['all_rows_preserved'] = False; variants.append(altered)
    altered = deepcopy(first); altered['content_sha256'] = sha256(canonical({k: v for k, v in first.items() if k != 'content_sha256'})[:-1]).hexdigest(); variants.append(altered)
    altered = deepcopy(first); altered['counts']['processing_category_counts']['CAST'] -= 1; variants.append(altered)
    altered = deepcopy(first); altered['scope']['target_cells_text_decoded'] = True
    altered['content_sha256'] = sha256(canonical({k: v for k, v in altered.items() if k != 'content_sha256'})).hexdigest(); variants.append(altered)
    for altered in variants:
        try:
            reader.validate_public_report(altered, _context=context)
        except reader.FeatureReaderError as error:
            if str(error) != 'PUBLIC_SCHEMA_INVALID':
                raise
            refused += 1
        else:
            raise AssertionError('tampered readiness accepted')

if first['counts'] != reproduction['counts'] or first['row_count'] != reproduction['row_count']:
    raise AssertionError('public reproduction aggregates differ')
for execution in reproduction['executions']:
    if (execution['public_sha256'] != sha256(raws[0]).hexdigest()
            or execution['public_bytes'] != len(raws[0])
            or execution['local_sha256'] != first['local_artifact_identity']['sha256']
            or execution['local_bytes'] != first['local_artifact_identity']['bytes']):
        raise AssertionError('published reproduction artifact references differ')

record = {
    'schema': 'lupine.review.mpea_public_feature_readiness_preflight.v1',
    'status': 'PASS',
    'checked_calls': ['reader.load_context()', 'reader.validate_public_report(process1, _context=context)',
                      'reader.validate_public_report(process2, _context=context)'],
    'published_readiness_byte_identity': True,
    'published_reproduction_links_and_aggregates_match': True,
    'upstream_content_seal_format': 'canonical_ascii_json_plus_one_LF',
    'tampering_controls_rejected': refused,
    'public_inputs': {name: {'sha256': sha256(raw).hexdigest(), 'bytes': len(raw)}
                      for name, raw in zip(paths, raws)},
    'reader_source_sha256': sha256(source.read_bytes()).hexdigest(),
    'opened_repository_paths': sorted(opened),
    'forbidden_events': forbidden_events,
    'scope': {'prepare_registered_called': False, 'worker_called': False,
              'registration_authority_created': False, 'allocation_called': False,
              'entropy_requested': False, 'private_features_read': False,
              'raw_archive_read': False, 'target_values_read': False,
              'local_identity_compared_as_public_metadata_only': True},
}
with (HERE / 'public-feature-readiness-v1.json').open('x') as output:
    json.dump(record, output, sort_keys=True, indent=2)
    output.write('\n')
print(json.dumps({'status': record['status'], 'tampering_controls_rejected': refused,
                  'public_only': True}, sort_keys=True))
