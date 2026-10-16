"""Source-only AST/diff audit; imports no project or candidate module."""
from pathlib import Path
import ast,copy,difflib,hashlib,json
base=Path(__file__).resolve().parent
core=(base/'li_v3_readiness.py').read_bytes();source=(base/'li_v3_readiness_production.py').read_bytes()
assert hashlib.sha256(core).hexdigest()=='5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219'
ct,st=ast.parse(core),ast.parse(source)
def function(tree,name):return next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name)
def data_branch(fn):
 return next(n for n in ast.walk(fn) if isinstance(n,ast.If) and ast.dump(n.test,include_attributes=False)==ast.dump(ast.parse("kind == 'DATA'",mode='eval').body,include_attributes=False))
class Normalize(ast.NodeTransformer):
 def visit_Attribute(self,node):
  self.generic_visit(node)
  return ast.copy_location(ast.Name(id=node.attr,ctx=node.ctx),node) if isinstance(node.value,ast.Name) and node.value.id=='core' else node
original=data_branch(function(ct,'_frame'));adapted=Normalize().visit(copy.deepcopy(data_branch(function(st,'_complete_frame'))))
assert ast.dump(original,include_attributes=False)==ast.dump(adapted,include_attributes=False)
for old,new in [('_frame_binding','_complete_frame_binding'),('_frame','_complete_frame')]:
 a=ast.get_source_segment(core.decode(),function(ct,old));b=ast.get_source_segment(source.decode(),function(st,new))
 (base/(new.lstrip('_')+'-adaptation.diff')).write_text(''.join(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='pure5fd1:'+old,tofile='adapter:'+new)))
old=(base/'inventory-checkpoint-v1/li_v3_readiness_production.py').read_text()
(base/'inventory-to-complete-route.diff').write_text(''.join(difflib.unified_diff(old.splitlines(True),source.decode().splitlines(True),fromfile='inventory60d0',tofile='complete-route')))
result={'core_sha256':hashlib.sha256(core).hexdigest(),'adapter_sha256':hashlib.sha256(source).hexdigest(),
 'pure_core_byte_identical':True,'strict_DATA_branch_AST_identical_after_core_namespace_qualification':True,
 'frame_helper_adaptation_diffs':['complete_frame_binding-adaptation.diff','complete_frame-adaptation.diff'],
 'integration_delta':'inventory-to-complete-route.diff','actual_source_operations':0,'candidate_imports':0,
 'interpretation':'AST/source equivalence only. It does not prove semantics, exposure completeness, physical truth or actual-source admission.'}
(base/'complete-route-source-audit.json').write_text(json.dumps(result,sort_keys=True,indent=2)+'\n');print(json.dumps(result,indent=2))
