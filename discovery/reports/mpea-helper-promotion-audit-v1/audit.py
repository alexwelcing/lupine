"""Read-only promotion/provenance audit; never executes a test or freeze runner."""
from pathlib import Path
from hashlib import sha256
import ast,base64,difflib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[2];REPO=ROOT.parent;OUT=Path(__file__).parent
h=lambda raw:sha256(raw).hexdigest()
def load(path):return json.loads(path.read_bytes())
expected={'scripts/mpea_stage_usage.py':'ae1967ee12d778e02dc92ec8a8af41035e58c62c835236eed6f9322aa04cd5d0','scripts/mpea_archive_profiles.py':'1d9d8da568fd7d15c30b268832739b13a7ec6b281edfc93f8c700cea889c936f','scripts/mpea_archive_artifacts.py':'0f251d97ca247b29f06f2a6f32251b1ca443baf52047b0e07de8c50befa812a6','scripts/mpea_archive_operations.py':'9ce72dd8ce48dfa5f1a4b3535f992ad4b38ea7c07fb86ead01a86970c479bf3e'}
actual={p:h((ROOT/p).read_bytes()) for p in expected};assert actual==expected
reports={};bindings=dict(actual)
for folder in ('mpea-resource-profiles-review-v1','mpea-artifact-helpers-review-v1','mpea-operations-review-v1'):
 p=ROOT/'reports'/folder;manifest=load(p/'manifest.json');verified=0
 for name,row in manifest['files'].items():
  raw=(p/name).read_bytes();assert h(raw)==row['stored_sha256'];wrapper=json.loads(raw);decoded=base64.b64decode(wrapper['bytes'],validate=True)
  assert h(decoded)==row['original_sha256'];assert wrapper.get('sha256',wrapper.get('original_sha256'))==row['original_sha256'];verified+=1
  bindings[str((p/name).relative_to(ROOT))]=h(raw)
 assert verified==manifest['count'];bindings[str((p/'manifest.json').relative_to(ROOT))]=h((p/'manifest.json').read_bytes())
 reports[folder]={'decoded_copy_count':verified,'manifest_sha256':h((p/'manifest.json').read_bytes())}
def assertion_calls(raw):
 tree=ast.parse(raw)
 return [ast.dump(n,include_attributes=False) for n in ast.walk(tree) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr.startswith('assert')]
promotions=[]
for folder,filename in (('mpea-resource-profiles-review-v1','stage-usage-promotion.json'),('mpea-artifact-helpers-review-v1','main-promotion.json'),('mpea-operations-review-v1','main-promotion.json')):
 p=ROOT/'reports'/folder/filename;bindings[str(p.relative_to(ROOT))]=h(p.read_bytes());m=load(p);rows=m if type(m)is list else m['tests']
 for row in rows:
  original=row.get('origin',row.get('original'));dest=row['destination'];a=(ROOT/original).read_bytes();b=(ROOT/dest).read_bytes()
  assert h(b)==row.get('promoted_sha256',row.get('sha256',row.get('candidate_sha256')))
  if 'original_sha256' in row:assert h(a)==row['original_sha256']
  if dest.startswith('tests/'):assert assertion_calls(a)==assertion_calls(b)
  promotions.append({'original':original,'destination':dest,'original_sha256':h(a),'main_sha256':h(b),'assertion_AST_unchanged':dest.startswith('tests/'),'diff':''.join(difflib.unified_diff(a.decode().splitlines(True),b.decode().splitlines(True)))})
  bindings[dest]=h(b)
# Verify the first-level helper portable adaptation against its authentic original.
p=ROOT/'reports/mpea-artifact-helpers-review-v1/portable/manifest.json.bytes.json';portable=json.loads(base64.b64decode(load(p)['bytes']))
for row in portable['tests']:
 a=(ROOT/row['original']).read_bytes();b=(ROOT/row['destination']).read_bytes();assert h(a)==row['original_sha256'] and h(b)==row['candidate_sha256'];assert assertion_calls(a)==assertion_calls(b)
 promotions.append({'original':row['original'],'destination':row['destination'],'original_sha256':h(a),'main_sha256':h(b),'assertion_AST_unchanged':True,'diff':''.join(difflib.unified_diff(a.decode().splitlines(True),b.decode().splitlines(True)))})
logs=[]
for folder,verification in (('mpea-resource-profiles-review-v1','stage-usage-main-verification.json'),('mpea-artifact-helpers-review-v1','main-verification.json'),('mpea-operations-review-v1','main-verification.json')):
 p=ROOT/'reports'/folder;v=load(p/verification);bindings[str((p/verification).relative_to(ROOT))]=h((p/verification).read_bytes())
 rows=v.get('logs',{})
 if not rows:rows={'stage-usage-main-tests.txt' if 'resource' in folder else 'main-tests.txt':{'sha256':v['log_sha256'],'test_count':v['test_count'],'exit_code':v['exit_code']}}
 total=0
 for name,row in rows.items():
  raw=(p/name).read_bytes();assert h(raw)==row['sha256'];text=raw.decode();summary=re.findall(r'^Ran ([0-9]+) tests? in ',text,re.M);assert summary==[str(row['test_count'])] and re.search(r'^OK\s*$',text,re.M) and 'skipped=' not in text and row['exit_code']==0
  logs.append({'path':str((p/name).relative_to(ROOT)),'sha256':h(raw),'recorded_exit_code':row['exit_code'],'parsed_test_count':int(summary[0]),'not_rerun':True});total+=int(summary[0]);bindings[str((p/name).relative_to(ROOT))]=h(raw)
 assert total==v['test_count']
# Source-inspect freeze closure against registration's same required-path operations.
runner=ROOT/'.cache/run-contract-freeze-suite.py';runnerraw=runner.read_bytes();registration=(ROOT/'scripts/mpea_registration_allocation.py').read_bytes()
rtree=ast.parse(runnerraw);gtree=ast.parse(registration)
fn=next(n for n in rtree.body if isinstance(n,ast.FunctionDef) and n.name=='closure_paths')
required_stmts=[]
for n in fn.body:
 if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='required' for t in n.targets):required_stmts.append(n)
 elif isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and isinstance(n.value.func,ast.Attribute) and isinstance(n.value.func.value,ast.Name) and n.value.func.value.id=='required':required_stmts.append(n)
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=REPO).decode().split('\0');tracked=[n for n in tracked if n]
pins=next(ast.literal_eval(n.value) for n in gtree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='METADATA_PINS' for t in n.targets))
from types import SimpleNamespace
ns={'tracked':tracked,'reg':SimpleNamespace(METADATA_PINS=pins)}
exec(compile(ast.fix_missing_locations(ast.Module(body=required_stmts,type_ignores=[])),'closure-statements','exec'),ns)
runner_set=ns['required'];required={n for n in tracked if n.startswith(('discovery/src/','discovery/scripts/','discovery/tests/','discovery/formal/'))}
required.update({'.github/workflows/discovery-verify.yml','discovery/pyproject.toml','discovery/docs/mpea-registration-publication-v1.md'})
required.update('discovery/docs/'+n for n in ('mpea-t25-archival-protocol-v1.md','mpea-t25-implementation-contract-v1.md','mpea-t25-operational-enforcement-v1.md'))
required.update('discovery/'+n for n in pins)
required.update('discovery/reports/mpea-protocol-review-v1/randomization/'+n for n in ('README.md','engineering-v1.json','permutation_allocation.py','test_permutation_allocation.py','tests-final.txt','peer-review-note-v1.json'))
required.update('discovery/reports/mpea-feature-readiness-v1/'+q+'/'+n for q in ('process-1','process-2') for n in ('readiness.json','execution.json'));required.add('discovery/reports/mpea-feature-readiness-v1/reproduction.json')
assert runner_set==required
runner_review={'runner_sha256':h(runnerraw),'registration_source_sha256':h(registration),'current_index_closure_count':len(required),'closure_paths_identical_under_fixed_canonical_three_specifications':True,'closure_path_set_sha256':h(json.dumps(sorted(required),separators=(',',':')).encode()),'source_index_parity_gate':'before snapshot hashes checked against git show :path before exclusive output creation and subprocess.run','process_capture':'actual subprocess.run exact unittest command,cwd discovery, stdout+stderr retained; actual returncode recorded; genuine sourcebefore/after maps plus unskipped summary determine exit','executed':False,'limitations':'Parent-authenticated private recorder, not hostile-filesystem/process proof. python_executable metadata is recorder sys.executable while command invokes PATH python; parent should establish interpreter equality or record actual child interpreter. Subsequent commit/CI must authenticate exact closure. This audit does not attest actual suite execution.'}
bindings['.cache/run-contract-freeze-suite.py']=h(runnerraw);bindings['scripts/mpea_registration_allocation.py']=h(registration)
receipt={'schema':'lupine.mpea.helper-promotion-copy-audit.v1','sources':actual,'bundles':reports,'promotions':promotions,'retained_root_execution_logs':logs,'recorded_counts':[36,51,22],'freeze_runner_review':runner_review,'inputs':bindings,'scope':'Read-only byte/copy/log/runner-source audit, not rerun tests or independent implementation validity for own authored modules. No actual scientific inputs/API/entropy/tag/registration.'}
(OUT/'receipt.json').write_text(json.dumps(receipt,sort_keys=True,indent=2)+'\n');print(json.dumps({'receipt_sha256':h((OUT/'receipt.json').read_bytes()),'wrappers':sum(v['decoded_copy_count'] for v in reports.values()),'logs':len(logs),'closure_count':len(required)}))
