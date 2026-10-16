"""Record two actual feature-only executions after the published source/CI gate.

Historical execution wrapper, not a target reader. Never print private vectors.
"""
from pathlib import Path
import datetime
import hashlib
import json
import stat
import subprocess
import sys
import time

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
COMMIT = '5b1ed62f1c7f0010682ce3f554e2430f103e4709'
RUN = '38083897613'
OUT = ROOT / '.cache/mpea-features/production-5b1ed62-v1'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def command(args):
    return subprocess.check_output(args, cwd=ROOT)

def write(name, value):
    path = OUT / name
    with path.open('xb') as f:
        f.write((json.dumps(value, sort_keys=True, indent=2) + '\n').encode())

assert command(['git', 'rev-parse', 'HEAD']).decode().strip() == COMMIT
assert command(['git', 'ls-remote', 'origin', 'refs/heads/research/lupine-discovery']).decode().split()[0] == COMMIT
assert command(['git', 'status', '--porcelain', '--untracked-files=normal']) == b''
ci_raw = command(['gh', 'run', 'view', RUN, '--repo', 'alexwelcing/lupine', '--json',
                  'status,conclusion,headSha,jobs,url,createdAt,updatedAt'])
ci = json.loads(ci_raw)
assert ci['headSha'] == COMMIT and ci['status'] == 'completed' and ci['conclusion'] == 'success'
assert {j['name'] for j in ci['jobs']} == {'python (3.11)', 'python (3.12)', 'browser', 'lean'}
assert all(j['status'] == 'completed' and j['conclusion'] == 'success' for j in ci['jobs'])
manifest = json.loads((ROOT / 'reports/runtime-manifest.json').read_text())
# The complete manifest is retained as an identity; actual producer files are
# independently checked by the frozen reader and listed in its public receipt.
manifest_sha = sha((ROOT / 'reports/runtime-manifest.json').read_bytes())
OUT.mkdir(parents=True, exist_ok=False)
(OUT / 'ci-verification.json').write_bytes(ci_raw)
started = now()
executions = []
for index in (1, 2):
    directory = OUT / f'process-{index}'
    directory.mkdir()
    local = directory / 'local.json'
    public = directory / 'readiness.json'
    args = [sys.executable, 'scripts/mpea_feature_reader.py', '--local-output',
            str(local.relative_to(ROOT)), '--public-output', str(public.relative_to(ROOT))]
    before, tick = now(), time.monotonic()
    result = subprocess.run(args, cwd=ROOT, capture_output=True, timeout=120)
    elapsed, after = time.monotonic() - tick, now()
    (directory / 'stdout.txt').write_bytes(result.stdout)
    (directory / 'stderr.txt').write_bytes(result.stderr)
    record = dict(command=args, started_at=before, finished_at=after,
                  wall_seconds=elapsed, exit_code=result.returncode,
                  stdout_sha256=sha(result.stdout), stderr_sha256=sha(result.stderr))
    write(f'process-{index}/execution.json', record)
    assert result.returncode == 2 and result.stderr == b''
    report = json.loads(public.read_bytes())
    console = json.loads(result.stdout)
    assert console == dict(status='FEATURES_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED',
                           reason='SCIENTIFIC_SCHEMA_UNRESOLVED', receipt_sha256=sha(public.read_bytes()))
    assert report['implementation']['commit'] == COMMIT and report['row_count'] == 1545
    raw = local.read_bytes()  # whole-file comparison only, no vector decoding
    assert stat.S_IMODE(local.stat().st_mode) == 0o600
    subprocess.run(['git', 'check-ignore', '-q', str(local)], cwd=ROOT, check=True)
    assert report['local_artifact_identity']['sha256'] == sha(raw)
    assert report['local_artifact_identity']['bytes'] == len(raw)
    assert report['per_row_features_published'] is False
    record.update(local_bytes=len(raw), local_sha256=sha(raw), public_bytes=public.stat().st_size,
                  public_sha256=sha(public.read_bytes()))
    executions.append(record)

assert (OUT/'process-1/local.json').read_bytes() == (OUT/'process-2/local.json').read_bytes()
assert (OUT/'process-1/readiness.json').read_bytes() == (OUT/'process-2/readiness.json').read_bytes()
assert command(['git', 'rev-parse', 'HEAD']).decode().strip() == COMMIT
assert command(['git', 'status', '--porcelain', '--untracked-files=normal']) == b''
assert sha((ROOT/'reports/runtime-manifest.json').read_bytes()) == manifest_sha
report = json.loads((OUT/'process-1/readiness.json').read_bytes())
for name, expected in report['implementation']['files'].items():
    assert sha((ROOT/name).read_bytes()) == expected
receipt = dict(schema='lupine.discovery.mpea.features.reproduction.v1',
               status='FEATURES_REPRODUCED_SCIENTIFIC_SCHEMA_UNRESOLVED',
               producer_commit=COMMIT, ci_run=int(RUN), ci_sha256=sha(ci_raw),
               ci_verified_before_first_execution=True, started_at=started, finished_at=now(),
               executions=executions, local_bytes_identical=True, public_bytes_identical=True,
               runtime_manifest_sha256=manifest_sha,
               implementation_files=report['implementation']['files'],
               wrapper_sha256=sha(Path(__file__).read_bytes()),
               row_count=report['row_count'], counts=report['counts'],
               scope=report['scope'], private_vectors_published=False)
write('reproduction.json', receipt)
print(json.dumps({k:receipt[k] for k in ('status','row_count','counts','local_bytes_identical','public_bytes_identical')},sort_keys=True))
