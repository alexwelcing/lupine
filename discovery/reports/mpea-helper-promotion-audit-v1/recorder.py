"""Root execution recorder. Run only after held promotion and staging; no study run."""
from pathlib import Path
from hashlib import sha256
import datetime,importlib.util,json,os,re,subprocess,sys,time
root=Path(__file__).resolve().parents[1];repo=root.parent
os.umask(0o077)
out=root/'.cache/mpea-contract-full-suite-v1'
source=root/'scripts/mpea_registration_allocation.py'
spec=importlib.util.spec_from_file_location('registration_freeze_recording',source)
reg=importlib.util.module_from_spec(spec);sys.modules[spec.name]=reg;spec.loader.exec_module(reg)
# This reads committed/staged PUBLIC source and metadata only; it cannot allocate.
def closure_paths():
 tracked=subprocess.check_output(['git','ls-files','-z'],cwd=repo).decode().split('\0')
 required={n for n in tracked if n.startswith(('discovery/src/','discovery/scripts/','discovery/tests/','discovery/formal/'))}
 required.update({'.github/workflows/discovery-verify.yml','discovery/pyproject.toml','discovery/docs/mpea-registration-publication-v1.md'})
 required.update('discovery/docs/'+n for n in ('mpea-t25-archival-protocol-v1.md','mpea-t25-implementation-contract-v1.md','mpea-t25-operational-enforcement-v1.md'))
 required.update('discovery/'+n for n in reg.METADATA_PINS)
 required.update('discovery/reports/mpea-protocol-review-v1/randomization/'+n for n in ('README.md','engineering-v1.json','permutation_allocation.py','test_permutation_allocation.py','tests-final.txt','peer-review-note-v1.json'))
 required.update('discovery/reports/mpea-feature-readiness-v1/'+p+'/'+n for p in ('process-1','process-2') for n in ('readiness.json','execution.json'))
 required.add('discovery/reports/mpea-feature-readiness-v1/reproduction.json')
 # Newly introduced source must already be in the index. Generated caches are ignored.
 untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z','--','discovery/src','discovery/scripts','discovery/tests','discovery/formal'],cwd=repo).decode().split('\0')
 if any(untracked):raise SystemExit('Untracked implementation files: stage the held promotion before this run')
 return required

def snapshot():return {n:sha256((repo/n).read_bytes()).hexdigest() for n in sorted(closure_paths())}
def write(name,value):
 with (out/name).open('x') as f:json.dump(value,f,sort_keys=True,indent=2);f.write('\n')
before=snapshot()
index={n:sha256(subprocess.check_output(['git','show',':'+n],cwd=repo)).hexdigest() for n in before}
if before!=index:raise SystemExit('Held source differs from index; stage the exact reviewed promotion before tests')
out.mkdir(mode=0o700,exist_ok=False);write('source-before.json',before);write('index-before.json',index)
command=['python','-m','unittest','discover','-s','tests','-v']
child_identity_command=['python','-c','import json,sys,platform; print(json.dumps({"executable":sys.executable,"version":platform.python_version()}))']
child_identity=json.loads(subprocess.check_output(child_identity_command,cwd=root,text=True))
started=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
with (out/'unittest.log').open('xb') as log:
 result=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
after=snapshot();write('source-after.json',after)
write('unittest-process.json',{'command':command,'exit_code':result.returncode})
raw=(out/'unittest.log').read_bytes();text=raw.decode('utf-8');matches=re.findall(r'^Ran ([0-9]+) tests? in ',text,re.M)
summary_ok=len(matches)==1 and re.search(r'^OK\s*$',text,re.M) is not None and 'skipped=' not in text
value={'schema':'lupine.discovery.contract-freeze-suite.v1','command':command,'working_directory':'discovery',
 'parent_python_executable':sys.executable,'parent_python_version':sys.version.split()[0],
 'child_python_identity':child_identity,'child_identity_command':child_identity_command,
 'started_at':started,'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'wall_seconds':time.monotonic()-tick,
 'exit_code':result.returncode,'test_count':int(matches[0]) if len(matches)==1 else None,'complete_unskipped_success_summary':summary_ok,
 'source_before':before,'source_after':after,'source_unchanged':before==after,'registration_closure_count':len(before),
 'log_sha256':sha256(raw).hexdigest(),'recorder_sha256':sha256(Path(__file__).read_bytes()).hexdigest(),
 'source_state':'Working source matched index before tests and was tested before commit; later registration must independently verify this exact before/after map against its published commit and complete exact-commit CI.',
 'scope':'Constructed-data full engineering integration. No actual MPEA allocation, performance source capture, target interpretation, registration approval or physical result.'}
write('execution.json',value)
print(json.dumps({k:v for k,v in value.items() if k not in ('source_before','source_after')},sort_keys=True))
sys.exit(result.returncode or (0 if before==after and summary_ok else 2))
