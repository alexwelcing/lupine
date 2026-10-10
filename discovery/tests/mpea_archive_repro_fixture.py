"""Fresh-process format simulation with wholly constructed bytes and no authority.

Registered-format envelopes here test storage/reproduction, not production
registration. The real source is rejected by make_case's unchanged FixtureSource;
public registered projection must reject this fabricated source identity.
"""
from pathlib import Path
from hashlib import sha256
import sys
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mpea_archive_driver as driver
import mpea_archive_custody as custody
import mpea_archive_report as bridge
from mpea_constructed_fixture import make_case
from test_mpea_production_store import binding


def main(root,mode):
    root=Path(root).absolute()
    if driver.persistence.ROOT/'.cache' not in root.parents or mode not in ('original','reproduction'):
        raise ValueError('SYNTHETIC_FIXTURE_REQUIRED')
    driver.persistence.OUTPUT_ROOT=root/'attempts'
    original=make_case()
    source={'bytes':original.routes.source.byte_count,'md5':original.routes.source.md5,'sha256':original.routes.source.sha256}
    kind='PRODUCTION_ARCHIVE' if mode=='original' else 'REPRODUCTION_FIXED_ALLOCATION'
    store=driver.persistence.ProductionStageStore(mode,binding(),source,execution_kind=kind)
    allocation_store=driver.AllocationUsageStore(store)
    routes=custody.RouteContext(original.routes.header,original.routes.rows)
    if mode=='original':
        route=allocation_store.write_artifact('label-routes.json',custody._route_payload(routes,'c'*64),schema='lupine.discovery.mpea.label_routes.v1')
        allocation_store.commit('allocation',{'execution_kind':'PRODUCTION_ARCHIVE','route_artifact':route,'role_map_sha256':route['bytes_sha256'],
            'scope':'constructed_format_simulation_no_real_registration'},inputs={'label_routes':route})
    else:
        prior=root/'attempts/original'
        stage_raw=custody.capture(prior/'stage-00-allocation.json',32*1048576);stage=driver.io._loads(stage_raw)
        identity={'bytes_sha256':sha256(stage_raw).hexdigest(),'content_sha256':stage['content_sha256'],'scientific_sha256':stage['scientific_sha256']}
        route=stage['payload']['route_artifact'];route_raw=custody.capture(prior/'label-routes.json',32*1048576)
        allocation_store.import_original_allocation(stage_raw,identity,route_raw,route)
    feature={'bytes_sha256':driver.io.digest(original.features),'content_sha256':None,'scientific_sha256':None}
    case=custody._case(routes,original.features,source,store.stage_identity('allocation'),route,feature,
        {'scope':'constructed_format_simulation'})
    custodian=custody.ArchiveCustodian(case,store,lambda:original.raw,authority=custody._AUTHORITY)
    with patch('os.urandom',side_effect=AssertionError('NO_ENTROPY_PERMITTED')):
        result=driver._execute(case,store,custodian,sampling_premise='assumed_unverified',allocation_import_usage=allocation_store.import_usage)
    if result.status!='COMPLETE':raise ValueError(result.reasons[0])
    for stage_name in store.stages:
        observed=driver.io._loads(store.stage_bytes(stage_name))['usage']
        if observed['measurement_status']!='OBSERVED' or observed['stage_resource']['stage']!=stage_name:raise AssertionError('MISSING_STAGE_USAGE')
    imported=driver.io._loads(store.stage_bytes('input_freeze'))['usage']['allocation_import_resource']
    if (imported is not None)!=(mode=='reproduction'):raise AssertionError('IMPORT_COST_LOCATION')
    public_rejected=False
    try:bridge.project(result,metadata_identities={key:driver.io._loads(store.stage_bytes('input_freeze'))['payload']['metadata_receipts'][key] for key in ('mapping','metadata_b','formula_c')})
    except bridge.report.ReportError:public_rejected=True
    if not public_rejected:raise AssertionError('FABRICATED_SOURCE_MUST_NOT_BE_REGISTERED_PUBLIC')
    summary={'status':result.status,'stage_digests':dict(store.scientific_digests()),'evaluation_digest':result.evaluation.evaluation_digest,
        'completed_policy_runs':result.completed_policy_runs,'public_registered_kind_rejected':True,
        'actual_registration':False,'actual_source':False,'entropy_draws':0,'source_captures':result.source_captures,
        'allocation_identity':store.stage_identity('allocation')}
    (root/(mode+'.json')).write_bytes(driver.io.canonical(summary));store.close()


if __name__=='__main__':main(*sys.argv[1:])
