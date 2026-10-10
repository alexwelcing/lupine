"""Small source-free bridge from custody results to the frozen public projector.

Only captured, verified private stage metadata is read. Numerical targets stay
inside the existing typed evaluator/projector boundary; no public row tables.
"""
from __future__ import annotations
from hashlib import sha256

import mpea_archive_driver as driver
import mpea_study_report as report

io=driver.io


def _identity(value):
    return report.ArtifactIdentity(value['bytes_sha256'],value['content_sha256'],value['scientific_sha256'])


def _stage(store,name):
    index=driver.persistence.STAGES.index(name)
    return store.read_artifact(f'stage-{index:02d}-{name.replace("_","-")}.json',store.stage_identity(name))


def project(result,*,metadata_identities,usage=None):
    """Caller authenticates the three public metadata artifact identities."""
    if type(result) is not driver.ArchiveResult:driver.persistence.fail('SCHEMA_INVALID')
    store=result.store;store.verify()
    if type(metadata_identities) is not dict or set(metadata_identities)!={'mapping','metadata_b','formula_c'}:
        driver.persistence.fail('SCHEMA_INVALID')
    inputs={name:None for name in report.INPUT_NAMES}
    for name,identity in metadata_identities.items():inputs[name]=_identity(driver.persistence._identity(identity))
    for name in store.stages:inputs[name]=_identity(store.stage_identity(name))
    allocation=_stage(store,'allocation') if 'allocation' in store.stages else None
    routes=None
    if allocation is not None and allocation['status']=='COMPLETE':
        route_identity=allocation['payload']['route_artifact']
        routes=store.read_artifact('label-routes.json',route_identity)['payload']['original_row_routes']
    if 'input_freeze' in store.stages:
        frozen=_stage(store,'input_freeze')
        if frozen['status']=='COMPLETE':inputs['feature']=_identity(frozen['payload']['feature_identity'])
    funnel=None;roles={role:None for role in report.ROLES}
    if routes is not None:
        selected=[row for row in routes if row['condition_eligible']]
        unresolved=sum(row['source_group'] is None for row in routes)
        funnel=report.FunnelCounts(len(routes),len(selected),len({row['source_group'] for row in selected}),len(routes)-len(selected)-unresolved,unresolved)
        roles={role:report.RoleCounts(sum(row['role']==role for row in selected),
                    len({row['source_group'] for row in selected if row['role']==role})) for role in report.ROLES}
    summaries={role:None for role in report.ROLES}
    parsed={role:0 for role in report.ROLES}
    for role in report.ROLES:
        summary=result.aggregates[role]
        stage='development' if role=='DEVELOPMENT' else 'reserved'
        if summary is None:
            if stage in store.stages:parsed[role]=None
            continue
        summaries[role]=report.TargetAggregates(summary['row_count'],summary['complete_row_count'],summary['complete_group_count'],
            {name:{code:summary['status_counts'][name].get(code,0) for code in report.TARGET_REASONS} for name in report.TARGET_NAMES},
            {name:{code:summary['reason_counts'][name].get(code,0) for code in report.ALL_TARGET_REASONS} for name in report.TARGET_NAMES})
        parsed[role]=summary['row_count']
    log=list(result.access)
    def events(name):return [count for event,count in log if event==name]
    if result.status=='COMPLETE':
        model=result.evaluation.costs['development_unique_bundles']
        calibrator=result.evaluation.costs['calibration_unique_bundles']
        auditor=result.evaluation.costs['evaluation_unique_bundles']
    else:
        development=_stage(store,'development') if 'development' in store.stages else None
        model=None if development is not None and development['status']=='COMPLETE' else 0
        calibrator=(events('CALIBRATION_VAULT_OPEN') or [None if 'reserved' in store.stages else 0])[-1]
        eval_opens=events('EVALUATION_VAULT_OPEN')
        auditor=eval_opens[-1] if len(eval_opens)>=2 else (None if 'replay' in store.stages else 0)
    access=report.AccessCounts(result.source_captures,result.captured_bytes,parsed,parsed,parsed,
                               model,calibrator,result.policy_requests,auditor)
    binding=store._registration
    registration=report.RegistrationSummary(*(binding[key] for key in ('commit','protocol_sha256','contract_sha256',
        'implementation_manifest_sha256','engineering_receipt_sha256','ci_receipt_sha256')),_identity(binding['receipt']))
    kind={'SYNTHETIC_FIXTURE':'synthetic_fixture','PRODUCTION_ARCHIVE':'registered_original',
          'REPRODUCTION_FIXED_ALLOCATION':'registered_reproduction'}[store.execution_kind]
    source=report.SourceIdentity(store._source['bytes'],store._source['md5'],store._source['sha256'])
    context=report.PublicContext(registration,source,inputs,kind,funnel,roles,summaries,access,
                                 report.Usage(None,None,None) if usage is None else usage)
    if result.status=='COMPLETE':return report.project_evaluation(result.evaluation,context)
    return report.project_unavailable(context,result.status,result.reasons,store.stages[-1] if store.stages else None,result.completed_policy_runs)


def write(result,projection):
    """Only a constructed PublicProjection reaches this immutable public sink."""
    if type(projection) is not report.PublicProjection:driver.persistence.fail('SCHEMA_INVALID')
    raw=projection.canonical_bytes()
    # The projector retains only its closed public document, never private data.
    path=result.store.path/'public-report.json'
    io._exclusive(path,raw,directory_fd=result.store._directory_fd,check=result.store._assert_location)
    result.store._read_exact(path,sha256(raw).hexdigest())
    return {'bytes_sha256':sha256(raw).hexdigest(),
            'content_sha256':projection.document['content_sha256'],
            'scientific_sha256':projection.document['scientific_sha256']}
