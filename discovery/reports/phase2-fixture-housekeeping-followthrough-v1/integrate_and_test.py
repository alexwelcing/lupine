from pathlib import Path
import subprocess,json,hashlib,datetime,os,sys,re
R=Path.cwd();H=R/'.cache/phase2-fixture-housekeeping-followthrough-v1';BASE='e668b349e130cdfd1a8cfe94e3e38d4755507f72';sha=lambda b:hashlib.sha256(b).hexdigest();now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
def git(*a):return subprocess.check_output(['git',*a],cwd=R,stderr=subprocess.PIPE)
assert git('rev-parse','HEAD').decode().strip()==BASE and not git('status','--porcelain')
git('fetch','origin','refs/heads/research/lupine-discovery');assert git('rev-parse','FETCH_HEAD').decode().strip()==BASE
copyraw=(H/'copyset.json').read_bytes();assert sha(copyraw)=='9c7921d0382548cf97bb1d08177419019a1a2cc8f27a723a7b6136106a0d2af2';copy=json.loads(copyraw)
manifest_path=R/'reports/runtime-manifest.json';old=manifest_path.read_bytes();(H/'manifest-before.json').write_bytes(old)
for f in copy['files']:
 assert sha((R/f['path']).read_bytes())==f['original_sha256']
 assert sha((H/f['candidate']).read_bytes())==f['candidate_sha256']
for f in copy['files']:(R/f['path']).write_bytes((H/f['candidate']).read_bytes())
subprocess.run([sys.executable,'scripts/runtime_manifest.py','--write','--checkpoint','phase2-fixture-housekeeping-followthrough-v1'],cwd=R,check=True)
new=manifest_path.read_bytes();bound=json.loads(new)['files'];assert len(bound)==351 and all(sha((R/p).read_bytes())==d for p,d in bound.items());(H/'manifest-tested.json').write_bytes(new)
changed=[p for p in bound if bound[p]!=json.loads(old)['files'].get(p)];assert set(changed)=={f['path'] for f in copy['files']}
modules=copy['focused_modules']+['test_li_v3_readiness_production'];interpreter=R/'.cache/phase2-final-ci-failure-v1/venv311/bin/python';argv=[str(interpreter),'-m','unittest',*modules,'-v'];env=os.environ.copy();env['PYTHONPATH']=str(R/'tests');env['GIT_TRACE2_EVENT']=str(H/'focused-git-trace.jsonl')
started=now();(H/'focused-started.json').write_text(json.dumps({'started_at':started,'argv':argv,'cwd':str(R),'base_commit':BASE,'test_source_copyset_sha256':sha(copyraw),'manifest_sha256':sha(new),'runtime_files':351,'changed':changed,'pythonpath':env['PYTHONPATH'],'git_trace':env['GIT_TRACE2_EVENT']},indent=2)+'\n')
with (H/'focused.stdout').open('xb') as out,(H/'focused.stderr').open('xb') as err: result=subprocess.run(argv,cwd=R,env=env,stdout=out,stderr=err,stdin=subprocess.DEVNULL)
finished=now();stderr=(H/'focused.stderr').read_bytes();trace=(H/'focused-git-trace.jsonl').read_bytes();events=[json.loads(line) for line in trace.decode().splitlines()];auto=[e for e in events if e.get('event')=='child_start' and '--auto' in e.get('argv',[]) and any(x in ('gc','maintenance') for x in e.get('argv',[]))];held=manifest_path.read_bytes()==new and all(sha((R/p).read_bytes())==d for p,d in bound.items());runs=re.findall(rb'Ran (\d+) tests in ([\d.]+)s',stderr)
receipt={'started_at':started,'finished_at':finished,'argv':argv,'returncode':result.returncode,'test_summary':[[int(n),t.decode()] for n,t in runs],'runtime_source_held':held,'runtime_files':351,'runtime_files_changed':len(changed),'automatic_housekeeping_launches':auto,'git_trace_sha256':sha(trace),'git_trace_bytes':len(trace),'stderr_sha256':sha(stderr),'stdout_sha256':sha((H/'focused.stdout').read_bytes()),'scope':'Generated fixtures and retained public artifacts only; no new scientific acquisition/evaluation','status':'PASS' if result.returncode==0 and held and not auto else 'FAIL'};(H/'focused-execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2));print(stderr.decode()[-500:]);raise SystemExit(0 if receipt['status']=='PASS' else 1)
