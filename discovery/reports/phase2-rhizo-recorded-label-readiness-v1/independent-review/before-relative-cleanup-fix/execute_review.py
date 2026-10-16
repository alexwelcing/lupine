"""Retain one labeled independent invocation and exact before/after identities."""
import argparse
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT=Path('/workspace/lupine-discovery-branch/discovery')
OWN=Path(__file__).resolve().parent
CANDIDATE=ROOT/'.cache/phase2-rhizo-recorded-label-candidate-v1'

def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
    p=argparse.ArgumentParser();p.add_argument('--source-sha256',required=True);p.add_argument('--run',required=True)
    args=p.parse_args();out=OWN/args.run;out.mkdir(exist_ok=False)
    source=CANDIDATE/'recorded_labels.py';assert sha(source.read_bytes())==args.source_sha256
    inputs=[source,CANDIDATE/'contract.json',OWN/'test_recorded_labels_review.py',OWN/'generated_fixtures.py',
        OWN/'numeric-cases.json',OWN/'run_review.py',OWN/'challenge-plan.md',OWN/'preparation.json']
    if (CANDIDATE/'README.md').exists():inputs.append(CANDIDATE/'README.md')
    snapshots={str(path.relative_to(ROOT)):{'bytes':path.stat().st_size,'sha256':sha(path.read_bytes())} for path in inputs}
    for path in inputs:shutil.copyfile(path,out/path.name)
    manifest=json.loads((ROOT/'reports/runtime-manifest.json').read_text())
    before={path:sha((ROOT/path).read_bytes()) for path in manifest['files']}
    assert len(before)==332 and before==manifest['files']
    start=datetime.now(timezone.utc).isoformat();t=time.monotonic()
    command=[sys.executable,str(OWN/'run_review.py'),'--source-sha256',args.source_sha256]
    result=subprocess.run(command,cwd=ROOT,capture_output=True)
    elapsed=time.monotonic()-t;end=datetime.now(timezone.utc).isoformat()
    (out/'stdout.txt').write_bytes(result.stdout);(out/'stderr.txt').write_bytes(result.stderr)
    after={path:sha((ROOT/path).read_bytes()) for path in manifest['files']}
    held=all(sha((ROOT/path).read_bytes())==row['sha256'] for path,row in snapshots.items())
    receipt={'started_at':start,'completed_at':end,'elapsed_seconds':elapsed,'command':command,
        'returncode':result.returncode,'inputs':snapshots,'inputs_held':held,'runtime_files':332,
        'runtime_held':before==after,'stdout_sha256':sha(result.stdout),'stderr_sha256':sha(result.stderr),
        'scope':'Independent generated tests only; no actual source, production entrypoint or network. Logs retain first failures.'}
    (out/'execution.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
    print(json.dumps({k:receipt[k] for k in ['returncode','elapsed_seconds','inputs_held','runtime_files','runtime_held']}))
    print(result.stdout.decode(),end='')
    print(result.stderr.decode(),end='',file=sys.stderr)
    return result.returncode or (0 if held and before==after else 2)

if __name__=='__main__':raise SystemExit(main())
