"""Public bytes/AST and saved execution receipt audit; no candidate import."""
import ast
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

ROOT=Path.cwd();BASE=ROOT/'.cache/phase2-documentary-layout-review-v1';AUTHOR=ROOT/'.cache/phase2-li-layout-candidate-v1/documentary-localization-v1'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def identity(path):
 raw=path.read_bytes();return {'path':str(path.relative_to(ROOT)),'bytes':len(raw),'sha256':sha(raw)}
def tree(path):return ast.parse(path.read_text())
def methods(node):return {n.name:ast.dump(n,include_attributes=False) for n in node.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef))}
current=tree(AUTHOR/'li_v3_layout_localization.py');old=tree(BASE/'second/implementation.py')
old_functions=methods(old);new_functions=methods(current);assert old_functions==new_functions
old_class=next(n for n in old.body if isinstance(n,ast.ClassDef) and n.name=='_WorksheetTarget')
new_class=next(n for n in current.body if isinstance(n,ast.ClassDef) and n.name=='_WorksheetTarget')
a,b=methods(old_class),methods(new_class)
assert set(b)-set(a)=={'start_ns'} and not set(a)-set(b)
assert {k for k in a if a[k]!=b[k]}=={'__init__','start'}
assignments={}
for n in current.body:
 if isinstance(n,ast.Assign):
  for target in n.targets:
   if isinstance(target,ast.Name):
    try:assignments[target.id]=ast.literal_eval(n.value)
    except (ValueError,TypeError):pass
proposal=json.loads((ROOT/'reports/phase2-li-layout-localization-design-v1/proposal.json').read_text())
assert assignments['GRAMMAR']=={name:{k:v[k] for k in ('attributes','children','required') if k in v} for name,v in proposal['worksheet_profile']['grammar'].items()}
assert assignments['BOUNDS']=={k:v for k,v in proposal['bounds'].items() if type(v) is int}
assert assignments['PRODUCTION_BINDING'] is None
runs=[]
for name,code,count,failures in (('first',1,26,2),('second',0,26,0),('namespace-final',0,27,0)):
 path=BASE/name;r=json.loads((path/'execution.json').read_text())
 assert r['exit_code']==code and r['source_and_runtime_held'] and r['runtime_count']==332
 before=json.loads((path/'before.json').read_text());after=json.loads((path/'after.json').read_text());assert before==after
 for f,digest in r['source'].items():assert sha((path/f).read_bytes())==digest
 for stream in ('stdout','stderr'):assert sha((path/(stream+'.log')).read_bytes())==r[stream+'_sha256']
 summary=json.loads((path/'stdout.log').read_text().strip())
 assert summary=={'errors':0,'failures':failures,'forbidden_events':[],'skips':0,'tests_run':count}
 runs.append({'receipt':identity(path/'execution.json'),'summary':summary,'elapsed_seconds':r['elapsed_seconds']})
author_runs=[]
for name,count in (('first',31),('namespace_final',33)):
 path=AUTHOR/'receipts'/name;r=json.loads((path/'execution.json').read_text())
 assert r['exit_code']==0 and r['runtime_unchanged'] and r['source_unchanged']
 assert r['runtime_before']==r['runtime_after'] and len(r['runtime_before'])==332
 assert r['source_before']==r['source_after']
 for f,digest in r['source_before'].items():assert sha((path/f).read_bytes())==digest
 for stream in ('stdout','stderr'):assert sha((path/(stream+'.txt')).read_bytes())==r[stream+'_sha256']
 assert f'Ran {count} tests' in (path/'stderr.txt').read_text() and '\nOK\n' in (path/'stderr.txt').read_text()
 author_runs.append({'receipt':identity(path/'execution.json'),'methods':count,'elapsed_seconds':r['elapsed_seconds']})
assert sha((AUTHOR/'li_v3_layout_localization.py').read_bytes())=='4624e68c28f911bc0bcc927834bd9f9bbb8cd4622a47db80f5a99e3f63b6ba7d'
assert sha((AUTHOR/'README.md').read_bytes())=='c16fd29a51f9b1650cff19e77b36bf991c847286ecbd5877633379bdd8f8d65f'
report={'schema':'lupine.discovery.layout_static_receipt_audit.v1','status':'PASS','recorded_utc':datetime.now(timezone.utc).isoformat(),'script':identity(Path(__file__).resolve()),'source':identity(AUTHOR/'li_v3_layout_localization.py'),'contract':identity(AUTHOR/'README.md'),'unchanged_top_level_functions':len(old_functions),'namespace_delta':'Only target __init__/start changed plus new start_ns; all other method and top-level function ASTs unchanged. Grammar and numeric bound dictionaries still exactly match the published design.','independent_runs':runs,'author_runs':author_runs,'source_imports':0,'private_source_or_production_operations':0,'scientific_claim_changed':False}
with (BASE/'static-and-receipt-audit.json').open('x') as f:f.write(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
