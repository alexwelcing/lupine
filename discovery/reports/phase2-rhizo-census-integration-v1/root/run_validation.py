"""Record a real integration command with exact source holds and preserved output."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
role = sys.argv[1]
assert role in ('focused', 'browser')
directory = HERE / ('integrated-' + role)
directory.mkdir(exist_ok=False)
sha = lambda raw: hashlib.sha256(raw).hexdigest()
manifest = json.loads((ROOT / 'reports/runtime-manifest.json').read_bytes())['files']
promotion = json.loads((HERE / 'promotion.json').read_bytes())
names = set(manifest) | set(promotion['promoted'])
held = {name: sha((ROOT / name).read_bytes()) for name in sorted(names)}
assert len(held) == 339
assert all(held[name] == value for name, value in promotion['promoted'].items())
if role == 'focused':
    patterns = ['test_server*.py', 'test_package_retention.py', 'test_package_retention_review.py',
                'test_retained_artifacts.py', 'test_package_mpea_interface.py']
    code = ('import unittest; s=unittest.TestSuite(); '
            f'[s.addTests(unittest.TestLoader().discover("tests",pattern=p)) for p in {patterns!r}]; '
            'r=unittest.TextTestRunner(verbosity=2).run(s); '
            'raise SystemExit(0 if r.wasSuccessful() else 1)')
    command = [sys.executable, '-B', '-c', code]
else:
    command = [sys.executable, '-B', 'scripts/browser_smoke.py']
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
start = {'at': started, 'command': command, 'source_files': held,
         'recorder_sha256': sha(Path(__file__).read_bytes()), 'role': role,
         'private_labels_or_source_reader_invocation': False}
(directory / 'start.json').write_text(json.dumps(start, indent=2) + '\n')
env = dict(os.environ)
env['PYTHONPATH'] = str(ROOT / 'src')
env['PYTHONDONTWRITEBYTECODE'] = '1'
tick = time.monotonic()
with (directory / 'stdout.txt').open('wb') as out, (directory / 'stderr.txt').open('wb') as err:
    result = subprocess.run(command, cwd=ROOT, env=env, stdout=out, stderr=err)
stable = all(sha((ROOT / name).read_bytes()) == digest for name, digest in held.items())
receipt = {'started_at': started, 'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'process_seconds': time.monotonic() - tick, 'exit_code': result.returncode,
           'source_files_held': len(held), 'source_unchanged': stable,
           'status': 'PASS' if result.returncode == 0 and stable else 'FAIL',
           'stdout_sha256': sha((directory / 'stdout.txt').read_bytes()),
           'stderr_sha256': sha((directory / 'stderr.txt').read_bytes())}
(directory / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
if role == 'focused':
    print((directory / 'stderr.txt').read_text()[-1000:])
else:
    print((directory / 'stdout.txt').read_text()[-800:])
raise SystemExit(0 if receipt['status'] == 'PASS' else 1)
