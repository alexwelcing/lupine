"""Static AST/text comparison only. Does not import or execute the reviewed modules."""
import ast
from collections import Counter
from datetime import datetime, timezone
import difflib
import hashlib
import json
from pathlib import Path

BASE = Path('.cache/phase2-local-extra-artifact-review-v1')
OUT = BASE / 'independent-source-review'
NAMES = ['additive_audit.py', 'prior-additive-audit.py', 'audit.py', 'reviewed-pins.pending.json']
raws = {name: (BASE / name).read_bytes() for name in NAMES}
hashes = {name: hashlib.sha256(raw).hexdigest() for name, raw in raws.items()}
assert hashes['additive_audit.py'] == '6b267cd11a73b0f73c63a7b9ae2ba75d30f9699edf14e41c5fd1f98f4932ce2a'
assert hashes['prior-additive-audit.py'] == 'a9bbef30cd81cddccc3a089cf0c4109c61cb7497fc906f7fcab236aaf5b49643'
assert hashes['audit.py'] == 'b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119'
old = ast.parse(raws['prior-additive-audit.py'], filename='prior-additive-audit.py')
new = ast.parse(raws['additive_audit.py'], filename='additive_audit.py')
old_functions = {node.name: node for node in old.body if isinstance(node, ast.FunctionDef)}
new_functions = {node.name: node for node in new.body if isinstance(node, ast.FunctionDef)}
helpers = ['sha', 'load', 'read', 'git', 'artifact', 'wheel_content']
for name in helpers:
    assert ast.dump(old_functions[name], include_attributes=False) == ast.dump(new_functions[name], include_attributes=False)
assert ast.dump(old.body[-1], include_attributes=False) == ast.dump(new.body[-1], include_attributes=False)
old_assertions = Counter(ast.unparse(node.test) for node in ast.walk(old) if isinstance(node, ast.Assert))
new_assertions = Counter(ast.unparse(node.test) for node in ast.walk(new) if isinstance(node, ast.Assert))
removed = list((old_assertions - new_assertions).elements())
added = list((new_assertions - old_assertions).elements())
assert len(removed) == 4
assert set(removed) == {
    "full_review['runtime_source_files_matching_manifest_and_worktree'] == 323",
    'len(prior) == 317 and len(current) == 323',
    "notebook_pins == {path: digest for path, digest in PINS.items() if 'notebook' in path}",
    "header_bindings['candidate_files'] == {path: digest for path, digest in PINS.items() if 'notebook' not in path}",
}
assert "pin_record['status'] == 'FINAL_REVIEWED_SOURCE_PINS'" in added
assert "pin_record['baseline_commit'] == BASELINE" in added
assert 'set(PINS) == EXPECTED_PATHS' in added
assert 'len(prior) == 323 and len(current) == 326' in added
assert "full_review['runtime_source_files_matching_manifest_and_worktree'] == 326" in added
assert 'len(added) == 3 and len(PINS) == 4' in added
assert "PINS['scripts/li_v3_local_extra_headers.py'] == SCRIPT_PIN" in added
assert "full_review['status'] == 'PASS' and full_review['commit'] == COMMIT" in new_assertions
assert "sha(receipt_raw) == full_review['receipt_sha256']" in new_assertions
assert "receipt['artifacts'] == full_review['artifact_identities']" in new_assertions
assert 'baseline_runtime == prior' in new_assertions
assert 'baseline_package == current_package' in new_assertions
assert 'len(previous_package) == len(current_package) == 108' in new_assertions
assert 'current_package == previous_package' in new_assertions
assert 'archived == working == committed and sha(archived) == digest' in new_assertions
assignments = {node.targets[0].id: node.value for node in new.body if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name)}
assert ast.literal_eval(assignments['BASELINE']) == 'a6e87c198d8116d26c523e0e1b2eedce4aeb225b'
expected_paths = ast.literal_eval(assignments['EXPECTED_PATHS'])
assert expected_paths == {'scripts/li_v3_local_extra_headers.py', 'tests/test_li_v3_local_extra_headers.py', 'tests/test_li_v3_local_extra_headers_review.py', 'docs/li-v3-local-extra-headers-plan.md'}
pending = json.loads(raws['reviewed-pins.pending.json'])
assert pending['status'] != 'FINAL_REVIEWED_SOURCE_PINS'
assert pending['status'] == 'PENDING_FINAL_INDEPENDENT_REVIEW'
assert set(pending['files']) == expected_paths
assert sum(value is None for value in pending['files'].values()) == 3
assert pending['files']['scripts/li_v3_local_extra_headers.py'] == ast.literal_eval(assignments['SCRIPT_PIN'])
run_source = ast.unparse(new_functions['run'])
assert run_source.index("pin_record['status']") < run_source.index('full_review_raw = read(FULL_REVIEW)') < run_source.index('old_receipt = load(read(PREVIOUS')
imports = [ast.unparse(node) for node in new.body if isinstance(node, (ast.Import, ast.ImportFrom))]
assert imports == ['import argparse', 'from datetime import datetime, timezone', 'import hashlib', 'import io', 'import json', 'from pathlib import Path', 'import subprocess', 'import tarfile', 'import time', 'import traceback', 'import zipfile']
subprocess_calls = [ast.unparse(node) for node in ast.walk(new) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id == 'subprocess']
assert subprocess_calls == ["subprocess.run(['git', *args], cwd=ROOT, check=True, capture_output=True)"]
assert all(hashes[name] == hashlib.sha256((BASE / name).read_bytes()).hexdigest() for name in NAMES)
result = {
    'status': 'PASS_SOURCE_REVIEW_ONLY',
    'recorded_at_utc': datetime.now(timezone.utc).isoformat(),
    'reviewer': '/root/finite_inverse_check/artifact_adapter_review',
    'source_identities': hashes,
    'auditor_invoked': False,
    'project_module_imported': False,
    'package_or_production_invoked': False,
    'actual_new_artifacts_reviewed': False,
    'private_custody_inputs_read': False,
    'network_requests_performed': False,
    'unchanged_helper_ASTs': helpers,
    'unchanged_main_guard_AST': True,
    'preserved_assertion_occurrences': sum((old_assertions & new_assertions).values()),
    'removed_assertion_occurrences': removed,
    'added_assertion_occurrences': added,
    'pending_pin_record_rejected_by_static_guard_order': True,
    'baseline_commit': ast.literal_eval(assignments['BASELINE']),
    'future_expected_runtime_count': 326,
    'baseline_runtime_count': 323,
    'future_added_runtime_paths': sorted(path for path in expected_paths if not path.startswith('docs/')),
    'new_exact_git_archive_worktree_pins': sorted(expected_paths),
    'unchanged_wheel_package_member_count_required': 108,
    'full_audit_script_pin_required': hashes['audit.py'],
    'full_audit_PASS_same_commit_receipt_and_artifact_identity_required': True,
    'actual_future_PASS_not_established_by_this_review': True,
    'concrete_blockers': [],
    'requirements_for_future_use': [
        'Root supplies the committed source identity, retained package location, actual unchanged-auditor PASS receipt and final independently reviewed pin record.',
        'Invoke from discovery/ with a clean exact committed checkout; current dirty integration is not an eligible audit target.',
        'Confirm final reviewed-pins file bytes externally; the adapter checks status, structure and supplied values but does not authenticate authorship of the review.',
    ],
    'scope_limits': [
        'No candidate correctness or scientific validity review.',
        'The generic audit receipt is a required local evidence input; this source review does not establish it has actually run on future artifacts.',
        'Not a general adversarial archive security validator; archive member expansion is not universally size capped.',
        'No network or production commands exist in adapter; expected inputs are controlled local public package and source artifacts, with resolved input paths excluding the Li custody cache.',
        'Whole wheel ZIP byte equality is explicitly not claimed; nonpackage content differences are recorded.',
    ],
}
with (OUT / 'source-review.initial.json').open('x') as stream:
    stream.write(json.dumps(result, indent=2) + '\n')
diff = ''.join(difflib.unified_diff(raws['prior-additive-audit.py'].decode().splitlines(keepends=True), raws['additive_audit.py'].decode().splitlines(keepends=True), fromfile='prior-additive-audit.py', tofile='additive_audit.py'))
with (OUT / 'source-diff.txt').open('x') as stream:
    stream.write(diff)
print(json.dumps({'status': result['status'], 'preserved_assertion_occurrences': result['preserved_assertion_occurrences'], 'removed_assertion_occurrences': len(removed), 'added_assertion_occurrences': len(added), 'concrete_blockers': []}))
