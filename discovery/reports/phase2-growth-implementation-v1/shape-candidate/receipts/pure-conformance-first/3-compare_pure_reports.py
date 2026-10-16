"""Compare complete synthetic projections; no production operation permitted."""
from contextlib import ExitStack
import importlib.util
import json
from pathlib import Path
from unittest.mock import patch

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]


def load(label, path):
    spec = importlib.util.spec_from_file_location(label, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


fixtures = load('growth_conformance_fixture_builder',
                BASE / 'promotion/tests/test_li_v3_growth_hint_shape.py')
old = load('growth_original_pure', ROOT / '.cache/phase2-growth-hint-candidate-v1/'
           'promotion/scripts/li_v3_growth_hint_shape.py')
new = fixtures.candidate
record, hint, archive = fixtures.record, fixtures.hint, fixtures.archive
cases = [b'', b'NOT_A_ZIP']
for padding_size in (0, 1, 2, 7, 31, 512, 65527):
    for initial in (0, 1, 255, 256, 32767, 32768, 65535):
        for signature in (0xA028, 0x28A0, 0, 65535):
            cases.append(archive([hint(initial, b'\0' * padding_size, signature)]))
for size in range(4):
    cases.append(archive([record(b'x' * size)]))
for identifier in (0, 1, 0xA220, 0xFFFF):
    cases.append(archive([record(b'PAD_CANARY', identifier)]))
for byte in range(1, 256):
    cases.append(archive([hint(65535, bytes([byte]) + b'\0' * 5)]))
for extra in (hint() + hint(), hint() + record(b'', 7), b'x', b'xx', b'xxx',
              record(b'', 7) * 257, hint() + b'x'):
    cases.append(archive([extra]))
for position in (0, 1, 7, 127):
    cases.append(archive([b''] * position + [hint(20, b'\0' * 5)]))

with ExitStack() as stack:
    for module, name in (
            (new, 'production_context'), (new.predecessor, 'production_context'),
            (new.predecessor, 'diagnose'), (new.custody, '_read_relative'),
            (new.custody, '_verify_source'), (new.custody, '_write_at')):
        stack.enter_context(patch.object(module, name, side_effect=AssertionError('IO forbidden')))
    for name in ('subprocess.run', 'urllib.request.urlopen', 'socket.create_connection',
                 'zipfile.ZipFile.open', 'zipfile.ZipFile.read'):
        stack.enter_context(patch(name, side_effect=AssertionError('IO forbidden')))
    for index, raw in enumerate(cases):
        assert old.inspect_synthetic_growth_hint(raw) == new.inspect_synthetic_growth_hint(raw), index
print(json.dumps({'status': 'PASS', 'complete_report_pairs': len(cases),
                  'scope': 'synthetic_fixture_output_equivalence_only',
                  'actual_source_operations': False, 'production_guard_invoked': False},
                 sort_keys=True))
