"""Public receipt and aggregate consistency only; never opens candidate/private data."""
import datetime
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
CAND = '.cache/phase2-rhizo-census-candidate-v1/'
OPER = '.cache/phase2-rhizo-census-operations-v1/'
SOURCES = {
    'public': CAND + 'actual/public.json',
    'reservation': CAND + 'actual/reservation.json',
    'manifest': CAND + 'reviewed-invocation.json',
    'binding': OPER + 'projection-binding.json',
    'binding_reservation': OPER + 'projection-binding-reservation.json',
    'start': OPER + 'actual-execution/start.json',
    'execution': OPER + 'actual-execution/execution.json',
    'stdout': OPER + 'actual-execution/stdout.json',
    'stderr': OPER + 'actual-execution/stderr.txt',
    'frame': 'reports/phase2-rhizo-reference-readiness-v1/design/reference-frame.json',
    'readiness': 'reports/phase2-rhizo-recorded-label-readiness-v1/actual/public.json',
    'candidate_handoff': CAND + 'handoff.json',
    'candidate_inventory': CAND + 'inventory.json',
    'author_execution': CAND + 'first-author/execution.json',
    'source_hold': CAND + 'source-hold.json',
    'numeric_review': '.cache/phase2-rhizo-census-independent-v1/review.json',
    'scope_review': '.cache/phase2-rhizo-census-scope-review-v1/review.json',
}
ALLOWED = {(ROOT / p).resolve() for p in SOURCES.values()}
blocked = []

def audit_hook(event, arguments):
    if event.startswith('socket.') or event in {'subprocess.Popen', 'os.system', 'os.posix_spawn'}:
        blocked.append(event)
        raise PermissionError('Public-only audit forbids network and subprocesses')
    if event == 'open' and arguments and isinstance(arguments[0], (str, bytes, os.PathLike)):
        path = Path(os.fsdecode(arguments[0])).resolve()
        if path not in ALLOWED and path != BASE and BASE not in path.parents:
            blocked.append(str(path))
            raise PermissionError('Public-only audit forbids non-allowlisted file access')

sys.addaudithook(audit_hook)
slot = BASE / 'first-public-audit'
slot.mkdir(exist_ok=False)
started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
t0 = time.monotonic()
checks = []
inputs = []
observations = {}

def check(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def timestamp(value):
    return datetime.datetime.fromisoformat(value)

def integer(text):
    assert type(text) is str and re.fullmatch(r'0|-?[1-9][0-9]*', text)
    negative = text.startswith('-')
    digits = text[1:] if negative else text
    result = 0
    for i in range(0, len(digits), 9):
        piece = digits[i:i + 9]
        result = result * 10 ** len(piece) + int(piece)
    return -result if negative else result

def rational(value):
    assert type(value) is dict and set(value) == {'numerator', 'denominator'}
    n, d = integer(value['numerator']), integer(value['denominator'])
    assert d > 0
    r = Fraction(n, d)
    assert (r.numerator, r.denominator) == (n, d)
    return r

try:
    raws = {name: (ROOT / path).read_bytes() for name, path in SOURCES.items()}
    inputs = [{'name': name, 'path': SOURCES[name], 'bytes': len(raw), 'sha256': sha(raw)}
              for name, raw in raws.items()]
    docs = {name: json.loads(raw) for name, raw in raws.items() if name != 'stderr'}
    p, reserve, manifest = docs['public'], docs['reservation'], docs['manifest']
    start, execution = docs['start'], docs['execution']
    binding, bind_reserve = docs['binding'], docs['binding_reservation']
    source_sha = 'd77a1ca2eeeb1d0f4e02fac6d624fa63527c4a8d423fdf8f7f645db102c67630'
    contract_sha = 'e849d36004f0e73fdde22620bbffe06d1e53425907ca5fce974c536a5e1ea052'
    public_sha = 'a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a'
    projection = {'bytes': 116049, 'sha256': '4e1a11dd32e08aa3c92acdc402fcfeb497bd202995f7de7b977593a096b85468'}
    check('public_exact_identity', len(raws['public']) == 31448 and sha(raws['public']) == public_sha)
    check('stdout_equals_persisted_public_bytes', raws['stdout'] == raws['public'])
    check('stderr_empty', raws['stderr'] == b'')
    check('public_canonical_serialization', raws['public'] == (json.dumps(p,sort_keys=True,separators=(',', ':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii'))
    check('manifest_identity_cross_receipts', sha(raws['manifest']) == start['manifest_sha256'] == execution['manifest_sha256'])
    check('manifest_source_contract', manifest['script_sha256'] == source_sha and manifest['contract_sha256'] == contract_sha)
    check('projection_identity_cross_receipts', projection == manifest['projection'] == reserve['projection'] == binding['projection'] and p['projection_bytes'] == projection['bytes'] and p['projection_sha256'] == projection['sha256'])
    check('projection_binding_exposure', binding['read_operations'] == 1 and binding['whole_target_bearing_buffer_read'] is True and binding['json_parsed'] is False and binding['numbers_materialized'] is False and binding['numeric_comparisons'] is False and binding['original_bound_objects_read'] is False)
    check('projection_sealed_at_checkpoint_only', binding['first_identity_binding_at_this_checkpoint'] is True and binding['retroactive_original_write_hash_claimed'] is False)
    check('binding_reserved_once_before_read', bind_reserve['action'] == 'ONE_BOUNDED_IDENTITY_ONLY_READ' and bind_reserve['at'] == binding['started_at'] and bind_reserve['parsing_or_numeric_comparison'] is False and bind_reserve['source_sha256'] == binding['source_sha256'] == source_sha)
    check('public_frame_identity', sha(raws['frame']) == p['frame_sha256'] == manifest['frame_sha256'] == reserve['frame_sha256'])
    check('public_readiness_identity', sha(raws['readiness']) == p['readiness_sha256'] == manifest['readiness_sha256'] == reserve['readiness_sha256'])
    check('actual_reservation_contract_and_slot', reserve['contract_sha256'] == contract_sha and reserve['synthetic'] is False and manifest['output_slot'] == CAND + 'actual')
    check('complete_actual_status', p['status'] == 'DESCRIPTIVE_CENSUS_COMPLETE' and p['reason'] == 'ALL_FIXED_STORED_DISCREPANCIES_COMPUTED' and p['synthetic'] is False and p['output_error'] is None)
    check('scientific_claims_unchanged', p['scientific_status'] == 'NOT_ADMITTED' and p['actual_reference_choice'] == 'UNKNOWN' and p['model_ranking_or_winner'] is None and p['tolerance_success_criterion'] is None and p['reference_choice_reconstructed'] is False and p['binder_executed'] is False and p['reference_or_bound_objects_read'] is False)
    check('estimand_labels', p['sign_convention'] == 'STORED_PREDICTION_MINUS_STORED_REFERENCE' and p['metric_interpretation'] == 'EXACT_DESCRIPTIVE_STORED_LABEL_DISCREPANCIES_NOT_PHYSICAL_ERROR_ESTIMATES' and p['fixed_position_weight'] == 1)
    check('counts_match_fixed_archive', p['counts'] == {'candidate_reference_edges':172,'fixed_ids':36,'fixed_positions':144,'groups':16,'reference_equality_groups':36})
    expected_public_keys = {'actual_reference_choice','binder_executed','counts','exposure','fixed_position_weight','frame_sha256','groups','metric_interpretation','model_ranking_or_winner','output_error','projection_bytes','projection_sha256','readiness_sha256','reason','reference_choice_reconstructed','reference_equality','reference_or_bound_objects_read','schema','scientific_status','sign_convention','status','synthetic','tolerance_success_criterion'}
    check('public_top_level_closed_schema', set(p) == expected_public_keys and p['schema'] == 'lupine.rhizo.fixed-stored-census.v1')
    e = p['exposure']
    for key in ('aggregate_materialization_started','arithmetic_started','historical_target_bearing_labels_and_citations','private_output_may_exist','private_projection_written','private_write_attempted','projection_bytes_supplied','public_output_may_exist','public_write_attempted','raw_buffer_read_completed','raw_buffer_read_started','reservation_attempted','reservation_created','reservation_may_exist','selected_numbers_materialization_started','target_bearing_bytes_returned','validation_started','whole_projection_parse_completed','whole_projection_parse_started'):
        check('actual_exposure_' + key, e[key] is True)
    check('actual_exposure_counts', (e['groups_computed'],e['numbers_materialized'],e['positions_computed'],e['positions_validated'],e['reference_groups_computed']) == (16,288,144,144,36))
    check('actual_exposure_no_freshness_or_private_return_claim', e['fresh_holdout_claim'] is False and e['private_projection_returned'] is False and e['researcher_inspection'] == 'NOT_OBSERVED_BY_THIS_PROGRAM')
    frame = docs['frame']
    units = frame['units']
    properties = ('gamma_100','gamma_111','vacancy_formation_energy','gamma_110')
    models = sorted({u['model_id'] for u in units})
    expected_groups = {(model, prop, 'eV' if prop == 'vacancy_formation_energy' else 'J/m^2') for model in models for prop in properties}
    check('sixteen_fixed_unique_groups', len(p['groups']) == 16 and {(g['model_id'],g['property'],g['unit']) for g in p['groups']} == expected_groups)
    metric_names = ('signed','absolute','squared')
    group_keys = {'model_id','property','unit','squared_unit','count','fixed_position_weight','unit_ids','metric_interpretation'} | {operation + '_' + name + '_discrepancy' for operation in ('sum','mean') for name in metric_names}
    comparisons = 0
    for i, g in enumerate(p['groups']):
        prefix = 'group_' + str(i) + '_'
        check(prefix+'closed_schema', set(g) == group_keys)
        check(prefix+'fixed_count_weight', type(g['count']) is int and g['count'] == 9 and type(g['fixed_position_weight']) is int and g['fixed_position_weight'] == 1)
        check(prefix+'fixed_ids', g['unit_ids'] == [u['unit_id'] for u in units if u['model_id'] == g['model_id']] and len(set(g['unit_ids'])) == 9)
        check(prefix+'literal_units', g['unit'] == ('eV' if g['property'] == 'vacancy_formation_energy' else 'J/m^2') and g['squared_unit'] == ('eV^2' if g['unit'] == 'eV' else '(J/m^2)^2') and g['metric_interpretation'] == 'STORED_LABEL_DISCREPANCIES')
        sums = {name:rational(g['sum_'+name+'_discrepancy']) for name in metric_names}
        means = {name:rational(g['mean_'+name+'_discrepancy']) for name in metric_names}
        check(prefix+'six_canonical_reduced_rationals', True)
        for name in metric_names:
            check(prefix+name+'_sum_equals_nine_mean', sums[name] == 9 * means[name]); comparisons += 1
        check(prefix+'nonnegative_absolute_and_squared', sums['absolute'] >= 0 and sums['squared'] >= 0 and means['absolute'] >= 0 and means['squared'] >= 0); comparisons += 4
        check(prefix+'absolute_dominates_signed_sum', abs(sums['signed']) <= sums['absolute']); comparisons += 1
        check(prefix+'absolute_mean_dominates_signed_mean', abs(means['signed']) <= means['absolute']); comparisons += 1
        check(prefix+'jensen_signed', means['signed'] ** 2 <= means['squared']); comparisons += 1
        check(prefix+'jensen_absolute', means['absolute'] ** 2 <= means['squared']); comparisons += 1
        check(prefix+'sum_square_bounded_by_absolute_sum_square', sums['squared'] <= sums['absolute'] ** 2); comparisons += 1
        check(prefix+'zero_square_iff_zero_absolute', (sums['squared'] == 0) == (sums['absolute'] == 0)); comparisons += 1
    expected_equalities = {(u['material'],u['structure'],prop,'eV' if prop == 'vacancy_formation_energy' else 'J/m^2') for u in units for prop in properties}
    equality = p['reference_equality']
    check('thirty_six_fixed_unique_reference_groups', len(equality) == 36 and {(g['material'],g['structure'],g['property'],g['unit']) for g in equality} == expected_equalities)
    equality_keys = {'actual_reference_choice','citation_literals_equal','common_physical_truth_established','count','material','model_ids','property','stored_reference_equality','structure','token_spellings_equal','unit'}
    for i, g in enumerate(equality):
        prefix = 'reference_' + str(i) + '_'
        check(prefix+'closed_schema', set(g) == equality_keys)
        check(prefix+'all_four_models', g['model_ids'] == models and type(g['count']) is int and g['count'] == 4)
        check(prefix+'literal_unit', g['unit'] == ('eV' if g['property'] == 'vacancy_formation_energy' else 'J/m^2'))
        check(prefix+'closed_equality', g['stored_reference_equality'] in {'ALL_STORED_REFERENCES_EQUAL','STORED_REFERENCES_DIFFER'} and type(g['token_spellings_equal']) is bool and type(g['citation_literals_equal']) is bool)
        check(prefix+'token_equality_implies_rational_equality', not g['token_spellings_equal'] or g['stored_reference_equality'] == 'ALL_STORED_REFERENCES_EQUAL')
        check(prefix+'no_truth_or_choice_promotion', g['common_physical_truth_established'] is False and g['actual_reference_choice'] == 'UNKNOWN')
    forbidden = {'prediction_token','stored_reference_token','stored_reference_citation','serialized_number','reference_source','declared_inputs_sha256','source_path','positions','signed_error','absolute_error','squared_error','winner','ranking'}
    def safe_keys(value):
        if isinstance(value, dict): return not (set(value) & forbidden) and all(safe_keys(v) for v in value.values())
        if isinstance(value, list): return all(safe_keys(v) for v in value)
        return True
    check('no_individual_numeric_citation_or_provenance_fields', safe_keys(p))
    check('no_raw_path_or_citation_sentinel', b'data/y_matrix_runs/bound/' not in raws['public'] and b'GENERATED_CITATION_DO_NOT_PUBLIC' not in raws['public'])
    pins = start['before']['source_pins']
    for name in ('candidate_handoff','numeric_review','scope_review','frame','readiness'):
        check('gate_identity_' + name, pins[SOURCES[name]] == sha(raws[name]))
    check('source_contract_cross_gate_pins', pins[CAND+'census.py'] == source_sha and pins[CAND+'contract.json'] == contract_sha)
    handoff = docs['candidate_handoff']; author = docs['author_execution']; numeric = docs['numeric_review']; scope = docs['scope_review']; hold=docs['source_hold']
    check('author_inventory_identity', handoff['inventory']['sha256'] == sha(raws['candidate_inventory']))
    check('author_receipt_identity', hold['first_author_execution_sha256'] == sha(raws['author_execution']))
    check('author_gate_29_generated_pass', author['tests_run'] == 29 and author['exit_code'] == 0 and author['failures'] == 0 and author['errors'] == 0 and author['source_and_contract_held'] is True and author['forbidden_events'] == [] and author['pins']['census.py'] == source_sha and author['pins']['contract.json'] == contract_sha)
    ne = numeric['first_candidate_execution']
    check('numeric_gate_22_generated_pass', ne['tests_run'] == 22 and ne['successful'] is True and ne['failures'] == 0 and ne['errors'] == 0 and ne['source_held_after'] is True and ne['source_sha256'] == source_sha and numeric['contract_sha256'] == contract_sha)
    check('scope_gate_no_blocker', scope['status'] == 'NO_BLOCKER_IN_AMENDED_DECLARED_SOURCE_AND_SCIENTIFIC_SCOPE' and scope['blocking_findings'] == [] and scope['required_contract_changes'] == [])
    check('handoff_matches_gate_counts', handoff['first_author_tests_passed'] == 29 and handoff['first_independent_numeric_methods_passed'] == 22 and handoff['source']['sha256'] == source_sha and handoff['contract']['sha256'] == contract_sha)
    check('chronology_scope_author_hold_independent_binding_actual', timestamp(scope['created_at']) < timestamp(author['started_at']) < timestamp(author['finished_at']) < timestamp(hold['held_at']) < timestamp(ne['started_at']) < timestamp(ne['finished_at']) < timestamp(binding['started_at']) <= timestamp(binding['finished_at']) < timestamp(start['at']) == timestamp(execution['started_at']) < timestamp(execution['finished_at']))
    check('execution_stdout_stderr_identity', execution['stdout_bytes'] == len(raws['stdout']) and execution['stdout_sha256'] == sha(raws['stdout']) and execution['stderr_bytes'] == 0 and execution['stderr_sha256'] == sha(raws['stderr']) and execution['persisted_public_matches_stdout'] is True)
    check('execution_success_one_invocation_no_retry', execution['exit_code'] == 0 and execution['timed_out'] is False and execution['actual_census_invocations'] == 1 and execution['earlier_identity_only_reads'] == 1 and execution['original_objects_read'] is False and execution['automatic_retry'] is False)
    check('recorded_runtime_remote_hold', execution['source_runtime_remote_held'] is True and execution['runtime_files_held'] == 335 and len(start['before']['runtime_files']) == 335 and start['before']['head'] == 'd4d8504a97d362a6339eaa27453a86e0eb167cee' and start['before']['remote_exact'] is True)
    check('command_binds_held_manifest_source', start['command'][-2] == sha(raws['manifest']) and start['command'][-1] == source_sha and start['command'][-3] == str(ROOT / SOURCES['manifest']))
    observations = {'fixed_positions':144,'groups':16,'reference_equality_groups':36,'canonical_rational_aggregates_checked':96,'arithmetic_relations_checked':comparisons,
        'all_reference_rationals_equal_groups':sum(r['stored_reference_equality']=='ALL_STORED_REFERENCES_EQUAL' for r in equality),'token_spellings_equal_groups':sum(r['token_spellings_equal'] for r in equality),'citation_literals_equal_groups':sum(r['citation_literals_equal'] for r in equality),'actual_execution_started_at':execution['started_at'],'actual_execution_finished_at':execution['finished_at'],'actual_process_seconds_as_recorded':execution['process_seconds'],'public_numeric_aggregate_exposure_acknowledged':True}
except Exception as exc:
    checks.append({'check':'audit_execution_exception','passed':False,'exception_type':type(exc).__name__,'message':str(exc)})
check('no_forbidden_audit_operation', not blocked)
finished_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
report = {'schema':'lupine.rhizo.census.public-actual-review.v1','status':'PASS_PUBLIC_RECEIPT_AND_AGGREGATE_CONSISTENCY' if all(c['passed'] for c in checks) else 'FAIL_PUBLIC_AUDIT','started_at':started_at,'finished_at':finished_at,'seconds':time.monotonic()-t0,'checks':checks,'inputs':inputs,'observations':observations,'blocked_operations':blocked,'limits':['This is public-only arithmetic and receipt consistency, not recomputation from individual private predictions/references.','Recorded source/runtime/remote holds were cross-checked as receipt assertions; no source file, runtime guard, Git operation, tests or actual census was rerun.','The one identity-only retained-projection read sealed bytes at this later checkpoint; it did not prove the original projection write hash.','Public numerical aggregate exposure is intentional and acknowledged; no private projection or individual labels/citations were opened by this reviewer.','All36 groups reporting equal stored references does not establish common physical truth, correct binder choice, fair physical model comparison, scientific admission, independence or superiority.','No new DFT, source acquisition, model ranking, threshold, uncertainty interval or inference was performed.'],'reviewer_actual_private_or_raw_reads':0,'candidate_executions_by_reviewer':0,'scientific_status':'NOT_ADMITTED','actual_reference_choice':'UNKNOWN'}
(slot / 'review.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':report['status'],'checks':len(checks),'failed':[c for c in checks if not c['passed']],'observations':observations},indent=2))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
