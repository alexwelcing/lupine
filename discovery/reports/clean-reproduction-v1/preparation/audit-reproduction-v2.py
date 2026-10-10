"""Audit safe receipts only; do not open raw labels, predictions, or full reveal reports."""
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys

root = Path.cwd().resolve()
prep = Path(os.environ['LUPINE_REPRO_PREP']).resolve()
attempt = os.environ['LUPINE_REPRO_ATTEMPT']
constrained = root/'.cache'/('reproduce-jarvis-'+attempt)
training = root/'.cache/training-tail'/('jarvis-training-tail-v1-'+attempt)
sys.path.insert(0, str(root/'scripts'))
import training_tail as tail

captured_bytes = {}
def raw(path):
    path = Path(path).resolve()
    if path not in captured_bytes:
        captured_bytes[path] = path.read_bytes()
    return captured_bytes[path]

def read(path):
    return json.loads(raw(path))

def sha(path):
    return hashlib.sha256(raw(path)).hexdigest()

def canonical_digest(value):
    encoded = (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()

def require(value, message):
    if not value:
        raise AssertionError(message)

expected_constrained = 'cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900'
expected_training = '60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656'
commit = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
require(commit == '2a09d36491e092e851a529e58000444f3b6479e2', 'checkout commit mismatch')
subprocess.run(['git','diff','--exit-code','HEAD','--'],check=True,stdout=subprocess.DEVNULL)
start = read(constrained/'workflow-start.json')
result = read(constrained/'workflow-result.json')
scientific = read(constrained/'scientific-result.json')
comparison = read(constrained/'scientific-digest-comparison.json')
require(result['status']=='complete','constrained incomplete')
require(result['completed_stages']==['acquire','freeze','verify','engineering-tests','replay','dashboard'],'constrained stages mismatch')
require(start['source_format']=='nonfinite-sentinels','source amendment mismatch')
require(start['environment']['installation']=='verified_editable_checkout','installation not bound')
require(start['raw_source_reuse_requested'] is True,'raw reuse disclosure missing')
reuse = read(constrained/'raw-source-reuse.json')
require(reuse['labels_predictions_freezes_or_reports_reused'] is False,'derived reuse')
require(comparison=={'expected':expected_constrained,'actual':expected_constrained,'status':'MATCH'},'historical constrained mismatch')
require(result['digest_comparison']==comparison and result['scientific_result']==scientific,'constrained summary disagreement')
require(scientific['scientific_result_sha256']==expected_constrained and scientific['panel_count']==100,'constrained scope/digest mismatch')
require(scientific['gate_statuses']=={'engineering_integrity':'PASS','nontrivial_constrained_evidence':'PASS','observed_primary_screening':'FAIL','recommendation_value':'FAIL','shift_behavior':'PASS'},'constrained gates changed')
for name,digest in start['source_sha256'].items():
    require(sha(root/name)==digest,'constrained source no longer matches: '+name)
stages=[]
for path in sorted(constrained.glob('[0-9][0-9]-*-result.json')):
    stage=read(path)
    require(stage['exit_code']==0 and stage['changed_sources']==[],'stage failure')
    require(stage['source_sha256_before']==stage['source_sha256_after']==start['source_sha256'],'stage source drift')
    require(sha(constrained/stage['log'])==stage['log_sha256'],'stage log hash mismatch')
    stages.append({'stage':stage['stage'],'command':stage['command'],'exit_code':stage['exit_code'],'log_sha256':stage['log_sha256']})
require([stage['stage'] for stage in stages]==result['completed_stages'],'missing or extra stage receipt')
engineering=read(constrained/'engineering-validation.json')
require(engineering['status']=='passed' and engineering['test_count']>0 and engineering['exit_code']==0,'constrained engineering failed')
require(engineering['source_sha256']==start['source_sha256'],'constrained engineering source mismatch')
engineering_stage=next(stage for stage in stages if stage['stage']=='engineering-tests')
require(engineering['command']==engineering_stage['command'],'engineering command mismatch')
require(engineering['result_log_sha256']==engineering_stage['log_sha256'],'engineering stage log mismatch')
require((root/engineering['result_log_path']).resolve()==(constrained/'logs/04-engineering-tests.log').resolve(),'engineering log path mismatch')
final_summary=re.search(rb'(?:^|\n)Ran ([0-9]+) tests? in [0-9.]+s\n\nOK\n?\Z',raw(root/engineering['result_log_path']))
require(final_summary is not None and int(final_summary.group(1))==engineering['test_count'],'engineering final test-count mismatch')
require(sha(root/engineering['result_log_path'])==engineering['result_log_sha256'],'engineering log hash mismatch')
reproduction=read(training/'reproduction.json')
decision=reproduction['decision']
require(decision['execution_status']=='COMPLETE_REPRODUCED','training not reproduced')
require(decision['status']=='NO_GO_MODEL_IMPROVEMENT' and decision['selected_model'] is None,'negative result changed')
require(decision['scientific_result_sha256']==expected_training,'historical training mismatch')
comparison_fields=('protocol_id','protocol_commit','protocol_sha256','input_sha256','implementation_sha256','environment','engineering_validation','fold_manifest_sha256','metadata_artifact_sha256','prediction_sha256','metrics','decision','scientific_result_sha256')
require(set(decision['comparisons'])==set(comparison_fields),'comparison fields missing or extra')
require(all(value is True for value in decision['comparisons'].values()),'between-process comparison failure')
require(len(reproduction['process_usage'])==2 and [row['pass'] for row in reproduction['process_usage']]==[1,2],'process records missing or reordered')
require(len(reproduction['pass_receipt_sha256'])==2,'pass hashes missing or extra')
require(all(row['returncode']==0 for row in reproduction['process_usage']),'training process failed')
training_engineering=root/'reports'/('training-tail-engineering-validation-'+attempt+'.json')
verified_engineering=tail.verify_engineering(training_engineering,tail.protocol_identity())
require(verified_engineering==reproduction['engineering_validation'],'training engineering identity mismatch')
passes=[]
pass_receipts=[]
for i in (1,2):
    pass_path=training/f'pass-{i}/pass-receipt.json'
    receipt=read(pass_path)
    require(sha(pass_path)==reproduction['pass_receipt_sha256'][i-1],'pass receipt hash mismatch')
    require(receipt['status']=='COMPLETE','pass incomplete')
    require(receipt['input_sha256']==tail.INPUT_HASHES,'input identity mismatch')
    require(receipt['opened_original_input_files']==sorted(tail.INPUT_HASHES),'training original-input boundary mismatch')
    require(receipt['engineering_validation']==verified_engineering,'pass engineering mismatch')
    require(receipt['scientific_result_sha256']==expected_training,'pass historical digest mismatch')
    scientific_fields=('protocol_id','protocol_commit','protocol_sha256','input_sha256','implementation_sha256','fold_manifest_sha256','metadata_artifact_sha256','metrics','decision','prediction_sha256')
    calculated=canonical_digest({key:receipt[key] for key in scientific_fields})
    require(calculated==expected_training,'independent pass scientific digest mismatch')
    require(receipt['decision']['status']=='NO_GO_MODEL_IMPROVEMENT' and receipt['decision']['selected_model'] is None,'pass result changed')
    for key in ('calibration_targets_opened','evaluation_targets_opened','new_coverage_claim'):
        require(receipt[key] is False and reproduction[key] is False,'training claim/read mismatch: '+key)
    folds=read(training/f'pass-{i}/folds-receipt.json')
    require(folds['training_label_file_opened'] is False and folds['fold_manifest_sha256']==receipt['fold_manifest_sha256'],'fold-before-label binding mismatch')
    pass_receipts.append(receipt)
    passes.append({'pass':i,'receipt_sha256':sha(pass_path),'scientific_result_sha256':calculated,'input_sha256':receipt['input_sha256'],'opened_original_input_files':receipt['opened_original_input_files'],'usage':receipt['usage'],'fold_manifest_sha256':receipt['fold_manifest_sha256'],'environment_sha256':canonical_digest(receipt['environment']),'decision':receipt['decision']})
require(all(pass_receipts[0][key]==pass_receipts[1][key] for key in comparison_fields),'actual pass fields differ despite flags')
require(decision['raw_artifacts_identical'] is (pass_receipts[0]['raw_artifact_sha256']==pass_receipts[1]['raw_artifact_sha256']),'raw-artifact flag differs from actual hashes')
files=[constrained/'workflow-start.json',constrained/'workflow-result.json',constrained/'engineering-validation.json',constrained/'scientific-result.json',constrained/'scientific-digest-comparison.json',training/'reproduction.json',training_engineering,root/('reports/training-tail-engineering-tests-'+attempt+'.txt'),Path(os.environ['LUPINE_VENV']).resolve()/'environment-check.json',prep/'environment-comparison.json',prep/'raw-source-reuse.json']
summary={'schema':'lupine.discovery.clean_reproduction.audit.v1','status':'PASS','attempt':attempt,'source_commit':commit,'tracked_sources_unchanged':True,'constrained':{'scientific_result':scientific,'comparison':comparison,'test_count':engineering['test_count'],'stages':stages,'raw_source_reuse':reuse},'training':{'decision':decision,'engineering':verified_engineering,'process_usage':reproduction['process_usage'],'passes':passes},'artifact_sha256':{str(path.relative_to(root)):sha(path) for path in files},'environment_comparison':read(prep/'environment-comparison.json'),'scope':'Same-host separate checkout/environment/process reproduction of frozen public archive and training-only negative experiment; reused raw ZIP, freshly rebuilt custody inputs; not new data or independent scientific evidence. Full constrained targets were replayed; separate trusted training workers read only four original data inputs. No raw targets copied into this audit.'}
with (prep/'audit-result-v2.json').open('x') as stream:
    json.dump(summary,stream,sort_keys=True,indent=2,allow_nan=False)
    stream.write('\n')
print(json.dumps({'status':'PASS','constrained_digest':expected_constrained,'training_digest':expected_training,'constrained_tests':engineering['test_count'],'training_tests':verified_engineering['passed'],'training_decision':decision['status'],'audit_result':str(prep/'audit-result-v2.json')},sort_keys=True))
