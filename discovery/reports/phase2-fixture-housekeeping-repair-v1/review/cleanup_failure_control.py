"""Exercise only the reviewed fixture's unchanged cleanup registration."""
import ast
from contextlib import ExitStack
from datetime import datetime, timezone
import errno
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'tests/test_li_v3_readiness_production.py'
OUT = Path(__file__).resolve().parent
raw = SOURCE.read_bytes()
source_hash = hashlib.sha256(raw).hexdigest()
module = ast.parse(raw)
original_class = next(node for node in module.body if isinstance(node, ast.ClassDef) and node.name == 'ProductionAuthorTests')
setup = next(node for node in original_class.body if isinstance(node, ast.FunctionDef) and node.name == 'setUp')
# Take the exact existing ExitStack registration and TemporaryDirectory creation;
# do not import or execute the product module, Git setup, or a scientific test.
assert len(setup.body) >= 3
setup.body = setup.body[:3]
setup.decorator_list = []
assert ast.unparse(setup.body[0]) == 'self.stack = ExitStack()'
assert ast.unparse(setup.body[1]) == 'self.addCleanup(self.stack.close)'
assert 'ignore_cleanup_errors' not in ast.unparse(setup.body[2])
namespace = {'ExitStack': ExitStack, 'tempfile': tempfile, 'HERE': OUT}
exec(compile(ast.fix_missing_locations(ast.Module(body=[setup], type_ignores=[])), str(SOURCE), 'exec'), namespace)
created = []

def body(self):
    created.append(Path(self.temporary))
    (Path(self.temporary) / '.git').mkdir()
    self.body_completed = True

GeneratedCleanupCase = type('GeneratedCleanupCase', (unittest.TestCase,), {'setUp': namespace['setUp'], 'test_body': body})
stream = io.StringIO()
started = datetime.now(timezone.utc).isoformat()
with patch.object(tempfile.TemporaryDirectory, '_rmtree', side_effect=OSError(errno.ENOTEMPTY, 'Directory not empty', '.git')):
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(GeneratedCleanupCase))
finished = datetime.now(timezone.utc).isoformat()
log = stream.getvalue()
expected = result.testsRun == 1 and len(result.errors) == 1 and not result.failures and 'OSError: [Errno 39] Directory not empty' in log and all(path.exists() for path in created)
# Cleanup happens only after the forced-failure patch is removed, and any real
# cleanup error here remains fatal. No ignored rmtree errors or retry loop.
for path in created:
    shutil.rmtree(path)
unchanged = hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash
report = {'schema': 'lupine.fixture_cleanup_negative_control.v1', 'status': 'EXPECTED_CLEANUP_ERROR_OBSERVED' if expected and unchanged else 'CONTROL_FAILED', 'argv': [sys.executable, str(Path(__file__).resolve())], 'started_at': started, 'finished_at': finished, 'source_sha256': source_hash, 'source_unchanged': unchanged, 'extracted_setup_lines': [setup.lineno, setup.body[-1].end_lineno], 'tests_run': result.testsRun, 'errors': len(result.errors), 'failures': len(result.failures), 'cleanup_error_suppressed': False, 'scope': 'Exact first three setup statements only; generated temporary directory; no product import, Git command, source data, or product test execution.'}
with (OUT / 'cleanup-failure-control.stderr').open('x') as handle:
    handle.write(log)
with (OUT / 'cleanup-failure-control.json').open('x') as handle:
    json.dump(report, handle, indent=2, sort_keys=True)
    handle.write('\n')
print(json.dumps(report, sort_keys=True))
raise SystemExit(0 if expected and unchanged else 1)
