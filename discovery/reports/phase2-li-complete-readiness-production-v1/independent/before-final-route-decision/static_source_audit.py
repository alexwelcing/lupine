"""Held-source syntax/byte binding audit; never import project or candidate code."""
from pathlib import Path
from hashlib import sha256
import ast
import argparse
import json
import subprocess

OWN=Path(__file__).absolute().parent;ROOT=OWN.parent.parent
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--sha256',required=True);p.add_argument('--output',required=True);a=p.parse_args()
source=Path(a.source).absolute();output=Path(a.output).absolute()
assert output.is_relative_to(OWN) and not output.exists()
raw=source.read_bytes();assert sha256(raw).hexdigest()==a.sha256
tree=ast.parse(raw)
def constants(tree):
    result={}
    for node in tree.body:
        if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name):
            try:result[node.targets[0].id]=ast.literal_eval(node.value)
            except (ValueError,TypeError):pass
    return result
values=constants(tree)
expected={'CORE_SHA256':'5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219',
 'BASELINE_COMMIT':'2975d6d0b9111cc84adb82ccc673bc82339ab154',
 'BASELINE_MANIFEST_SHA256':'b2c35e48c8dc837d78aba0047d112dabbd30b8ff11e66bba0f45e9da92a0eb2f',
 'BASELINE_RUNTIME_COUNT':339,
 'PREREQUISITE':'.cache/li-v3-custody/growth-predicate-audit-v1/1/public.json',
 'PREREQUISITE_SHA256':'68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be',
 'PREREQUISITE_PRODUCER':'a064a2c0e4a7cce1fbcb0541f49aae132944e785',
 'PROJECTION_SHA256':'f905ac1f31d4f139da54139585e91aeb346d3abf540bb87f1b306c042faf345e',
 'MAX_PUBLIC':2*1024*1024,'MAX_PINNED_FILE':8*1024*1024,'PHASE_BINDINGS':{'inventory':None,'frame':None}}
# Only literal safe constant multiplication is evaluated; no project execution.
for n in tree.body:
    if isinstance(n,ast.Assign) and len(n.targets)==1 and isinstance(n.targets[0],ast.Name) and n.targets[0].id in ('MAX_PUBLIC','MAX_PINNED_FILE'):
        def multiply(n):
            if isinstance(n,ast.Constant) and type(n.value) is int:return n.value
            assert isinstance(n,ast.BinOp) and isinstance(n.op,ast.Mult)
            return multiply(n.left)*multiply(n.right)
        values[n.targets[0].id]=multiply(n.value)
checks=[]
def check(name,value):
    checks.append({'name':name,'pass':bool(value)})
for k,v in expected.items():check('constant:'+k,values.get(k)==v and type(values.get(k)) is type(v))
core=(source.parent/'li_v3_readiness.py').read_bytes();check('pure_core_byte_identity',sha256(core).hexdigest()==expected['CORE_SHA256'])
manifest_raw=subprocess.run(['git','show',expected['BASELINE_COMMIT']+':discovery/reports/runtime-manifest.json'],cwd=ROOT,check=True,capture_output=True).stdout
check('published_baseline_manifest_identity',sha256(manifest_raw).hexdigest()==expected['BASELINE_MANIFEST_SHA256'])
manifest=json.loads(manifest_raw)['files'];check('published_baseline_runtime_count',len(manifest)==339)
check('all_baseline_runtime_files_unchanged',all(sha256((ROOT/n).read_bytes()).hexdigest()==h for n,h in manifest.items()))
functions={n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
check('fixed_public_entrypoint_parameters',[n.arg for n in functions['inspect'].args.args]==['phase','run'] and functions['inspect'].args.vararg is None and functions['inspect'].args.kwarg is None)
check('no_http_dependency',not any(isinstance(n,(ast.Import,ast.ImportFrom)) and any(x in ast.unparse(n) for x in ('requests','urllib','http.client','socket')) for n in ast.walk(tree)))
check('source_still_held',sha256(source.read_bytes()).hexdigest()==a.sha256)
report={'schema':'li.readiness.independent-production-static-audit.v1','source_sha256':a.sha256,'checks':checks,
 'passed':all(c['pass'] for c in checks),'checks_count':len(checks),'scope':'Source syntax, fixed literal pins and published baseline bytes only. No candidate import, tests, guards, private objects or actual operations.'}
output.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'passed':report['passed'],'checks_count':len(checks),'sha256':sha256(output.read_bytes()).hexdigest()}))
raise SystemExit(0 if report['passed'] else 1)
