"""Actual namespace/process fixture worker, with full production-format stage flow.

Only locally constructed source bytes; there is no production registration,
source/feature path option or entropy provider.
"""
from pathlib import Path
import importlib.util,os,re,sys
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'scripts'))
import mpea_archive_driver as driver
from mpea_constructed_fixture import make_case
from test_mpea_production_store import binding
ROOT=driver.persistence.ROOT
spec=importlib.util.spec_from_file_location('_mpea_archive_observed_supervisor',ROOT/'scripts/mpea_study_supervisor.py')
supervisor=importlib.util.module_from_spec(spec);sys.modules[spec.name]=supervisor;spec.loader.exec_module(supervisor)
def main():
    args=sys.argv[1:];fd=os.environ.get('LUPINE_MARKER_FD','')
    if len(args)!=2 or args[0] not in ('complete','inadequate') or re.fullmatch('[A-Za-z0-9_-]{1,80}',args[1]) is None or re.fullmatch('[0-9]{1,10}',fd) is None:return 2
    emit=lambda payload:supervisor.emit_marker(int(fd),payload)
    emit({'event':'START'})
    driver.persistence.OUTPUT_ROOT=ROOT/'.cache/mpea-study-custody/observed-attempts'
    result=driver.run_synthetic(make_case(missing_development=args[0]=='inadequate'),args[1],binding(),checkpoint=emit)
    for stage in result.store.stages:
        usage=driver.io._loads(result.store.stage_bytes(stage))['usage']
        if usage['measurement_status']!='OBSERVED' or usage['stage_resource']['stage']!=stage:
            emit({'event':'STOP','status':'BLOCKED','reason':'INTERNAL_FAILURE'});return 0
    if result.status=='COMPLETE':emit({'event':'DONE'})
    else:emit({'event':'STOP','status':result.status,'reason':result.reasons[0]})
    result.store.close();return 0
if __name__=='__main__':
    try:result=main()
    except Exception:result=2
    raise SystemExit(result)
