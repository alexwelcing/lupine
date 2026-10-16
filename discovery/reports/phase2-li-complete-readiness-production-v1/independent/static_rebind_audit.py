"""Source-only exact baseline rebind audit; no candidate import or guard call."""
from pathlib import Path
from hashlib import sha256
import argparse
import ast
import copy
import json
import subprocess

OWN=Path(__file__).absolute().parent
ROOT=OWN.parent.parent
p=argparse.ArgumentParser()
for flag in ('before-source','before-sha256','source','sha256','new-commit','new-manifest-sha256','output'):
    p.add_argument('--'+flag,required=True)
a=p.parse_args()
old=Path(a.before_source).absolute();new=Path(a.source).absolute();out=Path(a.output).absolute()
assert old.is_relative_to(OWN) and new.parent==ROOT/'.cache/phase2-li-complete-readiness-production-v1'
assert out.is_relative_to(OWN) and not out.exists()
old_raw=old.read_bytes();new_raw=new.read_bytes()
assert sha256(old_raw).hexdigest()==a.before_sha256 and sha256(new_raw).hexdigest()==a.sha256
old_tree=ast.parse(old_raw);new_tree=ast.parse(new_raw)
KEYS={'BASELINE_COMMIT','BASELINE_MANIFEST_SHA256'}
def literal_values(tree):
    values={}
    for node in tree.body:
        if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name):
            try:values[node.targets[0].id]=ast.literal_eval(node.value)
            except (ValueError,TypeError):pass
    return values
def normalized(tree):
    tree=copy.deepcopy(tree)
    for node in tree.body:
        if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name) and node.targets[0].id in KEYS:
            node.value=ast.Constant(value=None)
    return ast.dump(tree,include_attributes=False)
def git_show(commit,path):
    return subprocess.run(['git','show',commit+':discovery/'+path],cwd=ROOT,check=True,capture_output=True).stdout
checks=[]
def check(name,value):checks.append({'name':name,'pass':bool(value)})
v0=literal_values(old_tree);v1=literal_values(new_tree)
check('old_baseline_is_reviewed2975',v0['BASELINE_COMMIT']=='2975d6d0b9111cc84adb82ccc673bc82339ab154' and v0['BASELINE_MANIFEST_SHA256']=='b2c35e48c8dc837d78aba0047d112dabbd30b8ff11e66bba0f45e9da92a0eb2f')
check('new_commit_and_manifest_exact',v1['BASELINE_COMMIT']==a.new_commit and v1['BASELINE_MANIFEST_SHA256']==a.new_manifest_sha256)
check('only_two_baseline_assignment_AST_changes',normalized(old_tree)==normalized(new_tree))
check('all_other_literal_pins_unchanged',{k:v for k,v in v0.items() if k not in KEYS}=={k:v for k,v in v1.items() if k not in KEYS})
check('runtime_count339_retained',type(v1['BASELINE_RUNTIME_COUNT']) is int and v1['BASELINE_RUNTIME_COUNT']==339)
b0=git_show(v0['BASELINE_COMMIT'],'reports/runtime-manifest.json');b1=git_show(a.new_commit,'reports/runtime-manifest.json')
check('old_Git_manifest_identity',sha256(b0).hexdigest()==v0['BASELINE_MANIFEST_SHA256'])
check('new_Git_manifest_identity',sha256(b1).hexdigest()==a.new_manifest_sha256)
m0=json.loads(b0)['files'];m1=json.loads(b1)['files']
check('same339_manifest_paths',len(m0)==len(m1)==339 and set(m0)==set(m1))
delta={k:{'before':m0.get(k),'after':m1.get(k)} for k in set(m0)|set(m1) if m0.get(k)!=m1.get(k)}
expected='tests/test_retained_mpea_transport.py'
check('only_authorized_transport_delta',set(delta)=={expected} and m1.get(expected)=='bce07a6927df9efe261f0477eae7b65f7babbd227721fb77333b7fe34188cf82')
check('all339_worktree_bytes_match_new_manifest',all(sha256((ROOT/k).read_bytes()).hexdigest()==v for k,v in m1.items()))
check('all339_published_Git_bytes_match_new_manifest',all(sha256(git_show(a.new_commit,k)).hexdigest()==v for k,v in m1.items()))
check('pure_core_exact',sha256((new.parent/'li_v3_readiness.py').read_bytes()).hexdigest()=='5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219')
check('held_source_before_after',sha256(old.read_bytes()).hexdigest()==a.before_sha256 and sha256(new.read_bytes()).hexdigest()==a.sha256)
report={'schema':'li.readiness.independent-static-baseline-rebind.v1','before_source_sha256':a.before_sha256,'final_source_sha256':a.sha256,'new_commit':a.new_commit,'new_manifest_sha256':a.new_manifest_sha256,'runtime_delta':delta,'checks':checks,'checks_count':len(checks),'passed':all(c['pass'] for c in checks),'scope':'Source/Git byte and AST audit only. No candidate import, production guard, actual workbook/capture or private data reads; no network.'}
out.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'passed':report['passed'],'checks':len(checks),'receipt_sha256':sha256(out.read_bytes()).hexdigest()}))
raise SystemExit(0 if report['passed'] else 1)
