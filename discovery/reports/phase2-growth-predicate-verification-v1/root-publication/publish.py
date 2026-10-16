"""Publish the frozen public evidence set; verify index, commit and remote bytes."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BASE = 'a064a2c0e4a7cce1fbcb0541f49aae132944e785'
BRANCH = 'research/lupine-discovery'

def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT,stderr=subprocess.PIPE)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def verify_runtime():
    manifest = json.loads((ROOT/'reports/runtime-manifest.json').read_bytes())['files']
    assert len(manifest) == 335
    assert all(sha((ROOT/name).read_bytes()) == digest for name,digest in manifest.items())

if __name__ == '__main__':
    expected = json.loads((HERE/'final-copyset.json').read_bytes())['files']
    assert not (HERE/'published.json').exists()
    assert git('rev-parse','HEAD').decode().strip() == BASE
    assert git('branch','--show-current').decode().strip() == BRANCH
    git('fetch','origin','refs/heads/'+BRANCH)
    assert git('rev-parse','FETCH_HEAD').decode().strip() == BASE
    verify_runtime()
    assert all(sha((ROOT/name).read_bytes()) == digest for name,digest in expected.items())
    git('add','-f','--',*expected)
    changed = set(git('diff','--cached','--name-only').decode().splitlines())
    assert changed == {'discovery/'+name for name in expected}
    assert not git('diff','--name-only')
    git('diff','--cached','--check')
    subprocess.run(['python','scripts/runtime_manifest.py','--staged'],cwd=ROOT,check=True)
    for name,digest in expected.items():
        assert sha(git('show',':discovery/'+name)) == digest
    subprocess.run(['git','commit','-m','Record verified Li header results and primary source methods'],cwd=ROOT,check=True)
    commit = git('rev-parse','HEAD').decode().strip()
    assert git('rev-parse','HEAD^').decode().strip() == BASE
    for name,digest in expected.items():
        assert sha(git('show',commit+':discovery/'+name)) == digest
    verify_runtime()
    assert not git('status','--porcelain')
    subprocess.run(['git','push','origin','HEAD:refs/heads/'+BRANCH],cwd=ROOT,check=True)
    remote = git('ls-remote','--exit-code','origin','refs/heads/'+BRANCH).decode().split()
    assert remote == [commit,'refs/heads/'+BRANCH]
    assert not git('status','--porcelain')
    receipt={'published_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'commit':commit,'parent':BASE,'branch':BRANCH,'verified_git_blobs':len(expected),
        'runtime_files_held':335,'predecessor_runtime_files_unchanged':335,'remote_exact':True,'worktree_clean':True,
        'ci':'PENDING_OBSERVATION','copyset_sha256':sha((HERE/'final-copyset.json').read_bytes())}
    with (HERE/'published.json').open('x') as f:
        json.dump(receipt,f,indent=2);f.write('\n')
    print(json.dumps(receipt,sort_keys=True))
