"""Prospective source-only preparation. Does not open retained artifacts."""
from pathlib import Path
import ast
import datetime
import difflib
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REPO = ROOT.parent
BASELINE = '88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d'
PREDECESSOR = ROOT / '.cache/phase2-li-complete-readiness-artifact-review-v1/audit_retained.py'
COPYSET = ROOT / '.cache/phase2-source-readiness-integration-v1/combined-runtime-copyset.json'
CHANGED = sorted([
    'scripts/browser_smoke.py', 'scripts/package_smoke.py', 'scripts/verify_retained_artifacts.py',
    'src/lupine_discovery/cli.py', 'src/lupine_discovery/server.py',
    'src/lupine_discovery/web/app.js', 'src/lupine_discovery/web/index.html',
    'src/lupine_discovery/web/styles.css', 'tests/test_package_retention.py',
    'tests/test_package_retention_review.py', 'tests/test_retained_mpea_transport.py',
])
ADDED = sorted([
    'scripts/source_readiness_browser_checks.py',
    'src/lupine_discovery/resources/source-readiness-v1.json',
    'src/lupine_discovery/source_readiness.py', 'src/lupine_discovery/web/source-readiness.js',
    'tests/test_package_source_readiness.py', 'tests/test_source_readiness.py',
])
DOCS = ['docs/source-readiness.md']

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def save(name, value):
    raw = (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()
    with (HERE / name).open('xb') as f:
        f.write(raw)
    return digest(raw)

old = PREDECESSOR.read_text()
assert digest(old.encode()) == 'b00541daccbbe8626880f59bc59d9694dc9f34e922690f968dfb50ed348bb738'
new = old

def replace(before, after):
    global new
    assert new.count(before) == 1, before[:100]
    new = new.replace(before, after)

replace('Independent additive Li exact-commit artifact audit', 'Independent source-readiness exact-commit artifact audit')
replace("BASELINE = 'ddd4a6a8df0f908a162b7e5387b0faac325180d6'", 'BASELINE = ' + repr(BASELINE))
replace("NEW_CHECK = 'fixed_stored_census_identity_scope_and_http_asset_agreement'", """NEW_CHECK = 'fixed_stored_census_identity_scope_and_http_asset_agreement'
READINESS_CHECK = 'source_readiness_snapshot_cli_http_asset_agreement'
READINESS_SHA = '9abad97d5675f416cc38a325bcd1e108825af001b2fdfccaa1f5c7dfb66f3f0b'
SCHEMAS = sorted('lupine.discovery.' + name + '.v1' for name in (
    'problem', 'calibrated_problem', 'pareto_problem', 'coupled_problem',
    'projection_problem', 'decision_pool_problem'))
""")
replace("allowed = {'rev-parse', 'ls-tree', 'show', 'cat-file', 'merge-base'}", "allowed = {'rev-parse', 'ls-tree', 'show', 'cat-file', 'merge-base', 'status'}")
replace("def stamp():", """def strict_json(raw):
    def pairs(items):
        value = {}
        for key, item in items:
            if key in value:
                raise ValueError('Duplicate JSON key')
            value[key] = item
        return value
    def reject_constant(token):
        raise ValueError('Nonfinite JSON token')
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=reject_constant)


def stamp():""")
replace("parser.add_argument('--retained-directory', required=True)", """parser.add_argument('--retained-directory', required=True)
parser.add_argument('--actual-binding', required=True)
parser.add_argument('--binding-sha256', required=True)""")
replace("scope, promotion = json.loads(scope_raw), json.loads(promotion_raw)", """scope, promotion = strict_json(scope_raw), strict_json(promotion_raw)
    require('auditor_matches_prepared_source', digest(Path(__file__).read_bytes()) == prep['audit_source_sha256'])
    binding_raw = read_identity(Path(args.actual_binding), 'actual_binding')
    require('actual_binding_exact_hash', re.fullmatch('[0-9a-f]{64}', args.binding_sha256) is not None and digest(binding_raw) == args.binding_sha256)
    binding = strict_json(binding_raw)
    require('actual_binding_closed_shape', set(binding) == {
        'schema', 'published_commit', 'retained_directory', 'audit_source_sha256',
        'preparation_sha256', 'runtime_manifest_sha256', 'gate_review', 'evidence'})
    require('actual_binding_exact_source_and_command', binding['schema'] == 'lupine.source-readiness.artifact-actual-binding.v1'
        and binding['published_commit'] == args.published_commit
        and binding['retained_directory'] == str(Path(args.retained_directory).absolute())
        and binding['audit_source_sha256'] == digest(Path(__file__).read_bytes())
        and binding['preparation_sha256'] == digest((BASE/'preparation.json').read_bytes()))
    require('actual_gate_evidence_nonempty', type(binding['evidence']) is list and len(binding['evidence']) >= 5)
    for index, entry in enumerate([binding['gate_review'], *binding['evidence']]):
        require('gate_evidence_descriptor_'+str(index), type(entry) is dict and set(entry) == {'path','bytes','sha256'}
            and type(entry['bytes']) is int and entry['bytes'] >= 0 and type(entry['sha256']) is str)
        evidence = read_identity(Path(entry['path']), 'actual_gate_evidence_'+str(index))
        require('gate_evidence_identity_'+str(index), len(evidence) == entry['bytes'] and digest(evidence) == entry['sha256'])
        if index == 0:
            gate = strict_json(evidence)
    require('root_completed_gate_review', gate['schema'] == 'lupine.source-readiness.artifact-gate-review.v1'
        and gate['status'] == 'PASS_BOUND_COMPLETED_PACKAGE_AND_STRICT_EXECUTION'
        and gate['published_commit'] == args.published_commit
        and gate['retained_directory'] == binding['retained_directory']
        and type(gate['package_observed_exit_code']) is int and gate['package_observed_exit_code'] == 0
        and type(gate['strict_observed_exit_code']) is int and gate['strict_observed_exit_code'] == 0
        and gate['source_clean_observed'] is True
        and type(gate['checks']) is list and bool(gate['checks'])
        and all(type(c) is dict and set(c) == {'check','passed'} and type(c['check']) is str and c['passed'] is True for c in gate['checks']))
    require('live_source_clean_and_exact_at_start', git('rev-parse','HEAD').decode().strip() == args.published_commit
        and git('status','--porcelain=v1','--untracked-files=all') == b'')""")
replace("receipt = json.loads(receipt_raw)", "receipt = strict_json(receipt_raw)")
replace("require('all_seventeen_existing_check_names_held', type(verification['checks']) is list and verification['checks'] == OLD_CHECKS + [NEW_CHECK])", "require('all_eighteen_ordered_check_names_held', type(verification['checks']) is list and verification['checks'] == OLD_CHECKS + [NEW_CHECK, READINESS_CHECK])")
replace("require('retained_demo_schema_counts', verification['case_count'] == 28 and len(set(verification['problem_schemas'])) == 6 and canonical(verification['known_answer_summary']) == canonical({'failed':0,'passed':13,'total':13}))", "require('retained_demo_schema_counts', type(verification['case_count']) is int and verification['case_count'] == 28 and verification['problem_schemas'] == SCHEMAS and canonical(verification['known_answer_summary']) == canonical({'failed':0,'passed':13,'total':13}))")
replace("current_manifest = json.loads(current_manifest_raw)", "current_manifest = strict_json(current_manifest_raw)")
replace("baseline_manifest = json.loads(baseline_manifest_raw)", "baseline_manifest = strict_json(baseline_manifest_raw)")
replace("require('current_manifest_independently_complete', current_manifest['files'] == current_runtime)", """require('current_manifest_independently_complete', current_manifest['schema'] == 'lupine.discovery.runtime-manifest.v1' and current_manifest['files'] == current_runtime)
    require('manifest_matches_actual_binding', digest(current_manifest_raw) == binding['runtime_manifest_sha256'])""")
replace("require('exact_runtime_counts', len(baseline_runtime) == 339 and len(current_runtime) == 345 and state['runtime_manifest']['file_count'] == 345 and len(unchanged) == 339)", """require('exact_runtime_counts', len(baseline_runtime) == 345 and len(current_runtime) == 351 and type(state['runtime_manifest']['file_count']) is int and state['runtime_manifest']['file_count'] == 351 and len(unchanged) == 334)
    require('existing_runtime_modes_unchanged', all(current_tree['discovery/'+p]['mode'] == baseline_tree['discovery/'+p]['mode'] for p in baseline_runtime))
    require('added_runtime_modes_regular', all(current_tree['discovery/'+p]['mode'] == '100644' for p in added))
    git_changed_runtime = sorted(runtime_path(n) for n in baseline_tree if runtime_path(n) is not None and n in current_tree and baseline_tree[n] != current_tree[n])
    require('git_runtime_delta_independent_of_manifest', git_changed_runtime == changed)
    for path, entry in promotion['files'].items():
        require('declared_baseline_pin_'+path, entry['baseline_sha256'] == baseline_runtime.get(path))""")
replace("require('exact_zero_changed_six_added_none_removed', changed == sorted(scope['existing_runtime_changes']) == sorted(promotion['changed_existing']) == [] and added == sorted(scope['runtime_additions']) == sorted(promotion['added_runtime']) and len(added) == 6 and removed == [])", "require('exact_eleven_changed_six_added_none_removed', changed == sorted(scope['existing_runtime_changes']) == sorted(promotion['changed_existing']) and len(changed) == 11 and added == sorted(scope['runtime_additions']) == sorted(promotion['added_runtime']) and len(added) == 6 and removed == [])")
replace("require('promotion_copyset_equals_runtime_delta_and_guarded_docs', set(promotion['files']) == set(added + scope['guarded_document_additions']) and sorted(scope['guarded_document_additions']) == sorted(promotion['added_guarded_docs']) and len(promotion['files']) == 8)", "require('promotion_copyset_equals_runtime_delta_and_guarded_docs', set(promotion['files']) == set(changed + added + scope['guarded_document_additions']) and sorted(scope['guarded_document_additions']) == sorted(promotion['added_guarded_docs']) and len(promotion['files']) == 18)")
replace("require('old_other_package_payloads_held', len(baseline_payloads) == 110 and len(current_payloads) == 110 and wheel_payload_changed == [] and wheel_payload_added == [] and sum(baseline_payloads[k] == current_payloads.get(k) for k in baseline_payloads) == 110)", """require('old_other_package_payloads_held', len(baseline_payloads) == 110 and len(current_payloads) == 113 and len(wheel_payload_changed) == 5 and len(wheel_payload_added) == 3 and sum(baseline_payloads[k] == current_payloads.get(k) for k in baseline_payloads) == 105)
    require('wheel_delta_matches_frozen_literal_scope', wheel_payload_changed == scope['wheel_payload_changes'] and wheel_payload_added == scope['wheel_payload_additions'])""")
replace("require('wheel_no_other_namespace', all(n in current_payloads or n.startswith(dist) for n in wheel_files))", """require('wheel_no_other_namespace', all(n in current_payloads or n.startswith(dist) for n in wheel_files))
    require('wheel_metadata_member_set_exact', set(wheel_files) - set(current_payloads) == {dist+n for n in ('licenses/LICENSE','licenses/NOTICE.md','METADATA','WHEEL','entry_points.txt','top_level.txt','RECORD')})""")
replace("for kind, path in artifacts.items():\n        require(kind+'_held_after_audit'", """readiness_resource = 'lupine_discovery/resources/source-readiness-v1.json'
    require('exact_public_source_readiness_snapshot', digest(wheel_files[readiness_resource]) == READINESS_SHA == current_runtime['src/lupine_discovery/resources/source-readiness-v1.json'])
    require('live_source_clean_and_exact_at_end', git('rev-parse','HEAD').decode().strip() == args.published_commit
        and git('status','--porcelain=v1','--untracked-files=all') == b'')
    for kind, path in artifacts.items():
        require(kind+'_held_after_audit'""")
replace("'unchanged_baseline_package_payloads':110", "'unchanged_baseline_package_payloads':105")
replace("'mandatory_package_receipt_checks':17", "'source_readiness_resource_sha256':READINESS_SHA,'mandatory_package_receipt_checks':18")
replace("'lupine.li.complete-readiness.independent-artifact-review.v1'", "'lupine.source-readiness.independent-artifact-review.v1'")
replace("Baseline payload comparison is to the exact ddd4 Git snapshot", "Baseline payload comparison is to the exact 88d512cb Git snapshot")

ast.parse(new)
with (HERE/'audit_retained.py').open('x') as f:
    f.write(new)
with (HERE/'auditor-from-b005.diff').open('x') as f:
    f.write(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='b005/audit_retained.py',tofile='source-readiness/audit_retained.py')))
copyset_raw = COPYSET.read_bytes()
copyset = json.loads(copyset_raw)
assert copyset['baseline'] == BASELINE and set(copyset['files']) == set(CHANGED+ADDED+DOCS)
identity = []
for path, item in copyset['files'].items():
    actual = (ROOT/path).read_bytes()
    candidate = (ROOT/item['source']).read_bytes()
    assert digest(actual) == digest(candidate) == item['sha256']
    if path in CHANGED:
        old_raw = subprocess.run(['git','show',BASELINE+':discovery/'+path],cwd=REPO,capture_output=True,check=True).stdout
        assert digest(old_raw) == item['baseline_sha256']
    else:
        assert item['baseline_sha256'] is None
    identity.append({'path':path,'sha256':digest(actual),'bytes':len(actual),'overlay_and_integrated_equal':True,'baseline_sha256':item['baseline_sha256']})
with (HERE/'root-candidate-copyset.json').open('xb') as f:
    f.write(copyset_raw)
scope = {
    'base':BASELINE,'baseline_runtime_total':345,'runtime_total':351,
    'existing_runtime_changes':CHANGED,'runtime_additions':ADDED,'guarded_document_additions':DOCS,
    'unchanged_baseline_runtime_total':334,
    'wheel_payload_changes':sorted('lupine_discovery/'+p.removeprefix('src/lupine_discovery/') for p in CHANGED if p.startswith('src/lupine_discovery/')),
    'wheel_payload_additions':sorted('lupine_discovery/'+p.removeprefix('src/lupine_discovery/') for p in ADDED if p.startswith('src/lupine_discovery/')),
    'baseline_wheel_payload_count':110,'wheel_payload_count':113,'unchanged_baseline_wheel_payload_count':105,
    'expected_archive_copyset':['discovery','.github/workflows/discovery-verify.yml'],
    'mandatory_check_count':18,'source_readiness_sha256':'9abad97d5675f416cc38a325bcd1e108825af001b2fdfccaa1f5c7dfb66f3f0b',
    'execution_policy':'Do not run until root supplies exact published commit, held clean source, completed successful package/strict receipts, retained path and actual binding. Any candidate source change requires a separately preserved prospective rebind.',
    'formal_boundary':'All committed formal files are checked as archive bytes; no proof count or compilation correctness is inferred by this audit.',
}
scope_sha = save('prepared-scope.json',scope)
promotion = {'baseline':BASELINE,'files':copyset['files'],'changed_existing':CHANGED,'added_runtime':ADDED,'added_guarded_docs':DOCS}
promotion_sha = save('prepared-promotion-inputs.json',promotion)
identity_sha = save('candidate-source-identity.json',{'status':'PASS_SOURCE_ONLY_CANDIDATE_IDENTITY','files':identity,'actual_artifact_audits':0})
preparation = {
    'schema':'lupine.source-readiness.artifact-preparation.v1','prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'base_commit':BASELINE,'audit_source_sha256':digest(new.encode()),
    'predecessor_auditor_sha256':digest(old.encode()),
    'author_preparation_provenance':{'copyset_path':str(COPYSET.relative_to(ROOT)),'copyset_sha256':digest(copyset_raw),'source_operation_executions_here':0},
    'bindings':[{'snapshot':'prepared-scope.json','sha256':scope_sha},{'snapshot':'prepared-promotion-inputs.json','sha256':promotion_sha},{'snapshot':'root-candidate-copyset.json','sha256':digest(copyset_raw)},{'snapshot':'candidate-source-identity.json','sha256':identity_sha}],
    'execution_policy':scope['execution_policy'],
    'syntax_check':'ast.parse only; audit module not imported or executed',
}
save('preparation.json',preparation)
print(json.dumps({'status':'PREPARED_NOT_EXECUTED','audit_source_sha256':digest(new.encode()),'copyset_sha256':digest(copyset_raw),'candidate_paths':len(identity)},indent=2))
