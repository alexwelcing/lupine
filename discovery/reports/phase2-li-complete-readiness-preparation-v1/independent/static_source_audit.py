"""Read-only AST closure check; never import a candidate or project reader."""
from pathlib import Path
import argparse
import ast
import copy
import hashlib
import json

ROOT=Path(__file__).absolute().parents[2]
a=argparse.ArgumentParser();a.add_argument('--candidate',required=True);a.add_argument('--sha256',required=True);a.add_argument('--output',required=True);args=a.parse_args()
p=Path(args.candidate);raw=p.read_bytes();assert hashlib.sha256(raw).hexdigest()==args.sha256
source=ast.parse(raw)
g31p=ROOT/'scripts/li_v3_growth_envelope.py';g31raw=g31p.read_bytes();g31=ast.parse(g31raw)
g32p=ROOT/'reports/phase2-documentary-layout-preparation-v1/candidate/li_v3_layout_localization.py';g32raw=g32p.read_bytes();g32=ast.parse(g32raw)
def find(tree,name):return next(n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.ClassDef)) and n.name==name)
def dump(n):return ast.dump(n,include_attributes=False)
old=copy.deepcopy(find(g31,'_growth_zip_structure'));old.name='_package_zip_structure'
changed=0
for node in ast.walk(old):
    if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='_member_type':
        node.func.id='_generic_kind';changed+=1
assert changed==1
header_equal=dump(old)==dump(find(source,'_package_zip_structure'))
assert header_equal
copied=('_coordinate','_row','_merge','_WorksheetTarget','_parse_worksheet','_bindings')
equality={name:dump(find(g32,name))==dump(find(source,name)) for name in copied}
assert all(equality.values())
report={'status':'PASS','scope':'Static exact AST preservation of G31 header body except sole kind gate and function rename; exact G32 copied structural functions. No runtime, physical or full semantic proof.',
 'candidate_sha256':args.sha256,'g31_sha256':hashlib.sha256(g31raw).hexdigest(),'g32_sha256':hashlib.sha256(g32raw).hexdigest(),
 'g31_header_equal_except_one_kind_gate':header_equal,'g32_copied_functions_equal':equality,
 'candidate_invocations':0,'actual_source_reads':0,'network_calls':0}
out=Path(args.output);assert not out.exists();out.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n');print(json.dumps(report))
