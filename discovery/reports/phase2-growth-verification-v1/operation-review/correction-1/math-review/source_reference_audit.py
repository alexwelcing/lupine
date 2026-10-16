"""Parse public source ASTs only. Never import or invoke product/auditor code."""
import ast
import hashlib
import json
from pathlib import Path

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
OUT = Path(__file__).parent
BASE = OUT.parent.parent
READS = {}


def tree(path):
    path = ROOT / path
    raw = path.read_bytes()
    READS[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
    return ast.parse(raw)


def function(module, name):
    return next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == name)


def returned_keys(module, name):
    value = next(n.value for n in function(module, name).body if isinstance(n, ast.Return))
    assert isinstance(value, ast.Dict)
    keys = {ast.literal_eval(k) for k in value.keys}
    nested = next(v for k, v in zip(value.keys, value.values) if ast.literal_eval(k) == 'exposure')
    return keys, {ast.literal_eval(k) for k in nested.keys}


def update_keys(fn, owner):
    top, exposure = set(), set()
    for n in ast.walk(fn):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'update':
            target = n.func.value
            if isinstance(target, ast.Name) and target.id == owner:
                top.update(k.arg for k in n.keywords)
            elif (isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name)
                  and target.value.id == owner and ast.literal_eval(target.slice) == 'exposure'):
                exposure.update(k.arg for k in n.keywords)
        if isinstance(n, ast.Assign):
            for target in n.targets:
                if isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name) and target.value.id == owner:
                    top.add(ast.literal_eval(target.slice))
    assert None not in top | exposure
    return top, exposure


def direct_refs(fn, name):
    return {n.slice.value for n in ast.walk(fn)
            if isinstance(n, ast.Subscript) and isinstance(n.value, ast.Name) and n.value.id == name
            and isinstance(n.slice, ast.Constant) and isinstance(n.slice.value, str)}


zip_source = tree('scripts/li_v3_zip_diagnostic.py')
compatible = tree('scripts/li_v3_compatible_zip_diagnostic.py')
local = tree('scripts/li_v3_local_extra_headers.py')
shape = tree('scripts/li_v3_growth_hint_shape.py')
envelope = tree('scripts/li_v3_growth_envelope.py')
custody = tree('scripts/li_v3_custody.py')

# The manually reviewed constructor chain has these exact removals. No source
# function is called, and no receipt or scientific byte buffer is supplied.
g29_top, g29_exposure = returned_keys(zip_source, '_base')
g29_top.remove('legacy_zip_reason')
for module in (compatible, local):
    a, b = update_keys(function(module, '_base'), 'report')
    g29_top |= a
    g29_exposure |= b
g29_top -= {'categories', 'primary_categories', 'supplementary_local_categories',
            'compatible_reason', 'first_rejection_stage', 'same_entry_local_checks'}
shape_top, shape_exposure = set(g29_top), set(g29_exposure)
a, b = update_keys(function(shape, '_result'), 'prior')
shape_top |= a
shape_top.remove('field_headers')
shape_exposure |= b
envelope_top, envelope_exposure = returned_keys(custody, '_base')
a, b = update_keys(function(envelope, '_new_report'), 'report')
envelope_top |= a
envelope_exposure |= b
assert (len(shape_top), len(shape_exposure), len(envelope_top), len(envelope_exposure)) == (28, 32, 29, 38)

results = {}
for suffix in ('', '_corrected'):
    audit = tree('.cache/phase2-growth-operation-review-v1/audit_completed_operations' + suffix + '.py')
    result = {}
    science = direct_refs(function(audit, 'science'), 'report')
    for name, top, exposure in [('shape_report', shape_top, shape_exposure),
                                ('envelope_report', envelope_top, envelope_exposure)]:
        fn = function(audit, name)
        missing = (direct_refs(fn, 'report') | science) - top
        missing_exposure = direct_refs(fn, 'exposure') - exposure
        missing_prior = direct_refs(fn, 'prior') - g29_top
        result[name] = {'top_keys': sorted(top), 'exposure_keys': sorted(exposure),
                        'missing_direct_top': sorted(missing),
                        'missing_direct_exposure': sorted(missing_exposure),
                        'missing_direct_prior': sorted(missing_prior)}
        if suffix:
            assert not missing and not missing_exposure and not missing_prior
        elif name == 'shape_report':
            assert missing == missing_prior == {'legacy_zip_reason'}
    results['corrected' if suffix else 'original'] = result

result = {'scope': 'Independent direct-key source AST reconstruction plus manual dynamic-key review; not auditor/product execution.',
          'source_bindings': READS, 'results': results,
          'original_absent_key_detected_statically': True,
          'corrected_direct_keys_bound': True,
          'actual_operation_receipts_read': False,
          'product_or_auditor_imported_or_executed': False}
with (OUT / 'source-reference-result.json').open('x') as stream:
    json.dump(result, stream, sort_keys=True, indent=2)
    stream.write('\n')
print(json.dumps({'status': 'PASS_STATIC_REFERENCE_SCOPE', 'original_missing': 'legacy_zip_reason',
                  'corrected_missing': [], 'shape_schema_sizes': [28, 32], 'envelope_schema_sizes': [29, 38]}))
