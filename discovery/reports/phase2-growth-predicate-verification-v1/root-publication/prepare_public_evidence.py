"""Copy explicit public evidence only, after completed actual G34 operation."""
from pathlib import Path
import datetime,hashlib,json,subprocess
root=Path.cwd();out=root/'.cache/phase2-growth-predicate-verification-release-v1'
report='reports/phase2-growth-predicate-verification-v1';copies={}
def sha(raw):return hashlib.sha256(raw).hexdigest()
def read(p):return json.loads(p.read_bytes())
commit='a064a2c0e4a7cce1fbcb0541f49aae132944e785'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
assert not subprocess.check_output(['git','status','--porcelain'])
ci=read(root/'.cache/phase2-growth-predicate-ci-v1/final.json');assert ci['commit']==commit and ci['all_four_jobs_successful']
ops=root/'.cache/phase2-growth-predicate-operations-v1';actual=read(ops/'production/final.json');assert actual['commit']==commit and actual['status']=='COMPLETE_TWO_IDENTICAL_BOUNDED_DIAGNOSES'
def copy(src,dst,expected=None):
 raw=(root/src).read_bytes();assert expected is None or sha(raw)==expected
 assert not src.endswith(('.tar','.whl','response.body','private.json'))
 p=root/dst;assert not p.exists();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw);copies[dst]={'source':src,'sha256':sha(raw),'bytes':len(raw)}
base='.cache/phase2-growth-predicate-verification-publication-v1';raw=(root/base/'inventory.json').read_bytes();assert sha(raw)=='a9b107adbce7e5050f62a4ccf52ee69f549ffc1313c3f68f2a402fdea9010c0e'
for path,row in json.loads(raw)['files'].items():copy(base+'/promotion/'+path,path,row['sha256'])
for name in ('inventory.json','handoff.json','prepare.py'):copy(base+'/'+name,report+'/publication-preparation/'+name)
copy('.cache/phase2-growth-predicate-ci-v1/final.json',report+'/implementation-ci.json')
for name in ('run_after_ci.py','bindings.json','reviewed-unbound-bindings.json','root-binding.json','root-recorder-review.json','README.md','preparation.json','syntax-only.json','inventory.json','handoff.json'):
 copy('.cache/phase2-growth-predicate-operations-v1/'+name,report+'/operations/'+name)
for name in ('preflight.json','final.json'):
 copy('.cache/phase2-growth-predicate-operations-v1/production/'+name,report+'/operations/production/'+name)
for run in ('1','2'):
 for name in ('start.json','execution.json','stdout.txt','stderr.txt','persisted-public.json'):
  copy('.cache/phase2-growth-predicate-operations-v1/production/'+run+'/'+name,report+'/operations/production/'+run+'/'+name)
 for name in ('reservation.json','public.json'):
  copy('.cache/li-v3-custody/growth-predicate-audit-v1/'+run+'/'+name,report+'/actual/'+run+'/'+name)
copy('.cache/phase2-growth-predicate-release-v1/bind_actual_operation.py',report+'/operations/root-bind.py')
base='.cache/phase2-rhizo-vacancy-methods-v1';index=(root/base/'source-index.json').read_bytes();assert sha(index)=='45e89e6af833388ccef2511ecd2bbc4953ec19bb914c76fea0942e4ed698f1e0'
v=json.loads(index);identities={r['path']:r['sha256'] for r in v['files']}
for name in v['publication_allowlist']:
 assert name in ('README.md','request.json','receipt.json','methods-review.json','source-index.json')
 copy(base+'/'+name,'reports/phase2-rhizo-vacancy-methods-v1/'+name,identities.get(name))
base='.cache/phase2-opc-part-scope-v1';index=(root/base/'source-index.json').read_bytes();assert sha(index)=='5d6a2bad38d24fd2357eb3c9439e16ccdc7d40a9967da09b75bfc1eb96cf937e'
v=json.loads(index);identities={r['path']:r['sha256'] for r in v['files']}
for name in v['publication_allowlist']:
 assert name not in ('primary-page.body','official-part2.zip','part2.pdf','part2.txt')
 copy(base+'/'+name,'reports/phase2-opc-part-scope-v1/'+name,identities.get(name))
base='.cache/phase2-growth-predicate-next-decision-v1'
for name in ('README.md','README.final-v2.md','source-bindings.json','handoff.json','handoff-v2.json'):
 copy(base+'/'+name,report+'/prospective-decision/'+name)
raw=(root/base/'clarification-v2.diff').read_bytes();p=root/report/'prospective-decision/clarification-v2.diff.json'
p.write_text(json.dumps({'schema':'lupine.lossless_log_wrapper.v1','original_path':base+'/clarification-v2.diff','bytes':len(raw),'sha256':sha(raw),'encoding':'utf-8','content':raw.decode()},indent=2)+'\n');copies[str(p.relative_to(root))]={'source':base+'/clarification-v2.diff','sha256':sha(p.read_bytes()),'bytes':len(p.read_bytes())}
copy('.cache/phase2-growth-predicate-verification-release-v1/root-prospective-decision-review.json',report+'/prospective-decision/root-review.json')
(out/'initial-copy-map.json').write_text(json.dumps({'copied_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'producer':commit,'files':copies},indent=2,sort_keys=True)+'\n')
print(json.dumps({'copied_files':len(copies),'actual_first_rejection':actual['first_rejection'],'public_sha256':actual['public_sha256']}))
