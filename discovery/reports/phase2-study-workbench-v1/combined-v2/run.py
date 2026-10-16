from pathlib import Path
import datetime,hashlib,importlib.util,json,os,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-combined-ui-validation-v2';mirror=root/'.cache/phase2-combined-ui-validation-v1/mirror/discovery'
assert not subprocess.check_output(['git','status','--porcelain'])
spec=importlib.util.spec_from_file_location('manifest',mirror/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);before=m.source_files(mirror)
(out/'held-runtime.json').write_text(json.dumps({'source':'isolated overlay from git archive5addf4f plus14 reviewed replacements/additions','files':before},indent=2)+'\n')
commands=[['-m','unittest','discover','-s','tests','-p','test_package*.py','-v'],['scripts/package_smoke.py'],['scripts/browser_smoke.py']]
for i,args in enumerate(commands):
 folder=out/str(i);folder.mkdir(exist_ok=False);command=[sys.executable,*args];start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
 (folder/'start.json').write_text(json.dumps({'command':command,'cwd':str(mirror),'started_at':start},indent=2)+'\n')
 with (folder/'stdout.txt').open('xb') as a,(folder/'stderr.txt').open('xb') as b:r=subprocess.run(command,cwd=mirror,stdout=a,stderr=b,env={**os.environ,'PYTHONPATH':str(mirror/'src')})
 after=m.source_files(mirror);receipt={'command':command,'cwd':str(mirror),'source_state':'isolated uncommitted combined overlay, not clean retention or exact-commit CI','started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode,'runtime_files':len(before),'source_before':before,'source_after':after,'source_unchanged':before==after,'main_worktree_still_clean':not bool(subprocess.check_output(['git','status','--porcelain'],cwd=root)),'stdout_sha256':hashlib.sha256((folder/'stdout.txt').read_bytes()).hexdigest(),'stderr_sha256':hashlib.sha256((folder/'stderr.txt').read_bytes()).hexdigest()};(folder/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['command','exit_code','elapsed_seconds','runtime_files','source_unchanged','main_worktree_still_clean']}),flush=True)
 if i==0:print('\n'.join((folder/'stderr.txt').read_text().splitlines()[-5:]),flush=True)
 if r.returncode:sys.exit(r.returncode)
 assert receipt['source_unchanged'] and receipt['main_worktree_still_clean']
