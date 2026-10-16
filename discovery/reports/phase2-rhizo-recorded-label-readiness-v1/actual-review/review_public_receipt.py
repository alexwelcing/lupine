"""Static consistency review of explicitly named public receipts only."""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

ROOT=Path('/workspace/lupine-discovery-branch/discovery')
OUT=ROOT/'.cache/phase2-rhizo-recorded-label-actual-review-v1'
C='.cache/phase2-rhizo-recorded-label-candidate-v1/'
O='.cache/phase2-rhizo-recorded-label-operations-v1/'
R='.cache/phase2-rhizo-recorded-label-review-v1/'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
read_paths=[C+'actual/public.json',C+'actual/reservation.json',C+'reviewed-invocation.json',
    O+'run_actual_once.py',O+'actual-execution/start.json',O+'actual-execution/execution.json',
    O+'actual-execution/stdout.json',O+'public-summary.json',R+'review.json',R+'third/recorded_labels.py',
    R+'third/contract.json','.cache/phase2-rhizo-reference-readiness-design-v1/reference-frame.json',
    '.cache/phase2-rhizo-bound-choice-scope-v1/objects.json','reports/runtime-manifest.json']
raw={p:(ROOT/p).read_bytes() for p in read_paths}
obj={p:json.loads(v) for p,v in raw.items() if p.endswith('.json')}
public=obj[C+'actual/public.json'];reservation=obj[C+'actual/reservation.json'];manifest=obj[C+'reviewed-invocation.json']
start=obj[O+'actual-execution/start.json'];execution=obj[O+'actual-execution/execution.json'];summary=obj[O+'public-summary.json']
review=obj[R+'review.json'];frame=obj['.cache/phase2-rhizo-reference-readiness-design-v1/reference-frame.json'];inputs=obj['.cache/phase2-rhizo-bound-choice-scope-v1/objects.json']
assert len(raw[C+'actual/public.json'])==115893
assert sha(raw[C+'actual/public.json'])=='b444e7d33cb18619942c2dfbb5cd3374fd9cd9adee6732825ce20ed431641a33'
assert raw[C+'actual/public.json']==raw[O+'actual-execution/stdout.json']
assert raw[C+'actual/public.json']==(json.dumps(public,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')
assert set(public)=={'schema','status','reason','synthetic','scientific_status','actual_reference_choice','reference_choice_reconstructed','binder_executed','reference_objects_read','residuals_ranks_fits_splits_or_performance_computed','historical_map_is_re_relaxed_calculator','frame_sha256','inputs_sha256','implementation','input_bindings','candidate_context','positions','all_144_pairs_complete','all_144_citations_nonempty_strings','optional_tolerances_usable_or_absent','first_label_issue','output_error','counts','exposure'}
assert public['schema']=='lupine.rhizo.recorded-label-readiness.v1'
assert public['status']=='RECORDED_LABEL_INSPECTION_COMPLETE'
assert public['reason']=='ALL_STORED_PAIRS_COMPLETE_WITHIN_ENGINEERING_LIMITS'
assert public['scientific_status']=='NOT_ADMITTED' and public['actual_reference_choice']=='UNKNOWN'
for key in ['synthetic','reference_choice_reconstructed','binder_executed','reference_objects_read','residuals_ranks_fits_splits_or_performance_computed','historical_map_is_re_relaxed_calculator']:
    assert public[key] is False
for key in ['all_144_pairs_complete','all_144_citations_nonempty_strings','optional_tolerances_usable_or_absent']:
    assert public[key] is True
assert public['first_label_issue'] is None and public['output_error'] is None
assert public['candidate_context']=={'units':frame['units'],'reference_locations':frame['reference_locations'],'interpretation':'CONTEXT_ONLY_NO_REFERENCE_SELECTED'}
assert len(frame['units'])==36 and len(frame['reference_locations'])==43
assert sum(len(row['uses']) for row in frame['reference_locations'])==172
specs=inputs['minimum_stored_label_objects']
assert public['input_bindings']==specs and len(specs)==36 and sum(s['bytes'] for s in specs)==126885
units={next(p for p in u['existing_artifact_paths_not_opened_by_proposed_pass'] if '/bound/' in p):u for u in frame['units']}
props=('gamma_100','gamma_111','vacancy_formation_energy','gamma_110')
expected_positions=[{'unit_id':units[s['path']]['unit_id'],'property':name,'record_state':'SINGLE','unit_state':'MATCH','value_state':'VALID_EXACT_JSON_NUMBER','reference_value_state':'VALID_EXACT_JSON_NUMBER','citation_state':'NONEMPTY_STRING','tolerance_state':'NULL','pair_complete':True,'actual_reference_choice':'UNKNOWN'} for s in specs for name in props]
assert public['positions']==expected_positions
assert public['counts']=={'fixed_ids':36,'fixed_label_positions':144,'context_candidate_edges':172,'positions_inspected':144,'pairs_complete':144}
expected_exposure={
    'fresh_holdout_claim':False,'private_projection_returned':False,'private_projection_written':True,
    'projected_citations_and_labels_are_target_bearing':True,'researcher_inspection':'NOT_OBSERVED_BY_THIS_PROGRAM',
    'selected_historical_labels_materialization_started':True,'selected_historical_labels_materialized':True,
    'target_bearing_byte_access_may_have_occurred':True,'target_bearing_bytes_returned_to_projector':True,
    'whole_json_parse_completed':True,'whole_json_parse_started':True,'whole_objects_are_mixed_target_bearing_data':True,
    'objects':[dict(path=s['path'],read_started=True,read_completed=True,identity_verified=True,
        json_parse_started=True,json_parse_completed=True,context_checked=True,projection_started=True,
        projection_completed=True,positions_materialized=4) for s in specs]}
assert public['exposure']==expected_exposure
assert manifest['script_sha256']==review['source_sha256']==sha(raw[R+'third/recorded_labels.py'])=='13f1f4ee41947eff4b47faaa0a3463af96363fbc8c09d6a9d398d76d78f9d647'
assert manifest['contract_sha256']==review['contract_sha256']==sha(raw[R+'third/contract.json'])
assert manifest['frame_sha256']==public['frame_sha256']==sha(raw['.cache/phase2-rhizo-reference-readiness-design-v1/reference-frame.json'])
assert manifest['inputs_sha256']==public['inputs_sha256']==sha(raw['.cache/phase2-rhizo-bound-choice-scope-v1/objects.json'])
assert manifest['schema']=='lupine.rhizo.recorded-label-invocation.v1'
assert manifest['output_slot']==C+'actual'
assert set(manifest)=={'schema','script_sha256','frame_sha256','inputs_sha256','contract_sha256','source_pins','output_slot'}
expected_implementation={k:manifest[k] for k in ['script_sha256','contract_sha256','source_pins']}
expected_implementation['reviewed_manifest_sha256']=sha(raw[C+'reviewed-invocation.json'])
assert public['implementation']==expected_implementation
assert reservation=={'schema':'lupine.rhizo.recorded-label-reservation.v1','synthetic':False,'frame_sha256':manifest['frame_sha256'],'inputs_sha256':manifest['inputs_sha256'],'implementation':expected_implementation}
assert start['manifest_sha256']==expected_implementation['reviewed_manifest_sha256']
assert start['recorder_sha256']==sha(raw[O+'run_actual_once.py'])
assert start['before']['review_sha256']==sha(raw[R+'review.json'])
assert start['before']['source_sha256']==manifest['script_sha256']
assert start['before']['runtime_files']==obj['reports/runtime-manifest.json']['files']
assert len(start['before']['runtime_files'])==332
assert start['before']['head']=='9766b6838388c35a92d32b1a60e65613c72b3fee'
assert start['command'][-5:]==[str(ROOT/C/'recorded_labels.py'),str(ROOT),str(ROOT/C/'reviewed-invocation.json'),start['manifest_sha256'],manifest['script_sha256']]
assert execution['exit_code']==0 and execution['actual_source_operations']==1
assert execution['automatic_retry'] is False and execution['performance_computation_requested'] is False and execution['timed_out'] is False
assert execution['source_and_runtime_held'] is True
assert execution['started_at']==start['started_at']
assert datetime.fromisoformat(execution['started_at'])<datetime.fromisoformat(execution['finished_at'])
assert execution['process_seconds']==0.21620310999787762
assert execution['stdout_bytes']==115893 and execution['stdout_sha256']==sha(raw[C+'actual/public.json'])
assert execution['stderr_bytes']==0 and execution['stderr_sha256']==sha(b'')
expected_summary={k:v for k,v in public.items() if k not in {'implementation','input_bindings','candidate_context','positions','exposure'}}
expected_summary['exposure']={k:v for k,v in expected_exposure.items() if k!='objects'}
expected_summary['position_state_counts']={key:dict(Counter(str(row[key]).lower() if isinstance(row[key],bool) else row[key] for row in expected_positions)) for key in ['record_state','unit_state','value_state','reference_value_state','citation_state','tolerance_state','pair_complete']}
expected_summary['objects_read_and_projected']=36;expected_summary['public_sha256']=sha(raw[C+'actual/public.json'])
assert summary==expected_summary
for p,data in raw.items():assert (ROOT/p).read_bytes()==data
result={'status':'PASS_PUBLIC_RECEIPT_CONSISTENCY','reviewed_at':datetime.now(timezone.utc).isoformat(),
    'public_sha256':sha(raw[C+'actual/public.json']),'reviewed_source_sha256':manifest['script_sha256'],
    'operation_record':{'head':start['before']['head'],'started_at':execution['started_at'],'finished_at':execution['finished_at'],'exit_code':0,'source_operations_recorded':1,'process_seconds':execution['process_seconds'],'stderr_bytes_recorded':0,'runtime_files_recorded_held':332},
    'verified_public_structure':{'fixed_ids':36,'label_positions':144,'reference_locations':43,'candidate_edges':172,'source_objects':36,'source_bytes':126885,'all_positions_single':True,'units_match':True,'both_number_states_valid_exact':True,'citations_nonempty_strings':True,'tolerances_all_null':True,'graph_and_input_bindings_exact':True,'canonical_public_equals_stdout':True,'reservation_manifest_review_source_bindings_match':True,'summary_exact':True,'inputs_held_during_review':True},
    'exposure_interpretation':'Public receipt records complete reading/parsing of all 36 mixed target-bearing objects, selected historical label/citation materialization and private-file writing. private_projection_returned=False describes the wrapper return, not absence of private processing or availability. Researcher inspection remains unobserved; no fresh holdout is claimed.',
    'recorder_source_review':'Static source shows one bounded child command with no automatic retry and before/after source, reviewed-receipt and 332-file state checks. Command directly compiles the hash-verified implementation; receipt reports those checks held. Recorder was not imported or executed by this reviewer.',
    'scientific_status':'NOT_ADMITTED','actual_reference_choice':'UNKNOWN',
    'limitations':['Consistency review of public receipt and held source, not independent recomputation from private data.','No private.json, raw retained object, source operation, project import, production guard, test suite or network was accessed/executed.','No claim of citation adequacy, actual source attribution, physical truth, uncertainty admission, independence, performance or new benchmark evidence.','Runtime/source held and empty stderr are supported by the recorded operation and bound recorder; this review did not rerun state() or inspect private output.'],
    'source_bindings':{p:{'bytes':len(data),'sha256':sha(data)} for p,data in raw.items()}}
(OUT/'review.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':result['status'],'public_sha256':result['public_sha256'],'positions':144,'objects':36,'scientific_status':'NOT_ADMITTED','actual_reference_choice':'UNKNOWN','review_sha256':sha((OUT/'review.json').read_bytes())}))
