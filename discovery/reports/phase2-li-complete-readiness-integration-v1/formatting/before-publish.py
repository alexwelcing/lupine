"""Publish the reviewed Li increment after exact predecessor verification."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import subprocess

R = Path(__file__).resolve().parents[2]
H = Path(__file__).resolve().parent
BASE = 'ddd4a6a8df0f908a162b7e5387b0faac325180d6'
BRANCH = 'research/lupine-discovery'
sha = lambda b: hashlib.sha256(b).hexdigest()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=R, stderr=subprocess.PIPE)

assert not (H/'published.json').exists()
assert git('rev-parse','HEAD').decode().strip() == BASE
assert git('branch','--show-current').decode().strip() == BRANCH
assert not git('diff','--cached','--name-only')
git('fetch','origin','refs/heads/'+BRANCH)
assert git('rev-parse','FETCH_HEAD').decode().strip() == BASE
ci = json.loads((R/'.cache/phase2-rhizo-census-repair-ci-v1/final.json').read_bytes())
assert ci['all_four_jobs_successful'] is True
assert ci['commit'] == ci['run']['head_sha'] == BASE
assert ci['run']['event'] == 'push' and ci['run']['run_attempt'] == 1
expected = json.loads((H/'final-copyset.json').read_bytes())['files']
assert all(sha((R/n).read_bytes()) == d for n,d in expected.items())
manifest_path = R/'reports/runtime-manifest.json'
manifest = json.loads(manifest_path.read_bytes())['files']
old = json.loads(git('show',BASE+':discovery/reports/runtime-manifest.json'))['files']
assert len(old) == 339 and len(manifest) == 345
assert all(manifest[n] == d for n,d in old.items())
copyset = json.loads((R/'.cache/phase2-li-complete-readiness-production-v1/promotion-copyset.final.json').read_bytes())
own = {e['destination']:e['sha256'] for e in copyset['entries']}
assert len(own) == 8 and all(sha((R/n).read_bytes()) == d for n,d in own.items())
assert set(manifest)-set(old) == {n for n in own if n.endswith('.py')}
assert all(sha((R/n).read_bytes()) == d for n,d in manifest.items())
focused = json.loads((H/'focused-first/execution.json').read_bytes())
assert focused['exit_code'] == 0 and focused['source_unchanged'] is True
assert re.search(r'Ran 602 tests in 60.078s\n\nOK\s*$',(H/'focused-first/stderr.txt').read_text())
links = json_count = 0
for name in expected:
    p = R/name
    if p.suffix == '.json':
        json.loads(p.read_bytes())
        json_count += 1
    if p.suffix == '.md':
        for target in re.findall(r'(?<!!)\[[^\]\n]+\]\(([^)]+)\)',p.read_text()):
            if target.startswith(('https://','http://','#','mailto:')):
                continue
            local = target.split('#')[0].strip('<>')
            assert (p.parent/local).exists(), (name,target)
            links += 1
git('diff','--check')
check = {'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':len(expected),
         'valid_json_files':json_count,'valid_local_links':links,'runtime_count':345,
         'unchanged_baseline_files':339,'new_runtime_python':6,'guarded_docs':2,
         'prior_original_ci_all_four_success':True,'focused_methods_passed':602,'actual_operations':0}
(H/'prepublication-check.json').write_text(json.dumps(check,indent=2)+'\n')
git('add','-f','--',*expected)
assert set(git('diff','--cached','--name-only').decode().splitlines()) == {'discovery/'+n for n in expected}
assert not git('diff','--name-only')
git('diff','--cached','--check')
subprocess.run(['python','scripts/runtime_manifest.py','--staged'],cwd=R,check=True)
for n,d in expected.items():
    assert sha(git('show',':discovery/'+n)) == d
result = subprocess.run(['git','commit','-m','Integrate bounded Li readiness with explicit unresolved semantics'],cwd=R,capture_output=True,check=True)
(H/'commit-stdout.txt').write_bytes(result.stdout)
(H/'commit-stderr.txt').write_bytes(result.stderr)
commit = git('rev-parse','HEAD').decode().strip()
assert git('rev-parse','HEAD^').decode().strip() == BASE
assert not git('status','--porcelain')
for n,d in expected.items():
    assert sha(git('show',commit+':discovery/'+n)) == d
subprocess.run(['git','push','origin','HEAD:refs/heads/'+BRANCH],cwd=R,check=True)
assert git('ls-remote','--exit-code','origin','refs/heads/'+BRANCH).decode().split() == [commit,'refs/heads/'+BRANCH]
assert not git('status','--porcelain')
receipt = {'published_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'commit':commit,'parent':BASE,'branch':BRANCH,'remote_exact':True,'worktree_clean':True,
    'verified_git_blobs':len(expected),'runtime_files':345,'predecessor_files_unchanged':339,
    'runtime_additions':6,'guarded_documents':2,'focused_methods_passed':602,'actual_operations':0,
    'runtime_manifest_sha256':sha(manifest_path.read_bytes()),
    'copyset_sha256':sha((H/'final-copyset.json').read_bytes()),'ci':'PENDING_OBSERVATION',
    'clean_package':'PENDING','independent_artifacts':'PENDING'}
(H/'published.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
