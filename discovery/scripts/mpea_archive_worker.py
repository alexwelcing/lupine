"""Explicit registered, supervised worker; no standalone target-read authority."""
from __future__ import annotations
from fractions import Fraction
from hashlib import sha256
import os
from pathlib import Path
import re
import resource
import sys
import time

ROOT=next(parent for parent in Path(__file__).resolve().parents if (parent/'src/lupine_discovery/decision_pool.py').is_file())
_NAME=re.compile('[A-Za-z0-9][A-Za-z0-9_-]{0,79}\\Z')
_HEX=re.compile('[0-9a-f]{64}\\Z')


def main(argv=None):
    args=sys.argv[1:] if argv is None else argv
    descriptor=os.environ.get('LUPINE_MARKER_FD','')
    if (type(args) is not list or len(args)!=7 or any(type(value) is not str for value in args)
            or _HEX.fullmatch(args[2]) is None or _NAME.fullmatch(args[3]) is None
            or args[5] not in ('PRODUCTION_ARCHIVE','REPRODUCTION_FIXED_ALLOCATION')
            or (args[5]=='PRODUCTION_ARCHIVE')!=(args[6]=='-')
            or (args[6]!='-' and (_NAME.fullmatch(args[6]) is None or args[6]==args[3]))
            or re.fullmatch('[0-9]{1,10}',descriptor) is None
            or Path(__file__).resolve()!=ROOT/'scripts/mpea_archive_worker.py'):
        return 2
    # Registration imports the fixed main-tree parser before any fixture helper,
    # preserving one class identity throughout the promoted production graph.
    import mpea_registration_allocation as registration_module
    import mpea_study_supervisor as supervisor
    import mpea_archive_driver as driver
    import mpea_archive_custody as custody
    import mpea_archive_report as bridge
    fd=int(descriptor);emitted=[];target_wall=None;target_cpu=None
    def emit(value):
        nonlocal target_wall,target_cpu
        supervisor.emit_marker(fd,value)
        if value['event']=='STAGE_SEALED':emitted.append(value['stage'])
        if value['event']=='TARGET_PHASE_BEGIN':
            target_wall=time.monotonic_ns();target_cpu=time.process_time_ns()
    emit({'event':'START'})
    store=None;registration=None;result=None
    try:
        registration=registration_module.verify_worker_registration(args[0],args[1],args[2])
        metadata=registration_module.load_public_metadata(registration)
        store=driver.persistence.ProductionStageStore(args[3],registration.binding,custody.SOURCE,execution_kind=args[5])
        original=None
        if args[6]!='-':
            original_root=ROOT/'.cache/mpea-archival'/args[6]
            stage_raw=custody.capture(original_root/'stage-00-allocation.json',32*1048576)
            stage=driver.io._loads(stage_raw)
            stage_identity={'bytes_sha256':sha256(stage_raw).hexdigest(),
                'content_sha256':stage['content_sha256'],'scientific_sha256':stage['scientific_sha256']}
            route_identity=stage['payload']['route_artifact']
            route_raw=custody.capture(original_root/'label-routes.json',32*1048576)
            original=registration_module.load_original_allocation_bytes(metadata,registration,
                stage_raw,stage_identity,route_raw,route_identity)
        allocation=registration_module.allocate(metadata,registration,store,args[5],original_allocation=original)
        emit({'event':'STAGE_SEALED','stage':'allocation','scientific_sha256':allocation.allocation_identity['scientific_sha256']})
        result=driver.run_registered(registration,metadata,allocation,store,args[4],
            registration_module=registration_module,checkpoint=emit,allocation_marker_emitted=True)
    except Exception as error:
        code=getattr(error,'code','INTERNAL_FAILURE')
        if type(code) is not str or code not in supervisor.STOP_REASONS:code='INTERNAL_FAILURE'
        if store is not None:
            try:
                if len(store.stages)<8 and not store._terminal:
                    store.commit(driver.persistence.STAGES[len(store.stages)],{'available':None},status='BLOCKED',reasons=(code,))
                for stage in store.stages[len(emitted):]:
                    emit({'event':'STAGE_SEALED','stage':stage,'scientific_sha256':store.stage_identity(stage)['scientific_sha256']})
                result=driver._seal_result(driver.ArchiveResult('BLOCKED',store,None,(),None,(),None,
                    {role:None for role in driver.helpers.ROLES},(),(code,)))
            except Exception:result=None
        if result is None:
            emit({'event':'STOP','status':'BLOCKED','reason':code})
            if store is not None:store.close()
            return 0
    try:
        metadata_inputs={name:{'bytes_sha256':registration.manifest_files['discovery/'+path],
            'content_sha256':None,'scientific_sha256':None} for name,path in (
            ('mapping','docs/mpea-column-mapping-v1.json'),('metadata_b','reports/mpea-row-metadata-v1.json'),
            ('formula_c','reports/mpea-formula-tokens-v1.json'))}
        usage=bridge.report.Usage(None if target_wall is None else Fraction(time.monotonic_ns()-target_wall,10**9),
            None if target_cpu is None else Fraction(time.process_time_ns()-target_cpu,10**9),
            resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024)
        projection=bridge.project(result,metadata_identities=metadata_inputs,usage=usage)
        public_identity=bridge.write(result,projection)
        record={'schema':'lupine.discovery.mpea.attempt_result.v1','status':result.status,'reasons':list(result.reasons),
            'execution_kind':store.execution_kind,'scientific_stages':dict(store.scientific_digests()),
            'public_identity':public_identity,'source_captures':result.source_captures,
            'captured_bytes':result.captured_bytes,'completed_policy_runs':result.completed_policy_runs}
        record['content_sha256']=driver.io.digest(record);raw=driver.io.canonical(record)
        driver.io._exclusive(store.path/'attempt-result.json',raw,directory_fd=store._directory_fd,check=store._assert_location)
        store._read_exact(store.path/'attempt-result.json',sha256(raw).hexdigest())
        if result.status=='COMPLETE':emit({'event':'DONE'})
        else:emit({'event':'STOP','status':result.status,'reason':result.reasons[0]})
        store.close();return 0
    except Exception as error:
        code=getattr(error,'code','INTERNAL_FAILURE')
        if type(code) is not str or code not in supervisor.STOP_REASONS:code='INTERNAL_FAILURE'
        emit({'event':'STOP','status':'BLOCKED','reason':code});store.close();return 0


if __name__=='__main__':
    try:code=main()
    except Exception:code=2
    raise SystemExit(code)
