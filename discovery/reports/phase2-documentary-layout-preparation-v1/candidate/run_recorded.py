from pathlib import Path
import datetime
import hashlib
import json
import subprocess
import sys
import time

HERE = Path(__file__).absolute().parent
ROOT = next(p for p in HERE.parents if p.name == 'discovery')
label = sys.argv[1]
assert label.isidentifier()
out = HERE / 'receipts' / label
out.mkdir(parents=True, exist_ok=False)
def sha(raw): return hashlib.sha256(raw).hexdigest()
def snapshot():
    manifest = json.loads((ROOT / 'reports/runtime-manifest.json').read_bytes())['files']
    assert len(manifest) == 332
    assert all(sha((ROOT / name).read_bytes()) == value for name, value in manifest.items())
    return manifest
before = snapshot()
sources = {}
for name in ('li_v3_layout_localization.py', 'test_li_v3_layout_localization.py', 'generated_zip.py', 'scope.json', 'run_guarded.py'):
    raw = (HERE / name).read_bytes()
    (out / name).write_bytes(raw)
    sources[name] = sha(raw)
command = [sys.executable, '-B', str(HERE / 'run_guarded.py')]
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
tick = time.monotonic()
(out / 'start.json').write_text(json.dumps({'started_at': start, 'command': command,
                                           'source_before': sources, 'runtime_before': before},indent=2,sort_keys=True)+'\n')
with (out / 'stdout.txt').open('xb') as stdout, (out / 'stderr.txt').open('xb') as stderr:
    result = subprocess.run(command,cwd=ROOT,stdout=stdout,stderr=stderr,timeout=180)
finish = datetime.datetime.now(datetime.timezone.utc).isoformat()
elapsed = time.monotonic() - tick
after = snapshot()
source_after = {name:sha((HERE/name).read_bytes()) for name in sources}
record = {'started_at':start,'finished_at':finish,'elapsed_seconds':elapsed,
          'command':command,'exit_code':result.returncode,'source_before':sources,'source_after':source_after,
          'source_unchanged':sources==source_after,'runtime_before':before,'runtime_after':after,
          'runtime_unchanged':before==after,'stdout_sha256':sha((out/'stdout.txt').read_bytes()),
          'stderr_sha256':sha((out/'stderr.txt').read_bytes())}
(out/'execution.json').write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
print(json.dumps({k:v for k,v in record.items() if not k.startswith(('runtime_','source_'))},indent=2))
print((out/'stdout.txt').read_text())
print((out/'stderr.txt').read_text()[-8000:])
raise SystemExit(result.returncode or (0 if before==after and sources==source_after else 1))
