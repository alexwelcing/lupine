"""Apply the reviewed single-file repair only after the original suite finishes."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys
import time

R = Path(__file__).resolve().parents[2]
H = Path(__file__).resolve().parent
sha = lambda raw: hashlib.sha256(raw).hexdigest()
original = R / '.cache/phase2-rhizo-census-ci-reproduction-v1'
receipt = json.loads((original / 'execution.json').read_bytes())
assert receipt['exit_code'] == 1 and receipt['runtime_source_unchanged'] is True
log = (original / 'stderr.txt').read_text()
assert re.search(r'FAILED \(failures=1\)\s*$', log), 'Inspect all actual failures before promotion'
assert 'FAIL: test_all_sixteen_flags_required_without_omission_extra_or_reorder' in log
assert 'AssertionError: 17 != 16' in log
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=R).decode().strip()
assert head == '2975d6d0b9111cc84adb82ccc673bc82339ab154'
subprocess.run(['git', 'fetch', 'origin', 'refs/heads/research/lupine-discovery'], cwd=R, check=True)
assert subprocess.check_output(['git', 'rev-parse', 'FETCH_HEAD'], cwd=R).decode().strip() == head
manifest_path = R / 'reports/runtime-manifest.json'
manifest = json.loads(manifest_path.read_bytes())
before = dict(manifest['files'])
assert len(before) == 339 and all(sha((R / n).read_bytes()) == v for n, v in before.items())
source = R / '.cache/phase2-rhizo-census-ci-static-review-v1/proposed-test_retained_mpea_transport.py'
raw = source.read_bytes()
assert sha(raw) == 'bce07a6927df9efe261f0477eae7b65f7babbd227721fb77333b7fe34188cf82'
target = 'tests/test_retained_mpea_transport.py'
assert before[target] == 'b841a8dcc5ac955f3e82a7de0e34186e9d752552c022a750c3cdec85c94da84a'
(R / target).write_bytes(raw)
manifest['files'][target] = sha(raw)
manifest['checkpoint'] = '2026-10-16 reviewed seventeen-check retention expectation; original CI/full-suite failure preserved'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
assert all(sha((R / n).read_bytes()) == v for n, v in manifest['files'].items())
promotion = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'parent_commit': head, 'runtime_count': 339, 'unchanged_runtime_files': 338, 'added_runtime_files': [], 'changed_runtime_files': {target: {'before': before[target], 'after': sha(raw)}}, 'product_or_probe_change': False, 'scientific_rule_change': False, 'all_original_omission_extra_reorder_rejections_preserved': True, 'omission_cases': 17, 'extra_or_reorder_cases': 2, 'runtime_manifest_sha256': sha(manifest_path.read_bytes())}
(H / 'promotion.json').write_text(json.dumps(promotion, indent=2) + '\n')
D = H / 'integrated-focused'
D.mkdir(exist_ok=False)
patterns = ['test_server*.py', 'test_package*.py', 'test_retained*.py']
code = ('import unittest; s=unittest.TestSuite(); '
        f'[s.addTests(unittest.TestLoader().discover("tests",pattern=p)) for p in {patterns!r}]; '
        'r=unittest.TextTestRunner(verbosity=2).run(s); raise SystemExit(0 if r.wasSuccessful() else 1)')
command = [sys.executable, '-B', '-c', code]
at = datetime.datetime.now(datetime.timezone.utc).isoformat()
(D / 'start.json').write_text(json.dumps({'at': at, 'command': command, 'runtime_files': manifest['files'], 'parent_commit': head}, indent=2) + '\n')
env = dict(os.environ, PYTHONPATH=str(R / 'src'), PYTHONDONTWRITEBYTECODE='1')
tick = time.monotonic()
with (D / 'stdout.txt').open('xb') as out, (D / 'stderr.txt').open('xb') as err:
    result = subprocess.run(command, cwd=R, env=env, stdout=out, stderr=err)
receipt = {'started_at': at, 'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'process_seconds': time.monotonic() - tick, 'exit_code': result.returncode, 'source_files_held': 339, 'source_unchanged': all(sha((R / n).read_bytes()) == v for n, v in manifest['files'].items()), 'stdout_sha256': sha((D / 'stdout.txt').read_bytes()), 'stderr_sha256': sha((D / 'stderr.txt').read_bytes())}
(D / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
print((D / 'stderr.txt').read_text()[-2000:])
raise SystemExit(result.returncode)
