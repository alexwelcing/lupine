"""Static predicate-delta and source binding audit; no product import."""
from pathlib import Path
import ast
import copy
import datetime
import hashlib
import json

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
HERE = Path(__file__).parent
CANDIDATE = ROOT / '.cache/phase2-growth-envelope-candidate-v1'
GROWTH = ROOT / '.cache/phase2-growth-hint-production-candidate-v1/promotion'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def constants(tree):
    result = {}
    for n in tree.body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name):
            try:
                result[n.targets[0].id] = ast.literal_eval(n.value)
            except (ValueError, TypeError):
                pass
    return result


class NormalizeDeclaredDelta(ast.NodeTransformer):
    """Remove exactly declared exposure/ownership instrumentation and local-extra delta."""
    def visit_Assign(self, node):
        if all(isinstance(t, ast.Subscript) and isinstance(t.value, ast.Name)
               and t.value.id == 'exposure' for t in node.targets):
            return None
        return self.generic_visit(node)

    def visit_Expr(self, node):
        value = node.value
        if (isinstance(value, ast.Call) and isinstance(value.func, ast.Attribute)
                and isinstance(value.func.value, ast.Name) and value.func.value.id == 'holder'
                and value.func.attr == 'append' and len(value.args) == 1
                and isinstance(value.args[0], ast.Name) and value.args[0].id == 'archive'):
            return None
        return self.generic_visit(node)

    def visit_If(self, node):
        if (isinstance(node.test, ast.Name) and node.test.id == 'extra_len'
                and len(node.body) == 1 and not node.orelse
                and isinstance(node.body[0], ast.Expr)
                and isinstance(node.body[0].value, ast.Call)
                and isinstance(node.body[0].value.func, ast.Name)
                and node.body[0].value.func.id == '_local_growth_shape'):
            expected = ast.parse('_local_growth_shape(raw, end + 30 + name_len, data_start, exposure)').body[0]
            assert ast.dump(node.body[0], include_attributes=False) == ast.dump(expected, include_attributes=False)
            return None
        return self.generic_visit(node)

    def visit_BoolOp(self, node):
        node = self.generic_visit(node)
        if isinstance(node.op, ast.Or):
            node.values = [x for x in node.values if not (isinstance(x, ast.Name) and x.id == 'extra_len')]
        return node

    def visit_ExceptHandler(self, node):
        if (isinstance(node.type, ast.Tuple) and len(node.type.elts) == 2
                and [n.id for n in node.type.elts if isinstance(n, ast.Name)] == ['CustodyError', 'GrowthEnvelopeError']):
            node.type = ast.Name(id='CustodyError', ctx=ast.Load())
        return self.generic_visit(node)


def body(tree, name):
    n = next(x for x in tree.body if isinstance(x, ast.FunctionDef) and x.name == name)
    module = ast.Module(body=copy.deepcopy(n.body), type_ignores=[])
    return ast.dump(NormalizeDeclaredDelta().visit(module), include_attributes=False)


def main():
    path = CANDIDATE / 'promotion/scripts/li_v3_growth_envelope.py'
    raw = path.read_bytes()
    baseline = (ROOT / 'scripts/li_v3_compatible_envelope.py').read_bytes()
    tree, original = ast.parse(raw), ast.parse(baseline)
    values = constants(tree)
    checks = {
        'compatible_baseline_exact': sha(baseline) == 'e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847',
        'header_predicate_AST_equal_after_declared_delta': body(tree, '_growth_zip_structure') == body(original, '_compatible_zip_structure'),
        'four_G30_pins_match_reviewed_candidate': len(values['GROWTH_FILES']) == 4 and all(sha((GROWTH / p).read_bytes()) == h for p, h in values['GROWTH_FILES'].items()),
        'fixed_existing_G29_prerequisite': values['PREREQUISITE'] == '.cache/li-v3-custody/local-extra-headers-v1/1/public.json' and values['PREREQUISITE_SHA256'] == '52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e' and values['PREREQUISITE_PRODUCER'] == 'd0505b9b358a4bdeafbd742f1aeeb6c2b955abf3',
    }
    record = {
        'schema': 'lupine.discovery.growth_envelope_static_source_audit.v1',
        'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'source_sha256': sha(raw), 'baseline_sha256': sha(baseline),
        'checks': checks, 'status': 'PASS' if all(checks.values()) else 'FAIL',
        'scope': 'Static AST/byte checks only; removed old extra_len disjunct, exact new per-entry span call, exposure assignments, ownership append and new shape-exception branch before comparison. This checks retained predicates, not correctness of the removed new code; that code receives separate source/tests review. No product import or actual custody operation.',
    }
    (HERE / 'static-audit.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
    print(json.dumps(record, indent=2, sort_keys=True))
    return 0 if all(checks.values()) else 1


if __name__ == '__main__':
    raise SystemExit(main())
