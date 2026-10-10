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

io=helpers.storemod
STAGE_KEYS={
 'input_freeze':{'original_rows','condition_rows','condition_groups','role_counts','feature_identity','route_identity','features','overlap'},
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


def implementation_snapshot():
    """Bind loaded source bytes; original registration owns published closure."""
    names=('mpea_archive_custody','mpea_archive_driver','mpea_production_store','mpea_study_flow',
           'mpea_fixture_driver','mpea_stage_store','mpea_target_custody','mpea_study',
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


def _execute(case,store,custodian,*,sampling_premise,checkpoint=None,preflight=None,allocation_marker_emitted=False):
    if type(case) is not custody.ArchiveCase or case._authority is not custody._AUTHORITY:
        persistence.fail('REGISTRATION_MISSING')
    custody.validate_case(case)
    if sampling_premise not in ('unsupported','assumed_unverified'):persistence.fail('SCHEMA_INVALID')
    before=implementation_snapshot();sealed_payloads={}
    def emit(value):
        if checkpoint is not None:checkpoint(value)
    def seal(stage,payload,**kwargs):
        if preflight is not None:preflight()
        if implementation_snapshot()!=before:persistence.fail('IMPLEMENTATION_MISMATCH')
        status=kwargs.get('status','COMPLETE')
        inputs={'feature':case.feature_identity,'label_routes':case.route_identity}
        if stage=='reserved' and status=='COMPLETE':
            vaults=payload['vault_identities']
            if set(vaults)!={'CALIBRATION','EVALUATION'}:persistence.fail('SCHEMA_INVALID')
            for role,identity in vaults.items():
                identity=persistence._identity(identity)
                if identity['scientific_sha256'] is None:persistence.fail('INPUT_IDENTITY_MISMATCH')
                inputs[role.lower()+'_vault']=identity
            payload=dict(payload,vault_identities={role:identity['scientific_sha256'] for role,identity in vaults.items()})
        payload=custody.bounded(payload)
        if type(payload) is not dict or set(payload)!=(STAGE_KEYS[stage] if status!='BLOCKED' else {'available'}):
            persistence.fail('SCHEMA_INVALID')
        receipt=store.commit(stage,payload,inputs=inputs,**kwargs)
        sealed_payloads[stage]=payload
        emit({'event':'STAGE_SEALED','stage':stage,'scientific_sha256':receipt['scientific_sha256']})
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
                       references=REFERENCES,result_type=ArchiveResult)
        return _seal_result(replace(result,source_captures=custodian.captures,captured_bytes=custodian.captured_bytes,
                       completed_policy_runs=custodian.policy_counts[0],policy_requests=custodian.policy_counts[1]))
    except Exception as error:
        code=getattr(error,'code','INTERNAL_FAILURE')
        if type(code) is not str or code not in persistence.CODES:code='INTERNAL_FAILURE'
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
    routes=custody.RouteContext(original.routes.header,original.routes.rows)
    route_identity=store.write_artifact('label-routes.json',custody._route_payload(routes,'c'*64),schema='lupine.discovery.mpea.label_routes.v1')
    store.commit('allocation',{'execution_kind':'CONSTRUCTED_FIXED_ASSIGNMENT','route_artifact':route_identity,
        'role_map_sha256':route_identity['bytes_sha256'],'actual_entropy_draw':False},inputs={'label_routes':route_identity})
    case=custody.fixture_case(original,store,store.stage_identity('allocation'),route_identity)
    source_custodian=custody.fixture_custodian(original,case,store)
    return _execute(case,store,source_custodian,sampling_premise=sampling_premise,checkpoint=checkpoint)


def run_registered(registration,metadata,allocation,store,local_feature_path,*,registration_module,checkpoint,allocation_marker_emitted=False):
    """Worker-only registered route; never acquire entropy or source over network."""
    if not callable(checkpoint):persistence.fail('REGISTRATION_MISSING')
    case=custody.prepare_registered(registration,metadata,allocation,store,local_feature_path,
                                   registration_module=registration_module)
    custodian=custody.registered_custodian(case,store,registration,registration_module=registration_module)
    result=_execute(case,store,custodian,sampling_premise=allocation.sampling_premise,checkpoint=checkpoint,
                    preflight=lambda:registration_module.verify_registered_sources(registration),
                    allocation_marker_emitted=allocation_marker_emitted)
    try:registration_module.verify_registered_sources(registration)
    except Exception as error:
        code=getattr(error,'code','IMPLEMENTATION_MISMATCH')
        if type(code) is not str or code not in persistence.CODES:code='IMPLEMENTATION_MISMATCH'
        return _seal_result(replace(result,status='BLOCKED',evaluation=None,reasons=(code,)))
    return result
