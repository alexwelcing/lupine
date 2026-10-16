"""Explicit parent launcher: authenticated registration, then fixed supervision.

Only the parent queries official CI. The worker receives that exact captured
identity over a trusted local launch boundary, and runs without network access.
"""
from __future__ import annotations
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import sys
import mpea_archive_operations as operations

ROOT=next(parent for parent in Path(__file__).resolve().parents if (parent/'src/lupine_discovery/decision_pool.py').is_file())
_NAME=re.compile('[A-Za-z0-9][A-Za-z0-9_-]{0,79}\\Z')
_HEX=re.compile('[0-9a-f]{64}\\Z')


class LaunchSink:
    """Reuse reviewed anchored no-overwrite publication, outside scientific stages."""
    def __init__(self,attempt,io):
        self.io=io;self._anchors=[];self._path=ROOT/'.cache/mpea-archival-launches'/attempt
        try:
            descriptor=os.open('/',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
            self._anchors.append((Path('/'),descriptor,os.fstat(descriptor)));current=Path('/')
            for part in self._path.parent.parts[1:]:
                current=current/part
                if current==ROOT/'.cache' or ROOT/'.cache' in current.parents:
                    try:os.mkdir(part,mode=0o700,dir_fd=descriptor)
                    except FileExistsError:pass
                descriptor=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=descriptor)
                self._anchors.append((current,descriptor,os.fstat(descriptor)))
            self._check();os.mkdir(attempt,mode=0o700,dir_fd=descriptor)
            descriptor=os.open(attempt,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=descriptor)
            self._anchors.append((self._path,descriptor,os.fstat(descriptor)));self._directory_fd=descriptor;self._check()
        except Exception:self.close();raise
    @property
    def path(self):return self._path
    def _check(self):return self.io.FixtureStageStore._assert_location(self)
    def write(self,name,raw):
        if name not in ('parent-capture.json','launch-result.json') or type(raw) is not bytes or len(raw)>8*1048576:
            raise ValueError('SCHEMA_INVALID')
        self.io._exclusive(self.path/name,raw,directory_fd=self._directory_fd,check=self._check)
        return sha256(raw).hexdigest()
    def close(self):
        while self._anchors:
            _,fd,_=self._anchors.pop()
            os.close(fd)


def _verify_prefix(root,operational,registration,custody,io,artifact_inventory=None):
    """Validate persisted receipts after successful terminal; no new model fit."""
    import mpea_production_store as store
    previous=None;stages={};values={}
    inventory={} if artifact_inventory is None else artifact_inventory
    markers=operational['sealed_stages']
    expected=store.STAGES if operational['status']=='COMPLETE' else store.STAGES[:3]
    if type(markers) is not list or [m.get('stage') for m in markers]!=list(expected):raise ValueError('INPUT_IDENTITY_MISMATCH')
    for index,(stage,marker) in enumerate(zip(expected,markers)):
        raw=custody.capture(root/f'stage-{index:02d}-{stage.replace("_","-")}.json',32*1048576)
        value=io._loads(raw)
        store.verify_envelope(value,registration.binding,custody.SOURCE,execution_scope='registered_study')
        if (value['schema']!='lupine.discovery.mpea.'+stage+'.v1' or value['stage']!=stage
                or value['scientific_sha256']!=marker['scientific_sha256']
                or io.canonical(value['inputs'].get('previous'))!=io.canonical(previous)
                or value['status']!=('NO_GO_INSUFFICIENT_DEVELOPMENT' if operational['status']=='NO_GO_INSUFFICIENT_DEVELOPMENT' and stage=='development' else 'COMPLETE')):
            raise ValueError('INPUT_IDENTITY_MISMATCH')
        previous={'bytes_sha256':sha256(raw).hexdigest(),'content_sha256':value['content_sha256'],'scientific_sha256':value['scientific_sha256']}
        stages[stage]=previous;values[stage]=value
        inventory[f'stage-{index:02d}-{stage.replace("_","-")}.json']=dict(previous)
    def read_companion(name,identity):
        raw=custody.capture(root/name,32*1048576)
        if identity is not None and sha256(raw).hexdigest()!=identity['bytes_sha256']:raise ValueError('INPUT_IDENTITY_MISMATCH')
        value=io._loads(raw);store.verify_envelope(value,registration.binding,custody.SOURCE,execution_scope='registered_study')
        if identity is not None and any(value[key]!=identity[key] for key in ('content_sha256','scientific_sha256')):raise ValueError('INPUT_IDENTITY_MISMATCH')
        inventory[name]={'bytes_sha256':sha256(raw).hexdigest(),'content_sha256':value['content_sha256'],'scientific_sha256':value['scientific_sha256']}
        return value
    custody.verify_evidence_graph(values,read_companion)
    return stages,values


def _public_transport(raw,result,registration,kind,stages,values,io):
    """Closed outer transport and seals; trust the registered worker projector.

    This does not reconstruct private metrics or claim seal-only scientific
    verification. The final verdict is joined to the supervisor-bound evaluation.
    """
    import mpea_study_report as report
    public=io._loads(raw)
    expected={'schema','protocol_id','stage','status','reasons','registration','source','inputs','execution_kind',
              'payload','access','usage','scientific_sha256','content_sha256'}
    complete=result['status']=='COMPLETE'
    if (type(public) is not dict or set(public)!=expected
            or public['schema']!=(report.SCHEMA if complete else report.UNAVAILABLE_SCHEMA)
            or public['stage']!=('evaluation' if complete else 'unavailable')
            or public['status']!=result['status'] or public['protocol_id']!='mpea-t25-archival-v1'
            or public['execution_kind']!=('registered_original' if kind=='PRODUCTION_ARCHIVE' else 'registered_reproduction')
            or type(public['payload']) is not dict or type(public['inputs']) is not dict or set(public['inputs'])!=set(report.INPUT_NAMES)
            or public['source']!={'byte_count':332126,'md5':'6d29eb6018157b863ca0033ccec936d5','sha256':'c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d'}):
        raise ValueError('INPUT_IDENTITY_MISMATCH')
    binding=registration.binding
    expected_registration={key:binding[key] for key in ('commit','protocol_sha256','contract_sha256','implementation_manifest_sha256','engineering_receipt_sha256','ci_receipt_sha256','receipt')}
    if io.canonical(public['registration'])!=io.canonical(expected_registration):raise ValueError('INPUT_IDENTITY_MISMATCH')
    for stage in report.STAGES:
        if io.canonical(public['inputs'][stage])!=io.canonical(stages.get(stage)):raise ValueError('INPUT_IDENTITY_MISMATCH')
    for name,path in (('mapping','docs/mpea-column-mapping-v1.json'),('metadata_b','reports/mpea-row-metadata-v1.json'),('formula_c','reports/mpea-formula-tokens-v1.json')):
        expected_identity={'bytes_sha256':registration.manifest_files['discovery/'+path],'content_sha256':None,'scientific_sha256':None}
        if io.canonical(public['inputs'][name])!=io.canonical(expected_identity):raise ValueError('INPUT_IDENTITY_MISMATCH')
    if 'input_freeze' in values and values['input_freeze']['status']=='COMPLETE':
        if io.canonical(public['inputs']['feature'])!=io.canonical(values['input_freeze']['payload']['feature_identity']):raise ValueError('INPUT_IDENTITY_MISMATCH')
    for identity in public['inputs'].values():
        if identity is not None:
            if type(identity) is not dict or set(identity)!={'bytes_sha256','content_sha256','scientific_sha256'}:raise ValueError('SCHEMA_INVALID')
            report.ArtifactIdentity(**identity)
    payload=public['payload']
    complete_keys={'funnel','target_status_counts','derived_threshold','all_40_primary_endpoints_defined','fallback_counts','calibration_summary','population_metrics','policy_metrics','gate_denominators','gate_margins','gate_checks','gate_reasons','failed_gates','component_verdicts','component_reasons','overall_verdict','costs','run_accounting','kernel_evaluation_sha256','scope'}
    failure_keys={'last_sealed_stage','funnel','target_status_counts','completed_policy_runs','calibration_summary','population_metrics','policy_metrics','gate_denominators','gate_margins','gate_checks','gate_reasons','failed_gates','component_verdicts','component_reasons','overall_verdict','scope'}
    if set(payload)!=(complete_keys if complete else failure_keys) or payload['scope']!=report.SCOPE:raise ValueError('SCHEMA_INVALID')
    verdict=payload['overall_verdict']
    if complete:
        final=values['evaluation']['payload']['evaluation']
        if (verdict not in ('GO_DESIGN_INDEPENDENT_STUDY','NO_GO_ARCHIVAL_USEFULNESS')
                or verdict!=final['overall_verdict'] or payload['kernel_evaluation_sha256']!=final['evaluation_digest']):raise ValueError('INPUT_IDENTITY_MISMATCH')
    elif verdict is not None:raise ValueError('INPUT_IDENTITY_MISMATCH')
    if public['content_sha256']!=report._hash({k:v for k,v in public.items() if k!='content_sha256'}):raise ValueError('INPUT_IDENTITY_MISMATCH')
    scientific={key:public[key] for key in ('schema','protocol_id','stage','status','reasons','source','payload','access')}
    scientific['execution_scope']='registered_study'
    scientific['registration']={key:public['registration'][key] for key in ('commit','protocol_sha256','contract_sha256','implementation_manifest_sha256')}
    scientific['inputs']={key:None if identity is None else identity['scientific_sha256'] or identity['bytes_sha256'] for key,identity in public['inputs'].items()}
    if public['scientific_sha256']!=report._hash(scientific):raise ValueError('INPUT_IDENTITY_MISMATCH')
    return public


def launch(*,registration_path,approved_engineering_sha256,feature_path,attempt,original_attempt=None):
    if (type(attempt) is not str or _NAME.fullmatch(attempt) is None
            or type(approved_engineering_sha256) is not str or _HEX.fullmatch(approved_engineering_sha256) is None
            or (original_attempt is not None and (type(original_attempt) is not str or _NAME.fullmatch(original_attempt) is None or original_attempt==attempt))
            or Path(__file__).resolve()!=ROOT/'scripts/mpea_archive_run.py'):
        raise ValueError('REGISTRATION_MISSING')
    import mpea_registration_allocation as registration_module
    import mpea_study_supervisor as supervisor
    import mpea_archive_custody as custody
    import mpea_stage_store as io
    # Official verification and explicit engineering approval precede even the
    # new launch directory, allocation, private features, or mixed source capture.
    verifier=registration_module.verify_registration if original_attempt is None else registration_module.verify_reproduction_registration
    registration=verifier(registration_path,approved_engineering_sha256=approved_engineering_sha256)
    registration_module.verify_registered_sources(registration)
    if type(registration.parent_capture) is not bytes:raise ValueError('REGISTRATION_MISMATCH')
    feature_path=Path(feature_path).absolute();registration_path=Path(registration_path).absolute()
    if (ROOT/'.cache/mpea-features' not in feature_path.parents or '..' in feature_path.parts
            or any(path.is_symlink() for path in (feature_path,*feature_path.parents))):raise ValueError('OUTPUT_PATH_INVALID')
    sink=LaunchSink(attempt,io)
    try:
        capture_sha=sink.write('parent-capture.json',registration.parent_capture)
        command=[sys.executable,str(ROOT/'scripts/mpea_archive_worker.py'),str(registration_path),
            str(sink.path/'parent-capture.json'),capture_sha,attempt,str(feature_path),
            'PRODUCTION_ARCHIVE' if original_attempt is None else 'REPRODUCTION_FIXED_ALLOCATION',original_attempt or '-']
        operational=supervisor.run(command,sink.path/'supervisor.json')
        sink._check()
        supervisor_raw=custody.capture(sink.path/'supervisor.json',8*1048576)
        expected_supervisor=json.dumps(operational,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf-8')
        if supervisor_raw not in (expected_supervisor,expected_supervisor+b'\n'):raise ValueError('INPUT_IDENTITY_MISMATCH')
        receipt={'schema':'lupine.discovery.mpea.launch.v1','registration':registration.binding,
            'parent_capture_sha256':capture_sha,'command':command,'supervisor_sha256':sha256(supervisor_raw).hexdigest(),
            'operational_status':operational['status'],'operational_reason':operational['reason'],
            'scientific_verdict':None,'attempt_result_identity':None,'reproduction':None,
            'post_terminal_private_receipts_decoded':False,
            'verification_scope':'Registered worker aggregation; parent persistence and transport audit without refitting'}
        # A successful terminal is necessary, never inferred from a stage file.
        if operational['status'] in ('COMPLETE','NO_GO_INSUFFICIENT_DEVELOPMENT'):
            attempt_root=ROOT/'.cache/mpea-archival'/attempt
            raw=custody.capture(attempt_root/'attempt-result.json',8*1048576);result=io._loads(raw)
            if (result['content_sha256']!=io.digest({k:v for k,v in result.items() if k!='content_sha256'})
                    or result['status']!=operational['status']
                    or result['execution_kind']!=command[-2]
                    or list(result['scientific_stages'])!=sorted(result['scientific_stages'])):
                raise ValueError('INPUT_IDENTITY_MISMATCH')
            expected={m['stage']:m['scientific_sha256'] for m in operational['sealed_stages']}
            if io.canonical(result['scientific_stages'])!=io.canonical(expected):raise ValueError('INPUT_IDENTITY_MISMATCH')
            public_raw=custody.capture(attempt_root/'public-report.json',8*1048576)
            inventory={}
            stages,values=_verify_prefix(attempt_root,operational,registration,custody,io,inventory)
            receipt['post_terminal_private_receipts_decoded']=True
            public=_public_transport(public_raw,result,registration,command[-2],stages,values,io)
            identity=result['public_identity']
            if sha256(public_raw).hexdigest()!=identity['bytes_sha256'] or public.get('content_sha256')!=identity['content_sha256'] or public.get('scientific_sha256')!=identity['scientific_sha256']:
                raise ValueError('INPUT_IDENTITY_MISMATCH')
            receipt['attempt_result_identity']={'bytes_sha256':sha256(raw).hexdigest(),'content_sha256':result['content_sha256']}
            receipt['scientific_verdict']=public['payload'].get('overall_verdict')
            inventory['public-report.json']=dict(identity)
            inventory['attempt-result.json']={**receipt['attempt_result_identity'],'scientific_sha256':None}
            if original_attempt is not None:
                original_raw=custody.capture(ROOT/'.cache/mpea-archival'/original_attempt/'attempt-result.json',8*1048576)
                original=io._loads(original_raw)
                if original['content_sha256']!=io.digest({k:v for k,v in original.items() if k!='content_sha256'}):raise ValueError('INPUT_IDENTITY_MISMATCH')
                original_root=ROOT/'.cache/mpea-archival'/original_attempt
                if original['status'] not in ('COMPLETE','NO_GO_INSUFFICIENT_DEVELOPMENT') or original['execution_kind'] not in ('PRODUCTION_ARCHIVE','REPRODUCTION_FIXED_ALLOCATION'):raise ValueError('INPUT_IDENTITY_MISMATCH')
                original_operational={'status':original['status'],'sealed_stages':[{'stage':name,'scientific_sha256':original['scientific_stages'][name]}
                    for name in ('allocation','input_freeze','development','rank_freeze','reserved','calibration','replay','evaluation') if name in original['scientific_stages']]}
                original_inventory={}
                original_stages,original_values=_verify_prefix(original_root,original_operational,registration,custody,io,original_inventory)
                original_public_raw=custody.capture(original_root/'public-report.json',8*1048576)
                original_public=_public_transport(original_public_raw,original,registration,original['execution_kind'],original_stages,original_values,io)
                original_identity={'bytes_sha256':sha256(original_public_raw).hexdigest(),'content_sha256':original_public['content_sha256'],'scientific_sha256':original_public['scientific_sha256']}
                if io.canonical(original_identity)!=io.canonical(original['public_identity']):raise ValueError('INPUT_IDENTITY_MISMATCH')
                original_inventory['public-report.json']=original_identity
                original_inventory['attempt-result.json']={'bytes_sha256':sha256(original_raw).hexdigest(),'content_sha256':original['content_sha256'],'scientific_sha256':None}
                comparison=operations.compare_artifact_identities(original_inventory,inventory)
                same_stages=io.canonical(original['scientific_stages'])==io.canonical(result['scientific_stages'])
                same_public=original['public_identity']['scientific_sha256']==result['public_identity']['scientific_sha256']
                reproduced=same_stages and same_public and comparison['scientific_seals_identical']
                receipt['reproduction']={'original_result_sha256':sha256(original_raw).hexdigest(),
                    'scientific_stages_identical':same_stages,'public_scientific_identity_identical':same_public,
                    'artifact_comparison':comparison,'status':'REPRODUCED' if reproduced else 'MISMATCH',
                    'new_allocation_draw':False,'independent_scientific_sample':False}
                if not reproduced:receipt['operational_status']='BLOCKED';receipt['operational_reason']='INPUT_IDENTITY_MISMATCH';receipt['scientific_verdict']=None
        registration_module.verify_registered_sources(registration)
        receipt.update(operations.study_outcome(receipt['operational_status'],receipt['operational_reason']))
        if receipt['study_status']!='COMPLETE':receipt['scientific_verdict']=None
        receipt['content_sha256']=io.digest(receipt);sink.write('launch-result.json',io.canonical(receipt))
        return receipt
    finally:sink.close()


def main(argv=None):
    args=sys.argv[1:] if argv is None else argv
    allowed={'--registration','--engineering-sha256','--feature','--attempt','--original-attempt'}
    try:
        if type(args) is not list or len(args) not in (8,10):raise ValueError()
        options={}
        for key,value in zip(args[::2],args[1::2]):
            if key not in allowed or key in options or type(value) is not str:raise ValueError()
            options[key]=value
        if not allowed-{'--original-attempt'}<=set(options):raise ValueError()
        receipt=launch(registration_path=options['--registration'],approved_engineering_sha256=options['--engineering-sha256'],
            feature_path=options['--feature'],attempt=options['--attempt'],original_attempt=options.get('--original-attempt'))
        status,reason=receipt['study_status'],receipt['study_reason']
        print(json.dumps({'status':status,'reason':reason},sort_keys=True))
        return 0 if status in ('COMPLETE','NO_GO_INSUFFICIENT_DEVELOPMENT') else 2
    except Exception as error:
        reason=getattr(error,'code','INTERNAL_FAILURE')
        if type(error) is ValueError and len(error.args)==1 and type(error.args[0]) is str and error.args[0] in operations.STUDY_REASONS:reason=error.args[0]
        outcome=operations.study_outcome('BLOCKED',reason)
        print(json.dumps({'status':outcome['study_status'],'reason':outcome['study_reason']},sort_keys=True))
        return 2


if __name__=='__main__':raise SystemExit(main())
