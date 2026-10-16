from pathlib import Path
import datetime,hashlib,importlib.util,json,subprocess,sys,time
root=Path.cwd();out=Path(__file__).parent
spec=importlib.util.spec_from_file_location('manifest',root/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);before=m.source_files(root)
cmd=[sys.executable,'-m','unittest','discover','-s','tests','-p','test_li_v3*.py','-v'];start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
with (out/'stdout.txt').open('xb') as a,(out/'stderr.txt').open('xb') as b:r=subprocess.run(cmd,stdout=a,stderr=b)
after=m.source_files(root);receipt={'command':cmd,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':r.returncode,'runtime_files':len(before),'source_before':before,'source_after':after,'source_unchanged':before==after,'scope':'Integrated synthetic Li checks on uncommitted reviewed source; no actual archive access','stdout_sha256':hashlib.sha256((out/'stdout.txt').read_bytes()).hexdigest(),'stderr_sha256':hashlib.sha256((out/'stderr.txt').read_bytes()).hexdigest()}
(out/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k not in ('source_before','source_after')}));print('\n'.join((out/'stderr.txt').read_text().splitlines()[-5:]));assert before==after;sys.exit(r.returncode)
