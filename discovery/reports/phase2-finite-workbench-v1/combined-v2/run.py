from pathlib import Path
import datetime,hashlib,importlib.util,json,os,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-finite-combined-v2';mirror=out/'mirror/discovery'
spec=importlib.util.spec_from_file_location('manifest',mirror/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);before=m.source_files(mirror)
(out/'held-runtime.json').write_text(json.dumps({'files':before},indent=2)+'\n')
commands=[['-m','unittest','discover','-s','tests','-p','test_*planning*.py','-v'],['-m','unittest','discover','-s','tests','-p','test_package*.py','-v'],['-m','unittest','discover','-s','tests','-p','test_retained*.py','-v'],['scripts/package_smoke.py']]
for i,args in enumerate(commands):
    folder=out/str(i);folder.mkdir(exist_ok=False);cmd=[sys.executable,*args];start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
    (folder/'start.json').write_text(json.dumps({'command':cmd,'started_at':start,'source_scope':'uncommitted combined overlay'},indent=2)+'\n')
    with (folder/'stdout.txt').open('xb') as a,(folder/'stderr.txt').open('xb') as b:r=subprocess.run(cmd,cwd=mirror,stdout=a,stderr=b,env={**os.environ,'PYTHONPATH':str(mirror/'src')})
    after=m.source_files(mirror);receipt={'command':cmd,'cwd':str(mirror),'source_scope':'uncommitted combined overlay','started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode,'runtime_files':len(before),'source_before':before,'source_after':after,'source_unchanged':before==after,'stdout_sha256':hashlib.sha256((folder/'stdout.txt').read_bytes()).hexdigest(),'stderr_sha256':hashlib.sha256((folder/'stderr.txt').read_bytes()).hexdigest()}
    (folder/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k not in ('source_before','source_after')}),flush=True)
    if i<3:print('\n'.join((folder/'stderr.txt').read_text().splitlines()[-5:]),flush=True)
    if r.returncode:sys.exit(r.returncode)
    assert receipt['source_unchanged']
