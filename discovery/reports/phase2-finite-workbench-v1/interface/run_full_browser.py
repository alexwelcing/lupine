from pathlib import Path
import datetime,hashlib,importlib.util,json,os,shutil,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-finite-ui-candidate-v1';mirror=root/'.cache/phase2-finite-combined-v1/mirror/discovery'
run=out/'browser-attempt-1';run.mkdir(exist_ok=False)
spec=importlib.util.spec_from_file_location('manifest',mirror/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
before=m.source_files(mirror);held=json.loads((root/'.cache/phase2-finite-combined-v1/held-runtime.json').read_text())['files'];assert before==held
cmd=[sys.executable,'scripts/browser_smoke.py'];start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
(run/'start.json').write_text(json.dumps({'command':cmd,'cwd':str(mirror),'started_at':start,'source_scope':'uncommitted combined overlay','base_commit':'ea69d01e144747c97bf288b37249f39af9e8f715','runtime_files':len(before)},indent=2)+'\n')
with (run/'stdout.txt').open('xb') as a,(run/'stderr.txt').open('xb') as b:r=subprocess.run(cmd,cwd=mirror,stdout=a,stderr=b,env={**os.environ,'PYTHONPATH':str(mirror/'src')})
after=m.source_files(mirror)
artifacts=mirror/'.cache/browser/decision-pool'
if artifacts.exists():shutil.copytree(artifacts,run/'artifacts')
receipt={'command':cmd,'cwd':str(mirror),'source_scope':'uncommitted combined overlay','base_commit':'ea69d01e144747c97bf288b37249f39af9e8f715','started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode,'runtime_files':len(before),'source_before':before,'source_after':after,'source_unchanged':before==after,'stdout_sha256':hashlib.sha256((run/'stdout.txt').read_bytes()).hexdigest(),'stderr_sha256':hashlib.sha256((run/'stderr.txt').read_bytes()).hexdigest()}
(run/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k not in ('source_before','source_after')}),flush=True)
print((run/'stderr.txt').read_text()[-5000:],flush=True)
assert receipt['source_unchanged'];sys.exit(r.returncode)
