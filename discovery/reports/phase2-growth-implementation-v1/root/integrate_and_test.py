from pathlib import Path
import sys,json,hashlib,subprocess,datetime,time,os
root=Path.cwd();sys.path.insert(0,str(root/'scripts'));import runtime_manifest
base=root/'.cache/phase2-growth-release-v1'; out=base/'integration-first';out.mkdir(exist_ok=False)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(path,value):path.write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')
prior=runtime_manifest.source_files(root); assert len(prior)==326
assert prior==json.loads((root/'reports/runtime-manifest.json').read_text())['files']
pins={}
for directory in ('phase2-growth-hint-production-candidate-v1','phase2-growth-envelope-candidate-v1'):
 candidate=root/'.cache'/directory
 for relative,identity in json.loads((candidate/'promotion-map.json').read_text())['files'].items():
  expected=identity if isinstance(identity,str) else identity['sha256']
  raw=(candidate/'promotion'/relative).read_bytes();assert sha(raw)==expected
  target=root/relative; assert not target.exists(); target.write_bytes(raw); pins[relative]=expected
before=runtime_manifest.source_files(root);assert len(before)==332
assert all(before[k]==v for k,v in prior.items())
assert {k:before[k] for k in set(before)-set(prior)}=={k:v for k,v in pins.items() if not k.startswith('docs/')}
write(base/'final-reviewed-pins.json',{'status':'FINAL_REVIEWED_SOURCE_PINS','baseline_commit':'d0505b9b358a4bdeafbd742f1aeeb6c2b955abf3','files':pins,'reviewed_at':now(),'scope':'Root exact integration of independently reviewed G30/G31 four-file sets; hashes identify source, not physical validity.'})
command=[sys.executable,'-m','unittest','discover','-s','tests','-p','test_li_v3*.py','-v']
start=now(); tick=time.monotonic();write(out/'start.json',{'started_at':start,'command':command,'runtime_before':before,'new_files':pins})
env=dict(os.environ);env['PYTHONDONTWRITEBYTECODE']='1';env.pop('PYTHONPATH',None)
with (out/'stdout.txt').open('xb') as stdout,(out/'stderr.txt').open('xb') as stderr:
 result=subprocess.run(command,cwd=root,stdout=stdout,stderr=stderr,env=env,timeout=300)
end=now();elapsed=time.monotonic()-tick;after=runtime_manifest.source_files(root)
record={'command':command,'started_at':start,'finished_at':end,'elapsed_seconds':elapsed,'exit_code':result.returncode,'runtime_before':before,'runtime_after':after,'source_unchanged':before==after,'runtime_count':len(after),'old326_unchanged':all(after[k]==v for k,v in prior.items()),'stdout_sha256':sha((out/'stdout.txt').read_bytes()),'stderr_sha256':sha((out/'stderr.txt').read_bytes()),'scope':'Combined Li synthetic engineering tests; production operations not authorized by this runner.'}
write(out/'execution.json',record);print(json.dumps({k:v for k,v in record.items() if not k.startswith('runtime_')}));print((out/'stderr.txt').read_text()[-2000:])
assert result.returncode==0 and before==after
subprocess.run([sys.executable,'scripts/runtime_manifest.py','--write','--checkpoint','2026-10-16-growth-shape-envelope-implementation'],check=True,cwd=root)
