"""Read-only source comparison; never import or execute the prepared probe."""
from __future__ import annotations

import ast
import difflib
import hashlib
import json
from pathlib import Path
import sys
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PREP = ROOT / '.cache/phase2-rhizo-census-release-v1'
HERE = Path(__file__).resolve().parent
FILES = ('scripts/package_smoke.py', 'scripts/verify_retained_artifacts.py',
         'tests/test_package_retention.py', 'tests/test_package_retention_review.py')
FLAG = 'fixed_stored_census_identity_scope_and_http_asset_agreement'
BASE_COMMIT = 'd4d8504a97d362a6339eaa27453a86e0eb167cee'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def assignment(tree, name):
    values = [node for node in tree.body if isinstance(node, ast.Assign)
              and any(isinstance(target, ast.Name) and target.id == name
                      for target in node.targets)]
    require(len(values) == 1, f'exactly one {name} assignment required')
    return values[0]


def probe_checks(tree):
    values = [value for node in ast.walk(tree) if isinstance(node, ast.Dict)
              for key, value in zip(node.keys, node.values)
              if isinstance(key, ast.Constant) and key.value == 'checks']
    require(len(values) == 1, 'exactly one emitted checks list required')
    return ast.literal_eval(values[0])


def main():
    run_name = sys.argv[1]
    require(run_name in ('initial-captured', 'final'), 'closed source-review run name')
    destination = HERE / run_name
    destination.mkdir(exist_ok=False)
    originals = {name: subprocess.check_output(
        ['git', 'show', BASE_COMMIT + ':discovery/' + name], cwd=ROOT) for name in FILES}
    delta_raw = (PREP / 'probe-delta.json').read_bytes()
    helper_raw = (PREP / 'prepare_package_probe.py').read_bytes()
    delta = json.loads(delta_raw)
    prepared_paths = {name: PREP / 'integration' / name for name in FILES}
    supplemental = {}
    if run_name == 'final':
        for name in ('type-sensitive-correction.json', 'promotion-inputs-final.json'):
            supplemental[name] = (PREP / name).read_bytes()
        correction = json.loads(supplemental['type-sensitive-correction.json'])
        promotion = json.loads(supplemental['promotion-inputs-final.json'])
        prepared_paths = {name: ROOT / promotion['files'][name]['source'] for name in FILES}
        delta['prepared_files'] = {name: promotion['files'][name]['sha256'] for name in FILES}
        delta['new_probe_sha256'] = correction['new_probe_sha256']
        for name in FILES:
            if name in correction['after']:
                require(delta['prepared_files'][name] == correction['after'][name],
                        'correction/promotion identity mismatch')
        supplemental['http-test-before.py'] = (PREP / 'before-type-sensitive-comparison/tests/test_server_recorded_census.py').read_bytes()
        supplemental['http-test-after.py'] = (ROOT / promotion['files']['tests/test_server_recorded_census.py']['source']).read_bytes()
        require(sha(supplemental['http-test-before.py']) == correction['before']['tests/test_server_recorded_census.py'],
                'HTTP before hash mismatch')
        require(sha(supplemental['http-test-after.py']) == correction['after']['tests/test_server_recorded_census.py'],
                'HTTP after hash mismatch')
        http_before = supplemental['http-test-before.py'].decode()
        http_expected = http_before.replace('self.assertEqual(body["recorded_census"], self.public)',
            'self.assertEqual(json.dumps(body["recorded_census"], sort_keys=True),\n'
            '                         json.dumps(self.public, sort_keys=True))')
        require(supplemental['http-test-after.py'].decode() == http_expected,
                'HTTP test changed beyond the one type-sensitive assertion')
        require((ROOT / 'tests/test_server_recorded_census.py').read_bytes() == supplemental['http-test-after.py'],
                'tracked HTTP test differs from promotion')
    prepared = {name: path.read_bytes() for name, path in prepared_paths.items()}
    for name in FILES:
        require(sha(originals[name]) == delta['existing_files_before'][name],
                f'original manifest mismatch: {name}')
        require(sha(prepared[name]) == delta['prepared_files'][name],
                f'prepared manifest mismatch: {name}')
        for label, raw in (('original', originals[name]), ('prepared', prepared[name])):
            path = destination / label / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
    (destination / 'probe-delta.json').write_bytes(delta_raw)
    (destination / 'prepare_package_probe.py').write_bytes(helper_raw)
    for name, raw in supplemental.items():
        (destination / name).write_bytes(raw)
    (destination / 'review-comparison-manifest.json').write_text(json.dumps(delta, indent=2, sort_keys=True) + '\n')

    source_trees = [ast.parse(raw.decode('utf-8'))
                    for raw in (originals[FILES[0]], prepared[FILES[0]])]
    probes = [ast.literal_eval(assignment(tree, 'PROBE').value) for tree in source_trees]
    require(sha(probes[0].encode()) == delta['old_probe_sha256'], 'old probe hash mismatch')
    require(sha(probes[1].encode()) == delta['new_probe_sha256'], 'new probe hash mismatch')
    for tree in source_trees:
        assignment(tree, 'PROBE').value = ast.Constant(value='<PROBE>')
    require(ast.dump(source_trees[0]) == ast.dump(source_trees[1]),
            'package implementation outside PROBE changed')

    old_probe, new_probe = map(ast.parse, probes)
    old_checks, new_checks = map(probe_checks, (old_probe, new_probe))
    require(len(old_checks) == 16 and new_checks == old_checks + [FLAG],
            'emitted flags are not original 16 plus mandatory census check')
    verifier_trees = [ast.parse(raw.decode())
                      for raw in (originals[FILES[1]], prepared[FILES[1]])]
    require(ast.literal_eval(assignment(verifier_trees[0], 'CHECKS').value) == old_checks,
            'old verifier flags differ')
    require(ast.literal_eval(assignment(verifier_trees[1], 'CHECKS').value) == new_checks,
            'new verifier flags differ')
    for tree in verifier_trees:
        assignment(tree, 'CHECKS').value = ast.Constant(value='<CHECKS>')
    require(ast.dump(verifier_trees[0]) == ast.dump(verifier_trees[1]),
            'verifier changed beyond CHECKS')

    for name in FILES[2:]:
        require(originals[name].decode().count(delta['old_probe_sha256']) == 1,
                f'old fixed pin occurrence differs: {name}')
        require(prepared[name].decode().count(delta['new_probe_sha256']) == 1,
                f'new fixed pin occurrence differs: {name}')
        expected = originals[name].decode().replace(delta['old_probe_sha256'], delta['new_probe_sha256'])
        if name == FILES[2]:
            expected = expected.replace('installed probe (16 checks)',
                                        'installed probe plus historical census (17 checks)')
        require(prepared[name].decode() == expected,
                f'retention test changed beyond fixed pin/comment: {name}')

    # Every old probe assertion must survive with exactly the same AST. This
    # comparison does not merely count assertions or accept weaker replacements.
    old_assertions = [ast.dump(n) for n in ast.walk(old_probe) if isinstance(n, ast.Assert)]
    new_assertions = [ast.dump(n) for n in ast.walk(new_probe) if isinstance(n, ast.Assert)]
    remaining = list(new_assertions)
    for item in old_assertions:
        require(item in remaining, 'an old probe assertion was removed or changed')
        remaining.remove(item)

    # All source changes are retained verbatim for human review, including
    # assignments/control flow for which assertion preservation alone is weak.
    patch = ''.join(''.join(difflib.unified_diff(originals[name].decode().splitlines(True),
                    prepared[name].decode().splitlines(True),
                    fromfile='original/' + name, tofile='prepared/' + name)) for name in FILES)
    (destination / 'exact-diff.patch.txt').write_text(patch)
    for name in FILES:
        require(subprocess.check_output(['git', 'show', BASE_COMMIT + ':discovery/' + name],
                                        cwd=ROOT) == originals[name], 'Git original changed during review')
        require(prepared_paths[name].read_bytes() == prepared[name], 'prepared changed during review')
        if run_name == 'final':
            require((ROOT / name).read_bytes() == prepared[name], 'tracked/promoted bytes differ')
    require((PREP / 'probe-delta.json').read_bytes() == delta_raw, 'delta changed during review')
    require((PREP / 'prepare_package_probe.py').read_bytes() == helper_raw, 'helper changed during review')
    result = {
        'schema': 'lupine.discovery.source-only-package-probe-review.v1',
        'status': 'STATIC_COMPARISONS_PASS',
        'prepared_code_imported_or_executed': False,
        'tests_or_builds_run': False,
        'private_data_read': False,
        'original_commit': BASE_COMMIT,
        'original_sha256': {name: sha(raw) for name, raw in originals.items()},
        'prepared_sha256': {name: sha(raw) for name, raw in prepared.items()},
        'preparer_sha256': sha(helper_raw), 'delta_sha256': sha(delta_raw),
        'supplemental_source_sha256': {name: sha(raw) for name, raw in supplemental.items()},
        'review_script_sha256': sha(Path(__file__).read_bytes()),
        'diff_sha256': sha(patch.encode()),
        'old_probe_sha256': delta['old_probe_sha256'],
        'new_probe_sha256': delta['new_probe_sha256'],
        'old_checks': old_checks, 'new_checks': new_checks,
        'old_probe_assertions_preserved_exact_ast': len(old_assertions),
        'additional_probe_assertions': len(remaining),
        'retention_tests_only_fixed_pin_and_comment_changed': True,
        'package_outside_probe_ast_unchanged': True,
        'verifier_outside_checks_ast_unchanged': True,
        'all_reviewed_inputs_unchanged_during_capture': True,
        'final_http_test_only_one_type_sensitive_assertion_change': run_name == 'final',
        'scope': 'Source intent and preservation only; no installed runtime, artifact, build, or scientific verification claim.'
    }
    for name in ('type-sensitive-correction.json', 'promotion-inputs-final.json'):
        if name in supplemental:
            require((PREP / name).read_bytes() == supplemental[name], 'supplemental identity changed')
    if run_name == 'final':
        require((ROOT / 'tests/test_server_recorded_census.py').read_bytes() == supplemental['http-test-after.py'],
                'tracked HTTP test changed during review')
    (destination / 'static-review.json').write_text(json.dumps(result, indent=2, sort_keys=True) + '\n')
    print(json.dumps({'destination': str(destination), 'status': result['status'],
                      'old_assertions': len(old_assertions), 'additional_assertions': len(remaining),
                      'new_probe_sha256': delta['new_probe_sha256']}))


if __name__ == '__main__':
    main()
