"""Source-only AST schema/reference comparison; does not import product/auditor."""
from pathlib import Path
import ast, hashlib, json
ROOT=Path.cwd()
OUT=ROOT/'.cache/phase2-growth-operation-review-v1/correction-1'
SOURCES={}
def parsed(path):
    raw=(ROOT/path).read_bytes();SOURCES[path]=hashlib.sha256(raw).hexdigest()
    return ast.parse(raw)
def function(tree,name):return next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name)
def dictionary_keys(node):return {ast.literal_eval(k) for k in node.keys}
def base_schema(path):
    tree=parsed(path);fn=function(tree,'_base')
    value=next(n.value for n in fn.body if isinstance(n,ast.Return))
    exposure=next(v for k,v in zip(value.keys,value.values) if ast.literal_eval(k)=='exposure')
    return dictionary_keys(value),dictionary_keys(exposure)
def update_schema(path,name,keys,exposure,receiver='report'):
    fn=function(parsed(path),name)
    parents={child:node for node in ast.walk(fn) for child in ast.iter_child_nodes(node)}
    def call_names(node):
        if isinstance(node,ast.Constant):return [node.value]
        parent=parents[node]
        while parent is not fn:
            if isinstance(parent,ast.For) and isinstance(parent.target,ast.Name) and isinstance(node,ast.Name) and parent.target.id==node.id:
                return ast.literal_eval(parent.iter)
            parent=parents[parent]
        raise ValueError('unresolved dynamic pop')
    for call in sorted((n for n in ast.walk(fn) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute)),key=lambda n:(n.lineno,n.col_offset)):
        target=call.func.value
        if isinstance(target,ast.Name) and target.id==receiver:
            if call.func.attr=='pop':
                for key in call_names(call.args[0]):keys.remove(key)
            elif call.func.attr=='update':keys.update(k.arg for k in call.keywords)
        elif (isinstance(target,ast.Subscript) and isinstance(target.value,ast.Name) and target.value.id==receiver
              and isinstance(target.slice,ast.Constant) and target.slice.value=='exposure' and call.func.attr=='update'):
            exposure.update(k.arg for k in call.keywords)
    assert None not in keys and None not in exposure
    return keys,exposure
shape,shape_exp=base_schema('scripts/li_v3_zip_diagnostic.py')
for path,name,receiver in [('scripts/li_v3_compatible_zip_diagnostic.py','_base','report'),('scripts/li_v3_local_extra_headers.py','_base','report')]:
    shape,shape_exp=update_schema(path,name,shape,shape_exp,receiver)
prior=set(shape);prior_exp=set(shape_exp)
shape,shape_exp=update_schema('scripts/li_v3_growth_hint_shape.py','_result',shape,shape_exp,'prior')
envelope,envelope_exp=base_schema('scripts/li_v3_custody.py')
envelope,envelope_exp=update_schema('scripts/li_v3_growth_envelope.py','_new_report',envelope,envelope_exp)
auditpath='.cache/phase2-growth-operation-review-v1/audit_completed_operations_corrected.py'
audit=parsed(auditpath)
def refs(name,root):
    fn=function(audit,name)
    return {n.slice.value for n in ast.walk(fn) if isinstance(n,ast.Subscript) and isinstance(n.value,ast.Name) and n.value.id==root and isinstance(n.slice,ast.Constant) and isinstance(n.slice.value,str)}
def literal_tuple_keys(name):
    fn=function(audit,name);res=set()
    # All constant loop target key tuples plus locally named tuple groups are inspected.
    for node in ast.walk(fn):
        if isinstance(node,ast.For) and isinstance(node.target,ast.Name) and node.target.id=='key' and isinstance(node.iter,ast.Tuple):
            res.update(ast.literal_eval(node.iter))
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ('required','counts','list_keys') for t in node.targets):
            res.update(ast.literal_eval(node.value))
    return res
checks={}
for name,top,exp in [('shape_report',shape,shape_exp),('envelope_report',envelope,envelope_exp)]:
    direct=refs(name,'report')|refs('science','report')
    missing=direct-top
    exrefs=refs(name,'exposure')|literal_tuple_keys(name)
    exmissing=exrefs-exp
    assert not missing,(name,missing)
    assert not exmissing,(name,exmissing)
    checks[name]={'source_top_keys':sorted(top),'source_exposure_keys':sorted(exp),'direct_top_references':sorted(direct),'direct_and_literal_loop_exposure_references':sorted(exrefs),'missing_top':sorted(missing),'missing_exposure':sorted(exmissing)}
assert 'legacy_zip_reason' not in prior and 'legacy_zip_reason' not in shape
assert refs('shape_report','prior')<=prior
assert refs('envelope_report','prior')<=prior
# Dynamic common key lists and result projections are closed, reviewed literals.
for node in audit.body:
    if isinstance(node,ast.Assign):
        for target in node.targets:
            if isinstance(target,ast.Name) and target.id=='SHAPE_KEYS':assert set(ast.literal_eval(node.value))<=shape
            if isinstance(target,ast.Name) and target.id=='SCIENCE_COUNTS':assert set(ast.literal_eval(node.value))<=shape&envelope
assert {'engineering_status','archive_profile_accepted','recognized_roles','member_count','sheet_count'}<=envelope
assert {'schema','status','reason','field_headers','implementation','observed','capture_identity','predecessor_classification','exposure'}<=prior
result={'status':'PASS_SOURCE_REFERENCE_SCOPE','source_bindings':SOURCES,'checks':checks,'remaining_manual_review':'Operation receipt keys match the two held recorder dictionaries; nested observed/capture/source identities are inherited unchanged; exposure-driven dynamic keys are confined by closed source-derived sets. This is source/schema review, not execution or classification validation.','original_missing_key':'legacy_zip_reason','replacement':'Compare entire predecessor_classification to pinned public EXPECTED_CLASSIFICATION, including compatible_reason ZIP_LAYOUT_UNSUPPORTED.','auditor_or_product_imported':False,'actual_receipts_read':False}
with (OUT/'schema-reference-review.json').open('x') as f:json.dump(result,f,indent=2,sort_keys=True);f.write('\n')
print(json.dumps({'status':result['status'],'shape_top_keys':len(shape),'shape_exposure_keys':len(shape_exp),'envelope_top_keys':len(envelope),'envelope_exposure_keys':len(envelope_exp)},sort_keys=True))
