"""Execute the reviewed test-only correction without changing running-suite source."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time

R = Path(__file__).resolve().parents[2]
H = Path(__file__).resolve().parent
D = H / 'proposed-focused'
D.mkdir(exist_ok=False)
source = R / '.cache/phase2-rhizo-census-ci-static-review-v1/proposed-test_retained_mpea_transport.py'
sha = lambda raw: hashlib.sha256(raw).hexdigest()
assert sha(source.read_bytes()) == 'bce07a6927df9efe261f0477eae7b65f7babbd227721fb77333b7fe34188cf82'
manifest = json.loads((R / 'reports/runtime-manifest.json').read_bytes())['files']
assert all(sha((R / n).read_bytes()) == v for n, v in manifest.items())
code = '''import importlib.util,sys,unittest
spec=importlib.util.spec_from_file_location('reviewed_transport_test',sys.argv[1])
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
s=unittest.defaultTestLoader.loadTestsFromModule(m)
r=unittest.TextTestRunner(verbosity=2).run(s)
raise SystemExit(0 if r.wasSuccessful() else 1)
'''
command = [sys.executable, '-B', '-c', code, str(source)]
at = datetime.datetime.now(datetime.timezone.utc).isoformat()
(D / 'start.json').write_text(json.dumps({'at': at, 'command': command, 'source_sha256': sha(source.read_bytes()), 'runtime_source': '2975d6d0b9111cc84adb82ccc673bc82339ab154', 'source_files': manifest, 'scope': 'Ignored proposed test against unchanged runtime; no integrated test claim.'}, indent=2) + '\n')
env = dict(os.environ, PYTHONPATH=os.pathsep.join((str(R / 'tests'), str(R / 'src'))), PYTHONDONTWRITEBYTECODE='1')
tick = time.monotonic()
with (D / 'stdout.txt').open('xb') as out, (D / 'stderr.txt').open('xb') as err:
    result = subprocess.run(command, cwd=R, env=env, stdout=out, stderr=err)
receipt = {'started_at': at, 'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'process_seconds': time.monotonic() - tick, 'exit_code': result.returncode, 'runtime_339_unchanged': all(sha((R / n).read_bytes()) == v for n, v in manifest.items()), 'proposed_source_unchanged': sha(source.read_bytes()) == 'bce07a6927df9efe261f0477eae7b65f7babbd227721fb77333b7fe34188cf82', 'stdout_sha256': sha((D / 'stdout.txt').read_bytes()), 'stderr_sha256': sha((D / 'stderr.txt').read_bytes())}
(D / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
print((D / 'stderr.txt').read_text()[-2500:])
raise SystemExit(result.returncode)
