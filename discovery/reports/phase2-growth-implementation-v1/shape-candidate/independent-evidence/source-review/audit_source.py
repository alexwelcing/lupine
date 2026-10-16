"""Read-only byte/AST binding audit; never import product or read private data."""
from pathlib import Path
import ast
import datetime
import hashlib
import json

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
HERE = Path(__file__).parent
CANDIDATE = ROOT / '.cache/phase2-growth-hint-production-candidate-v1'
PURE = ROOT / '.cache/phase2-growth-hint-candidate-v1/promotion/scripts/li_v3_growth_hint_shape.py'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def constants(tree):
    values = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            try:
                values[node.targets[0].id] = ast.literal_eval(node.value)
            except (ValueError, TypeError):
                pass
    return values


def function(tree, name):
    return next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)


def statements(nodes):
    return ast.dump(ast.Module(body=nodes, type_ignores=[]), include_attributes=False)


def main():
    script = CANDIDATE / 'promotion/scripts/li_v3_growth_hint_shape.py'
    raw, old_raw = script.read_bytes(), PURE.read_bytes()
    tree, old_tree = ast.parse(raw), ast.parse(old_raw)
    new, old = constants(tree), constants(old_tree)
    old_body = function(old_tree, 'inspect_synthetic_growth_hint').body
    start = next(i for i, node in enumerate(old_body)
                 if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'exposure' for t in node.targets))
    new_body = function(tree, '_inspect_payload').body[1:]
    pin_map = new['PREDECESSOR_FILES']
    manifest_raw = (ROOT / 'reports/runtime-manifest.json').read_bytes()
    manifest = json.loads(manifest_raw)['files']
    public_raw = (CANDIDATE / 'public-prerequisite.json').read_bytes()
    public = json.loads(public_raw)
    checks = {
        'payload_predicate_AST_identical_after_refactor': statements(old_body[start:]) == statements(new_body),
        'pure_source_expected_identity': digest(old_raw) == 'c42313ddc1d6c64e6d9c18338bc3efc9bacc65e7ff7f8281e1da28870e74d7cb',
        'all_25_predecessor_pins_unchanged_from_pure': pin_map == old['PREDECESSOR_FILES'] and len(pin_map) == 25,
        'all_25_predecessor_public_source_bytes_match': all(digest((ROOT / p).read_bytes()) == h for p, h in pin_map.items()),
        'grouped_prior_pins_equal_flat_pins': {p: h for group in new['EXPECTED_PRIOR_GROUPS'].values() for p, h in group.items()} == pin_map,
        'fixed_public_receipt_hash_matches': digest(public_raw) == new['PREREQUISITE_SHA256'] == '52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e',
        'fixed_public_producer_matches': public['implementation']['commit'] == new['PREREQUISITE_PRODUCER'] == 'd0505b9b358a4bdeafbd742f1aeeb6c2b955abf3',
        'fixed_field_size_matches_public_receipt': public['field_headers'] == [{'header_id': 41504, 'data_size': new['OBSERVED_DATA_SIZE']}] and new['OBSERVED_DATA_SIZE'] == 516,
        'all_326_tracked_runtime_bytes_match_manifest': len(manifest) == 326 and all(digest((ROOT / p).read_bytes()) == h for p, h in manifest.items()),
        'synthetic_schema_and_profile_unchanged': (new['SCHEMA'], new['PROFILE']) == (old['SCHEMA'], old['PROFILE']),
    }
    result = {
        'schema': 'lupine.discovery.growth_hint_production_static_audit.v1',
        'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'source_sha256': digest(raw),
        'pure_source_sha256': digest(old_raw),
        'manifest_sha256': digest(manifest_raw),
        'checks': checks,
        'status': 'PASS' if all(checks.values()) else 'FAIL',
        'scope': 'Static AST and public-source byte checks only; no product import, runtime test, private object/capture read or production guard invocation.',
    }
    (HERE / 'static-audit.json').write_text(json.dumps(result, indent=2, sort_keys=True) + '\n')
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if all(checks.values()) else 1


if __name__ == '__main__':
    raise SystemExit(main())
