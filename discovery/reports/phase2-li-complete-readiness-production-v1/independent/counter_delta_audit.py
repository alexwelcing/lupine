"""Independent source-only exact counter-correction delta check."""
from pathlib import Path
import ast
import copy
import hashlib
import json

OWN=Path(__file__).absolute().parent
SOURCE=OWN.parent/'phase2-li-complete-readiness-production-v1/li_v3_readiness_production.py'
a=(OWN/'fixture-correction-1/li_v3_readiness_production.py').read_bytes();b=SOURCE.read_bytes()
assert hashlib.sha256(a).hexdigest()=='540088bce4341b1f4137e44ef75244ada5786d000c50af597083dadbfc02c9d8'
assert hashlib.sha256(b).hexdigest()=='a3370ac84762ef7f859061bde93f118a1c1981b02460e9ddd0b1cd38e55b840b'
old=ast.parse(a);new=ast.parse(b)
def dump(node):return ast.dump(node,include_attributes=False)
expected={
 '_prior_production':"if phase == 'layout':\n    _completed_prior_counters(prior, phase)",
 '_prior_inventory':"_completed_prior_counters(prior, 'inventory')",
 '_run_production':"core._require(_matching_prior_counts(prior_layout, prior_inventory), 'PRIOR_RECEIPT_INVALID')",
 '_phase_material':"_require(_matching_prior_counts(layout, inventory), 'PHASE_PRIOR_INVALID')"}
expected={key:dump(ast.parse(value).body[0]) for key,value in expected.items()}
removed=[]
class Strip(ast.NodeTransformer):
    function=None
    def visit_FunctionDef(self,node):
        if node.name in ('_completed_prior_counters','_matching_prior_counts'):
            removed.append(node.name);return None
        before=self.function;self.function=node.name
        value=self.generic_visit(node);self.function=before;return value
    def visit_If(self,node):
        if self.function in expected and dump(node)==expected[self.function]:
            removed.append(self.function);return None
        return self.generic_visit(node)
    def visit_Expr(self,node):
        if self.function in expected and dump(node)==expected[self.function]:
            removed.append(self.function);return None
        return self.generic_visit(node)
stripped=Strip().visit(copy.deepcopy(new))
assert sorted(removed)==sorted([*expected,'_completed_prior_counters','_matching_prior_counts'])
assert dump(stripped)==dump(old)
report={'schema':'li.readiness.independent-counter-delta-audit.v1','before_sha256':hashlib.sha256(a).hexdigest(),'corrected_sha256':hashlib.sha256(b).hexdigest(),'pass':True,'exactly_two_new_helpers_and_four_insertions':True,'all_other_AST_unchanged':True,'removed_nodes':removed,'scope':'Source-only exact delta check plus separately recorded human/source review of the two necessary consistency helper bodies. No import, execution, private input or mathematical-refinement claim.'}
out=OWN/'counter-delta-audit.json';assert not out.exists();out.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'passed':True,'receipt_sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
