"""Read and hash static source bindings only; never import a custody module."""
from pathlib import Path
import ast
from datetime import datetime, timezone
import hashlib
import json

ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
OUT = Path(__file__).resolve().parent
SOURCES = [
    ('.cache/phase2-li-local-extra-candidate-v1/promotion/scripts/li_v3_local_extra_headers.py', 'PRIOR_FILES'),
    ('scripts/li_v3_compatible_zip_diagnostic.py', 'PRIOR_FILES'),
    ('scripts/li_v3_compatible_envelope.py', 'PRIOR_FILES'),
    ('scripts/li_v3_flag_diagnostic.py', 'PRIOR_FILES'),
    ('scripts/li_v3_zip_diagnostic.py', 'LEGACY_FILES'),
]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


started = datetime.now(timezone.utc).isoformat()
source_bytes, bindings = {}, {}
for relative, name in SOURCES:
    raw = (ROOT / relative).read_bytes()
    source_bytes[relative] = raw
    nodes = [node.value for node in ast.parse(raw).body
             if isinstance(node, ast.Assign) and any(
                 isinstance(target, ast.Name) and target.id == name for target in node.targets)]
    assert len(nodes) == 1
    values = ast.literal_eval(nodes[0])
    assert type(values) is dict and all(type(k) is str and type(v) is str for k, v in values.items())
    assert not (bindings.keys() & values.keys())
    bindings.update(values)
assert len(bindings) == 21
observed = {relative: sha((ROOT / relative).read_bytes()) for relative in bindings}
assert bindings == observed
assert all((ROOT / relative).read_bytes() == raw for relative, raw in source_bytes.items())
result = {
    'schema': 'lupine.discovery.local_extra_static_binding_audit.v1',
    'status': 'SOURCE_BINDINGS_MATCH', 'started_at': started,
    'finished_at': datetime.now(timezone.utc).isoformat(),
    'predecessor_file_count': len(bindings), 'files': observed,
    'binding_source_files': {relative: sha(raw) for relative, raw in source_bytes.items()},
    'source_unchanged_during_audit': True,
    'runtime_test_or_import': False, 'private_source_read': False,
    'network': False, 'actual_production_invocation': False,
    'scope': 'Exact static predecessor-byte identity only; no runtime or scientific validity claim.',
}
with (OUT / 'source-bindings-first.json').open('x') as stream:
    stream.write(json.dumps(result, indent=2, sort_keys=True) + '\n')
print(json.dumps({'status': result['status'], 'predecessor_file_count': len(bindings),
                  'candidate_sha256': sha(source_bytes[SOURCES[0][0]])}))
