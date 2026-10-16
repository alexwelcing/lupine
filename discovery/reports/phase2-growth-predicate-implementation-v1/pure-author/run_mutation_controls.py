"""Three predeclared generated-fixture sensitivity controls; never alter source files."""
from pathlib import Path
import importlib.util
import io
import json
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('predicate_author_mutations', HERE / 'test_growth_predicate_audit.py')
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)
M = T.M
results = []


def execute(label, patcher, method):
    stream = io.StringIO()
    with patcher:
        result = unittest.TextTestRunner(stream=stream, verbosity=2).run(T.AuditTests(method))
    results.append({'mutation': label, 'test': method, 'tests_run': result.testsRun,
                    'failures': len(result.failures), 'errors': len(result.errors),
                    'killed': not result.wasSuccessful(), 'output': stream.getvalue()})


record = M._record
execute('skip_family', patch.object(M, '_record', lambda families, pairs: record(
    families, [(p, f) for p, f in pairs if f != 'MEMBER_FLAGS'])), 'test_later_independent_faults')
execute('erase_dependency', patch.object(M, '_skip', lambda *args: None),
        'test_duplicate_offset_skips_ambiguous_local_but_later_independent_fault')
inspect = M.inspect_synthetic_headers

def promote(raw, **kwargs):
    result = inspect(raw, **kwargs)
    result['diagnostic_complete'] = True
    return result

execute('promote_partial_complete', patch.object(M, 'inspect_synthetic_headers', promote),
        'test_duplicate_offset_skips_ambiguous_local_but_later_independent_fault')
print(json.dumps({'scope': 'Generated-fixture mutation sensitivity, not scientific evidence',
                  'results': results, 'all_killed': all(row['killed'] for row in results)}, indent=2, sort_keys=True))
raise SystemExit(0 if all(row['killed'] for row in results) else 1)
