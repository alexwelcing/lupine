from pathlib import Path
import hashlib,json,subprocess
R=Path(__file__).absolute().parents[2];H=Path(__file__).absolute().parent;sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda p:json.loads(p.read_bytes())
BASE='88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d'
def git(*a):return subprocess.check_output(['git',*a],cwd=R,stderr=subprocess.PIPE)
assert git('rev-parse','HEAD').decode().strip()==BASE
git('fetch','origin','refs/heads/research/lupine-discovery');assert git('rev-parse','FETCH_HEAD').decode().strip()==BASE
assert not git('diff','--cached','--name-only')
runtime=read(R/'reports/runtime-manifest.json')['files'];assert len(runtime)==345 and all(sha((R/n).read_bytes())==d for n,d in runtime.items())
peer=R/'.cache/phase2-source-readiness-independent-v1/handoff.json';assert sha(peer.read_bytes())=='9db446df3f02e89292d5cdd6269b420f8c52980e9a10c1ffeaafa23e6b48b89d'
B=R/'.cache/phase2-source-readiness-backend-v1';br=read(B/'author-validation-v1.json');assert br['exit_code']==0 and br['sources_unchanged'] and br['source_before']==br['source_after']
U=R/'.cache/phase2-source-readiness-browser-v1';ur=read(U/'promotion-copyset.json');print('UI copyset keys',list(ur))
entries={n:{'source':B/'overlay'/n,'sha256':d['sha256']} for n,d in br['source_after'].items()}
# Four exact reviewed assets, held independently before any root promotion.
ui={'src/lupine_discovery/web/source-readiness.js':'d533611c','src/lupine_discovery/web/app.js':'9e81d71a','src/lupine_discovery/web/index.html':'20432ede','src/lupine_discovery/web/styles.css':'2bfdac8e'}
for n,prefix in ui.items():
 raw=(U/'overlay'/n).read_bytes();assert sha(raw).startswith(prefix);entries[n]={'source':U/'overlay'/n,'sha256':sha(raw)}
P=R/'.cache/phase2-source-readiness-package-v1'
for n,d in read(P/'copyset.json')['files'].items():
 assert n not in entries;entries[n]={'source':P/'overlay'/n,'sha256':d['sha256']}
for n,d in entries.items():
 raw=d['source'].read_bytes();assert sha(raw)==d['sha256']
 p=R/n
 old=subprocess.run(['git','show',BASE+':discovery/'+n],cwd=R,capture_output=True)
 if old.returncode==0:assert p.exists() and p.read_bytes()==old.stdout
 else:assert old.returncode==128 and not p.exists()
 d['baseline_sha256']=sha(old.stdout) if old.returncode==0 else None
for n,d in entries.items():
 p=R/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(d['source'].read_bytes())
receipt={'baseline':BASE,'files':{n:{**d,'source':str(d['source'].relative_to(R))} for n,d in entries.items()},'runtime_manifest_update':'PENDING_BROWSER_HELPER_AND_INTEGRATED_TESTS','scientific_admission':False}
with (H/'runtime-copyset.json').open('x') as f:f.write(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'promoted_files':len(entries),'new_files':sum(d['baseline_sha256'] is None for d in entries.values()),'status':'ROOT_PROMOTED_REVIEWED_CANDIDATES_TESTS_PENDING'}))
