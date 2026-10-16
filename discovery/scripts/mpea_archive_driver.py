"""Source-specific persistent adapter around the shared frozen study flow.

No default production CLI. The synthetic API rejects the real archive identity.
Production preparation requires a registration-created authority and immutable
allocation; worker orchestration is a separate explicit caller.
"""
from __future__ import annotations
from dataclasses import dataclass,replace
from hashlib import sha256
from pathlib import Path
from types import MappingProxyType
import sys
import weakref

import mpea_archive_custody as custody
import mpea_fixture_driver as helpers
import mpea_production_store as persistence
from mpea_study_flow import execute
import mpea_stage_usage as stage_usage
import mpea_archive_artifacts as artifacts
import mpea_archive_decisions as decision_views

io=helpers.storemod
STAGE_KEYS={
 'input_freeze':{'original_rows','condition_rows','condition_groups','role_counts','feature_identity','route_identity','features','overlap',
  'feature_artifact','metadata_receipts','mapping','profile','label_route_seal','funnel_counts','overlap_counts','original_membership'},
 'development':{'rows','aggregate','status','reasons'},
 'rank_freeze':{'fit_digest','threshold','processing_medians','global_medians','ranks'},
 'reserved':{'completeness_digest','all_40_endpoints_defined','complete_ids','target_aggregates','vault_identities'},
 'calibration':{'plan_digests','all_future_decisions_sealed','plans'},
 'replay':{'completed_policy_runs','runs','all_policy_runs_complete'},
 'evaluation':{'evaluation','population_audits','access'}}
_ISSUED_RESULTS=weakref.WeakValueDictionary()
_RESULT_BINDINGS={}
REFERENCES=('Figshare 12642953.v9 column 11 recorded yield strength MPa',
 'Figshare 12642953.v9 column 13 recorded total elongation percentage points; feasibility at least development lower median',
 'Co-recorded archival endpoints; no same-specimen identity or measurement uncertainty established')


def error_code(error,default='INTERNAL_FAILURE'):
    code=getattr(error,'code',default)
    # The unchanged numerical kernel uses a trusted enum argument rather than a
    # .code attribute. Only that exact class receives this bounded mapping.
    if type(error) is helpers.kernel.StudyError and len(error.args)==1:
        code=error.args[0]
    return code if type(code) is str and code in persistence.CODES else default


class StageObservation:
    """Resource failure means unknown, never a fabricated zero observation."""
    def __init__(self,stage):
        self.stage=stage;self.observer=None;self.reason=None;self.value=None
        try:self.observer=stage_usage.StageUsage.start(stage)
        except Exception:self.reason='USAGE_OBSERVATION_UNAVAILABLE'

    def finish(self):
        if self.value is None:
            observation=None
            if self.observer is not None:
                try:observation=self.observer.finish()
                except Exception:self.reason='USAGE_OBSERVATION_UNAVAILABLE'
            self.value={'stage_resource':observation,
                'measurement_status':'OBSERVED' if observation is not None else 'UNAVAILABLE',
                'measurement_reason':self.reason,
                'window':'stage_entry_to_prepublication_boundary_excludes_own_publication_and_marker_ack',
                'allocation_import_resource':None}
        return io.normalize(self.value)


def stage_access(stage,custodian=None):
    if stage=='allocation' and custodian is None:return custody.allocation_access()
    actors={'allocation':'allocation_manager','input_freeze':'metadata_feature_custodian',
        'development':'target_custodian','rank_freeze':'development_model',
        'reserved':'target_custodian','calibration':'calibrator','replay':'fixed_policy_orchestrator','evaluation':'final_auditor'}
    counts={role:0 for role in helpers.ROLES}
    if custodian is not None:
        index=persistence.STAGES.index(stage)
        for role in helpers.ROLES:
            event='DEVELOPMENT' if role=='DEVELOPMENT' else 'CUSTODIAN_'+role
            events=[count for kind,count in custodian.access if kind==event]
            authorized=index>=persistence.STAGES.index('development' if role=='DEVELOPMENT' else 'reserved')
            counts[role]=events[-1] if events else (None if authorized else 0)
    return {'actor':actors[stage],'stage':stage,'target_access_actor':'target_custodian',
        'counter_scope':'cumulative_worker_custodian_completed_role_parse_or_unknown',
        'counter_unit':'co_recorded_target_row_bundle_two_cells','authorized_target_positions':[11,13],
        'accumulated_row_counts':counts,'decoded_row_counts':dict(counts),'interpreted_row_counts':dict(counts),
        'mixed_source_captures':0 if custodian is None else custodian.captures,
        'mixed_source_captured_bytes':0 if custodian is None else custodian.captured_bytes,
        'unselected_target_values_decoded':False}


class AllocationUsageStore:
    """Allocator-only view; the ordinary store and all scientific bytes stay owned by it."""
    def __init__(self,store):
        self.store=store;self.observation=StageObservation('allocation');self.import_usage=None
    def __getattr__(self,name):return getattr(self.store,name)
    def write_artifact(self,name,payload,**kwargs):
        if (type(name) is not str or name!='label-routes.json'
                or kwargs.get('schema')!='lupine.discovery.mpea.label_routes.v1'
                or 'access' in kwargs or 'usage' in kwargs):persistence.fail('SCHEMA_INVALID')
        return self.store.write_artifact(name,payload,access=custody.allocation_access(),
            usage=custody.companion_usage('allocation'),**kwargs)
    def commit(self,stage,payload,**kwargs):
        if stage!='allocation' or 'usage' in kwargs:persistence.fail('STAGE_ORDER_VIOLATION')
        return self.store.commit(stage,payload,usage=self.observation.finish(),access=stage_access(stage),**kwargs)
    def import_original_allocation(self,*args,**kwargs):
        result=self.store.import_original_allocation(*args,**kwargs)
        # This new-attempt observation never changes the imported original bytes.
        self.import_usage=self.observation.finish()
        return result


@dataclass(frozen=True)
class ArchiveResult:
    status:str
    store:object
    fit:object|None
    ranks:tuple
    completeness:object|None
    plans:tuple
    evaluation:object|None
    aggregates:object
    access:tuple
    reasons:tuple=()
    source_captures:int=0
    captured_bytes:int=0
    completed_policy_runs:int=0
    policy_requests:int=0


def _result_binding(result):
    # Bind the identities captured at successful writes without reopening disk.
    # An unavailable return must survive damaged persisted evidence; publication
    # separately verifies the full prefix and rejects that evidence.
    stages=tuple((stage,dict(identity)) for stage,_,identity in result.store._sealed)
    return io.digest({'status':result.status,'stages':stages,
        'evaluation':None if result.evaluation is None else result.evaluation.evaluation_digest,
        'fit':None if result.fit is None else result.fit.fit_digest,
        'ranks':[rank.rank_digest for rank in result.ranks],
        'plans':[plan.plan_digest for plan in result.plans],
        'aggregates':result.aggregates,'access':result.access,'reasons':result.reasons,
        'source_captures':result.source_captures,'captured_bytes':result.captured_bytes,
        'completed_policy_runs':result.completed_policy_runs,'policy_requests':result.policy_requests})


def _seal_result(result):
    _ISSUED_RESULTS[id(result)]=result;_RESULT_BINDINGS[id(result)]=_result_binding(result)
    return result


def validate_result(result):
    if (type(result) is not ArchiveResult or _ISSUED_RESULTS.get(id(result)) is not result
            or _RESULT_BINDINGS.get(id(result))!=_result_binding(result)):
        persistence.fail('INPUT_IDENTITY_MISMATCH')
    result.store.verify()
    verify_companions(result.store)


def verify_companions(store):
    values={name:store.read_artifact(f'stage-{persistence.STAGES.index(name):02d}-{name.replace("_","-")}.json',store.stage_identity(name)) for name in store.stages}
    def read(name,identity):
        return store.read_artifact(name,store._artifacts[name] if identity is None else identity)
    custody.verify_evidence_graph(values,read)


def implementation_snapshot():
    """Bind loaded source bytes; original registration owns published closure."""
    names=('mpea_archive_custody','mpea_archive_driver','mpea_production_store','mpea_study_flow',
           'mpea_fixture_driver','mpea_stage_usage','mpea_archive_profiles','mpea_archive_artifacts','mpea_archive_decisions','mpea_stage_store','mpea_target_custody','mpea_study',
           'lupine_discovery.core','lupine_discovery.evidence','lupine_discovery.serialization',
           'lupine_discovery.representation','lupine_discovery.decision_pool','lupine_discovery.replay')
    output={}
    for name in names:
        module=sys.modules.get(name)
        if module is None or not getattr(module,'__file__',None):persistence.fail('IMPLEMENTATION_MISMATCH')
        path=Path(module.__file__).resolve()
        permitted=(persistence.ROOT/'scripts',persistence.ROOT/'src/lupine_discovery',Path(__file__).resolve().parent)
        if path.parent not in permitted:persistence.fail('IMPLEMENTATION_MISMATCH')
        output[name]=sha256(custody.capture(path,8*1048576)).hexdigest()
    return output


def _execute(case,store,custodian,*,sampling_premise,checkpoint=None,preflight=None,allocation_marker_emitted=False,input_observation=None,allocation_import_usage=None):
    if type(case) is not custody.ArchiveCase or case._authority is not custody._AUTHORITY:
        persistence.fail('REGISTRATION_MISSING')
    custody.validate_case(case)
    if sampling_premise not in ('unsupported','assumed_unverified'):persistence.fail('SCHEMA_INVALID')
    before=implementation_snapshot();sealed_payloads={};original_evidence={}
    observations={'input_freeze':input_observation or StageObservation('input_freeze')}
    def emit(value):
        if checkpoint is not None:checkpoint(value)
    def capture_evidence(stage,value):
        if stage!='calibration' or stage in original_evidence:persistence.fail('STAGE_ORDER_VIOLATION')
        original_evidence[stage]=value
    def seal(stage,payload,**kwargs):
        if preflight is not None:preflight()
        if implementation_snapshot()!=before:persistence.fail('IMPLEMENTATION_MISMATCH')
        status=kwargs.get('status','COMPLETE')
        inputs={'feature':dict(case.feature_identity),'label_routes':dict(case.route_identity),
                **{name:dict(identity) for name,identity in case.input_context['metadata_receipts'].items()}}
        payload=custody.bounded(payload)
        if type(payload) is not dict or set(payload)!=(STAGE_KEYS[stage] if status!='BLOCKED' else {'available'}):
            persistence.fail('SCHEMA_INVALID')
        if status!='BLOCKED':
            if stage=='development':
                development=artifacts.development_targets(payload,custodian.framing('DEVELOPMENT'))
                identity=store.write_artifact('development-targets.json',development,
                    schema='lupine.discovery.mpea.development_targets.v1',inputs=inputs,
                    usage=custody.companion_usage('development'),
                    access=custodian.target_access(('DEVELOPMENT',),{'DEVELOPMENT':payload['aggregate']['row_count']}))
                inputs['development_targets']=identity
                payload=dict(payload,development_targets=identity['scientific_sha256'])
            elif stage=='rank_freeze':
                prior=store.read_artifact('stage-02-development.json',store.stage_identity('development'))
                identity=prior['inputs']['development_targets']
                development=store.read_artifact('development-targets.json',identity)['payload']
                compact={key:prior['payload'][key] for key in ('rows','aggregate','status','reasons')}
                artifacts.validate_development_targets(development,compact,custodian.framing('DEVELOPMENT'))
                payload=artifacts.rank_freeze(payload,development)
                inputs['development_targets']=identity
            elif stage=='reserved':
                vaults=payload['vault_identities']
                if set(vaults)!={'CALIBRATION','EVALUATION'}:persistence.fail('SCHEMA_INVALID')
                for role,identity in vaults.items():
                    identity=persistence._identity(identity)
                    if identity['scientific_sha256'] is None:persistence.fail('INPUT_IDENTITY_MISMATCH')
                    inputs[role.lower()+'_vault']=identity
                payload=dict(payload,vault_identities={role:identity['scientific_sha256'] for role,identity in vaults.items()})
                companions=custodian.companion_identities
                if set(companions)!={'secondary_membership','completeness'}:persistence.fail('INPUT_IDENTITY_MISMATCH')
                for name,identity in companions.items():
                    inputs[name]=identity;payload[name]=identity['scientific_sha256']
            elif stage=='calibration':
                payload=decision_views.complete_calibration_payload(payload,original_evidence['calibration'])
                inputs.update(custodian.companion_identities)
        if stage not in observations:observations[stage]=StageObservation(stage)
        rank_summary_identity=None;prospective_rank_sha=None
        access=stage_access(stage,custodian)
        if stage=='rank_freeze' and status=='COMPLETE':
            prospective_inputs=dict(inputs,previous=store.verify())
            body={'schema':'lupine.discovery.mpea.rank_freeze.v1','protocol_id':persistence.PROTOCOL_ID,
                'stage':stage,'status':status,'reasons':list(kwargs.get('reasons',())),
                'registration':store._registration,'source':store._source,'inputs':prospective_inputs,
                'payload':payload,'access':dict(access,execution_scope=store.execution_scope),'usage':{}}
            prospective_rank_sha=io.digest(persistence.scientific_preimage(body))
            rank_summary_identity=store.write_artifact('rank-summary.json',custody.public_rank_summary(payload,prospective_rank_sha),
                schema='lupine.discovery.mpea.rank_freeze_summary.v1',inputs=inputs,
                usage=custody.companion_usage('rank_freeze'),access=custody.rank_summary_access())
        observation=observations[stage].finish()
        if stage=='input_freeze':observation['allocation_import_resource']=allocation_import_usage
        receipt=store.commit(stage,payload,inputs=inputs,usage=observation,access=access,**kwargs)
        if prospective_rank_sha is not None:
            if receipt['scientific_sha256']!=prospective_rank_sha:persistence.fail('INPUT_IDENTITY_MISMATCH')
            summary=store.read_artifact('rank-summary.json',rank_summary_identity)
            if io.canonical(summary['payload'])!=io.canonical(custody.public_rank_summary(payload,receipt['scientific_sha256'])):persistence.fail('INPUT_IDENTITY_MISMATCH')
        sealed_payloads[stage]=payload
        emit({'event':'STAGE_SEALED','stage':stage,'scientific_sha256':receipt['scientific_sha256']})
        index=persistence.STAGES.index(stage)
        if index+1<len(persistence.STAGES):observations[persistence.STAGES[index+1]]=StageObservation(persistence.STAGES[index+1])
        return receipt['scientific_sha256']
    try:
        store.require('allocation')
        if store.stage_identity('allocation')!=case.allocation_identity:persistence.fail('INPUT_IDENTITY_MISMATCH')
        # Allocation was committed by its separate gate. Its marker is emitted
        # only after the exact existing stage identity passes this check.
        if not allocation_marker_emitted:
            emit({'event':'STAGE_SEALED','stage':'allocation','scientific_sha256':case.allocation_identity['scientific_sha256']})
        seal('input_freeze',case.input_payload)
        result=execute(case,store,custodian,seal,emit,sampling_premise=sampling_premise,
                       references=custodian.references,result_type=ArchiveResult,stage_gate=lambda:verify_companions(store),
                       stage_evidence=capture_evidence)
        return _seal_result(replace(result,source_captures=custodian.captures,captured_bytes=custodian.captured_bytes,
                       completed_policy_runs=custodian.policy_counts[0],policy_requests=custodian.policy_counts[1]))
    except Exception as error:
        code=error_code(error)
        if len(store.stages)<len(persistence.STAGES):
            try:seal(persistence.STAGES[len(store.stages)],{'available':None},status='BLOCKED',reasons=(code,))
            except Exception:pass
        aggregates={role:None for role in helpers.ROLES}
        if 'development' in sealed_payloads:aggregates['DEVELOPMENT']=sealed_payloads['development'].get('aggregate')
        if 'reserved' in sealed_payloads:aggregates.update(sealed_payloads['reserved'].get('target_aggregates',{}))
        return _seal_result(ArchiveResult('BLOCKED',store,None,(),None,(),None,MappingProxyType(aggregates),
            tuple(custodian.access),(code,),custodian.captures,custodian.captured_bytes,*custodian.policy_counts))


def run_synthetic(original,attempt,registration_binding,*,checkpoint=None,sampling_premise='unsupported'):
    """Constructed fixed roles only; no source paths, actual allocation or entropy."""
    if type(original) is not helpers.FixtureCase or original.routes.source.sha256==custody.SOURCE['sha256']:
        persistence.fail('SYNTHETIC_FIXTURE_REQUIRED')
    source={'bytes':original.routes.source.byte_count,'md5':original.routes.source.md5,'sha256':original.routes.source.sha256}
    store=persistence.ProductionStageStore(attempt,registration_binding,source,execution_kind='SYNTHETIC_FIXTURE')
    allocation_store=AllocationUsageStore(store)
    routes=custody.RouteContext(original.routes.header,original.routes.rows)
    route_identity=allocation_store.write_artifact('label-routes.json',custody._route_payload(routes,'c'*64),schema='lupine.discovery.mpea.label_routes.v1')
    allocation_store.commit('allocation',{'execution_kind':'CONSTRUCTED_FIXED_ASSIGNMENT','route_artifact':route_identity,
        'role_map_sha256':route_identity['bytes_sha256'],'actual_entropy_draw':False},inputs={'label_routes':route_identity})
    case=custody.fixture_case(original,store,store.stage_identity('allocation'),route_identity)
    source_custodian=custody.fixture_custodian(original,case,store)
    return _execute(case,store,source_custodian,sampling_premise=sampling_premise,checkpoint=checkpoint)


def run_registered(registration,metadata,allocation,store,local_feature_path,*,registration_module,checkpoint,allocation_marker_emitted=False,allocation_import_usage=None):
    """Worker-only registered route; never acquire entropy or source over network."""
    if not callable(checkpoint):persistence.fail('REGISTRATION_MISSING')
    observation=StageObservation('input_freeze')
    try:
        case=custody.prepare_registered(registration,metadata,allocation,store,local_feature_path,
                                       registration_module=registration_module)
    except Exception:
        # Worker seals its closed failure; retain the attempted preparation costs.
        store._input_failure_usage=observation.finish()
        raise
    custodian=custody.registered_custodian(case,store,registration,registration_module=registration_module)
    result=_execute(case,store,custodian,sampling_premise=allocation.sampling_premise,checkpoint=checkpoint,
                    preflight=lambda:registration_module.verify_registered_sources(registration),
                    allocation_marker_emitted=allocation_marker_emitted,input_observation=observation,
                    allocation_import_usage=allocation_import_usage)
    try:registration_module.verify_registered_sources(registration)
    except Exception as error:
        code=error_code(error,'IMPLEMENTATION_MISMATCH')
        return _seal_result(replace(result,status='BLOCKED',evaluation=None,reasons=(code,)))
    return result
